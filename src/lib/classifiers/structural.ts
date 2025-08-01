/**
 * @fileoverview Structural changes classifier for detecting new/removed elements
 * @lastmodified 2025-08-01T15:40:00Z
 *
 * Features: Detect new elements, removed elements, structural modifications
 * Main APIs: StructuralClassifier class extending DifferenceClassifier
 * Constraints: Requires clear distinction between presence and absence of content
 * Patterns: Analyzes presence patterns and content existence
 */

import {
  DifferenceClassifier,
  DifferenceType,
  DifferenceRegion,
  ClassificationResult,
  AnalysisContext,
} from "./base";

export class StructuralClassifier extends DifferenceClassifier {
  constructor() {
    super("StructuralClassifier", 7);
  }

  canClassify(region: DifferenceRegion, _context: AnalysisContext): boolean {
    // Structural changes typically show very high or specific difference patterns
    return region.differencePercentage >= 30;
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

    // Analyze presence of content
    const originalPresence = this.analyzeContentPresence(originalData);
    const comparedPresence = this.analyzeContentPresence(comparedData);

    // Detect structural patterns
    const structuralAnalysis = this.analyzeStructuralChange(
      originalPresence,
      comparedPresence,
      originalData,
      comparedData
    );

    // Check for complete addition or removal
    const isAddition = !originalPresence.hasContent && comparedPresence.hasContent;
    const isRemoval = originalPresence.hasContent && !comparedPresence.hasContent;
    const isPartialChange = originalPresence.hasContent && comparedPresence.hasContent;

    // Calculate features
    const features = {
      isAddition,
      isRemoval,
      isPartialChange,
      contentDensityChange: Math.abs(
        comparedPresence.contentDensity - originalPresence.contentDensity
      ),
      coverageChange: Math.abs(comparedPresence.coverage - originalPresence.coverage),
      structuralType: structuralAnalysis.type,
      originalEmpty: !originalPresence.hasContent,
      comparedEmpty: !comparedPresence.hasContent,
    };

    const confidence = this.calculateStructuralConfidence(features, region);

    if (confidence < 0.3) {
      return null;
    }

    const subType = this.determineStructuralSubType(features, structuralAnalysis);

    return {
      type: DifferenceType.STRUCTURAL,
      confidence,
      subType,
      details: {
        isAddition,
        isRemoval,
        originalContentDensity: originalPresence.contentDensity,
        comparedContentDensity: comparedPresence.contentDensity,
        originalCoverage: originalPresence.coverage,
        comparedCoverage: comparedPresence.coverage,
        structuralPattern: structuralAnalysis.pattern,
      },
    };
  }

  private analyzeContentPresence(data: Uint8Array): {
    hasContent: boolean;
    contentDensity: number;
    coverage: number;
    backgroundRatio: number;
  } {
    // Detect background color
    const bgColor = this.detectDominantBackgroundColor(data);
    
    let contentPixels = 0;
    let edgePixels = 0;
    const totalPixels = data.length / 4;

    // Analyze each pixel
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Check if pixel is different from background
      const colorDiff =
        Math.abs(r - bgColor.r) + Math.abs(g - bgColor.g) + Math.abs(b - bgColor.b);

      if (colorDiff > 30 || a < 250) {
        contentPixels++;
      }
    }

    // Detect edges for structure analysis
    const width = Math.sqrt(data.length / 4);
    const height = width;
    const edges = this.detectEdges(data, width, height);
    edgePixels = edges.edgeCount;

    const contentDensity = contentPixels / totalPixels;
    const coverage = contentDensity;
    const backgroundRatio = 1 - contentDensity;

