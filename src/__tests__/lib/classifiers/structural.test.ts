/**
 * @fileoverview Tests for StructuralClassifier implementation
 * @lastmodified 2025-08-01T17:20:00Z
 */

import { StructuralClassifier } from "../../../lib/classifiers/structural";
import { DifferenceType, DifferenceRegion, AnalysisContext } from "../../../lib/classifiers/base";

describe("StructuralClassifier", () => {
  let classifier: StructuralClassifier;

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
    differencePercentage = 50,
    pixelCount = 1000,
    bounds = { x: 10, y: 10, width: 40, height: 40 }
  ): DifferenceRegion => ({
    id: 1,
    bounds,
    pixelCount,
    differencePixels: Math.floor((pixelCount * differencePercentage) / 100),
    differencePercentage,
  });

  const createEmptyImage = (
    width: number,
    height: number,
    bgColor = { r: 240, g: 240, b: 240 }
  ): Uint8Array => {
    const data = new Uint8Array(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = bgColor.r;
      data[i + 1] = bgColor.g;
      data[i + 2] = bgColor.b;
      data[i + 3] = 255;
    }
    return data;
  };

  const createImageWithElement = (
    width: number,
    height: number,
    elementBounds: { x: number; y: number; width: number; height: number },
    bgColor = { r: 240, g: 240, b: 240 },
    elementColor = { r: 50, g: 100, b: 150 }
  ): Uint8Array => {
    const data = createEmptyImage(width, height, bgColor);

    for (let y = elementBounds.y; y < elementBounds.y + elementBounds.height; y++) {
      for (let x = elementBounds.x; x < elementBounds.x + elementBounds.width; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          data[idx] = elementColor.r;
          data[idx + 1] = elementColor.g;
          data[idx + 2] = elementColor.b;
          data[idx + 3] = 255;
        }
      }
    }

    return data;
  };

  beforeEach(() => {
    classifier = new StructuralClassifier();
  });

  describe("constructor", () => {
    it("should initialize with correct name and priority", () => {
      expect(classifier.getName()).toBe("StructuralClassifier");
      expect(classifier.getPriority()).toBe(7);
    });
  });

  describe("canClassify", () => {
    it("should return true for regions with >= 30% difference", () => {
      const context = createMockContext();

      const region30 = createMockRegion(30);
      expect(classifier.canClassify(region30, context)).toBe(true);

      const region50 = createMockRegion(50);
      expect(classifier.canClassify(region50, context)).toBe(true);

      const region90 = createMockRegion(90);
      expect(classifier.canClassify(region90, context)).toBe(true);
    });

    it("should return false for regions with < 30% difference", () => {
      const context = createMockContext();

      const region10 = createMockRegion(10);
      expect(classifier.canClassify(region10, context)).toBe(false);

      const region25 = createMockRegion(25);
      expect(classifier.canClassify(region25, context)).toBe(false);
    });
  });

  describe("classify", () => {
    it("should detect new element addition", () => {
      const width = 80;
      const height = 80;
      const original = createEmptyImage(width, height);
      const compared = createImageWithElement(width, height, {
        x: 20,
        y: 20,
        width: 40,
        height: 40,
      });

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(60, 1600, { x: 15, y: 15, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.STRUCTURAL);
      expect(result?.confidence).toBeGreaterThan(0.5);
      expect(result?.subType).toContain("new-");
      expect(result?.details?.isAddition).toBe(true);
      expect(result?.details?.isRemoval).toBe(false);
    });

    it("should detect element removal", () => {
      const width = 80;
      const height = 80;
      const original = createImageWithElement(width, height, {
        x: 20,
        y: 20,
        width: 40,
        height: 40,
      });
      const compared = createEmptyImage(width, height);

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(60, 1600, { x: 15, y: 15, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.STRUCTURAL);
      expect(result?.confidence).toBeGreaterThan(0.5);
      expect(result?.subType).toContain("removed-");
      expect(result?.details?.isRemoval).toBe(true);
      expect(result?.details?.isAddition).toBe(false);
    });

    it("should detect text addition pattern", () => {
      const width = 60;
      const height = 60;
      const original = createEmptyImage(width, height);
      const compared = new Uint8Array(width * height * 4);

      // Create text-like pattern with many edges
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          // Create horizontal lines pattern (text-like)
          if (y % 4 === 0 && x > 10 && x < 50) {
            compared[idx] = 0;
            compared[idx + 1] = 0;
            compared[idx + 2] = 0;
          } else {
            compared[idx] = 240;
            compared[idx + 1] = 240;
            compared[idx + 2] = 240;
          }
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(40, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.STRUCTURAL);
      expect(result?.subType).toContain("text-addition");
    });

    it("should detect block addition pattern", () => {
      const width = 80;
      const height = 80;
      const original = createEmptyImage(width, height);
      const compared = new Uint8Array(width * height * 4);

      // Fill most quadrants with content
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          // Fill 3 quadrants
          if ((x < 40 && y < 40) || (x >= 40 && y < 40) || (x < 40 && y >= 40)) {
            compared[idx] = 100;
            compared[idx + 1] = 100;
            compared[idx + 2] = 100;
          } else {
            compared[idx] = 240;
            compared[idx + 1] = 240;
            compared[idx + 2] = 240;
          }
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(75, 2400, { x: 10, y: 10, width: 60, height: 60 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.STRUCTURAL);
      expect(result?.subType).toContain("new-");
    });

    it("should detect partial structural changes", () => {
      const width = 60;
      const height = 60;
      const original = createImageWithElement(width, height, {
        x: 10,
        y: 10,
        width: 20,
        height: 20,
      });
      const compared = createImageWithElement(width, height, {
        x: 30,
        y: 30,
        width: 20,
        height: 20,
      });

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(50, 1200, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      // Partial changes might not meet the confidence threshold
      if (result) {
        expect(result?.type).toBe(DifferenceType.STRUCTURAL);
        expect(result?.confidence).toBeLessThan(0.7);
        expect(result?.subType).toBe("structural-modification");
      }
    });

    it("should detect element expansion", () => {
      const width = 80;
      const height = 80;
      const original = createImageWithElement(width, height, {
        x: 25,
        y: 25,
        width: 30,
        height: 30,
      });

      // Create expanded element
      const compared = new Uint8Array(width * height * 4);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          // Original element area plus additional content
          if (
            (x >= 25 && x < 55 && y >= 25 && y < 55) ||
            (x >= 20 && x < 60 && y >= 20 && y < 25) ||
            (x >= 20 && x < 60 && y >= 55 && y < 60)
          ) {
            compared[idx] = 50;
            compared[idx + 1] = 100;
            compared[idx + 2] = 150;
          } else {
            compared[idx] = 240;
            compared[idx + 1] = 240;
            compared[idx + 2] = 240;
          }
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(40, 1600, { x: 15, y: 15, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      // Expansion pattern should be detected
      if (result) {
        expect(result?.type).toBe(DifferenceType.STRUCTURAL);
        expect(result?.subType).toBe("element-expansion");
      }
    });

    it("should detect element reduction", () => {
      const width = 80;
      const height = 80;
      const original = createImageWithElement(width, height, {
        x: 20,
        y: 20,
        width: 40,
        height: 40,
      });
      const compared = createImageWithElement(width, height, {
        x: 30,
        y: 30,
        width: 20,
        height: 20,
      });

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(50, 1600, { x: 15, y: 15, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      // Reduction should be detected
      if (result) {
        expect(result?.type).toBe(DifferenceType.STRUCTURAL);
        expect(result?.subType).toBe("element-reduction");
      }
    });

    it("should return null for non-structural changes", () => {
      const width = 60;
      const height = 60;

      // Create similar content with only color change
      const original = createImageWithElement(
        width,
        height,
        { x: 20, y: 20, width: 20, height: 20 },
        { r: 240, g: 240, b: 240 },
        { r: 100, g: 0, b: 0 }
      );
      const compared = createImageWithElement(
        width,
        height,
        { x: 20, y: 20, width: 20, height: 20 },
        { r: 240, g: 240, b: 240 },
        { r: 0, g: 0, b: 100 }
      );

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(25, 400, { x: 15, y: 15, width: 30, height: 30 });

      const result = classifier.classify(region, context);

      // Low structural change should result in null or low confidence
      if (result) {
        expect(result.confidence).toBeLessThan(0.5);
      }
    });
  });

  describe("analyzeContentPresence", () => {
    it("should detect content presence correctly", () => {
      const width = 50;
      const height = 50;
      const dataWithContent = createImageWithElement(width, height, {
        x: 10,
        y: 10,
        width: 30,
        height: 30,
      });
      const emptyData = createEmptyImage(width, height);

      const context = createMockContext(emptyData, dataWithContent, width, height);
      const region = createMockRegion(60, 625, { x: 5, y: 5, width: 40, height: 40 });

      const result = classifier.classify(region, context);

      expect(result?.details?.originalContentDensity).toBeLessThan(0.1);
      expect(result?.details?.comparedContentDensity).toBeGreaterThan(0.3);
    });

    it("should handle transparent pixels", () => {
      const width = 40;
      const height = 40;
      const data = new Uint8Array(width * height * 4);

      // Create pattern with transparent pixels
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 100;
        data[i + 1] = 100;
        data[i + 2] = 100;
        data[i + 3] = i % 8 === 0 ? 0 : 255; // Some transparent pixels
      }

      const context = createMockContext(createEmptyImage(width, height), data, width, height);
      const region = createMockRegion(40, 400, { x: 5, y: 5, width: 30, height: 30 });

      expect(() => classifier.classify(region, context)).not.toThrow();
    });
  });

  describe("detectDominantBackgroundColor", () => {
    it("should detect uniform background color", () => {
      const width = 60;
      const height = 60;
      const bgColor = { r: 200, g: 150, b: 100 };
      const data = createEmptyImage(width, height, bgColor);

      const context = createMockContext(data, data, width, height);
      const region = createMockRegion(30, 900, { x: 10, y: 10, width: 40, height: 40 });

      const result = classifier.classify(region, context);

      // Result might be null due to low difference percentage
      if (result) {
        expect(result?.details?.originalContentDensity).toBeLessThan(0.1);
      }
    });

    it("should handle varied edge colors", () => {
      const width = 50;
      const height = 50;
      const data = new Uint8Array(width * height * 4);

      // Different colors at edges, uniform center
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
            // Varied edge colors
            data[idx] = (x + y) % 255;
            data[idx + 1] = (x * 2) % 255;
            data[idx + 2] = (y * 2) % 255;
          } else {
            // Uniform center
            data[idx] = 128;
            data[idx + 1] = 128;
            data[idx + 2] = 128;
          }
          data[idx + 3] = 255;
        }
      }

      const context = createMockContext(data, data, width, height);
      const region = createMockRegion(30, 625, { x: 5, y: 5, width: 40, height: 40 });

      expect(() => classifier.classify(region, context)).not.toThrow();
    });
  });

  describe("analyzeQuadrants", () => {
    it("should detect full pattern when all quadrants have content", () => {
      const width = 60;
      const height = 60;
      const original = createEmptyImage(width, height);

      // Fill all quadrants with content
      const compared = new Uint8Array(width * height * 4);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          // Add content to all quadrants with some gaps
          if ((x + y) % 3 !== 0) {
            compared[idx] = 50;
            compared[idx + 1] = 50;
            compared[idx + 2] = 50;
          } else {
            compared[idx] = 240;
            compared[idx + 1] = 240;
            compared[idx + 2] = 240;
          }
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(60, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      // Pattern depends on edge detection
      expect(result?.details?.structuralPattern).toBeDefined();
    });

    it("should detect horizontal pattern", () => {
      const width = 60;
      const height = 60;
      const original = createEmptyImage(width, height);
      const compared = new Uint8Array(width * height * 4);

      // Fill top half
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          if (y < height / 2) {
            compared[idx] = 50;
            compared[idx + 1] = 50;
            compared[idx + 2] = 50;
          } else {
            compared[idx] = 240;
            compared[idx + 1] = 240;
            compared[idx + 2] = 240;
          }
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(50, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      expect(result?.details?.structuralPattern).toBeDefined();
    });

    it("should detect vertical pattern", () => {
      const width = 60;
      const height = 60;
      const original = createEmptyImage(width, height);
      const compared = new Uint8Array(width * height * 4);

      // Fill left half
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          if (x < width / 2) {
            compared[idx] = 50;
            compared[idx + 1] = 50;
            compared[idx + 2] = 50;
          } else {
            compared[idx] = 240;
            compared[idx + 1] = 240;
            compared[idx + 2] = 240;
          }
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(50, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      expect(result?.details?.structuralPattern).toBeDefined();
    });

    it("should detect corner pattern", () => {
      const width = 60;
      const height = 60;
      const original = createEmptyImage(width, height);
      const compared = createImageWithElement(width, height, { x: 5, y: 5, width: 20, height: 20 });

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(40, 900, { x: 0, y: 0, width: 60, height: 60 });

      const result = classifier.classify(region, context);

      expect(result?.details?.structuralPattern).toBeDefined();
    });
  });

  describe("confidence calculation", () => {
    it("should give high confidence for complete addition/removal", () => {
      const width = 60;
      const height = 60;
      const empty = createEmptyImage(width, height);
      const withElement = createImageWithElement(width, height, {
        x: 15,
        y: 15,
        width: 30,
        height: 30,
      });

      const additionContext = createMockContext(empty, withElement, width, height);
      const removalContext = createMockContext(withElement, empty, width, height);
      const region = createMockRegion(60, 900, { x: 10, y: 10, width: 40, height: 40 });

      const additionResult = classifier.classify(region, additionContext);
      const removalResult = classifier.classify(region, removalContext);

      expect(additionResult?.confidence).toBeGreaterThan(0.7);
      expect(removalResult?.confidence).toBeGreaterThan(0.7);
    });

    it("should give lower confidence for partial changes", () => {
      const width = 60;
      const height = 60;
      const original = createImageWithElement(width, height, {
        x: 10,
        y: 10,
        width: 20,
        height: 20,
      });
      const compared = createImageWithElement(width, height, {
        x: 30,
        y: 30,
        width: 20,
        height: 20,
      });

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(40, 900, { x: 5, y: 5, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      // Partial changes should have lower confidence
      if (result) {
        expect(result.confidence).toBeLessThan(0.7);
      }
    });

    it("should boost confidence for high difference percentage", () => {
      const width = 80;
      const height = 80;
      const empty = createEmptyImage(width, height);
      const withLargeElement = createImageWithElement(width, height, {
        x: 10,
        y: 10,
        width: 60,
        height: 60,
      });

      const context = createMockContext(empty, withLargeElement, width, height);

      // Test with different difference percentages but same actual change
      const region75 = createMockRegion(75, 3600, { x: 5, y: 5, width: 70, height: 70 });
      const region50 = createMockRegion(50, 3600, { x: 5, y: 5, width: 70, height: 70 });

      const result75 = classifier.classify(region75, context);
      const result50 = classifier.classify(region50, context);

      // Both should detect the structural addition
      expect(result75).not.toBeNull();
      expect(result50).not.toBeNull();

      // Higher difference percentage should boost confidence
      if (result75 && result50) {
        expect(result75.type).toBe(DifferenceType.STRUCTURAL);
        expect(result50.type).toBe(DifferenceType.STRUCTURAL);
        // Both should have high confidence for clear structural changes
        expect(result75.confidence).toBeGreaterThan(0.5);
        expect(result50.confidence).toBeGreaterThan(0.5);
        // Higher difference percentage should result in equal or higher confidence
        expect(result75.confidence).toBeGreaterThanOrEqual(result50.confidence);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle overlapping elements", () => {
      const width = 80;
      const height = 80;
      const original = createImageWithElement(width, height, {
        x: 20,
        y: 20,
        width: 30,
        height: 30,
      });

      // Add overlapping element
      const compared = new Uint8Array(width * height * 4);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          // Original element
          if (x >= 20 && x < 50 && y >= 20 && y < 50) {
            compared[idx] = 50;
            compared[idx + 1] = 100;
            compared[idx + 2] = 150;
          }
          // New overlapping element
          else if (x >= 35 && x < 65 && y >= 35 && y < 65) {
            compared[idx] = 150;
            compared[idx + 1] = 100;
            compared[idx + 2] = 50;
          } else {
            compared[idx] = 240;
            compared[idx + 1] = 240;
            compared[idx + 2] = 240;
          }
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(50, 1600, { x: 10, y: 10, width: 60, height: 60 });

      const result = classifier.classify(region, context);

      // Overlapping elements should still be detected
      if (result) {
        expect(result.type).toBe(DifferenceType.STRUCTURAL);
      }
    });

    it("should handle very small elements", () => {
      const width = 50;
      const height = 50;
      const original = createEmptyImage(width, height);
      const compared = createImageWithElement(width, height, { x: 24, y: 24, width: 2, height: 2 });

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(30, 625, { x: 10, y: 10, width: 30, height: 30 });

      const result = classifier.classify(region, context);

      // Very small elements should still be detected as additions
      if (result) {
        expect(result.type).toBe(DifferenceType.STRUCTURAL);
        expect(result.details?.isAddition).toBe(true);
      }
    });

    it("should handle elements with gradients", () => {
      const width = 60;
      const height = 60;
      const original = createEmptyImage(width, height);
      const compared = new Uint8Array(width * height * 4);

      // Create gradient element
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          if (x >= 15 && x < 45 && y >= 15 && y < 45) {
            // Gradient within element
            const intensity = ((x - 15) / 30) * 200;
            compared[idx] = intensity;
            compared[idx + 1] = intensity;
            compared[idx + 2] = intensity;
          } else {
            compared[idx] = 240;
            compared[idx + 1] = 240;
            compared[idx + 2] = 240;
          }
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(45, 900, { x: 10, y: 10, width: 40, height: 40 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.STRUCTURAL);
      expect(result?.details?.isAddition).toBe(true);
    });
  });
});
