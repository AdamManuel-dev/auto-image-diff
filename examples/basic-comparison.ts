/**
 * Basic Image Comparison Example
 * 
 * This example demonstrates the fundamental usage of auto-image-diff
 * for comparing two images and generating a visual diff.
 */

import { ImageProcessor } from '../src';
import * as path from 'path';

async function basicComparison() {
  const processor = new ImageProcessor();
  
  // Define image paths
  const image1 = path.join(__dirname, 'screenshots', 'homepage-v1.png');
  const image2 = path.join(__dirname, 'screenshots', 'homepage-v2.png');
  const outputDiff = path.join(__dirname, 'output', 'homepage-diff.png');
  
  try {
    console.log('🔍 Comparing images...');
    
    // Generate basic diff
    const result = await processor.generateDiff(image1, image2, outputDiff, {
      highlightColor: 'red',
      lowlight: true
    });
    
    // Display results
    console.log('✅ Comparison complete!');
    console.log(`📊 Statistics:`);
    console.log(`   - Pixels different: ${result.statistics.pixelsDifferent.toLocaleString()}`);
    console.log(`   - Total pixels: ${result.statistics.totalPixels.toLocaleString()}`);
    console.log(`   - Percentage different: ${result.statistics.percentageDifferent.toFixed(2)}%`);
    console.log(`   - Images are ${result.isEqual ? 'EQUAL' : 'DIFFERENT'}`);
    console.log(`📁 Diff image saved to: ${outputDiff}`);
    
    // Return exit code based on result
    process.exit(result.isEqual ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the example
basicComparison();