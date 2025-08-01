/**
 * @fileoverview Size changes classifier for detecting element resizing and scaling
 * @lastmodified 2025-08-01T15:35:00Z
 *
 * Features: Detect element resizing, scaling, dimension changes
 * Main APIs: SizeClassifier class extending DifferenceClassifier
 * Constraints: Requires edge detection to identify element boundaries
 * Patterns: Analyzes aspect ratio changes and boundary modifications
 */

import {
  DifferenceClassifier,
  DifferenceType,
  DifferenceRegion,
  ClassificationResult,
  AnalysisContext,
} from "./base";

export class SizeClassifier extends DifferenceClassifier {
  constructor() {
    super("SizeClassifier", 3);
  }

  canClassify(region: DifferenceRegion, _context: AnalysisContext): boolean {
    // Size changes often show specific patterns in difference percentage
    return region.differencePercentage >= 5 && region.differencePercentage <= 80;
  }

  classify(region: DifferenceRegion, context: AnalysisContext): ClassificationResult | null {
    // Extract region data
    const originalData = this.extractRegionData(
      context.originalImage.data,
      context.originalImage.width,
      region.bounds
    );

    const comparedData = this.extractRegionData(
      context.comparedImage.data,
      context.comparedImage.width,
      region.bounds
    );

    // Detect element boundaries
    const originalBoundaries = this.detectElementBoundaries(
      originalData,
      region.bounds.width,
      region.bounds.height
    );

    const comparedBoundaries = this.detectElementBoundaries(
      comparedData,
      region.bounds.width,
      region.bounds.height
    );

    // Analyze size changes
    const sizeAnalysis = this.analyzeSizeChange(originalBoundaries, comparedBoundaries);

    // Check content preservation (size changes preserve content structure)
    const contentSimilarity = this.calculateContentSimilarity(
      originalData,
      comparedData,
      originalBoundaries,
      comparedBoundaries
    );

    // Calculate features
    const features = {
      hasBoundaryChange: sizeAnalysis.boundaryChanged,
      widthChange: sizeAnalysis.widthChange,
      heightChange: sizeAnalysis.heightChange,
      aspectRatioChange: sizeAnalysis.aspectRatioChange,
      scaleUniform: sizeAnalysis.uniformScale,
      contentPreserved: contentSimilarity > 0.7,
      expansionType: sizeAnalysis.expansionType,
    };

    const confidence = this.calculateSizeConfidence(features, region);

    if (confidence < 0.3) {
      return null;
    }

    const subType = this.determineSizeSubType(features);

    return {
      type: DifferenceType.SIZE,
      confidence,
      subType,
      details: {
        widthChange: sizeAnalysis.widthChange,
        heightChange: sizeAnalysis.heightChange,
        aspectRatioChange: sizeAnalysis.aspectRatioChange,
        originalSize: sizeAnalysis.originalSize,
        comparedSize: sizeAnalysis.comparedSize,
        contentSimilarity,
      },
    };
  }

