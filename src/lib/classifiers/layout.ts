/**
 * @fileoverview Layout shifts classifier for detecting element position changes
 * @lastmodified 2025-08-01T15:30:00Z
 *
 * Features: Detect element movement, spacing changes, alignment shifts
 * Main APIs: LayoutClassifier class extending DifferenceClassifier
 * Constraints: Requires pattern matching to identify shifted elements
 * Patterns: Analyzes displacement patterns and structural similarity
 */

import {
  DifferenceClassifier,
  DifferenceType,
  DifferenceRegion,
  ClassificationResult,
  AnalysisContext,
} from "./base";

export class LayoutClassifier extends DifferenceClassifier {
  constructor() {
    super("LayoutClassifier", 6);
  }

  canClassify(region: DifferenceRegion, _context: AnalysisContext): boolean {
    // Layout shifts typically show moderate difference percentages
    return region.differencePercentage >= 10 && region.differencePercentage <= 70;
  }

  classify(region: DifferenceRegion, context: AnalysisContext): ClassificationResult | null {
    // Extract region data with padding to detect nearby shifts
    const padding = 20;
    const expandedBounds = this.expandBounds(region.bounds, padding, context.originalImage);

    const originalData = this.extractRegionData(
      context.originalImage.data,
      context.originalImage.width,
      expandedBounds
    );

    const comparedData = this.extractRegionData(
      context.comparedImage.data,
      context.comparedImage.width,
      expandedBounds
    );

    // Analyze shift patterns
    const shiftAnalysis = this.analyzeShiftPattern(originalData, comparedData, expandedBounds);
    
    // Check for structural similarity (layout shifts preserve structure)
    const structuralSimilarity = this.calculateStructuralSimilarity(
      originalData,
      comparedData,
      expandedBounds
    );

    // Analyze edge patterns
    const originalEdges = this.detectEdges(
      originalData,
      expandedBounds.width,
      expandedBounds.height
    );

    const comparedEdges = this.detectEdges(
      comparedData,
      expandedBounds.width,
      expandedBounds.height
    );

    // Calculate features
    const features = {
      hasConsistentShift: shiftAnalysis.consistent,
      shiftDistance: shiftAnalysis.distance,
      shiftDirection: shiftAnalysis.direction,
      structuralSimilarity,
      edgeAlignment: this.calculateEdgeAlignment(originalEdges, comparedEdges, shiftAnalysis),
      isHorizontalShift: Math.abs(shiftAnalysis.dx) > Math.abs(shiftAnalysis.dy),
      isVerticalShift: Math.abs(shiftAnalysis.dy) > Math.abs(shiftAnalysis.dx),
    };

    const confidence = this.calculateLayoutConfidence(features, region);

    if (confidence < 0.3) {
      return null;
    }

    const subType = this.determineLayoutSubType(features);

    return {
      type: DifferenceType.LAYOUT,
      confidence,
      subType,
      details: {
        shiftX: shiftAnalysis.dx,
        shiftY: shiftAnalysis.dy,
        shiftDistance: shiftAnalysis.distance,
        structuralSimilarity,
        edgeAlignment: features.edgeAlignment,
      },
    };
  }

  private expandBounds(
    bounds: DifferenceRegion["bounds"],
    padding: number,
    image: { width: number; height: number }
  ): DifferenceRegion["bounds"] {
    return {
      x: Math.max(0, bounds.x - padding),
      y: Math.max(0, bounds.y - padding),
      width: Math.min(image.width - bounds.x + padding, bounds.width + padding * 2),
      height: Math.min(image.height - bounds.y + padding, bounds.height + padding * 2),
    };
  }

