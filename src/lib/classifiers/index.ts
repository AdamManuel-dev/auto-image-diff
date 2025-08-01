/**
 * @fileoverview Classifier module exports and registration
 * @lastmodified 2025-08-01T15:45:00Z
 *
 * Features: Export all classifiers, register with ClassifierRegistry
 * Main APIs: All classifier classes and registration utilities
 * Constraints: Classifiers must be registered to be used
 * Patterns: Central export point for all classifier implementations
 */

export * from "./base";
export * from "./content";
export * from "./style";
export * from "./layout";
export * from "./size";
export * from "./structural";

import { ClassifierRegistry, DifferenceType } from "./base";
import { ContentClassifier } from "./content";
import { StyleClassifier } from "./style";
import { LayoutClassifier } from "./layout";
import { SizeClassifier } from "./size";
import { StructuralClassifier } from "./structural";

// Register all classifiers
ClassifierRegistry.register(DifferenceType.CONTENT, ContentClassifier);
ClassifierRegistry.register(DifferenceType.STYLE, StyleClassifier);
ClassifierRegistry.register(DifferenceType.LAYOUT, LayoutClassifier);
ClassifierRegistry.register(DifferenceType.SIZE, SizeClassifier);
ClassifierRegistry.register(DifferenceType.STRUCTURAL, StructuralClassifier);

// Also register with the new/removed element types
ClassifierRegistry.register(DifferenceType.NEW_ELEMENT, StructuralClassifier);
ClassifierRegistry.register(DifferenceType.REMOVED_ELEMENT, StructuralClassifier);

// Export a convenience function to get all classifiers
export function getAllClassifiers(): DifferenceClassifier[] {
  return [
    new ContentClassifier(),
    new StyleClassifier(),
    new LayoutClassifier(),
    new SizeClassifier(),
    new StructuralClassifier(),
  ];
}

// Export a function to classify a region with all classifiers
export function classifyRegion(
  region: DifferenceRegion,
  context: AnalysisContext
): ClassificationResult[] {
  const classifiers = getAllClassifiers();
  const results: import("./base").ClassificationResult[] = [];

  // Sort by priority (higher priority first)
  classifiers.sort((a, b) => b.getPriority() - a.getPriority());

  for (const classifier of classifiers) {
    if (classifier.canClassify(region, context)) {
      const result = classifier.classify(region, context);
      if (result) {
        results.push(result);
      }
    }
  }

  return results;
}