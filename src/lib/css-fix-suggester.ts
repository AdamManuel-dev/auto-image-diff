/**
 * @fileoverview CSS fix suggestion engine for style differences
 * @lastmodified 2025-08-01T19:00:00Z
 *
 * Features: Analyzes style changes and suggests CSS fixes
 * Main APIs: CssFixSuggester class, suggestFixes()
 * Constraints: Requires classification data with style changes
 * Patterns: Heuristic-based CSS suggestions
 */

import { ClassificationResult } from "./classifiers/base";
import { DifferenceType } from "./classifiers/base";

export interface CssFix {
  selector?: string;
  property: string;
  oldValue?: string;
  newValue: string;
  confidence: number;
  reason: string;
}

export interface FixSuggestion {
  type: "color" | "spacing" | "sizing" | "position" | "display" | "typography" | "font" | "other";
  fixes: CssFix[];
  description: string;
  priority: "low" | "medium" | "high";
}

export class CssFixSuggester {
  /**
   * Suggest CSS fixes based on classification results
   */
  suggestFixes(
    classifications: ClassificationResult[],
    context?: {
      selector?: string;
      element?: string;
    }
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    // Group classifications by type
    const styleChanges = classifications.filter((c) => c.type === DifferenceType.STYLE);
    const layoutChanges = classifications.filter((c) => c.type === DifferenceType.LAYOUT);
    const sizeChanges = classifications.filter((c) => c.type === DifferenceType.SIZE);

    // Analyze style changes
    if (styleChanges.length > 0) {
      suggestions.push(...this.analyzeStyleChanges(styleChanges, context));
    }

    // Analyze layout changes
    if (layoutChanges.length > 0) {
      suggestions.push(...this.analyzeLayoutChanges(layoutChanges, context));
    }

    // Analyze size changes
    if (sizeChanges.length > 0) {
      suggestions.push(...this.analyzeSizeChanges(sizeChanges, context));
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Analyze style changes and suggest fixes
   */
  private analyzeStyleChanges(
    changes: ClassificationResult[],
    context?: { selector?: string; element?: string }
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    // Group by subType
    const colorChanges = changes.filter((c) => c.subType === "color");
    const spacingChanges = changes.filter((c) => c.subType === "spacing");
    const fontChanges = changes.filter((c) => c.subType === "font");

    // Analyze color changes
    if (colorChanges.length > 0) {
      const colorSuggestion = this.analyzeColorChanges(colorChanges, context);
      if (colorSuggestion) suggestions.push(colorSuggestion);
    }

    // Analyze spacing changes
    if (spacingChanges.length > 0) {
      const spacingSuggestion = this.analyzeStyleSpacingChanges(spacingChanges, context);
      if (spacingSuggestion) suggestions.push(spacingSuggestion);
    }

    // Analyze font changes
    if (fontChanges.length > 0) {
      const fontSuggestion = this.analyzeFontChanges(fontChanges, context);
      if (fontSuggestion) suggestions.push(fontSuggestion);
    }

    // Analyze border/shadow changes for other style changes
    const otherChanges = changes.filter(
      (c) => !c.subType || !["color", "spacing", "font"].includes(c.subType)
    );
    if (otherChanges.length > 0) {
      const borderSuggestion = this.analyzeBorderChanges(otherChanges, context);
      if (borderSuggestion) suggestions.push(borderSuggestion);
    }

    return suggestions;
  }

  /**
   * Analyze color changes
   */
  private analyzeColorChanges(
    changes: ClassificationResult[],
    context?: { selector?: string; element?: string }
  ): FixSuggestion | null {
    if (changes.length === 0) return null;

    const selector = context?.selector || `.${context?.element || "element"}`;

    return {
      type: "color",
      description: "Detected color changes in the element",
      priority: "high",
      fixes: [
        {
          selector,
          property: "color",
          newValue: "/* Update text color if needed */",
          confidence: 0.6,
          reason: "Text color may need adjustment",
        },
        {
          selector,
          property: "background-color",
          newValue: "/* Update to match new design */",
          confidence: 0.7,
          reason: "Background color appears to have changed",
        },
      ],
    };
  }

  /**
   * Analyze border and shadow changes
   */
  private analyzeBorderChanges(
    changes: ClassificationResult[],
    context?: { selector?: string; element?: string }
  ): FixSuggestion | null {
    const selector = context?.selector || `.${context?.element || "element"}`;

    // Simple heuristic: if changes have style type with high confidence
    const hasStyleChange = changes.some((c) => {
      return c.type === DifferenceType.STYLE && c.confidence > 0.6;
    });

    if (!hasStyleChange) return null;

    return {
      type: "other",
      description: "Detected border or shadow changes",
      priority: "low",
      fixes: [
        {
          selector,
          property: "border",
          newValue: "/* Adjust border style/width/color */",
          confidence: 0.5,
          reason: "Border styling appears to have changed",
        },
        {
          selector,
          property: "box-shadow",
          newValue: "/* Update shadow if applicable */",
          confidence: 0.4,
          reason: "Shadow effects may have changed",
        },
      ],
    };
  }

  /**
   * Analyze layout changes
   */
  private analyzeLayoutChanges(
    changes: ClassificationResult[],
    context?: { selector?: string; element?: string }
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];
    const selector = context?.selector || `.${context?.element || "element"}`;

    // Analyze position shifts
    const positionSuggestion = this.analyzePositionChanges(changes, selector);
    if (positionSuggestion) suggestions.push(positionSuggestion);

    // Analyze spacing changes
    const spacingSuggestion = this.analyzeSpacingChanges(changes, selector);
    if (spacingSuggestion) suggestions.push(spacingSuggestion);

    return suggestions;
  }

  /**
   * Analyze position changes
   */
  private analyzePositionChanges(
    changes: ClassificationResult[],
    selector: string
  ): FixSuggestion | null {
    // Check if all changes are shifted in same direction
    const avgShift = this.calculateAverageShift(changes);

    if (Math.abs(avgShift.x) < 5 && Math.abs(avgShift.y) < 5) return null;

    const fixes: CssFix[] = [];

    if (Math.abs(avgShift.x) >= 5) {
      fixes.push({
        selector,
        property: "margin-left",
        newValue: `${Math.abs(avgShift.x)}px`,
        confidence: 0.7,
        reason: `Element appears shifted ${Math.abs(avgShift.x)}px ${
          avgShift.x > 0 ? "right" : "left"
        }`,
      });
    }

    if (Math.abs(avgShift.y) >= 5) {
      fixes.push({
        selector,
        property: "margin-top",
        newValue: `${Math.abs(avgShift.y)}px`,
        confidence: 0.7,
        reason: `Element appears shifted ${Math.abs(avgShift.y)}px ${
          avgShift.y > 0 ? "down" : "up"
        }`,
      });
    }

    return {
      type: "position",
      description: "Element position has shifted",
      priority: "high",
      fixes,
    };
  }

  /**
   * Calculate average shift of regions
   */
  private calculateAverageShift(changes: ClassificationResult[]): { x: number; y: number } {
    // This is a simplified heuristic
    // In real implementation, would compare with original positions
    let totalX = 0;
    let totalY = 0;

    changes.forEach((change) => {
      const details = change.details as { shift?: { x?: number; y?: number } };
      if (details?.shift) {
        totalX += details.shift.x || 0;
        totalY += details.shift.y || 0;
      }
    });

    return {
      x: totalX / changes.length,
      y: totalY / changes.length,
    };
  }

  /**
   * Analyze spacing changes for style changes
   */
  private analyzeStyleSpacingChanges(
    changes: ClassificationResult[],
    context?: { selector?: string; element?: string }
  ): FixSuggestion | null {
    if (changes.length === 0) return null;

    const selector = context?.selector || `.${context?.element || "element"}`;

    return {
      type: "spacing",
      description: "Spacing around or within element has changed",
      priority: "medium",
      fixes: [
        {
          selector,
          property: "padding",
          newValue: "/* Adjust internal spacing */",
          confidence: 0.6,
          reason: "Internal spacing appears different",
        },
        {
          selector,
          property: "margin",
          newValue: "/* Adjust external spacing */",
          confidence: 0.5,
          reason: "External spacing may need adjustment",
        },
      ],
    };
  }

  /**
   * Analyze spacing changes for layout changes
   */
  private analyzeSpacingChanges(
    changes: ClassificationResult[],
    selector: string
  ): FixSuggestion | null {
    // Check if changes suggest padding/margin adjustments
    const hasSpacingIssue = changes.some((c) => {
      const details = c.details as { category?: string };
      return details?.category === "spacing";
    });

    if (!hasSpacingIssue) return null;

    return {
      type: "spacing",
      description: "Spacing around or within element has changed",
      priority: "medium",
      fixes: [
        {
          selector,
          property: "padding",
          newValue: "/* Adjust internal spacing */",
          confidence: 0.6,
          reason: "Internal spacing appears different",
        },
        {
          selector,
          property: "margin",
          newValue: "/* Adjust external spacing */",
          confidence: 0.5,
          reason: "External spacing may need adjustment",
        },
      ],
    };
  }

  /**
   * Analyze size changes
   */
  private analyzeSizeChanges(
    changes: ClassificationResult[],
    context?: { selector?: string; element?: string }
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];
    const selector = context?.selector || `.${context?.element || "element"}`;

    // Calculate size difference
    const sizeDiff = this.calculateSizeDifference(changes);

    if (Math.abs(sizeDiff.width) > 10 || Math.abs(sizeDiff.height) > 10) {
      const fixes: CssFix[] = [];

      if (Math.abs(sizeDiff.width) > 10) {
        fixes.push({
          selector,
          property: "width",
          newValue:
            sizeDiff.width > 0
              ? `calc(100% + ${sizeDiff.width}px)`
              : `calc(100% - ${Math.abs(sizeDiff.width)}px)`,
          confidence: 0.8,
          reason: `Width changed by ${sizeDiff.width}px`,
        });
      }

      if (Math.abs(sizeDiff.height) > 10) {
        fixes.push({
          selector,
          property: "height",
          newValue:
            sizeDiff.height > 0
              ? `calc(100% + ${sizeDiff.height}px)`
              : `calc(100% - ${Math.abs(sizeDiff.height)}px)`,
          confidence: 0.8,
          reason: `Height changed by ${sizeDiff.height}px`,
        });
      }

      suggestions.push({
        type: "sizing",
        description: "Element dimensions have changed",
        priority: "high",
        fixes,
      });
    }

    // Check for font size changes
    const fontSuggestion = this.analyzeFontSizeChanges(changes, selector);
    if (fontSuggestion) suggestions.push(fontSuggestion);

    return suggestions;
  }

