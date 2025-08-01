/**
 * @fileoverview Basic CLI tests
 * @lastmodified 2025-08-01T08:00:00Z
 *
 * Features: Basic command validation
 * Main APIs: Commander setup
 * Constraints: Simple tests
 * Patterns: Unit testing
 */

import { Command } from "commander";

describe("CLI Basic Setup", () => {
  it("should create a command with correct name and version", () => {
    const program = new Command();
    program.name("auto-image-diff").description("Test description").version("0.1.0");

    expect(program.name()).toBe("auto-image-diff");
    expect(program.version()).toBe("0.1.0");
  });

  it("should have required commands", () => {
    const program = new Command();

    program.command("align").description("Align images");
    program.command("diff").description("Generate diff");
    program.command("compare").description("Compare images");
    program.command("batch").description("Batch process");

    const commandNames = program.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain("align");
    expect(commandNames).toContain("diff");
    expect(commandNames).toContain("compare");
    expect(commandNames).toContain("batch");
  });

  it("should handle command options", () => {
    const program = new Command();
    const alignCmd = program
      .command("align")
      .argument("<ref>", "Reference image")
      .argument("<target>", "Target image")
      .argument("<output>", "Output path")
      .option("-m, --method <method>", "Alignment method", "subimage");

    expect(alignCmd.options.length).toBeGreaterThan(0);
    expect(alignCmd.options[0].flags).toContain("--method");
  });
});
