/**
 * @fileoverview Tests for batch summary generator
 * @lastmodified 2025-08-01T23:40:00Z
 */

import { BatchSummaryGenerator, BatchSummaryData } from "../lib/batch-summary-generator";
import { BatchResult } from "../lib/batchProcessor";
import { DifferenceType } from "../lib/classifiers/base";

describe("BatchSummaryGenerator", () => {
  let generator: BatchSummaryGenerator;

  beforeEach(() => {
    generator = new BatchSummaryGenerator();
  });

  const createMockSummaryData = (): BatchSummaryData => ({
    metadata: {
      timestamp: "2025-01-01T12:00:00Z",
      version: "1.0",
      referenceDir: "/ref",
      targetDir: "/target",
      totalDuration: 60000,
    },
    overview: {
      totalFiles: 10,
      processed: 8,
      failed: 2,
      successRate: 80,
      averageProcessingTime: 7500,
    },
    comparison: {
      matchingImages: 3,
      differentImages: 5,
      matchRate: 37.5,
      totalPixelsDifferent: 50000,
      averageDifference: 12.5,
    },
    classification: {
      totalRegions: 10,
      byType: {
        [DifferenceType.CONTENT]: 5,
        [DifferenceType.STYLE]: 3,
        [DifferenceType.LAYOUT]: 2,
      } as any,
      avgConfidence: 0.85,
      topChanges: [
        {
          file: "test.png",
          type: DifferenceType.CONTENT,
          count: 3,
          confidence: 0.9,
        },
      ],
    },
    performance: {
      parallelEnabled: true,
      workersUsed: 4,
      totalDuration: 60000,
      averagePerImage: 7500,
      throughput: 0.133,
    },
    failures: [
      {
        reference: "ref1.png",
        target: "target1.png",
        error: "File not found",
      },
    ],
  });

  describe("generateSummary", () => {
    const createMockBatchResult = (): BatchResult => ({
      totalFiles: 10,
      processed: 8,
      failed: 2,
      summary: {
        matchingImages: 3,
        differentImages: 5,
        totalPixelsDifferent: 50000,
        averageDifference: 12.5,
      },
      results: [
        {
          reference: "/path/to/ref1.png",
          target: "/path/to/target1.png",
          result: {
            difference: 0,
            isEqual: true,
            statistics: {
              pixelsDifferent: 0,
              totalPixels: 10000,
              percentageDifferent: 0,
            },
          },
        },
        {
          reference: "/path/to/ref2.png",
          target: "/path/to/target2.png",
          result: {
            difference: 25.5,
            isEqual: false,
            statistics: {
              pixelsDifferent: 2550,
              totalPixels: 10000,
              percentageDifferent: 25.5,
            },
            classification: {
              totalRegions: 3,
              classifiedRegions: 3,
              unclassifiedRegions: 0,
              byType: {
                [DifferenceType.CONTENT]: 2,
                [DifferenceType.STYLE]: 1,
              } as any,
              confidence: { min: 0.7, avg: 0.85, max: 0.95 },
              regions: [
                {
                  region: {
                    id: 1,
                    bounds: { x: 0, y: 0, width: 100, height: 100 },
                    pixelCount: 10000,
                    differencePixels: 1000,
                    differencePercentage: 10,
                  },
                  classification: {
                    type: DifferenceType.CONTENT,
                    confidence: 0.9,
                  },
                  classifier: "text",
                },
                {
                  region: {
                    id: 2,
                    bounds: { x: 100, y: 100, width: 50, height: 50 },
                    pixelCount: 2500,
                    differencePixels: 500,
                    differencePercentage: 20,
                  },
                  classification: {
                    type: DifferenceType.CONTENT,
                    confidence: 0.85,
                  },
                  classifier: "text",
                },
                {
                  region: {
                    id: 3,
                    bounds: { x: 200, y: 200, width: 80, height: 80 },
                    pixelCount: 6400,
                    differencePixels: 1050,
                    differencePercentage: 16.4,
                  },
                  classification: {
                    type: DifferenceType.STYLE,
                    confidence: 0.8,
                  },
                  classifier: "color",
                },
              ],
            },
          },
        },
        {
          reference: "/path/to/ref3.png",
          target: "/path/to/target3.png",
          error: "File not found",
        },
      ],
    });

    it("should generate basic summary data", () => {
      const batchResult = createMockBatchResult();
      const summary = generator.generateSummary(batchResult);

      expect(summary.metadata.version).toBe("1.0");
      expect(summary.metadata.timestamp).toBeDefined();

      expect(summary.overview.totalFiles).toBe(10);
      expect(summary.overview.processed).toBe(8);
      expect(summary.overview.failed).toBe(2);
      expect(summary.overview.successRate).toBe(80);

      expect(summary.comparison.matchingImages).toBe(3);
      expect(summary.comparison.differentImages).toBe(5);
      expect(summary.comparison.matchRate).toBe(37.5);
      expect(summary.comparison.averageDifference).toBe(12.5);
    });

    it("should include additional data when provided", () => {
      const batchResult = createMockBatchResult();
      const startTime = new Date("2025-01-01T12:00:00Z");
      const endTime = new Date("2025-01-01T12:05:00Z");

      const summary = generator.generateSummary(batchResult, {
        referenceDir: "/ref/dir",
        targetDir: "/target/dir",
        startTime,
        endTime,
        parallelConfig: { enabled: true, workers: 4 },
      });

      expect(summary.metadata.referenceDir).toBe("/ref/dir");
      expect(summary.metadata.targetDir).toBe("/target/dir");
      expect(summary.metadata.totalDuration).toBe(300000); // 5 minutes

      expect(summary.performance).toBeDefined();
      expect(summary.performance?.parallelEnabled).toBe(true);
      expect(summary.performance?.workersUsed).toBe(4);
      expect(summary.performance?.totalDuration).toBe(300000);
      expect(summary.performance?.averagePerImage).toBe(37500); // 300000 / 8
      expect(summary.performance?.throughput).toBeCloseTo(0.0267); // 8 / 300 seconds
    });

    it("should aggregate classification data", () => {
      const batchResult = createMockBatchResult();
      const summary = generator.generateSummary(batchResult);

      expect(summary.classification).toBeDefined();
      expect(summary.classification?.totalRegions).toBe(3);
      expect(summary.classification?.byType[DifferenceType.CONTENT]).toBe(2);
      expect(summary.classification?.byType[DifferenceType.STYLE]).toBe(1);
      expect(summary.classification?.avgConfidence).toBeCloseTo(0.85);

      expect(summary.classification?.topChanges).toHaveLength(2);
      expect(summary.classification?.topChanges[0].file).toBe("ref2.png");
      expect(summary.classification?.topChanges[0].type).toBe(DifferenceType.CONTENT);
      expect(summary.classification?.topChanges[0].count).toBe(2);
    });

    it("should handle results without classification", () => {
      const batchResult: BatchResult = {
        totalFiles: 2,
        processed: 2,
        failed: 0,
        summary: {
          matchingImages: 2,
          differentImages: 0,
          totalPixelsDifferent: 0,
          averageDifference: 0,
        },
        results: [
          {
            reference: "a.png",
            target: "b.png",
            result: {
              difference: 0,
              isEqual: true,
              statistics: {
                pixelsDifferent: 0,
                totalPixels: 10000,
                percentageDifferent: 0,
              },
            },
          },
        ],
      };

      const summary = generator.generateSummary(batchResult);
      expect(summary.classification).toBeUndefined();
    });

    it("should collect failure information", () => {
      const batchResult = createMockBatchResult();
      const summary = generator.generateSummary(batchResult);

      expect(summary.failures).toHaveLength(1);
      expect(summary.failures[0].reference).toBe("/path/to/ref3.png");
      expect(summary.failures[0].error).toBe("File not found");
    });
  });

  describe("generateHtmlReport", () => {
    it("should generate complete HTML report", () => {
      const summaryData = createMockSummaryData();
      const html = generator.generateHtmlReport(summaryData);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<title>Batch Processing Summary</title>");
      expect(html).toContain("Total Files");
      expect(html).toContain("10");
      expect(html).toContain("Success Rate");
      expect(html).toContain("80.0%");
    });

    it("should include charts when enabled", () => {
      const generator = new BatchSummaryGenerator({ includeCharts: true });
      const summaryData = createMockSummaryData();
      const html = generator.generateHtmlReport(summaryData);

      expect(html).toContain('<canvas id="comparisonChart"></canvas>');
      expect(html).toContain('<canvas id="classificationChart"></canvas>');
      expect(html).toContain("chart.js");
      expect(html).toContain("new Chart");
    });

    it("should exclude charts when disabled", () => {
      const generator = new BatchSummaryGenerator({ includeCharts: false });
      const summaryData = createMockSummaryData();
      const html = generator.generateHtmlReport(summaryData);

      expect(html).not.toContain("<canvas");
      expect(html).not.toContain("chart.js");
    });

    it("should respect theme option", () => {
      const generator = new BatchSummaryGenerator({ theme: "dark" });
      const summaryData = createMockSummaryData();
      const html = generator.generateHtmlReport(summaryData);

      expect(html).toContain('data-theme="dark"');
    });

    it("should include performance section when available", () => {
      const summaryData = createMockSummaryData();
      const html = generator.generateHtmlReport(summaryData);

      expect(html).toContain("Performance Metrics");
      expect(html).toContain("Parallel");
      expect(html).toContain("Workers Used");
      expect(html).toContain("4");
      expect(html).toContain("Throughput");
      expect(html).toContain("0.13 img/s");
    });

    it("should include failures when present", () => {
      const generator = new BatchSummaryGenerator({ includeDetails: true });
      const summaryData = createMockSummaryData();
      const html = generator.generateHtmlReport(summaryData);

      expect(html).toContain("Failed Comparisons");
      expect(html).toContain("ref1.png");
      expect(html).toContain("File not found");
    });

    it("should exclude failures when includeDetails is false", () => {
      const generator = new BatchSummaryGenerator({ includeDetails: false });
      const summaryData = createMockSummaryData();
      const html = generator.generateHtmlReport(summaryData);

      expect(html).not.toContain("Failed Comparisons");
    });
  });

  describe("formatDuration", () => {
    it("should format durations correctly", () => {
      const generator = new BatchSummaryGenerator();

      // Access private method
      const formatDuration = (generator as any).formatDuration.bind(generator);

      expect(formatDuration(500)).toBe("500ms");
      expect(formatDuration(1500)).toBe("1.5s");
      expect(formatDuration(65000)).toBe("1m 5s");
      expect(formatDuration(125000)).toBe("2m 5s");
    });
  });

  describe("custom options", () => {
    it("should use custom title", () => {
      const generator = new BatchSummaryGenerator({ title: "My Custom Report" });
      const summaryData = createMockSummaryData();
      const html = generator.generateHtmlReport(summaryData);

      expect(html).toContain("<title>My Custom Report</title>");
      expect(html).toContain("<h1>My Custom Report</h1>");
    });

    it("should handle minimal summary data", () => {
      const minimalData: BatchSummaryData = {
        metadata: {
          timestamp: "2025-01-01T12:00:00Z",
          version: "1.0",
          referenceDir: "",
          targetDir: "",
        },
        overview: {
          totalFiles: 0,
          processed: 0,
          failed: 0,
          successRate: 0,
        },
        comparison: {
          matchingImages: 0,
          differentImages: 0,
          matchRate: 0,
          totalPixelsDifferent: 0,
          averageDifference: 0,
        },
        failures: [],
      };

      const html = generator.generateHtmlReport(minimalData);
      expect(html).toBeDefined();
      expect(html).toContain("0");
    });
  });
});
