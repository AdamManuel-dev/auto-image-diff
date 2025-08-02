/**
 * @fileoverview ImageMagick-based image processing module
 * @lastmodified 2025-08-01T03:55:00Z
 *
 * Features: Image alignment, comparison, diff generation using ImageMagick
 * Main APIs: alignImages(), compareImages(), generateDiff()
 * Constraints: Requires ImageMagick installed on system
 * Patterns: Async/await, error handling, TypeScript types
 */

import * as gm from "gm";
import * as fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as os from "os";
import { ExclusionsConfig } from "./exclusions";
import { MaskGenerator } from "./mask-generator";
import { ClassifierManager, ClassificationSummary } from "./classifiers/manager";
import { getAllClassifiers } from "./classifiers";
import { CssFixSuggester, FixSuggestion } from "./css-fix-suggester";
import { PngMetadataEmbedder } from "./png-metadata";
import { MetadataEnhancer } from "./metadata-enhancer";
import { OpenCVFeatureMatcher } from "./opencvFeatureMatcher";

const execAsync = promisify(exec);
const imageMagick = gm.subClass({ imageMagick: true });

export interface ComparisonResult {
  difference: number;
  diffImagePath?: string;
  isEqual: boolean;
  statistics: {
    pixelsDifferent: number;
    totalPixels: number;
    percentageDifferent: number;
  };
  classification?: ClassificationSummary;
  cssSuggestions?: FixSuggestion[];
}

export interface AlignmentOptions {
  method: "feature" | "phase" | "subimage" | "opencv";
  threshold?: number;
  opencvDetector?: "orb" | "akaze" | "brisk";
}

export interface AlignmentResult {
  alignedPath: string;
  offset: { x: number; y: number };
  matchingRegion?: { x: number; y: number; width: number; height: number };
}

export class ImageProcessor {
  private metadataEnhancer: MetadataEnhancer;
  private opencvMatcher: OpenCVFeatureMatcher;

  constructor() {
    this.metadataEnhancer = new MetadataEnhancer();
    this.opencvMatcher = new OpenCVFeatureMatcher();
  }

