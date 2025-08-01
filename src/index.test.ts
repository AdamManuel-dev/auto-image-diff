/**
 * @fileoverview Tests for index module
 * @lastmodified 2025-08-01T06:00:00Z
 *
 * Features: Module export tests
 * Main APIs: Module exports
 * Constraints: Tests exports
 * Patterns: Jest tests
 */

describe("Module exports", () => {
  it("should export ImageProcessor", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const exports = require("./index");
    expect(exports.ImageProcessor).toBeDefined();
    expect(typeof exports.ImageProcessor).toBe("function");
  });

  it("should export BatchProcessor", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const exports = require("./index");
    expect(exports.BatchProcessor).toBeDefined();
    expect(typeof exports.BatchProcessor).toBe("function");
  });

  it("should instantiate ImageProcessor", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ImageProcessor } = require("./index");
    const processor = new ImageProcessor();
    expect(processor).toBeDefined();
    expect(processor.alignImages).toBeDefined();
    expect(processor.compareImages).toBeDefined();
    expect(processor.generateDiff).toBeDefined();
  });

  it("should instantiate BatchProcessor", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BatchProcessor } = require("./index");
    const processor = new BatchProcessor();
    expect(processor).toBeDefined();
    expect(processor.processBatch).toBeDefined();
  });
});
