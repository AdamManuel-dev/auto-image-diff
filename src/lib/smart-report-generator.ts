/**
 * @fileoverview Smart HTML report generator with classification visualization
 * @lastmodified 2025-08-01T18:00:00Z
 *
 * Features: Interactive HTML reports, classification visualization, confidence display
 * Main APIs: generateSmartReport(), SmartReportGenerator class
 * Constraints: Requires classification data from image comparison
 * Patterns: Template-based HTML generation, responsive design
 */

import { ComparisonResult } from "./imageProcessor";
import { ClassificationSummary } from "./classifiers/manager";
import { DifferenceType } from "./classifiers/base";
import * as path from "path";

export interface SmartReportOptions {
  title?: string;
  includeImages?: boolean;
  theme?: "light" | "dark";
  showConfidenceDetails?: boolean;
}

export interface SmartReportData {
  metadata: {
    image1: string;
    image2: string;
    diffImage: string;
    timestamp: string;
    version: string;
  };
  statistics: ComparisonResult["statistics"];
  classification?: ClassificationSummary;
  regions?: Array<{
    id: number;
    bounds: { x: number; y: number; width: number; height: number };
    type: string;
    confidence: number;
    classifier: string;
    details?: Record<string, unknown>;
  }>;
}

export class SmartReportGenerator {
  private options: SmartReportOptions;

  constructor(options: SmartReportOptions = {}) {
    this.options = {
      title: "Smart Image Diff Report",
      includeImages: true,
      theme: "light",
      showConfidenceDetails: true,
      ...options,
    };
  }

  /**
   * Generate a complete smart HTML report
   */
  generateSmartReport(data: SmartReportData, outputDir: string): string {
    const { metadata, statistics, classification, regions } = data;
    const relativeImage1 = path.relative(outputDir, metadata.image1);
    const relativeImage2 = path.relative(outputDir, metadata.image2);
    const relativeDiff = path.relative(outputDir, metadata.diffImage);

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
                <span>Generated: ${new Date(metadata.timestamp).toLocaleString()}</span>
                <span>Version: ${metadata.version}</span>
            </div>
        </header>

        ${this.generateSummarySection(statistics, classification)}
        
        ${this.options.includeImages ? this.generateImageSection(relativeImage1, relativeImage2, relativeDiff) : ""}
        
        ${classification ? this.generateClassificationSection(classification) : ""}
        
        ${regions && regions.length > 0 ? this.generateRegionsSection(regions) : ""}
        
        ${this.generateRecommendationsSection(classification)}
    </div>
    
    ${this.generateScripts()}
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

        .classification-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }

