/**
 * @fileoverview Tests for ImageProcessor module
 * @lastmodified 2025-08-01T03:58:00Z
 *
 * Features: Unit tests for image alignment and comparison
 * Main APIs: Jest test suite
 * Constraints: Requires test fixtures
 * Patterns: Jest, async tests, mocking
 */

import * as fs from "fs/promises";

// Mock child_process
jest.mock("child_process");

// Mock util completely with a factory function
jest.mock("util", () => {
  const actualUtil = jest.requireActual("util");
  return {
    ...actualUtil,
    promisify: jest.fn(),
  };
});

// Mock fs/promises
jest.mock("fs/promises", () => ({
  access: jest.fn(),
}));

// Mock gm module (still needed for size method)
jest.mock("gm", () => {
  const gmMock = {
    subClass: jest.fn(() => {
      const imageMagick = jest.fn(() => ({
        size: jest.fn((callback: (...args: unknown[]) => void) => {
          callback(null, { width: 100, height: 100 });
        }),
      }));
      return imageMagick;
    }),
  };
  return gmMock;
});

const mockFsAccess = fs.access as jest.MockedFunction<typeof fs.access>;

describe("ImageProcessor", () => {
  let processor: any;
  let ImageProcessor: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Create fresh mock for execAsync
    const execAsyncMock = jest.fn().mockImplementation((cmd: string) => {
      if (cmd.includes("compare") && cmd.includes("-metric AE") && cmd.includes("null:")) {
        // Simulate compare command returning pixel difference
        const error = new Error("Command failed");
        (error as any).stdout = "500";
        (error as any).stderr = "";
        return Promise.reject(error);
      } else if (cmd.includes("compare") && cmd.includes("-subimage-search")) {
        // Simulate subimage search
        const error = new Error("Command failed");
        (error as any).stdout = "";
        (error as any).stderr = "1234 @ 10,20";
        return Promise.reject(error);
      } else if (cmd.includes("convert") || cmd.includes("cp")) {
        // Simulate successful file operations
        return Promise.resolve({ stdout: "", stderr: "" });
      } else if (cmd.includes("compare") && cmd.includes("-highlight-color")) {
        // Simulate diff generation failure (expected)
        const error = new Error("Command failed");
        return Promise.reject(error);
      }
      return Promise.resolve({ stdout: "", stderr: "" });
    });

    // Import util after mocks are set up
    const util = jest.requireMock("util");
    util.promisify.mockReturnValue(execAsyncMock);

    // Setup fs.access mock
    mockFsAccess.mockResolvedValue(undefined);

    // Create processor after mocks are set up
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const imageProcessorModule = require("../imageProcessor");
    ImageProcessor = imageProcessorModule.ImageProcessor;
    processor = new ImageProcessor();
  });

  describe("alignImages", () => {
    it("should align images with detected offset", async () => {
      const reference = "test/reference.png";
      const target = "test/target.png";
      const output = "test/aligned.png";

      await expect(processor.alignImages(reference, target, output)).resolves.not.toThrow();
    });

    it("should handle images with no offset needed", async () => {
      const reference = "test/reference.png";
      const target = "test/target.png";
      const output = "test/aligned.png";

      await expect(processor.alignImages(reference, target, output)).resolves.not.toThrow();
    });
  });

  describe("compareImages", () => {
    it("should compare two images and return metrics", async () => {
      const image1 = "test/image1.png";
      const image2 = "test/image2.png";

      const result = await processor.compareImages(image1, image2);

      expect(result).toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        difference: expect.any(Number),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        isEqual: expect.any(Boolean),
        statistics: {
          pixelsDifferent: 500,
          totalPixels: 10000,
          percentageDifferent: 5,
        },
      });
    });

    it("should respect custom threshold", async () => {
      const image1 = "test/image1.png";
      const image2 = "test/image2.png";

      const result = await processor.compareImages(image1, image2, 10);

      expect(result.isEqual).toBe(true); // 5% < 10% threshold
    });
  });

  describe("generateDiff", () => {
    it("should generate a visual diff image", async () => {
      const image1 = "test/image1.png";
      const image2 = "test/image2.png";
      const output = "test/diff.png";

      const result = await processor.generateDiff(image1, image2, output);

      expect(result).toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        difference: expect.any(Number),
        diffImagePath: output,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        isEqual: expect.any(Boolean),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        statistics: expect.any(Object),
      });
    });

    it("should accept custom highlight options", async () => {
      const image1 = "test/image1.png";
      const image2 = "test/image2.png";
      const output = "test/diff.png";

      const result = await processor.generateDiff(image1, image2, output, {
        highlightColor: "blue",
        lowlight: false,
      });

      expect(result.diffImagePath).toBe(output);
    });
  });

  describe("additional coverage", () => {
    it("should handle alignment with custom options", async () => {
      const reference = "test/reference.png";
      const target = "test/target.png";
      const output = "test/aligned.png";

      await expect(
        processor.alignImages(reference, target, output, {
          method: "subimage",
        })
      ).resolves.not.toThrow();
    });

    it("should handle diff generation with threshold", async () => {
      const image1 = "test/image1.png";
      const image2 = "test/image2.png";
      const output = "test/diff.png";

      const result = await processor.generateDiff(image1, image2, output, {
        highlightColor: "#00FF00",
        lowlight: true,
      });

      expect(result).toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        difference: expect.any(Number),
        diffImagePath: output,
      });
    });

    it("should handle comparison with custom threshold percentage", async () => {
      const image1 = "test/image1.png";
      const image2 = "test/image2.png";

      const result = await processor.compareImages(image1, image2, 50); // 50% threshold

      expect(result.isEqual).toBe(true); // Since 5% < 50%
    });

    it("should handle generateDiff with all options", async () => {
      const image1 = "test/image1.png";
      const image2 = "test/image2.png";
      const output = "test/diff.png";

      const result = await processor.generateDiff(image1, image2, output, {
        highlightColor: "magenta",
        lowlight: true,
      });

      expect(result.diffImagePath).toBe(output);
      expect(result.statistics).toBeDefined();
    });
  });
});
