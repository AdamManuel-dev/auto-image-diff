/**
 * @fileoverview Processor edge case tests
 * @lastmodified 2025-08-01T06:30:00Z
 *
 * Features: Edge case coverage for processors
 * Main APIs: ImageProcessor and BatchProcessor
 * Constraints: Mock-based
 * Patterns: Edge case testing
 */

import { ImageProcessor } from "../lib/imageProcessor";
import { BatchProcessor } from "../lib/batchProcessor";
import * as fs from "fs/promises";

// Mock dependencies
jest.mock("child_process");
jest.mock("util", () => ({
  ...jest.requireActual("util"),
  promisify: jest.fn(),
}));
jest.mock("fs/promises");
jest.mock("gm", () => ({
  subClass: jest.fn(() =>
    jest.fn(() => ({
      size: jest.fn((cb) => cb(null, { width: 100, height: 100 })),
    }))
  ),
}));

describe("Processor Edge Cases", () => {
  describe("ImageProcessor - alignImages convert edge case", () => {
    it("should use convert when ImageMagick 7 is detected", async () => {
      const mockExecAsync = jest.fn();
      const utilModule = jest.requireMock("util");
      const { promisify } = utilModule;
      (promisify as jest.Mock).mockReturnValue(mockExecAsync);

      // Mock subimage search with offset
      mockExecAsync.mockRejectedValueOnce({
        stdout: "",
        stderr: "1234 @ 5,10",
      });
      // Mock successful convert
      mockExecAsync.mockResolvedValueOnce({ stdout: "", stderr: "" });

      const processor = new ImageProcessor();
      await processor.alignImages("ref.png", "target.png", "out.png");

      // Check that convert was called with correct offset
      expect(mockExecAsync).toHaveBeenCalledWith(expect.stringContaining("convert"));
      expect(mockExecAsync).toHaveBeenCalledWith(expect.stringContaining("+5+10"));
    });
  });

  describe("ImageProcessor - compareImages stdout edge case", () => {
    it("should handle successful compare with stdout", async () => {
      const mockExecAsync = jest.fn();
      const utilModule = jest.requireMock("util");
      const { promisify } = utilModule;
      (promisify as jest.Mock).mockReturnValue(mockExecAsync);

      // Mock successful compare (no error)
      mockExecAsync.mockResolvedValueOnce({ stdout: "250", stderr: "" });

      const processor = new ImageProcessor();
      const result = await processor.compareImages("img1.png", "img2.png");

      expect(result.statistics.pixelsDifferent).toBe(250);
      expect(result.statistics.percentageDifferent).toBe(2.5);
    });
  });

  describe("ImageProcessor - generateDiff file exists edge case", () => {
    it("should succeed when diff file is created despite error", async () => {
      const mockExecAsync = jest.fn();
      const utilModule = jest.requireMock("util");
      const { promisify } = utilModule;
      (promisify as jest.Mock).mockReturnValue(mockExecAsync);

      // Mock diff generation with error but file exists
      mockExecAsync.mockRejectedValueOnce(new Error("Non-zero exit"));

      // Mock file exists check
      (fs.access as jest.Mock).mockResolvedValueOnce(undefined);

      // Mock successful compare for metrics
      mockExecAsync.mockRejectedValueOnce({ stdout: "300", stderr: "" });

      const processor = new ImageProcessor();
      const result = await processor.generateDiff("img1.png", "img2.png", "diff.png");

      expect(result.diffImagePath).toBe("diff.png");
      expect(result.statistics.pixelsDifferent).toBe(300);
    });
  });

  describe("BatchProcessor - progress output edge cases", () => {
    it("should output progress when parallel is false", async () => {
      const originalWrite = process.stdout.write.bind(process.stdout);
      const mockWrite = jest.fn();
      process.stdout.write = mockWrite as any;

      // Mock file system
      (fs.readdir as jest.Mock).mockImplementation(async (_dir: any, opts: any) => {
        if (opts?.withFileTypes) {
          return [{ name: "img1.png", isDirectory: () => false, isFile: () => true }] as any;
        }
        return ["img1.png"];
      });
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      // Mock ImageProcessor
      jest.mock("../lib/imageProcessor", () => ({
        ImageProcessor: jest.fn(() => ({
          alignImages: jest.fn().mockResolvedValue(undefined),
          compareImages: jest.fn().mockResolvedValue({
            difference: 5,
            isEqual: false,
            statistics: {
              pixelsDifferent: 500,
              totalPixels: 10000,
              percentageDifferent: 5,
            },
          }),
          generateDiff: jest.fn().mockResolvedValue({
            difference: 5,
            diffImagePath: "/out/diff.png",
            isEqual: false,
            statistics: {
              pixelsDifferent: 500,
              totalPixels: 10000,
              percentageDifferent: 5,
            },
          }),
        })),
      }));

      const processor = new BatchProcessor();
      await processor.processBatch("/ref", "/target", {
        outputDir: "/out",
        parallel: false,
      });

      // Should have written progress
      expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining("Processing:"));
      expect(mockWrite).toHaveBeenCalledWith("\r\n");

      process.stdout.write = originalWrite;
    });

    it("should handle pattern matching edge case", async () => {
      // Mock file system to return non-PNG files
      (fs.readdir as jest.Mock).mockImplementation(async (_dir: any, opts: any) => {
        if (opts?.withFileTypes) {
          return [
            { name: "img.jpg", isDirectory: () => false, isFile: () => true },
            { name: "img.png", isDirectory: () => false, isFile: () => true },
          ] as any;
        }
        return ["img.jpg", "img.png"];
      });
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const processor = new BatchProcessor();

      // Use private method to test pattern matching
      const scanDir = (processor as any).scanDirectory.bind(processor);
      const result = await scanDir("/test", "*.jpg", false);

      expect(result).toContain("/test/img.jpg");
      expect(result).not.toContain("/test/img.png");
    });

    it("should handle missing matching image edge case", async () => {
      // Mock file system with different files
      (fs.readdir as jest.Mock).mockImplementation(async (dir: any, opts: any) => {
        if (opts?.withFileTypes) {
          if (dir.toString().includes("reference")) {
            return [{ name: "ref1.png", isDirectory: () => false, isFile: () => true }] as any;
          } else {
            return [{ name: "target2.png", isDirectory: () => false, isFile: () => true }] as any;
          }
        }
        return [];
      });
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const processor = new BatchProcessor();
      const result = await processor.processBatch("/ref", "/target", {
        outputDir: "/out",
      });

      // Should have no matches
      expect(result.totalFiles).toBe(1);
      expect(result.processed).toBe(0);
    });
  });
});
