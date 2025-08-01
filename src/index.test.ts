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
    const exports = jest.requireMock("./index");
    expect(exports.ImageProcessor).toBeDefined();
    expect(typeof exports.ImageProcessor).toBe("function");
  });

  it("should export BatchProcessor", () => {
    const exports = jest.requireMock("./index");
    expect(exports.BatchProcessor).toBeDefined();
    expect(typeof exports.BatchProcessor).toBe("function");
  });

  it("should instantiate ImageProcessor", () => {
    const indexModule = jest.requireMock("./index");
    const { ImageProcessor } = indexModule;
    const processor = new ImageProcessor();
    expect(processor).toBeDefined();
    expect(processor.alignImages).toBeDefined();
    expect(processor.compareImages).toBeDefined();
    expect(processor.generateDiff).toBeDefined();
  });

  it("should instantiate BatchProcessor", () => {
    const indexModule = jest.requireMock("./index");
    const { BatchProcessor } = indexModule;
    const processor = new BatchProcessor();
    expect(processor).toBeDefined();
    expect(processor.processBatch).toBeDefined();
  });
});
