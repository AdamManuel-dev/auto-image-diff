/**
 * @fileoverview Progressive refinement mode for iterative improvement
 * @lastmodified 2025-08-01T21:00:00Z
 *
 * Features: Iterative exclusion refinement, confidence-based suggestions, learning mode
 * Main APIs: ProgressiveRefiner class, refineExclusions(), suggestRefinements()
 * Constraints: Requires initial comparison results
 * Patterns: Machine learning-inspired refinement, confidence thresholds
 */

import { ComparisonResult } from "./imageProcessor";
import { ClassificationSummary } from "./classifiers/manager";
import { ExclusionsConfig, ExclusionRegion } from "./exclusions";
import { DifferenceType } from "./classifiers/base";
import { CssFixSuggester, FixSuggestion } from "./css-fix-suggester";
import * as fs from "fs/promises";
import * as path from "path";

export interface RefinementSuggestion {
  type: "exclude" | "include" | "reclassify" | "css-fix";
  reason: string;
  confidence: number;
  region?: {
    bounds: { x: number; y: number; width: number; height: number };
    selector?: string;
  };
  currentClassification?: string;
  suggestedClassification?: string;
  cssfix?: FixSuggestion;
}

export interface RefinementSession {
  id: string;
  timestamp: string;
  iterations: number;
  originalDifference: number;
  currentDifference: number;
  excludedRegions: number;
  acceptedSuggestions: number;
  rejectedSuggestions: number;
  history: Array<{
    iteration: number;
    action: string;
    result: {
      difference: number;
      regionsExcluded: number;
    };
  }>;
}

export interface RefinementOptions {
  maxIterations?: number;
  minConfidence?: number;
  autoExclude?: boolean;
  excludeTypes?: DifferenceType[];
  targetDifferenceThreshold?: number;
  learningMode?: boolean;
  sessionPath?: string;
}

export class ProgressiveRefiner {
  private options: RefinementOptions;
  private session: RefinementSession;
  private cssFixSuggester: CssFixSuggester;

  constructor(options: RefinementOptions = {}) {
    this.options = {
      maxIterations: 10,
      minConfidence: 0.7,
      autoExclude: false,
      excludeTypes: [],
      targetDifferenceThreshold: 0.5,
      learningMode: false,
      ...options,
    };

    this.session = this.initializeSession();
    this.cssFixSuggester = new CssFixSuggester();
  }

