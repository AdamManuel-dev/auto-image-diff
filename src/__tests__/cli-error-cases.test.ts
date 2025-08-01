/**
 * @fileoverview CLI error case tests
 * @lastmodified 2025-08-01T06:30:00Z
 *
 * Features: Error case coverage
 * Main APIs: CLI error handling
 * Constraints: Heavy mocking
 * Patterns: Error testing
 */

// Store original values
const cliErrorOriginalArgv = process.argv;
const cliErrorOriginalExit = process.exit.bind(process);
const cliErrorOriginalLog = console.log.bind(console); // eslint-disable-line no-console
const cliErrorOriginalError = console.error.bind(console); // eslint-disable-line no-console

// Mock all external dependencies before imports
jest.mock("../lib/imageProcessor");
jest.mock("../lib/batchProcessor");
jest.mock("fs/promises");

// Mock console methods
const cliErrorMockLog = jest.fn();
const cliErrorMockError = jest.fn();
// Remove console overrides - they cause issues
// console.log = cliErrorMockLog;
// console.error = cliErrorMockError;

// Mock process.exit
const cliErrorMockExit = jest.fn();
(process.exit as any) = cliErrorMockExit;

describe("CLI Error Cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks
    const imageProcessorModule = jest.requireMock("../lib/imageProcessor");
    const batchProcessorModule = jest.requireMock("../lib/batchProcessor");
    const fs = jest.requireMock("fs/promises");
    const { ImageProcessor } = imageProcessorModule;
    const { BatchProcessor } = batchProcessorModule;

    ImageProcessor.mockImplementation(() => ({
      alignImages: jest.fn().mockRejectedValue(new Error("Alignment failed")),
      compareImages: jest.fn().mockRejectedValue(new Error("Compare failed")),
      generateDiff: jest.fn().mockRejectedValue(new Error("Diff failed")),
    }));

    BatchProcessor.mockImplementation(() => ({
      processBatch: jest.fn().mockRejectedValue(new Error("Batch failed")),
    }));

    fs.writeFile = jest.fn().mockRejectedValue(new Error("Write failed"));
  });

  afterAll(() => {
    // Restore originals
    process.argv = cliErrorOriginalArgv;
    process.exit = cliErrorOriginalExit;
    console.log = cliErrorOriginalLog; // eslint-disable-line no-console
    console.error = cliErrorOriginalError; // eslint-disable-line no-console
  });

  it("should handle align command error", async () => {
    process.argv = ["node", "cli.ts", "align", "ref.png", "target.png", "out.png"];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cliErrorMockError).toHaveBeenCalledWith("❌ Error aligning images:", "Alignment failed");
    expect(cliErrorMockExit).toHaveBeenCalledWith(1);
  });

  it("should handle diff command error", async () => {
    process.argv = ["node", "cli.ts", "diff", "img1.png", "img2.png", "diff.png"];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cliErrorMockError).toHaveBeenCalledWith("❌ Error generating diff:", "Diff failed");
    expect(cliErrorMockExit).toHaveBeenCalledWith(1);
  });

  it("should handle compare command error", async () => {
    process.argv = ["node", "cli.ts", "compare", "ref.png", "target.png", "output"];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cliErrorMockError).toHaveBeenCalledWith("❌ Error comparing images:", "Compare failed");
    expect(cliErrorMockExit).toHaveBeenCalledWith(1);
  });

  it("should handle batch command error", async () => {
    process.argv = ["node", "cli.ts", "batch", "ref", "target", "output"];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cliErrorMockError).toHaveBeenCalledWith("❌ Error processing batch:", "Batch failed");
    expect(cliErrorMockExit).toHaveBeenCalledWith(1);
  });

  it("should handle diff command with threshold option", async () => {
    const imageProcessorModule = jest.requireMock("../lib/imageProcessor");
    const { ImageProcessor } = imageProcessorModule;
    ImageProcessor.mockImplementation(() => ({
      generateDiff: jest.fn().mockResolvedValue({
        difference: 5,
        diffImagePath: "diff.png",
        isEqual: false,
        statistics: {
          pixelsDifferent: 100,
          totalPixels: 10000,
          percentageDifferent: 1,
        },
      }),
    }));

    process.argv = ["node", "cli.ts", "diff", "img1.png", "img2.png", "diff.png", "-t", "0.5"];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cliErrorMockLog).toHaveBeenCalledWith("✅ Diff generated successfully!");
  });

  it("should handle compare command with all options", async () => {
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
        diffImagePath: "diff.png",
        isEqual: false,
        statistics: {
          pixelsDifferent: 1000,
          totalPixels: 10000,
          percentageDifferent: 10,
        },
      }),
    }));

    process.argv = [
      "node",
      "cli.ts",
      "compare",
      "ref.png",
      "target.png",
      "output",
      "-t",
      "5",
      "-c",
      "#00FF00",
    ];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cliErrorMockLog).toHaveBeenCalledWith("  Images are different (10.00% difference)");
  });

  it("should handle batch command with pattern option", async () => {
    const batchProcessorModule = jest.requireMock("../lib/batchProcessor");
    const { BatchProcessor } = batchProcessorModule;
    BatchProcessor.mockImplementation(() => ({
      processBatch: jest.fn().mockResolvedValue({
        totalFiles: 3,
        processed: 2,
        failed: 1,
        results: [],
        summary: {
          averageDifference: 5,
          totalPixelsDifferent: 200,
          matchingImages: 0,
          differentImages: 2,
        },
      }),
    }));

    process.argv = ["node", "cli.ts", "batch", "ref", "target", "output", "-p", "*.jpg"];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cliErrorMockLog).toHaveBeenCalledWith(expect.stringContaining("❌ Failed:"));
    expect(cliErrorMockLog).toHaveBeenCalledWith(expect.stringContaining("1"));
  });
});
