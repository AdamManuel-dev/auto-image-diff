/**
 * @fileoverview Basic test for main entry point
 * @lastmodified 2025-08-01T06:45:00Z
 *
 * Features: Test main module exports
 * Main APIs: Jest testing
 * Constraints: None
 * Patterns: Jest test suite
 */

import * as MainModule from "../index";

describe("auto-image-diff main module", () => {
  it("should export ImageProcessor", () => {
    expect(MainModule.ImageProcessor).toBeDefined();
  });

  it("should export BatchProcessor", () => {
    expect(MainModule.BatchProcessor).toBeDefined();
  });

  it("should export BatchResult interface", () => {
    // TypeScript compile-time check
    const result: MainModule.BatchResult = {
      totalFiles: 0,
      processed: 0,
      failed: 0,
      results: [],
      summary: {
        averageDifference: 0,
        totalPixelsDifferent: 0,
        matchingImages: 0,
        differentImages: 0,
      },
    };
    expect(result).toBeDefined();
  });

  it("should export BatchOptions interface", () => {
    // TypeScript compile-time check
    const options: MainModule.BatchOptions = {
      outputDir: "test",
      pattern: "*.png",
      parallel: true,
      recursive: false,
    };
    expect(options).toBeDefined();
  });
});
