/**
 * @fileoverview Coverage tests for ImageProcessor edge cases
 * @lastmodified 2025-08-01T06:00:00Z
 *
 * Features: Edge case testing
 * Main APIs: ImageProcessor methods
 * Constraints: Mock-based
 * Patterns: Jest, coverage testing
 */

import { ImageProcessor } from "../lib/imageProcessor";
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
  let processor: ImageProcessor;
  let mockExecAsync: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock execAsync
    mockExecAsync = jest.fn();
    const utilModule = jest.requireMock("util");
    const { promisify } = utilModule;
    (promisify as jest.Mock).mockReturnValue(mockExecAsync);

    processor = new ImageProcessor();
  });

  describe("alignImages edge cases", () => {
    it("should handle convert command with offset", async () => {
      // Mock subimage search returning offset
      mockExecAsync.mockRejectedValueOnce({
        stdout: "",
        stderr: "1234 @ 10,20",
      });
      // Mock convert command success
      mockExecAsync.mockResolvedValueOnce({ stdout: "", stderr: "" });

      await processor.alignImages("ref.png", "target.png", "out.png");

      expect(mockExecAsync).toHaveBeenCalledWith(expect.stringContaining("convert"));
      expect(mockExecAsync).toHaveBeenCalledWith(expect.stringContaining("+10+20"));
    });

    it("should handle cp command when no offset", async () => {
      // Mock subimage search returning no offset
      mockExecAsync.mockRejectedValueOnce({
        stdout: "",
        stderr: "no match found",
      });
      // Mock cp command success
      mockExecAsync.mockResolvedValueOnce({ stdout: "", stderr: "" });

      await processor.alignImages("ref.png", "target.png", "out.png");

      expect(mockExecAsync).toHaveBeenCalledWith(expect.stringContaining("cp"));
    });

    it("should handle alignment errors", async () => {
      // Mock command failure
      mockExecAsync.mockRejectedValueOnce(new Error("Command failed"));

      await expect(processor.alignImages("ref.png", "target.png", "out.png")).rejects.toThrow(
        "Failed to align images"
      );
    });
  });

  describe("compareImages edge cases", () => {
    it("should handle successful compare", async () => {
      // Mock successful compare
      mockExecAsync.mockResolvedValueOnce({ stdout: "500", stderr: "" });

      const result = await processor.compareImages("img1.png", "img2.png");

      expect(result.statistics.pixelsDifferent).toBe(500);
      expect(result.statistics.percentageDifferent).toBe(5);
    });

    it("should handle compare error without stdout", async () => {
      // Mock error without stdout
      mockExecAsync.mockRejectedValueOnce(new Error("No stdout"));

      await expect(processor.compareImages("img1.png", "img2.png")).rejects.toThrow("No stdout");
    });
  });

  describe("generateDiff edge cases", () => {
    it("should handle successful diff generation", async () => {
      // Mock successful diff generation
      mockExecAsync.mockRejectedValueOnce(new Error("Expected non-zero"));
      // Mock fs.access to say file exists
      (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
      // Mock successful compare for metrics
      mockExecAsync.mockRejectedValueOnce({ stdout: "100", stderr: "" });

      const result = await processor.generateDiff("img1.png", "img2.png", "diff.png");

      expect(result.diffImagePath).toBe("diff.png");
    });

    it("should handle diff generation failure when file not created", async () => {
      // Mock diff generation failure
      mockExecAsync.mockRejectedValueOnce(new Error("Diff failed"));
      // Mock fs.access to say file doesn't exist
      (fs.access as jest.Mock).mockRejectedValueOnce(new Error("ENOENT"));

      await expect(processor.generateDiff("img1.png", "img2.png", "diff.png")).rejects.toThrow(
        "Failed to generate diff"
      );
    });
  });

  describe("fileExists edge cases", () => {
    it("should return false when file doesn't exist", async () => {
      // Mock fs.access failure
      (fs.access as jest.Mock).mockRejectedValueOnce(new Error("ENOENT"));

      // Access private method through any casting
      const fileExists = (processor as any).fileExists.bind(processor);
      const result = await fileExists("nonexistent.png");

      expect(result).toBe(false);
    });
  });
});