  /**
   * Align two images using ImageMagick's subimage search or other methods
   */
  async alignImages(
    referenceImage: string,
    targetImage: string,
    outputPath: string,
    options: AlignmentOptions = { method: "subimage" }
  ): Promise<AlignmentResult> {
    try {
      // Get dimensions of both images
      const refSize = await this.getImageSize(referenceImage);
      const targetSize = await this.getImageSize(targetImage);
      
      console.log(`Reference: ${refSize.width}x${refSize.height}, Target: ${targetSize.width}x${targetSize.height}`);
      
      let offset = { x: 0, y: 0 };
      let bestMatch = { score: Infinity, offset: { x: 0, y: 0 }, method: "none" };
      
      // Method 0: Try OpenCV feature matching if requested
      if (options.method === "opencv") {
        try {
          console.log("Trying OpenCV feature-based alignment...");
          const featureResult = await this.opencvMatcher.findFeatureAlignment(
            referenceImage,
            targetImage,
            {
              detector: options.opencvDetector || 'orb',
              maxFeatures: 1000,
              matchThreshold: 0.7
            }
          );
          
          if (featureResult && featureResult.confidence > 0.3) {
            // Use OpenCV to warp the image
            const tempAligned = outputPath + '.temp.png';
            await this.opencvMatcher.alignWithFeatures(
              targetImage,
              tempAligned,
              featureResult.homography,
              refSize
            );
            
            // Move temp file to output
            await execAsync(`mv "${tempAligned}" "${outputPath}"`);
            
            console.log(`OpenCV alignment successful: ${featureResult.inliers}/${featureResult.totalMatches} inliers, confidence: ${featureResult.confidence.toFixed(2)}`);
            console.log(`Transform: translation=(${featureResult.transform.translation.x.toFixed(1)}, ${featureResult.transform.translation.y.toFixed(1)}), scale=(${featureResult.transform.scale.x.toFixed(2)}, ${featureResult.transform.scale.y.toFixed(2)}), rotation=${featureResult.transform.rotation.toFixed(1)}°`);
            
            return {
              alignedPath: outputPath,
              offset: {
                x: Math.round(featureResult.transform.translation.x),
                y: Math.round(featureResult.transform.translation.y)
              },
              matchingRegion: {
                x: 0,
                y: 0,
                width: refSize.width,
                height: refSize.height
              }
            };
          } else {
            console.log("OpenCV feature matching failed or low confidence");
          }
        } catch (e) {
          console.log("OpenCV feature alignment failed:", e);
        }
      }
      
      // Method 1: Try direct subimage search (target within reference)
      if (targetSize.width <= refSize.width && targetSize.height <= refSize.height) {
        try {
          const cmd = `compare -metric rmse -subimage-search "${referenceImage}" "${targetImage}" null: 2>&1`;
          const result = await this.trySubimageSearch(cmd);
          if (result.score < bestMatch.score) {
            bestMatch = { ...result, method: "target-in-ref" };
          }
        } catch (e) {
          console.log("Subimage search (target in ref) failed:", e);
        }
      }
      
      // Method 2: Try reverse subimage search (reference within target)
      if (refSize.width <= targetSize.width && refSize.height <= targetSize.height) {
        try {
          const cmd = `compare -metric rmse -subimage-search "${targetImage}" "${referenceImage}" null: 2>&1`;
          const result = await this.trySubimageSearch(cmd);
          // Invert the offset for reverse search
          if (result.score < bestMatch.score) {
            bestMatch = { 
              score: result.score, 
              offset: { x: -result.offset.x, y: -result.offset.y },
              method: "ref-in-target"
            };
          }
        } catch (e) {
          console.log("Subimage search (ref in target) failed:", e);
        }
      }
      
      // Method 3: Try edge-based alignment for UI screenshots
      if (bestMatch.method === "none" || bestMatch.score > 1000) {
        try {
          const result = await this.tryEdgeBasedAlignment(referenceImage, targetImage);
          if (result.score < bestMatch.score) {
            bestMatch = { ...result, method: "edge-based" };
          }
        } catch (e) {
          console.log("Edge-based alignment failed:", e);
        }
      }
      
      // Method 4: Try cropped region search for overlapping content
      if (bestMatch.method === "none" || bestMatch.score > 5000) {
        try {
          const result = await this.tryCroppedRegionSearch(referenceImage, targetImage);
          if (result.score < bestMatch.score) {
            bestMatch = { ...result, method: "cropped-region" };
          }
        } catch (e) {
          console.log("Cropped region search failed:", e);
        }
      }
      
      // Method 5: Try multi-scale search for partial overlaps
      if (bestMatch.method === "none" || bestMatch.score > 1000) {
        try {
          const result = await this.tryMultiScaleSearch(referenceImage, targetImage);
          if (result.score < bestMatch.score) {
            bestMatch = { ...result, method: "multi-scale" };
          }
        } catch (e) {
          console.log("Multi-scale search failed:", e);
        }
      }
      
      // Method 6: Try phase correlation as last resort
      if (options.method === "phase" || bestMatch.method === "none") {
        try {
          const result = await this.tryPhaseCorrelation(referenceImage, targetImage);
          if (result.score < bestMatch.score) {
            bestMatch = { ...result, method: "phase" };
          }
        } catch (e) {
          console.log("Phase correlation failed:", e);
        }
      }
      
      // Use the best match found
      offset = bestMatch.offset;
      console.log(`Best alignment: method=${bestMatch.method}, offset=(${offset.x},${offset.y}), score=${bestMatch.score}`);
      
      // Apply transformation to align images
      // Create a canvas of reference size, place the target image at the offset position
      const convertCmd = `convert -size ${refSize.width}x${refSize.height} xc:transparent "${targetImage}" -geometry +${offset.x}+${offset.y} -composite "${outputPath}"`;
      await execAsync(convertCmd);
      
      // Calculate the matching region (overlapping area)
      const matchingRegion = {
        x: Math.max(0, offset.x),
        y: Math.max(0, offset.y),
        width: Math.min(refSize.width - Math.max(0, offset.x), targetSize.width - Math.max(0, -offset.x)),
        height: Math.min(refSize.height - Math.max(0, offset.y), targetSize.height - Math.max(0, -offset.y))
      };
      
      return {
        alignedPath: outputPath,
        offset,
        matchingRegion
      };
    } catch (error) {
      throw new Error(`Failed to align images: ${(error as Error).message}`);
    }
  }

