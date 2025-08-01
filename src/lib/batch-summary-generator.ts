/**
 * @fileoverview Batch summary report generator with comprehensive visualizations
 * @lastmodified 2025-08-01T20:00:00Z
 *
 * Features: Aggregate statistics, classification charts, performance metrics
 * Main APIs: BatchSummaryGenerator class, generateSummary()
 * Constraints: Requires batch processing results
 * Patterns: HTML generation with charts and interactive elements
 */

import { BatchResult } from "./batchProcessor";
import { DifferenceType } from "./classifiers/base";
import * as path from "path";

export interface BatchSummaryOptions {
  title?: string;
  includeCharts?: boolean;
  includeDetails?: boolean;
  theme?: "light" | "dark";
}

export interface BatchSummaryData {
  metadata: {
    timestamp: string;
    version: string;
    referenceDir: string;
    targetDir: string;
    totalDuration?: number;
  };
  overview: {
    totalFiles: number;
    processed: number;
    failed: number;
    successRate: number;
    averageProcessingTime?: number;
  };
  comparison: {
    matchingImages: number;
    differentImages: number;
    matchRate: number;
    totalPixelsDifferent: number;
    averageDifference: number;
  };
  classification?: {
    totalRegions: number;
    byType: Record<DifferenceType, number>;
    avgConfidence: number;
    topChanges: Array<{
      file: string;
      type: DifferenceType;
      count: number;
      confidence: number;
    }>;
  };
  performance?: {
    parallelEnabled: boolean;
    workersUsed: number;
    totalDuration: number;
    averagePerImage: number;
    throughput: number; // images per second
  };
  failures: Array<{
    reference: string;
    target: string;
    error: string;
  }>;
}

export class BatchSummaryGenerator {
  private options: BatchSummaryOptions;

  constructor(options: BatchSummaryOptions = {}) {
    this.options = {
      title: "Batch Processing Summary",
      includeCharts: true,
      includeDetails: true,
      theme: "light",
      ...options,
    };
  }

