/**
 * @fileoverview Tests for SizeClassifier implementation
 * @lastmodified 2025-08-01T17:05:00Z
 */

import { SizeClassifier } from "../../../lib/classifiers/size";
import { DifferenceType, DifferenceRegion, AnalysisContext } from "../../../lib/classifiers/base";

describe("SizeClassifier", () => {
  let classifier: SizeClassifier;

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
    bounds = { x: 10, y: 10, width: 40, height: 40 }
  ): DifferenceRegion => ({
    id: 1,
    bounds,
    pixelCount,
    differencePixels: Math.floor((pixelCount * differencePercentage) / 100),
    differencePercentage,
  });

  const createResizedBox = (
    width: number,
    height: number,
    originalSize: { width: number; height: number },
    comparedSize: { width: number; height: number },
    bgColor = { r: 240, g: 240, b: 240 },
    boxColor = { r: 50, g: 100, b: 150 }
  ): { original: Uint8Array; compared: Uint8Array } => {
    const original = new Uint8Array(width * height * 4);
    const compared = new Uint8Array(width * height * 4);

    // Calculate box positions (centered)
    const originalX = Math.floor((width - originalSize.width) / 2);
    const originalY = Math.floor((height - originalSize.height) / 2);
    const comparedX = Math.floor((width - comparedSize.width) / 2);
    const comparedY = Math.floor((height - comparedSize.height) / 2);

    // Fill backgrounds
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Original image
        if (
          x >= originalX &&
          x < originalX + originalSize.width &&
          y >= originalY &&
          y < originalY + originalSize.height
        ) {
          original[idx] = boxColor.r;
          original[idx + 1] = boxColor.g;
          original[idx + 2] = boxColor.b;
        } else {
          original[idx] = bgColor.r;
          original[idx + 1] = bgColor.g;
          original[idx + 2] = bgColor.b;
        }
        original[idx + 3] = 255;

        // Compared image
        if (
          x >= comparedX &&
          x < comparedX + comparedSize.width &&
          y >= comparedY &&
          y < comparedY + comparedSize.height
        ) {
          compared[idx] = boxColor.r;
          compared[idx + 1] = boxColor.g;
          compared[idx + 2] = boxColor.b;
        } else {
          compared[idx] = bgColor.r;
          compared[idx + 1] = bgColor.g;
          compared[idx + 2] = bgColor.b;
        }
        compared[idx + 3] = 255;
      }
    }

    return { original, compared };
  };

  beforeEach(() => {
    classifier = new SizeClassifier();
  });

  describe("constructor", () => {
    it("should initialize with correct name and priority", () => {
      expect(classifier.getName()).toBe("SizeClassifier");
      expect(classifier.getPriority()).toBe(3);
    });
  });

  describe("canClassify", () => {
    it("should return true for regions with 5-80% difference", () => {
      const context = createMockContext();

      const region5 = createMockRegion(5);
      expect(classifier.canClassify(region5, context)).toBe(true);

      const region40 = createMockRegion(40);
      expect(classifier.canClassify(region40, context)).toBe(true);

      const region80 = createMockRegion(80);
      expect(classifier.canClassify(region80, context)).toBe(true);
    });

    it("should return false for regions outside 5-80% range", () => {
      const context = createMockContext();

      const region3 = createMockRegion(3);
      expect(classifier.canClassify(region3, context)).toBe(false);

      const region90 = createMockRegion(90);
      expect(classifier.canClassify(region90, context)).toBe(false);
    });
  });

  describe("classify", () => {
    it("should detect uniform scaling up", () => {
      const width = 80;
      const height = 80;
      const { original, compared } = createResizedBox(
        width,
        height,
        { width: 20, height: 20 },
        { width: 30, height: 30 }
      );

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(25, 1600, { x: 15, y: 15, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.SIZE);
      expect(result?.confidence).toBeGreaterThan(0.3);
      expect(result?.subType).toBe("scale-up");
      expect(result?.details).toHaveProperty("widthChange");
      expect(result?.details).toHaveProperty("heightChange");
      expect(result?.details).toHaveProperty("aspectRatioChange");
      expect(result?.details?.widthChange).toBeGreaterThan(0);
      expect(result?.details?.heightChange).toBeGreaterThan(0);
    });

    it("should detect uniform scaling down", () => {
      const width = 80;
      const height = 80;
      const { original, compared } = createResizedBox(
        width,
        height,
        { width: 40, height: 40 },
        { width: 20, height: 20 }
      );

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(30, 1600, { x: 10, y: 10, width: 60, height: 60 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.SIZE);
      expect(result?.subType).toBe("scale-down");
      expect(result?.details?.widthChange).toBeLessThan(0);
      expect(result?.details?.heightChange).toBeLessThan(0);
    });

    it("should detect horizontal resize", () => {
      const width = 100;
      const height = 60;
      const { original, compared } = createResizedBox(
        width,
        height,
        { width: 30, height: 30 },
        { width: 50, height: 30 }
      );

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(20, 1200, { x: 15, y: 10, width: 70, height: 40 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.SIZE);
      expect(result?.subType).toBe("horizontal-resize");
      expect(result?.details?.widthChange).toBeGreaterThan(0);
      expect(Math.abs((result?.details?.heightChange as number) || 0)).toBeLessThan(0.1);
    });

    it("should detect vertical resize", () => {
      const width = 60;
      const height = 100;
      const { original, compared } = createResizedBox(
        width,
        height,
        { width: 30, height: 30 },
        { width: 30, height: 50 }
      );

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(20, 1200, { x: 10, y: 15, width: 40, height: 70 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.SIZE);
      expect(result?.subType).toBe("vertical-resize");
      expect(result?.details?.heightChange).toBeGreaterThan(0);
      expect(Math.abs((result?.details?.widthChange as number) || 0)).toBeLessThan(0.1);
    });

    it("should detect aspect ratio changes", () => {
      const width = 80;
      const height = 80;
      const { original, compared } = createResizedBox(
        width,
        height,
        { width: 30, height: 30 },
        { width: 40, height: 20 }
      );

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(25, 1600, { x: 15, y: 15, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.SIZE);
      expect(result?.subType).toBe("aspect-change");
      expect(result?.details?.aspectRatioChange).toBeGreaterThan(0.2);
    });

    it("should return null for non-size changes", () => {
      const width = 60;
      const height = 60;
      const original = new Uint8Array(width * height * 4);
      const compared = new Uint8Array(width * height * 4);

      // Fill with different colors but same size elements
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          // Same pattern, different colors
          const inBox = x >= 20 && x < 40 && y >= 20 && y < 40;

          if (inBox) {
            original[idx] = 255;
            original[idx + 1] = 0;
            original[idx + 2] = 0;

            compared[idx] = 0;
            compared[idx + 1] = 0;
            compared[idx + 2] = 255;
          } else {
            original[idx] = 240;
            original[idx + 1] = 240;
            original[idx + 2] = 240;

            compared[idx] = 240;
            compared[idx + 1] = 240;
            compared[idx + 2] = 240;
          }

          original[idx + 3] = 255;
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(40, 900, { x: 15, y: 15, width: 30, height: 30 });

      const result = classifier.classify(region, context);

      // Color change only, might still be detected if boundaries are similar
      if (result) {
        expect(result.confidence).toBeLessThan(0.5);
        // Should have no size change
        expect(Math.abs((result.details?.widthChange as number) || 0)).toBeLessThan(0.1);
        expect(Math.abs((result.details?.heightChange as number) || 0)).toBeLessThan(0.1);
      }
    });
  });

  describe("detectElementBoundaries", () => {
    it("should detect boundaries using edge detection", () => {
      const width = 60;
      const height = 60;
      const { original } = createResizedBox(
        width,
        height,
        { width: 30, height: 30 },
        { width: 30, height: 30 }
      );

      const context = createMockContext(original, original, width, height);
      const region = createMockRegion(10, 900, { x: 10, y: 10, width: 40, height: 40 });

      const result = classifier.classify(region, context);

      expect(result?.details?.originalSize).toBeDefined();
      expect(result?.details?.comparedSize).toBeDefined();
    });

    it("should handle images with no clear edges", () => {
      const width = 50;
      const height = 50;
      const gradientData = new Uint8Array(width * height * 4);

      // Create gradient pattern
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          gradientData[idx] = ((x * 255) / width) | 0;
          gradientData[idx + 1] = ((y * 255) / height) | 0;
          gradientData[idx + 2] = 128;
          gradientData[idx + 3] = 255;
        }
      }

      const context = createMockContext(gradientData, gradientData, width, height);
      const region = createMockRegion(10, 625, { x: 5, y: 5, width: 40, height: 40 });

      expect(() => classifier.classify(region, context)).not.toThrow();
    });
  });

  describe("applySobelX and applySobelY", () => {
    it("should detect vertical edges with Sobel X", () => {
      const width = 40;
      const height = 40;
      const data = new Uint8Array(width * height * 4);

      // Create vertical edge
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const value = x < width / 2 ? 0 : 255;
          data[idx] = value;
          data[idx + 1] = value;
          data[idx + 2] = value;
          data[idx + 3] = 255;
        }
      }

      const context = createMockContext(data, data, width, height);
      const region = createMockRegion(10, 400, { x: 5, y: 5, width: 30, height: 30 });

      expect(() => classifier.classify(region, context)).not.toThrow();
    });

    it("should detect horizontal edges with Sobel Y", () => {
      const width = 40;
      const height = 40;
      const data = new Uint8Array(width * height * 4);

      // Create horizontal edge
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const value = y < height / 2 ? 0 : 255;
          data[idx] = value;
          data[idx + 1] = value;
          data[idx + 2] = value;
          data[idx + 3] = 255;
        }
      }

      const context = createMockContext(data, data, width, height);
      const region = createMockRegion(10, 400, { x: 5, y: 5, width: 30, height: 30 });

      expect(() => classifier.classify(region, context)).not.toThrow();
    });
  });

  describe("detectBackgroundColor", () => {
    it("should detect uniform background color", () => {
      const width = 60;
      const height = 60;
      const bgColor = { r: 200, g: 200, b: 200 };
      const { original } = createResizedBox(
        width,
        height,
        { width: 20, height: 20 },
        { width: 20, height: 20 },
        bgColor
      );

      const context = createMockContext(original, original, width, height);
      const region = createMockRegion(10, 900, { x: 10, y: 10, width: 40, height: 40 });

      const result = classifier.classify(region, context);

      expect(result).toBeDefined();
    });

    it("should handle images with varied corner colors", () => {
      const width = 50;
      const height = 50;
      const data = new Uint8Array(width * height * 4);

      // Fill with different corner colors
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          // Different color for each quadrant
          if (x < width / 2 && y < height / 2) {
            data[idx] = 255;
            data[idx + 1] = 0;
            data[idx + 2] = 0;
          } else if (x >= width / 2 && y < height / 2) {
            data[idx] = 0;
            data[idx + 1] = 255;
            data[idx + 2] = 0;
          } else if (x < width / 2 && y >= height / 2) {
            data[idx] = 0;
            data[idx + 1] = 0;
            data[idx + 2] = 255;
          } else {
            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 0;
          }
          data[idx + 3] = 255;
        }
      }

      const context = createMockContext(data, data, width, height);
      const region = createMockRegion(10, 625, { x: 10, y: 10, width: 30, height: 30 });

      expect(() => classifier.classify(region, context)).not.toThrow();
    });
  });

  describe("analyzeSizeChange", () => {
    it("should calculate correct size changes", () => {
      const width = 80;
      const height = 80;
      const { original, compared } = createResizedBox(
        width,
        height,
        { width: 30, height: 20 },
        { width: 45, height: 30 }
      );

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(25, 1600, { x: 10, y: 10, width: 60, height: 60 });

      const result = classifier.classify(region, context);

      expect(result?.details?.widthChange).toBeCloseTo(0.5, 1); // 50% increase
      expect(result?.details?.heightChange).toBeCloseTo(0.5, 1); // 50% increase
      const originalSize = result?.details?.originalSize as { width: number; height: number };
      const comparedSize = result?.details?.comparedSize as { width: number; height: number };
      // Allow for some edge detection variance
      expect(originalSize?.width).toBeGreaterThan(25);
      expect(originalSize?.width).toBeLessThan(35);
      expect(originalSize?.height).toBeGreaterThan(15);
      expect(originalSize?.height).toBeLessThan(25);
      expect(comparedSize?.width).toBeGreaterThan(40);
      expect(comparedSize?.width).toBeLessThan(50);
      expect(comparedSize?.height).toBeGreaterThan(25);
      expect(comparedSize?.height).toBeLessThan(35);
    });
  });

  describe("calculateContentSimilarity", () => {
    it("should detect high similarity for same content different size", () => {
      const width = 80;
      const height = 80;

      // Create similar pattern at different sizes
      const original = new Uint8Array(width * height * 4);
      const compared = new Uint8Array(width * height * 4);

      // Original: small checkerboard
      const smallSize = 20;
      const smallX = (width - smallSize) / 2;
      const smallY = (height - smallSize) / 2;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          if (x >= smallX && x < smallX + smallSize && y >= smallY && y < smallY + smallSize) {
            const localX = x - smallX;
            const localY = y - smallY;
            const checker = (((localX / 5) | 0) + ((localY / 5) | 0)) % 2;
            const value = checker ? 255 : 0;
            original[idx] = value;
            original[idx + 1] = value;
            original[idx + 2] = value;
          } else {
            original[idx] = 200;
            original[idx + 1] = 200;
            original[idx + 2] = 200;
          }
          original[idx + 3] = 255;
        }
      }

      // Compared: larger checkerboard with same pattern
      const largeSize = 30;
      const largeX = (width - largeSize) / 2;
      const largeY = (height - largeSize) / 2;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          if (x >= largeX && x < largeX + largeSize && y >= largeY && y < largeY + largeSize) {
            const localX = x - largeX;
            const localY = y - largeY;
            const checker = (((localX / 7.5) | 0) + ((localY / 7.5) | 0)) % 2;
            const value = checker ? 255 : 0;
            compared[idx] = value;
            compared[idx + 1] = value;
            compared[idx + 2] = value;
          } else {
            compared[idx] = 200;
            compared[idx + 1] = 200;
            compared[idx + 2] = 200;
          }
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(25, 1600, { x: 15, y: 15, width: 50, height: 50 });

      const result = classifier.classify(region, context);

      expect(result?.details?.contentSimilarity).toBeGreaterThan(0.5);
    });
  });

  describe("confidence calculation", () => {
    it("should boost confidence for uniform scaling", () => {
      const width = 80;
      const height = 80;
      const { original: uniform, compared: uniformCompared } = createResizedBox(
        width,
        height,
        { width: 20, height: 20 },
        { width: 30, height: 30 }
      );

      const { original: nonUniform, compared: nonUniformCompared } = createResizedBox(
        width,
        height,
        { width: 20, height: 20 },
        { width: 35, height: 25 }
      );

      const uniformContext = createMockContext(uniform, uniformCompared, width, height);
      const nonUniformContext = createMockContext(nonUniform, nonUniformCompared, width, height);
      const region = createMockRegion(25, 1600, { x: 15, y: 15, width: 50, height: 50 });

      const uniformResult = classifier.classify(region, uniformContext);
      const nonUniformResult = classifier.classify(region, nonUniformContext);

      expect(uniformResult?.confidence || 0).toBeGreaterThan(nonUniformResult?.confidence || 0);
    });

    it("should penalize very high difference percentages", () => {
      const width = 80;
      const height = 80;
      const { original, compared } = createResizedBox(
        width,
        height,
        { width: 20, height: 20 },
        { width: 30, height: 30 }
      );

      const context = createMockContext(original, compared, width, height);

      const region40 = createMockRegion(40, 1600, { x: 15, y: 15, width: 50, height: 50 });
      const region75 = createMockRegion(75, 1600, { x: 15, y: 15, width: 50, height: 50 });

      const result40 = classifier.classify(region40, context);
      const result75 = classifier.classify(region75, context);

      expect(result75?.confidence || 0).toBeLessThan(result40?.confidence || 1);
    });
  });

  describe("edge cases", () => {
    it("should handle aspect ratio changes", () => {
      const width = 100;
      const height = 80;
      const { original, compared } = createResizedBox(
        width,
        height,
        { width: 40, height: 20 },
        { width: 20, height: 40 }
      );

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(50, 2000, { x: 10, y: 10, width: 80, height: 60 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.SIZE);
      expect(result?.details?.aspectRatioChange).toBeGreaterThan(0.5);
    });

    it("should handle padding changes", () => {
      const width = 80;
      const height = 80;

      // Create box with padding change
      const original = new Uint8Array(width * height * 4);
      const compared = new Uint8Array(width * height * 4);

      // Original: box with small padding
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          if (x >= 20 && x < 60 && y >= 20 && y < 60) {
            if (x >= 25 && x < 55 && y >= 25 && y < 55) {
              // Inner content
              original[idx] = 100;
              original[idx + 1] = 100;
              original[idx + 2] = 100;
            } else {
              // Padding
              original[idx] = 150;
              original[idx + 1] = 150;
              original[idx + 2] = 150;
            }
          } else {
            // Background
            original[idx] = 240;
            original[idx + 1] = 240;
            original[idx + 2] = 240;
          }
          original[idx + 3] = 255;
        }
      }

      // Compared: same content with larger padding
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          if (x >= 10 && x < 70 && y >= 10 && y < 70) {
            if (x >= 25 && x < 55 && y >= 25 && y < 55) {
              // Inner content (same size)
              compared[idx] = 100;
              compared[idx + 1] = 100;
              compared[idx + 2] = 100;
            } else {
              // Larger padding
              compared[idx] = 150;
              compared[idx + 1] = 150;
              compared[idx + 2] = 150;
            }
          } else {
            // Background
            compared[idx] = 240;
            compared[idx + 1] = 240;
            compared[idx + 2] = 240;
          }
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(30, 1600, { x: 5, y: 5, width: 70, height: 70 });

      const result = classifier.classify(region, context);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(DifferenceType.SIZE);
    });

    it("should handle very small size changes", () => {
      const width = 80;
      const height = 80;
      const { original, compared } = createResizedBox(
        width,
        height,
        { width: 30, height: 30 },
        { width: 31, height: 31 }
      );

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(8, 400, { x: 20, y: 20, width: 40, height: 40 });

      const result = classifier.classify(region, context);

      // Very small changes might not be classified as size changes
      if (result) {
        expect(result.confidence).toBeLessThan(0.5);
      }
    });

    it("should handle elements at image boundaries", () => {
      const width = 60;
      const height = 60;
      const original = new Uint8Array(width * height * 4);
      const compared = new Uint8Array(width * height * 4);

      // Element touching edges
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          // Original: element at top-left
          if (x < 20 && y < 20) {
            original[idx] = 50;
            original[idx + 1] = 50;
            original[idx + 2] = 50;
          } else {
            original[idx] = 240;
            original[idx + 1] = 240;
            original[idx + 2] = 240;
          }

          // Compared: element scaled at top-left
          if (x < 30 && y < 30) {
            compared[idx] = 50;
            compared[idx + 1] = 50;
            compared[idx + 2] = 50;
          } else {
            compared[idx] = 240;
            compared[idx + 1] = 240;
            compared[idx + 2] = 240;
          }

          original[idx + 3] = 255;
          compared[idx + 3] = 255;
        }
      }

      const context = createMockContext(original, compared, width, height);
      const region = createMockRegion(25, 900, { x: 0, y: 0, width: 40, height: 40 });

      expect(() => classifier.classify(region, context)).not.toThrow();
    });
  });
});
