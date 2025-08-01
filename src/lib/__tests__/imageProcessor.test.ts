/**
 * @fileoverview Tests for ImageProcessor module
 * @lastmodified 2025-08-01T03:58:00Z
 *
 * Features: Unit tests for image alignment and comparison
 * Main APIs: Jest test suite
 * Constraints: Requires test fixtures
 * Patterns: Jest, async tests, mocking
 */

import { ImageProcessor } from "../imageProcessor";

// Mock gm module
jest.mock("gm", () => {
  const gmMock = {
    subClass: jest.fn(() => {
      const imageMagick = jest.fn(() => ({
        compare: jest.fn(
          (
            _targetImage: unknown,
            options: Record<string, unknown>,
            callback: (...args: unknown[]) => void,
          ) => {
            // Simulate successful comparison
            if (options.subimage_search) {
              callback(null, false, 0.05, "1234 @ 10,20");
            } else if (options.metric === "AE") {
              callback(null, false, 0.05, "500");
            } else {
              callback(null, false, 0.05, "");
            }
          },
        ),
        geometry: jest.fn(() => ({
          write: jest.fn(
            (_outputPath: unknown, callback: (...args: unknown[]) => void) => {
              callback(null);
            },
          ),
        })),
        write: jest.fn(
          (_outputPath: unknown, callback: (...args: unknown[]) => void) => {
            callback(null);
          },
        ),
        size: jest.fn((callback: (...args: unknown[]) => void) => {
          callback(null, { width: 100, height: 100 });
        }),
      }));
      return imageMagick;
    }),
  };
  return gmMock;
});

describe("ImageProcessor", () => {
  let processor: ImageProcessor;

  beforeEach(() => {
    processor = new ImageProcessor();
  });

  describe("alignImages", () => {
    it("should align images with detected offset", async () => {
      const reference = "test/reference.png";
      const target = "test/target.png";
      const output = "test/aligned.png";

      await expect(
        processor.alignImages(reference, target, output),
      ).resolves.not.toThrow();
    });

    it("should handle images with no offset needed", async () => {
      const reference = "test/reference.png";
      const target = "test/target.png";
      const output = "test/aligned.png";

      await expect(
        processor.alignImages(reference, target, output),
      ).resolves.not.toThrow();
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
});
