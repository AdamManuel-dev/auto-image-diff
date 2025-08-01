/**
 * @fileoverview CLI coverage tests
 * @lastmodified 2025-08-01T06:00:00Z
 *
 * Features: Tests CLI command implementations
 * Main APIs: CLI commands
 * Constraints: Mock-based testing
 * Patterns: Jest, mocking
 */

// Mock dependencies before imports
const mockAlignImages = jest.fn();
const mockCompareImages = jest.fn();
const mockGenerateDiff = jest.fn();
const mockProcessBatch = jest.fn();
const mockWriteFile = jest.fn();
const mockReaddir = jest.fn();
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();
const mockProcessExit = jest.fn();

// Store original console methods
const _originalLog = console.log.bind(console); // eslint-disable-line no-console
const _originalError = console.error.bind(console);
const _originalExit = process.exit.bind(process);

jest.mock("../lib/imageProcessor", () => ({
  ImageProcessor: jest.fn().mockImplementation(() => ({
    alignImages: mockAlignImages,
    compareImages: mockCompareImages,
    generateDiff: mockGenerateDiff,
  })),
}));

jest.mock("../lib/batchProcessor", () => ({
  BatchProcessor: jest.fn().mockImplementation(() => ({
    processBatch: mockProcessBatch,
  })),
}));

jest.mock("fs/promises", () => ({
  writeFile: mockWriteFile,
  readdir: mockReaddir,
}));

// Override console and process.exit
// Remove console overrides - they're causing issues
// console.log = mockConsoleLog;
// console.error = mockConsoleError;
// (process.exit as any) = mockProcessExit;

describe("CLI Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlignImages.mockResolvedValue(undefined);
    mockCompareImages.mockResolvedValue({
      difference: 5,
      isEqual: false,
      statistics: {
        pixelsDifferent: 100,
        totalPixels: 10000,
        percentageDifferent: 1,
      },
    });
    mockGenerateDiff.mockResolvedValue({
      difference: 5,
      diffImagePath: "diff.png",
      isEqual: false,
      statistics: {
        pixelsDifferent: 100,
        totalPixels: 10000,
        percentageDifferent: 1,
      },
    });
    mockProcessBatch.mockResolvedValue({
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
    });
    mockWriteFile.mockResolvedValue(undefined);
  });

  afterAll(() => {
    // Restore original methods
    // console.log = originalLog;
    // console.error = originalError;
    // process.exit = originalExit;
  });

  describe("align command", () => {
    it("should execute align command successfully", async () => {
      const commanderModule = await import("commander");
      const { Command } = commanderModule;
      const program = new Command();

      // Import CLI setup
      jest.isolateModules(() => {
        jest.requireMock("../cli");
      });

      // Simulate command execution
      const alignCmd = program.commands.find((cmd: any) => cmd.name() === "align");
      if (alignCmd) {
        await alignCmd.parseAsync(["node", "cli.ts", "ref.png", "target.png", "out.png"], {
          from: "user",
        });
      }

      expect(mockAlignImages).toHaveBeenCalledWith(
        "ref.png",
        "target.png",
        "out.png",
        expect.any(Object)
      );
      expect(mockConsoleLog).toHaveBeenCalledWith("Aligning images...");
      expect(mockConsoleLog).toHaveBeenCalledWith("✅ Images aligned successfully!");
    });

    it("should handle align command errors", async () => {
      mockAlignImages.mockRejectedValueOnce(new Error("Alignment failed"));

      const commanderModule = await import("commander");
      const { Command } = commanderModule;
      const program = new Command();

      jest.isolateModules(() => {
        require("../cli");
      });

      const alignCmd = program.commands.find((cmd: any) => cmd.name() === "align");
      if (alignCmd) {
        await alignCmd.parseAsync(["node", "cli.ts", "ref.png", "target.png", "out.png"], {
          from: "user",
        });
      }

      expect(mockConsoleError).toHaveBeenCalledWith("Error:", "Alignment failed");
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe("diff command", () => {
    it("should execute diff command successfully", async () => {
      const commanderModule = await import("commander");
      const { Command } = commanderModule;
      const program = new Command();

      jest.isolateModules(() => {
        require("../cli");
      });

      const diffCmd = program.commands.find((cmd: any) => cmd.name() === "diff");
      if (diffCmd) {
        await diffCmd.parseAsync(["node", "cli.ts", "img1.png", "img2.png"], { from: "user" });
      }

      expect(mockGenerateDiff).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith("Generating visual diff...");
    });
  });

  describe("compare command", () => {
    it("should execute compare command with JSON output", async () => {
      const commanderModule = await import("commander");
      const { Command } = commanderModule;
      const program = new Command();

      jest.isolateModules(() => {
        require("../cli");
      });

      const compareCmd = program.commands.find((cmd: any) => cmd.name() === "compare");
      if (compareCmd) {
        await compareCmd.parseAsync(["node", "cli.ts", "ref.png", "target.png", "--json"], {
          from: "user",
        });
      }

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("comparison-result.json"),
        expect.any(String),
        "utf-8"
      );
    });
  });

  describe("batch command", () => {
    it("should execute batch command successfully", async () => {
      const commanderModule = await import("commander");
      const { Command } = commanderModule;
      const program = new Command();

      jest.isolateModules(() => {
        require("../cli");
      });

      const batchCmd = program.commands.find((cmd: any) => cmd.name() === "batch");
      if (batchCmd) {
        await batchCmd.parseAsync(["node", "cli.ts", "inputDir"], { from: "user" });
      }

      expect(mockProcessBatch).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith("Processing batch images...");
    });
  });
});
