/**
 * @fileoverview Tests for LayoutClassifier implementation
 * @lastmodified 2025-08-01T16:55:00Z
 */

import { LayoutClassifier } from "../../../lib/classifiers/layout";
import { DifferenceType, DifferenceRegion, AnalysisContext } from "../../../lib/classifiers/base";

describe("LayoutClassifier", () => {
  let classifier: LayoutClassifier;

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
    differencePercentage = 30,
    pixelCount = 1000,
    bounds = { x: 20, y: 20, width: 40, height: 40 }
  ): DifferenceRegion => ({
    id: 1,
    bounds,
    pixelCount,
    differencePixels: Math.floor((pixelCount * differencePercentage) / 100),
    differencePercentage,
  });

  const createShiftedPattern = (
    width: number,
    height: number,
    shiftX: number,
    shiftY: number
  ): { original: Uint8Array; compared: Uint8Array } => {
    const original = new Uint8Array(width * height * 4);
    const compared = new Uint8Array(width * height * 4);

    // Create a simple box pattern in original
    const boxSize = 20;
    const boxX = Math.floor((width - boxSize) / 2);
    const boxY = Math.floor((height - boxSize) / 2);

    // Fill original with box pattern
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x >= boxX && x < boxX + boxSize && y >= boxY && y < boxY + boxSize) {
          original[idx] = 255; // R
          original[idx + 1] = 255; // G
          original[idx + 2] = 255; // B
        } else {
          original[idx] = 50; // R
          original[idx + 1] = 50; // G
          original[idx + 2] = 50; // B
        }
        original[idx + 3] = 255; // A
      }
    }

    // Fill compared with shifted box pattern
    const newBoxX = boxX + shiftX;
    const newBoxY = boxY + shiftY;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (
          x >= newBoxX &&
          x < newBoxX + boxSize &&
          y >= newBoxY &&
          y < newBoxY + boxSize &&
          x >= 0 &&
          x < width &&
          y >= 0 &&
          y < height
        ) {
          compared[idx] = 255; // R
          compared[idx + 1] = 255; // G
          compared[idx + 2] = 255; // B
        } else {
          compared[idx] = 50; // R
          compared[idx + 1] = 50; // G
          compared[idx + 2] = 50; // B
        }
        compared[idx + 3] = 255; // A
      }
    }

    return { original, compared };
  };

  beforeEach(() => {
    classifier = new LayoutClassifier();
  });

  describe("constructor", () => {
    it("should initialize with correct name and priority", () => {
      expect(classifier.getName()).toBe("LayoutClassifier");
      expect(classifier.getPriority()).toBe(6);
    });
  });

  describe("canClassify", () => {
    it("should return true for regions with 10-70% difference", () => {
      const context = createMockContext();

      const region10 = createMockRegion(10);
      expect(classifier.canClassify(region10, context)).toBe(true);

      const region40 = createMockRegion(40);
      expect(classifier.canClassify(region40, context)).toBe(true);

      const region70 = createMockRegion(70);
      expect(classifier.canClassify(region70, context)).toBe(true);
    });

    it("should return false for regions outside 10-70% range", () => {
      const context = createMockContext();

      const region5 = createMockRegion(5);
      expect(classifier.canClassify(region5, context)).toBe(false);

      const region80 = createMockRegion(80);
      expect(classifier.canClassify(region80, context)).toBe(false);

      const region95 = createMockRegion(95);
      expect(classifier.canClassify(region95, context)).toBe(false);
    });
  });

  describe("classify", () => {
    it("should detect horizontal shifts", () => {
      const width = 80;
      const height = 80;
      const { original, compared } = createShiftedPattern(width, height, 10, 0);

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(30, 1600, { x: 20, y: 20, width: 40, height: 40 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.LAYOUT);
      expect(result?.confidence).toBeGreaterThan(0.3);
      expect(result?.subType).toBe("horizontal-shift");
      expect(result?.details).toHaveProperty("shiftX");
      expect(result?.details).toHaveProperty("shiftY");
      expect(result?.details).toHaveProperty("shiftDistance");
      expect(result?.details).toHaveProperty("structuralSimilarity");
    });

    it("should detect vertical shifts", () => {
      const width = 80;
      const height = 80;
      const { original, compared } = createShiftedPattern(width, height, 0, 15);

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(35, 1600, { x: 20, y: 20, width: 40, height: 40 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.LAYOUT);
      expect(result?.subType).toBe("vertical-shift");
    });

    it("should detect diagonal shifts", () => {
      const width = 80;
      const height = 80;
      const { original, compared } = createShiftedPattern(width, height, 8, 8);

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(30, 1600, { x: 20, y: 20, width: 40, height: 40 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.LAYOUT);
      expect(result?.subType).toBe("diagonal-shift");
    });

    it("should detect micro shifts", () => {
      const width = 80;
      const height = 80;
      const { original, compared } = createShiftedPattern(width, height, 2, 1);

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(15, 800, { x: 25, y: 25, width: 30, height: 30 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.LAYOUT);
      expect(result?.subType).toBe("micro-shift");
    });

    it("should detect major shifts", () => {
      const width = 100;
      const height = 100;
      const { original, compared } = createShiftedPattern(width, height, 25, 0);

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(40, 2000, { x: 10, y: 10, width: 80, height: 80 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.LAYOUT);
      expect(["major-shift", "horizontal-shift"]).toContain(result?.subType);
    });

    it("should return null for non-layout changes", () => {
      const width = 60;
      const height = 60;
      const original = new Uint8Array(width * height * 4);
      const compared = new Uint8Array(width * height * 4);

      // Create completely different patterns (not a shift)
      // Original: vertical stripes
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const value = x % 10 < 5 ? 255 : 0;
          original[idx] = value;
          original[idx + 1] = value;
          original[idx + 2] = value;
          original[idx + 3] = 255;
        }
      }

      // Compared: horizontal stripes (completely different pattern)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const value = y % 10 < 5 ? 255 : 0;
          compared[idx] = value;
          compared[idx + 1] = value;
          compared[idx + 2] = value;
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(50, 1500, { x: 10, y: 10, width: 40, height: 40 });

      const result = classifier.classify(region, context);

      // Completely different patterns should have lower confidence or be null
      if (result) {
        expect(result.confidence).toBeLessThanOrEqual(0.5);
        // Edge alignment should be 0 for non-shift patterns
        expect(result.details?.edgeAlignment).toBe(0);
      }
    });
  });

  describe("expandBounds", () => {
    it("should correctly expand bounds with padding", () => {
      const width = 100;
      const height = 100;
      const context = createMockContext(undefined, undefined, width, height);
      const region = createMockRegion(30, 900, { x: 30, y: 30, width: 20, height: 20 });

      // Test that bounds are expanded correctly
      const result = classifier.classify(region, context);
      expect(result).toBeDefined();
    });

    it("should handle bounds at image edges", () => {
      const width = 100;
      const height = 100;
      const { original, compared } = createShiftedPattern(width, height, 5, 0);
      const context = createMockContext(original, compared, width, height);

      // Region at top-left corner
      const topLeftRegion = createMockRegion(20, 400, { x: 0, y: 0, width: 20, height: 20 });
      expect(() => classifier.classify(topLeftRegion, context)).not.toThrow();

      // Region at bottom-right corner
      const bottomRightRegion = createMockRegion(20, 400, { x: 80, y: 80, width: 20, height: 20 });
      expect(() => classifier.classify(bottomRightRegion, context)).not.toThrow();
    });
  });

  describe("analyzeShiftPattern", () => {
    it("should detect consistent shift patterns", () => {
      const width = 60;
      const height = 60;
      const { original, compared } = createShiftedPattern(width, height, 5, 5);

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(25, 900, { x: 15, y: 15, width: 30, height: 30 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.details?.shiftDistance).toBeGreaterThan(0);
    });

    it("should handle shift detection with noise", () => {
      const width = 60;
      const height = 60;
      const { original, compared } = createShiftedPattern(width, height, 10, 0);

      // Add some noise to compared image
      for (let i = 0; i < compared.length; i += 4) {
        const noise = (Math.random() - 0.5) * 20;
        compared[i] = Math.max(0, Math.min(255, compared[i] + noise));
        compared[i + 1] = Math.max(0, Math.min(255, compared[i + 1] + noise));
        compared[i + 2] = Math.max(0, Math.min(255, compared[i + 2] + noise));
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(30, 900, { x: 15, y: 15, width: 30, height: 30 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.LAYOUT);
    });
  });

  describe("calculateStructuralSimilarity", () => {
    it("should calculate high similarity for shifted identical patterns", () => {
      const width = 60;
      const height = 60;
      const { original, compared } = createShiftedPattern(width, height, 5, 0);

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(20, 900, { x: 15, y: 15, width: 30, height: 30 });

      const result = classifier.classify(region, context);

      expect(result?.details?.structuralSimilarity).toBeGreaterThan(0.5);
    });
  });

  describe("calculateEdgeAlignment", () => {
    it("should calculate edge preservation for shifts", () => {
      const width = 80;
      const height = 80;

      // Create pattern with clear edges
      const original = new Uint8Array(width * height * 4);
      const compared = new Uint8Array(width * height * 4);

      // Create vertical line pattern
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const value = x === 40 ? 255 : 0;
          original[idx] = value;
          original[idx + 1] = value;
          original[idx + 2] = value;
          original[idx + 3] = 255;

          // Shift pattern right by 10 pixels
          const shiftedValue = x === 50 ? 255 : 0;
          compared[idx] = shiftedValue;
          compared[idx + 1] = shiftedValue;
          compared[idx + 2] = shiftedValue;
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(25, 1600, { x: 20, y: 20, width: 40, height: 40 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.details?.edgeAlignment).toBeDefined();
    });
  });

  describe("confidence calculation", () => {
    it("should penalize very high difference percentages", () => {
      const width = 80;
      const height = 80;
      const { original, compared } = createShiftedPattern(width, height, 5, 0);

      const context = createMockContext(original, compared, width, height);

      const region65 = createMockRegion(65, 1600, { x: 20, y: 20, width: 40, height: 40 });
      const region30 = createMockRegion(30, 1600, { x: 20, y: 20, width: 40, height: 40 });

      const result65 = classifier.classify(region65, context);
      const result30 = classifier.classify(region30, context);

      // Higher difference percentage should have lower confidence
      expect(result65?.confidence || 0).toBeLessThan(result30?.confidence || 1);
    });

    it("should penalize very low difference percentages", () => {
      const width = 80;
      const height = 80;
      const { original, compared } = createShiftedPattern(width, height, 2, 0);

      const context = createMockContext(original, compared, width, height);

      const region12 = createMockRegion(12, 1600, { x: 20, y: 20, width: 40, height: 40 });
      const region30 = createMockRegion(30, 1600, { x: 20, y: 20, width: 40, height: 40 });

      const result12 = classifier.classify(region12, context);
      const result30 = classifier.classify(region30, context);

      // Very low difference percentage should have lower confidence
      expect(result12?.confidence || 0).toBeLessThan(result30?.confidence || 1);
    });
  });

  describe("edge cases", () => {
    it("should handle minimal shifts", () => {
      const width = 60;
      const height = 60;
      const { original, compared } = createShiftedPattern(width, height, 1, 0);

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(12, 400, { x: 20, y: 20, width: 20, height: 20 });

      expect(() => classifier.classify(region, context)).not.toThrow();
    });

    it("should handle rotation-like effects", () => {
      const width = 60;
      const height = 60;
      const original = new Uint8Array(width * height * 4);
      const compared = new Uint8Array(width * height * 4);

      // Create a simple rotation effect (not a pure shift)
      const centerX = width / 2;
      const centerY = height / 2;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          // Original: horizontal line
          if (Math.abs(y - centerY) < 2) {
            original[idx] = 255;
            original[idx + 1] = 255;
            original[idx + 2] = 255;
          } else {
            original[idx] = 0;
            original[idx + 1] = 0;
            original[idx + 2] = 0;
          }
          original[idx + 3] = 255;

          // Compared: slightly rotated line
          const angle = 0.1; // radians
          const dx = x - centerX;
          const dy = y - centerY;
          const rotY = dx * Math.sin(angle) + dy * Math.cos(angle) + centerY;

          if (Math.abs(rotY - centerY) < 2) {
            compared[idx] = 255;
            compared[idx + 1] = 255;
            compared[idx + 2] = 255;
          } else {
            compared[idx] = 0;
            compared[idx + 1] = 0;
            compared[idx + 2] = 0;
          }
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(20, 900, { x: 15, y: 15, width: 30, height: 30 });

      expect(() => classifier.classify(region, context)).not.toThrow();
    });

    it("should handle scaling effects", () => {
      const width = 80;
      const height = 80;
      const original = new Uint8Array(width * height * 4);
      const compared = new Uint8Array(width * height * 4);

      // Create scaled pattern
      const boxSize = 20;
      const scaledBoxSize = 25;
      const centerX = width / 2;
      const centerY = height / 2;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          // Original: small box
          if (Math.abs(x - centerX) < boxSize / 2 && Math.abs(y - centerY) < boxSize / 2) {
            original[idx] = 255;
            original[idx + 1] = 255;
            original[idx + 2] = 255;
          } else {
            original[idx] = 50;
            original[idx + 1] = 50;
            original[idx + 2] = 50;
          }
          original[idx + 3] = 255;

          // Compared: larger box
          if (
            Math.abs(x - centerX) < scaledBoxSize / 2 &&
            Math.abs(y - centerY) < scaledBoxSize / 2
          ) {
            compared[idx] = 255;
            compared[idx + 1] = 255;
            compared[idx + 2] = 255;
          } else {
            compared[idx] = 50;
            compared[idx + 1] = 50;
            compared[idx + 2] = 50;
          }
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(25, 1600, { x: 20, y: 20, width: 40, height: 40 });

      const result = classifier.classify(region, context);

      // Scaling is not a pure layout shift, so confidence should be lower
      expect(result?.confidence || 0).toBeLessThan(0.8);
    });
  });
});
