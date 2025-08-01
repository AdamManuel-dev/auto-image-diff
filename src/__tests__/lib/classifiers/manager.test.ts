/**
 * @fileoverview Tests for classifier manager
 * @lastmodified 2025-08-01T09:34:00Z
 */

import { ClassifierManager } from '../../../lib/classifiers/manager';
import {
  DifferenceClassifier,
  DifferenceType,
  DifferenceRegion,
  AnalysisContext,
  ClassificationResult,
} from '../../../lib/classifiers/base';

// Mock classifier for testing
class MockClassifier extends DifferenceClassifier {
  private _canClassify: boolean;
  private _result: ClassificationResult | null;

  constructor(
    name: string,
    priority: number,
    canClassify = true,
    result: ClassificationResult | null = null
  ) {
    super(name, priority);
    this._canClassify = canClassify;
    this._result = result || {
      type: DifferenceType.CONTENT,
      confidence: 0.8,
      subType: 'test',
    };
  }

  canClassify(): boolean {
    return this._canClassify;
  }

  classify(): ClassificationResult | null {
    return this._result;
  }
}

describe('ClassifierManager', () => {
  let manager: ClassifierManager;
  let context: AnalysisContext;
  let region: DifferenceRegion;

  beforeEach(() => {
    manager = new ClassifierManager();
    context = {
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
    };
    region = {
      id: 1,
      bounds: { x: 10, y: 10, width: 20, height: 20 },
      pixelCount: 400,
      differencePixels: 100,
      differencePercentage: 25,
    };
  });

  describe('classifier registration', () => {
    it('should register classifiers', () => {
      const classifier1 = new MockClassifier('test1', 10);
      const classifier2 = new MockClassifier('test2', 5);

      manager.registerClassifier(classifier1);
      manager.registerClassifier(classifier2);

      const classifiers = manager.getClassifiers();
      expect(classifiers).toHaveLength(2);
      expect(classifiers[0].getName()).toBe('test1'); // Higher priority first
      expect(classifiers[1].getName()).toBe('test2');
    });

    it('should sort classifiers by priority', () => {
      const low = new MockClassifier('low', 1);
      const high = new MockClassifier('high', 10);
      const mid = new MockClassifier('mid', 5);

      manager.registerClassifier(low);
      manager.registerClassifier(high);
      manager.registerClassifier(mid);

      const classifiers = manager.getClassifiers();
      expect(classifiers[0].getName()).toBe('high');
      expect(classifiers[1].getName()).toBe('mid');
      expect(classifiers[2].getName()).toBe('low');
    });

    it('should unregister classifiers', () => {
      const classifier1 = new MockClassifier('test1', 10);
      const classifier2 = new MockClassifier('test2', 5);

      manager.registerClassifier(classifier1);
      manager.registerClassifier(classifier2);

      const removed = manager.unregisterClassifier('test1');
      expect(removed).toBe(true);
      expect(manager.getClassifiers()).toHaveLength(1);
      expect(manager.getClassifiers()[0].getName()).toBe('test2');

      const notRemoved = manager.unregisterClassifier('nonexistent');
      expect(notRemoved).toBe(false);
    });
  });

  describe('region classification', () => {
    it('should classify region with first matching classifier', () => {
      const classifier1 = new MockClassifier('test1', 10, false);
      const classifier2 = new MockClassifier('test2', 5, true, {
        type: DifferenceType.STYLE,
        confidence: 0.9,
      });

      manager.registerClassifier(classifier1);
      manager.registerClassifier(classifier2);

      const result = manager.classifyRegion(region, context);
      expect(result).not.toBeNull();
      expect(result?.classification.type).toBe(DifferenceType.STYLE);
      expect(result?.classifier).toBe('test2');
    });

    it('should respect minimum confidence threshold', () => {
      manager.setMinConfidence(0.7);
      
      const lowConfidence = new MockClassifier('low', 10, true, {
        type: DifferenceType.CONTENT,
        confidence: 0.6,
      });
      const highConfidence = new MockClassifier('high', 5, true, {
        type: DifferenceType.STYLE,
        confidence: 0.8,
      });

      manager.registerClassifier(lowConfidence);
      manager.registerClassifier(highConfidence);

      const result = manager.classifyRegion(region, context);
      expect(result?.classification.type).toBe(DifferenceType.STYLE);
      expect(result?.classifier).toBe('high');
    });

    it('should return unknown type when no classifier matches', () => {
      const classifier = new MockClassifier('test', 10, false);
      manager.registerClassifier(classifier);

      const result = manager.classifyRegion(region, context);
      expect(result?.classification.type).toBe(DifferenceType.UNKNOWN);
      expect(result?.classifier).toBe('none');
    });
  });

  describe('batch classification', () => {
    it('should classify multiple regions', () => {
      const classifier = new MockClassifier('test', 10, true, {
        type: DifferenceType.CONTENT,
        confidence: 0.85,
      });
      manager.registerClassifier(classifier);

      const regions = [
        region,
        { ...region, id: 2 },
        { ...region, id: 3 },
      ];

      const summary = manager.classifyRegions(regions, context);

      expect(summary.totalRegions).toBe(3);
      expect(summary.classifiedRegions).toBe(3);
      expect(summary.unclassifiedRegions).toBe(0);
      expect(summary.byType[DifferenceType.CONTENT]).toBe(3);
      expect(summary.confidence.avg).toBeCloseTo(0.85);
    });

    it('should handle mixed classification results', () => {
      let callCount = 0;
      const alternatingClassifier = new MockClassifier('alternating', 10);
      alternatingClassifier.classify = () => {
        callCount++;
        if (callCount === 1) {
          return { type: DifferenceType.CONTENT, confidence: 0.9 };
        } else if (callCount === 2) {
          return { type: DifferenceType.STYLE, confidence: 0.8 };
        } else {
          return { type: DifferenceType.UNKNOWN, confidence: 0.1 };
        }
      };

      manager.registerClassifier(alternatingClassifier);

      const regions = [
        region,
        { ...region, id: 2 },
        { ...region, id: 3 },
      ];

      const summary = manager.classifyRegions(regions, context);

      expect(summary.byType[DifferenceType.CONTENT]).toBe(1);
      expect(summary.byType[DifferenceType.STYLE]).toBe(1);
      expect(summary.byType[DifferenceType.UNKNOWN]).toBe(1);
      expect(summary.classifiedRegions).toBe(2); // Unknown doesn't count
    });
  });

  describe('confidence management', () => {
    it('should get and set minimum confidence', () => {
      expect(manager.getMinConfidence()).toBe(0.5); // Default
      
      manager.setMinConfidence(0.75);
      expect(manager.getMinConfidence()).toBe(0.75);
    });

    it('should throw on invalid confidence values', () => {
      expect(() => manager.setMinConfidence(-0.1)).toThrow();
      expect(() => manager.setMinConfidence(1.1)).toThrow();
    });
  });

  describe('summary generation', () => {
    it('should generate human-readable summary', () => {
      const classifier = new MockClassifier('test', 10, true, {
        type: DifferenceType.CONTENT,
        confidence: 0.85,
      });
      manager.registerClassifier(classifier);

      const regions = [region, { ...region, id: 2 }];
      const summary = manager.classifyRegions(regions, context);
      const text = manager.generateSummaryText(summary);

      expect(text).toContain('Analyzed 2 difference regions');
      expect(text).toContain('Successfully classified: 2 (100.0%)');
      expect(text).toContain('content: 2 regions (100.0%)');
      expect(text).toContain('Confidence: min=0.85, avg=0.85, max=0.85');
    });
  });
});