  /**
   * Initialize a new refinement session
   */
  private initializeSession(): RefinementSession {
    return {
      id: this.generateSessionId(),
      timestamp: new Date().toISOString(),
      iterations: 0,
      originalDifference: 0,
      currentDifference: 0,
      excludedRegions: 0,
      acceptedSuggestions: 0,
      rejectedSuggestions: 0,
      history: [],
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `refine-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start progressive refinement
   */
  async startRefinement(
    initialResult: ComparisonResult,
    existingExclusions?: ExclusionsConfig
  ): Promise<{
    suggestions: RefinementSuggestion[];
    session: RefinementSession;
    recommendedExclusions: ExclusionsConfig;
  }> {
    this.session.originalDifference = initialResult.statistics.percentageDifferent;
    this.session.currentDifference = initialResult.statistics.percentageDifferent;

    if (!initialResult.classification) {
      throw new Error("Classification data required for progressive refinement");
    }

    // Generate initial suggestions
    const suggestions = this.generateSuggestions(initialResult.classification, existingExclusions);

    // Create recommended exclusions
    const recommendedExclusions = this.createRecommendedExclusions(suggestions, existingExclusions);

    // Save session if path provided
    if (this.options.sessionPath) {
      await this.saveSession();
    }

    return {
      suggestions,
      session: this.session,
      recommendedExclusions,
    };
  }

  /**
   * Generate refinement suggestions
   */
  private generateSuggestions(
    classification: ClassificationSummary,
    _existingExclusions?: ExclusionsConfig
  ): RefinementSuggestion[] {
    const suggestions: RefinementSuggestion[] = [];

    // Analyze each classified region
    for (const region of classification.regions) {
      const { classification: cls, region: bounds } = region;

      // Suggest exclusions for low-confidence regions
      if (cls.confidence < (this.options.minConfidence ?? 0.7)) {
        suggestions.push({
          type: "exclude",
          reason: `Low confidence (${(cls.confidence * 100).toFixed(1)}%) suggests this may be a false positive`,
          confidence: 1 - cls.confidence,
          region: {
            bounds: bounds.bounds,
          },
          currentClassification: cls.type,
        });
      }

      // Suggest exclusions for specific types
      if (this.options.excludeTypes?.includes(cls.type)) {
        suggestions.push({
          type: "exclude",
          reason: `${cls.type} changes are configured to be excluded`,
          confidence: 0.9,
          region: {
            bounds: bounds.bounds,
          },
          currentClassification: cls.type,
        });
      }

      // Suggest CSS fixes for style/layout changes
      if (cls.type === DifferenceType.STYLE || cls.type === DifferenceType.LAYOUT) {
        const cssFixResult = this.cssFixSuggester.suggestFixes([cls]);
        if (cssFixResult.length > 0) {
          suggestions.push({
            type: "css-fix",
            reason: "CSS adjustment could resolve this difference",
            confidence: cssFixResult[0].fixes[0]?.confidence || 0.5,
            region: {
              bounds: bounds.bounds,
            },
            currentClassification: cls.type,
            cssfix: cssFixResult[0],
          });
        }
      }

      // Suggest reclassification for ambiguous types
      if (cls.type === DifferenceType.UNKNOWN && cls.confidence > 0.3) {
        suggestions.push({
          type: "reclassify",
          reason: "Unknown classification could be refined with manual input",
          confidence: 0.6,
          region: {
            bounds: bounds.bounds,
          },
          currentClassification: cls.type,
          suggestedClassification: this.suggestAlternativeClassification(cls, region),
        });
      }
    }

    // Look for patterns in suggestions
    const patterns = this.findPatterns(suggestions);
    suggestions.push(...patterns);

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Suggest alternative classification
   */
  private suggestAlternativeClassification(
    _classification: import("./classifiers/base").ClassificationResult,
    regionData: {
      region: {
        bounds: { x: number; y: number; width: number; height: number };
      };
    }
  ): string {
    // Simple heuristic based on region characteristics
    const { bounds } = regionData.region;
    const aspectRatio = bounds.width / bounds.height;

    if (aspectRatio > 3 || aspectRatio < 0.33) {
      return DifferenceType.LAYOUT;
    }

    if (bounds.width < 50 && bounds.height < 50) {
      return DifferenceType.STYLE;
    }

    return DifferenceType.CONTENT;
  }

  /**
   * Find patterns in suggestions
   */
  private findPatterns(suggestions: RefinementSuggestion[]): RefinementSuggestion[] {
    const patterns: RefinementSuggestion[] = [];

    // Group by region proximity
    const clusters = this.clusterRegions(
      suggestions
        .filter((s) => s.region)
        .map((s) => s.region?.bounds)
        .filter(
          (b): b is { x: number; y: number; width: number; height: number } => b !== undefined
        )
    );

    // If multiple regions are clustered, suggest a larger exclusion
    for (const cluster of clusters) {
      if (cluster.length >= 3) {
        const bounds = this.calculateBoundingBox(cluster);
        patterns.push({
          type: "exclude",
          reason: `${cluster.length} similar regions clustered together - likely a repeating UI element`,
          confidence: 0.8,
          region: { bounds },
        });
      }
    }

    return patterns;
  }

  /**
   * Cluster regions by proximity
   */
  private clusterRegions(
    regions: Array<{ x: number; y: number; width: number; height: number }>
  ): Array<Array<{ x: number; y: number; width: number; height: number }>> {
    const clusters: Array<Array<(typeof regions)[0]>> = [];
    const used = new Set<number>();

    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue;

      const cluster = [regions[i]];
      used.add(i);

      for (let j = i + 1; j < regions.length; j++) {
        if (used.has(j)) continue;

        if (this.areRegionsNear(regions[i], regions[j])) {
          cluster.push(regions[j]);
          used.add(j);
        }
      }

      clusters.push(cluster);
    }

    return clusters.filter((c) => c.length > 1);
  }

  /**
   * Check if two regions are near each other
   */
  private areRegionsNear(
    r1: { x: number; y: number; width: number; height: number },
    r2: { x: number; y: number; width: number; height: number },
    threshold: number = 50
  ): boolean {
    const centerX1 = r1.x + r1.width / 2;
    const centerY1 = r1.y + r1.height / 2;
    const centerX2 = r2.x + r2.width / 2;
    const centerY2 = r2.y + r2.height / 2;

    const distance = Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));

    return distance < threshold;
  }

  /**
   * Calculate bounding box for multiple regions
   */
  private calculateBoundingBox(
    regions: Array<{ x: number; y: number; width: number; height: number }>
  ): { x: number; y: number; width: number; height: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const r of regions) {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width);
      maxY = Math.max(maxY, r.y + r.height);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Create recommended exclusions from suggestions
   */
  private createRecommendedExclusions(
    suggestions: RefinementSuggestion[],
    existing?: ExclusionsConfig
  ): ExclusionsConfig {
    const exclusions: ExclusionRegion[] = existing?.regions || [];

    // Add high-confidence exclusion suggestions
    const excludeSuggestions = suggestions
      .filter((s) => s.type === "exclude" && s.confidence >= (this.options.minConfidence ?? 0.7))
      .filter((s) => s.region);

    for (const suggestion of excludeSuggestions) {
      const region = suggestion.region;
      if (!region) continue;

      // Check if region already exists
      const exists = exclusions.some((e) => this.areRegionsOverlapping(e.bounds, region.bounds));

      if (!exists) {
        exclusions.push({
          name: suggestion.reason.substring(0, 50),
          bounds: region.bounds,
          selector: region.selector,
          reason: suggestion.reason,
        });
      }
    }

    return {
      version: "1.0",
      regions: exclusions,
    };
  }

  /**
   * Check if regions overlap
   */
  private areRegionsOverlapping(
    r1: { x: number; y: number; width: number; height: number },
    r2: { x: number; y: number; width: number; height: number }
  ): boolean {
    return !(
      r1.x + r1.width <= r2.x ||
      r2.x + r2.width <= r1.x ||
      r1.y + r1.height <= r2.y ||
      r2.y + r2.height <= r1.y
    );
  }

  /**
   * Apply refinement iteration
   */
  async applyRefinement(
    _suggestions: RefinementSuggestion[],
    accepted: number[],
    rejected: number[]
  ): Promise<void> {
    this.session.iterations++;
    this.session.acceptedSuggestions += accepted.length;
    this.session.rejectedSuggestions += rejected.length;

    const action = `Applied ${accepted.length} suggestions, rejected ${rejected.length}`;

    this.session.history.push({
      iteration: this.session.iterations,
      action,
      result: {
        difference: this.session.currentDifference,
        regionsExcluded: this.session.excludedRegions,
      },
    });

    if (this.options.sessionPath) {
      await this.saveSession();
    }
  }

  /**
   * Save session to file
   */
  private async saveSession(): Promise<void> {
    if (!this.options.sessionPath) return;
    const sessionPath = path.join(this.options.sessionPath, `${this.session.id}.json`);
    await fs.writeFile(sessionPath, JSON.stringify(this.session, null, 2));
  }

  /**
   * Load session from file
   */
  async loadSession(sessionId: string): Promise<RefinementSession> {
    if (!this.options.sessionPath) {
      throw new Error("Session path not configured");
    }
    const sessionPath = path.join(this.options.sessionPath, `${sessionId}.json`);
    const data = await fs.readFile(sessionPath, "utf-8");
    this.session = JSON.parse(data) as RefinementSession;
    return this.session;
  }

  /**
   * Generate refinement report
   */
  generateReport(): string {
    const improvement =
      ((this.session.originalDifference - this.session.currentDifference) /
        this.session.originalDifference) *
      100;

    const lines = [
      "=== Progressive Refinement Report ===",
      "",
      `Session ID: ${this.session.id}`,
      `Started: ${new Date(this.session.timestamp).toLocaleString()}`,
      `Iterations: ${this.session.iterations}`,
      "",
      "Results:",
      `  Original difference: ${this.session.originalDifference.toFixed(2)}%`,
      `  Current difference: ${this.session.currentDifference.toFixed(2)}%`,
      `  Improvement: ${improvement.toFixed(1)}%`,
      "",
      "Statistics:",
      `  Regions excluded: ${this.session.excludedRegions}`,
      `  Suggestions accepted: ${this.session.acceptedSuggestions}`,
      `  Suggestions rejected: ${this.session.rejectedSuggestions}`,
      "",
      "History:",
    ];

    for (const entry of this.session.history) {
      lines.push(
        `  Iteration ${entry.iteration}: ${entry.action}`,
        `    Result: ${entry.result.difference.toFixed(2)}% difference, ${entry.result.regionsExcluded} excluded`
      );
    }

    return lines.join("\n");
  }
}
