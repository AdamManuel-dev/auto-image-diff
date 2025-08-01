/**
 * @fileoverview Base architecture for difference classification system
 * @lastmodified 2025-08-01T09:28:00Z
 * 
 * Features: Abstract classifier interface, region analysis, confidence scoring
 * Main APIs: DifferenceClassifier, DifferenceType, ClassificationResult
 * Constraints: Requires pixel data and region bounds for analysis
 * Patterns: Strategy pattern for pluggable classifiers, confidence-based results
 */

export enum DifferenceType {
  CONTENT = 'content',
  STYLE = 'style',
  LAYOUT = 'layout',
  SIZE = 'size',
  STRUCTURAL = 'structural',
  NEW_ELEMENT = 'new_element',
  REMOVED_ELEMENT = 'removed_element',
  UNKNOWN = 'unknown',
}

export interface DifferenceRegion {
  id: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  pixelCount: number;
  differencePixels: number;
  differencePercentage: number;
}

export interface ClassificationResult {
  type: DifferenceType;
  confidence: number; // 0-1
  subType?: string; // e.g., "text", "image", "color", "position"
  details?: Record<string, unknown>;
}

export interface AnalysisContext {
  originalImage: {
    data: Uint8Array | Uint8ClampedArray;
    width: number;
    height: number;
  };
  comparedImage: {
    data: Uint8Array | Uint8ClampedArray;
    width: number;
    height: number;
  };
  diffMask?: Uint8Array | Uint8ClampedArray; // Binary mask of differences
}

export abstract class DifferenceClassifier {
  protected name: string;
  protected priority: number; // Higher priority classifiers run first

  constructor(name: string, priority = 0) {
    this.name = name;
    this.priority = priority;
  }

  /**
   * Analyzes a difference region and returns classification result
   * 
   * Core method that each classifier must implement to analyze a specific
   * region of difference and determine what type of change it represents.
   *
   * @param {DifferenceRegion} region - The region to classify with bounds and metrics
   * @param {AnalysisContext} context - Full image context including original and compared data
   * @returns {ClassificationResult | null} Classification result with confidence, or null if cannot classify
   * 
   * @abstract
   */
  abstract classify(
    region: DifferenceRegion,
    context: AnalysisContext
  ): ClassificationResult | null;

  /**
   * Determines if this classifier can handle the given region
   * 
   * Pre-check method to quickly determine if this classifier is appropriate
   * for the given region type. Used to avoid expensive classification operations
   * on unsuitable regions.
   *
   * @param {DifferenceRegion} region - The region to check
   * @param {AnalysisContext} context - Image context
   * @returns {boolean} True if this classifier should attempt to classify the region
   * 
   * @abstract
   */
  abstract canClassify(
    region: DifferenceRegion,
    context: AnalysisContext
  ): boolean;

  getName(): string {
    return this.name;
  }

  getPriority(): number {
    return this.priority;
  }

