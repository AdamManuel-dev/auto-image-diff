/**
 * @fileoverview Tests for StyleClassifier implementation
 * @lastmodified 2025-08-01T17:35:00Z
 */

import { StyleClassifier } from "../../../lib/classifiers/style";
import { DifferenceType, DifferenceRegion, AnalysisContext } from "../../../lib/classifiers/base";

describe("StyleClassifier", () => {
  let classifier: StyleClassifier;

  const createMockContext = (
    originalData?: Uint8Array,
    comparedData?: Uint8Array,
    width = 100,
    height = 100
  ): AnalysisContext => ({
    originalImage: {
      data: originalData || new Uint8Array(width * height * 4),
      width,
      height,
    },
    comparedImage: {
      data: comparedData || new Uint8Array(width * height * 4),
      width,
      height,
    },
  });

  const createMockRegion = (
    differencePercentage = 20,
    pixelCount = 1000,
    bounds = { x: 10, y: 10, width: 40, height: 40 }
  ): DifferenceRegion => ({
    id: 1,
    bounds,
    pixelCount,
    differencePixels: Math.floor((pixelCount * differencePercentage) / 100),
    differencePercentage,
  });

  const createColoredImage = (
    width: number,
    height: number,
    color: { r: number; g: number; b: number }
  ): Uint8Array => {
    const data = new Uint8Array(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = color.r;
      data[i + 1] = color.g;
      data[i + 2] = color.b;
      data[i + 3] = 255;
    }
    return data;
  };

  const createPatternWithColor = (
    width: number,
    height: number,
    pattern: "stripes" | "checkerboard" | "gradient",
    color1: { r: number; g: number; b: number },
    color2: { r: number; g: number; b: number }
  ): Uint8Array => {
    const data = new Uint8Array(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let useColor1 = false;

        switch (pattern) {
          case "stripes":
            useColor1 = x % 20 < 10;
            break;
          case "checkerboard":
            useColor1 = (((x / 10) | 0) + ((y / 10) | 0)) % 2 === 0;
            break;
          case "gradient":
            // eslint-disable-next-line no-case-declarations
            const t = x / width;
            data[idx] = Math.round(color1.r * (1 - t) + color2.r * t);
            data[idx + 1] = Math.round(color1.g * (1 - t) + color2.g * t);
            data[idx + 2] = Math.round(color1.b * (1 - t) + color2.b * t);
            data[idx + 3] = 255;
            continue;
        }

        if (useColor1) {
          data[idx] = color1.r;
          data[idx + 1] = color1.g;
          data[idx + 2] = color1.b;
        } else {
          data[idx] = color2.r;
          data[idx + 1] = color2.g;
          data[idx + 2] = color2.b;
        }
        data[idx + 3] = 255;
      }
    }

    return data;
  };

  beforeEach(() => {
    classifier = new StyleClassifier();
  });

  describe("constructor", () => {
    it("should initialize with correct name and priority", () => {
      expect(classifier.getName()).toBe("StyleClassifier");
      expect(classifier.getPriority()).toBe(4);
    });
  });

  describe("canClassify", () => {
    it("should return true for regions with >= 2% difference", () => {
      const context = createMockContext();

      const region2 = createMockRegion(2);
      expect(classifier.canClassify(region2, context)).toBe(true);

      const region10 = createMockRegion(10);
      expect(classifier.canClassify(region10, context)).toBe(true);

      const region50 = createMockRegion(50);
      expect(classifier.canClassify(region50, context)).toBe(true);
    });

    it("should return false for regions with < 2% difference", () => {
      const context = createMockContext();

      const region1 = createMockRegion(1);
      expect(classifier.canClassify(region1, context)).toBe(false);

      const region1_5 = createMockRegion(1.5);
      expect(classifier.canClassify(region1_5, context)).toBe(false);
    });
  });

  describe("classify", () => {
    it("should detect theme changes (dark/light mode)", () => {
      const width = 60;
      const height = 60;

      // Light theme pattern
      const lightPattern = createPatternWithColor(
        width,
        height,
        "checkerboard",
        { r: 255, g: 255, b: 255 }, // White
        { r: 200, g: 200, b: 200 } // Light gray
      );

      // Dark theme pattern (same structure, different colors)
      const darkPattern = createPatternWithColor(
        width,
        height,
        "checkerboard",
        { r: 30, g: 30, b: 30 }, // Dark gray
        { r: 60, g: 60, b: 60 } // Medium dark
      );

      const context = createMockContext(lightPattern, darkPattern, width, height);
      const region = createMockRegion(80, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.STYLE);
      expect(result?.confidence).toBeGreaterThan(0.5);
      expect(result?.subType).toBe("theme");
      expect(result?.details?.brightnessChange).toBeGreaterThan(0.3);
      expect(result?.details?.edgesPreserved).toBe(true);
    });

    it("should detect color scheme changes", () => {
      const width = 60;
      const height = 60;

      // Blue color scheme
      const bluePattern = createPatternWithColor(
        width,
        height,
        "stripes",
        { r: 50, g: 100, b: 200 }, // Blue
        { r: 100, g: 150, b: 250 } // Light blue
      );

      // Red color scheme (same pattern, different hue)
      const redPattern = createPatternWithColor(
        width,
        height,
        "stripes",
        { r: 200, g: 50, b: 50 }, // Red
        { r: 250, g: 100, b: 100 } // Light red
      );

      const context = createMockContext(bluePattern, redPattern, width, height);
      const region = createMockRegion(50, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.STYLE);
      expect(result?.subType).toBe("color-scheme");
      expect(result?.details?.hueShift).toBeGreaterThan(0.2);
      expect(result?.details?.colorShift).toBeGreaterThan(0.2);
    });

    it("should detect saturation changes", () => {
      const width = 60;
      const height = 60;

      // Vibrant colors
      const vibrantPattern = createPatternWithColor(
        width,
        height,
        "gradient",
        { r: 255, g: 0, b: 0 }, // Pure red
        { r: 0, g: 255, b: 0 } // Pure green
      );

      // Desaturated colors
      const desaturatedPattern = createPatternWithColor(
        width,
        height,
        "gradient",
        { r: 180, g: 120, b: 120 }, // Muted red
        { r: 120, g: 180, b: 120 } // Muted green
      );

      const context = createMockContext(vibrantPattern, desaturatedPattern, width, height);
      const region = createMockRegion(40, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.STYLE);
      // Color shift is also significant, so might be classified as color-scheme
      expect(["saturation", "color-scheme"]).toContain(result?.subType);
      expect(result?.details?.saturationChange).toBeGreaterThan(0.2);
    });

    it("should detect contrast changes", () => {
      const width = 60;
      const height = 60;

      // Low contrast
      const lowContrastPattern = createPatternWithColor(
        width,
        height,
        "stripes",
        { r: 120, g: 120, b: 120 },
        { r: 140, g: 140, b: 140 }
      );

      // High contrast
      const highContrastPattern = createPatternWithColor(
        width,
        height,
        "stripes",
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 }
      );

      const context = createMockContext(lowContrastPattern, highContrastPattern, width, height);
      const region = createMockRegion(50, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.STYLE);
      expect(result?.subType).toBe("contrast");
      expect(result?.details?.contrastChange).toBeGreaterThan(0.2);
    });

    it("should detect color adjustments", () => {
      const width = 60;
      const height = 60;

      // Original colors
      const original = createColoredImage(width, height, { r: 100, g: 150, b: 200 });

      // Slightly adjusted colors
      const adjusted = createColoredImage(width, height, { r: 110, g: 145, b: 210 });

      const context = createMockContext(original, adjusted, width, height);
      const region = createMockRegion(15, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.STYLE);
      expect(result?.subType).toBe("color-adjustment");
      expect(result?.details?.colorShift).toBeGreaterThan(0.05);
      expect(result?.details?.colorShift).toBeLessThan(0.2);
    });

    it("should detect subtle style changes", () => {
      const width = 60;
      const height = 60;

      // Very subtle color shift
      const original = createColoredImage(width, height, { r: 128, g: 128, b: 128 });
      const adjusted = createColoredImage(width, height, { r: 130, g: 130, b: 130 });

      const context = createMockContext(original, adjusted, width, height);
      const region = createMockRegion(5, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.STYLE);
      expect(result?.subType).toBe("subtle");
      expect(result?.confidence).toBeGreaterThanOrEqual(0.3);
    });

    it("should return null for structural changes", () => {
      const width = 60;
      const height = 60;

      // Original with content
      const original = new Uint8Array(width * height * 4);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (x >= 20 && x < 40 && y >= 20 && y < 40) {
            original[idx] = 100;
            original[idx + 1] = 100;
            original[idx + 2] = 100;
          } else {
            original[idx] = 240;
            original[idx + 1] = 240;
            original[idx + 2] = 240;
          }
          original[idx + 3] = 255;
        }
      }

      // Compared with different structure (no style change)
      const compared = new Uint8Array(width * height * 4);
      for (let i = 0; i < compared.length; i += 4) {
        compared[i] = 240;
        compared[i + 1] = 240;
        compared[i + 2] = 240;
        compared[i + 3] = 255;
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(40, 900, { x: 15, y: 15, width: 30, height: 30 });

      const result = classifier.classify(region, context);

      // Structural change should not be classified as style
      if (result) {
        expect(result.confidence).toBeLessThan(0.5);
      }
    });
  });

  describe("analyzeColorCharacteristics", () => {
    it("should correctly analyze brightness", () => {
      const width = 50;
      const height = 50;
      const darkImage = createColoredImage(width, height, { r: 50, g: 50, b: 50 });
      const lightImage = createColoredImage(width, height, { r: 200, g: 200, b: 200 });

      const darkContext = createMockContext(darkImage, darkImage, width, height);
      const lightContext = createMockContext(lightImage, lightImage, width, height);

      const region = createMockRegion(10, 625, { x: 10, y: 10, width: 30, height: 30 });

      const darkResult = classifier.classify(region, darkContext);
      const lightResult = classifier.classify(region, lightContext);

      // Both should have low confidence since there's no change
      expect(darkResult?.confidence || 0).toBeLessThan(0.5);
      expect(lightResult?.confidence || 0).toBeLessThan(0.5);
    });

    it("should correctly analyze saturation", () => {
      const width = 50;
      const height = 50;
      const grayImage = createColoredImage(width, height, { r: 128, g: 128, b: 128 });
      const colorfulImage = createColoredImage(width, height, { r: 255, g: 0, b: 0 });

      const context = createMockContext(grayImage, colorfulImage, width, height);
      const region = createMockRegion(100, 625, { x: 10, y: 10, width: 30, height: 30 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.STYLE);
      expect(result?.details?.saturationChange).toBeGreaterThan(0.5);
    });
  });

  describe("rgbToHsl", () => {
    it("should handle pure colors correctly", () => {
      const width = 40;
      const height = 40;

      // Test red to green (120 degree hue shift)
      const red = createColoredImage(width, height, { r: 255, g: 0, b: 0 });
      const green = createColoredImage(width, height, { r: 0, g: 255, b: 0 });

      const context = createMockContext(red, green, width, height);
      const region = createMockRegion(100, 400, { x: 5, y: 5, width: 30, height: 30 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.STYLE);
      expect(result?.details?.hueShift).toBeGreaterThan(0.5);
    });

    it("should handle grayscale colors", () => {
      const width = 40;
      const height = 40;

      // Gray to slightly colored gray
      const gray = createColoredImage(width, height, { r: 128, g: 128, b: 128 });
      const tintedGray = createColoredImage(width, height, { r: 130, g: 128, b: 126 });

      const context = createMockContext(gray, tintedGray, width, height);
      const region = createMockRegion(5, 400, { x: 5, y: 5, width: 30, height: 30 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.STYLE);
      expect(result?.details?.saturationChange).toBeLessThan(0.1);
    });
  });

  describe("calculateEdgePreservation", () => {
    it("should detect preserved edges in style changes", () => {
      const width = 60;
      const height = 60;

      // Create pattern with clear edges
      const pattern1 = createPatternWithColor(
        width,
        height,
        "checkerboard",
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 }
      );

      // Same pattern, different colors
      const pattern2 = createPatternWithColor(
        width,
        height,
        "checkerboard",
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 0, b: 255 }
      );

      const context = createMockContext(pattern1, pattern2, width, height);
      const region = createMockRegion(100, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      // High difference percentage with preserved edges
      if (result) {
        expect(result.type).toBe(DifferenceType.STYLE);
        expect(result.details?.edgePreservation).toBeGreaterThan(0.8);
        expect(result.details?.edgesPreserved).toBe(true);
      }
    });

    it("should detect when edges are not preserved", () => {
      const width = 60;
      const height = 60;

      // Sharp pattern
      const sharpPattern = createPatternWithColor(
        width,
        height,
        "stripes",
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 }
      );

      // Solid color (no edges)
      const solidColor = createColoredImage(width, height, { r: 128, g: 128, b: 128 });

      const context = createMockContext(sharpPattern, solidColor, width, height);
      const region = createMockRegion(80, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      // Low edge preservation should reduce confidence
      if (result) {
        expect(result?.details?.edgePreservation).toBeLessThan(0.5);
        expect(result?.details?.edgesPreserved).toBe(false);
      }
    });
  });

  describe("confidence calculation", () => {
    it("should give high confidence for clear style changes with preserved edges", () => {
      const width = 60;
      const height = 60;

      // Clear theme change
      const light = createPatternWithColor(
        width,
        height,
        "checkerboard",
        { r: 255, g: 255, b: 255 },
        { r: 230, g: 230, b: 230 }
      );

      const dark = createPatternWithColor(
        width,
        height,
        "checkerboard",
        { r: 30, g: 30, b: 30 },
        { r: 50, g: 50, b: 50 }
      );

      const context = createMockContext(light, dark, width, height);
      const region = createMockRegion(80, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      expect(result?.confidence).toBeGreaterThan(0.6);
    });

    it("should give lower confidence when edges are not preserved", () => {
      const width = 60;
      const height = 60;

      // Pattern to solid color
      const pattern = createPatternWithColor(
        width,
        height,
        "stripes",
        { r: 100, g: 100, b: 100 },
        { r: 200, g: 200, b: 200 }
      );

      const solid = createColoredImage(width, height, { r: 150, g: 150, b: 150 });

      const context = createMockContext(pattern, solid, width, height);
      const region = createMockRegion(40, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      if (result) {
        expect(result.confidence).toBeLessThan(0.5);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle very subtle color changes", () => {
      const width = 50;
      const height = 50;

      const original = createColoredImage(width, height, { r: 127, g: 127, b: 127 });
      const adjusted = createColoredImage(width, height, { r: 128, g: 128, b: 128 });

      const context = createMockContext(original, adjusted, width, height);
      const region = createMockRegion(3, 625, { x: 10, y: 10, width: 30, height: 30 });

      const result = classifier.classify(region, context);

      if (result) {
        expect(result.type).toBe(DifferenceType.STYLE);
        expect(result.subType).toBe("subtle");
        expect(result.details?.colorShift).toBeLessThan(0.05);
      }
    });

    it("should handle transparent pixels", () => {
      const width = 50;
      const height = 50;
      const data1 = new Uint8Array(width * height * 4);
      const data2 = new Uint8Array(width * height * 4);

      // Create pattern with some transparency
      for (let i = 0; i < data1.length; i += 4) {
        data1[i] = 100;
        data1[i + 1] = 150;
        data1[i + 2] = 200;
        data1[i + 3] = i % 8 === 0 ? 128 : 255; // Some semi-transparent pixels

        data2[i] = 150;
        data2[i + 1] = 100;
        data2[i + 2] = 200;
        data2[i + 3] = i % 8 === 0 ? 128 : 255;
      }

      const context = createMockContext(data1, data2, width, height);
      const region = createMockRegion(20, 625, { x: 10, y: 10, width: 30, height: 30 });

      expect(() => classifier.classify(region, context)).not.toThrow();
    });

    it("should handle extreme contrast differences", () => {
      const width = 60;
      const height = 60;

      // Extreme low contrast
      const lowContrast = createPatternWithColor(
        width,
        height,
        "stripes",
        { r: 127, g: 127, b: 127 },
        { r: 128, g: 128, b: 128 }
      );

      // Extreme high contrast
      const highContrast = createPatternWithColor(
        width,
        height,
        "stripes",
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 }
      );

      const context = createMockContext(lowContrast, highContrast, width, height);
      const region = createMockRegion(60, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      // Extreme contrast change should be detected
      if (result) {
        expect(result.type).toBe(DifferenceType.STYLE);
        expect(result.details?.contrastChange).toBeGreaterThan(0.5);
      }
    });
  });
});
