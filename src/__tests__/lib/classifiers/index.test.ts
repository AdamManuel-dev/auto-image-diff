/**
 * @fileoverview Tests for classifier index and registration
 * @lastmodified 2025-08-01T17:50:00Z
 */

import {
  getAllClassifiers,
  classifyRegion,
  ClassifierRegistry,
  DifferenceType,
  DifferenceRegion,
  AnalysisContext,
  ContentClassifier,
  StyleClassifier,
  LayoutClassifier,
  SizeClassifier,
  StructuralClassifier,
} from "../../../lib/classifiers";

describe("Classifier Index", () => {
  describe("exports", () => {
    it("should export all classifier classes", () => {
      expect(ContentClassifier).toBeDefined();
      expect(StyleClassifier).toBeDefined();
      expect(LayoutClassifier).toBeDefined();
      expect(SizeClassifier).toBeDefined();
      expect(StructuralClassifier).toBeDefined();
    });

    it("should export base types and interfaces", () => {
      expect(DifferenceType).toBeDefined();
      expect(ClassifierRegistry).toBeDefined();
    });

    it("should export utility functions", () => {
      expect(getAllClassifiers).toBeDefined();
      expect(classifyRegion).toBeDefined();
    });
  });

  describe("ClassifierRegistry", () => {
    it("should have all classifiers registered", () => {
      expect(ClassifierRegistry.get(DifferenceType.CONTENT)).toBe(ContentClassifier);
      expect(ClassifierRegistry.get(DifferenceType.STYLE)).toBe(StyleClassifier);
      expect(ClassifierRegistry.get(DifferenceType.LAYOUT)).toBe(LayoutClassifier);
      expect(ClassifierRegistry.get(DifferenceType.SIZE)).toBe(SizeClassifier);
      expect(ClassifierRegistry.get(DifferenceType.STRUCTURAL)).toBe(StructuralClassifier);
    });

    it("should have structural classifier registered for new/removed elements", () => {
      expect(ClassifierRegistry.get(DifferenceType.NEW_ELEMENT)).toBe(StructuralClassifier);
      expect(ClassifierRegistry.get(DifferenceType.REMOVED_ELEMENT)).toBe(StructuralClassifier);
    });

    it("should create classifier instances", () => {
      const contentClassifier = ClassifierRegistry.create(DifferenceType.CONTENT);
      expect(contentClassifier).toBeInstanceOf(ContentClassifier);

      const styleClassifier = ClassifierRegistry.create(DifferenceType.STYLE);
      expect(styleClassifier).toBeInstanceOf(StyleClassifier);
    });

    it("should return null for unknown types", () => {
      const unknownClassifier = ClassifierRegistry.create(DifferenceType.UNKNOWN);
      expect(unknownClassifier).toBeNull();
    });

    it("should get all registered classifiers", () => {
      const allClassifiers = ClassifierRegistry.getAll();
      expect(allClassifiers.size).toBeGreaterThanOrEqual(5);
      expect(allClassifiers.has(DifferenceType.CONTENT)).toBe(true);
      expect(allClassifiers.has(DifferenceType.STYLE)).toBe(true);
      expect(allClassifiers.has(DifferenceType.LAYOUT)).toBe(true);
      expect(allClassifiers.has(DifferenceType.SIZE)).toBe(true);
      expect(allClassifiers.has(DifferenceType.STRUCTURAL)).toBe(true);
    });
  });

  describe("getAllClassifiers", () => {
    it("should return instances of all classifiers", () => {
      const classifiers = getAllClassifiers();

      expect(classifiers).toHaveLength(5);
      expect(classifiers[0]).toBeInstanceOf(ContentClassifier);
      expect(classifiers[1]).toBeInstanceOf(StyleClassifier);
      expect(classifiers[2]).toBeInstanceOf(LayoutClassifier);
      expect(classifiers[3]).toBeInstanceOf(SizeClassifier);
      expect(classifiers[4]).toBeInstanceOf(StructuralClassifier);
    });

    it("should return classifiers with correct names", () => {
      const classifiers = getAllClassifiers();
      const names = classifiers.map((c) => c.getName());

      expect(names).toContain("ContentClassifier");
      expect(names).toContain("StyleClassifier");
      expect(names).toContain("LayoutClassifier");
      expect(names).toContain("SizeClassifier");
      expect(names).toContain("StructuralClassifier");
    });

    it("should return classifiers with different priorities", () => {
      const classifiers = getAllClassifiers();
      const priorities = classifiers.map((c) => c.getPriority());

      // Check that priorities are unique
      const uniquePriorities = new Set(priorities);
      expect(uniquePriorities.size).toBe(priorities.length);
    });
  });

  describe("classifyRegion", () => {
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

    it("should return empty array for no matches", () => {
      const context = createMockContext();
      const region = createMockRegion(0.5); // Very low difference

      const results = classifyRegion(region, context);

      expect(results).toEqual([]);
    });

    it("should classify regions with multiple classifiers", () => {
      const width = 60;
      const height = 60;
      const originalData = new Uint8Array(width * height * 4);
      const comparedData = new Uint8Array(width * height * 4);

      // Create a pattern that could match multiple classifiers
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          // Original: light checkerboard
          if (((x / 10) | (0 + y / 10) | 0) % 2 === 0) {
            originalData[idx] = 200;
            originalData[idx + 1] = 200;
            originalData[idx + 2] = 200;
          } else {
            originalData[idx] = 255;
            originalData[idx + 1] = 255;
            originalData[idx + 2] = 255;
          }
          originalData[idx + 3] = 255;

          // Compared: dark version of same pattern
          if (((x / 10) | (0 + y / 10) | 0) % 2 === 0) {
            comparedData[idx] = 50;
            comparedData[idx + 1] = 50;
            comparedData[idx + 2] = 50;
          } else {
            comparedData[idx] = 100;
            comparedData[idx + 1] = 100;
            comparedData[idx + 2] = 100;
          }
          comparedData[idx + 3] = 255;
        }
      }

      const context = createMockContext(originalData, comparedData, width, height);
      const region = createMockRegion(80, 900, { x: 5, y: 5, width: 50, height: 50 });

      const results = classifyRegion(region, context);

      expect(results.length).toBeGreaterThan(0);
      // Should classify as style change (theme)
      const styleResult = results.find((r) => r.type === DifferenceType.STYLE);
      expect(styleResult).toBeDefined();
    });

    it("should respect classifier priority order", () => {
      const width = 60;
      const height = 60;
      const empty = new Uint8Array(width * height * 4);
      const withElement = new Uint8Array(width * height * 4);

      // Fill empty with background
      for (let i = 0; i < empty.length; i += 4) {
        empty[i] = 240;
        empty[i + 1] = 240;
        empty[i + 2] = 240;
        empty[i + 3] = 255;
      }

      // Add element to second image
      for (let y = 20; y < 40; y++) {
        for (let x = 20; x < 40; x++) {
          const idx = (y * width + x) * 4;
          withElement[idx] = 50;
          withElement[idx + 1] = 100;
          withElement[idx + 2] = 150;
          withElement[idx + 3] = 255;
        }
      }

      const context = createMockContext(empty, withElement, width, height);
      const region = createMockRegion(50, 900, { x: 15, y: 15, width: 30, height: 30 });

      const results = classifyRegion(region, context);

      // StructuralClassifier has priority 7, should be checked first
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].type).toBe(DifferenceType.STRUCTURAL);
    });

    it("should handle regions that match no classifiers", () => {
      const context = createMockContext();
      const region = createMockRegion(1); // Very low difference

      const results = classifyRegion(region, context);

      expect(results).toEqual([]);
    });

    it("should handle multiple classification results", () => {
      const width = 60;
      const height = 60;
      const original = new Uint8Array(width * height * 4);
      const compared = new Uint8Array(width * height * 4);

      // Create a complex change that might match multiple classifiers
      // Original: small box in center
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (x >= 25 && x < 35 && y >= 25 && y < 35) {
            original[idx] = 100;
            original[idx + 1] = 150;
            original[idx + 2] = 200;
          } else {
            original[idx] = 240;
            original[idx + 1] = 240;
            original[idx + 2] = 240;
          }
          original[idx + 3] = 255;
        }
      }

      // Compared: larger box with different color
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (x >= 20 && x < 40 && y >= 20 && y < 40) {
            compared[idx] = 200;
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
      const region = createMockRegion(35, 900, { x: 15, y: 15, width: 30, height: 30 });

      const results = classifyRegion(region, context);

      // Could match multiple classifiers (size change + style change)
      expect(results.length).toBeGreaterThanOrEqual(1);

      // Check that results are valid
      results.forEach((result) => {
        expect(result.type).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });
  });
});
