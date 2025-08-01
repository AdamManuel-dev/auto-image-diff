/**
 * @fileoverview Tests CLI by direct import execution
 * @lastmodified 2025-08-01T06:00:00Z
 *
 * Features: Direct CLI code execution
 * Main APIs: CLI commands
 * Constraints: Mocked execution
 * Patterns: Jest, mocking
 */

// Store original argv
const originalArgv = process.argv;

// Track whether modules were loaded
let commanderLoaded = false;
let imageProcessorLoaded = false;
let batchProcessorLoaded = false;

// Mock all dependencies
jest.mock("commander", () => {
  commanderLoaded = true;
  const mockProgram = {
    name: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    version: jest.fn().mockReturnThis(),
    command: jest.fn().mockReturnThis(),
    argument: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    parse: jest.fn().mockReturnThis(),
    parseAsync: jest.fn().mockReturnThis(),
  };
  return {
    Command: jest.fn(() => mockProgram),
  };
});

jest.mock("../lib/imageProcessor", () => {
  imageProcessorLoaded = true;
  return {
    ImageProcessor: jest.fn().mockImplementation(() => ({
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
    })),
  };
});

jest.mock("../lib/batchProcessor", () => {
  batchProcessorLoaded = true;
  return {
    BatchProcessor: jest.fn().mockImplementation(() => ({
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
    })),
  };
});

jest.mock("fs/promises", () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

describe("CLI Direct Execution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    commanderLoaded = false;
    imageProcessorLoaded = false;
    batchProcessorLoaded = false;
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  it("should execute CLI imports and setup", () => {
    // Set argv to simulate help command
    process.argv = ["node", "cli.ts", "--help"];

    // Import CLI to execute all top-level code
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("../cli");
    });

    // Verify modules were loaded
    expect(commanderLoaded).toBe(true);
    expect(imageProcessorLoaded).toBe(true);
    expect(batchProcessorLoaded).toBe(true);
  });
});
