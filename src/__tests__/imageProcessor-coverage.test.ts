/**
 * @fileoverview Coverage tests for ImageProcessor edge cases
 * @lastmodified 2025-08-01T06:00:00Z
 *
 * Features: Edge case testing
 * Main APIs: ImageProcessor methods
 * Constraints: Mock-based
 * Patterns: Jest, coverage testing
 */

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

describe("ImageProcessor Edge Cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe("alignImages edge cases", () => {
    it("should handle convert command with offset", async () => {
      // Create mock execAsync
      const mockExecAsync = jest.fn();

      // Mock subimage search returning offset
      mockExecAsync.mockRejectedValueOnce({
        stdout: "",
        stderr: "1234 @ 10,20",
      });
      // Mock convert command success
      mockExecAsync.mockResolvedValueOnce({ stdout: "", stderr: "" });

      // Mock util module
      jest.doMock("util", () => ({
        ...jest.requireActual("util"),
        promisify: jest.fn(() => mockExecAsync),
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ImageProcessor } = require("../lib/imageProcessor");
      const processor = new ImageProcessor();

      await processor.alignImages("ref.png", "target.png", "out.png");

      expect(mockExecAsync).toHaveBeenCalledWith(expect.stringContaining("convert"));
      expect(mockExecAsync).toHaveBeenCalledWith(expect.stringContaining("+10+20"));
    });

    it("should handle cp command when no offset", async () => {
      // Create mock execAsync
      const mockExecAsync = jest.fn();

      // Mock subimage search returning no offset
      mockExecAsync.mockRejectedValueOnce({
        stdout: "",
        stderr: "no match found",
      });
      // Mock cp command success
      mockExecAsync.mockResolvedValueOnce({ stdout: "", stderr: "" });

      // Mock util module
      jest.doMock("util", () => ({
        ...jest.requireActual("util"),
        promisify: jest.fn(() => mockExecAsync),
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ImageProcessor } = require("../lib/imageProcessor");
      const processor = new ImageProcessor();

      await processor.alignImages("ref.png", "target.png", "out.png");

      expect(mockExecAsync).toHaveBeenCalledWith(expect.stringContaining("cp"));
    });

    it("should handle alignment errors", async () => {
      // Create mock execAsync
      const mockExecAsync = jest.fn();

      // First call (subimage search) - return with no offset
      mockExecAsync.mockRejectedValueOnce({
        stdout: "",
        stderr: "0 @ 0,0",
      });
      // Second call (cp command) - fail
      mockExecAsync.mockRejectedValueOnce(new Error("Command failed"));

      // Mock util module
      jest.doMock("util", () => ({
        ...jest.requireActual("util"),
        promisify: jest.fn(() => mockExecAsync),
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ImageProcessor } = require("../lib/imageProcessor");
      const processor = new ImageProcessor();

      await expect(processor.alignImages("ref.png", "target.png", "out.png")).rejects.toThrow(
        "Failed to align images"
      );
    });
  });

  describe("compareImages edge cases", () => {
    it("should handle successful compare", async () => {
      // Create mock execAsync
      const mockExecAsync = jest.fn();

      // Mock successful compare
      mockExecAsync.mockResolvedValueOnce({ stdout: "500", stderr: "" });

      // Mock util module
      jest.doMock("util", () => ({
        ...jest.requireActual("util"),
        promisify: jest.fn(() => mockExecAsync),
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ImageProcessor } = require("../lib/imageProcessor");
      const processor = new ImageProcessor();

      const result = await processor.compareImages("img1.png", "img2.png");

      expect(result.statistics.pixelsDifferent).toBe(500);
      expect(result.statistics.percentageDifferent).toBe(5);
    });

    it("should handle compare error without stdout", async () => {
      // Create mock execAsync
      const mockExecAsync = jest.fn();

      // Mock error without stdout - this will be re-thrown
      const errorWithoutStdout = new Error("Command failed");
      mockExecAsync.mockRejectedValueOnce(errorWithoutStdout);

      // Mock util module
      jest.doMock("util", () => ({
        ...jest.requireActual("util"),
        promisify: jest.fn(() => mockExecAsync),
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ImageProcessor } = require("../lib/imageProcessor");
      const processor = new ImageProcessor();

      await expect(processor.compareImages("img1.png", "img2.png")).rejects.toThrow(
        "Command failed"
      );
    });
  });

  describe("generateDiff edge cases", () => {
    it("should handle successful diff generation", async () => {
      // Create mock execAsync
      const mockExecAsync = jest.fn();

      // Mock successful diff generation
      mockExecAsync.mockRejectedValueOnce(new Error("Expected non-zero"));
      // Mock successful compare for metrics
      mockExecAsync.mockRejectedValueOnce({ stdout: "100", stderr: "" });

      // Mock util module
      jest.doMock("util", () => ({
        ...jest.requireActual("util"),
        promisify: jest.fn(() => mockExecAsync),
      }));

      // Mock fs.access to say file exists
      (fs.access as jest.Mock).mockResolvedValueOnce(undefined);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ImageProcessor } = require("../lib/imageProcessor");
      const processor = new ImageProcessor();

      const result = await processor.generateDiff("img1.png", "img2.png", "diff.png");

      expect(result.diffImagePath).toBe("diff.png");
    });

    it("should handle diff generation failure when file not created", async () => {
      // Create mock execAsync
      const mockExecAsync = jest.fn();

      // Mock diff generation failure
      mockExecAsync.mockRejectedValueOnce(new Error("Diff failed"));

      // Mock util module
      jest.doMock("util", () => ({
        ...jest.requireActual("util"),
        promisify: jest.fn(() => mockExecAsync),
      }));

      // Need to mock fs module before ImageProcessor is loaded
      jest.doMock("fs/promises", () => ({
        access: jest.fn().mockRejectedValueOnce(new Error("ENOENT")),
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ImageProcessor } = require("../lib/imageProcessor");
      const processor = new ImageProcessor();

      await expect(processor.generateDiff("img1.png", "img2.png", "diff.png")).rejects.toThrow(
        "Failed to generate diff"
      );
    });
  });

  describe("fileExists edge cases", () => {
    it("should return false when file doesn't exist", async () => {
      // Reset modules to ensure clean state
      jest.resetModules();

      // Mock fs module
      jest.doMock("fs/promises", () => ({
        access: jest.fn().mockRejectedValueOnce(new Error("ENOENT")),
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ImageProcessor } = require("../lib/imageProcessor");
      const processor = new ImageProcessor();

      // Access private method through any casting
      const fileExists = processor.fileExists;
      const result = await fileExists.call(processor, "nonexistent.png");

      expect(result).toBe(false);
    });
  });
});
