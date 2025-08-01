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
import { FixSuggestion, CssFixSuggester } from "./css-fix-suggester";
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
  cssSuggestions?: FixSuggestion[];
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
        
        ${data.cssSuggestions && data.cssSuggestions.length > 0 ? this.generateCssSuggestionsSection(data.cssSuggestions) : ""}
        
        ${this.generateRecommendationsSection(classification)}
    </div>
    
    <script>
        // Pass regions data to JavaScript
        window.regionsData = ${JSON.stringify(regions || [])};
    </script>
    
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

        /* Before/After Slider Styles */
        .slider-container {
            position: relative;
            width: 100%;
            max-width: 1200px;
            margin: 20px auto;
            overflow: hidden;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .slider-wrapper {
            position: relative;
            width: 100%;
            height: 600px;
            user-select: none;
        }

        .slider-image {
            position: absolute;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        .slider-image img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: var(--bg-tertiary);
        }

        .slider-before {
            left: 0;
            z-index: 2;
            clip-path: inset(0 50% 0 0);
        }

        .slider-after {
            left: 0;
            z-index: 1;
        }

        .slider-label {
            position: absolute;
            top: 20px;
            padding: 5px 15px;
            background: rgba(0,0,0,0.7);
            color: white;
            border-radius: 4px;
            font-size: 0.9rem;
            font-weight: 500;
        }

        .slider-before .slider-label {
            left: 20px;
        }

        .slider-after .slider-label {
            right: 20px;
        }

        .slider-handle {
            position: absolute;
            top: 0;
            left: 50%;
            width: 4px;
            height: 100%;
            background: var(--accent);
            cursor: ew-resize;
            z-index: 3;
            transform: translateX(-50%);
        }

        .slider-handle::before,
        .slider-handle::after {
            content: '';
            position: absolute;
            left: 50%;
            width: 40px;
            height: 40px;
            background: var(--accent);
            border-radius: 50%;
            transform: translateX(-50%);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .slider-handle::before {
            top: 50%;
            transform: translate(-50%, -50%);
        }

        .handle-icon {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-weight: bold;
            font-size: 1.2rem;
            pointer-events: none;
        }

        .view-toggle {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin: 20px 0;
        }

        .toggle-btn {
            padding: 8px 20px;
            border: 2px solid var(--border);
            background: var(--bg-secondary);
            color: var(--text-primary);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.9rem;
            font-weight: 500;
        }

        .toggle-btn:hover {
            background: var(--bg-tertiary);
        }

        .toggle-btn.active {
            background: var(--accent);
            color: white;
            border-color: var(--accent);
        }

        /* Region Highlighting Styles */
        .region-overlays {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 4;
        }

        .region-highlight {
            position: absolute;
            border: 2px solid;
            background: rgba(255, 255, 255, 0.1);
            transition: all 0.2s ease;
            pointer-events: auto;
            cursor: pointer;
        }

        .region-highlight:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.02);
        }

        .region-highlight.type-content {
            border-color: #3498db;
            box-shadow: 0 0 10px rgba(52, 152, 219, 0.5);
        }

        .region-highlight.type-style {
            border-color: #9b59b6;
            box-shadow: 0 0 10px rgba(155, 89, 182, 0.5);
        }

        .region-highlight.type-layout {
            border-color: #e74c3c;
            box-shadow: 0 0 10px rgba(231, 76, 60, 0.5);
        }

        .region-highlight.type-size {
            border-color: #f39c12;
            box-shadow: 0 0 10px rgba(243, 156, 18, 0.5);
        }

        .region-highlight.type-structural {
            border-color: #2ecc71;
            box-shadow: 0 0 10px rgba(46, 204, 113, 0.5);
        }

        .region-highlight.type-new_element {
            border-color: #27ae60;
            box-shadow: 0 0 10px rgba(39, 174, 96, 0.5);
        }

        .region-highlight.type-removed_element {
            border-color: #e74c3c;
            box-shadow: 0 0 10px rgba(231, 76, 60, 0.5);
        }

        .region-tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 0.85rem;
            white-space: nowrap;
            z-index: 10;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .region-tooltip.show {
            opacity: 1;
        }

        .region-toggle-controls {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin: 15px 0;
            flex-wrap: wrap;
        }

        .region-toggle {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.9rem;
        }

        .region-toggle input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }

        /* CSS Suggestions Styles */
        .css-suggestions {
            display: grid;
            gap: 20px;
            margin-bottom: 30px;
        }

        .suggestion-card {
            background: var(--bg-secondary);
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid;
            transition: transform 0.2s;
        }

        .suggestion-card:hover {
            transform: translateX(5px);
        }

        .suggestion-card.high-priority {
            border-left-color: var(--danger);
        }

        .suggestion-card.medium-priority {
            border-left-color: var(--warning);
        }

        .suggestion-card.low-priority {
            border-left-color: var(--success);
        }

        .suggestion-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .suggestion-type {
            font-size: 0.85rem;
        }

        .suggestion-priority {
            font-size: 0.85rem;
            color: var(--text-secondary);
            text-transform: uppercase;
        }

        .suggestion-description {
            margin-bottom: 15px;
            color: var(--text-primary);
        }

        .suggestion-fixes {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .fix-item {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.9rem;
        }

        .fix-property {
            background: var(--bg-tertiary);
            padding: 2px 8px;
            border-radius: 4px;
            font-family: monospace;
            color: var(--accent);
        }

        .fix-value {
            flex: 1;
            color: var(--text-secondary);
            font-family: monospace;
        }

        .fix-confidence {
            font-size: 0.85rem;
            color: var(--text-secondary);
            background: var(--bg-tertiary);
            padding: 2px 6px;
            border-radius: 3px;
        }

        .css-output {
            background: var(--bg-tertiary);
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }

        .css-output h3 {
            margin-bottom: 15px;
            color: var(--text-primary);
        }

        .css-output pre {
            margin: 0;
            overflow-x: auto;
        }

        .css-output code {
            background: none;
            padding: 0;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 0.9rem;
            line-height: 1.5;
            color: var(--text-primary);
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

            .slider-wrapper {
                height: 400px;
            }

            .handle-icon {
                font-size: 1rem;
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
            
            <!-- Before/After Slider -->
            <div class="slider-container" id="imageSlider">
                <div class="slider-wrapper">
                    <div class="slider-image slider-before">
                        <img src="${image1}" alt="Original Image" />
                        <div class="slider-label">Before</div>
                        <div class="region-overlays" id="regionsOverlayBefore"></div>
                    </div>
                    <div class="slider-image slider-after">
                        <img src="${image2}" alt="Compared Image" />
                        <div class="slider-label">After</div>
                        <div class="region-overlays" id="regionsOverlayAfter"></div>
                    </div>
                    <div class="slider-handle" id="sliderHandle">
                        <span class="handle-icon">⟷</span>
                    </div>
                </div>
            </div>
            
            <!-- Region Toggle Controls -->
            <div class="region-toggle-controls">
                <label class="region-toggle">
                    <input type="checkbox" id="toggleRegions" checked>
                    <span>Show Regions</span>
                </label>
                <label class="region-toggle">
                    <input type="checkbox" id="toggleTooltips" checked>
                    <span>Show Tooltips</span>
                </label>
            </div>
            
            <!-- Traditional Grid View -->
            <div class="view-toggle">
                <button class="toggle-btn active" data-view="slider">Slider View</button>
                <button class="toggle-btn" data-view="grid">Grid View</button>
            </div>
            
            <div class="image-comparison" style="display: none;">
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
                        <tr data-region-id="${region.id}">
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
   * Generate CSS suggestions section
   */
  private generateCssSuggestionsSection(suggestions: FixSuggestion[]): string {
    const suggester = new CssFixSuggester();
    const cssCode = suggester.formatAsCss(suggestions);

    return `
        <section class="section">
            <h2>CSS Fix Suggestions</h2>
            
            <div class="css-suggestions">
                ${suggestions
                  .map(
                    (suggestion) => `
                    <div class="suggestion-card ${suggestion.priority}-priority">
                        <div class="suggestion-header">
                            <span class="suggestion-type type-badge type-${suggestion.type}">${suggestion.type}</span>
                            <span class="suggestion-priority">${suggestion.priority} priority</span>
                        </div>
                        <p class="suggestion-description">${suggestion.description}</p>
                        <div class="suggestion-fixes">
                            ${suggestion.fixes
                              .map(
                                (fix) => `
                                <div class="fix-item">
                                    <code class="fix-property">${fix.property}</code>
                                    <span class="fix-value">${fix.newValue}</span>
                                    <span class="fix-confidence">${Math.round(fix.confidence * 100)}%</span>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
            
            <div class="css-output">
                <h3>Generated CSS</h3>
                <pre><code class="language-css">${this.escapeHtml(cssCode)}</code></pre>
            </div>
        </section>`;
  }

  /**
   * Escape HTML for safe display
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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

            // Before/After Slider functionality
            const sliderHandle = document.getElementById('sliderHandle');
            const sliderContainer = document.getElementById('imageSlider');
            const sliderBefore = document.querySelector('.slider-before');
            
            if (sliderHandle && sliderContainer && sliderBefore) {
                let isDragging = false;
                let startX = 0;
                let startLeft = 0;
                
                function updateSliderPosition(clientX) {
                    const rect = sliderContainer.getBoundingClientRect();
                    const x = clientX - rect.left;
                    const percent = (x / rect.width) * 100;
                    const clampedPercent = Math.max(0, Math.min(100, percent));
                    
                    sliderHandle.style.left = clampedPercent + '%';
                    sliderBefore.style.clipPath = 'inset(0 ' + (100 - clampedPercent) + '% 0 0)';
                }
                
                // Mouse events
                sliderHandle.addEventListener('mousedown', function(e) {
                    isDragging = true;
                    startX = e.clientX;
                    const rect = sliderContainer.getBoundingClientRect();
                    startLeft = (parseFloat(sliderHandle.style.left) || 50) * rect.width / 100;
                    e.preventDefault();
                });
                
                document.addEventListener('mousemove', function(e) {
                    if (isDragging) {
                        updateSliderPosition(e.clientX);
                    }
                });
                
                document.addEventListener('mouseup', function() {
                    isDragging = false;
                });
                
                // Touch events
                sliderHandle.addEventListener('touchstart', function(e) {
                    isDragging = true;
                    const touch = e.touches[0];
                    startX = touch.clientX;
                    const rect = sliderContainer.getBoundingClientRect();
                    startLeft = (parseFloat(sliderHandle.style.left) || 50) * rect.width / 100;
                    e.preventDefault();
                });
                
                document.addEventListener('touchmove', function(e) {
                    if (isDragging) {
                        const touch = e.touches[0];
                        updateSliderPosition(touch.clientX);
                    }
                });
                
                document.addEventListener('touchend', function() {
                    isDragging = false;
                });
                
                // Click anywhere on the slider to jump to position
                sliderContainer.addEventListener('click', function(e) {
                    if (e.target !== sliderHandle && !sliderHandle.contains(e.target)) {
                        updateSliderPosition(e.clientX);
                    }
                });
            }
            
            // View toggle functionality
            const toggleButtons = document.querySelectorAll('.toggle-btn');
            const sliderView = document.querySelector('.slider-container');
            const gridView = document.querySelector('.image-comparison');
            
            toggleButtons.forEach(btn => {
                btn.addEventListener('click', function() {
                    toggleButtons.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    
                    const view = this.getAttribute('data-view');
                    if (view === 'slider') {
                        sliderView.style.display = 'block';
                        gridView.style.display = 'none';
                    } else {
                        sliderView.style.display = 'none';
                        gridView.style.display = 'grid';
                    }
                });
            });

            // Region highlighting functionality
            function initializeRegions() {
                const regionsOverlayBefore = document.getElementById('regionsOverlayBefore');
                const regionsOverlayAfter = document.getElementById('regionsOverlayAfter');
                const toggleRegions = document.getElementById('toggleRegions');
                const toggleTooltips = document.getElementById('toggleTooltips');
                const tooltip = document.createElement('div');
                tooltip.className = 'region-tooltip';
                document.body.appendChild(tooltip);
                
                if (!window.regionsData || window.regionsData.length === 0) return;
                
                // Create region highlights
                window.regionsData.forEach(region => {
                    // Create highlight for before image
                    const highlightBefore = createRegionHighlight(region);
                    regionsOverlayBefore.appendChild(highlightBefore);
                    
                    // Create highlight for after image
                    const highlightAfter = createRegionHighlight(region);
                    regionsOverlayAfter.appendChild(highlightAfter);
                    
                    // Add hover events
                    [highlightBefore, highlightAfter].forEach(highlight => {
                        highlight.addEventListener('mouseenter', function(e) {
                            if (toggleTooltips.checked) {
                                showTooltip(e, region);
                            }
                        });
                        
                        highlight.addEventListener('mouseleave', function() {
                            tooltip.classList.remove('show');
                        });
                        
                        highlight.addEventListener('click', function() {
                            // Scroll to region in table
                            const regionRow = document.querySelector('tr[data-region-id="' + region.id + '"]');
                            if (regionRow) {
                                regionRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                regionRow.style.backgroundColor = 'var(--accent)';
                                setTimeout(() => {
                                    regionRow.style.backgroundColor = '';
                                }, 1000);
                            }
                        });
                    });
                });
                
                // Toggle regions visibility
                toggleRegions.addEventListener('change', function() {
                    const overlays = document.querySelectorAll('.region-overlays');
                    overlays.forEach(overlay => {
                        overlay.style.display = this.checked ? 'block' : 'none';
                    });
                });
                
                function createRegionHighlight(region) {
                    const highlight = document.createElement('div');
                    highlight.className = 'region-highlight type-' + region.type;
                    highlight.style.left = region.bounds.x + 'px';
                    highlight.style.top = region.bounds.y + 'px';
                    highlight.style.width = region.bounds.width + 'px';
                    highlight.style.height = region.bounds.height + 'px';
                    highlight.setAttribute('data-region-id', region.id);
                    return highlight;
                }
                
                function showTooltip(e, region) {
                    const rect = e.target.getBoundingClientRect();
                    tooltip.textContent = 'Region #' + region.id + ' - ' + region.type + ' (' + Math.round(region.confidence * 100) + '%)';
                    tooltip.style.left = rect.left + rect.width / 2 + 'px';
                    tooltip.style.top = rect.top - 30 + 'px';
                    tooltip.style.transform = 'translateX(-50%)';
                    tooltip.classList.add('show');
                }
            }
            
            // Initialize regions after images load
            const images = document.querySelectorAll('.slider-image img');
            let loadedCount = 0;
            
            images.forEach(img => {
                if (img.complete) {
                    loadedCount++;
                    if (loadedCount === images.length) {
                        initializeRegions();
                    }
                } else {
                    img.addEventListener('load', function() {
                        loadedCount++;
                        if (loadedCount === images.length) {
                            initializeRegions();
                        }
                    });
                }
            });
        });
    </script>`;
  }
}
