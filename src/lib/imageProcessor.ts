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
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
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
    _options: AlignmentOptions = { method: "subimage" }
  ): Promise<void> {
    try {
      // Use shell command for subimage search
      const cmd = `compare -metric rmse -subimage-search "${referenceImage}" "${targetImage}" null: 2>&1`;

      const offset = { x: 0, y: 0 };
      try {
        await execAsync(cmd);
      } catch (error) {
        // Compare returns non-zero exit when images differ
        // The offset info is in stderr/stdout
        const execError = error as { stdout?: string; stderr?: string };
        const output = execError.stderr || execError.stdout || "";

        // Extract offset from output
        const match = output.match(/@ ([-\d]+),([-\d]+)/);
        if (match) {
          offset.x = parseInt(match[1], 10);
          offset.y = parseInt(match[2], 10);
        }
      }

      // Apply transformation to align images or copy as-is
      if (offset.x !== 0 || offset.y !== 0) {
        // Use convert to apply offset
        const convertCmd = `convert "${targetImage}" -geometry +${offset.x}+${offset.y} "${outputPath}"`;
        await execAsync(convertCmd);
      } else {
        // No offset needed, just copy
        const copyCmd = `cp "${targetImage}" "${outputPath}"`;
        await execAsync(copyCmd);
      }
    } catch (error) {
      throw new Error(`Failed to align images: ${(error as Error).message}`);
    }
  }

  /**
   * Compare two images and generate difference metrics
   */
  async compareImages(
    image1Path: string,
    image2Path: string,
    threshold: number = 0.1
  ): Promise<ComparisonResult> {
    // Use shell command for compare
    const cmd = `compare -metric AE "${image1Path}" "${image2Path}" null: 2>&1`;
    let pixelsDifferent = 0;

    try {
      const { stdout } = await execAsync(cmd);
      pixelsDifferent = parseInt(stdout.trim() || "0", 10);
    } catch (error) {
      // Compare returns non-zero exit when images differ
      // The pixel count is in stdout
      const execError = error as { stdout?: string };
      if (execError.stdout) {
        pixelsDifferent = parseInt(execError.stdout.trim() || "0", 10);
      } else {
        throw error;
      }
    }

    // Get image dimensions using gm
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      imageMagick(image1Path).size((err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const totalPixels = size.width * size.height;
    const percentageDifferent = (pixelsDifferent / totalPixels) * 100;

    return {
      difference: percentageDifferent,
      isEqual: percentageDifferent <= threshold,
      statistics: {
        pixelsDifferent,
        totalPixels,
        percentageDifferent,
      },
    };
  }

  /**
   * Generate a visual diff between two images
   */
  async generateDiff(
    image1Path: string,
    image2Path: string,
    outputPath: string,
    options: { highlightColor?: string; lowlight?: boolean } = {}
  ): Promise<ComparisonResult> {
    const { highlightColor = "red" } = options;

    // Use shell command directly for better compatibility
    const cmd = `compare -highlight-color "${highlightColor}" "${image1Path}" "${image2Path}" "${outputPath}" 2>&1`;

    try {
      await execAsync(cmd);
    } catch (error) {
      // Compare returns non-zero exit code when images differ, which is expected
      // Check if the output file was created
      if (!(await this.fileExists(outputPath))) {
        throw new Error(`Failed to generate diff: ${(error as Error).message}`);
      }
    }

    // Get comparison metrics
    const result = await this.compareImages(image1Path, image2Path);
    result.diffImagePath = outputPath;

    return result;
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
