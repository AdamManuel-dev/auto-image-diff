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
import { SmartReportGenerator } from "./lib/smart-report-generator";

const program = new Command();
const imageProcessor = new ImageProcessor();
const batchProcessor = new BatchProcessor();

program
  .name("auto-image-diff")
  .description("Automatically align UI screenshots and generate visual difference reports")
  .version("0.1.0");

// Helper function to generate recommendations based on classification
function generateRecommendation(
  classification: import("./lib/classifiers/manager").ClassificationSummary
): string {
  const { byType, confidence } = classification;

  // If confidence is low, suggest manual review
  if (confidence.avg < 0.5) {
    return "Low confidence in classification. Manual review recommended.";
  }

  // Get the dominant change type
  const dominantType = Object.entries(byType)
    .filter(([type]) => type !== "unknown")
    .sort(([, a], [, b]) => b - a)[0];

  if (!dominantType || dominantType[1] === 0) {
    return "No significant changes detected.";
  }

  const [type] = dominantType;

  switch (type) {
    case "content":
      return "Content changes detected. Review text and image updates.";
    case "style":
      return "Style changes detected. Check CSS and theme modifications.";
    case "layout":
      return "Layout shifts detected. Verify responsive design and positioning.";
    case "size":
      return "Size changes detected. Check scaling and dimension adjustments.";
    case "structural":
      return "Structural changes detected. Review DOM modifications.";
    case "new_element":
      return "New elements detected. Verify feature additions.";
    case "removed_element":
      return "Elements removed. Check for missing functionality.";
    default:
      return "Changes detected. Manual review recommended.";
  }
}

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
  .option("--smart-diff", "Generate detailed smart diff report with classifications")
  .option(
    "-f, --focus <types>",
    "Focus on specific change types (comma-separated: content,style,layout,size,structural)"
  )
  .option("--suggest-css", "Generate CSS fix suggestions for style and layout changes")
  .option(
    "--css-selector <selector>",
    "CSS selector to use in fix suggestions (default: element class/id)"
  )
  .option("--embed-metadata", "Embed comparison metadata into PNG output")
  .action(
    async (
      image1: string,
      image2: string,
      output: string,
      options: {
        color: string;
        lowlight: boolean;
        exclude?: string;
        smart?: boolean;
        smartDiff?: boolean;
        focus?: string;
        suggestCss?: boolean;
        cssSelector?: string;
        embedMetadata?: boolean;
      }
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
            console.error(
              `❌ Error loading exclusions file: ${err instanceof Error ? err.message : String(err)}`
            );
            process.exit(1);
          }
        }

        const result = await imageProcessor.generateDiff(image1, image2, output, {
          highlightColor: options.color,
          lowlight: options.lowlight,
          exclusions,
          runClassification: options.smart || options.smartDiff || options.suggestCss,
          suggestCssFixes: options.suggestCss,
          cssSelector: options.cssSelector,
          embedMetadata: options.embedMetadata,
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
          let classification = result.classification;

          // Apply focus filter if specified
          if (options.focus) {
            const focusTypes = options.focus.split(",").map((t) => t.trim().toLowerCase());
            const filteredRegions = classification.regions.filter((r) =>
              focusTypes.includes(r.classification.type.toLowerCase())
            );

            // Recalculate statistics for filtered regions
            classification = {
              ...classification,
              regions: filteredRegions,
              classifiedRegions: filteredRegions.length,
              byType: Object.fromEntries(
                Object.entries(classification.byType).map(([type, _]) => [
                  type,
                  filteredRegions.filter(
                    (r) =>
                      r.classification.type ===
                      (type as import("./lib/classifiers/base").DifferenceType)
                  ).length,
                ])
              ) as Record<import("./lib/classifiers/base").DifferenceType, number>,
            };

            console.log(`\n🎯 Focused on: ${focusTypes.join(", ")}`);
          }

          console.log(`\n🔍 Classification Results:`);
          console.log(`   - Analyzed regions: ${classification.totalRegions}`);
          console.log(`   - Classified: ${classification.classifiedRegions}`);

          // Show breakdown by type
          const byType = classification.byType;
          const typeBreakdown = Object.entries(byType)
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => `${type}: ${count}`)
            .join(", ");

          if (typeBreakdown) {
            console.log(`   - Types: ${typeBreakdown}`);
          }

          console.log(
            `   - Confidence: min=${classification.confidence.min.toFixed(2)}, ` +
              `avg=${classification.confidence.avg.toFixed(2)}, ` +
              `max=${classification.confidence.max.toFixed(2)}`
          );
        }

        // Output CSS suggestions if available
        if (result.cssSuggestions && result.cssSuggestions.length > 0) {
          console.log(`\n🎨 CSS Fix Suggestions:`);
          const cssFixSuggester = new (await import("./lib/css-fix-suggester")).CssFixSuggester();

          // Group by priority
          const byPriority = {
            high: result.cssSuggestions.filter((s) => s.priority === "high"),
            medium: result.cssSuggestions.filter((s) => s.priority === "medium"),
            low: result.cssSuggestions.filter((s) => s.priority === "low"),
          };

          ["high", "medium", "low"].forEach((priority) => {
            const suggestions = byPriority[priority as keyof typeof byPriority];
            if (suggestions.length > 0) {
              console.log(`\n   ${priority.toUpperCase()} Priority:`);
              suggestions.forEach((suggestion) => {
                console.log(`   - ${suggestion.description}`);
                suggestion.fixes.forEach((fix) => {
                  console.log(`     • ${fix.property}: ${fix.newValue}`);
                });
              });
            }
          });

          // Save CSS suggestions to file
          const cssPath = output.replace(/\.[^.]+$/, "-fixes.css");
          const cssContent = cssFixSuggester.formatAsCss(result.cssSuggestions);
          await fs.writeFile(cssPath, cssContent);
          console.log(`\n💾 CSS suggestions saved to: ${cssPath}`);
        }

        // Generate detailed smart diff report if requested
        if (options.smartDiff && result.classification) {
          const reportPath = output.replace(/\.[^.]+$/, "-smart-report.json");
          const smartReport = {
            metadata: {
              image1,
              image2,
              diffImage: output,
              timestamp: new Date().toISOString(),
              version: "1.0",
            },
            statistics: result.statistics,
            classification: result.classification,
            regions: result.classification.regions.map((r) => ({
              id: r.region.id,
              bounds: r.region.bounds,
              type: r.classification.type,
              confidence: r.classification.confidence,
              classifier: r.classifier,
              details: r.classification.details,
            })),
            summary: {
              hasSignificantChanges: result.statistics.percentageDifferent > 0.5,
              primaryChangeType:
                Object.entries(result.classification.byType)
                  .filter(([type]) => type !== "unknown")
                  .sort(([, a], [, b]) => b - a)[0]?.[0] || "unknown",
              recommendedAction: generateRecommendation(result.classification),
            },
          };

          await fs.writeFile(reportPath, JSON.stringify(smartReport, null, 2));
          console.log(`\n📄 Smart diff report saved to: ${reportPath}`);

          // Generate HTML report as well
          const htmlReportPath = output.replace(/\.[^.]+$/, "-smart-report.html");
          const reportGenerator = new SmartReportGenerator();
          const htmlReport = reportGenerator.generateSmartReport(
            {
              metadata: {
                image1,
                image2,
                diffImage: output,
                timestamp: new Date().toISOString(),
                version: "1.0",
              },
              statistics: result.statistics,
              classification: result.classification,
              regions: result.classification.regions.map((r) => ({
                id: r.region.id,
                bounds: r.region.bounds,
                type: r.classification.type,
                confidence: r.classification.confidence,
                classifier: r.classifier,
                details: r.classification.details,
              })),
              cssSuggestions: result.cssSuggestions,
            },
            path.dirname(htmlReportPath)
          );

          await fs.writeFile(htmlReportPath, htmlReport);
          console.log(`📄 Smart HTML report saved to: ${htmlReportPath}`);
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
            console.error(
              `❌ Error loading exclusions file: ${err instanceof Error ? err.message : String(err)}`
            );
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
              regions:
                result.classification?.regions.map((r) => ({
                  id: r.region.id,
                  name: `Region ${r.region.id}`,
                  bounds: r.region.bounds,
                  differencePixels: r.region.differencePixels,
                  differencePercentage: r.region.differencePercentage,
                  classification: {
                    type: r.classification.type,
                    confidence: r.classification.confidence,
                    classifier: r.classifier,
                    details: r.classification.details,
                  },
                })) || [],
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
  .option("-c, --concurrency <workers>", "Number of parallel workers (default: 4)", "4")
  .option("-e, --exclude <regions>", "Path to exclusions.json file defining regions to ignore")
  .option("-s, --smart", "Run smart classification on differences")
  .option("--smart-pairing", "Use smart file pairing algorithm for fuzzy matching")
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
        concurrency: string;
        exclude?: string;
        smart?: boolean;
        smartPairing?: boolean;
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
            console.error(
              `❌ Error loading exclusions file: ${err instanceof Error ? err.message : String(err)}`
            );
            process.exit(1);
          }
        }

        const result = await batchProcessor.processBatch(referenceDir, targetDir, {
          pattern: options.pattern,
          recursive: options.recursive,
          outputDir,
          threshold: parseFloat(options.threshold),
          parallel: options.parallel,
          maxConcurrency: parseInt(options.concurrency, 10),
          exclusions,
          runClassification: options.smart,
          smartPairing: options.smartPairing,
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

program
  .command("read-metadata")
  .description("Read embedded metadata from a PNG diff image")
  .argument("<png-file>", "PNG file to read metadata from")
  .option("-v, --verbose", "Show detailed metadata report")
  .action(async (pngFile: string, options: { verbose?: boolean }) => {
    try {
      const { PngMetadataEmbedder } = await import("./lib/png-metadata");
      const embedder = new PngMetadataEmbedder();

      console.log(`Reading metadata from: ${pngFile}`);

      const metadata = await embedder.extractMetadata(pngFile);

      if (!metadata) {
        console.log("❌ No metadata found in PNG file");
        return;
      }

      // Verify integrity
      const isValid = embedder.verifyMetadata(metadata);
      if (!isValid) {
        console.warn("⚠️  Warning: Metadata checksum verification failed");
      }

      if (options.verbose) {
        // Show detailed report
        const report = embedder.generateMetadataReport(metadata);
        console.log("\n" + report);
      } else {
        // Show summary
        console.log("\n✅ Metadata found!");
        console.log(`   - Version: ${metadata.version}`);
        console.log(`   - Created: ${new Date(metadata.timestamp).toLocaleString()}`);
        console.log(`   - Source images:`);
        console.log(`     • ${metadata.comparison.source.image1}`);
        console.log(`     • ${metadata.comparison.source.image2}`);
        console.log(
          `   - Difference: ${metadata.comparison.statistics.percentageDifferent.toFixed(2)}%`
        );

        if (metadata.classification) {
          console.log(`   - Classifications: ${metadata.classification.classifiedRegions} regions`);
          console.log(
            `   - Avg confidence: ${(metadata.classification.confidence.avg * 100).toFixed(1)}%`
          );
        }
      }

      // Save to JSON if requested
      const jsonPath = pngFile.replace(/\.png$/i, "-metadata.json");
      await fs.writeFile(jsonPath, JSON.stringify(metadata, null, 2));
      console.log(`\n💾 Metadata saved to: ${jsonPath}`);
    } catch (error) {
      console.error(
        "❌ Error reading metadata:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program
  .command("refine")
  .description("Progressive refinement mode for iterative improvement")
  .argument("<image1>", "First image path")
  .argument("<image2>", "Second image path")
  .argument("<output>", "Output directory for refinement session")
  .option("-e, --exclude <regions>", "Path to existing exclusions.json file")
  .option("--auto", "Automatically apply high-confidence suggestions")
  .option(
    "--exclude-types <types>",
    "Comma-separated types to auto-exclude (content,style,layout,size,structural)"
  )
  .option("--target <percent>", "Target difference percentage", "0.5")
  .option("--max-iterations <n>", "Maximum refinement iterations", "5")
  .action(
    async (
      image1: string,
      image2: string,
      outputDir: string,
      options: {
        exclude?: string;
        auto?: boolean;
        excludeTypes?: string;
        target: string;
        maxIterations: string;
      }
    ) => {
      try {
        // Create output directory
        await fs.mkdir(outputDir, { recursive: true });

        // Load existing exclusions
        let exclusions;
        if (options.exclude) {
          const exclusionContent = await fs.readFile(options.exclude, "utf-8");
          exclusions = parseExclusionFile(exclusionContent);
        }

        console.log("🔄 Starting progressive refinement mode...");
        console.log(`   Target difference: ${options.target}%`);
        console.log(`   Max iterations: ${options.maxIterations}`);

        // Initial comparison
        console.log("\n📊 Running initial comparison...");
        const diffPath = path.join(outputDir, "diff-initial.png");
        const result = await imageProcessor.generateDiff(image1, image2, diffPath, {
          highlightColor: "red",
          exclusions,
          runClassification: true,
          embedMetadata: true,
        });

        console.log(`   Initial difference: ${result.statistics.percentageDifferent.toFixed(2)}%`);

        if (!result.classification) {
          console.error("❌ Classification required for refinement");
          process.exit(1);
        }

        // Initialize refiner
        const { ProgressiveRefiner } = await import("./lib/progressive-refiner");
        const refiner = new ProgressiveRefiner({
          maxIterations: parseInt(options.maxIterations),
          autoExclude: options.auto,
          excludeTypes: options.excludeTypes
            ?.split(",")
            .map((t) => t.trim()) as import("./lib/classifiers/base").DifferenceType[],
          targetDifferenceThreshold: parseFloat(options.target),
          sessionPath: outputDir,
        });

        // Start refinement
        const { suggestions, recommendedExclusions } = await refiner.startRefinement(
          result,
          exclusions
        );

        console.log(`\n💡 Generated ${suggestions.length} refinement suggestions:`);

        // Display suggestions
        suggestions.slice(0, 10).forEach((suggestion, index) => {
          console.log(`\n${index + 1}. ${suggestion.type.toUpperCase()} suggestion:`);
          console.log(`   Reason: ${suggestion.reason}`);
          console.log(`   Confidence: ${(suggestion.confidence * 100).toFixed(1)}%`);
          if (suggestion.region) {
            console.log(
              `   Region: (${suggestion.region.bounds.x}, ${suggestion.region.bounds.y}) ${suggestion.region.bounds.width}x${suggestion.region.bounds.height}`
            );
          }
        });

        if (suggestions.length > 10) {
          console.log(`\n... and ${suggestions.length - 10} more suggestions`);
        }

        // Save recommended exclusions
        const exclusionsPath = path.join(outputDir, "recommended-exclusions.json");
        await fs.writeFile(exclusionsPath, JSON.stringify(recommendedExclusions, null, 2));
        console.log(`\n💾 Recommended exclusions saved to: ${exclusionsPath}`);

        // Apply exclusions and re-run if auto mode
        if (options.auto) {
          console.log("\n🔄 Applying high-confidence suggestions automatically...");

          const diffPath2 = path.join(outputDir, "diff-refined.png");
          const result2 = await imageProcessor.generateDiff(image1, image2, diffPath2, {
            highlightColor: "red",
            exclusions: recommendedExclusions,
            runClassification: true,
            embedMetadata: true,
          });

          console.log(
            `\n✅ Refined difference: ${result2.statistics.percentageDifferent.toFixed(2)}%`
          );

          const improvement =
            ((result.statistics.percentageDifferent - result2.statistics.percentageDifferent) /
              result.statistics.percentageDifferent) *
            100;

          console.log(`   Improvement: ${improvement.toFixed(1)}%`);
        }

        // Generate refinement report
        const report = refiner.generateReport();
        const reportPath = path.join(outputDir, "refinement-report.txt");
        await fs.writeFile(reportPath, report);
        console.log(`\n📄 Refinement report saved to: ${reportPath}`);
      } catch (error) {
        console.error(
          "❌ Error in refinement:",
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    }
  );

program.parse();