  /**
   * Generate comprehensive batch summary
   */
  generateSummary(
    results: BatchResult,
    additionalData?: {
      referenceDir?: string;
      targetDir?: string;
      startTime?: Date;
      endTime?: Date;
      parallelConfig?: { enabled: boolean; workers: number };
    }
  ): BatchSummaryData {
    const processingTime =
      additionalData?.startTime && additionalData?.endTime
        ? additionalData.endTime.getTime() - additionalData.startTime.getTime()
        : undefined;

    const successRate = results.totalFiles > 0 ? (results.processed / results.totalFiles) * 100 : 0;

    const matchRate =
      results.processed > 0 ? (results.summary.matchingImages / results.processed) * 100 : 0;

    // Aggregate classification data
    const classificationData = this.aggregateClassifications(results);

    return {
      metadata: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        referenceDir: additionalData?.referenceDir || "",
        targetDir: additionalData?.targetDir || "",
        totalDuration: processingTime,
      },
      overview: {
        totalFiles: results.totalFiles,
        processed: results.processed,
        failed: results.failed,
        successRate,
        averageProcessingTime:
          processingTime && results.processed > 0 ? processingTime / results.processed : undefined,
      },
      comparison: {
        matchingImages: results.summary.matchingImages,
        differentImages: results.summary.differentImages,
        matchRate,
        totalPixelsDifferent: results.summary.totalPixelsDifferent,
        averageDifference: results.summary.averageDifference,
      },
      classification: classificationData,
      performance:
        processingTime && additionalData?.parallelConfig
          ? {
              parallelEnabled: additionalData.parallelConfig.enabled,
              workersUsed: additionalData.parallelConfig.workers,
              totalDuration: processingTime,
              averagePerImage: results.processed > 0 ? processingTime / results.processed : 0,
              throughput: processingTime > 0 ? (results.processed / processingTime) * 1000 : 0,
            }
          : undefined,
      failures: results.results
        .filter((r) => r.error)
        .map((r) => ({
          reference: r.reference,
          target: r.target,
          error: r.error || "Unknown error",
        })),
    };
  }

  /**
   * Aggregate classification data across all results
   */
  private aggregateClassifications(results: BatchResult): BatchSummaryData["classification"] {
    const allRegions = results.results
      .filter((r) => r.result?.classification)
      .flatMap((r) => {
        const result = r.result;
        const classification = result?.classification;
        if (!result || !classification) return [];
        return classification.regions.map((region) => ({
          file: path.basename(r.reference),
          type: region.classification.type,
          confidence: region.classification.confidence,
          classifier: region.classifier,
        }));
      });

    if (allRegions.length === 0) return undefined;

    // Count by type
    const byType: Record<string, number> = {};
    let totalConfidence = 0;

    for (const region of allRegions) {
      byType[region.type] = (byType[region.type] || 0) + 1;
      totalConfidence += region.confidence;
    }

    // Get top changes by file
    const fileChanges = new Map<string, Map<string, { count: number; totalConfidence: number }>>();

    for (const region of allRegions) {
      if (!fileChanges.has(region.file)) {
        fileChanges.set(region.file, new Map());
      }
      const fileMap = fileChanges.get(region.file);
      if (!fileMap) continue;

      if (!fileMap.has(region.type)) {
        fileMap.set(region.type, { count: 0, totalConfidence: 0 });
      }
      const typeData = fileMap.get(region.type);
      if (!typeData) continue;
      typeData.count++;
      typeData.totalConfidence += region.confidence;
    }

    // Convert to top changes array
    const topChanges: Array<{
      file: string;
      type: DifferenceType;
      count: number;
      confidence: number;
    }> = [];

    fileChanges.forEach((types, file) => {
      types.forEach((data, type) => {
        topChanges.push({
          file,
          type: type as DifferenceType,
          count: data.count,
          confidence: data.totalConfidence / data.count,
        });
      });
    });

    // Sort by count descending
    topChanges.sort((a, b) => b.count - a.count);

    return {
      totalRegions: allRegions.length,
      byType: byType as Record<DifferenceType, number>,
      avgConfidence: totalConfidence / allRegions.length,
      topChanges: topChanges.slice(0, 10), // Top 10
    };
  }

  /**
   * Generate HTML summary report
   */
  generateHtmlReport(summaryData: BatchSummaryData): string {
    return `<!DOCTYPE html>
<html lang="en" data-theme="${this.options.theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.options.title}</title>
    ${this.generateStyles()}
</head>
<body>
    <div class="container">
        <header>
            <h1>${this.options.title}</h1>
            <div class="metadata">
                <span>Generated: ${new Date(summaryData.metadata.timestamp).toLocaleString()}</span>
                ${
                  summaryData.metadata.totalDuration
                    ? `<span>Duration: ${this.formatDuration(summaryData.metadata.totalDuration)}</span>`
                    : ""
                }
                <span>Version: ${summaryData.metadata.version}</span>
            </div>
        </header>

        ${this.generateOverviewSection(summaryData)}
        
        ${this.generateComparisonSection(summaryData)}
        
        ${
          summaryData.classification && this.options.includeCharts
            ? this.generateClassificationSection(summaryData.classification)
            : ""
        }
        
        ${summaryData.performance ? this.generatePerformanceSection(summaryData.performance) : ""}
        
        ${
          this.options.includeDetails && summaryData.failures.length > 0
            ? this.generateFailuresSection(summaryData.failures)
            : ""
        }
    </div>
    
    ${this.options.includeCharts ? this.generateScripts(summaryData) : ""}
</body>
</html>`;
  }

  /**
   * Generate CSS styles
   */
  private generateStyles(): string {
    return `<style>
        :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f5f7fa;
            --bg-tertiary: #e9ecef;
            --text-primary: #2c3e50;
            --text-secondary: #7f8c8d;
            --accent: #3498db;
            --success: #27ae60;
            --warning: #f39c12;
            --danger: #e74c3c;
            --border: #ddd;
        }

        [data-theme="dark"] {
            --bg-primary: #1a1a1a;
            --bg-secondary: #2d2d2d;
            --bg-tertiary: #3a3a3a;
            --text-primary: #ecf0f1;
            --text-secondary: #bdc3c7;
            --border: #444;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg-secondary);
            color: var(--text-primary);
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            background: var(--bg-primary);
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }

        h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            color: var(--text-primary);
        }

        .metadata {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .metadata span {
            margin-right: 20px;
        }

        .section {
            background: var(--bg-primary);
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }

        .section h2 {
            font-size: 1.8rem;
            margin-bottom: 20px;
            color: var(--text-primary);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: var(--bg-secondary);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            transition: transform 0.2s;
        }

        .stat-card:hover {
            transform: translateY(-2px);
        }

        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: var(--accent);
            margin-bottom: 5px;
        }

        .stat-label {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .chart-container {
            position: relative;
            height: 300px;
            margin: 20px 0;
        }

        .progress-bar {
            width: 100%;
            height: 30px;
            background: var(--bg-tertiary);
            border-radius: 15px;
            overflow: hidden;
            position: relative;
            margin: 20px 0;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--success), var(--accent));
            transition: width 1s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }

        .failures-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .failures-table th,
        .failures-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }

        .failures-table th {
            background: var(--bg-secondary);
            font-weight: 600;
            color: var(--text-primary);
        }

        .failures-table tr:hover {
            background: var(--bg-secondary);
        }

        .error-text {
            color: var(--danger);
            font-size: 0.9rem;
        }

        .performance-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }

        .metric-box {
            background: var(--bg-tertiary);
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid var(--accent);
        }

        .metric-label {
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-bottom: 5px;
        }

        .metric-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--text-primary);
        }

        .chart-legend {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 10px;
            flex-wrap: wrap;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.9rem;
        }

        .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 4px;
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .section {
                padding: 20px;
            }
            
            h1 {
                font-size: 2rem;
            }
        }
    </style>`;
  }

  /**
   * Generate overview section
   */
  private generateOverviewSection(data: BatchSummaryData): string {
    return `
        <section class="section">
            <h2>Processing Overview</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${data.overview.totalFiles}</div>
                    <div class="stat-label">Total Files</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.overview.processed}</div>
                    <div class="stat-label">Successfully Processed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.overview.failed}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.overview.successRate.toFixed(1)}%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
            </div>
            
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${data.overview.successRate}%">
                    ${data.overview.successRate.toFixed(1)}% Complete
                </div>
            </div>
        </section>`;
  }

  /**
   * Generate comparison section
   */
  private generateComparisonSection(data: BatchSummaryData): string {
    return `
        <section class="section">
            <h2>Comparison Results</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${data.comparison.matchingImages}</div>
                    <div class="stat-label">Matching Images</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.comparison.differentImages}</div>
                    <div class="stat-label">Different Images</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.comparison.matchRate.toFixed(1)}%</div>
                    <div class="stat-label">Match Rate</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.comparison.averageDifference.toFixed(2)}%</div>
                    <div class="stat-label">Avg Difference</div>
                </div>
            </div>
            
            ${
              this.options.includeCharts
                ? `
            <div class="chart-container">
                <canvas id="comparisonChart"></canvas>
            </div>
            `
                : ""
            }
        </section>`;
  }

  /**
   * Generate classification section
   */
  private generateClassificationSection(
    classification: NonNullable<BatchSummaryData["classification"]>
  ): string {
    const typeColors: Record<string, string> = {
      content: "#3498db",
      style: "#9b59b6",
      layout: "#e74c3c",
      size: "#f39c12",
      structural: "#2ecc71",
      new_element: "#27ae60",
      removed_element: "#e74c3c",
      unknown: "#95a5a6",
    };

    return `
        <section class="section">
            <h2>Classification Analysis</h2>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${classification.totalRegions}</div>
                    <div class="stat-label">Total Regions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(classification.avgConfidence * 100).toFixed(1)}%</div>
                    <div class="stat-label">Avg Confidence</div>
                </div>
            </div>
            
            <div class="chart-container">
                <canvas id="classificationChart"></canvas>
            </div>
            
            <div class="chart-legend">
                ${Object.entries(classification.byType)
                  .filter(([_, count]) => count > 0)
                  .map(
                    ([type, count]) => `
                    <div class="legend-item">
                        <div class="legend-color" style="background: ${typeColors[type] || "#666"}"></div>
                        <span>${type}: ${count}</span>
                    </div>
                  `
                  )
                  .join("")}
            </div>
            
            ${
              classification.topChanges.length > 0
                ? `
            <h3 style="margin-top: 30px;">Top Changes by File</h3>
            <table class="failures-table">
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Type</th>
                        <th>Count</th>
                        <th>Confidence</th>
                    </tr>
                </thead>
                <tbody>
                    ${classification.topChanges
                      .slice(0, 5)
                      .map(
                        (change) => `
                        <tr>
                            <td>${change.file}</td>
                            <td>${change.type}</td>
                            <td>${change.count}</td>
                            <td>${(change.confidence * 100).toFixed(1)}%</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
            `
                : ""
            }
        </section>`;
  }

  /**
   * Generate performance section
   */
  private generatePerformanceSection(
    performance: NonNullable<BatchSummaryData["performance"]>
  ): string {
    return `
        <section class="section">
            <h2>Performance Metrics</h2>
            
            <div class="performance-metrics">
                <div class="metric-box">
                    <div class="metric-label">Processing Mode</div>
                    <div class="metric-value">${performance.parallelEnabled ? "Parallel" : "Sequential"}</div>
                </div>
                ${
                  performance.parallelEnabled
                    ? `
                <div class="metric-box">
                    <div class="metric-label">Workers Used</div>
                    <div class="metric-value">${performance.workersUsed}</div>
                </div>
                `
                    : ""
                }
                <div class="metric-box">
                    <div class="metric-label">Total Duration</div>
                    <div class="metric-value">${this.formatDuration(performance.totalDuration)}</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Avg per Image</div>
                    <div class="metric-value">${this.formatDuration(performance.averagePerImage)}</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Throughput</div>
                    <div class="metric-value">${performance.throughput.toFixed(2)} img/s</div>
                </div>
            </div>
        </section>`;
  }

  /**
   * Generate failures section
   */
  private generateFailuresSection(failures: BatchSummaryData["failures"]): string {
    return `
        <section class="section">
            <h2>Failed Comparisons</h2>
            
            <table class="failures-table">
                <thead>
                    <tr>
                        <th>Reference</th>
                        <th>Target</th>
                        <th>Error</th>
                    </tr>
                </thead>
                <tbody>
                    ${failures
                      .map(
                        (failure) => `
                        <tr>
                            <td>${path.basename(failure.reference)}</td>
                            <td>${path.basename(failure.target)}</td>
                            <td class="error-text">${failure.error}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        </section>`;
  }

  /**
   * Generate JavaScript for charts
   */
  private generateScripts(data: BatchSummaryData): string {
    return `
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Comparison Chart
            const comparisonCtx = document.getElementById('comparisonChart');
            if (comparisonCtx) {
                new Chart(comparisonCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Matching', 'Different'],
                        datasets: [{
                            data: [${data.comparison.matchingImages}, ${data.comparison.differentImages}],
                            backgroundColor: ['#27ae60', '#e74c3c'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                                }
                            }
                        }
                    }
                });
            }
            
            // Classification Chart
            const classificationCtx = document.getElementById('classificationChart');
            if (classificationCtx && ${data.classification ? "true" : "false"}) {
                const classificationData = ${JSON.stringify(data.classification?.byType || {})};
                new Chart(classificationCtx, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(classificationData),
                        datasets: [{
                            label: 'Regions by Type',
                            data: Object.values(classificationData),
                            backgroundColor: [
                                '#3498db', '#9b59b6', '#e74c3c', '#f39c12',
                                '#2ecc71', '#27ae60', '#e74c3c', '#95a5a6'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                                }
                            },
                            x: {
                                ticks: {
                                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            }
                        }
                    }
                });
            }
        });
    </script>`;
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}
