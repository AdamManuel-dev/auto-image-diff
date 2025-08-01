/**
 * @fileoverview ImageMagick-based image processing module
 * @lastmodified 2025-08-01T03:55:00Z
 *
 * Features: Image alignment, comparison, diff generation using ImageMagick
 * Main APIs: alignImages(), compareImages(), generateDiff()
 * Constraints: Requires ImageMagick installed on system
 * Patterns: Async/await, error handling, TypeScript types
 */

import * as gm from "gm";
import * as fs from "fs/promises";

const imageMagick = gm.subClass({ imageMagick: true });

export interface ComparisonResult {
  difference: number;
  diffImagePath?: string;
  isEqual: boolean;
  statistics: {
    pixelsDifferent: number;
    totalPixels: number;
    percentageDifferent: number;
  };
}

export interface AlignmentOptions {
  method: "feature" | "phase" | "subimage";
  threshold?: number;
}

export class ImageProcessor {
  /**
   * Align two images using ImageMagick's subimage search
   */
  async alignImages(
    referenceImage: string,
    targetImage: string,
    outputPath: string,
    _options: AlignmentOptions = { method: "subimage" },
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      imageMagick(referenceImage).compare(
        targetImage,
        {
          metric: "rmse",
          subimage_search: true,
        },
        (err: unknown, _isEqual: unknown, _equality: unknown, raw: unknown) => {
          if (err && !(raw as string).includes("@ ")) {
            reject(err);
            return;
          }

          // Extract offset from raw output
          const match = (raw as string).match(/@ ([-\d]+),([-\d]+)/);
          if (match) {
            const offsetX = parseInt(match[1], 10);
            const offsetY = parseInt(match[2], 10);

            // Apply transformation to align images
            imageMagick(targetImage)
              .geometry(`+${offsetX}+${offsetY}`)
              .write(outputPath, (writeErr) => {
                if (writeErr) reject(writeErr);
                else resolve();
              });
          } else {
            // No offset found, copy as-is
            imageMagick(targetImage).write(outputPath, (writeErr) => {
              if (writeErr) reject(writeErr);
              else resolve();
            });
          }
        },
      );
    });
  }

  /**
   * Compare two images and generate difference metrics
   */
  async compareImages(
    image1Path: string,
    image2Path: string,
    threshold: number = 0.1,
  ): Promise<ComparisonResult> {
    return new Promise((resolve, reject) => {
      imageMagick(image1Path).compare(
        image2Path,
        { metric: "AE" },
        (err: unknown, _isEqual: unknown, equality: unknown, raw: unknown) => {
          if (err && !raw) {
            reject(err);
            return;
          }

          const pixelsDifferent = parseInt((raw as string) || "0", 10);

          // Get image dimensions
          imageMagick(image1Path).size((sizeErr, size) => {
            if (sizeErr) {
              reject(sizeErr);
              return;
            }

            const totalPixels = size.width * size.height;
            const percentageDifferent = (pixelsDifferent / totalPixels) * 100;

            resolve({
              difference: (equality as number) || 0,
              isEqual: percentageDifferent <= threshold,
              statistics: {
                pixelsDifferent,
                totalPixels,
                percentageDifferent,
              },
            });
          });
        },
      );
    });
  }

  /**
   * Generate a visual diff between two images
   */
  async generateDiff(
    image1Path: string,
    image2Path: string,
    outputPath: string,
    options: { highlightColor?: string; lowlight?: boolean } = {},
  ): Promise<ComparisonResult> {
    const { highlightColor = "red", lowlight = true } = options;

    return new Promise((resolve, reject) => {
      const diffPath = outputPath;

      imageMagick(image1Path).compare(
        image2Path,
        {
          file: diffPath,
          highlightColor,
          lowlight,
        },
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        async (
          err: unknown,
          _isEqual: unknown,
          _equality: unknown,
          _raw: unknown,
        ) => {
          if (err && !(await this.fileExists(diffPath))) {
            reject(err);
            return;
          }

          // Get comparison metrics
          const result = await this.compareImages(image1Path, image2Path);
          result.diffImagePath = diffPath;

          resolve(result);
        },
      );
    });
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
