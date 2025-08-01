/**
 * @fileoverview Tests for ContentClassifier implementation
 * @lastmodified 2025-08-01T16:45:00Z
 */

import { ContentClassifier } from "../../../lib/classifiers/content";
import { DifferenceType, DifferenceRegion, AnalysisContext } from "../../../lib/classifiers/base";

describe("ContentClassifier", () => {
  let classifier: ContentClassifier;

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
    differencePercentage = 10,
    pixelCount = 1000,
    bounds = { x: 10, y: 10, width: 30, height: 30 }
  ): DifferenceRegion => ({
    id: 1,
    bounds,
    pixelCount,
    differencePixels: Math.floor((pixelCount * differencePercentage) / 100),
    differencePercentage,
  });

  beforeEach(() => {
    classifier = new ContentClassifier();
  });

  describe("constructor", () => {
    it("should initialize with correct name and priority", () => {
      expect(classifier.getName()).toBe("ContentClassifier");
      expect(classifier.getPriority()).toBe(5);
    });
  });

  describe("canClassify", () => {
    it("should return true for regions with >= 5% difference", () => {
      const context = createMockContext();

      const region5 = createMockRegion(5);
      expect(classifier.canClassify(region5, context)).toBe(true);

      const region10 = createMockRegion(10);
      expect(classifier.canClassify(region10, context)).toBe(true);

      const region50 = createMockRegion(50);
      expect(classifier.canClassify(region50, context)).toBe(true);
    });

    it("should return false for regions with < 5% difference", () => {
      const context = createMockContext();

      const region1 = createMockRegion(1);
      expect(classifier.canClassify(region1, context)).toBe(false);

      const region4 = createMockRegion(4.9);
      expect(classifier.canClassify(region4, context)).toBe(false);
    });
  });

  describe("classify", () => {
    it("should classify high edge density changes as content", () => {
      // Create image data with text-like patterns (high edge density)
      const width = 50;
      const height = 50;
      const originalData = new Uint8Array(width * height * 4);
      const comparedData = new Uint8Array(width * height * 4);

      // Fill original with alternating pattern (text-like)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const value = (x + y) % 2 === 0 ? 0 : 255;
          originalData[idx] = value;
          originalData[idx + 1] = value;
          originalData[idx + 2] = value;
          originalData[idx + 3] = 255;
        }
      }

      // Fill compared with different pattern
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const value = x % 3 === 0 || y % 3 === 0 ? 0 : 255;
          comparedData[idx] = value;
          comparedData[idx + 1] = value;
          comparedData[idx + 2] = value;
          comparedData[idx + 3] = 255;
        }
      }

      const context = createMockContext(originalData, comparedData, width, height);
      const region = createMockRegion(30, 1500, { x: 5, y: 5, width: 40, height: 40 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.CONTENT);
      expect(result?.confidence).toBeGreaterThan(0.3);
      expect(result?.subType).toBe("text");
      expect(result?.details).toHaveProperty("edgeDensityChange");
      expect(result?.details).toHaveProperty("originalEdgeDensity");
      expect(result?.details).toHaveProperty("comparedEdgeDensity");
    });

    it("should classify color variance changes as content", () => {
      // Create image data with high color variance (image-like)
      const width = 50;
      const height = 50;
      const originalData = new Uint8Array(width * height * 4);
      const comparedData = new Uint8Array(width * height * 4);

      // Fill original with colorful pattern
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          originalData[idx] = ((x * 255) / width) | 0; // R gradient
          originalData[idx + 1] = ((y * 255) / height) | 0; // G gradient
          originalData[idx + 2] = 128; // B constant
          originalData[idx + 3] = 255;
        }
      }

      // Fill compared with different colorful pattern
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          comparedData[idx] = 200; // R constant
          comparedData[idx + 1] = ((x * 255) / width) | 0; // G gradient
          comparedData[idx + 2] = ((y * 255) / height) | 0; // B gradient
          comparedData[idx + 3] = 255;
        }
      }

      const context = createMockContext(originalData, comparedData, width, height);
      const region = createMockRegion(40, 1200, { x: 5, y: 5, width: 40, height: 40 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.CONTENT);
      expect(result?.confidence).toBeGreaterThan(0.3);
      expect(result?.details).toHaveProperty("colorVarianceChange");
      expect(result?.details).toHaveProperty("dominantColorChange");
    });

    it("should return null for low confidence classifications", () => {
      // Create minimal difference
      const width = 50;
      const height = 50;
      const originalData = new Uint8Array(width * height * 4);
      const comparedData = new Uint8Array(width * height * 4);

      // Fill both with same solid color
      for (let i = 0; i < originalData.length; i += 4) {
        originalData[i] = 128;
        originalData[i + 1] = 128;
        originalData[i + 2] = 128;
        originalData[i + 3] = 255;

        comparedData[i] = 130; // Very slight change
        comparedData[i + 1] = 130;
        comparedData[i + 2] = 130;
        comparedData[i + 3] = 255;
      }

      const context = createMockContext(originalData, comparedData, width, height);
      const region = createMockRegion(5, 100, { x: 5, y: 5, width: 10, height: 10 });

      const result = classifier.classify(region, context);

      expect(result).toBeNull();
    });

    it("should classify solid color changes correctly", () => {
      // Create solid color change
      const width = 50;
      const height = 50;
      const originalData = new Uint8Array(width * height * 4);
      const comparedData = new Uint8Array(width * height * 4);

      // Fill original with red
      for (let i = 0; i < originalData.length; i += 4) {
        originalData[i] = 255;
        originalData[i + 1] = 0;
        originalData[i + 2] = 0;
        originalData[i + 3] = 255;
      }

      // Fill compared with blue
      for (let i = 0; i < comparedData.length; i += 4) {
        comparedData[i] = 0;
        comparedData[i + 1] = 0;
        comparedData[i + 2] = 255;
        comparedData[i + 3] = 255;
      }

      const context = createMockContext(originalData, comparedData, width, height);
      const region = createMockRegion(80, 2000, { x: 10, y: 10, width: 30, height: 30 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.CONTENT);
      expect(result?.subType).toBe("solid");
    });

    it("should classify mixed content changes correctly", () => {
      // Create mixed pattern with both edges and colors
      const width = 50;
      const height = 50;
      const originalData = new Uint8Array(width * height * 4);
      const comparedData = new Uint8Array(width * height * 4);

      // Fill with mixed pattern
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          // Original: checkerboard with colors
          if (((x / 5) | 0) % 2 === ((y / 5) | 0) % 2) {
            originalData[idx] = 255;
            originalData[idx + 1] = 100;
            originalData[idx + 2] = 50;
          } else {
            originalData[idx] = 50;
            originalData[idx + 1] = 100;
            originalData[idx + 2] = 200;
          }
          originalData[idx + 3] = 255;

          // Compared: different pattern
          const value = Math.sin(x * 0.2) * 127 + 128;
          comparedData[idx] = value;
          comparedData[idx + 1] = value * 0.7;
          comparedData[idx + 2] = value * 0.3;
          comparedData[idx + 3] = 255;
        }
      }

      const context = createMockContext(originalData, comparedData, width, height);
      const region = createMockRegion(25, 1500, { x: 5, y: 5, width: 40, height: 40 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.CONTENT);
      expect(["text", "image", "mixed"]).toContain(result?.subType);
    });
  });

  describe("calculateColorStats", () => {
    it("should handle empty images correctly", () => {
      const width = 10;
      const height = 10;
      const emptyData = new Uint8Array(width * height * 4); // All zeros
      const context = createMockContext(emptyData, emptyData, width, height);
      const region = createMockRegion(10, 100, { x: 0, y: 0, width, height });

      // Should still work with all-zero data
      expect(() => classifier.classify(region, context)).not.toThrow();
    });

    it("should handle single-color images", () => {
      const width = 20;
      const height = 20;
      const singleColorData = new Uint8Array(width * height * 4);

      // Fill with single color
      for (let i = 0; i < singleColorData.length; i += 4) {
        singleColorData[i] = 100;
        singleColorData[i + 1] = 150;
        singleColorData[i + 2] = 200;
        singleColorData[i + 3] = 255;
      }

      const context = createMockContext(singleColorData, singleColorData, width, height);
      const region = createMockRegion(10, 400, { x: 0, y: 0, width, height });

      const result = classifier.classify(region, context);

      // Low variance should result in low confidence or null
      expect(result?.confidence || 0).toBeLessThan(0.5);
    });
  });

  describe("detectEdges", () => {
    it("should handle high-noise images", () => {
      const width = 30;
      const height = 30;
      const noiseData = new Uint8Array(width * height * 4);

      // Fill with random noise
      for (let i = 0; i < noiseData.length; i += 4) {
        noiseData[i] = (Math.random() * 255) | 0;
        noiseData[i + 1] = (Math.random() * 255) | 0;
        noiseData[i + 2] = (Math.random() * 255) | 0;
        noiseData[i + 3] = 255;
      }

      const context = createMockContext(noiseData, noiseData, width, height);
      const region = createMockRegion(15, 900, { x: 0, y: 0, width, height });

      expect(() => classifier.classify(region, context)).not.toThrow();
    });
  });

  describe("calculateDominantColorChange", () => {
    it("should handle empty dominant color arrays", () => {
      // Create context that would produce empty dominant colors
      const width = 5;
      const height = 5;
      const data = new Uint8Array(width * height * 4);

      const context = createMockContext(data, data, width, height);
      const region = createMockRegion(10, 25, { x: 0, y: 0, width, height });

      expect(() => classifier.classify(region, context)).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle regions at image boundaries", () => {
      const width = 100;
      const height = 100;
      const context = createMockContext(undefined, undefined, width, height);

      // Region at top-left corner
      const topLeftRegion = createMockRegion(10, 100, { x: 0, y: 0, width: 10, height: 10 });
      expect(() => classifier.classify(topLeftRegion, context)).not.toThrow();

      // Region at bottom-right corner
      const bottomRightRegion = createMockRegion(10, 100, { x: 90, y: 90, width: 10, height: 10 });
      expect(() => classifier.classify(bottomRightRegion, context)).not.toThrow();
    });

    it("should handle very small regions", () => {
      const context = createMockContext();
      const tinyRegion = createMockRegion(10, 4, { x: 10, y: 10, width: 2, height: 2 });

      expect(() => classifier.classify(tinyRegion, context)).not.toThrow();
    });

    it("should handle very large regions", () => {
      const width = 200;
      const height = 200;
      const context = createMockContext(undefined, undefined, width, height);
      const largeRegion = createMockRegion(50, 40000, { x: 0, y: 0, width, height });

      expect(() => classifier.classify(largeRegion, context)).not.toThrow();
    });
  });

  describe("confidence calculation", () => {
    it("should boost confidence for high difference percentage", () => {
      const width = 50;
      const height = 50;
      const originalData = new Uint8Array(width * height * 4);
      const comparedData = new Uint8Array(width * height * 4);

      // Create significant difference
      for (let i = 0; i < originalData.length; i += 4) {
        originalData[i] = 0;
        originalData[i + 1] = 0;
        originalData[i + 2] = 0;
        originalData[i + 3] = 255;

        comparedData[i] = 255;
        comparedData[i + 1] = 255;
        comparedData[i + 2] = 255;
        comparedData[i + 3] = 255;
      }

      const context = createMockContext(originalData, comparedData, width, height);

      // Test different difference percentages
      const region30 = createMockRegion(30, 1000, { x: 5, y: 5, width: 40, height: 40 });
      const region50 = createMockRegion(50, 1000, { x: 5, y: 5, width: 40, height: 40 });
      const region70 = createMockRegion(70, 1000, { x: 5, y: 5, width: 40, height: 40 });

      const result30 = classifier.classify(region30, context);
      const result50 = classifier.classify(region50, context);
      const result70 = classifier.classify(region70, context);

      // Higher difference percentage should result in higher confidence
      expect(result50?.confidence || 0).toBeGreaterThan(result30?.confidence || 0);
      expect(result70?.confidence || 0).toBeGreaterThan(result50?.confidence || 0);
    });
  });
});