  private analyzeShiftPattern(
    original: Uint8Array,
    compared: Uint8Array,
    bounds: DifferenceRegion["bounds"]
  ): { dx: number; dy: number; distance: number; consistent: boolean; direction: string } {
    // Simplified shift detection using cross-correlation
    const maxShift = 20;
    let bestMatch = { dx: 0, dy: 0, score: 0 };

    // Sample points for efficiency
    const sampleRate = 4;
    const samples: Array<{ x: number; y: number; value: number }> = [];

    for (let y = 0; y < bounds.height; y += sampleRate) {
      for (let x = 0; x < bounds.width; x += sampleRate) {
        const idx = (y * bounds.width + x) * 4;
        const gray = (original[idx] + original[idx + 1] + original[idx + 2]) / 3;
        if (gray > 30) {
          // Skip very dark pixels
          samples.push({ x, y, value: gray });
        }
      }
    }

    // Try different shifts
    for (let dy = -maxShift; dy <= maxShift; dy += 2) {
      for (let dx = -maxShift; dx <= maxShift; dx += 2) {
        let score = 0;
        let validSamples = 0;

        for (const sample of samples) {
          const newX = sample.x + dx;
          const newY = sample.y + dy;

          if (newX >= 0 && newX < bounds.width && newY >= 0 && newY < bounds.height) {
            const idx = (newY * bounds.width + newX) * 4;
            const gray = (compared[idx] + compared[idx + 1] + compared[idx + 2]) / 3;
            const diff = Math.abs(sample.value - gray);
            score += 255 - diff;
            validSamples++;
          }
        }

        if (validSamples > 0) {
          score /= validSamples;
          if (score > bestMatch.score) {
            bestMatch = { dx, dy, score };
          }
        }
      }
    }

    const distance = Math.sqrt(bestMatch.dx * bestMatch.dx + bestMatch.dy * bestMatch.dy);
    const consistent = bestMatch.score > 200; // High score indicates consistent shift

    // Determine direction
    let direction = "none";
    if (distance > 2) {
      const angle = Math.atan2(bestMatch.dy, bestMatch.dx) * (180 / Math.PI);
      if (angle >= -22.5 && angle < 22.5) direction = "right";
      else if (angle >= 22.5 && angle < 67.5) direction = "down-right";
      else if (angle >= 67.5 && angle < 112.5) direction = "down";
      else if (angle >= 112.5 && angle < 157.5) direction = "down-left";
      else if (angle >= -67.5 && angle < -22.5) direction = "up-right";
      else if (angle >= -112.5 && angle < -67.5) direction = "up";
      else if (angle >= -157.5 && angle < -112.5) direction = "up-left";
      else direction = "left";
    }

    return {
      dx: bestMatch.dx,
      dy: bestMatch.dy,
      distance,
      consistent,
      direction,
    };
  }

  private calculateStructuralSimilarity(
    original: Uint8Array,
    compared: Uint8Array,
    _bounds: DifferenceRegion["bounds"]
  ): number {
    // Calculate histogram similarity
    const originalHist = this.calculateHistogram(original);
    const comparedHist = this.calculateHistogram(compared);

    let similarity = 0;
    for (let i = 0; i < 256; i++) {
      similarity += Math.min(originalHist[i], comparedHist[i]);
    }

    return similarity;
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

  private calculateEdgeAlignment(
    original: { edgeCount: number; edgeDensity: number },
    compared: { edgeCount: number; edgeDensity: number },
    shift: { dx: number; dy: number; consistent: boolean }
  ): number {
    if (!shift.consistent) return 0;

    // If shift is detected and edges are preserved, alignment is high
    const edgePreservation = Math.min(
      original.edgeCount / (compared.edgeCount || 1),
      compared.edgeCount / (original.edgeCount || 1)
    );

    return edgePreservation;
  }

  private calculateLayoutConfidence(
    features: Record<string, number | boolean | string>,
    region: DifferenceRegion
  ): number {
    let confidence = 0;

    // Strong indicators of layout shift
    if (features.hasConsistentShift) confidence += 0.3;
    if ((features.shiftDistance as number) > 5) confidence += 0.2;
    if (features.structuralSimilarity as number > 0.7) confidence += 0.2;
    if (features.edgeAlignment as number > 0.7) confidence += 0.2;

    // Direction consistency
    if (features.isHorizontalShift || features.isVerticalShift) confidence += 0.1;

    // Penalize very high or very low difference percentages
    if (region.differencePercentage > 60) confidence *= 0.7;
    if (region.differencePercentage < 15) confidence *= 0.8;

    return Math.min(confidence, 1);
  }

  private determineLayoutSubType(features: Record<string, number | boolean | string>): string {
    const shiftDistance = features.shiftDistance as number;

    if (shiftDistance < 5) {
      return "micro-shift";
    }

    if (features.isHorizontalShift) {
      return "horizontal-shift";
    }

    if (features.isVerticalShift) {
      return "vertical-shift";
    }

    if (shiftDistance > 20) {
      return "major-shift";
    }

    return "diagonal-shift";
  }
}