  private detectElementBoundaries(
    data: Uint8Array,
    width: number,
    height: number
  ): { top: number; bottom: number; left: number; right: number } {
    // Find content boundaries by detecting non-background pixels
    let top = height;
    let bottom = 0;
    let left = width;
    let right = 0;

    // Detect edges first
    this.detectEdges(data, width, height);

    // Create edge map
    const edgeMap = new Uint8Array(width * height);
    const threshold = 50;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const sobelX = this.applySobelX(data, x, y, width);
        const sobelY = this.applySobelY(data, x, y, width);
        const magnitude = Math.sqrt(sobelX * sobelX + sobelY * sobelY);
        
        if (magnitude > threshold) {
          edgeMap[y * width + x] = 1;
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
          left = Math.min(left, x);
          right = Math.max(right, x);
        }
      }
    }

    // Fallback to color-based detection if no edges found
    if (top === height || left === width) {
      const bgColor = this.detectBackgroundColor(data, width, height);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const colorDiff = Math.abs(data[idx] - bgColor.r) +
                          Math.abs(data[idx + 1] - bgColor.g) +
                          Math.abs(data[idx + 2] - bgColor.b);
          
          if (colorDiff > 30) {
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
            left = Math.min(left, x);
            right = Math.max(right, x);
          }
        }
      }
    }

    return {
      top: top === height ? 0 : top,
      bottom: bottom === 0 ? height - 1 : bottom,
      left: left === width ? 0 : left,
      right: right === 0 ? width - 1 : right,
    };
  }

  private applySobelX(data: Uint8Array, x: number, y: number, width: number): number {
    const kernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    let sum = 0;

    for (let ky = -1; ky <= 1; ky++) {
      for (let kx = -1; kx <= 1; kx++) {
        const idx = ((y + ky) * width + (x + kx)) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        sum += gray * kernel[(ky + 1) * 3 + (kx + 1)];
      }
    }

    return sum;
  }

  private applySobelY(data: Uint8Array, x: number, y: number, width: number): number {
    const kernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    let sum = 0;

    for (let ky = -1; ky <= 1; ky++) {
      for (let kx = -1; kx <= 1; kx++) {
        const idx = ((y + ky) * width + (x + kx)) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        sum += gray * kernel[(ky + 1) * 3 + (kx + 1)];
      }
    }

    return sum;
  }

  private detectBackgroundColor(
    data: Uint8Array,
    width: number,
    height: number
  ): { r: number; g: number; b: number } {
    // Sample corners and edges
    const samples: Array<{ r: number; g: number; b: number }> = [];
    
    // Corners
    const corners = [
      { x: 0, y: 0 },
      { x: width - 1, y: 0 },
      { x: 0, y: height - 1 },
      { x: width - 1, y: height - 1 },
    ];

    for (const corner of corners) {
      const idx = (corner.y * width + corner.x) * 4;
      samples.push({
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
      });
    }

    // Find most common color
    const colorCounts = new Map<string, number>();
    for (const sample of samples) {
      const key = `${sample.r},${sample.g},${sample.b}`;
      colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    }

    let maxCount = 0;
    let bgColor = { r: 255, g: 255, b: 255 };
    
    for (const [key, count] of colorCounts) {
      if (count > maxCount) {
        maxCount = count;
        const [r, g, b] = key.split(",").map(Number);
        bgColor = { r, g, b };
      }
    }

    return bgColor;
  }

  private analyzeSizeChange(
    original: { top: number; bottom: number; left: number; right: number },
    compared: { top: number; bottom: number; left: number; right: number }
  ): {
    boundaryChanged: boolean;
    widthChange: number;
    heightChange: number;
    aspectRatioChange: number;
    uniformScale: boolean;
    expansionType: string;
    originalSize: { width: number; height: number };
    comparedSize: { width: number; height: number };
  } {
    const originalWidth = original.right - original.left + 1;
    const originalHeight = original.bottom - original.top + 1;
    const comparedWidth = compared.right - compared.left + 1;
    const comparedHeight = compared.bottom - compared.top + 1;

    const widthChange = (comparedWidth - originalWidth) / originalWidth;
    const heightChange = (comparedHeight - originalHeight) / originalHeight;

    const originalAspect = originalWidth / originalHeight;
    const comparedAspect = comparedWidth / comparedHeight;
    const aspectRatioChange = Math.abs(comparedAspect - originalAspect) / originalAspect;

    const uniformScale = Math.abs(widthChange - heightChange) < 0.1;

    let expansionType = "none";
    if (widthChange > 0.05 && heightChange > 0.05) {
      expansionType = "expand";
    } else if (widthChange < -0.05 && heightChange < -0.05) {
      expansionType = "shrink";
    } else if (Math.abs(widthChange) > 0.05 || Math.abs(heightChange) > 0.05) {
      expansionType = "stretch";
    }

    return {
      boundaryChanged: Math.abs(widthChange) > 0.05 || Math.abs(heightChange) > 0.05,
      widthChange,
      heightChange,
      aspectRatioChange,
      uniformScale,
      expansionType,
      originalSize: { width: originalWidth, height: originalHeight },
      comparedSize: { width: comparedWidth, height: comparedHeight },
    };
  }

  private calculateContentSimilarity(
    original: Uint8Array,
    compared: Uint8Array,
    originalBounds: { top: number; bottom: number; left: number; right: number },
    comparedBounds: { top: number; bottom: number; left: number; right: number }
  ): number {
    // Extract and normalize content regions
    const originalContent = this.extractContentRegion(original, originalBounds);
    const comparedContent = this.extractContentRegion(compared, comparedBounds);

    // Compare normalized histograms
    const originalHist = this.calculateHistogram(originalContent);
    const comparedHist = this.calculateHistogram(comparedContent);

    let similarity = 0;
    for (let i = 0; i < 256; i++) {
      similarity += Math.min(originalHist[i], comparedHist[i]);
    }

    return similarity;
  }

  private extractContentRegion(
    data: Uint8Array,
    bounds: { top: number; bottom: number; left: number; right: number }
  ): Uint8Array {
    const width = bounds.right - bounds.left + 1;
    const height = bounds.bottom - bounds.top + 1;
    const content = new Uint8Array(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = ((bounds.top + y) * Math.sqrt(data.length / 4) + (bounds.left + x)) * 4;
        const dstIdx = (y * width + x) * 4;
        
        content[dstIdx] = data[srcIdx];
        content[dstIdx + 1] = data[srcIdx + 1];
        content[dstIdx + 2] = data[srcIdx + 2];
        content[dstIdx + 3] = data[srcIdx + 3];
      }
    }

    return content;
  }

  private calculateHistogram(data: Uint8Array): Float32Array {
    const histogram = new Float32Array(256);
    let total = 0;

    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
      histogram[gray]++;
      total++;
    }

    // Normalize
    if (total > 0) {
      for (let i = 0; i < 256; i++) {
        histogram[i] /= total;
      }
    }

    return histogram;
  }

  private calculateSizeConfidence(
    features: Record<string, number | boolean | string>,
    region: DifferenceRegion
  ): number {
    let confidence = 0;

    // Strong indicators of size change
    if (features.hasBoundaryChange) confidence += 0.3;
    if (features.contentPreserved) confidence += 0.3;
    if (Math.abs(features.widthChange as number) > 0.1) confidence += 0.15;
    if (Math.abs(features.heightChange as number) > 0.1) confidence += 0.15;
    if (features.scaleUniform) confidence += 0.1;

    // Penalize if aspect ratio changes significantly without uniform scale
    if (!features.scaleUniform && (features.aspectRatioChange as number) > 0.2) {
      confidence *= 0.8;
    }

    // Adjust based on difference percentage
    if (region.differencePercentage > 70) confidence *= 0.7;

    return Math.min(confidence, 1);
  }

  private determineSizeSubType(features: Record<string, number | boolean | string>): string {
    const expansionType = features.expansionType as string;

    if (features.scaleUniform) {
      return expansionType === "expand" ? "scale-up" : expansionType === "shrink" ? "scale-down" : "scale";
    }

    if (Math.abs(features.widthChange as number) > Math.abs(features.heightChange as number) * 2) {
      return "horizontal-resize";
    }

    if (Math.abs(features.heightChange as number) > Math.abs(features.widthChange as number) * 2) {
      return "vertical-resize";
    }

    if (features.aspectRatioChange as number > 0.2) {
      return "aspect-change";
    }

    return expansionType;
  }
}