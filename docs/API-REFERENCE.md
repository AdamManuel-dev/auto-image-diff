# API Reference

## Table of Contents

- [Core Classes](#core-classes)
  - [ImageProcessor](#imageprocessor)
  - [BatchProcessor](#batchprocessor)
- [Classification System](#classification-system)
  - [ClassifierManager](#classifiermanager)
  - [DifferenceClassifier](#differenceclassifier)
- [Enhancement Features](#enhancement-features)
  - [CssFixSuggester](#cssfixsuggester)
  - [MetadataEnhancer](#metadataenhancer)
  - [ProgressiveRefiner](#progressiverefiner)
- [Utility Classes](#utility-classes)
  - [SmartPairing](#smartpairing)
  - [MaskGenerator](#maskgenerator)
  - [PngMetadataEmbedder](#pngmetadataembedder)
- [Types and Interfaces](#types-and-interfaces)
- [Error Handling](#error-handling)

## Core Classes

### ImageProcessor

The main class for image alignment, comparison, and diff generation.

```typescript
import { ImageProcessor } from "auto-image-diff";

const processor = new ImageProcessor();
```

#### Methods

##### `alignImages(referenceImage, targetImage, outputPath, options?)`

Aligns two images using various alignment strategies.

**Parameters:**
- `referenceImage: string` - Path to the reference (baseline) image
- `targetImage: string` - Path to the target image to align
- `outputPath: string` - Path where the aligned image will be saved
- `options?: AlignmentOptions` - Optional alignment configuration

**Returns:** `Promise<AlignmentResult>`

**Example:**
```typescript
const result = await processor.alignImages(
  'baseline.png',
  'screenshot.png',
  'aligned.png',
  { 
    method: 'opencv',
    opencvDetector: 'orb',
    threshold: 0.8
  }
);

console.log(`Aligned with offset: ${result.offset.x}, ${result.offset.y}`);
```

##### `compareImages(image1Path, image2Path, threshold?)`

Compares two images and calculates difference metrics.

**Parameters:**
- `image1Path: string` - Path to first image
- `image2Path: string` - Path to second image  
- `threshold?: number` - Percentage threshold for equality (default: 0.1)

**Returns:** `Promise<ComparisonResult>`

**Example:**
```typescript
const result = await processor.compareImages('before.png', 'after.png', 0.5);

if (result.isEqual) {
  console.log('Images are visually identical');
} else {
  console.log(`${result.statistics.pixelsDifferent} pixels differ`);
}
```

##### `generateDiff(image1Path, image2Path, outputPath, options?)`

Generates a visual difference image with optional enhancements.

**Parameters:**
- `image1Path: string` - Path to reference image
- `image2Path: string` - Path to comparison image
- `outputPath: string` - Path for output diff image
- `options?: DiffOptions` - Diff generation options

**Returns:** `Promise<ComparisonResult>`

**Example:**
```typescript
const result = await processor.generateDiff(
  'original.png',
  'modified.png',
  'diff.png',
  {
    highlightColor: 'magenta',
    lowlight: true,
    runClassification: true,
    generateCssSuggestions: true,
    embedMetadata: true,
    exclusions: {
      regions: [
        { x: 0, y: 0, width: 200, height: 50 } // Exclude header
      ]
    }
  }
);

console.log('Classification:', result.classification);
console.log('CSS Fixes:', result.cssSuggestions);
```

### BatchProcessor

Handles batch processing of multiple images with parallel execution support.

```typescript
import { BatchProcessor } from "auto-image-diff";

const batchProcessor = new BatchProcessor();
```

#### Methods

##### `processBatch(referenceDir, targetDir, options)`

Processes all images in two directories.

**Parameters:**
- `referenceDir: string` - Directory with reference images
- `targetDir: string` - Directory with target images
- `options: BatchOptions` - Batch processing configuration

**Returns:** `Promise<BatchResult>`

**Example:**
```typescript
const result = await batchProcessor.processBatch(
  './screenshots/baseline',
  './screenshots/current',
  {
    outputDir: './results',
    pattern: '**/*.png',
    recursive: true,
    parallel: true,
    maxConcurrency: 8,
    smartPairing: true,
    runClassification: true
  }
);

console.log(`Processed ${result.processed}/${result.totalFiles} images`);
console.log(`Average difference: ${result.summary.averageDifference}%`);
```

##### `generateBatchReport(results, outputDir)`

Generates HTML summary report for batch results.

**Parameters:**
- `results: BatchResult` - Batch processing results
- `outputDir: string` - Directory for report files

**Returns:** `Promise<void>`

## Classification System

### ClassifierManager

Manages the classification pipeline for analyzing differences.

```typescript
import { ClassifierManager } from "auto-image-diff/lib/classifiers";

const manager = new ClassifierManager();
```

#### Methods

##### `classifyRegions(regions, context)`

Classifies multiple difference regions.

**Parameters:**
- `regions: DifferenceRegion[]` - Regions to classify
- `context: AnalysisContext` - Image analysis context

**Returns:** `RegionClassification[]`

##### `registerClassifier(classifier)`

Registers a custom classifier.

**Parameters:**
- `classifier: DifferenceClassifier` - Classifier instance

### DifferenceClassifier

Abstract base class for creating custom classifiers.

```typescript
abstract class DifferenceClassifier {
  abstract classify(
    region: DifferenceRegion,
    context: AnalysisContext
  ): ClassificationResult | null;
  
  abstract canClassify(
    region: DifferenceRegion,
    context: AnalysisContext
  ): boolean;
}
```

**Example Custom Classifier:**
```typescript
class AnimationClassifier extends DifferenceClassifier {
  constructor() {
    super('animation', 10); // name and priority
  }

  canClassify(region, context) {
    // Check if region might be an animation
    return region.bounds.width > 50 && region.bounds.height > 50;
  }

  classify(region, context) {
    // Analyze for animation patterns
    const isAnimation = this.detectAnimationPattern(region, context);
    
    if (isAnimation) {
      return {
        type: DifferenceType.CONTENT,
        subType: 'animation',
        confidence: 0.9,
        details: { frameCount: 24 }
      };
    }
    
    return null;
  }
}
```

## Enhancement Features

### CssFixSuggester

Generates CSS suggestions to fix style differences.

```typescript
import { CssFixSuggester } from "auto-image-diff";

const suggester = new CssFixSuggester();
```

#### Methods

##### `suggestFixes(imagePath1, imagePath2, classification)`

Analyzes differences and suggests CSS fixes.

**Parameters:**
- `imagePath1: string` - Original image path
- `imagePath2: string` - Modified image path
- `classification: ClassificationSummary` - Classification results

**Returns:** `Promise<FixSuggestion[]>`

**Example:**
```typescript
const suggestions = await suggester.suggestFixes(
  'original.png',
  'styled.png',
  classificationResult
);

suggestions.forEach(fix => {
  console.log(`Selector: ${fix.selector}`);
  console.log(`CSS: ${fix.css.map(c => `${c.property}: ${c.value}`).join('; ')}`);
});
```

### MetadataEnhancer

Captures execution context and Git information.

```typescript
import { MetadataEnhancer } from "auto-image-diff";

const enhancer = new MetadataEnhancer();
```

#### Methods

##### `collectMetadata()`

Collects comprehensive metadata about the execution environment.

**Returns:** `Promise<EnhancedMetadata>`

**Example:**
```typescript
const metadata = await enhancer.collectMetadata();

console.log('Git commit:', metadata.gitInfo?.currentCommit);
console.log('Node version:', metadata.executionEnvironment.nodeVersion);
console.log('Platform:', metadata.systemInfo.platform);
```

### ProgressiveRefiner

Interactive refinement tool for improving exclusion regions.

```typescript
import { ProgressiveRefiner } from "auto-image-diff";

const refiner = new ProgressiveRefiner();
```

#### Methods

##### `startRefinementSession(baseImage, targetImage, options)`

Starts an interactive refinement session.

**Parameters:**
- `baseImage: string` - Baseline image path
- `targetImage: string` - Target image path
- `options: RefinementOptions` - Refinement configuration

**Returns:** `Promise<RefinementSession>`

## Utility Classes

### SmartPairing

Intelligent file pairing for batch processing.

```typescript
const pairing = new SmartPairing();
const pairs = pairing.findBestMatches(referenceFiles, targetFiles);
```

### MaskGenerator

Creates exclusion masks from configuration.

```typescript
const generator = new MaskGenerator();
const maskPath = await generator.generateMask(width, height, exclusions);
```

### PngMetadataEmbedder

Embeds metadata directly into PNG files.

```typescript
const embedder = new PngMetadataEmbedder();
await embedder.embedMetadata(imagePath, metadata);
const extracted = await embedder.extractMetadata(imagePath);
```

## Types and Interfaces

### AlignmentOptions
```typescript
interface AlignmentOptions {
  method: "feature" | "phase" | "subimage" | "opencv";
  threshold?: number;
  opencvDetector?: "orb" | "akaze" | "brisk";
}
```

### ComparisonResult
```typescript
interface ComparisonResult {
  difference: number;
  diffImagePath?: string;
  isEqual: boolean;
  statistics: {
    pixelsDifferent: number;
    totalPixels: number;
    percentageDifferent: number;
  };
  classification?: ClassificationSummary;
  cssSuggestions?: FixSuggestion[];
}
```

### BatchOptions
```typescript
interface BatchOptions {
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
```

### DifferenceRegion
```typescript
interface DifferenceRegion {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  pixelCount: number;
  differencePixels: number;
  differencePercentage: number;
}
```

### ClassificationResult
```typescript
interface ClassificationResult {
  type: DifferenceType;
  confidence: number; // 0-1
  subType?: string;
  details?: Record<string, unknown>;
}
```

### ExclusionsConfig
```typescript
interface ExclusionsConfig {
  regions?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    reason?: string;
  }>;
  selectors?: Array<{
    selector: string;
    reason?: string;
  }>;
  patterns?: Array<{
    name: string;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
}
```

## Error Handling

All async methods may throw errors. Common error types:

### ImageProcessingError
Thrown when ImageMagick operations fail.

```typescript
try {
  await processor.alignImages(ref, target, output);
} catch (error) {
  if (error.message.includes('ImageMagick')) {
    console.error('ImageMagick not installed');
  }
}
```

### ValidationError
Thrown when input validation fails.

```typescript
try {
  await processor.generateDiff('', '', 'output.png');
} catch (error) {
  if (error.message.includes('Invalid')) {
    console.error('Invalid input paths');
  }
}
```

### FileSystemError
Thrown when file operations fail.

```typescript
try {
  await batchProcessor.processBatch('./missing', './dir', options);
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Directory not found');
  }
}
```

## Best Practices

1. **Always handle errors** - Image processing can fail for various reasons
2. **Use appropriate thresholds** - Too low may cause false positives
3. **Enable classification** - Provides valuable insights into changes
4. **Configure exclusions** - Ignore dynamic content like timestamps
5. **Use smart pairing** - For better batch processing results
6. **Embed metadata** - For traceability and debugging
7. **Clean up temp files** - Use try/finally blocks for cleanup