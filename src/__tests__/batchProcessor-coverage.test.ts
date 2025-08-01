/**
 * @fileoverview Coverage tests for BatchProcessor edge cases
 * @lastmodified 2025-08-01T06:00:00Z
 *
 * Features: Edge case testing for batch processor
 * Main APIs: BatchProcessor methods
 * Constraints: Mock-based
 * Patterns: Jest, coverage testing
 */

import { BatchProcessor } from "../lib/batchProcessor";
import * as fs from "fs/promises";

// Mock dependencies
jest.mock("fs/promises");
jest.mock("../lib/imageProcessor", () => ({
  ImageProcessor: jest.fn(() => ({
    alignImages: jest.fn(),
    compareImages: jest.fn(),
    generateDiff: jest.fn(),
  })),
}));

describe("BatchProcessor Edge Cases", () => {
  let processor: BatchProcessor;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new BatchProcessor();
  });

  describe("scanDirectory edge cases", () => {
    it("should handle empty directories", async () => {
      mockFs.readdir.mockResolvedValueOnce([]);

      const scanDir = (processor as any).scanDirectory.bind(processor);
      const result = await scanDir("/empty/dir");

      expect(result).toEqual([]);
    });

    it("should handle recursive scanning", async () => {
      mockFs.readdir.mockImplementation(async (dir: any) => {
        if (dir.toString() === "/root") {
          return [
            { name: "subdir", isDirectory: () => true, isFile: () => false },
            { name: "image.png", isDirectory: () => false, isFile: () => true },
          ] as any;
        } else if (dir.toString() === "/root/subdir") {
          return [
            {
              name: "nested.png",
              isDirectory: () => false,
              isFile: () => true,
            },
          ] as any;
        }
        return [];
      });

      const scanDir = (processor as any).scanDirectory.bind(processor);
      const result = await scanDir("/root", "*.png", true);

      expect(result).toContain("/root/image.png");
      expect(result).toContain("/root/subdir/nested.png");
    });

    it("should filter by pattern", async () => {
      mockFs.readdir.mockResolvedValueOnce([
        { name: "image.png", isDirectory: () => false, isFile: () => true },
        { name: "image.jpg", isDirectory: () => false, isFile: () => true },
        { name: "document.pdf", isDirectory: () => false, isFile: () => true },
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      const scanDir = (processor as any).scanDirectory.bind(processor);
      const result = await scanDir("/root", "*.png", false);

      expect(result).toContain("/root/image.png");
      expect(result).not.toContain("/root/image.jpg");
    });
  });

  describe("matchFilePairs edge cases", () => {
    it("should handle no matching files", async () => {
      const matchPairs = (processor as any).matchFilePairs.bind(processor);
      const result = matchPairs("/ref", ["/ref/a.png"], "/target", ["/target/b.png"]);

      expect(result).toEqual([]);
    });

    it("should match files with same relative path", async () => {
      const matchPairs = (processor as any).matchFilePairs.bind(processor);
      const result = matchPairs("/ref", ["/ref/dir/image.png"], "/target", [
        "/target/dir/image.png",
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].relativePath).toBe("dir/image.png");
    });
  });

  describe("processBatch edge cases", () => {
    it("should handle no files found", async () => {
      mockFs.readdir.mockResolvedValue([]);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await processor.processBatch("/ref", "/target", {
        outputDir: "/out",
      });

      expect(result.totalFiles).toBe(0);
      expect(result.processed).toBe(0);
    });

    it("should calculate average difference correctly", async () => {
      // Mock file system
      mockFs.readdir.mockImplementation(async (_dir: any, opts: any) => {
        if (opts?.withFileTypes) {
          return [{ name: "img.png", isDirectory: () => false, isFile: () => true }] as any;
        }
        return ["img.png"];
      });
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Mock image processor to return successful results
      const imageProcessorModule = jest.requireMock("../lib/imageProcessor");
      const { ImageProcessor } = imageProcessorModule;
      ImageProcessor.mockImplementation(() => ({
        alignImages: jest.fn().mockResolvedValue(undefined),
        compareImages: jest.fn().mockResolvedValue({
          difference: 10,
          isEqual: false,
          statistics: {
            pixelsDifferent: 1000,
            totalPixels: 10000,
            percentageDifferent: 10,
          },
        }),
        generateDiff: jest.fn().mockResolvedValue({
          difference: 10,
          diffImagePath: "/out/diff.png",
          isEqual: false,
          statistics: {
            pixelsDifferent: 1000,
            totalPixels: 10000,
            percentageDifferent: 10,
          },
        }),
      }));

      const result = await processor.processBatch("/ref", "/target", {
        outputDir: "/out",
      });

      expect(result.summary.averageDifference).toBe(10);
      expect(result.summary.differentImages).toBe(1);
      expect(result.summary.matchingImages).toBe(0);
    });

    it("should handle parallel processing option", async () => {
      // Mock console to capture output
      const originalWrite = process.stdout.write.bind(process.stdout);
      const mockWrite = jest.fn();
      process.stdout.write = mockWrite as any;

      mockFs.readdir.mockResolvedValue([]);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await processor.processBatch("/ref", "/target", {
        outputDir: "/out",
        parallel: false,
      });

      // Should have written progress
      expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining("\r\n"));

      process.stdout.write = originalWrite;
    });
  });

  describe("generateHtmlReport edge cases", () => {
    it("should handle zero processed files", async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      await processor.processBatch("/ref", "/target", {
        outputDir: "/out",
      });

      // Check HTML report was generated
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/out/index.html",
        expect.stringContaining("0.0%"),
        "utf-8"
      );
    });
  });
});
