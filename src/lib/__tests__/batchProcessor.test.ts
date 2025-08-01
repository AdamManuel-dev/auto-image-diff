/**
 * @fileoverview Tests for BatchProcessor module
 * @lastmodified 2025-08-01T05:45:00Z
 *
 * Features: Unit tests for batch image processing
 * Main APIs: Jest test suite
 * Constraints: Requires test fixtures and mocking
 * Patterns: Jest, async tests, filesystem mocking
 */

import { BatchProcessor } from "../batchProcessor";
import * as fs from "fs/promises";
import { Dirent } from "fs";

// Mock fs/promises
jest.mock("fs/promises");

// Mock ImageProcessor
jest.mock("../imageProcessor", () => ({
  ImageProcessor: jest.fn().mockImplementation(() => ({
    alignImages: jest.fn().mockResolvedValue(undefined),
    generateDiff: jest.fn().mockResolvedValue({
      difference: 0.05,
      diffImagePath: "/output/test_diff.png",
      isEqual: false,
      statistics: {
        pixelsDifferent: 500,
        totalPixels: 10000,
        percentageDifferent: 5,
      },
    }),
  })),
}));

describe("BatchProcessor", () => {
  let processor: BatchProcessor;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    processor = new BatchProcessor();
    jest.clearAllMocks();

    // Mock filesystem operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);

    // Create proper Dirent mock objects
    const createDirent = (name: string, isDirectory: boolean): Partial<Dirent> => ({
      name,
      isFile: () => !isDirectory,
      isDirectory: () => isDirectory,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
    });

    // Simplified mock that doesn't cause infinite loops
    mockFs.readdir.mockImplementation(async (dir: any, options: any) => {
      const dirPath = dir.toString();

      if (options?.withFileTypes) {
        if (dirPath.includes("reference")) {
          return [createDirent("image1.png", false), createDirent("image2.png", false)] as any; // Using any to bypass strict type checking in tests
        } else if (dirPath.includes("target")) {
          return [createDirent("image1.png", false), createDirent("image2.png", false)] as any;
        }
        return [] as any;
      }

      // Return string array if not withFileTypes
      if (dirPath.includes("reference")) {
        return ["image1.png", "image2.png"];
      } else if (dirPath.includes("target")) {
        return ["image1.png", "image2.png"];
      }
      return [];
    });
  });

  describe("processBatch", () => {
    it("should process multiple images in batch", async () => {
      const result = await processor.processBatch("/test/reference", "/test/target", {
        outputDir: "/test/output",
        pattern: "*.png",
        recursive: false,
      });

      expect(result.totalFiles).toBe(2);
      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.summary.matchingImages).toBe(0);
      expect(result.summary.differentImages).toBe(2);
    });

    it("should generate HTML and JSON reports", async () => {
      await processor.processBatch("/test/reference", "/test/target", {
        outputDir: "/test/output",
        pattern: "*.png",
        recursive: false,
      });

      // Check that reports were written
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/test/output/batch-report.json",
        expect.any(String),
        "utf-8"
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/test/output/index.html",
        expect.any(String),
        "utf-8"
      );
    });

    it("should handle errors gracefully", async () => {
      // Mock alignment to fail
      const imageProcessorModule = jest.requireMock("../imageProcessor");
      const { ImageProcessor } = imageProcessorModule;
      ImageProcessor.mockImplementation(() => {
        return {
          alignImages: jest.fn().mockRejectedValue(new Error("Alignment failed")),
          compareImages: jest.fn(),
          generateDiff: jest.fn(),
        } as any;
      });

      const processor = new BatchProcessor();
      const result = await processor.processBatch("/test/reference", "/test/target", {
        outputDir: "/test/output",
      });

      expect(result.failed).toBe(2);
      expect(result.processed).toBe(0);
      expect(result.results[0].error).toBe("Alignment failed");
    });
  });
});
