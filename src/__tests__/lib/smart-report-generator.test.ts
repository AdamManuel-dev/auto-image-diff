/**
 * @fileoverview Tests for smart HTML report generator
 * @lastmodified 2025-08-01T18:10:00Z
 */

import { SmartReportGenerator, SmartReportData } from "../../lib/smart-report-generator";
import { DifferenceType } from "../../lib/classifiers/base";

describe("SmartReportGenerator", () => {
  let generator: SmartReportGenerator;
  let mockData: SmartReportData;

  beforeEach(() => {
    generator = new SmartReportGenerator();
    mockData = {
      metadata: {
        image1: "/path/to/image1.png",
        image2: "/path/to/image2.png",
        diffImage: "/path/to/diff.png",
        timestamp: "2024-01-01T12:00:00Z",
        version: "1.0",
      },
      statistics: {
        pixelsDifferent: 1000,
        totalPixels: 100000,
        percentageDifferent: 1.0,
      },
      classification: {
        totalRegions: 3,
        classifiedRegions: 2,
        unclassifiedRegions: 1,
        byType: {
          [DifferenceType.CONTENT]: 1,
          [DifferenceType.STYLE]: 1,
          [DifferenceType.LAYOUT]: 0,
          [DifferenceType.SIZE]: 0,
          [DifferenceType.STRUCTURAL]: 0,
          [DifferenceType.NEW_ELEMENT]: 0,
          [DifferenceType.REMOVED_ELEMENT]: 0,
          [DifferenceType.UNKNOWN]: 1,
        },
        regions: [],
        confidence: {
          min: 0.6,
          max: 0.9,
          avg: 0.75,
        },
      },
      regions: [
        {
          id: 1,
          bounds: { x: 10, y: 20, width: 100, height: 50 },
          type: "content",
          confidence: 0.9,
          classifier: "ContentClassifier",
          details: { subType: "text" },
        },
        {
          id: 2,
          bounds: { x: 200, y: 100, width: 150, height: 80 },
          type: "style",
          confidence: 0.6,
          classifier: "StyleClassifier",
          details: { subType: "color" },
        },
      ],
    };
  });

  describe("generateSmartReport", () => {
    it("should generate a complete HTML report", () => {
      const html = generator.generateSmartReport(mockData, "/output");
      
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<title>Smart Image Diff Report</title>");
      expect(html).toContain("1.00%"); // percentageDifferent
      expect(html).toContain("1,000"); // pixelsDifferent
      expect(html).toContain("75%"); // average confidence
    });

    it("should include classification section when classification data exists", () => {
      const html = generator.generateSmartReport(mockData, "/output");
      
      expect(html).toContain("Classification Analysis");
      expect(html).toContain("type-content");
      expect(html).toContain("type-style");
      expect(html).toContain("content: 1");
      expect(html).toContain("style: 1");
    });

    it("should include regions table when regions exist", () => {
      const html = generator.generateSmartReport(mockData, "/output");
      
      expect(html).toContain("Detected Regions");
      expect(html).toContain("#1");
      expect(html).toContain("#2");
      expect(html).toContain("ContentClassifier");
      expect(html).toContain("StyleClassifier");
      expect(html).toContain("90%"); // confidence
      expect(html).toContain("60%"); // confidence
    });

    it("should handle missing classification data", () => {
      const dataWithoutClassification = {
        ...mockData,
        classification: undefined,
        regions: undefined,
      };
      
      const html = generator.generateSmartReport(dataWithoutClassification, "/output");
      
      expect(html).not.toContain("Classification Analysis");
      expect(html).not.toContain("Detected Regions");
      expect(html).not.toContain("Recommendations");
    });

    it("should include recommendations based on classification", () => {
      const html = generator.generateSmartReport(mockData, "/output");
      
      expect(html).toContain("Recommendations");
      expect(html).toContain("Content changes detected");
    });
  });

  describe("custom options", () => {
    it("should use custom title", () => {
      generator = new SmartReportGenerator({ title: "Custom Report Title" });
      const html = generator.generateSmartReport(mockData, "/output");
      
      expect(html).toContain("<title>Custom Report Title</title>");
      expect(html).toContain("<h1>Custom Report Title</h1>");
    });

    it("should apply dark theme", () => {
      generator = new SmartReportGenerator({ theme: "dark" });
      const html = generator.generateSmartReport(mockData, "/output");
      
      expect(html).toContain('data-theme="dark"');
    });

    it("should exclude images when includeImages is false", () => {
      generator = new SmartReportGenerator({ includeImages: false });
      const html = generator.generateSmartReport(mockData, "/output");
      
      expect(html).not.toContain("Visual Comparison");
      expect(html).not.toContain('<img');
    });

    it("should hide confidence details when showConfidenceDetails is false", () => {
      generator = new SmartReportGenerator({ showConfidenceDetails: false });
      const html = generator.generateSmartReport(mockData, "/output");
      
      expect(html).not.toContain("Confidence Distribution");
      expect(html).not.toContain("Min:");
      expect(html).not.toContain("Avg:");
    });
  });

  describe("recommendations", () => {
    it("should generate appropriate recommendations for each type", () => {
      const testCases = [
        { type: DifferenceType.CONTENT, expected: "Content changes detected" },
        { type: DifferenceType.STYLE, expected: "Style changes detected" },
        { type: DifferenceType.LAYOUT, expected: "Layout shifts detected" },
        { type: DifferenceType.SIZE, expected: "Size changes detected" },
        { type: DifferenceType.STRUCTURAL, expected: "Structural changes detected" },
        { type: DifferenceType.NEW_ELEMENT, expected: "New elements detected" },
        { type: DifferenceType.REMOVED_ELEMENT, expected: "Elements removed" },
      ];

      testCases.forEach(({ type, expected }) => {
        const data = {
          ...mockData,
          classification: {
            ...mockData.classification!,
            byType: {
              ...Object.fromEntries(
                Object.values(DifferenceType).map(t => [t, 0])
              ),
              [type]: 1,
            } as Record<DifferenceType, number>,
          },
        };

        const html = generator.generateSmartReport(data, "/output");
        expect(html).toContain(expected);
      });
    });

    it("should recommend manual review for low confidence", () => {
      const data = {
        ...mockData,
        classification: {
          ...mockData.classification!,
          confidence: {
            min: 0.1,
            max: 0.4,
            avg: 0.25,
          },
        },
      };

      const html = generator.generateSmartReport(data, "/output");
      expect(html).toContain("Low confidence in classification");
    });
  });

  describe("HTML structure", () => {
    it("should generate valid HTML structure", () => {
      const html = generator.generateSmartReport(mockData, "/output");
      
      // Check for proper HTML elements
      expect(html).toMatch(/<html[^>]*>/);
      expect(html).toMatch(/<\/html>/);
      expect(html).toMatch(/<head>/);
      expect(html).toMatch(/<\/head>/);
      expect(html).toMatch(/<body>/);
      expect(html).toMatch(/<\/body>/);
      
      // Check for required meta tags
      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain('<meta name="viewport"');
    });

    it("should include CSS styles", () => {
      const html = generator.generateSmartReport(mockData, "/output");
      
      expect(html).toContain("<style>");
      expect(html).toContain("</style>");
      expect(html).toContain(":root");
      expect(html).toContain(".container");
      expect(html).toContain(".stat-card");
    });

    it("should include JavaScript for interactivity", () => {
      const html = generator.generateSmartReport(mockData, "/output");
      
      expect(html).toContain("<script>");
      expect(html).toContain("</script>");
      expect(html).toContain("DOMContentLoaded");
    });
  });
});