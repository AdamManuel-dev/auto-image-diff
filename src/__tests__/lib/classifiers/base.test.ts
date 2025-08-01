/**
 * @fileoverview Tests for difference classifier base architecture
 * @lastmodified 2025-08-01T09:32:00Z
 */

import {
  DifferenceClassifier,
  DifferenceType,
  DifferenceRegion,
  AnalysisContext,
  ClassificationResult,
} from '../../../lib/classifiers/base';

// Mock classifier implementation for testing
class MockClassifier extends DifferenceClassifier {
  private canClassifyResult: boolean;
  private classifyResult: ClassificationResult | null;

  constructor(
    name: string,
    priority: number,
    canClassifyResult = true,
    classifyResult: ClassificationResult | null = null
  ) {
    super(name, priority);
    this.canClassifyResult = canClassifyResult;
    this.classifyResult = classifyResult;
  }

  canClassify(): boolean {
    return this.canClassifyResult;
  }

  classify(): ClassificationResult | null {
    return this.classifyResult;
  }
}

describe('DifferenceClassifier base class', () => {
  const createMockContext = (): AnalysisContext => ({
    originalImage: {
      data: new Uint8Array(100 * 100 * 4),
      width: 100,
      height: 100,
    },
    comparedImage: {
      data: new Uint8Array(100 * 100 * 4),
      width: 100,
      height: 100,
    },
  });

  describe('constructor and getters', () => {
    it('should initialize with name and priority', () => {
      const classifier = new MockClassifier('test', 10);
      expect(classifier.getName()).toBe('test');
      expect(classifier.getPriority()).toBe(10);
    });

    it('should use default priority of 0', () => {
      const classifier = new MockClassifier('test', 0);
      expect(classifier.getPriority()).toBe(0);
    });
  });

  describe('extractRegionData', () => {
    it('should extract correct region from image data', () => {
      class TestClassifier extends MockClassifier {
        testExtractRegion(
          imageData: Uint8Array,
          width: number,
          bounds: DifferenceRegion['bounds']
        ): Uint8Array {
          return this.extractRegionData(imageData, width, bounds);
        }
      }

      const classifier = new TestClassifier('test', 0);
      const imageData = new Uint8Array(10 * 10 * 4);
      
      // Fill with test pattern
      for (let i = 0; i < imageData.length; i += 4) {
        imageData[i] = 255; // R
        imageData[i + 1] = 128; // G
        imageData[i + 2] = 64; // B
        imageData[i + 3] = 255; // A
      }

      const bounds = { x: 2, y: 2, width: 3, height: 3 };
      const extracted = classifier.testExtractRegion(imageData, 10, bounds);

      expect(extracted.length).toBe(3 * 3 * 4);
      // Check first pixel
      expect(extracted[0]).toBe(255); // R
      expect(extracted[1]).toBe(128); // G
      expect(extracted[2]).toBe(64); // B
      expect(extracted[3]).toBe(255); // A
    });
  });

  describe('calculateColorStats', () => {
    it('should calculate correct color statistics', () => {
      class TestClassifier extends MockClassifier {
        testColorStats(pixelData: Uint8Array) {
          return this.calculateColorStats(pixelData);
        }
      }

      const classifier = new TestClassifier('test', 0);
      
      // Create test data with 4 pixels
      const pixelData = new Uint8Array([
        100, 150, 200, 255, // Pixel 1
        100, 150, 200, 255, // Pixel 2 (same as 1)
        120, 160, 210, 255, // Pixel 3
        80, 140, 190, 255,  // Pixel 4
      ]);

      const stats = classifier.testColorStats(pixelData);

      expect(stats.avgColor.r).toBe(100); // (100+100+120+80)/4
      expect(stats.avgColor.g).toBe(150); // (150+150+160+140)/4
      expect(stats.avgColor.b).toBe(200); // (200+200+210+190)/4
      expect(stats.avgColor.a).toBe(255);

      expect(stats.variance).toBeGreaterThan(0);
      expect(stats.dominantColors.length).toBeGreaterThan(0);
      expect(stats.dominantColors[0].count).toBe(2); // Two identical pixels
    });
  });

  describe('detectEdges', () => {
    it('should detect edges in image data', () => {
      class TestClassifier extends MockClassifier {
        testDetectEdges(
          pixelData: Uint8Array,
          width: number,
          height: number
        ) {
          return this.detectEdges(pixelData, width, height);
        }
      }

      const classifier = new TestClassifier('test', 0);
      const width = 5;
      const height = 5;
      const pixelData = new Uint8Array(width * height * 4);

      // Create a simple edge pattern (vertical line in middle)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const value = x < width / 2 ? 0 : 255;
          pixelData[idx] = value;
          pixelData[idx + 1] = value;
          pixelData[idx + 2] = value;
          pixelData[idx + 3] = 255;
        }
      }

      const result = classifier.testDetectEdges(pixelData, width, height);
      
      expect(result.edgeCount).toBeGreaterThan(0);
      expect(result.edgeDensity).toBeGreaterThan(0);
      expect(result.edgeDensity).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateShift', () => {
    it('should calculate shift between regions', () => {
      class TestClassifier extends MockClassifier {
        testCalculateShift(
          bounds: DifferenceRegion['bounds'],
          context: AnalysisContext
        ) {
          return this.calculateShift(bounds, context);
        }
      }

      const classifier = new TestClassifier('test', 0);
      const bounds = { x: 10, y: 20, width: 30, height: 40 };
      const context = createMockContext();

      const shift = classifier.testCalculateShift(bounds, context);

      expect(shift).toHaveProperty('dx');
      expect(shift).toHaveProperty('dy');
      expect(shift).toHaveProperty('distance');
      expect(shift.distance).toBe(0); // Currently returns 0 shift
      expect(shift.dx).toBe(0);
      expect(shift.dy).toBe(0);
    });
  });
});

describe('DifferenceType enum', () => {
  it('should have all expected types', () => {
    expect(DifferenceType.CONTENT).toBe('content');
    expect(DifferenceType.STYLE).toBe('style');
    expect(DifferenceType.LAYOUT).toBe('layout');
    expect(DifferenceType.SIZE).toBe('size');
    expect(DifferenceType.STRUCTURAL).toBe('structural');
    expect(DifferenceType.UNKNOWN).toBe('unknown');
  });
});