/**
 * @fileoverview Batch processing module for handling multiple images
 * @lastmodified 2025-08-01T05:00:00Z
 *
 * Features: Directory scanning, glob pattern support, batch comparison
 * Main APIs: processBatch(), scanDirectory(), generateBatchReport()
 * Constraints: Memory usage scales with number of images
 * Patterns: Async iterators for memory efficiency
 */

import * as fs from "fs/promises";
import * as path from "path";
import { ImageProcessor, ComparisonResult } from "./imageProcessor";
import { ExclusionsConfig } from "./exclusions";
import { SmartPairing } from "./smart-pairing";
import { BatchSummaryGenerator } from "./batch-summary-generator";

export interface BatchOptions {
  pattern?: string;
  recursive?: boolean;
  outputDir: string;
  threshold?: number;
  parallel?: boolean;
  maxConcurrency?: number;
  exclusions?: ExclusionsConfig;
  runClassification?: boolean;
  smartPairing?: boolean;
}

export interface BatchResult {
  totalFiles: number;
  processed: number;
  failed: number;
  results: Array<{
    reference: string;
    target: string;
    result?: ComparisonResult;
    error?: string;
  }>;
  summary: {
    averageDifference: number;
    totalPixelsDifferent: number;
    matchingImages: number;
    differentImages: number;
  };
}

export class BatchProcessor {
  private imageProcessor: ImageProcessor;

  constructor() {
    this.imageProcessor = new ImageProcessor();
  }

  /**
   * Process items in parallel with concurrency control
   */
  private async processInParallel<T, R>(
    items: T[],
    concurrency: number,
    processor: (item: T, index: number) => Promise<R>
  ): Promise<Array<{ item: T; value?: R; error?: string; index: number }>> {
    const results: Array<{ item: T; value?: R; error?: string; index: number }> = [];
    const queue = [...items.map((item, index) => ({ item, index }))];
    const inProgress = new Set<Promise<void>>();
    let completed = 0;

    async function processNext(): Promise<void> {
      const next = queue.shift();
      if (!next) return;

      try {
        const value = await processor(next.item, next.index);
        results[next.index] = { item: next.item, value, index: next.index };
      } catch (error) {
        results[next.index] = {
          item: next.item,
          error: error instanceof Error ? error.message : String(error),
          index: next.index,
        };
      }

      completed++;
      const progress = (completed / items.length) * 100;
      process.stdout.write(
        `\rProcessing: ${progress.toFixed(1)}% (${completed}/${items.length}) - ${concurrency} workers`
      );
    }

    // Start initial batch
    for (let i = 0; i < Math.min(concurrency, items.length); i++) {
      const promise = processNext().then(() => {
        inProgress.delete(promise);
        if (queue.length > 0) {
          const nextPromise = processNext().then(() => {
            inProgress.delete(nextPromise);
          });
          inProgress.add(nextPromise);
          return nextPromise;
        }
        return;
      });
      inProgress.add(promise);
    }

    // Wait for all to complete
    await Promise.all(Array.from(inProgress));
    process.stdout.write("\r\n");

    return results;
  }

