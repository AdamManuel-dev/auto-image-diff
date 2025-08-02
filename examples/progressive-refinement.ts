/**
 * Progressive Refinement Example
 * 
 * This example shows how to use progressive refinement to iteratively
 * improve comparison accuracy by identifying and excluding regions
 * that commonly have non-significant changes.
 */

import { ImageProcessor, ProgressiveRefiner } from '../src';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as readline from 'readline/promises';

async function progressiveRefinement() {
  const processor = new ImageProcessor();
  const refiner = new ProgressiveRefiner({
    minConfidence: 0.7,
    excludeTypes: [], // Don't exclude any types by default
    targetDifferenceThreshold: 0.5, // Target < 0.5% difference
    maxIterations: 10
  });
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Define paths
  const before = path.join(__dirname, 'screenshots', 'page-before.png');
  const after = path.join(__dirname, 'screenshots', 'page-after.png');
  const outputDir = path.join(__dirname, 'output', 'refinement');
  
  try {
    console.log('🔄 Starting Progressive Refinement...\n');
    
    // Load existing exclusions if available
    const exclusionsPath = path.join(outputDir, 'exclusions.json');
    let exclusions = null;
    try {
      const data = await fs.readFile(exclusionsPath, 'utf-8');
      exclusions = JSON.parse(data);
      console.log('📋 Loaded existing exclusions\n');
    } catch {
      console.log('📋 No existing exclusions found\n');
    }
    
    // Initial comparison
    console.log('🔍 Running initial comparison...');
    const initialResult = await processor.generateDiff(before, after, 
      path.join(outputDir, 'diff-initial.png'), {
        runClassification: true,
        exclusions: exclusions
      });
    
    console.log(`Initial difference: ${initialResult.statistics.percentageDifferent.toFixed(2)}%\n`);
    
    // Start refinement
    const { suggestions, session } = await refiner.startRefinement(
      initialResult, 
      exclusions
    );
    
    if (suggestions.length === 0) {
      console.log('✅ No refinements needed!');
      process.exit(0);
    }
    
    console.log(`Found ${suggestions.length} refinement suggestions:\n`);
    
    // Display suggestions
    suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion.type.toUpperCase()}: ${suggestion.reason}`);
      console.log(`   Confidence: ${(suggestion.confidence * 100).toFixed(1)}%`);
      if (suggestion.region) {
        console.log(`   Location: (${suggestion.region.bounds.x}, ${suggestion.region.bounds.y})`);
        console.log(`   Size: ${suggestion.region.bounds.width}x${suggestion.region.bounds.height}`);
      }
      console.log();
    });
    
    // Non-interactive mode for testing - accept first suggestion
    const accepted: number[] = [0];
    const rejected: number[] = [];
    
    console.log('Auto-accepting first suggestion for demo...');
    rl.close();
    
    if (accepted.length === 0) {
      console.log('\nNo suggestions accepted.');
      process.exit(0);
    }
    
    // Apply refinements
    console.log(`\n✅ Applying ${accepted.length} refinements...`);
    await refiner.applyRefinement(suggestions, accepted, rejected);
    
    // Create updated exclusions based on accepted suggestions
    const updatedExclusions = exclusions || { version: '1.0', regions: [] };
    suggestions.forEach((suggestion, index) => {
      if (accepted.includes(index) && suggestion.type === 'exclude' && suggestion.region) {
        updatedExclusions.regions.push({
          name: `auto-excluded-${Date.now()}-${index}`,
          bounds: suggestion.region.bounds,
          reason: suggestion.reason
        });
      }
    });
    
    // Save exclusions
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(exclusionsPath, JSON.stringify(updatedExclusions, null, 2));
    console.log(`💾 Saved exclusions to: ${exclusionsPath}`);
    
    // Run comparison with new exclusions
    console.log('\n🔍 Running refined comparison...');
    const refinedResult = await processor.generateDiff(before, after, 
      path.join(outputDir, 'diff-refined.png'), {
        runClassification: true,
        exclusions: updatedExclusions,
        embedMetadata: true
      });
    
    console.log(`\n📊 Refinement Results:`);
    console.log(`   Initial difference: ${initialResult.statistics.percentageDifferent.toFixed(2)}%`);
    console.log(`   Refined difference: ${refinedResult.statistics.percentageDifferent.toFixed(2)}%`);
    console.log(`   Improvement: ${(initialResult.statistics.percentageDifferent - refinedResult.statistics.percentageDifferent).toFixed(2)}%`);
    
    // Generate report
    const report = refiner.generateReport();
    const reportPath = path.join(outputDir, 'refinement-report.txt');
    await fs.writeFile(reportPath, report);
    console.log(`\n📄 Refinement report saved to: ${reportPath}`);
    
    // Save session for future use
    const sessionPath = path.join(outputDir, 'refinement-session.json');
    await fs.writeFile(sessionPath, JSON.stringify({
      session,
      accepted,
      rejected,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log('✨ Progressive refinement complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the example
progressiveRefinement();