/**
 * @fileoverview Classifier manager for orchestrating difference analysis
 * @lastmodified 2025-08-01T09:30:00Z
 * 
 * Features: Register classifiers, run classification pipeline, aggregate results
 * Main APIs: ClassifierManager, registerClassifier(), classifyRegion()
 * Constraints: Classifiers run in priority order, first match wins
 * Patterns: Chain of responsibility, confidence-based selection
 */

import {
  DifferenceClassifier,
  DifferenceRegion,
  DifferenceType,
  ClassificationResult,
  AnalysisContext,
} from './base';

export interface RegionClassification {
  region: DifferenceRegion;
  classification: ClassificationResult;
  classifier: string;
}

export interface ClassificationSummary {
  totalRegions: number;
  classifiedRegions: number;
  unclassifiedRegions: number;
  byType: Record<DifferenceType, number>;
  regions: RegionClassification[];
  confidence: {
    min: number;
    max: number;
    avg: number;
  };
}

export class ClassifierManager {
  private classifiers: DifferenceClassifier[] = [];
  private minConfidence: number;

  constructor(minConfidence = 0.5) {
    this.minConfidence = minConfidence;
  }

  /**
   * Register a classifier
   */
  registerClassifier(classifier: DifferenceClassifier): void {
    this.classifiers.push(classifier);
    // Sort by priority (descending)
    this.classifiers.sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * Remove a classifier by name
   */
  unregisterClassifier(name: string): boolean {
    const initialLength = this.classifiers.length;
    this.classifiers = this.classifiers.filter(
      (c) => c.getName() !== name
    );
    return this.classifiers.length < initialLength;
  }

  /**
   * Get all registered classifiers
   */
  getClassifiers(): ReadonlyArray<DifferenceClassifier> {
    return [...this.classifiers];
  }

  /**
   * Classify a single region
   */
  classifyRegion(
    region: DifferenceRegion,
    context: AnalysisContext
  ): RegionClassification | null {
    for (const classifier of this.classifiers) {
      if (!classifier.canClassify(region, context)) {
        continue;
      }

      const result = classifier.classify(region, context);
      if (result && result.confidence >= this.minConfidence) {
        return {
          region,
          classification: result,
          classifier: classifier.getName(),
        };
      }
    }

    // No classifier could handle this region with sufficient confidence
    return {
      region,
      classification: {
        type: DifferenceType.UNKNOWN,
        confidence: 0,
        details: { reason: 'No classifier matched with sufficient confidence' },
      },
      classifier: 'none',
    };
  }

  /**
   * Classify multiple regions and generate summary
   */
  classifyRegions(
    regions: DifferenceRegion[],
    context: AnalysisContext
  ): ClassificationSummary {
    const classifications: RegionClassification[] = [];
    const typeCount: Record<DifferenceType, number> = {
      [DifferenceType.CONTENT]: 0,
      [DifferenceType.STYLE]: 0,
      [DifferenceType.LAYOUT]: 0,
      [DifferenceType.SIZE]: 0,
      [DifferenceType.STRUCTURAL]: 0,
      [DifferenceType.NEW_ELEMENT]: 0,
      [DifferenceType.REMOVED_ELEMENT]: 0,
      [DifferenceType.UNKNOWN]: 0,
    };

    let minConfidence = 1;
    let maxConfidence = 0;
    let totalConfidence = 0;
    let classifiedCount = 0;

    for (const region of regions) {
      const classification = this.classifyRegion(region, context);
      if (classification) {
        classifications.push(classification);
        typeCount[classification.classification.type]++;

        const confidence = classification.classification.confidence;
        minConfidence = Math.min(minConfidence, confidence);
        maxConfidence = Math.max(maxConfidence, confidence);
        totalConfidence += confidence;

        if (classification.classification.type !== DifferenceType.UNKNOWN) {
          classifiedCount++;
        }
      }
    }

    const avgConfidence = regions.length > 0 
      ? totalConfidence / regions.length 
      : 0;

    return {
      totalRegions: regions.length,
      classifiedRegions: classifiedCount,
      unclassifiedRegions: regions.length - classifiedCount,
      byType: typeCount,
      regions: classifications,
      confidence: {
        min: regions.length > 0 ? minConfidence : 0,
        max: maxConfidence,
        avg: avgConfidence,
      },
    };
  }

  /**
   * Set minimum confidence threshold
   */
  setMinConfidence(confidence: number): void {
    if (confidence < 0 || confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }
    this.minConfidence = confidence;
  }

  /**
   * Get minimum confidence threshold
   */
  getMinConfidence(): number {
    return this.minConfidence;
  }

  /**
   * Generate a human-readable summary of classifications
   */
  generateSummaryText(summary: ClassificationSummary): string {
    const lines: string[] = [
      `Analyzed ${summary.totalRegions} difference regions:`,
      `- Successfully classified: ${summary.classifiedRegions} (${(
        (summary.classifiedRegions / summary.totalRegions) * 100
      ).toFixed(1)}%)`,
      `- Unknown: ${summary.unclassifiedRegions}`,
      '',
      'Classification breakdown:',
    ];

    for (const [type, count] of Object.entries(summary.byType)) {
      if (count > 0) {
        const percentage = ((count / summary.totalRegions) * 100).toFixed(1);
        lines.push(`- ${type}: ${count} regions (${percentage}%)`);
      }
    }

    lines.push(
      '',
      `Confidence: min=${summary.confidence.min.toFixed(2)}, ` +
      `avg=${summary.confidence.avg.toFixed(2)}, ` +
      `max=${summary.confidence.max.toFixed(2)}`
    );

    return lines.join('\n');
  }
}