  /**
   * Calculate size difference
   */
  private calculateSizeDifference(changes: ClassificationResult[]): {
    width: number;
    height: number;
  } {
    // Simplified calculation based on region bounds
    let maxWidth = 0;
    let maxHeight = 0;

    changes.forEach((change) => {
      const details = change.details as { sizeDiff?: { width?: number; height?: number } };
      if (details?.sizeDiff) {
        maxWidth = Math.max(maxWidth, details.sizeDiff.width || 0);
        maxHeight = Math.max(maxHeight, details.sizeDiff.height || 0);
      }
    });

    return { width: maxWidth, height: maxHeight };
  }

  /**
   * Analyze font size changes
   */
  private analyzeFontSizeChanges(
    changes: ClassificationResult[],
    selector: string
  ): FixSuggestion | null {
    const hasTextSizeChange = changes.some((c) => {
      const details = c.details as { category?: string };
      return details?.category === "text-size";
    });

    if (!hasTextSizeChange) return null;

    return {
      type: "typography",
      description: "Text size appears to have changed",
      priority: "medium",
      fixes: [
        {
          selector,
          property: "font-size",
          newValue: "/* Adjust to match new size */",
          confidence: 0.7,
          reason: "Font size appears different",
        },
        {
          selector,
          property: "line-height",
          newValue: "/* May need adjustment with font-size */",
          confidence: 0.5,
          reason: "Line height often needs adjustment with font size",
        },
      ],
    };
  }

