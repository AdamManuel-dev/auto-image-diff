/**
 * @fileoverview Tests for CSS fix suggester
 * @lastmodified 2025-08-01T23:30:00Z
 */

import { CssFixSuggester, FixSuggestion, CssFix } from "../lib/css-fix-suggester";
import { DifferenceType, ClassificationResult } from "../lib/classifiers/base";

describe("CssFixSuggester", () => {
  let suggester: CssFixSuggester;

  beforeEach(() => {
    suggester = new CssFixSuggester();
  });

  describe("suggestFixes", () => {
    it("should suggest fixes for style changes", () => {
      const classifications: ClassificationResult[] = [
        {
          type: DifferenceType.STYLE,
          confidence: 0.9,
          subType: "color",
          details: { colorVariance: 0.3 },
        },
      ];

      const fixes = suggester.suggestFixes(classifications);

      expect(fixes).toHaveLength(1);
      expect(fixes[0].type).toBe("color");
      expect(fixes[0].priority).toBe("high");
      expect(fixes[0].fixes.some((f) => f.property === "color")).toBe(true);
    });

    it("should suggest fixes for layout changes", () => {
      const classifications: ClassificationResult[] = [
        {
          type: DifferenceType.LAYOUT,
          confidence: 0.85,
          subType: "position",
          details: { shift: { x: 10, y: 5 } },
        },
      ];

      const fixes = suggester.suggestFixes(classifications, { selector: ".my-element" });

      expect(fixes).toHaveLength(1);
      expect(fixes[0].type).toBe("position");
      expect(fixes[0].fixes.some((f) => f.property === "margin-left")).toBe(true);
      expect(fixes[0].fixes.some((f) => f.property === "margin-top")).toBe(true);
    });

    it("should return empty array for non-style/layout changes", () => {
      const classifications: ClassificationResult[] = [
        {
          type: DifferenceType.CONTENT,
          confidence: 0.95,
        },
        {
          type: DifferenceType.STRUCTURAL,
          confidence: 0.9,
        },
      ];

      const fixes = suggester.suggestFixes(classifications);

      expect(fixes).toHaveLength(0);
    });

    it("should handle multiple style subtypes", () => {
      const classifications: ClassificationResult[] = [
        {
          type: DifferenceType.STYLE,
          confidence: 0.9,
          subType: "color",
        },
        {
          type: DifferenceType.STYLE,
          confidence: 0.85,
          subType: "spacing",
          details: { dimensionChange: { width: 10, height: 5 } },
        },
        {
          type: DifferenceType.STYLE,
          confidence: 0.8,
          subType: "font",
          details: { sizeChange: 2 },
        },
      ];

      const fixes = suggester.suggestFixes(classifications);

      expect(fixes).toHaveLength(3);
      expect(fixes.map((f) => f.type)).toContain("color");
      expect(fixes.map((f) => f.type)).toContain("spacing");
      expect(fixes.map((f) => f.type)).toContain("font");
    });

    it("should use provided context for selectors", () => {
      const classifications: ClassificationResult[] = [
        {
          type: DifferenceType.STYLE,
          confidence: 0.9,
          subType: "color",
        },
      ];

      const fixes = suggester.suggestFixes(classifications, {
        selector: "#custom-id",
        element: "button",
      });

      expect(fixes[0].fixes[0].selector).toBe("#custom-id");
    });

    it("should fall back to element-based selector", () => {
      const classifications: ClassificationResult[] = [
        {
          type: DifferenceType.STYLE,
          confidence: 0.9,
          subType: "color",
        },
      ];

      const fixes = suggester.suggestFixes(classifications, { element: "button" });

      expect(fixes[0].fixes[0].selector).toBe(".button");
    });
  });

  describe("formatAsCss", () => {
    it("should format single suggestion as CSS", () => {
      const suggestions: FixSuggestion[] = [
        {
          type: "color",
          description: "Color change detected",
          priority: "high",
          fixes: [
            {
              selector: ".my-class",
              property: "color",
              newValue: "#333333",
              confidence: 0.8,
              reason: "Text color changed",
            },
            {
              selector: ".my-class",
              property: "background-color",
              newValue: "#ffffff",
              confidence: 0.7,
              reason: "Background color changed",
            },
          ],
        },
      ];

      const css = suggester.formatAsCss(suggestions);

      expect(css).toContain("/* Color change detected */");
      expect(css).toContain(".my-class {");
      expect(css).toContain("color: #333333;");
      expect(css).toContain("background-color: #ffffff;");
      expect(css).toContain("/* Text color changed (confidence: 80%) */");
    });

    it("should group fixes by selector", () => {
      const suggestions: FixSuggestion[] = [
        {
          type: "spacing",
          description: "Multiple changes",
          priority: "medium",
          fixes: [
            {
              selector: ".button",
              property: "padding",
              newValue: "10px 20px",
              confidence: 0.9,
              reason: "Padding adjusted",
            },
            {
              selector: ".button",
              property: "margin",
              newValue: "5px",
              confidence: 0.8,
              reason: "Margin adjusted",
            },
            {
              selector: ".container",
              property: "width",
              newValue: "100%",
              confidence: 0.85,
              reason: "Width changed",
            },
          ],
        },
      ];

      const css = suggester.formatAsCss(suggestions);

      expect(css).toContain(".button {");
      expect(css).toContain("padding: 10px 20px;");
      expect(css).toContain("margin: 5px;");
      expect(css).toContain(".container {");
      expect(css).toContain("width: 100%;");

      // Check that .button appears only once
      const buttonMatches = css.match(/\.button \{/g);
      expect(buttonMatches?.length).toBe(1);
    });

    it("should add priority comments", () => {
      const suggestions: FixSuggestion[] = [
        {
          type: "color",
          description: "High priority fix",
          priority: "high",
          fixes: [
            {
              selector: ".high",
              property: "display",
              newValue: "block",
              confidence: 0.95,
              reason: "Display changed",
            },
          ],
        },
        {
          type: "other",
          description: "Low priority fix",
          priority: "low",
          fixes: [
            {
              selector: ".low",
              property: "opacity",
              newValue: "0.8",
              confidence: 0.6,
              reason: "Opacity changed",
            },
          ],
        },
      ];

      const css = suggester.formatAsCss(suggestions);

      expect(css).toContain("/* HIGH PRIORITY */");
      expect(css).toContain("/* LOW PRIORITY */");
    });

    it("should handle empty suggestions", () => {
      const css = suggester.formatAsCss([]);

      expect(css).toContain("/* Auto-generated CSS fixes */");
      expect(css).toContain("/* No fixes suggested */");
    });

    it("should format multiple suggestions with different priorities", () => {
      const suggestions: FixSuggestion[] = [
        {
          type: "color",
          description: "Critical color fix",
          priority: "high",
          fixes: [
            {
              selector: ".critical",
              property: "color",
              newValue: "red",
              confidence: 0.95,
              reason: "Critical color",
            },
          ],
        },
        {
          type: "spacing",
          description: "Medium spacing fix",
          priority: "medium",
          fixes: [
            {
              selector: ".spacing",
              property: "margin",
              newValue: "10px",
              confidence: 0.8,
              reason: "Spacing adjustment",
            },
          ],
        },
        {
          type: "other",
          description: "Low priority fix",
          priority: "low",
          fixes: [
            {
              selector: ".other",
              property: "border-radius",
              newValue: "4px",
              confidence: 0.6,
              reason: "Minor adjustment",
            },
          ],
        },
      ];

      const css = suggester.formatAsCss(suggestions);

      // Check order: high -> medium -> low
      const highIndex = css.indexOf("/* HIGH PRIORITY */");
      const mediumIndex = css.indexOf("/* MEDIUM PRIORITY */");
      const lowIndex = css.indexOf("/* LOW PRIORITY */");

      expect(highIndex).toBeLessThan(mediumIndex);
      expect(mediumIndex).toBeLessThan(lowIndex);
    });
  });

  describe("analyzeColorChange", () => {
    it("should generate color fixes with appropriate confidence", () => {
      const classification: ClassificationResult = {
        type: DifferenceType.STYLE,
        confidence: 0.9,
        subType: "color",
        details: { colorVariance: 0.2 },
      };

      // Access private method through type assertion
      const fixes = (suggester as any).analyzeColorChange(classification);

      expect(fixes).toHaveLength(3);
      expect(fixes[0].property).toBe("color");
      expect(fixes[0].confidence).toBeCloseTo(0.63); // 0.9 * 0.7
      expect(fixes[1].property).toBe("background-color");
      expect(fixes[2].property).toBe("box-shadow");
    });
  });

  describe("analyzePositionChange", () => {
    it("should generate position fixes based on shift direction", () => {
      const classification: ClassificationResult = {
        type: DifferenceType.LAYOUT,
        confidence: 0.85,
        subType: "position",
        details: { shift: { x: -15, y: 20 } },
      };

      // Access private method through type assertion
      const fixes = (suggester as any).analyzePositionChange(classification);

      expect(fixes).toHaveLength(2);
      expect(fixes.find((f: CssFix) => f.property === "margin-right")).toBeDefined();
      expect(fixes.find((f: CssFix) => f.property === "margin-right")?.newValue).toBe("15px");
      expect(fixes.find((f: CssFix) => f.property === "margin-top")).toBeDefined();
      expect(fixes.find((f: CssFix) => f.property === "margin-top")?.newValue).toBe("20px");
    });

    it("should not generate fixes for small shifts", () => {
      const classification: ClassificationResult = {
        type: DifferenceType.LAYOUT,
        confidence: 0.85,
        subType: "position",
        details: { shift: { x: 2, y: -3 } },
      };

      // Access private method through type assertion
      const fixes = (suggester as any).analyzePositionChange(classification);

      expect(fixes).toHaveLength(0);
    });
  });
});