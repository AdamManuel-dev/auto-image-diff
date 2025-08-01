/**
 * @fileoverview Direct CLI execution tests
 * @lastmodified 2025-08-01T06:00:00Z
 *
 * Features: Direct CLI code coverage
 * Main APIs: CLI implementation
 * Constraints: Heavy mocking
 * Patterns: Direct execution
 */

// Store original values
const cliDirectOriginalArgv = process.argv;
const cliDirectOriginalExit = process.exit.bind(process);
const cliDirectOriginalLog = console.log.bind(console); // eslint-disable-line no-console
const cliDirectOriginalError = console.error.bind(console); // eslint-disable-line no-console

// Mock all external dependencies before imports
jest.mock("../lib/imageProcessor");
jest.mock("../lib/batchProcessor");
jest.mock("fs/promises");

// Mock console methods
const cliDirectMockLog = jest.fn();
const cliDirectMockError = jest.fn();
// Remove console overrides - they cause issues
// console.log = cliDirectMockLog;
// console.error = cliDirectMockError;

// Mock process.exit
const cliDirectMockExit = jest.fn();
(process.exit as any) = cliDirectMockExit;

describe("CLI Direct Execution", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks
    const imageProcessorModule = jest.requireMock("../lib/imageProcessor");
    const batchProcessorModule = jest.requireMock("../lib/batchProcessor");
    const fs = jest.requireMock("fs/promises");
    const { ImageProcessor } = imageProcessorModule;
    const { BatchProcessor } = batchProcessorModule;

    ImageProcessor.mockImplementation(() => ({
      alignImages: jest.fn().mockResolvedValue(undefined),
      compareImages: jest.fn().mockResolvedValue({
        difference: 5,
        isEqual: false,
        statistics: {
          pixelsDifferent: 100,
          totalPixels: 10000,
          percentageDifferent: 1,
        },
      }),
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

    BatchProcessor.mockImplementation(() => ({
      processBatch: jest.fn().mockResolvedValue({
        totalFiles: 2,
        processed: 2,
        failed: 0,
        results: [],
        summary: {
          averageDifference: 5,
          totalPixelsDifferent: 200,
          matchingImages: 0,
          differentImages: 2,
        },
      }),
    }));

    fs.writeFile = jest.fn().mockResolvedValue(undefined);
  });

  afterAll(() => {
    // Restore originals
    process.argv = cliDirectOriginalArgv;
    process.exit = cliDirectOriginalExit;
    console.log = cliDirectOriginalLog; // eslint-disable-line no-console
    console.error = cliDirectOriginalError; // eslint-disable-line no-console
  });

  it("should execute align command", async () => {
    process.argv = ["node", "cli.ts", "align", "ref.png", "target.png", "out.png"];

    // Clear module cache and re-import
    jest.resetModules();
    await import("../cli");

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cliDirectMockLog).toHaveBeenCalledWith("Aligning images...");
  });

  it("should execute align command with error", async () => {
    const imageProcessorModule = jest.requireMock("../lib/imageProcessor");
    const { ImageProcessor } = imageProcessorModule;
    ImageProcessor.mockImplementation(() => ({
      alignImages: jest.fn().mockRejectedValue(new Error("Align failed")),
    }));

    process.argv = ["node", "cli.ts", "align", "ref.png", "target.png", "out.png"];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cliDirectMockError).toHaveBeenCalledWith("Error:", "Align failed");
    expect(cliDirectMockExit).toHaveBeenCalledWith(1);
  });

  it("should execute diff command", async () => {
    process.argv = ["node", "cli.ts", "diff", "img1.png", "img2.png", "diff.png"];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cliDirectMockLog).toHaveBeenCalledWith("Generating visual diff...");
  });

  it("should execute diff command with custom options", async () => {
    process.argv = [
      "node",
      "cli.ts",
      "diff",
      "img1.png",
      "img2.png",
      "diff.png",
      "--color",
      "#FF0000",
      "--no-lowlight",
    ];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cliDirectMockLog).toHaveBeenCalledWith("Generating visual diff...");
  });

  it("should execute compare command", async () => {
    process.argv = ["node", "cli.ts", "compare", "ref.png", "target.png", "output"];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cliDirectMockLog).toHaveBeenCalledWith("Step 1/2: Aligning images...");
  });

  it("should execute compare command with JSON", async () => {
    process.argv = ["node", "cli.ts", "compare", "ref.png", "target.png", "output", "--json"];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));

    const fs = jest.requireMock("fs/promises");
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("comparison-result.json"),
      expect.any(String),
      "utf-8"
    );
  });

  it("should execute batch command", async () => {
    process.argv = ["node", "cli.ts", "batch", "ref", "target", "output"];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cliDirectMockLog).toHaveBeenCalledWith("Starting batch processing...");
  });

  it("should execute batch command with parallel disabled", async () => {
    process.argv = ["node", "cli.ts", "batch", "ref", "target", "output", "--no-parallel"];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cliDirectMockLog).toHaveBeenCalledWith("Starting batch processing...");
  });

  it("should show help", async () => {
    process.argv = ["node", "cli.ts", "--help"];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it("should show version", async () => {
    process.argv = ["node", "cli.ts", "--version"];

    jest.resetModules();
    await import("../cli");

    await new Promise((resolve) => setTimeout(resolve, 100));
  });
});
