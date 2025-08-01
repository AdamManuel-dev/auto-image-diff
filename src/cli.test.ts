/**
 * @fileoverview Direct CLI tests
 * @lastmodified 2025-08-01T06:00:00Z
 *
 * Features: CLI execution tests
 * Main APIs: CLI commands
 * Constraints: Tests actual CLI behavior
 * Patterns: Jest, async tests
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";

const execAsync = promisify(exec);

describe("CLI Direct Tests", () => {
  const cliPath = path.join(__dirname, "cli.ts");

  it("should show help", async () => {
    const { stdout } = await execAsync(`npx ts-node ${cliPath} --help`);
    expect(stdout).toContain("auto-image-diff");
    expect(stdout).toContain("align");
    expect(stdout).toContain("diff");
    expect(stdout).toContain("compare");
    expect(stdout).toContain("batch");
  });

  it("should show version", async () => {
    const { stdout } = await execAsync(`npx ts-node ${cliPath} --version`);
    expect(stdout.trim()).toBe("0.1.0");
  });

  it("should show align help", async () => {
    const { stdout } = await execAsync(`npx ts-node ${cliPath} align --help`);
    expect(stdout).toContain("Align two images");
    expect(stdout).toContain("--method");
  });

  it("should show diff help", async () => {
    const { stdout } = await execAsync(`npx ts-node ${cliPath} diff --help`);
    expect(stdout).toContain("Generate visual diff");
    expect(stdout).toContain("--threshold");
    expect(stdout).toContain("--color");
  });

  it("should show compare help", async () => {
    const { stdout } = await execAsync(`npx ts-node ${cliPath} compare --help`);
    expect(stdout).toContain("Full comparison");
    expect(stdout).toContain("--json");
  });

  it("should show batch help", async () => {
    const { stdout } = await execAsync(`npx ts-node ${cliPath} batch --help`);
    expect(stdout).toContain("Process multiple");
    expect(stdout).toContain("--pattern");
    expect(stdout).toContain("--parallel");
  });
});
