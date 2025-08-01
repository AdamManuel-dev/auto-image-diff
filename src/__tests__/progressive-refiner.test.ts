/**
 * @fileoverview Tests for progressive refiner
 * @lastmodified 2025-08-01T23:20:00Z
 */

import { ProgressiveRefiner, RefinementSuggestion } from "../lib/progressive-refiner";
import { ComparisonResult } from "../lib/imageProcessor";
import { DifferenceType } from "../lib/classifiers/base";
import * as fs from "fs/promises";

jest.mock("fs/promises");

describe("ProgressiveRefiner", () => {
  let refiner: ProgressiveRefiner;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    refiner = new ProgressiveRefiner({
      minConfidence: 0.7,
      excludeTypes: [DifferenceType.STYLE],
      targetDifferenceThreshold: 0.5,
    });
  });

  describe("startRefinement", () => {
    const createMockResult = (): ComparisonResult => ({
      difference: 5.0,
      isEqual: false,
      statistics: {
        pixelsDifferent: 500,
        totalPixels: 10000,
        percentageDifferent: 5.0,
      },
      classification: {
        totalRegions: 5,
        classifiedRegions: 5,
        unclassifiedRegions: 0,
        byType: {
          [DifferenceType.CONTENT]: 2,
          [DifferenceType.STYLE]: 2,
          [DifferenceType.LAYOUT]: 1,
        } as any,
        confidence: { min: 0.5, avg: 0.75, max: 0.95 },
        regions: [
          {
            region: {
              id: 1,
              bounds: { x: 10, y: 10, width: 50, height: 50 },
              pixelCount: 2500,
              differencePixels: 100,
              differencePercentage: 4.0,
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
              bounds: { x: 100, y: 100, width: 30, height: 30 },
              pixelCount: 900,
              differencePixels: 50,
              differencePercentage: 5.5,
            },
            classification: {
              type: DifferenceType.STYLE,
              confidence: 0.8,
            },
            classifier: "color",
          },
          {
            region: {
              id: 3,
              bounds: { x: 200, y: 200, width: 40, height: 40 },
              pixelCount: 1600,
              differencePixels: 80,
              differencePercentage: 5.0,
            },
            classification: {
              type: DifferenceType.UNKNOWN,
              confidence: 0.4,
            },
            classifier: "unknown",
          },
        ],
      },
    });

    it("should generate suggestions for low confidence regions", async () => {
      const result = createMockResult();
      const { suggestions } = await refiner.startRefinement(result);

      const lowConfidenceSuggestions = suggestions.filter(
        (s) => s.type === "exclude" && s.reason.includes("Low confidence")
      );

      expect(lowConfidenceSuggestions.length).toBeGreaterThan(0);
      expect(lowConfidenceSuggestions[0].confidence).toBeGreaterThan(0.5);
    });

    it("should suggest exclusions for configured types", async () => {
      const result = createMockResult();
      const { suggestions } = await refiner.startRefinement(result);

      const styleExclusions = suggestions.filter(
        (s) => s.type === "exclude" && s.currentClassification === DifferenceType.STYLE
      );

      expect(styleExclusions.length).toBe(1);
      expect(styleExclusions[0].reason).toContain("style changes are configured to be excluded");
    });

    it("should suggest CSS fixes for style changes", async () => {
      const result = createMockResult();
      const { suggestions } = await refiner.startRefinement(result);

      const cssSuggestions = suggestions.filter((s) => s.type === "css-fix");

      expect(cssSuggestions.length).toBeGreaterThan(0);
      expect(cssSuggestions[0].cssfix).toBeDefined();
    });

    it("should suggest reclassification for unknown types", async () => {
      const result = createMockResult();
      const { suggestions } = await refiner.startRefinement(result);

      const reclassifySuggestions = suggestions.filter((s) => s.type === "reclassify");

      expect(reclassifySuggestions.length).toBe(1);
      expect(reclassifySuggestions[0].currentClassification).toBe(DifferenceType.UNKNOWN);
      expect(reclassifySuggestions[0].suggestedClassification).toBeDefined();
    });

    it("should create recommended exclusions from high-confidence suggestions", async () => {
      const result = createMockResult();
      const { recommendedExclusions } = await refiner.startRefinement(result);

      expect(recommendedExclusions.version).toBe("1.0");
      expect(recommendedExclusions.regions.length).toBeGreaterThan(0);

      const firstExclusion = recommendedExclusions.regions[0];
      expect(firstExclusion.name).toBeDefined();
      expect(firstExclusion.bounds).toBeDefined();
    });

    it("should save session when path is provided", async () => {
      const refinerWithSession = new ProgressiveRefiner({
        sessionPath: "/tmp/sessions",
      });

      mockFs.writeFile.mockResolvedValue(undefined);

      const result = createMockResult();
      await refinerWithSession.startRefinement(result);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("/tmp/sessions/refine-"),
        expect.stringContaining('"originalDifference":5')
      );
    });

    it("should handle missing classification gracefully", async () => {
      const result: ComparisonResult = {
        difference: 5.0,
        isEqual: false,
        statistics: {
          pixelsDifferent: 500,
          totalPixels: 10000,
          percentageDifferent: 5.0,
        },
      };

      await expect(refiner.startRefinement(result)).rejects.toThrow(
        "Classification data required for progressive refinement"
      );
    });
  });

  describe("applyRefinement", () => {
    it("should update session statistics", async () => {
      const suggestions: RefinementSuggestion[] = [
        { type: "exclude", reason: "Test", confidence: 0.9 },
        { type: "exclude", reason: "Test2", confidence: 0.8 },
      ];

      await refiner.applyRefinement(suggestions, [0], [1]);

      const session = (refiner as any).session;
      expect(session.iterations).toBe(1);
      expect(session.acceptedSuggestions).toBe(1);
      expect(session.rejectedSuggestions).toBe(1);
      expect(session.history).toHaveLength(1);
    });

    it("should save session when path is provided", async () => {
      const refinerWithSession = new ProgressiveRefiner({
        sessionPath: "/tmp/sessions",
      });

      mockFs.writeFile.mockResolvedValue(undefined);

      await refinerWithSession.applyRefinement([], [], []);

      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe("loadSession", () => {
    it("should load session from file", async () => {
      const sessionData = {
        id: "refine-123",
        timestamp: "2025-01-01T12:00:00Z",
        iterations: 3,
        originalDifference: 10,
        currentDifference: 2,
        excludedRegions: 5,
        acceptedSuggestions: 4,
        rejectedSuggestions: 1,
        history: [],
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(sessionData));

      const refinerWithSession = new ProgressiveRefiner({
        sessionPath: "/tmp/sessions",
      });

      const loaded = await refinerWithSession.loadSession("refine-123");

      expect(loaded).toEqual(sessionData);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        "/tmp/sessions/refine-123.json",
        "utf-8"
      );
    });

    it("should throw error when session path not configured", async () => {
      const refinerNoSession = new ProgressiveRefiner();

      await expect(refinerNoSession.loadSession("test")).rejects.toThrow(
        "Session path not configured"
      );
    });
  });

  describe("generateReport", () => {
    it("should generate comprehensive report", () => {
      // Manually set session data
      const session = (refiner as any).session;
      session.originalDifference = 10.5;
      session.currentDifference = 2.3;
      session.iterations = 3;
      session.excludedRegions = 8;
      session.acceptedSuggestions = 7;
      session.rejectedSuggestions = 3;
      session.history = [
        {
          iteration: 1,
          action: "Applied 3 suggestions, rejected 1",
          result: { difference: 7.2, regionsExcluded: 3 },
        },
        {
          iteration: 2,
          action: "Applied 2 suggestions, rejected 1",
          result: { difference: 4.5, regionsExcluded: 5 },
        },
        {
          iteration: 3,
          action: "Applied 2 suggestions, rejected 1",
          result: { difference: 2.3, regionsExcluded: 8 },
        },
      ];

      const report = refiner.generateReport();

      expect(report).toContain("Progressive Refinement Report");
      expect(report).toContain("Session ID: refine-");
      expect(report).toContain("Iterations: 3");
      expect(report).toContain("Original difference: 10.50%");
      expect(report).toContain("Current difference: 2.30%");
      expect(report).toContain("Improvement: 78.1%");
      expect(report).toContain("Regions excluded: 8");
      expect(report).toContain("Suggestions accepted: 7");
      expect(report).toContain("Suggestions rejected: 3");

      // Check history
      expect(report).toContain("Iteration 1: Applied 3 suggestions");
      expect(report).toContain("7.20% difference, 3 excluded");
    });
  });

  describe("pattern detection", () => {
    it("should detect clustered regions", async () => {
      const result: ComparisonResult = {
        difference: 5.0,
        isEqual: false,
        statistics: {
          pixelsDifferent: 500,
          totalPixels: 10000,
          percentageDifferent: 5.0,
        },
        classification: {
          totalRegions: 4,
          classifiedRegions: 4,
          unclassifiedRegions: 0,
          byType: { [DifferenceType.STYLE]: 4 } as any,
          confidence: { min: 0.8, avg: 0.85, max: 0.9 },
          regions: [
            // Create 4 nearby regions that should cluster
            {
              region: {
                id: 1,
                bounds: { x: 10, y: 10, width: 20, height: 20 },
                pixelCount: 400,
                differencePixels: 40,
                differencePercentage: 10,
              },
              classification: { type: DifferenceType.STYLE, confidence: 0.8 },
              classifier: "color",
            },
            {
              region: {
                id: 2,
                bounds: { x: 35, y: 10, width: 20, height: 20 },
                pixelCount: 400,
                differencePixels: 40,
                differencePercentage: 10,
              },
              classification: { type: DifferenceType.STYLE, confidence: 0.85 },
              classifier: "color",
            },
            {
              region: {
                id: 3,
                bounds: { x: 10, y: 35, width: 20, height: 20 },
                pixelCount: 400,
                differencePixels: 40,
                differencePercentage: 10,
              },
              classification: { type: DifferenceType.STYLE, confidence: 0.9 },
              classifier: "color",
            },
            {
              region: {
                id: 4,
                bounds: { x: 35, y: 35, width: 20, height: 20 },
                pixelCount: 400,
                differencePixels: 40,
                differencePercentage: 10,
              },
              classification: { type: DifferenceType.STYLE, confidence: 0.85 },
              classifier: "color",
            },
          ],
        },
      };

      const { suggestions } = await refiner.startRefinement(result);

      const clusterSuggestions = suggestions.filter(
        (s) => s.reason.includes("similar regions clustered together")
      );

      expect(clusterSuggestions.length).toBeGreaterThan(0);
      expect(clusterSuggestions[0].region?.bounds).toBeDefined();
    });
  });

  describe("alternative classification", () => {
    it("should suggest layout for extreme aspect ratios", async () => {
      const result: ComparisonResult = {
        difference: 5.0,
        isEqual: false,
        statistics: {
          pixelsDifferent: 500,
          totalPixels: 10000,
          percentageDifferent: 5.0,
        },
        classification: {
          totalRegions: 1,
          classifiedRegions: 1,
          unclassifiedRegions: 0,
          byType: { [DifferenceType.UNKNOWN]: 1 } as any,
          confidence: { min: 0.4, avg: 0.4, max: 0.4 },
          regions: [
            {
              region: {
                id: 1,
                bounds: { x: 10, y: 10, width: 200, height: 10 }, // Wide aspect ratio
                pixelCount: 2000,
                differencePixels: 100,
                differencePercentage: 5,
              },
              classification: { type: DifferenceType.UNKNOWN, confidence: 0.4 },
              classifier: "unknown",
            },
          ],
        },
      };

      const { suggestions } = await refiner.startRefinement(result);

      const reclassify = suggestions.find((s) => s.type === "reclassify");
      expect(reclassify?.suggestedClassification).toBe(DifferenceType.LAYOUT);
    });

    it("should suggest style for small regions", async () => {
      const result: ComparisonResult = {
        difference: 5.0,
        isEqual: false,
        statistics: {
          pixelsDifferent: 500,
          totalPixels: 10000,
          percentageDifferent: 5.0,
        },
        classification: {
          totalRegions: 1,
          classifiedRegions: 1,
          unclassifiedRegions: 0,
          byType: { [DifferenceType.UNKNOWN]: 1 } as any,
          confidence: { min: 0.4, avg: 0.4, max: 0.4 },
          regions: [
            {
              region: {
                id: 1,
                bounds: { x: 10, y: 10, width: 30, height: 30 }, // Small region
                pixelCount: 900,
                differencePixels: 45,
                differencePercentage: 5,
              },
              classification: { type: DifferenceType.UNKNOWN, confidence: 0.4 },
              classifier: "unknown",
            },
          ],
        },
      };

      const { suggestions } = await refiner.startRefinement(result);

      const reclassify = suggestions.find((s) => s.type === "reclassify");
      expect(reclassify?.suggestedClassification).toBe(DifferenceType.STYLE);
    });
  });
});