  /**
   * Extract pixel data for a specific region from image data
   * 
   * Extracts RGBA pixel values for a rectangular region from the full image data.
   * Used by classifiers to analyze specific areas of difference.
   *
   * @param {Uint8Array | Uint8ClampedArray} imageData - Full image pixel data in RGBA format
   * @param {number} width - Width of the full image
   * @param {DifferenceRegion['bounds']} bounds - Region bounds to extract
   * @returns {Uint8Array} Extracted pixel data for the region in RGBA format
   * 
   * @protected
   */
  protected extractRegionData(
    imageData: Uint8Array | Uint8ClampedArray,
    width: number,
    bounds: DifferenceRegion['bounds']
  ): Uint8Array {
    const { x, y, width: w, height: h } = bounds;
    const regionData = new Uint8Array(w * h * 4);
    
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const srcIdx = ((y + row) * width + (x + col)) * 4;
        const dstIdx = (row * w + col) * 4;
        
        // Copy RGBA values
        regionData[dstIdx] = imageData[srcIdx];
        regionData[dstIdx + 1] = imageData[srcIdx + 1];
        regionData[dstIdx + 2] = imageData[srcIdx + 2];
        regionData[dstIdx + 3] = imageData[srcIdx + 3];
      }
    }
    
    return regionData;
  }

  /**
   * Calculate color statistics for a region
   * 
   * Analyzes pixel data to compute color statistics including average color,
   * variance, and dominant colors. Used by classifiers to detect color-based changes.
   *
   * @param {Uint8Array} pixelData - Region pixel data in RGBA format
   * @returns {Object} Color statistics
   * @returns {Object} returns.avgColor - Average RGBA color values
   * @returns {number} returns.variance - Color variance measure
   * @returns {Array<{color: string, count: number}>} returns.dominantColors - Most frequent colors
   * 
   * @protected
   */
  protected calculateColorStats(pixelData: Uint8Array): {
    avgColor: { r: number; g: number; b: number; a: number };
    variance: number;
    dominantColors: Array<{ color: string; count: number }>;
  } {
    let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
    const pixelCount = pixelData.length / 4;
    const colorMap = new Map<string, number>();

    for (let i = 0; i < pixelData.length; i += 4) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];
      const a = pixelData[i + 3];

      sumR += r;
      sumG += g;
      sumB += b;
      sumA += a;

      // Quantize colors for dominant color detection
      const quantized = `${Math.floor(r / 16) * 16},${Math.floor(g / 16) * 16},${Math.floor(b / 16) * 16}`;
      colorMap.set(quantized, (colorMap.get(quantized) || 0) + 1);
    }

    const avgColor = {
      r: Math.round(sumR / pixelCount),
      g: Math.round(sumG / pixelCount),
      b: Math.round(sumB / pixelCount),
      a: Math.round(sumA / pixelCount),
    };

    // Calculate variance
    let variance = 0;
    for (let i = 0; i < pixelData.length; i += 4) {
      const dr = pixelData[i] - avgColor.r;
      const dg = pixelData[i + 1] - avgColor.g;
      const db = pixelData[i + 2] - avgColor.b;
      variance += (dr * dr + dg * dg + db * db) / 3;
    }
    variance /= pixelCount;

    // Get top dominant colors
    const dominantColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color, count]) => ({ color, count }));

    return { avgColor, variance, dominantColors };
  }

  /**
   * Detect edges in a region using simple Sobel operator
   */
  protected detectEdges(
    pixelData: Uint8Array,
    width: number,
    height: number
  ): { edgeCount: number; edgeDensity: number } {
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    let edgeCount = 0;
    const threshold = 50;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;

        // Apply Sobel operators
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = (pixelData[idx] + pixelData[idx + 1] + pixelData[idx + 2]) / 3;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            gx += gray * sobelX[kernelIdx];
            gy += gray * sobelY[kernelIdx];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        if (magnitude > threshold) {
          edgeCount++;
        }
      }
    }

    const edgeDensity = edgeCount / ((width - 2) * (height - 2));
    return { edgeCount, edgeDensity };
  }

  /**
   * Calculate the bounding box shift between regions
   */
  protected calculateShift(
    _originalBounds: DifferenceRegion['bounds'],
    _context: AnalysisContext
  ): { dx: number; dy: number; distance: number } {
    // This is a simplified version - in practice, you'd use feature matching
    // to find the actual shift of content
    // const centerX1 = originalBounds.x + originalBounds.width / 2;
    // const centerY1 = originalBounds.y + originalBounds.height / 2;
    
    // For now, assume no shift (would need feature matching for real shift)
    const dx = 0;
    const dy = 0;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return { dx, dy, distance };
  }
}

/**
 * Registry for all available classifiers
 */
export class ClassifierRegistry {
  private static classifiers = new Map<DifferenceType, typeof DifferenceClassifier>();

  static register(type: DifferenceType, classifier: typeof DifferenceClassifier): void {
    this.classifiers.set(type, classifier);
  }

  static get(type: DifferenceType): typeof DifferenceClassifier | undefined {
    return this.classifiers.get(type);
  }

  static getAll(): Map<DifferenceType, typeof DifferenceClassifier> {
    return new Map(this.classifiers);
  }

  static create(type: DifferenceType, options?: Record<string, unknown>): DifferenceClassifier | null {
    const ClassifierClass = this.classifiers.get(type);
    if (!ClassifierClass) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return new (ClassifierClass as any)(options);
  }
}