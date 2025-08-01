/**
 * Smart Classification Example
 * 
 * This example shows how to use the intelligent classification system
 * to categorize the types of changes detected between images.
 */

import { ImageProcessor } from '../src';
import * as path from 'path';
import * as fs from 'fs/promises';

async function smartClassification() {
  const processor = new ImageProcessor();
  
  // Define paths
  const before = path.join(__dirname, 'screenshots', 'app-before.png');
  const after = path.join(__dirname, 'screenshots', 'app-after.png');
  const diffPath = path.join(__dirname, 'output', 'app-diff-classified.png');
  const reportPath = path.join(__dirname, 'output', 'classification-report.json');
  
  try {
    console.log('🤖 Running smart classification...\n');
    
    // Generate diff with classification
    const result = await processor.generateDiff(before, after, diffPath, {
      highlightColor: 'magenta',
      runClassification: true,
      embedMetadata: true
    });
    
    if (!result.classification) {
      console.log('No differences found to classify.');
      return;
    }
    
    const { classification } = result;
    
    // Display classification summary
    console.log('📊 Classification Summary:');
    console.log(`   Total regions analyzed: ${classification.totalRegions}`);
    console.log(`   Classified regions: ${classification.classifiedRegions}`);
    console.log(`   Unclassified regions: ${classification.unclassifiedRegions}`);
    console.log(`   Average confidence: ${(classification.confidence.avg * 100).toFixed(1)}%`);
    
    // Display breakdown by type
    console.log('\n📈 Changes by Type:');
    const sortedTypes = Object.entries(classification.byType)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a);
    
    for (const [type, count] of sortedTypes) {
      const percentage = ((count / classification.totalRegions) * 100).toFixed(1);
      console.log(`   - ${type}: ${count} regions (${percentage}%)`);
    }
    
    // Display top changes
    console.log('\n🔝 Top Changes:');
    classification.regions
      .sort((a, b) => b.classification.confidence - a.classification.confidence)
      .slice(0, 5)
      .forEach((region, index) => {
        console.log(`   ${index + 1}. ${region.classification.type.toUpperCase()}`);
        console.log(`      Confidence: ${(region.classification.confidence * 100).toFixed(1)}%`);
        console.log(`      Location: (${region.region.bounds.x}, ${region.region.bounds.y})`);
        console.log(`      Size: ${region.region.bounds.width}x${region.region.bounds.height}`);
        if (region.classification.subType) {
          console.log(`      Subtype: ${region.classification.subType}`);
        }
      });
    
    // Generate recommendations
    console.log('\n💡 Recommendations:');
    const recommendations = generateRecommendations(classification);
    recommendations.forEach(rec => console.log(`   - ${rec}`));
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      images: { before, after },
      statistics: result.statistics,
      classification: classification,
      recommendations: recommendations
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function generateRecommendations(classification: any): string[] {
  const recommendations: string[] = [];
  const { byType, confidence } = classification;
  
  if (confidence.avg < 0.6) {
    recommendations.push('Low confidence scores detected. Consider manual review.');
  }
  
  if (byType.content > 0) {
    recommendations.push(`Found ${byType.content} content changes. Review text and data updates.`);
  }
  
  if (byType.style > 0) {
    recommendations.push(`Found ${byType.style} style changes. Check CSS and theme consistency.`);
  }
  
  if (byType.layout > 0) {
    recommendations.push(`Found ${byType.layout} layout changes. Verify responsive design.`);
  }
  
  if (byType.structural > 0) {
    recommendations.push(`Found ${byType.structural} structural changes. Review DOM modifications.`);
  }
  
  if (byType.new_element > 0 || byType.removed_element > 0) {
    recommendations.push('Elements were added or removed. Verify feature changes.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('No significant changes detected.');
  }
  
  return recommendations;
}

// Run the example
smartClassification();