/**
 * CSS Fix Suggestions Example
 * 
 * This example demonstrates how to use the CSS fix suggestion system
 * to automatically generate CSS fixes for detected style changes.
 */

import { ImageProcessor, CssFixSuggester } from '../src';
import * as path from 'path';
import * as fs from 'fs/promises';

async function cssSuggestions() {
  const processor = new ImageProcessor();
  const suggester = new CssFixSuggester();
  
  // Define paths
  const before = path.join(__dirname, 'screenshots', 'component-v1.png');
  const after = path.join(__dirname, 'screenshots', 'component-v2.png');
  const outputDir = path.join(__dirname, 'output', 'css-fixes');
  
  try {
    console.log('🎨 Analyzing style changes and generating CSS fixes...\n');
    
    // Generate diff with classification and CSS suggestions
    const result = await processor.generateDiff(before, after, 
      path.join(outputDir, 'style-diff.png'), {
        runClassification: true,
        suggestCssFixes: true,
        cssSelector: '.my-component', // Optional: specify component selector
        embedMetadata: true
      });
    
    if (!result.classification) {
      console.log('No differences found.');
      return;
    }
    
    // Display classification summary
    console.log('📊 Change Summary:');
    console.log(`   Total changes: ${result.classification.totalRegions}`);
    console.log(`   Style changes: ${result.classification.byType.style || 0}`);
    console.log(`   Layout changes: ${result.classification.byType.layout || 0}`);
    console.log(`   Content changes: ${result.classification.byType.content || 0}`);
    
    // Get CSS suggestions
    if (result.cssSuggestions && result.cssSuggestions.length > 0) {
      console.log(`\n💡 CSS Fix Suggestions (${result.cssSuggestions.length} total):\n`);
      
      // Sort by confidence
      const sortedSuggestions = [...result.cssSuggestions]
        .sort((a, b) => b.confidence - a.confidence);
      
      // Display top suggestions
      sortedSuggestions.slice(0, 10).forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion.description}`);
        console.log(`   Property: ${suggestion.property}`);
        console.log(`   Value: ${suggestion.value}`);
        console.log(`   Confidence: ${(suggestion.confidence * 100).toFixed(1)}%`);
        if (suggestion.reason) {
          console.log(`   Reason: ${suggestion.reason}`);
        }
        console.log();
      });
      
      // Generate CSS file
      const cssCode = suggester.formatAsCss(sortedSuggestions);
      const cssPath = path.join(outputDir, 'suggested-fixes.css');
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(cssPath, cssCode);
      console.log(`📄 CSS fixes saved to: ${cssPath}`);
      
      // Generate detailed report
      const report = {
        timestamp: new Date().toISOString(),
        images: { before, after },
        statistics: result.statistics,
        classification: result.classification,
        suggestions: {
          total: result.cssSuggestions.length,
          byPriority: {
            high: result.cssSuggestions.filter(s => s.priority === 'high').length,
            medium: result.cssSuggestions.filter(s => s.priority === 'medium').length,
            low: result.cssSuggestions.filter(s => s.priority === 'low').length
          },
          byProperty: groupBy(result.cssSuggestions, 'property'),
          all: result.cssSuggestions
        }
      };
      
      const reportPath = path.join(outputDir, 'css-analysis-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📊 Detailed report saved to: ${reportPath}`);
      
      // Generate HTML preview
      const htmlPreview = generateHtmlPreview(
        result.cssSuggestions,
        result.classification,
        cssCode
      );
      const htmlPath = path.join(outputDir, 'preview.html');
      await fs.writeFile(htmlPath, htmlPreview);
      console.log(`🌐 HTML preview saved to: ${htmlPath}`);
      
    } else {
      console.log('\n✅ No CSS fixes needed!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const group = String(item[key]);
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

function generateHtmlPreview(suggestions: any[], classification: any, cssCode: string): string {
  return `<!DOCTYPE html>
<html>
<head>
    <title>CSS Fix Suggestions</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .stats { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .suggestions { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .suggestion { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
        .high { border-left: 4px solid #ff4444; }
        .medium { border-left: 4px solid #ffaa00; }
        .low { border-left: 4px solid #00aa00; }
        .code-block { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
        pre { margin: 0; }
        .property { color: #0066cc; font-weight: bold; }
        .value { color: #009900; }
    </style>
</head>
<body>
    <div class="container">
        <h1>CSS Fix Suggestions</h1>
        
        <div class="stats">
            <h2>Summary</h2>
            <p>Total regions analyzed: ${classification.totalRegions}</p>
            <p>Style changes detected: ${classification.byType.style || 0}</p>
            <p>Total suggestions: ${suggestions.length}</p>
        </div>
        
        <h2>Suggested CSS Fixes</h2>
        <div class="code-block">
            <pre>${escapeHtml(cssCode)}</pre>
        </div>
        
        <h2>Individual Suggestions</h2>
        <div class="suggestions">
            ${suggestions.map(s => `
                <div class="suggestion ${s.priority}">
                    <h3>${s.description}</h3>
                    <p><span class="property">${s.property}</span>: <span class="value">${s.value}</span></p>
                    <p>Confidence: ${(s.confidence * 100).toFixed(1)}%</p>
                    ${s.reason ? `<p><em>${s.reason}</em></p>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Run the example
cssSuggestions();