  /**
   * Try subimage search and return score and offset
   */
  private async trySubimageSearch(cmd: string): Promise<{ score: number; offset: { x: number; y: number } }> {
    try {
      const { stdout, stderr } = await execAsync(cmd);
      const output = stderr || stdout || "";
      
      // Extract score and offset
      const lines = output.trim().split('\n');
      let score = Infinity;
      let offset = { x: 0, y: 0 };
      
      for (const line of lines) {
        // Look for RMSE score
        const scoreMatch = line.match(/^(\d+\.?\d*)/);
        if (scoreMatch) {
          score = parseFloat(scoreMatch[1]);
        }
        
        // Look for offset
        const offsetMatch = line.match(/@ ([-\d]+),([-\d]+)/);
        if (offsetMatch) {
          offset.x = parseInt(offsetMatch[1], 10);
          offset.y = parseInt(offsetMatch[2], 10);
        }
      }
      
      return { score, offset };
    } catch (error) {
      // Compare returns non-zero exit when images differ
      const execError = error as { stdout?: string; stderr?: string };
      const output = execError.stderr || execError.stdout || "";
      
      // Try to extract results even from error output
      let score = Infinity;
      let offset = { x: 0, y: 0 };
      
      const scoreMatch = output.match(/(\d+\.?\d*) \(/);
      if (scoreMatch) {
        score = parseFloat(scoreMatch[1]);
      }
      
      const offsetMatch = output.match(/@ ([-\d]+),([-\d]+)/);
      if (offsetMatch) {
        offset.x = parseInt(offsetMatch[1], 10);
        offset.y = parseInt(offsetMatch[2], 10);
      }
      
      if (offsetMatch) {
        return { score, offset };
      }
      
      throw error;
    }
  }

  /**
   * Try edge-based alignment for UI screenshots
   */
  private async tryEdgeBasedAlignment(reference: string, target: string): Promise<{ score: number; offset: { x: number; y: number } }> {
    const tempDir = os.tmpdir();
    const refEdges = path.join(tempDir, `ref-edges-${Date.now()}.png`);
    const targetEdges = path.join(tempDir, `target-edges-${Date.now()}.png`);
    
    try {
      // Extract edges using Canny edge detection
      await execAsync(`convert "${reference}" -colorspace Gray -edge 1 -negate "${refEdges}"`);
      await execAsync(`convert "${target}" -colorspace Gray -edge 1 -negate "${targetEdges}"`);
      
      // Scale down for faster processing
      const refEdgesSmall = path.join(tempDir, `ref-edges-small-${Date.now()}.png`);
      const targetEdgesSmall = path.join(tempDir, `target-edges-small-${Date.now()}.png`);
      
      await execAsync(`convert "${refEdges}" -resize 25% "${refEdgesSmall}"`);
      await execAsync(`convert "${targetEdges}" -resize 25% "${targetEdgesSmall}"`);
      
      // Try subimage search on edge images
      let bestResult = { score: Infinity, offset: { x: 0, y: 0 } };
      
      try {
        const cmd = `compare -metric rmse -subimage-search "${refEdgesSmall}" "${targetEdgesSmall}" null: 2>&1`;
        const result = await this.trySubimageSearch(cmd);
        if (result.score < bestResult.score) {
          // Scale offset back to original size
          bestResult = {
            score: result.score,
            offset: {
              x: result.offset.x * 4,
              y: result.offset.y * 4
            }
          };
        }
      } catch (e) {
        // Try reverse
        try {
          const cmd = `compare -metric rmse -subimage-search "${targetEdgesSmall}" "${refEdgesSmall}" null: 2>&1`;
          const result = await this.trySubimageSearch(cmd);
          if (result.score < bestResult.score) {
            // Scale and invert offset
            bestResult = {
              score: result.score,
              offset: {
                x: -result.offset.x * 4,
                y: -result.offset.y * 4
              }
            };
          }
        } catch (e2) {
          // Continue with default
        }
      }
      
      // Clean up
      await fs.unlink(refEdges).catch(() => {});
      await fs.unlink(targetEdges).catch(() => {});
      await fs.unlink(refEdgesSmall).catch(() => {});
      await fs.unlink(targetEdgesSmall).catch(() => {});
      
      return bestResult;
    } catch (error) {
      throw new Error(`Edge-based alignment failed: ${error}`);
    }
  }

  /**
   * Try cropped region search - crop center regions and search
   */
  private async tryCroppedRegionSearch(reference: string, target: string): Promise<{ score: number; offset: { x: number; y: number } }> {
    const tempDir = os.tmpdir();
    const refSize = await this.getImageSize(reference);
    const targetSize = await this.getImageSize(target);
    
    // Take center crops of different sizes
    const cropSizes = [
      { width: 800, height: 600 },
      { width: 1000, height: 800 },
      { width: 1200, height: 900 }
    ];
    
    let bestResult = { score: Infinity, offset: { x: 0, y: 0 } };
    
    for (const cropSize of cropSizes) {
      if (cropSize.width > Math.min(refSize.width, targetSize.width) ||
          cropSize.height > Math.min(refSize.height, targetSize.height)) {
        continue;
      }
      
      try {
        // Crop center regions
        const refCropped = path.join(tempDir, `ref-crop-${Date.now()}.png`);
        const targetCropped = path.join(tempDir, `target-crop-${Date.now()}.png`);
        
        const refCropX = Math.round((refSize.width - cropSize.width) / 2);
        const refCropY = Math.round((refSize.height - cropSize.height) / 2);
        const targetCropX = Math.round((targetSize.width - cropSize.width) / 2);
        const targetCropY = Math.round((targetSize.height - cropSize.height) / 2);
        
        await execAsync(
          `convert "${reference}" -crop ${cropSize.width}x${cropSize.height}+${refCropX}+${refCropY} +repage "${refCropped}"`
        );
        await execAsync(
          `convert "${target}" -crop ${cropSize.width}x${cropSize.height}+${targetCropX}+${targetCropY} +repage "${targetCropped}"`
        );
        
        // Compare cropped regions
        try {
          const result = await execAsync(`compare -metric RMSE "${refCropped}" "${targetCropped}" null: 2>&1`);
          const output = result.stderr || result.stdout || "";
          const score = parseFloat(output.split(' ')[0]) || Infinity;
          
          if (score < bestResult.score) {
            // Calculate the offset based on crop positions
            bestResult = {
              score,
              offset: {
                x: targetCropX - refCropX,
                y: targetCropY - refCropY
              }
            };
          }
        } catch (e) {
          // Continue with next crop size
        }
        
        // Clean up
        await fs.unlink(refCropped).catch(() => {});
        await fs.unlink(targetCropped).catch(() => {});
      } catch (e) {
        // Continue with next crop size
      }
    }
    
    return bestResult;
  }

  /**
   * Try multi-scale search for partial overlaps
   */
  private async tryMultiScaleSearch(reference: string, target: string): Promise<{ score: number; offset: { x: number; y: number } }> {
    const tempDir = os.tmpdir();
    const scales = [1.0, 0.5, 0.25]; // Search at multiple scales
    let bestResult = { score: Infinity, offset: { x: 0, y: 0 } };
    
    try {
      for (const scale of scales) {
        if (scale === 1.0) {
          // At full scale, try finding common regions by cropping
          const result = await this.findBestOverlap(reference, target);
          if (result.score < bestResult.score) {
            bestResult = result;
          }
        } else {
          // At reduced scales, use standard subimage search
          const scaledRef = path.join(tempDir, `ref-${scale}-${Date.now()}.png`);
          const scaledTarget = path.join(tempDir, `target-${scale}-${Date.now()}.png`);
          
          // Scale down images
          const scalePercent = Math.round(scale * 100);
          await execAsync(`convert "${reference}" -resize ${scalePercent}% "${scaledRef}"`);
          await execAsync(`convert "${target}" -resize ${scalePercent}% "${scaledTarget}"`);
          
          // Try subimage search at this scale
          try {
            const cmd = `compare -metric rmse -subimage-search "${scaledRef}" "${scaledTarget}" null: 2>&1`;
            const result = await this.trySubimageSearch(cmd);
            
            // Scale offset back to original size
            const scaledResult = {
              score: result.score,
              offset: {
                x: Math.round(result.offset.x / scale),
                y: Math.round(result.offset.y / scale)
              }
            };
            
            if (scaledResult.score < bestResult.score) {
              bestResult = scaledResult;
            }
          } catch (e) {
            // Try reverse search
            try {
              const cmd = `compare -metric rmse -subimage-search "${scaledTarget}" "${scaledRef}" null: 2>&1`;
              const result = await this.trySubimageSearch(cmd);
              
              // Scale and invert offset
              const scaledResult = {
                score: result.score,
                offset: {
                  x: Math.round(-result.offset.x / scale),
                  y: Math.round(-result.offset.y / scale)
                }
              };
              
              if (scaledResult.score < bestResult.score) {
                bestResult = scaledResult;
              }
            } catch (e2) {
              // Skip this scale
            }
          }
          
          // Clean up
          await fs.unlink(scaledRef).catch(() => {});
          await fs.unlink(scaledTarget).catch(() => {});
        }
      }
      
      return bestResult;
    } catch (error) {
      throw new Error(`Multi-scale search failed: ${error}`);
    }
  }

  /**
   * Find best overlap by testing different crop regions
   */
  private async findBestOverlap(reference: string, target: string): Promise<{ score: number; offset: { x: number; y: number } }> {
    const refSize = await this.getImageSize(reference);
    const targetSize = await this.getImageSize(target);
    
    // If images are similar size, they might just need alignment
    const widthRatio = Math.min(refSize.width, targetSize.width) / Math.max(refSize.width, targetSize.width);
    const heightRatio = Math.min(refSize.height, targetSize.height) / Math.max(refSize.height, targetSize.height);
    
    if (widthRatio > 0.7 && heightRatio > 0.7) {
      // Images are similar size, try more comprehensive offset search
      const offsets: Array<{x: number, y: number}> = [];
      
      // Generate a grid of offsets to test
      const maxOffsetX = Math.round((Math.abs(refSize.width - targetSize.width) + 200) / 2);
      const maxOffsetY = Math.round((Math.abs(refSize.height - targetSize.height) + 200) / 2);
      const step = 50; // Step size for search
      
      for (let x = -maxOffsetX; x <= maxOffsetX; x += step) {
        for (let y = -maxOffsetY; y <= maxOffsetY; y += step) {
          offsets.push({ x, y });
        }
      }
      
      console.log(`Testing ${offsets.length} offsets for alignment...`);
      
      let bestResult = { score: Infinity, offset: { x: 0, y: 0 } };
      
      for (const offset of offsets) {
        try {
          // Create temporary aligned version
          const tempAligned = path.join(os.tmpdir(), `aligned-test-${Date.now()}.png`);
          await execAsync(
            `convert -size ${refSize.width}x${refSize.height} xc:black "${target}" -geometry +${offset.x}+${offset.y} -composite "${tempAligned}"`
          );
          
          // Compare
          const result = await execAsync(`compare -metric RMSE "${reference}" "${tempAligned}" null: 2>&1`);
          const output = result.stderr || result.stdout || "";
          const score = parseFloat(output.split(' ')[0]) || Infinity;
          
          if (score < bestResult.score) {
            bestResult = { score, offset };
          }
          
          await fs.unlink(tempAligned).catch(() => {});
        } catch (e) {
          // Continue with next offset
        }
      }
      
      return bestResult;
    }
    
    // For very different sizes, return no offset
    return { score: Infinity, offset: { x: 0, y: 0 } };
  }

  /**
   * Try phase correlation alignment
   */
  private async tryPhaseCorrelation(image1: string, image2: string): Promise<{ score: number; offset: { x: number; y: number } }> {
    // Use FFT-based phase correlation
    // This is a simplified implementation using ImageMagick's FFT
    try {
      // Convert images to grayscale and same size by padding
      const tempDir = os.tmpdir();
      const gray1 = path.join(tempDir, `gray1-${Date.now()}.png`);
      const gray2 = path.join(tempDir, `gray2-${Date.now()}.png`);
      
      // Get max dimensions
      const size1 = await this.getImageSize(image1);
      const size2 = await this.getImageSize(image2);
      const maxWidth = Math.max(size1.width, size2.width);
      const maxHeight = Math.max(size1.height, size2.height);
      
      // Convert to grayscale and pad to same size
      await execAsync(`convert "${image1}" -colorspace Gray -background black -extent ${maxWidth}x${maxHeight} "${gray1}"`);
      await execAsync(`convert "${image2}" -colorspace Gray -background black -extent ${maxWidth}x${maxHeight} "${gray2}"`);
      
      // Use normalized cross-correlation
      let output = "";
      try {
        const result = await execAsync(`compare -metric NCC "${gray1}" "${gray2}" null: 2>&1`);
        output = result.stderr || result.stdout || "";
      } catch (e) {
        const execError = e as { stderr?: string; stdout?: string };
        output = execError.stderr || execError.stdout || "";
      }
      
      // Clean up temp files
      await fs.unlink(gray1).catch(() => {});
      await fs.unlink(gray2).catch(() => {});
      
      // Extract correlation score
      const score = 1 - parseFloat(output.trim()); // Convert correlation to distance
      
      // For phase correlation, we'd need more complex FFT operations
      // For now, return a default offset of 0,0 with the correlation score
      return { score, offset: { x: 0, y: 0 } };
    } catch (error) {
      throw new Error(`Phase correlation failed: ${error}`);
    }
  }

  /**
   * Compare two images and generate difference metrics
   */
  async compareImages(
    image1Path: string,
    image2Path: string,
    threshold: number = 0.1
  ): Promise<ComparisonResult> {
    // Use shell command for compare
    const cmd = `compare -metric AE "${image1Path}" "${image2Path}" null: 2>&1`;
    let pixelsDifferent = 0;

    try {
      const { stdout } = await execAsync(cmd);
      pixelsDifferent = parseInt(stdout.trim() || "0", 10);
    } catch (error) {
      // Compare returns non-zero exit when images differ
      // The pixel count is in stdout
      const execError = error as { stdout?: string };
      if (execError.stdout) {
        pixelsDifferent = parseInt(execError.stdout.trim() || "0", 10);
      } else {
        throw error;
      }
    }

    // Get image dimensions using gm
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      imageMagick(image1Path).size((err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const totalPixels = size.width * size.height;
    const percentageDifferent = (pixelsDifferent / totalPixels) * 100;

    return {
      difference: percentageDifferent,
      isEqual: percentageDifferent <= threshold,
      statistics: {
        pixelsDifferent,
        totalPixels,
        percentageDifferent,
      },
    };
  }

  /**
   * Generate a visual diff between two images
   */
  async generateDiff(
    image1Path: string,
    image2Path: string,
    outputPath: string,
    options: {
      highlightColor?: string;
      lowlight?: boolean;
      exclusions?: ExclusionsConfig;
      runClassification?: boolean;
      suggestCssFixes?: boolean;
      cssSelector?: string;
      embedMetadata?: boolean;
    } = {}
  ): Promise<ComparisonResult> {
    const { highlightColor = "red", exclusions } = options;

    let processedImage1 = image1Path;
    let processedImage2 = image2Path;
    let tempFiles: string[] = [];

    try {
      // Apply exclusion masks if provided
      if (exclusions && exclusions.regions.length > 0) {
        const result = await this.applyExclusionMasks(image1Path, image2Path, exclusions);
        processedImage1 = result.maskedImage1;
        processedImage2 = result.maskedImage2;
        tempFiles = result.tempFiles;
      }

      // Use shell command directly for better compatibility
      const cmd = `compare -highlight-color "${highlightColor}" "${processedImage1}" "${processedImage2}" "${outputPath}" 2>&1`;

      try {
        await execAsync(cmd);
      } catch (error) {
        // Compare returns non-zero exit code when images differ, which is expected
        // Check if the output file was created
        if (!(await this.fileExists(outputPath))) {
          throw new Error(`Failed to generate diff: ${(error as Error).message}`);
        }
      }

      // Get comparison metrics using the masked images if applicable
      const result = await this.compareImages(processedImage1, processedImage2);
      result.diffImagePath = outputPath;

      // Run classification if requested
      if (options.runClassification && result.statistics.pixelsDifferent > 0) {
        try {
          const classification = await this.classifyDifferences(
            processedImage1,
            processedImage2,
            outputPath
          );
          result.classification = classification;

          // Generate CSS suggestions if we have style or layout changes
          if (options.suggestCssFixes) {
            const suggester = new CssFixSuggester();
            const classificationResults = classification.regions
              .map((r) => r.classification)
              .filter((c) => c !== null);

            result.cssSuggestions = suggester.suggestFixes(classificationResults, {
              selector: options.cssSelector,
            });
          }
        } catch (error) {
          // Classification errors shouldn't fail the diff generation
          console.warn("Classification failed:", error);
        }
      }

      // Embed metadata into PNG if requested
      if (options.embedMetadata && outputPath.toLowerCase().endsWith(".png")) {
        try {
          const embedder = new PngMetadataEmbedder();

          // Collect enhanced metadata
          const enhancedMetadata = await this.metadataEnhancer.collectMetadata("auto-image-diff", [
            "diff",
            image1Path,
            image2Path,
            outputPath,
          ]);

          // Mark as complete
          this.metadataEnhancer.markComplete(enhancedMetadata);

          const metadata = embedder.createMetadataFromResult(
            result,
            image1Path,
            image2Path,
            result.classification,
            enhancedMetadata
          );
          await embedder.embedMetadata(outputPath, metadata);
        } catch (error) {
          console.warn("Failed to embed metadata:", error);
        }
      }

      return result;
    } finally {
      // Clean up temporary files
      for (const tempFile of tempFiles) {
        try {
          await fs.unlink(tempFile);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Apply exclusion masks to images before comparison
   */
  private async applyExclusionMasks(
    image1Path: string,
    image2Path: string,
    exclusions: ExclusionsConfig
  ): Promise<{ maskedImage1: string; maskedImage2: string; tempFiles: string[] }> {
    const tempDir = os.tmpdir();
    const tempFiles: string[] = [];

    // Get image dimensions
    const dimensions = await this.getImageDimensions(image1Path);

    // Generate mask
    const maskGenerator = new MaskGenerator({ featherEdges: true, featherRadius: 3 });
    const mask = maskGenerator.generateMask(dimensions, exclusions.regions);

    // Create mask image file
    const maskPath = path.join(tempDir, `mask-${Date.now()}.png`);
    tempFiles.push(maskPath);

    // Create a PNG mask where excluded regions are black (0) and included are white (255)
    await this.createMaskImage(mask, dimensions.width, dimensions.height, maskPath);

    // Apply mask to both images
    const maskedImage1 = path.join(tempDir, `masked1-${Date.now()}.png`);
    const maskedImage2 = path.join(tempDir, `masked2-${Date.now()}.png`);
    tempFiles.push(maskedImage1, maskedImage2);

    // Use ImageMagick to apply the mask
    // This will make excluded regions transparent
    await execAsync(
      `convert "${image1Path}" "${maskPath}" -alpha off -compose CopyOpacity -composite "${maskedImage1}"`
    );
    await execAsync(
      `convert "${image2Path}" "${maskPath}" -alpha off -compose CopyOpacity -composite "${maskedImage2}"`
    );

    return { maskedImage1, maskedImage2, tempFiles };
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      imageMagick(imagePath).size((err, size) => {
        if (err) {
          reject(err);
        } else {
          resolve({ width: size.width, height: size.height });
        }
      });
    });
  }

  /**
   * Get image size using the same dimensions method
   */
  private async getImageSize(imagePath: string): Promise<{ width: number; height: number }> {
    return this.getImageDimensions(imagePath);
  }
  
  /**
   * Create cropped versions of images showing only matching content
   */
  async createCroppedVersions(
    image1Path: string,
    image2Path: string,
    matchingRegion: { x: number; y: number; width: number; height: number },
    _offset: { x: number; y: number },
    outputDir: string
  ): Promise<{ cropped1: string; cropped2: string }> {
    const cropped1 = path.join(outputDir, "cropped-reference.png");
    const cropped2 = path.join(outputDir, "cropped-aligned.png");
    
    // Crop reference image to matching region
    await execAsync(
      `convert "${image1Path}" -crop ${matchingRegion.width}x${matchingRegion.height}+${matchingRegion.x}+${matchingRegion.y} +repage "${cropped1}"`
    );
    
    // Crop aligned image to matching region
    await execAsync(
      `convert "${image2Path}" -crop ${matchingRegion.width}x${matchingRegion.height}+${matchingRegion.x}+${matchingRegion.y} +repage "${cropped2}"`
    );
    
    return { cropped1, cropped2 };
  }

  /**
   * Create a mask image from binary mask data
   */
  private async createMaskImage(
    mask: Uint8Array,
    width: number,
    height: number,
    outputPath: string
  ): Promise<void> {
    // Create a simple PGM (grayscale) image from the mask data
    // PGM format: P5 width height maxval data
    const header = `P5\n${width} ${height}\n255\n`;
    const headerBuffer = Buffer.from(header);
    const dataBuffer = Buffer.from(mask);
    const pgmBuffer = Buffer.concat([headerBuffer, dataBuffer]);

    // Write as PGM first
    const pgmPath = outputPath.replace(".png", ".pgm");
    await fs.writeFile(pgmPath, pgmBuffer);

    // Convert PGM to PNG using ImageMagick
    try {
      await execAsync(`convert "${pgmPath}" "${outputPath}"`);
    } finally {
      // Clean up temporary PGM file
      try {
        await fs.unlink(pgmPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Classify differences in the comparison
   */
  private async classifyDifferences(
    image1Path: string,
    image2Path: string,
    diffPath: string
  ): Promise<ClassificationSummary> {
    // Create classifier manager and register all classifiers
    const manager = new ClassifierManager();
    const classifiers = getAllClassifiers();
    classifiers.forEach((c) => manager.registerClassifier(c));

    // Load images as buffers for analysis
    const [image1Data, image2Data, diffData] = await Promise.all([
      fs.readFile(image1Path),
      fs.readFile(image2Path),
      fs.readFile(diffPath),
    ]);

    // Get image dimensions
    const dimensions = await this.getImageDimensions(image1Path);

    // For now, we'll analyze the entire image as one region
    // In a more sophisticated implementation, we would segment the diff into regions
    const region: import("./classifiers/base").DifferenceRegion = {
      id: 1,
      bounds: {
        x: 0,
        y: 0,
        width: dimensions.width,
        height: dimensions.height,
      },
      pixelCount: dimensions.width * dimensions.height,
      differencePixels: 0, // This would be calculated from the diff
      differencePercentage: 0, // This would be calculated
    };

    // Create analysis context
    // Note: This is a simplified implementation. A full implementation would
    // properly decode the image data into pixel arrays
    const context: import("./classifiers/base").AnalysisContext = {
      originalImage: {
        data: new Uint8Array(image1Data),
        width: dimensions.width,
        height: dimensions.height,
      },
      comparedImage: {
        data: new Uint8Array(image2Data),
        width: dimensions.width,
        height: dimensions.height,
      },
      diffMask: new Uint8Array(diffData),
    };

    // Calculate actual difference metrics from the diff image
    // This is a placeholder - real implementation would analyze the diff image
    const diffPixelCount = context.diffMask ? this.estimateDifferencePixels(context.diffMask) : 0;
    region.differencePixels = diffPixelCount;
    region.differencePercentage = (diffPixelCount / region.pixelCount) * 100;

    // Run classification
    const summary = manager.classifyRegions([region], context);
    return summary;
  }

  /**
   * Estimate the number of different pixels from a diff image
   * This is a simplified placeholder implementation
   */
  private estimateDifferencePixels(diffData: Uint8Array | Uint8ClampedArray): number {
    // In a real implementation, we would analyze the diff image
    // to count non-black pixels or pixels above a threshold
    let count = 0;
    for (let i = 0; i < diffData.length; i += 4) {
      // Check if pixel is not black (assuming RGBA format)
      if (diffData[i] > 10 || diffData[i + 1] > 10 || diffData[i + 2] > 10) {
        count++;
      }
    }
    return count;
  }
}