  /**
   * Process a batch of images from directories
   */
  async processBatch(
    referenceDir: string,
    targetDir: string,
    options: BatchOptions
  ): Promise<BatchResult> {
    const startTime = new Date();
    const referenceFiles = await this.scanDirectory(
      referenceDir,
      options.pattern,
      options.recursive
    );
    const targetFiles = await this.scanDirectory(targetDir, options.pattern, options.recursive);

    // Create output directory
    await fs.mkdir(options.outputDir, { recursive: true });

    const results: BatchResult = {
      totalFiles: referenceFiles.length,
      processed: 0,
      failed: 0,
      results: [],
      summary: {
        averageDifference: 0,
        totalPixelsDifferent: 0,
        matchingImages: 0,
        differentImages: 0,
      },
    };

    // Match files by relative path or smart pairing
    const pairs = options.smartPairing
      ? this.smartMatchFilePairs(referenceDir, referenceFiles, targetDir, targetFiles)
      : this.matchFilePairs(referenceDir, referenceFiles, targetDir, targetFiles);

    // Process pairs with parallel support
    if (options.parallel !== false && options.maxConcurrency && options.maxConcurrency > 1) {
      // Parallel processing
      const concurrency = options.maxConcurrency || 4;
      // eslint-disable-next-line no-console
      console.log(`🚀 Processing ${pairs.length} image pairs with ${concurrency} workers...`);

      // Process in chunks
      const processedResults = await this.processInParallel(
        pairs,
        concurrency,
        async (pair, _index) => {
          const outputSubDir = path.join(options.outputDir, path.dirname(pair.relativePath));
          await fs.mkdir(outputSubDir, { recursive: true });

          const baseName = path.basename(pair.relativePath, path.extname(pair.relativePath));
          const alignedPath = path.join(outputSubDir, `${baseName}_aligned.png`);
          const diffPath = path.join(outputSubDir, `${baseName}_diff.png`);

          // Align images
          await this.imageProcessor.alignImages(pair.reference, pair.target, alignedPath);

          // Generate diff
          const comparisonResult = await this.imageProcessor.generateDiff(
            pair.reference,
            alignedPath,
            diffPath,
            {
              highlightColor: "red",
              lowlight: true,
              exclusions: options.exclusions,
              runClassification: options.runClassification,
            }
          );

          return {
            reference: pair.reference,
            target: pair.target,
            result: comparisonResult,
          };
        }
      );

      // Aggregate results
      for (const result of processedResults) {
        if (result.error) {
          results.failed++;
          results.results.push({
            reference: result.item.reference,
            target: result.item.target,
            error: result.error,
          });
        } else if (result.value) {
          results.results.push(result.value);
          results.processed++;
          results.summary.totalPixelsDifferent +=
            result.value.result?.statistics.pixelsDifferent || 0;
          if (result.value.result?.isEqual) {
            results.summary.matchingImages++;
          } else {
            results.summary.differentImages++;
          }
        }
      }
    } else {
      // Sequential processing (original code)
      for (const [index, pair] of pairs.entries()) {
        try {
          const outputSubDir = path.join(options.outputDir, path.dirname(pair.relativePath));
          await fs.mkdir(outputSubDir, { recursive: true });

          const baseName = path.basename(pair.relativePath, path.extname(pair.relativePath));
          const alignedPath = path.join(outputSubDir, `${baseName}_aligned.png`);
          const diffPath = path.join(outputSubDir, `${baseName}_diff.png`);

          // Align images
          await this.imageProcessor.alignImages(pair.reference, pair.target, alignedPath);

          // Generate diff
          const comparisonResult = await this.imageProcessor.generateDiff(
            pair.reference,
            alignedPath,
            diffPath,
            {
              highlightColor: "red",
              lowlight: true,
              exclusions: options.exclusions,
              runClassification: options.runClassification,
            }
          );

          results.results.push({
            reference: pair.reference,
            target: pair.target,
            result: comparisonResult,
          });

          // Update summary
          results.processed++;
          results.summary.totalPixelsDifferent += comparisonResult.statistics.pixelsDifferent;
          if (comparisonResult.isEqual) {
            results.summary.matchingImages++;
          } else {
            results.summary.differentImages++;
          }

          // Progress callback
          const progress = ((index + 1) / pairs.length) * 100;
          process.stdout.write(
            `\rProcessing: ${progress.toFixed(1)}% (${index + 1}/${pairs.length})`
          );
        } catch (error) {
          results.failed++;
          results.results.push({
            reference: pair.reference,
            target: pair.target,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Calculate average difference
    if (results.processed > 0) {
      const totalDifference = results.results
        .filter((r) => r.result)
        .reduce((sum, r) => sum + (r.result?.difference || 0), 0);
      results.summary.averageDifference = totalDifference / results.processed;
    }

    // Clear progress line
    if (options.parallel === false) {
      process.stdout.write("\r\n");
    }

    // Generate batch report
    const endTime = new Date();
    await this.generateBatchReport(results, {
      outputDir: options.outputDir,
      referenceDir,
      targetDir,
      startTime,
      endTime,
      parallelConfig: {
        enabled: options.parallel !== false,
        workers: options.maxConcurrency || 4,
      },
    });

    return results;
  }

  /**
   * Scan directory for image files
   */
  private async scanDirectory(
    dir: string,
    pattern: string = "*.png",
    recursive: boolean = true
  ): Promise<string[]> {
    const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".bmp"];
    const files: string[] = [];

    async function scan(currentDir: string): Promise<void> {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory() && recursive) {
          await scan(fullPath);
        } else if (
          entry.isFile() &&
          imageExtensions.includes(path.extname(entry.name).toLowerCase())
        ) {
          // Simple pattern matching (could be enhanced with glob library)
          if (pattern === "*") {
            files.push(fullPath);
          } else if (pattern.startsWith("*")) {
            // Handle patterns like *.png, *.jpg, etc.
            const expectedExt = pattern.substring(1); // Remove the *
            if (path.extname(entry.name).toLowerCase() === expectedExt.toLowerCase()) {
              files.push(fullPath);
            }
          } else if (pattern.includes(path.extname(entry.name))) {
            files.push(fullPath);
          }
        }
      }
    }

    await scan(dir);
    return files.sort();
  }

  /**
   * Match reference and target files by relative path
   */
  private matchFilePairs(
    referenceDir: string,
    referenceFiles: string[],
    targetDir: string,
    targetFiles: string[]
  ): Array<{ reference: string; target: string; relativePath: string }> {
    const pairs: Array<{
      reference: string;
      target: string;
      relativePath: string;
    }> = [];

    // Create map of target files by relative path
    const targetMap = new Map<string, string>();
    for (const targetFile of targetFiles) {
      const relativePath = path.relative(targetDir, targetFile);
      targetMap.set(relativePath, targetFile);
    }

    // Match reference files with target files
    for (const referenceFile of referenceFiles) {
      const relativePath = path.relative(referenceDir, referenceFile);
      const targetFile = targetMap.get(relativePath);

      if (targetFile) {
        pairs.push({
          reference: referenceFile,
          target: targetFile,
          relativePath,
        });
      }
    }

    return pairs;
  }

  /**
   * Smart match files using fuzzy matching algorithm
   */
  private smartMatchFilePairs(
    referenceDir: string,
    referenceFiles: string[],
    targetDir: string,
    targetFiles: string[]
  ): Array<{ reference: string; target: string; relativePath: string }> {
    const smartPairing = new SmartPairing({
      minSimilarity: 0.6,
      fuzzyMatch: true,
      ignoreExtensions: false,
    });

    const smartPairs = smartPairing.findBestPairs(
      referenceFiles,
      targetFiles,
      referenceDir,
      targetDir
    );

    // Log pairing report
    const unpaired = smartPairing.findUnpairedFiles(referenceFiles, targetFiles, smartPairs);
    const report = smartPairing.generatePairingReport(smartPairs, unpaired);
    // eslint-disable-next-line no-console
    console.log("\n" + report + "\n");

    return smartPairs.map((pair) => ({
      reference: pair.reference,
      target: pair.target,
      relativePath: pair.relativePath,
    }));
  }

  /**
   * Generate HTML report for batch results
   */
  private async generateBatchReport(
    results: BatchResult,
    config: {
      outputDir: string;
      referenceDir: string;
      targetDir: string;
      startTime: Date;
      endTime: Date;
      parallelConfig: { enabled: boolean; workers: number };
    }
  ): Promise<void> {
    const reportPath = path.join(config.outputDir, "batch-report.json");
    const htmlReportPath = path.join(config.outputDir, "index.html");
    const summaryReportPath = path.join(config.outputDir, "batch-summary.html");

    // Generate comprehensive summary data
    const summaryGenerator = new BatchSummaryGenerator({
      title: "Image Comparison Batch Summary",
      includeCharts: true,
      includeDetails: true,
    });

    const summaryData = summaryGenerator.generateSummary(results, {
      referenceDir: config.referenceDir,
      targetDir: config.targetDir,
      startTime: config.startTime,
      endTime: config.endTime,
      parallelConfig: config.parallelConfig,
    });

    // Enhanced report with regions
    const enhancedResults = {
      ...results,
      metadata: summaryData.metadata,
      overview: summaryData.overview,
      classification: summaryData.classification,
      performance: summaryData.performance,
      allRegions: results.results
        .filter((r) => r.result?.classification)
        .flatMap((r) => {
          const classification = r.result?.classification;
          if (!classification) return [];
          return classification.regions.map((region) => ({
            file: path.basename(r.reference),
            ...region.region,
            classification: {
              type: region.classification.type,
              confidence: region.classification.confidence,
              classifier: region.classifier,
              details: region.classification.details,
            },
          }));
        }),
    };

    // Save JSON report
    await fs.writeFile(reportPath, JSON.stringify(enhancedResults, null, 2), "utf-8");

    // Generate basic HTML report (existing)
    const html = this.generateHtmlReport(results, config.outputDir);
    await fs.writeFile(htmlReportPath, html, "utf-8");

    // Generate comprehensive summary report
    const summaryHtml = summaryGenerator.generateHtmlReport(summaryData);
    await fs.writeFile(summaryReportPath, summaryHtml, "utf-8");

    // eslint-disable-next-line no-console
    console.log(`\n📊 Batch summary report saved to: ${summaryReportPath}`);
  }

  /**
   * Generate HTML content for the report
   */
  private generateHtmlReport(results: BatchResult, outputDir: string): string {
    const successRate = (results.processed / results.totalFiles) * 100;
    const matchRate =
      results.processed > 0 ? (results.summary.matchingImages / results.processed) * 100 : 0;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auto Image Diff - Batch Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 5px;
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
        }
        .results-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .results-table th,
        .results-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .results-table th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        .status-success {
            color: #28a745;
        }
        .status-fail {
            color: #dc3545;
        }
        .diff-link {
            color: #007bff;
            text-decoration: none;
        }
        .diff-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Auto Image Diff - Batch Report</h1>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-value">${results.totalFiles}</div>
                <div class="stat-label">Total Files</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${successRate.toFixed(1)}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${matchRate.toFixed(1)}%</div>
                <div class="stat-label">Matching Images</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${results.summary.averageDifference.toFixed(4)}</div>
                <div class="stat-label">Average Difference</div>
            </div>
        </div>

        <h2>Detailed Results</h2>
        <table class="results-table">
            <thead>
                <tr>
                    <th>Reference</th>
                    <th>Target</th>
                    <th>Status</th>
                    <th>Difference</th>
                    <th>Pixels Changed</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${results.results
                  .map((r) => {
                    const fileName = path.basename(r.reference);
                    const status = r.error ? "fail" : "success";
                    const statusClass = r.error ? "status-fail" : "status-success";

                    // Calculate relative path for diff link
                    const diffLink =
                      r.result && r.result.diffImagePath
                        ? path.relative(outputDir, r.result.diffImagePath).replace(/\\/g, "/")
                        : null;

                    return `<tr>
                        <td>${fileName}</td>
                        <td>${path.basename(r.target)}</td>
                        <td class="${statusClass}">${status}</td>
                        <td>${r.result ? r.result.difference.toFixed(4) : "-"}</td>
                        <td>${r.result ? r.result.statistics.pixelsDifferent.toLocaleString() : "-"}</td>
                        <td>
                            ${diffLink ? `<a href="${diffLink}" class="diff-link">View Diff</a>` : "-"}
                        </td>
                    </tr>`;
                  })
                  .join("")}
            </tbody>
        </table>
        
        <div style="margin-top: 40px; text-align: center; color: #666;">
            Generated by auto-image-diff on ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;
  }
}