  /**
   * Format suggestions as CSS
   */
  formatAsCss(suggestions: FixSuggestion[]): string {
    if (suggestions.length === 0) {
      return `/* Auto-generated CSS fixes */\n/* No fixes suggested */`;
    }

    const cssBlocks: string[] = [];
    cssBlocks.push("/* Auto-generated CSS fixes */");
    cssBlocks.push("");

    // Sort suggestions by priority
    const sortedSuggestions = [...suggestions].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Group by priority
    const byPriority = {
      high: sortedSuggestions.filter((s) => s.priority === "high"),
      medium: sortedSuggestions.filter((s) => s.priority === "medium"),
      low: sortedSuggestions.filter((s) => s.priority === "low"),
    };

    // Process each priority group
    ["high", "medium", "low"].forEach((priority) => {
      const prioritySuggestions = byPriority[priority as keyof typeof byPriority];
      if (prioritySuggestions.length === 0) return;

      cssBlocks.push(`/* ${priority.toUpperCase()} PRIORITY */`);

      // Group by selector within priority
      const bySelectorMap = new Map<string, { fix: CssFix; description: string }[]>();

      prioritySuggestions.forEach((suggestion) => {
        suggestion.fixes.forEach((fix) => {
          const key = fix.selector || "/* No selector specified */";
          if (!bySelectorMap.has(key)) {
            bySelectorMap.set(key, []);
          }
          const fixes = bySelectorMap.get(key);
          if (fixes) {
            fixes.push({ fix, description: suggestion.description });
          }
        });
      });

      // Generate CSS blocks for this priority
      bySelectorMap.forEach((fixData, selector) => {
        cssBlocks.push(`/* ${fixData[0].description} */`);

        const properties = fixData
          .map(({ fix }) => {
            const confidence = Math.round(fix.confidence * 100);
            return `  ${fix.property}: ${fix.newValue}; /* ${fix.reason} (confidence: ${confidence}%) */`;
          })
          .join("\n");

        cssBlocks.push(`${selector} {\n${properties}\n}`);
      });

      cssBlocks.push("");
    });

    return cssBlocks.join("\n").trim();
  }

