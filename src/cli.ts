#!/usr/bin/env node
/**
 * @fileoverview CLI interface for auto-image-diff
 * @lastmodified 2025-08-01T03:56:00Z
 *
 * Features: Command-line interface for image alignment and comparison
 * Main APIs: align, diff, compare commands
 * Constraints: Requires ImageMagick installed on system
 * Patterns: Commander.js CLI pattern, async command handlers
 */

import { Command } from "commander";
import * as path from "path";
import { ImageProcessor } from "./lib/imageProcessor";
import * as fs from "fs/promises";

const program = new Command();
const imageProcessor = new ImageProcessor();

program
  .name("auto-image-diff")
  .description(
    "Automatically align UI screenshots and generate visual difference reports",
  )
  .version("0.1.0");

program
  .command("align")
  .description("Align two images based on content")
  .argument("<reference>", "Reference image path")
  .argument("<target>", "Target image path to align")
  .argument("<output>", "Output path for aligned image")
  .option(
    "-m, --method <method>",
    "Alignment method (feature|phase|subimage)",
    "subimage",
  )
  .action(
    async (
      reference: string,
      target: string,
      output: string,
      options: { method: "feature" | "phase" | "subimage" },
    ) => {
      try {
        console.log("Aligning images...");
        await imageProcessor.alignImages(reference, target, output, {
          method: options.method,
        });
        console.log(`✅ Aligned image saved to: ${output}`);
      } catch (error) {
        console.error(
          "❌ Error aligning images:",
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );

program
  .command("diff")
  .description("Generate visual diff between two images")
  .argument("<image1>", "First image path")
  .argument("<image2>", "Second image path")
  .argument("<output>", "Output path for diff image")
  .option("-c, --color <color>", "Highlight color for differences", "red")
  .option("--no-lowlight", "Disable lowlighting of unchanged areas")
  .action(
    async (
      image1: string,
      image2: string,
      output: string,
      options: { color: string; lowlight: boolean },
    ) => {
      try {
        console.log("Generating visual diff...");
        const result = await imageProcessor.generateDiff(
          image1,
          image2,
          output,
          {
            highlightColor: options.color,
            lowlight: options.lowlight,
          },
        );

        console.log(`✅ Diff image saved to: ${output}`);
        console.log(`📊 Statistics:`);
        console.log(
          `   - Pixels different: ${result.statistics.pixelsDifferent}`,
        );
        console.log(`   - Total pixels: ${result.statistics.totalPixels}`);
        console.log(
          `   - Percentage different: ${result.statistics.percentageDifferent.toFixed(2)}%`,
        );
        console.log(
          `   - Images are ${result.isEqual ? "equal" : "different"}`,
        );
      } catch (error) {
        console.error(
          "❌ Error generating diff:",
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );

program
  .command("compare")
  .description("Align and compare two images (combined operation)")
  .argument("<reference>", "Reference image path")
  .argument("<target>", "Target image path")
  .argument("<output-dir>", "Output directory for results")
  .option(
    "-t, --threshold <threshold>",
    "Difference threshold percentage",
    "0.1",
  )
  .option("-c, --color <color>", "Highlight color for differences", "red")
  .action(
    async (
      reference: string,
      target: string,
      outputDir: string,
      options: { threshold: string; color: string },
    ) => {
      try {
        // Ensure output directory exists
        await fs.mkdir(outputDir, { recursive: true });

        const alignedPath = path.join(outputDir, "aligned.png");
        const diffPath = path.join(outputDir, "diff.png");

        // Step 1: Align images
        console.log("Step 1/2: Aligning images...");
        await imageProcessor.alignImages(reference, target, alignedPath);
        console.log(`✅ Aligned image saved to: ${alignedPath}`);

        // Step 2: Generate diff
        console.log("Step 2/2: Generating diff...");
        const result = await imageProcessor.generateDiff(
          reference,
          alignedPath,
          diffPath,
          {
            highlightColor: options.color,
          },
        );

        // Save comparison report
        const reportPath = path.join(outputDir, "report.json");
        await fs.writeFile(
          reportPath,
          JSON.stringify(
            {
              reference,
              target,
              aligned: alignedPath,
              diff: diffPath,
              statistics: result.statistics,
              isEqual: result.isEqual,
              threshold: parseFloat(options.threshold),
              timestamp: new Date().toISOString(),
            },
            null,
            2,
          ),
        );

        console.log(`✅ Comparison complete!`);
        console.log(`📁 Results saved to: ${outputDir}`);
        console.log(`📊 Summary:`);
        console.log(
          `   - Percentage different: ${result.statistics.percentageDifferent.toFixed(2)}%`,
        );
        console.log(
          `   - Result: Images are ${result.isEqual ? "equal" : "different"}`,
        );
      } catch (error) {
        console.error(
          "❌ Error in comparison:",
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );

program.parse();
