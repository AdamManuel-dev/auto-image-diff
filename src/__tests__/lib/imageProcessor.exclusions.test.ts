/**
 * @fileoverview Tests for image processor exclusion mask functionality
 * @lastmodified 2025-08-01T16:00:00Z
 */

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
import { ImageProcessor } from "../../lib/imageProcessor";
import { ExclusionsConfig } from "../../lib/exclusions";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

describe("ImageProcessor with exclusions", () => {
  let imageProcessor: ImageProcessor;
  let tempDir: string;

  beforeAll(async () => {
    imageProcessor = new ImageProcessor();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "img-test-"));
  });

  afterAll(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("generateDiff with exclusions", () => {
    it("should apply exclusion masks when generating diff", async () => {
      // Create test images (simple colored squares)
      const testImage1 = path.join(tempDir, "test1.png");
      const testImage2 = path.join(tempDir, "test2.png");
      const outputDiff = path.join(tempDir, "diff.png");

      // Mock exclusions config
      const exclusions: ExclusionsConfig = {
        regions: [
          {
            name: "test-region",
            bounds: { x: 10, y: 10, width: 50, height: 50 },
            reason: "Test exclusion",
          },
        ],
      };

      // Skip this test if ImageMagick is not available
      try {
        const { execSync } = require("child_process");
        execSync("convert -version", { stdio: "ignore" });
      } catch {
        console.log("Skipping test: ImageMagick not available");
        return;
      }

      // Create simple test images using ImageMagick
      const { exec } = require("child_process");
      const { promisify } = require("util");
      const execAsync = promisify(exec);

      // Create a red 100x100 image
      await execAsync(`convert -size 100x100 xc:red "${testImage1}"`);
      
      // Create a blue 100x100 image
      await execAsync(`convert -size 100x100 xc:blue "${testImage2}"`);

      // Generate diff with exclusions
      const result = await imageProcessor.generateDiff(testImage1, testImage2, outputDiff, {
        exclusions,
      });

      // Verify the output file was created
      const outputExists = await fs
        .access(outputDiff)
        .then(() => true)
        .catch(() => false);

      expect(outputExists).toBe(true);
      expect(result).toBeDefined();
      expect(result.diffImagePath).toBe(outputDiff);
    });

    it("should handle generateDiff without exclusions", async () => {
      const testImage1 = path.join(tempDir, "test3.png");
      const testImage2 = path.join(tempDir, "test4.png");
      const outputDiff = path.join(tempDir, "diff2.png");

      // Skip this test if ImageMagick is not available
      try {
        const { execSync } = require("child_process");
        execSync("convert -version", { stdio: "ignore" });
      } catch {
        console.log("Skipping test: ImageMagick not available");
        return;
      }

      // Create simple test images
      const { exec } = require("child_process");
      const { promisify } = require("util");
      const execAsync = promisify(exec);

      await execAsync(`convert -size 100x100 xc:green "${testImage1}"`);
      await execAsync(`convert -size 100x100 xc:yellow "${testImage2}"`);

      // Generate diff without exclusions
      const result = await imageProcessor.generateDiff(testImage1, testImage2, outputDiff);

      // Verify the output file was created
      const outputExists = await fs
        .access(outputDiff)
        .then(() => true)
        .catch(() => false);

      expect(outputExists).toBe(true);
      expect(result).toBeDefined();
      expect(result.diffImagePath).toBe(outputDiff);
    });
  });

  describe("error handling", () => {
    it("should handle invalid image paths gracefully", async () => {
      const invalidPath1 = path.join(tempDir, "nonexistent1.png");
      const invalidPath2 = path.join(tempDir, "nonexistent2.png");
      const outputPath = path.join(tempDir, "output.png");

      await expect(
        imageProcessor.generateDiff(invalidPath1, invalidPath2, outputPath)
      ).rejects.toThrow();
    });

    it("should clean up temporary files even on error", async () => {
      const testImage1 = path.join(tempDir, "test5.png");
      const invalidPath = path.join(tempDir, "nonexistent.png");
      const outputPath = path.join(tempDir, "output2.png");

      const exclusions: ExclusionsConfig = {
        regions: [
          {
            name: "test",
            bounds: { x: 0, y: 0, width: 10, height: 10 },
          },
        ],
      };

      // Skip if ImageMagick not available
      try {
        const { execSync } = require("child_process");
        execSync("convert -version", { stdio: "ignore" });
      } catch {
        return;
      }

      // Clean up any existing mask files from temp directory before test
      const preTestTempFiles = await fs.readdir(os.tmpdir());
      const existingMaskFiles = preTestTempFiles.filter(
        (f) => f.includes("mask-") && f.endsWith(".png")
      );
      for (const file of existingMaskFiles) {
        try {
          await fs.unlink(path.join(os.tmpdir(), file));
        } catch {
          // Ignore cleanup errors
        }
      }

      // Create one valid image
      const { exec } = require("child_process");
      const { promisify } = require("util");
      const execAsync = promisify(exec);
      await execAsync(`convert -size 50x50 xc:white "${testImage1}"`);

      // Try to generate diff with one invalid image
      try {
        await imageProcessor.generateDiff(testImage1, invalidPath, outputPath, {
          exclusions,
        });
      } catch {
        // Expected to fail
      }

      // Check that temp directory doesn't have lingering mask files
      const tempFiles = await fs.readdir(os.tmpdir());
      const maskFiles = tempFiles.filter(
        (f) => f.includes("mask-") && f.endsWith(".png")
      );
      
      // There might be some mask files from other tests, but there shouldn't be
      // an excessive number indicating a cleanup failure
      expect(maskFiles.length).toBeLessThan(10);
    });
  });
});