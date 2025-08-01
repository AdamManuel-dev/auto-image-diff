#!/usr/bin/env node
/* eslint-disable no-console */
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
import { BatchProcessor } from "./lib/batchProcessor";
import * as fs from "fs/promises";
import { parseExclusionFile } from "./lib/exclusions";

const program = new Command();
const imageProcessor = new ImageProcessor();
const batchProcessor = new BatchProcessor();

program
  .name("auto-image-diff")
  .description("Automatically align UI screenshots and generate visual difference reports")
  .version("0.1.0");

program
  .command("align")
  .description("Align two images based on content")
  .argument("<reference>", "Reference image path")
  .argument("<target>", "Target image path to align")
  .argument("<output>", "Output path for aligned image")
  .option("-m, --method <method>", "Alignment method (feature|phase|subimage)", "subimage")
  .action(
    async (
      reference: string,
      target: string,
      output: string,
      options: { method: "feature" | "phase" | "subimage" }
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
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    }
  );

program
  .command("diff")
  .description("Generate visual diff between two images")
  .argument("<image1>", "First image path")
  .argument("<image2>", "Second image path")
  .argument("<output>", "Output path for diff image")
  .option("-c, --color <color>", "Highlight color for differences", "red")
  .option("--no-lowlight", "Disable lowlighting of unchanged areas")
  .option("-e, --exclude <regions>", "Path to exclusions.json file defining regions to ignore")
  .option("-s, --smart", "Run smart classification on differences")
  .action(
    async (
      image1: string,
      image2: string,
      output: string,
      options: { color: string; lowlight: boolean; exclude?: string; smart?: boolean }
    ) => {
      try {
        console.log("Generating visual diff...");
        
        // Load exclusions if provided
        let exclusions;
        if (options.exclude) {
          try {
            const exclusionContent = await fs.readFile(options.exclude, "utf-8");
            exclusions = parseExclusionFile(exclusionContent);
            console.log(`✓ Loaded ${exclusions.regions.length} exclusion regions`);
          } catch (err) {
            console.error(`❌ Error loading exclusions file: ${err instanceof Error ? err.message : String(err)}`);
            process.exit(1);
          }
        }
        
        const result = await imageProcessor.generateDiff(image1, image2, output, {
          highlightColor: options.color,
          lowlight: options.lowlight,
          exclusions,
          runClassification: options.smart,
        });

        console.log(`✅ Diff image saved to: ${output}`);
        console.log(`📊 Statistics:`);
        console.log(`   - Pixels different: ${result.statistics.pixelsDifferent}`);
        console.log(`   - Total pixels: ${result.statistics.totalPixels}`);
        console.log(
          `   - Percentage different: ${result.statistics.percentageDifferent.toFixed(2)}%`
        );
        console.log(`   - Images are ${result.isEqual ? "equal" : "different"}`);
        
        // Output classification results if available
        if (result.classification) {
          console.log(`\n🔍 Classification Results:`);
          console.log(`   - Analyzed regions: ${result.classification.totalRegions}`);
          console.log(`   - Classified: ${result.classification.classifiedRegions}`);
          
          // Show breakdown by type
          const byType = result.classification.byType;
          const typeBreakdown = Object.entries(byType)
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => `${type}: ${count}`)
            .join(", ");
          
          if (typeBreakdown) {
            console.log(`   - Types: ${typeBreakdown}`);
          }
          
          console.log(
            `   - Confidence: min=${result.classification.confidence.min.toFixed(2)}, ` +
            `avg=${result.classification.confidence.avg.toFixed(2)}, ` +
            `max=${result.classification.confidence.max.toFixed(2)}`
          );
        }
      } catch (error) {
        console.error(
          "❌ Error generating diff:",
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    }
  );

program
  .command("compare")
  .description("Align and compare two images (combined operation)")
  .argument("<reference>", "Reference image path")
  .argument("<target>", "Target image path")
  .argument("<output-dir>", "Output directory for results")
  .option("-t, --threshold <threshold>", "Difference threshold percentage", "0.1")
  .option("-c, --color <color>", "Highlight color for differences", "red")
  .option("-e, --exclude <regions>", "Path to exclusions.json file defining regions to ignore")
  .option("-s, --smart", "Run smart classification on differences")
  .action(
    async (
      reference: string,
      target: string,
      outputDir: string,
      options: { threshold: string; color: string; exclude?: string; smart?: boolean }
    ) => {
      try {
        // Ensure output directory exists
        await fs.mkdir(outputDir, { recursive: true });

        // Load exclusions if provided
        let exclusions;
        if (options.exclude) {
          try {
            const exclusionContent = await fs.readFile(options.exclude, "utf-8");
            exclusions = parseExclusionFile(exclusionContent);
            console.log(`✓ Loaded ${exclusions.regions.length} exclusion regions`);
          } catch (err) {
            console.error(`❌ Error loading exclusions file: ${err instanceof Error ? err.message : String(err)}`);
            process.exit(1);
          }
        }

        const alignedPath = path.join(outputDir, "aligned.png");
        const diffPath = path.join(outputDir, "diff.png");

        // Step 1: Align images
        console.log("Step 1/2: Aligning images...");
        await imageProcessor.alignImages(reference, target, alignedPath);
        console.log(`✅ Aligned image saved to: ${alignedPath}`);

        // Step 2: Generate diff
        console.log("Step 2/2: Generating diff...");
        const result = await imageProcessor.generateDiff(reference, alignedPath, diffPath, {
          highlightColor: options.color,
          exclusions,
          runClassification: options.smart,
        });

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
              classification: result.classification,
            },
            null,
            2
          )
        );

        console.log(`✅ Comparison complete!`);
        console.log(`📁 Results saved to: ${outputDir}`);
        console.log(`📊 Summary:`);
        console.log(
          `   - Percentage different: ${result.statistics.percentageDifferent.toFixed(2)}%`
        );
        console.log(`   - Result: Images are ${result.isEqual ? "equal" : "different"}`);
      } catch (error) {
        console.error(
          "❌ Error in comparison:",
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    }
  );

