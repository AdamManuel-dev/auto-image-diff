/**
 * @fileoverview OpenCV-based feature matching for image alignment
 * @lastmodified 2025-08-02T01:20:00Z
 * 
 * Features: SIFT/ORB feature detection, homography estimation, image warping
 * Main APIs: findFeatureAlignment(), alignWithFeatures()
 * Constraints: Requires OpenCV.js loaded
 * Patterns: Feature matching, RANSAC homography, perspective transform
 */

import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs/promises';
import { loadOpenCV, isOpenCVAvailable } from './opencvLoader';

export interface FeatureMatchResult {
  homography: number[][];
  inliers: number;
  totalMatches: number;
  confidence: number;
  transform: {
    translation: { x: number; y: number };
    scale: { x: number; y: number };
    rotation: number;
  };
}

export class OpenCVFeatureMatcher {
  private initialized = false;
  private cv: any = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    if (!isOpenCVAvailable()) {
      throw new Error('OpenCV.js is not available. Please install @techstark/opencv-js');
    }

    try {
      this.cv = await loadOpenCV();
      this.initialized = true;
      console.log('OpenCV feature matcher initialized');
    } catch (error) {
      console.error('Failed to initialize OpenCV:', error);
      throw error;
    }
  }

  /**
   * Load image into OpenCV Mat
   */
  private async loadImageAsMat(imagePath: string): Promise<any> {
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    
    // Create Mat from image data manually
    const mat = new this.cv.Mat(image.height, image.width, this.cv.CV_8UC4);
    mat.data.set(imageData.data);
    
    return mat;
  }

  /**
   * Find feature-based alignment between two images
   */
  async findFeatureAlignment(
    referencePath: string,
    targetPath: string,
    options: {
      detector?: 'orb' | 'akaze' | 'brisk';
      maxFeatures?: number;
      matchThreshold?: number;
    } = {}
  ): Promise<FeatureMatchResult | null> {
    await this.initialize();
    
    const {
      detector = 'orb',
      maxFeatures = 1000,
      matchThreshold = 0.7
    } = options;

    let img1: any | null = null;
    let img2: any | null = null;
    let gray1: any | null = null;
    let gray2: any | null = null;
    let keypoints1: any | null = null;
    let keypoints2: any | null = null;
    let descriptors1: any | null = null;
    let descriptors2: any | null = null;
    let matches: any | null = null;
    let goodMatches: any | null = null;

    try {
      // Load images
      try {
        img1 = await this.loadImageAsMat(referencePath);
        img2 = await this.loadImageAsMat(targetPath);
      } catch (loadError) {
        console.error("Failed to load images:", loadError);
        return null;
      }

      // Convert to grayscale
      gray1 = new this.cv.Mat();
      gray2 = new this.cv.Mat();
      this.cv.cvtColor(img1, gray1, this.cv.COLOR_RGBA2GRAY);
      this.cv.cvtColor(img2, gray2, this.cv.COLOR_RGBA2GRAY);

      // Create feature detector
      let featureDetector: any;
      switch (detector) {
        case 'akaze':
          featureDetector = new (this.cv as any).AKAZE();
          break;
        case 'brisk':
          featureDetector = new (this.cv as any).BRISK();
          break;
        case 'orb':
        default:
          featureDetector = new this.cv.ORB(maxFeatures);
          break;
      }

      // Detect keypoints and compute descriptors
      keypoints1 = new this.cv.KeyPointVector();
      keypoints2 = new this.cv.KeyPointVector();
      descriptors1 = new this.cv.Mat();
      descriptors2 = new this.cv.Mat();

      featureDetector.detectAndCompute(gray1, new this.cv.Mat(), keypoints1, descriptors1);
      featureDetector.detectAndCompute(gray2, new this.cv.Mat(), keypoints2, descriptors2);

      // Match features
      const matcher = new this.cv.BFMatcher(this.cv.NORM_HAMMING, true);
      matches = new this.cv.DMatchVector();
      matcher.match(descriptors1, descriptors2, matches);

      // Filter good matches
      goodMatches = new this.cv.DMatchVector();
      const matchesArray: any[] = [];
      for (let i = 0; i < matches.size(); i++) {
        matchesArray.push(matches.get(i));
      }
      
      // Sort by distance
      matchesArray.sort((a, b) => a.distance - b.distance);
      
      // Keep best matches
      const numGoodMatches = Math.floor(matchesArray.length * matchThreshold);
      for (let i = 0; i < numGoodMatches; i++) {
        goodMatches.push_back(matchesArray[i]);
      }

      // Need at least 4 points for homography
      if (goodMatches.size() < 4) {
        console.log(`Not enough good matches found: ${goodMatches.size()}`);
        return null;
      }

      // Extract matched points
      const srcPoints = new (this.cv as any).Point2fVector();
      const dstPoints = new (this.cv as any).Point2fVector();

      for (let i = 0; i < goodMatches.size(); i++) {
        const match = goodMatches.get(i);
        const kp1 = keypoints1.get(match.queryIdx);
        const kp2 = keypoints2.get(match.trainIdx);
        srcPoints.push_back(kp1.pt);
        dstPoints.push_back(kp2.pt);
      }

      // Find homography
      const homographyMat = this.cv.findHomography(dstPoints, srcPoints, this.cv.RANSAC, 5.0);
      
      if (homographyMat.empty()) {
        console.log('Failed to find homography');
        return null;
      }

      // Convert homography to array
      const H: number[][] = [];
      for (let i = 0; i < 3; i++) {
        H[i] = [];
        for (let j = 0; j < 3; j++) {
          H[i][j] = homographyMat.data64F[i * 3 + j];
        }
      }

      // Extract transform components
      const transform = this.decomposeHomography(H);
      
      // Calculate confidence based on inliers
      const inliers = this.countInliers(srcPoints, dstPoints, homographyMat, 5.0);
      const confidence = inliers / goodMatches.size();

      // Clean up
      homographyMat.delete();
      srcPoints.delete();
      dstPoints.delete();

      return {
        homography: H,
        inliers,
        totalMatches: goodMatches.size(),
        confidence,
        transform
      };

    } finally {
      // Clean up all OpenCV objects
      [img1, img2, gray1, gray2, descriptors1, descriptors2].forEach(mat => mat?.delete());
      [keypoints1, keypoints2, matches, goodMatches].forEach(vec => vec?.delete());
    }
  }

  /**
   * Count inliers for homography
   */
  private countInliers(
    srcPoints: any,
    dstPoints: any,
    homography: any,
    threshold: number
  ): number {
    let inliers = 0;
    
    for (let i = 0; i < srcPoints.size(); i++) {
      const src = srcPoints.get(i);
      const dst = dstPoints.get(i);
      
      // Transform source point
      const x = src.x;
      const y = src.y;
      const w = homography.data64F[6] * x + homography.data64F[7] * y + homography.data64F[8];
      const tx = (homography.data64F[0] * x + homography.data64F[1] * y + homography.data64F[2]) / w;
      const ty = (homography.data64F[3] * x + homography.data64F[4] * y + homography.data64F[5]) / w;
      
      // Check if within threshold
      const dx = tx - dst.x;
      const dy = ty - dst.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < threshold) {
        inliers++;
      }
    }
    
    return inliers;
  }

  /**
   * Decompose homography matrix to extract transform components
   */
  private decomposeHomography(H: number[][]): {
    translation: { x: number; y: number };
    scale: { x: number; y: number };
    rotation: number;
  } {
    // For simple 2D transforms, extract translation from the homography
    const translation = {
      x: H[0][2],
      y: H[1][2]
    };
    
    // Extract scale and rotation (simplified for 2D case)
    const a = H[0][0];
    const b = H[0][1];
    const c = H[1][0];
    const d = H[1][1];
    
    const scaleX = Math.sqrt(a * a + c * c);
    const scaleY = Math.sqrt(b * b + d * d);
    
    const rotation = Math.atan2(c, a) * 180 / Math.PI;
    
    return {
      translation,
      scale: { x: scaleX, y: scaleY },
      rotation
    };
  }

  /**
   * Apply homography transformation to align images
   */
  async alignWithFeatures(
    targetPath: string,
    outputPath: string,
    homography: number[][],
    referenceSize: { width: number; height: number }
  ): Promise<void> {
    await this.initialize();
    
    let img: any | null = null;
    let aligned: any | null = null;
    let H: any | null = null;

    try {
      // Load target image
      img = await this.loadImageAsMat(targetPath);
      
      // Create homography matrix
      H = this.cv.matFromArray(3, 3, this.cv.CV_64F, [
        homography[0][0], homography[0][1], homography[0][2],
        homography[1][0], homography[1][1], homography[1][2],
        homography[2][0], homography[2][1], homography[2][2]
      ]);
      
      // Warp image
      aligned = new this.cv.Mat();
      const dsize = new this.cv.Size(referenceSize.width, referenceSize.height);
      this.cv.warpPerspective(img, aligned, H, dsize, this.cv.INTER_LINEAR, this.cv.BORDER_CONSTANT, new this.cv.Scalar(0, 0, 0, 0));
      
      // Save result
      const canvas = createCanvas(referenceSize.width, referenceSize.height);
      const ctx = canvas.getContext('2d');
      
      // Convert Mat to ImageData
      const imgData = ctx.createImageData(aligned.cols, aligned.rows);
      const data = aligned.data;
      for (let i = 0; i < data.length; i++) {
        imgData.data[i] = data[i];
      }
      
      ctx.putImageData(imgData, 0, 0);
      
      // Save to file
      const buffer = canvas.toBuffer('image/png');
      await fs.writeFile(outputPath, buffer);
      
    } finally {
      img?.delete();
      aligned?.delete();
      H?.delete();
    }
  }
}