        .type-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 500;
            text-align: center;
        }

        .type-content { background: #3498db22; color: #3498db; }
        .type-style { background: #9b59b622; color: #9b59b6; }
        .type-layout { background: #e74c3c22; color: #e74c3c; }
        .type-size { background: #f39c1222; color: #f39c12; }
        .type-structural { background: #2ecc7122; color: #2ecc71; }
        .type-new_element { background: #27ae6022; color: #27ae60; }
        .type-removed_element { background: #e74c3c22; color: #e74c3c; }
        .type-unknown { background: #95a5a622; color: #95a5a6; }

        .confidence-meter {
            width: 100%;
            height: 10px;
            background: var(--bg-tertiary);
            border-radius: 5px;
            overflow: hidden;
            margin: 10px 0;
        }

        .confidence-fill {
            height: 100%;
            background: linear-gradient(to right, var(--danger), var(--warning), var(--success));
            transition: width 0.3s ease;
        }

        .image-comparison {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .image-box {
            text-align: center;
        }

        .image-box img {
            max-width: 100%;
            height: auto;
            border: 1px solid var(--border);
            border-radius: 8px;
        }

        .image-label {
            margin-top: 10px;
            font-weight: 500;
            color: var(--text-secondary);
        }

        .regions-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .regions-table th,
        .regions-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }

        .regions-table th {
            background: var(--bg-secondary);
            font-weight: 600;
            color: var(--text-primary);
        }

        .regions-table tr:hover {
            background: var(--bg-secondary);
        }

        .recommendation-box {
            background: var(--bg-tertiary);
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid var(--accent);
            margin-top: 20px;
        }

        .recommendation-box h3 {
            margin-bottom: 10px;
            color: var(--text-primary);
        }

        .recommendation-box p {
            color: var(--text-secondary);
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
   * Generate summary section
   */
  private generateSummarySection(
    statistics: ComparisonResult["statistics"],
    classification?: ClassificationSummary
  ): string {
    return `
        <section class="section">
            <h2>Summary</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${statistics.percentageDifferent.toFixed(2)}%</div>
                    <div class="stat-label">Difference</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${statistics.pixelsDifferent.toLocaleString()}</div>
                    <div class="stat-label">Pixels Changed</div>
                </div>
                ${
                  classification
                    ? `
                <div class="stat-card">
                    <div class="stat-value">${classification.classifiedRegions}</div>
                    <div class="stat-label">Classified Regions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(classification.confidence.avg * 100).toFixed(0)}%</div>
                    <div class="stat-label">Average Confidence</div>
                </div>
                `
                    : ""
                }
            </div>
        </section>`;
  }

  /**
   * Generate image comparison section
   */
  private generateImageSection(image1: string, image2: string, diff: string): string {
    return `
        <section class="section">
            <h2>Visual Comparison</h2>
            <div class="image-comparison">
                <div class="image-box">
                    <img src="${image1}" alt="Original Image" />
                    <div class="image-label">Original</div>
                </div>
                <div class="image-box">
                    <img src="${image2}" alt="Compared Image" />
                    <div class="image-label">Compared</div>
                </div>
                <div class="image-box">
                    <img src="${diff}" alt="Difference" />
                    <div class="image-label">Difference</div>
                </div>
            </div>
        </section>`;
  }

  /**
   * Generate classification section
   */
  private generateClassificationSection(classification: ClassificationSummary): string {
    const typeEntries = Object.entries(classification.byType)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a);

    return `
        <section class="section">
            <h2>Classification Analysis</h2>
            
            <div class="classification-grid">
                ${typeEntries
                  .map(
                    ([type, count]) => `
                    <div class="type-badge type-${type}">
                        ${type}: ${count}
                    </div>
                `
                  )
                  .join("")}
            </div>
            
            ${
              this.options.showConfidenceDetails
                ? `
            <div>
                <h3>Confidence Distribution</h3>
                <div class="confidence-meter">
                    <div class="confidence-fill" style="width: ${classification.confidence.avg * 100}%"></div>
                </div>
                <div style="display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 0.9rem;">
                    <span>Min: ${(classification.confidence.min * 100).toFixed(0)}%</span>
                    <span>Avg: ${(classification.confidence.avg * 100).toFixed(0)}%</span>
                    <span>Max: ${(classification.confidence.max * 100).toFixed(0)}%</span>
                </div>
            </div>
            `
                : ""
            }
        </section>`;
  }

  /**
   * Generate regions table
   */
  private generateRegionsSection(regions: SmartReportData["regions"]): string {
    if (!regions || regions.length === 0) return "";

    return `
        <section class="section">
            <h2>Detected Regions</h2>
            <table class="regions-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Location</th>
                        <th>Size</th>
                        <th>Type</th>
                        <th>Confidence</th>
                        <th>Classifier</th>
                    </tr>
                </thead>
                <tbody>
                    ${regions
                      .map(
                        (region) => `
                        <tr>
                            <td>#${region.id}</td>
                            <td>(${region.bounds.x}, ${region.bounds.y})</td>
                            <td>${region.bounds.width} × ${region.bounds.height}</td>
                            <td><span class="type-badge type-${region.type}">${region.type}</span></td>
                            <td>${(region.confidence * 100).toFixed(0)}%</td>
                            <td>${region.classifier}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        </section>`;
  }

  /**
   * Generate recommendations section
   */
  private generateRecommendationsSection(classification?: ClassificationSummary): string {
    if (!classification) return "";

    const recommendation = this.generateRecommendation(classification);

    return `
        <section class="section">
            <h2>Recommendations</h2>
            <div class="recommendation-box">
                <h3>Analysis Result</h3>
                <p>${recommendation}</p>
            </div>
        </section>`;
  }

  /**
   * Generate recommendation based on classification
   */
  private generateRecommendation(classification: ClassificationSummary): string {
    const { byType, confidence } = classification;

    if (confidence.avg < 0.5) {
      return "Low confidence in classification. Manual review recommended.";
    }

    const dominantType = Object.entries(byType)
      .filter(([type]) => type !== "unknown")
      .sort(([, a], [, b]) => b - a)[0];

    if (!dominantType || dominantType[1] === 0) {
      return "No significant changes detected.";
    }

    const [type] = dominantType;

    switch (type as DifferenceType) {
      case DifferenceType.CONTENT:
        return "Content changes detected. Review text and image updates for accuracy.";
      case DifferenceType.STYLE:
        return "Style changes detected. Verify CSS and theme modifications are intentional.";
      case DifferenceType.LAYOUT:
        return "Layout shifts detected. Check responsive design and element positioning.";
      case DifferenceType.SIZE:
        return "Size changes detected. Ensure scaling and dimensions are correct.";
      case DifferenceType.STRUCTURAL:
        return "Structural changes detected. Review DOM modifications for functionality.";
      case DifferenceType.NEW_ELEMENT:
        return "New elements detected. Verify feature additions are complete.";
      case DifferenceType.REMOVED_ELEMENT:
        return "Elements removed. Confirm no functionality was accidentally deleted.";
      default:
        return "Changes detected. Manual review recommended.";
    }
  }

  /**
   * Generate JavaScript for interactivity
   */
  private generateScripts(): string {
    return `<script>
        // Add interactivity here if needed
        document.addEventListener('DOMContentLoaded', function() {
            // Animate confidence meters
            const confidenceFills = document.querySelectorAll('.confidence-fill');
            confidenceFills.forEach(fill => {
                const width = fill.style.width;
                fill.style.width = '0';
                setTimeout(() => {
                    fill.style.width = width;
                }, 100);
            });
            
            // Add hover effects to regions table
            const rows = document.querySelectorAll('.regions-table tbody tr');
            rows.forEach(row => {
                row.addEventListener('mouseenter', function() {
                    this.style.backgroundColor = 'var(--bg-secondary)';
                });
                row.addEventListener('mouseleave', function() {
                    this.style.backgroundColor = '';
                });
            });
        });
    </script>`;
  }
}
