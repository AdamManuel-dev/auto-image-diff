/**
 * @fileoverview Style changes classifier for detecting color, theme, and visual style changes
 * @lastmodified 2025-08-01T15:25:00Z
 *
 * Features: Detect color scheme changes, theme modifications, style updates
 * Main APIs: StyleClassifier class extending DifferenceClassifier
 * Constraints: Focuses on color and visual appearance changes without content modification
 * Patterns: Analyzes color distribution, brightness, saturation changes
 */

import {
  DifferenceClassifier,
  DifferenceType,
  DifferenceRegion,
  ClassificationResult,
  AnalysisContext,
} from "./base";

export class StyleClassifier extends DifferenceClassifier {
  constructor() {
    super("StyleClassifier", 4);
  }

  canClassify(region: DifferenceRegion, _context: AnalysisContext): boolean {
    // Style changes can be subtle, so we accept lower thresholds
    return region.differencePercentage >= 2;
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

    // Analyze color characteristics
    const originalColors = this.analyzeColorCharacteristics(originalData);
    const comparedColors = this.analyzeColorCharacteristics(comparedData);

    // Check for edge preservation (style changes typically preserve edges)
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

    const edgePreservation = this.calculateEdgePreservation(originalEdges, comparedEdges);

    // Calculate style change features
    const features = {
      colorShift: this.calculateColorShift(originalColors, comparedColors),
      brightnessChange: Math.abs(originalColors.brightness - comparedColors.brightness),
      saturationChange: Math.abs(originalColors.saturation - comparedColors.saturation),
      hueShift: this.calculateHueShift(originalColors.avgHue, comparedColors.avgHue),
      edgesPreserved: edgePreservation > 0.8,
      contrastChange: Math.abs(originalColors.contrast - comparedColors.contrast),
    };

    const confidence = this.calculateStyleConfidence(features, region);

    if (confidence < 0.3) {
      return null;
    }

    const subType = this.determineStyleSubType(features);

    return {
      type: DifferenceType.STYLE,
      confidence,
      subType,
      details: {
        ...features,
        edgePreservation,
        originalBrightness: originalColors.brightness,
        comparedBrightness: comparedColors.brightness,
        originalSaturation: originalColors.saturation,
        comparedSaturation: comparedColors.saturation,
      },
    };
  }

  private analyzeColorCharacteristics(pixelData: Uint8Array): {
    brightness: number;
    saturation: number;
    avgHue: number;
    contrast: number;
    avgColor: { r: number; g: number; b: number };
  } {
    let totalBrightness = 0;
    let totalSaturation = 0;
    let totalHue = 0;
    let minBrightness = 255;
    let maxBrightness = 0;
    const pixelCount = pixelData.length / 4;

    const stats = this.calculateColorStats(pixelData);

    for (let i = 0; i < pixelData.length; i += 4) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];

      // Convert to HSL
      const hsl = this.rgbToHsl(r, g, b);
      totalHue += hsl.h;
      totalSaturation += hsl.s;
      totalBrightness += hsl.l;

      minBrightness = Math.min(minBrightness, hsl.l);
      maxBrightness = Math.max(maxBrightness, hsl.l);
    }

    return {
      brightness: totalBrightness / pixelCount,
      saturation: totalSaturation / pixelCount,
      avgHue: totalHue / pixelCount,
      contrast: maxBrightness - minBrightness,
      avgColor: stats.avgColor,
    };
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return { h: h * 360, s, l };
  }

  private calculateColorShift(
    original: { avgColor: { r: number; g: number; b: number } },
    compared: { avgColor: { r: number; g: number; b: number } }
  ): number {
    const dr = original.avgColor.r - compared.avgColor.r;
    const dg = original.avgColor.g - compared.avgColor.g;
    const db = original.avgColor.b - compared.avgColor.b;

    return Math.sqrt(dr * dr + dg * dg + db * db) / 255;
  }

  private calculateHueShift(originalHue: number, comparedHue: number): number {
    let diff = Math.abs(originalHue - comparedHue);
    if (diff > 180) diff = 360 - diff;
    return diff / 180; // Normalize to 0-1
  }

  private calculateEdgePreservation(
    original: { edgeCount: number; edgeDensity: number },
    compared: { edgeCount: number; edgeDensity: number }
  ): number {
    if (original.edgeCount === 0) return compared.edgeCount === 0 ? 1 : 0;

    const densityRatio = Math.min(
      original.edgeDensity / compared.edgeDensity,
      compared.edgeDensity / original.edgeDensity
    );

    const countRatio = Math.min(
      original.edgeCount / compared.edgeCount,
      compared.edgeCount / original.edgeCount
    );

    return (densityRatio + countRatio) / 2;
  }

  private calculateStyleConfidence(
    features: Record<string, number | boolean>,
    region: DifferenceRegion
  ): number {
    let confidence = 0;

    // Strong indicators of style change
    if (features.edgesPreserved) confidence += 0.3;
    if (features.colorShift as number > 0.1) confidence += 0.2;
    if (features.brightnessChange as number > 0.1) confidence += 0.15;
    if (features.saturationChange as number > 0.1) confidence += 0.15;
    if (features.hueShift as number > 0.1) confidence += 0.1;
    if (features.contrastChange as number > 0.1) confidence += 0.1;

    // Penalize if edges are not preserved
    if (!features.edgesPreserved && region.differencePercentage > 30) {
      confidence *= 0.5;
    }

    return Math.min(confidence, 1);
  }

  private determineStyleSubType(features: Record<string, number | boolean>): string {
    const colorShift = features.colorShift as number;
    const brightnessChange = features.brightnessChange as number;
    const saturationChange = features.saturationChange as number;
    const hueShift = features.hueShift as number;

    // Theme change (dark/light mode)
    if (brightnessChange > 0.3 && features.edgesPreserved) {
      return "theme";
    }

    // Color scheme change
    if (hueShift > 0.2 || colorShift > 0.2) {
      return "color-scheme";
    }

    // Saturation/vibrancy change
    if (saturationChange > 0.2) {
      return "saturation";
    }

    // Contrast adjustment
    if (features.contrastChange as number > 0.2) {
      return "contrast";
    }

    // Minor color adjustment
    if (colorShift > 0.05) {
      return "color-adjustment";
    }

    return "subtle";
  }
}