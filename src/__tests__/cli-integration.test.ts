/**
 * @fileoverview CLI integration tests with real execution
 * @lastmodified 2025-08-01T06:00:00Z
 *
 * Features: CLI integration tests
 * Main APIs: CLI commands via child_process
 * Constraints: Requires ts-node
 * Patterns: Integration testing
 */

import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs/promises";

describe("CLI Integration", () => {
  const cliPath = path.join(__dirname, "..", "cli.ts");
  const fixturesDir = path.join(__dirname, "fixtures");
  const outputDir = path.join(__dirname, "output");

  beforeAll(async () => {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Create test images if they don't exist
    if (
      !(await fs
        .access(fixturesDir)
        .then(() => true)
        .catch(() => false))
    ) {
      await fs.mkdir(fixturesDir, { recursive: true });
    }
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

  it("should show help when no command is provided", async () => {
    const result = await runCLI([]);
    expect(result.stdout).toContain("auto-image-diff");
    expect(result.stdout).toContain("Commands:");
  });

  it("should show version", async () => {
    const result = await runCLI(["--version"]);
    expect(result.stdout.trim()).toContain("0.1.0");
  });

  it("should show help for align command", async () => {
    const result = await runCLI(["align", "--help"]);
    expect(result.stdout).toContain("Align two images");
    expect(result.stdout).toContain("--method");
  });

  it("should show help for diff command", async () => {
    const result = await runCLI(["diff", "--help"]);
    expect(result.stdout).toContain("Generate visual diff");
    expect(result.stdout).toContain("--threshold");
  });

  it("should show help for compare command", async () => {
    const result = await runCLI(["compare", "--help"]);
    expect(result.stdout).toContain("Full comparison");
    expect(result.stdout).toContain("--json");
  });

  it("should show help for batch command", async () => {
    const result = await runCLI(["batch", "--help"]);
    expect(result.stdout).toContain("Process multiple");
    expect(result.stdout).toContain("--pattern");
  });

  it("should handle invalid commands", async () => {
    const result = await runCLI(["invalid-command"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("error");
  });

  it("should handle missing arguments for align", async () => {
    const result = await runCLI(["align"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("error");
  });

  it("should handle missing arguments for diff", async () => {
    const result = await runCLI(["diff"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("error");
  });

  it("should handle missing arguments for compare", async () => {
    const result = await runCLI(["compare"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("error");
  });

  it("should handle missing arguments for batch", async () => {
    const result = await runCLI(["batch"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("error");
  });
});