    return {
      hasContent: contentDensity > 0.05 || edgePixels > 10,
      contentDensity,
      coverage,
      backgroundRatio,
    };
  }

  private detectDominantBackgroundColor(
    data: Uint8Array
  ): { r: number; g: number; b: number } {
    // Sample pixels from edges and corners
    const samples: Array<{ r: number; g: number; b: number }> = [];
    const width = Math.sqrt(data.length / 4);
    const height = width;

    // Sample corners
    const positions = [
      0, // top-left
      (width - 1) * 4, // top-right
      (height - 1) * width * 4, // bottom-left
      ((height - 1) * width + width - 1) * 4, // bottom-right
    ];

    // Sample edges
    for (let i = 0; i < 10; i++) {
      const x = Math.floor((width - 1) * (i / 9));
      positions.push(x * 4); // top edge
      positions.push(((height - 1) * width + x) * 4); // bottom edge
    }

    for (const pos of positions) {
      if (pos < data.length - 3) {
        samples.push({
          r: data[pos],
          g: data[pos + 1],
          b: data[pos + 2],
        });
      }
    }

    // Find most common color
    const colorCounts = new Map<string, { count: number; color: { r: number; g: number; b: number } }>();
    
    for (const sample of samples) {
      const key = `${Math.floor(sample.r / 10) * 10},${Math.floor(sample.g / 10) * 10},${
        Math.floor(sample.b / 10) * 10
      }`;
      
      const existing = colorCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        colorCounts.set(key, { count: 1, color: sample });
      }
    }

    let maxCount = 0;
    let dominantColor = { r: 255, g: 255, b: 255 };

    for (const [_, value] of colorCounts) {
      if (value && value.count > maxCount) {
        maxCount = value.count;
        dominantColor = value.color;
      }
    }

    return dominantColor;
  }

  private analyzeStructuralChange(
    original: {
      hasContent: boolean;
      contentDensity: number;
      coverage: number;
      backgroundRatio: number;
    },
    compared: {
      hasContent: boolean;
      contentDensity: number;
      coverage: number;
      backgroundRatio: number;
    },
    originalData: Uint8Array,
    comparedData: Uint8Array
  ): { type: string; pattern: string } {
    // Determine type of structural change
    let type = "unknown";
    let pattern = "none";

    if (!original.hasContent && compared.hasContent) {
      type = "addition";
      pattern = this.detectAdditionPattern(comparedData);
    } else if (original.hasContent && !compared.hasContent) {
      type = "removal";
      pattern = this.detectRemovalPattern(originalData);
    } else if (original.hasContent && compared.hasContent) {
      const densityRatio = compared.contentDensity / original.contentDensity;
      
      if (densityRatio > 1.5) {
        type = "expansion";
        pattern = "content-increase";
      } else if (densityRatio < 0.5) {
        type = "reduction";
        pattern = "content-decrease";
      } else {
        type = "modification";
        pattern = "content-change";
      }
    }

    return { type, pattern };
  }

  private detectAdditionPattern(data: Uint8Array): string {
    const width = Math.sqrt(data.length / 4);
    const height = width;

    // Analyze content distribution
    const quadrants = this.analyzeQuadrants(data, width, height);
    const edges = this.detectEdges(data, width, height);

    if (edges.edgeDensity > 0.3) {
      return "text-addition";
    }

    if (quadrants.filled >= 3) {
      return "block-addition";
    }

    if (edges.edgeDensity > 0.1) {
      return "element-addition";
    }

    return "content-addition";
  }

  private detectRemovalPattern(data: Uint8Array): string {
    const width = Math.sqrt(data.length / 4);
    const height = width;

    const edges = this.detectEdges(data, width, height);
    const quadrants = this.analyzeQuadrants(data, width, height);

    if (edges.edgeDensity > 0.3) {
      return "text-removal";
    }

    if (quadrants.filled >= 3) {
      return "block-removal";
    }

    return "element-removal";
  }

  private analyzeQuadrants(
    data: Uint8Array,
    width: number,
    height: number
  ): { filled: number; pattern: string } {
    const midX = Math.floor(width / 2);
    const midY = Math.floor(height / 2);
    const quadrants = [false, false, false, false];

    // Check each quadrant for content
    const bgColor = this.detectDominantBackgroundColor(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const colorDiff =
          Math.abs(data[idx] - bgColor.r) +
          Math.abs(data[idx + 1] - bgColor.g) +
          Math.abs(data[idx + 2] - bgColor.b);

        if (colorDiff > 30) {
          const quadIdx = (y < midY ? 0 : 2) + (x < midX ? 0 : 1);
          quadrants[quadIdx] = true;
        }
      }
    }

    const filled = quadrants.filter((q) => q).length;
    let pattern = "scattered";

    if (filled === 4) pattern = "full";
    else if (filled === 2) {
      if ((quadrants[0] && quadrants[1]) || (quadrants[2] && quadrants[3])) {
        pattern = "horizontal";
      } else if ((quadrants[0] && quadrants[2]) || (quadrants[1] && quadrants[3])) {
        pattern = "vertical";
      }
    } else if (filled === 1) {
      pattern = "corner";
    }

    return { filled, pattern };
  }

  private calculateStructuralConfidence(
    features: Record<string, number | boolean | string>,
    region: DifferenceRegion
  ): number {
    let confidence = 0;

    // Very strong indicators
    if (features.isAddition || features.isRemoval) {
      confidence += 0.5;
    }

    // Strong indicators
    if (features.contentDensityChange as number > 0.5) confidence += 0.2;
    if (features.coverageChange as number > 0.5) confidence += 0.2;

    // Additional confidence for clear patterns
    if (
      (features.originalEmpty && !features.comparedEmpty) ||
      (!features.originalEmpty && features.comparedEmpty)
    ) {
      confidence += 0.2;
    }

    // Partial changes get lower confidence
    if (features.isPartialChange) {
      confidence *= 0.7;
    }

    // High difference percentage supports structural change
    if (region.differencePercentage > 70) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1);
  }

  private determineStructuralSubType(
    features: Record<string, number | boolean | string>,
    analysis: { type: string; pattern: string }
  ): string {
    if (features.isAddition) {
      return `new-${analysis.pattern}`;
    }

    if (features.isRemoval) {
      return `removed-${analysis.pattern}`;
    }

    if (analysis.type === "expansion") {
      return "element-expansion";
    }

    if (analysis.type === "reduction") {
      return "element-reduction";
    }

    return "structural-modification";
  }
}