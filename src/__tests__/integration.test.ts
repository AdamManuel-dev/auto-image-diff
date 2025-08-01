/**
 * @fileoverview Integration tests with actual image processing
 * @lastmodified 2025-08-01T05:00:00Z
 *
 * Features: End-to-end tests with real ImageMagick operations
 * Main APIs: ImageProcessor, BatchProcessor integration tests
 * Constraints: Requires ImageMagick installed
 * Patterns: Integration tests with real file I/O
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import { ImageProcessor } from "../lib/imageProcessor";
import { BatchProcessor } from "../lib/batchProcessor";

describe("Integration Tests", () => {
  const fixturesDir = path.join(__dirname, "fixtures");
  const outputDir = path.join(__dirname, "output");

  beforeAll(() => {
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up output directory
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  describe("ImageProcessor Integration", () => {
    const processor = new ImageProcessor();

    it("should create test images if not exists", async () => {
      // Create simple test images using ImageMagick convert
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const gm = require("gm").subClass({ imageMagick: true });

      const image1Path = path.join(fixturesDir, "test1.png");
      const image2Path = path.join(fixturesDir, "test2.png");

      if (!fs.existsSync(fixturesDir)) {
        fs.mkdirSync(fixturesDir, { recursive: true });
      }

      // Create first test image (red square)
      await new Promise<void>((resolve, reject) => {
        gm(100, 100, "#FF0000").write(image1Path, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Create second test image (red square with blue dot)
      await new Promise<void>((resolve, reject) => {
        gm(100, 100, "#FF0000")
          .fill("#0000FF")
          .drawCircle(50, 50, 55, 55)
          .write(image2Path, (err: any) => {
            if (err) reject(err);
            else resolve();
          });
      });

      expect(fs.existsSync(image1Path)).toBe(true);
      expect(fs.existsSync(image2Path)).toBe(true);
    });

    it.skip("should align two similar images", async () => {
      const image1 = path.join(fixturesDir, "test1.png");
      const image2 = path.join(fixturesDir, "test2.png");
      const aligned = path.join(outputDir, "aligned.png");

      const result = await processor.alignImages(image1, image2, aligned);

      expect(result).toBeDefined();
      expect(fs.existsSync(aligned)).toBe(true);
    });

    it("should generate diff between images", async () => {
      const image1 = path.join(fixturesDir, "test1.png");
      const image2 = path.join(fixturesDir, "test2.png");
      const diff = path.join(outputDir, "diff.png");

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const result = await processor.generateDiff(image1, image2, diff);

      expect(result).toBeDefined();
      expect(result.diffImagePath).toBe(diff);
      expect(result.statistics).toBeDefined();
      expect(result.statistics.pixelsDifferent).toBeGreaterThan(0);
      expect(fs.existsSync(diff)).toBe(true);
    });

    it("should compare images and return metrics", async () => {
      const image1 = path.join(fixturesDir, "test1.png");
      const image2 = path.join(fixturesDir, "test2.png");

      const result = await processor.compareImages(image1, image2);

      expect(result).toBeDefined();
      expect(result.difference).toBeGreaterThan(0);
      expect(result.isEqual).toBe(false);
      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalPixels).toBe(10000); // 100x100
    });
  });

  describe("BatchProcessor Integration", () => {
    it("should process batch of test images", async () => {
      const batchProcessor = new BatchProcessor();

      // Create additional test images for batch processing
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const gm = require("gm").subClass({ imageMagick: true });

      // Create base and target directories
      const batchInputDir = path.join(fixturesDir, "batch");
      const baseDir = path.join(batchInputDir, "base");
      const targetDir = path.join(batchInputDir, "target");

      [batchInputDir, baseDir, targetDir].forEach((dir) => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      // Create test image pairs
      const colors = ["#FF0000", "#00FF00", "#0000FF"];
      const names = ["red", "green", "blue"];

      for (let i = 0; i < colors.length; i++) {
        const basePath = path.join(baseDir, `${names[i]}.png`);
        const targetPath = path.join(targetDir, `${names[i]}.png`);

        // Create base image
        await new Promise<void>((resolve, reject) => {
          gm(50, 50, colors[i]).write(basePath, (err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Create slightly modified target image
        await new Promise<void>((resolve, reject) => {
          gm(50, 50, colors[i])
            .fill("#FFFFFF")
            .drawCircle(25, 25, 30, 30)
            .write(targetPath, (err: any) => {
              if (err) reject(err);
              else resolve();
            });
        });
      }

      // Process batch
      const batchOutput = path.join(outputDir, "batch");

      // Ensure output directory exists
      if (!fs.existsSync(batchOutput)) {
        fs.mkdirSync(batchOutput, { recursive: true });
      }

      const result = await batchProcessor.processBatch(baseDir, targetDir, {
        outputDir: batchOutput,
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);

      // Check HTML report was generated
      const htmlReport = path.join(batchOutput, "index.html");
      expect(fs.existsSync(htmlReport)).toBe(true);

      // Check JSON report was generated
      const jsonReport = path.join(batchOutput, "batch-report.json");
      expect(fs.existsSync(jsonReport)).toBe(true);
    });
  });
});
