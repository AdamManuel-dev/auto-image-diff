/**
 * Metadata Tracking Example
 * 
 * This example demonstrates enhanced metadata tracking including
 * git information, environment details, and PNG metadata embedding.
 */

import { ImageProcessor, PngMetadataEmbedder, MetadataEnhancer } from '../src';
import * as path from 'path';
import * as fs from 'fs/promises';

async function metadataTracking() {
  const processor = new ImageProcessor();
  const embedder = new PngMetadataEmbedder();
  const enhancer = new MetadataEnhancer();
  
  // Define paths
  const before = path.join(__dirname, 'screenshots', 'feature-before.png');
  const after = path.join(__dirname, 'screenshots', 'feature-after.png');
  const outputDir = path.join(__dirname, 'output', 'metadata-example');
  const diffPath = path.join(outputDir, 'diff-with-metadata.png');
  
  try {
    console.log('🔍 Collecting enhanced metadata...\n');
    
    // Collect environment metadata
    const metadata = await enhancer.collectMetadata(
      'compare',
      [before, after, diffPath]
    );
    
    console.log('📊 Environment Information:');
    console.log(`   Node Version: ${metadata.environment.nodeVersion}`);
    console.log(`   Platform: ${metadata.environment.platform}`);
    console.log(`   CPU Count: ${metadata.environment.cpuCount}`);
    console.log(`   Memory: ${metadata.environment.totalMemory}`);
    if (metadata.environment.imageMagickVersion) {
      console.log(`   ImageMagick: ${metadata.environment.imageMagickVersion}`);
    }
    
    if (metadata.git) {
      console.log('\n📚 Git Information:');
      console.log(`   Branch: ${metadata.git.branch || 'N/A'}`);
      console.log(`   Commit: ${metadata.git.commit || 'N/A'}`);
      console.log(`   Author: ${metadata.git.author || 'N/A'}`);
      console.log(`   Dirty: ${metadata.git.isDirty ? 'Yes' : 'No'}`);
      if (metadata.git.uncommittedFiles) {
        console.log(`   Uncommitted files: ${metadata.git.uncommittedFiles}`);
      }
    }
    
    console.log('\n🎯 Generating diff with embedded metadata...');
    
    // Generate diff with metadata embedding
    const result = await processor.generateDiff(before, after, diffPath, {
      runClassification: true,
      embedMetadata: true,
      highlightColor: 'magenta'
    });
    
    console.log(`✅ Diff generated: ${result.statistics.percentageDifferent.toFixed(2)}% different`);
    
    // Read back the embedded metadata
    console.log('\n📖 Reading embedded metadata from PNG...');
    const embeddedData = await embedder.extractMetadata(diffPath);
    
    if (embeddedData) {
      console.log('✅ Successfully extracted metadata:');
      console.log(`   Tool: ${embeddedData.tool}`);
      console.log(`   Version: ${embeddedData.version}`);
      console.log(`   Timestamp: ${embeddedData.timestamp}`);
      
      if (embeddedData.comparison) {
        console.log('\n📊 Comparison Details:');
        console.log(`   Reference: ${path.basename(embeddedData.comparison.referenceImage)}`);
        console.log(`   Target: ${path.basename(embeddedData.comparison.targetImage)}`);
        console.log(`   Threshold: ${embeddedData.comparison.threshold}%`);
        console.log(`   Different: ${embeddedData.comparison.statistics.percentageDifferent.toFixed(2)}%`);
      }
      
      if (embeddedData.git) {
        console.log('\n🔧 Embedded Git Info:');
        console.log(`   Commit: ${embeddedData.git.commit}`);
        console.log(`   Branch: ${embeddedData.git.branch}`);
      }
      
      // Save full metadata report
      const reportPath = path.join(outputDir, 'metadata-report.json');
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify({
        extractedFromPng: embeddedData,
        environmentMetadata: metadata,
        extractionTimestamp: new Date().toISOString()
      }, null, 2));
      
      console.log(`\n📄 Full metadata report saved to: ${reportPath}`);
      
      // Demonstrate metadata validation
      console.log('\n🔐 Validating metadata integrity...');
      const isValid = await validateMetadata(embeddedData, result);
      console.log(`   Validation: ${isValid ? '✅ PASSED' : '❌ FAILED'}`);
      
    } else {
      console.log('❌ No metadata found in PNG');
    }
    
    // Create tracking summary
    const trackingSummary = {
      executionId: generateExecutionId(),
      timestamp: new Date().toISOString(),
      environment: metadata.environment,
      git: metadata.git,
      comparison: {
        files: { before, after },
        result: result.statistics,
        classification: result.classification
      },
      metadata: {
        embedded: !!embeddedData,
        extractable: !!embeddedData
      }
    };
    
    const summaryPath = path.join(outputDir, 'tracking-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(trackingSummary, null, 2));
    console.log(`\n📋 Tracking summary saved to: ${summaryPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function generateExecutionId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function validateMetadata(embedded: any, result: any): Promise<boolean> {
  // Validate that embedded data matches actual results
  if (!embedded.comparison || !result.statistics) {
    return false;
  }
  
  const percentDiffMatch = Math.abs(
    embedded.comparison.statistics.percentageDifferent - 
    result.statistics.percentageDifferent
  ) < 0.01;
  
  const pixelCountMatch = 
    embedded.comparison.statistics.pixelsDifferent === 
    result.statistics.pixelsDifferent;
  
  return percentDiffMatch && pixelCountMatch;
}

// Run the example
metadataTracking();