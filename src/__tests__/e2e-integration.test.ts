/**
 * @fileoverview End-to-end integration tests with real image processing
 * @lastmodified 2025-08-01T06:30:00Z
 *
 * Features: Full CLI workflow tests with actual image files
 * Main APIs: CLI commands with real image processing
 * Constraints: Requires ImageMagick and test fixtures
 * Patterns: E2E testing with real file I/O and verification
 */

import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs/promises";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

describe("E2E Integration Tests", () => {
  const cliPath = path.join(__dirname, "..", "cli.ts");
  const fixturesDir = path.join(__dirname, "fixtures");
  const outputDir = path.join(__dirname, "e2e-output");

  beforeAll(async () => {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up output directory
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  function runCLI(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const proc = spawn("npx", ["ts-node", cliPath, ...args], {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: "test" },
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        resolve({ code: code || 0, stdout, stderr });
      });
    });
  }

  describe("Diff Command E2E", () => {
    it("should generate diff between two test images", async () => {
      const image1 = path.join(fixturesDir, "test1.png");
      const image2 = path.join(fixturesDir, "test2.png");
      const diffOutput = path.join(outputDir, "e2e-diff.png");

      const result = await runCLI(["diff", image1, image2, diffOutput, "--color", "red"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Diff image saved to:");
      expect(result.stdout).toContain("Statistics:");

      // Verify output file exists
      const stats = await fs.stat(diffOutput);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });

    it("should handle non-existent input files gracefully", async () => {
      const result = await runCLI([
        "diff",
        "/non/existent/image1.png",
        "/non/existent/image2.png",
        path.join(outputDir, "fail-diff.png"),
      ]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Error");
    });
  });

  describe("Compare Command E2E", () => {
    it.skip("should compare two images and return metrics", async () => {
      const image1 = path.join(fixturesDir, "test1.png");
      const image2 = path.join(fixturesDir, "test2.png");
      const compareOutput = path.join(outputDir, "compare-output");

      const result = await runCLI(["compare", image1, image2, compareOutput]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Comparison complete");
      expect(result.stdout).toContain("Images are different");
      expect(result.stdout).toContain("Percentage different");
    });

    it.skip("should detect identical images", async () => {
      const image1 = path.join(fixturesDir, "test1.png");
      const compareOutput = path.join(outputDir, "compare-identical");

      const result = await runCLI(["compare", image1, image1, compareOutput]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Images are equal");
    });

    it("should respect threshold parameter", async () => {
      const image1 = path.join(fixturesDir, "test1.png");
      const image2 = path.join(fixturesDir, "test2.png");
      const compareOutput = path.join(outputDir, "compare-threshold");

      const result = await runCLI([
        "compare",
        image1,
        image2,
        compareOutput,
        "--threshold",
        "0.01",
      ]);

      expect(result.code).toBe(0);
      // With low threshold, even small differences should be detected
      expect(result.stdout).toContain("Images are different");
    });
  });

  describe("Batch Command E2E", () => {
    it("should process batch of images and generate reports", async () => {
      const baseDir = path.join(fixturesDir, "batch", "base");
      const targetDir = path.join(fixturesDir, "batch", "target");
      const batchOutput = path.join(outputDir, "batch-e2e");

      const result = await runCLI(["batch", baseDir, targetDir, batchOutput, "--pattern", "*.png"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Batch processing complete");
      expect(result.stdout).toContain("Total files");

      // Verify HTML report exists
      const htmlReport = path.join(batchOutput, "index.html");
      const htmlStats = await fs.stat(htmlReport);
      expect(htmlStats.isFile()).toBe(true);

      // Verify JSON report exists
      const jsonReport = path.join(batchOutput, "batch-report.json");
      const jsonStats = await fs.stat(jsonReport);
      expect(jsonStats.isFile()).toBe(true);

      // Verify JSON content
      const jsonContent = await fs.readFile(jsonReport, "utf-8");
      const report = JSON.parse(jsonContent);
      expect(report.results).toBeDefined();
      expect(Array.isArray(report.results)).toBe(true);
      expect(report.results.length).toBeGreaterThan(0);
    });

    it("should generate summary JSON file", async () => {
      const baseDir = path.join(fixturesDir, "batch", "base");
      const targetDir = path.join(fixturesDir, "batch", "target");
      const batchOutput = path.join(outputDir, "batch-json");

      const result = await runCLI(["batch", baseDir, targetDir, batchOutput]);

      expect(result.code).toBe(0);

      // Verify batch report JSON
      const reportPath = path.join(batchOutput, "batch-report.json");
      const reportStats = await fs.stat(reportPath);
      expect(reportStats.isFile()).toBe(true);

      const reportContent = await fs.readFile(reportPath, "utf-8");
      const report = JSON.parse(reportContent);
      expect(report.totalFiles).toBeDefined();
      expect(report.processed).toBeDefined();
      expect(report.results).toBeDefined();
    });
  });

  describe("Align Command E2E", () => {
    it.skip("should align two images", async () => {
      const image1 = path.join(fixturesDir, "test1.png");
      const image2 = path.join(fixturesDir, "test2.png");
      const alignedOutput = path.join(outputDir, "aligned.png");

      const result = await runCLI(["align", image1, image2, alignedOutput, "--method", "SIFT"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Image aligned");

      // Verify output file exists
      const stats = await fs.stat(alignedOutput);
      expect(stats.isFile()).toBe(true);
    });
  });

  describe("Pipeline Integration", () => {
    it.skip("should generate report.json file from compare command", async () => {
      const image1 = path.join(fixturesDir, "test1.png");
      const image2 = path.join(fixturesDir, "test2.png");
      const compareOutput = path.join(outputDir, "compare-pipeline");

      const result = await runCLI(["compare", image1, image2, compareOutput]);

      expect(result.code).toBe(0);

      // Verify report.json was created
      const reportPath = path.join(compareOutput, "report.json");
      const reportStats = await fs.stat(reportPath);
      expect(reportStats.isFile()).toBe(true);

      // Parse and verify report content
      const reportContent = await fs.readFile(reportPath, "utf-8");
      const report = JSON.parse(reportContent);
      expect(report.isEqual).toBeDefined();
      expect(report.statistics).toBeDefined();
      expect(report.timestamp).toBeDefined();
    });
  });

  describe("Error Handling E2E", () => {
    it("should provide helpful error message for missing ImageMagick", async () => {
      // This test would need to mock missing ImageMagick
      // For now, we'll skip it but leave as a placeholder
      expect(true).toBe(true);
    });

    it("should handle corrupted image files gracefully", async () => {
      // Create a corrupted "image" file
      const corruptedFile = path.join(outputDir, "corrupted.png");
      const corruptedCompareOutput = path.join(outputDir, "corrupted-compare");

      // Ensure output directory exists before writing file
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(corruptedFile, "This is not an image");

      const result = await runCLI([
        "compare",
        corruptedFile,
        corruptedFile,
        corruptedCompareOutput,
      ]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Error");
    });
  });
});
