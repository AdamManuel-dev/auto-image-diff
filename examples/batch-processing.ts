/**
 * Batch Processing Example
 * 
 * This example demonstrates batch processing of multiple images
 * with parallel execution and comprehensive reporting.
 */

import { BatchProcessor } from '../src';
import * as path from 'path';
import * as fs from 'fs/promises';

async function batchProcessing() {
  const batchProcessor = new BatchProcessor();
  
  // Define directories
  const referenceDir = path.join(__dirname, 'screenshots', 'baseline');
  const targetDir = path.join(__dirname, 'screenshots', 'current');
  const outputDir = path.join(__dirname, 'output', 'batch-results');
  
  try {
    console.log('🚀 Starting batch processing...\n');
    
    // Configure batch processing
    const result = await batchProcessor.processBatch(referenceDir, targetDir, {
      pattern: '**/*.png',
      recursive: true,
      outputDir: outputDir,
      threshold: 0.5,
      
      // Enable parallel processing
      parallel: true,
      maxConcurrency: 4,
      
      // Enable smart features
      runClassification: true,
      smartPairing: true,
      
      // Define exclusion regions for dynamic content
      exclusions: {
        version: '1.0',
        regions: [
          {
            name: 'timestamp',
            bounds: { x: 10, y: 10, width: 200, height: 30 },
            reason: 'Dynamic timestamp'
          },
          {
            name: 'user-avatar',
            bounds: { x: 1000, y: 20, width: 40, height: 40 },
            reason: 'User-specific content'
          }
        ]
      },
      
      // Enable batch summary generation
      generateSummary: true,
      embedMetadata: true
    });
    
    // Display results
    console.log('📊 Batch Processing Complete!');
    console.log(`   Total files: ${result.totalFiles}`);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Failed: ${result.failed}`);
    console.log(`   Success rate: ${((result.processed / result.totalFiles) * 100).toFixed(1)}%`);
    
    console.log('\n📈 Summary:');
    console.log(`   Matching images: ${result.summary.matchingImages}`);
    console.log(`   Different images: ${result.summary.differentImages}`);
    console.log(`   Average difference: ${result.summary.averageDifference.toFixed(2)}%`);
    
    // Display top differences
    const topDifferences = result.results
      .filter(r => r.result && !r.result.isEqual)
      .sort((a, b) => (b.result?.statistics.percentageDifferent || 0) - (a.result?.statistics.percentageDifferent || 0))
      .slice(0, 5);
    
    if (topDifferences.length > 0) {
      console.log('\n🔝 Top Differences:');
      topDifferences.forEach((item, index) => {
        const filename = path.basename(item.reference);
        const diff = item.result?.statistics.percentageDifferent || 0;
        console.log(`   ${index + 1}. ${filename}: ${diff.toFixed(2)}% different`);
      });
    }
    
    // Display failures if any
    if (result.failed > 0) {
      console.log('\n❌ Failed Comparisons:');
      result.results
        .filter(r => r.error)
        .forEach(item => {
          console.log(`   - ${path.basename(item.reference)}: ${item.error}`);
        });
    }
    
    // Save detailed report
    const reportPath = path.join(outputDir, 'batch-report.json');
    await fs.writeFile(reportPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    // Generate HTML summary if available
    if (result.htmlSummary) {
      const htmlPath = path.join(outputDir, 'summary.html');
      await fs.writeFile(htmlPath, result.htmlSummary);
      console.log(`📊 HTML summary saved to: ${htmlPath}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the example
batchProcessing();