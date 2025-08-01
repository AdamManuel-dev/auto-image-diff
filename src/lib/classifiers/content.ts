/**
 * @fileoverview Content changes classifier for detecting text and image content changes
 * @lastmodified 2025-08-01T15:20:00Z
 *
 * Features: Detect text changes, image replacements, content modifications
 * Main APIs: ContentClassifier class extending DifferenceClassifier
 * Constraints: Requires sufficient content density to classify as content change
 * Patterns: Analyzes edge density, color variance, and region characteristics
 */

import {
  DifferenceClassifier,
  DifferenceType,
  DifferenceRegion,
  ClassificationResult,
  AnalysisContext,
} from "./base";

export class ContentClassifier extends DifferenceClassifier {
  constructor() {
    super("ContentClassifier", 5);
  }

  canClassify(region: DifferenceRegion, _context: AnalysisContext): boolean {
    // Content changes typically affect at least 5% of the region
    return region.differencePercentage >= 5;
  }

  classify(region: DifferenceRegion, context: AnalysisContext): ClassificationResult | null {
    // Extract region data for analysis
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

    // Analyze characteristics
    const originalStats = this.calculateColorStats(originalData);
    const comparedStats = this.calculateColorStats(comparedData);

    const originalEdges = this.detectEdges(
      originalData,
      region.bounds.width,
      region.bounds.height
    );

    const comparedEdges = this.detectEdges(
      comparedData,
      region.bounds.width,
      region.bounds.height
    );

    // Calculate features that indicate content changes
    const colorVarianceChange = Math.abs(originalStats.variance - comparedStats.variance);
    const edgeDensityChange = Math.abs(originalEdges.edgeDensity - comparedEdges.edgeDensity);
    const dominantColorChange = this.calculateDominantColorChange(
      originalStats.dominantColors,
      comparedStats.dominantColors
    );

    // Determine if this is a content change
    const features = {
      highEdgeDensity: originalEdges.edgeDensity > 0.1 || comparedEdges.edgeDensity > 0.1,
      significantEdgeChange: edgeDensityChange > 0.05,
      highColorVariance: originalStats.variance > 1000 || comparedStats.variance > 1000,
      significantColorChange: dominantColorChange > 0.3,
      largeRegion: region.pixelCount > 1000,
    };

    const confidence = this.calculateContentConfidence(features, region);

    if (confidence < 0.3) {
      return null;
    }

    // Determine sub-type
    const subType = this.determineContentSubType(features, originalEdges, comparedEdges);

    return {
      type: DifferenceType.CONTENT,
      confidence,
      subType,
      details: {
        edgeDensityChange,
        colorVarianceChange,
        dominantColorChange,
        originalEdgeDensity: originalEdges.edgeDensity,
        comparedEdgeDensity: comparedEdges.edgeDensity,
      },
    };
  }

  private calculateDominantColorChange(
    original: Array<{ color: string; count: number }>,
    compared: Array<{ color: string; count: number }>
  ): number {
    if (original.length === 0 || compared.length === 0) return 1;

    // Create color maps
    const originalMap = new Map(original.map((c) => [c.color, c.count]));
    const comparedMap = new Map(compared.map((c) => [c.color, c.count]));

    // Calculate similarity
    let matchingColors = 0;
    let totalColors = new Set([...originalMap.keys(), ...comparedMap.keys()]).size;

    for (const [color, count] of originalMap) {
      if (comparedMap.has(color)) {
        const comparedCount = comparedMap.get(color) || 0;
        const diff = Math.abs(count - comparedCount);
        const maxCount = Math.max(count, comparedCount);
        if (diff / maxCount < 0.3) {
          matchingColors++;
        }
      }
    }

    return 1 - matchingColors / totalColors;
  }

  private calculateContentConfidence(
    features: Record<string, boolean | number>,
    region: DifferenceRegion
  ): number {
    let confidence = 0;

    // High edge density suggests text or detailed content
    if (features.highEdgeDensity) confidence += 0.3;
    if (features.significantEdgeChange) confidence += 0.2;

    // Color variance indicates rich content
    if (features.highColorVariance) confidence += 0.2;
    if (features.significantColorChange) confidence += 0.2;

    // Larger regions are more likely to be content
    if (features.largeRegion) confidence += 0.1;

    // Boost confidence for high difference percentage
    if (region.differencePercentage > 50) confidence += 0.2;
    else if (region.differencePercentage > 30) confidence += 0.1;

    return Math.min(confidence, 1);
  }

  private determineContentSubType(
    features: Record<string, boolean | number>,
    originalEdges: { edgeCount: number; edgeDensity: number },
    comparedEdges: { edgeCount: number; edgeDensity: number }
  ): string {
    // Very high edge density typically indicates text
    if (originalEdges.edgeDensity > 0.3 || comparedEdges.edgeDensity > 0.3) {
      return "text";
    }

    // Moderate edge density with high variance suggests images
    if (features.highColorVariance && features.highEdgeDensity) {
      return "image";
    }

    // Low edge density with color changes suggests solid content changes
    if (!features.highEdgeDensity && features.significantColorChange) {
      return "solid";
    }

    return "mixed";
  }
}