  /**
   * Generate detailed report
   */
  generateReport(suggestions: FixSuggestion[]): string {
    if (suggestions.length === 0) {
      return "No CSS fixes suggested.";
    }

    const lines: string[] = [
      "=== CSS Fix Suggestions ===",
      "",
      `Total suggestions: ${suggestions.length}`,
      "",
    ];

    // Group by priority
    const byPriority = {
      high: suggestions.filter((s) => s.priority === "high"),
      medium: suggestions.filter((s) => s.priority === "medium"),
      low: suggestions.filter((s) => s.priority === "low"),
    };

    ["high", "medium", "low"].forEach((priority) => {
      const prioritySuggestions = byPriority[priority as keyof typeof byPriority];
      if (prioritySuggestions.length > 0) {
        lines.push(`${priority.toUpperCase()} Priority (${prioritySuggestions.length}):`);
        lines.push("-------------------");

        prioritySuggestions.forEach((suggestion) => {
          lines.push(`• ${suggestion.description}`);
          suggestion.fixes.forEach((fix) => {
            lines.push(
              `  - ${fix.property}: ${fix.newValue} (${Math.round(
                fix.confidence * 100
              )}% confidence)`
            );
          });
          lines.push("");
        });
      }
    });

    lines.push("CSS Output:");
    lines.push("-----------");
    lines.push(this.formatAsCss(suggestions));

    return lines.join("\n");
  }

  /**
   * Add font changes analysis
   */
  private analyzeFontChanges(
    changes: ClassificationResult[],
    context?: { selector?: string; element?: string }
  ): FixSuggestion | null {
    if (changes.length === 0) return null;

    const selector = context?.selector || `.${context?.element || "element"}`;

    return {
      type: "font",
      description: "Font styling has changed",
      priority: "medium",
      fixes: [
        {
          selector,
          property: "font-size",
          newValue: "/* Adjust to match new size */",
          confidence: 0.7,
          reason: "Font size appears different",
        },
        {
          selector,
          property: "line-height",
          newValue: "/* May need adjustment with font-size */",
          confidence: 0.5,
          reason: "Line height often needs adjustment with font size",
        },
      ],
    };
  }

  /**
   * Analyze color change classification (exposed for testing)
   * @internal Used by tests
   */
  public analyzeColorChange(classification: ClassificationResult): CssFix[] {
    const selector = ".element";
    const baseConfidence = classification.confidence;

    return [
      {
        selector,
        property: "color",
        newValue: "/* Update text color */",
        confidence: baseConfidence * 0.7,
        reason: "Text color appears to have changed",
      },
      {
        selector,
        property: "background-color",
        newValue: "/* Update background color */",
        confidence: baseConfidence * 0.6,
        reason: "Background color appears to have changed",
      },
      {
        selector,
        property: "box-shadow",
        newValue: "/* Update shadow color */",
        confidence: baseConfidence * 0.5,
        reason: "Shadow color may need adjustment",
      },
    ];
  }

  /**
   * Analyze position change classification (exposed for testing)
   * @internal Used by tests
   */
  public analyzePositionChange(classification: ClassificationResult): CssFix[] {
    const details = classification.details as { shift?: { x?: number; y?: number } };
    const shift = details?.shift;

    if (!shift || (Math.abs(shift.x || 0) < 5 && Math.abs(shift.y || 0) < 5)) {
      return [];
    }

    const fixes: CssFix[] = [];
    const selector = ".element";
    const baseConfidence = classification.confidence;

    if (shift.x && Math.abs(shift.x) >= 5) {
      fixes.push({
        selector,
        property: shift.x > 0 ? "margin-left" : "margin-right",
        newValue: `${Math.abs(shift.x)}px`,
        confidence: baseConfidence * 0.8,
        reason: `Element shifted ${Math.abs(shift.x)}px ${shift.x > 0 ? "right" : "left"}`,
      });
    }

    if (shift.y && Math.abs(shift.y) >= 5) {
      fixes.push({
        selector,
        property: shift.y > 0 ? "margin-top" : "margin-bottom",
        newValue: `${Math.abs(shift.y)}px`,
        confidence: baseConfidence * 0.8,
        reason: `Element shifted ${Math.abs(shift.y)}px ${shift.y > 0 ? "down" : "up"}`,
      });
    }

    return fixes;
  }
}