program
  .command("batch")
  .description("Process multiple images in batch mode")
  .argument("<reference-dir>", "Directory containing reference images")
  .argument("<target-dir>", "Directory containing target images")
  .argument("<output-dir>", "Output directory for results")
  .option("-p, --pattern <pattern>", "File pattern to match", "*.png")
  .option("-r, --recursive", "Scan directories recursively", true)
  .option("-t, --threshold <threshold>", "Difference threshold percentage", "0.1")
  .option("--no-parallel", "Disable parallel processing")
  .option("-e, --exclude <regions>", "Path to exclusions.json file defining regions to ignore")
  .option("-s, --smart", "Run smart classification on differences")
  .action(
    async (
      referenceDir: string,
      targetDir: string,
      outputDir: string,
      options: {
        pattern: string;
        recursive: boolean;
        threshold: string;
        parallel: boolean;
        exclude?: string;
        smart?: boolean;
      }
    ) => {
      try {
        console.log("Starting batch processing...");
        console.log(`Reference directory: ${referenceDir}`);
        console.log(`Target directory: ${targetDir}`);
        console.log(`Output directory: ${outputDir}`);

        // Load exclusions if provided
        let exclusions;
        if (options.exclude) {
          try {
            const exclusionContent = await fs.readFile(options.exclude, "utf-8");
            exclusions = parseExclusionFile(exclusionContent);
            console.log(`✓ Loaded ${exclusions.regions.length} exclusion regions`);
          } catch (err) {
            console.error(`❌ Error loading exclusions file: ${err instanceof Error ? err.message : String(err)}`);
            process.exit(1);
          }
        }

        const result = await batchProcessor.processBatch(referenceDir, targetDir, {
          pattern: options.pattern,
          recursive: options.recursive,
          outputDir,
          threshold: parseFloat(options.threshold),
          parallel: options.parallel,
          exclusions,
          runClassification: options.smart,
        });

        console.log("\n✅ Batch processing complete!");
        console.log(`📊 Summary:`);
        console.log(`   - Total files: ${result.totalFiles}`);
        console.log(`   - Processed: ${result.processed}`);
        console.log(`   - Failed: ${result.failed}`);
        console.log(`   - Matching images: ${result.summary.matchingImages}`);
        console.log(`   - Different images: ${result.summary.differentImages}`);
        console.log(`   - Average difference: ${result.summary.averageDifference.toFixed(4)}`);
        console.log(`\n📁 Results saved to: ${outputDir}`);
        console.log(`   - HTML report: ${path.join(outputDir, "index.html")}`);
        console.log(`   - JSON report: ${path.join(outputDir, "batch-report.json")}`);
      } catch (error) {
        console.error(
          "❌ Error in batch processing:",
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    }
  );

program.parse();
