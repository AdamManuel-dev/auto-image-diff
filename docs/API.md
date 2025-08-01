# Auto Image Diff API Documentation

## Table of Contents

- [Core Classes](#core-classes)
  - [ImageProcessor](#imageprocessor)
  - [BatchProcessor](#batchprocessor)
  - [ClassifierManager](#classifiermanager)
  - [ProgressiveRefiner](#progressiverefiner)
  - [MetadataEnhancer](#metadataenhancer)
- [Supporting Classes](#supporting-classes)
  - [SmartPairing](#smartpairing)
  - [CssFixSuggester](#cssfixsuggester)
  - [PngMetadataEmbedder](#pngmetadataembedder)
  - [BatchSummaryGenerator](#batchsummarygenerator)
- [Types and Interfaces](#types-and-interfaces)
- [Classifiers](#classifiers)

## Core Classes

### ImageProcessor

The main class for image comparison and diff generation.

```typescript
import { ImageProcessor } from 'auto-image-diff';

const processor = new ImageProcessor();
```

#### Methods

##### alignImages
Aligns two images using ImageMagick's subimage search.

```typescript
async alignImages(
  referenceImage: string,
  targetImage: string,
  outputPath: string,
  options?: AlignmentOptions
): Promise<void>
```

**Parameters:**
- `referenceImage`: Path to the reference image
- `targetImage`: Path to the target image to align
- `outputPath`: Where to save the aligned image
- `options`: Alignment configuration
  - `method`: 'subimage' | 'feature' | 'phase' (default: 'subimage')
  - `threshold`: Alignment threshold (optional)

##### compareImages
Compares two images and returns difference metrics.

```typescript
async compareImages(
  image1Path: string,
  image2Path: string,
  threshold?: number
): Promise<ComparisonResult>
```

**Returns:**
```typescript
{
  difference: number;
  isEqual: boolean;
  statistics: {
    pixelsDifferent: number;
    totalPixels: number;
    percentageDifferent: number;
  };
}
```

##### generateDiff
Generates a visual diff with optional classification and metadata.

```typescript
async generateDiff(
  image1Path: string,
  image2Path: string,
  outputPath: string,
  options?: DiffOptions
): Promise<ComparisonResult>
```

**Options:**
- `highlightColor`: Color for highlighting differences (default: 'red')
- `lowlight`: Whether to dim unchanged areas (default: true)
- `exclusions`: Regions to exclude from comparison
- `runClassification`: Enable smart classification
- `suggestCssFixes`: Generate CSS fix suggestions
- `cssSelector`: CSS selector for fixes
- `embedMetadata`: Embed metadata in PNG output

### BatchProcessor

Processes multiple image comparisons with parallel support.

```typescript
import { BatchProcessor } from 'auto-image-diff';

const batchProcessor = new BatchProcessor();
```

#### Methods

##### processBatch
Process a batch of image comparisons.

```typescript
async processBatch(
  referenceDir: string,
  targetDir: string,
  config: BatchProcessingConfig
): Promise<BatchResult>
```

**Config Options:**
- `pattern`: File pattern to match (default: '*.png')
- `recursive`: Scan directories recursively
- `outputDir`: Where to save results
- `threshold`: Difference threshold percentage
- `parallel`: Enable parallel processing
- `maxConcurrency`: Number of workers
- `exclusions`: Exclusion regions
- `runClassification`: Enable classification
- `smartPairing`: Use fuzzy file matching

**Returns:**
```typescript
{
  totalFiles: number;
  processed: number;
  failed: number;
  summary: {
    matchingImages: number;
    differentImages: number;
    totalPixelsDifferent: number;
    averageDifference: number;
  };
  results: Array<{
    reference: string;
    target: string;
    result?: ComparisonResult;
    error?: string;
  }>;
}
```

### ClassifierManager

Manages difference classification across multiple classifiers.

```typescript
import { ClassifierManager } from 'auto-image-diff';

const manager = new ClassifierManager();
```

#### Methods

##### registerClassifier
Register a custom classifier.

```typescript
registerClassifier(classifier: DifferenceClassifier): void
```

##### classifyRegions
Classify difference regions using all registered classifiers.

```typescript
classifyRegions(
  regions: DifferenceRegion[],
  context: AnalysisContext
): ClassificationSummary
```

**Returns:**
```typescript
{
  totalRegions: number;
  classifiedRegions: number;
  unclassifiedRegions: number;
  byType: Record<DifferenceType, number>;
  confidence: {
    min: number;
    avg: number;
    max: number;
  };
  regions: ClassifiedRegion[];
}
```

### ProgressiveRefiner

Iteratively refines comparison results for better accuracy.

```typescript
import { ProgressiveRefiner } from 'auto-image-diff';

const refiner = new ProgressiveRefiner({
  minConfidence: 0.7,
  excludeTypes: ['style'],
  targetDifferenceThreshold: 0.5,
  maxIterations: 10
});
```

#### Methods

##### startRefinement
Begin progressive refinement process.

```typescript
async startRefinement(
  initialResult: ComparisonResult,
  existingExclusions?: ExclusionsConfig
): Promise<{
  suggestions: RefinementSuggestion[];
  session: RefinementSession;
  recommendedExclusions: ExclusionsConfig;
}>
```

##### applyRefinement
Apply accepted/rejected suggestions.

```typescript
async applyRefinement(
  suggestions: RefinementSuggestion[],
  accepted: number[],
  rejected: number[]
): Promise<void>
```

##### generateReport
Generate a refinement session report.

```typescript
generateReport(): string
```

### MetadataEnhancer

Collects enhanced metadata about the execution environment.

```typescript
import { MetadataEnhancer } from 'auto-image-diff';

const enhancer = new MetadataEnhancer();
```

#### Methods

##### collectMetadata
Collect git and environment information.

```typescript
async collectMetadata(
  commandName?: string,
  commandArgs?: string[]
): Promise<EnhancedMetadata>
```

**Returns:**
```typescript
{
  git?: {
    commit?: string;
    branch?: string;
    author?: string;
    isDirty?: boolean;
    uncommittedFiles?: number;
  };
  environment: {
    nodeVersion: string;
    platform: string;
    cpuCount: number;
    totalMemory: string;
    imageMagickVersion?: string;
  };
  executionTime?: {
    start: string;
    duration?: number;
  };
}
```

## Supporting Classes

### SmartPairing

Intelligent file pairing for batch processing.

```typescript
import { SmartPairing } from 'auto-image-diff';

const pairing = new SmartPairing({
  strategy: 'similarity',
  minSimilarity: 0.7
});
```

#### Methods

##### findBestPairs
Find optimal file pairs between directories.

```typescript
findBestPairs(
  referenceFiles: string[],
  targetFiles: string[],
  referenceDir: string,
  targetDir: string
): FilePair[]
```

### CssFixSuggester

Generates CSS fixes for detected style changes.

```typescript
import { CssFixSuggester } from 'auto-image-diff';

const suggester = new CssFixSuggester();
```

#### Methods

##### suggestFixes
Generate CSS fix suggestions.

```typescript
suggestFixes(
  classifications: ClassificationResult[],
  context?: { selector?: string; element?: string }
): FixSuggestion[]
```

##### formatAsCss
Format suggestions as CSS code.

```typescript
formatAsCss(suggestions: FixSuggestion[]): string
```

### PngMetadataEmbedder

Embeds and extracts metadata from PNG files.

```typescript
import { PngMetadataEmbedder } from 'auto-image-diff';

const embedder = new PngMetadataEmbedder();
```

#### Methods

##### embedMetadata
Embed metadata into a PNG file.

```typescript
async embedMetadata(
  pngPath: string,
  metadata: EmbeddedMetadata,
  outputPath?: string
): Promise<void>
```

##### extractMetadata
Extract embedded metadata from PNG.

```typescript
async extractMetadata(pngPath: string): Promise<EmbeddedMetadata | null>
```

### BatchSummaryGenerator

Generates comprehensive batch processing reports.

```typescript
import { BatchSummaryGenerator } from 'auto-image-diff';

const generator = new BatchSummaryGenerator({
  title: 'Visual Regression Report',
  includeCharts: true,
  theme: 'light'
});
```

#### Methods

##### generateSummary
Generate summary data from batch results.

```typescript
generateSummary(
  results: BatchResult,
  additionalData?: AdditionalData
): BatchSummaryData
```

##### generateHtmlReport
Generate HTML report with visualizations.

```typescript
generateHtmlReport(summaryData: BatchSummaryData): string
```

## Types and Interfaces

### DifferenceType
```typescript
enum DifferenceType {
  CONTENT = 'content',
  STYLE = 'style',
  LAYOUT = 'layout',
  SIZE = 'size',
  STRUCTURAL = 'structural',
  NEW_ELEMENT = 'new_element',
  REMOVED_ELEMENT = 'removed_element',
  UNKNOWN = 'unknown'
}
```

### DifferenceRegion
```typescript
interface DifferenceRegion {
  id: number;
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
  version?: string;
  regions: ExclusionRegion[];
}

interface ExclusionRegion {
  name: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  reason?: string;
  selector?: string;
}
```

### RefinementSuggestion
```typescript
interface RefinementSuggestion {
  type: 'exclude' | 'include' | 'reclassify' | 'css-fix';
  reason: string;
  confidence: number;
  region?: {
    bounds: Bounds;
    selector?: string;
  };
  currentClassification?: string;
  suggestedClassification?: string;
  cssfix?: FixSuggestion;
}
```

## Classifiers

### Built-in Classifiers

#### ContentClassifier
Detects changes in text, images, and data content.

#### StyleClassifier
Identifies color, font, and visual styling changes.

#### LayoutClassifier
Detects position and arrangement changes.

#### SizeClassifier
Identifies dimension and scaling changes.

#### StructuralClassifier
Detects DOM structure modifications.

### Custom Classifiers

Create custom classifiers by extending the base class:

```typescript
import { DifferenceClassifier, DifferenceRegion, AnalysisContext } from 'auto-image-diff';

export class MyCustomClassifier extends DifferenceClassifier {
  constructor() {
    super('my-custom', 100); // name and priority
  }

  async classify(
    region: DifferenceRegion,
    context: AnalysisContext
  ): Promise<ClassificationResult | null> {
    // Your classification logic here
    return {
      type: DifferenceType.CUSTOM,
      confidence: 0.9,
      subType: 'specific-change',
      details: { /* custom data */ }
    };
  }

  canClassify(region: DifferenceRegion): boolean {
    // Return true if this classifier can handle the region
    return region.differencePercentage > 5;
  }
}
```

## Error Handling

All async methods may throw errors. Use try-catch blocks:

```typescript
try {
  const result = await processor.generateDiff(image1, image2, output);
} catch (error) {
  if (error instanceof ImageProcessingError) {
    console.error('Image processing failed:', error.message);
  } else if (error instanceof ClassificationError) {
    console.error('Classification failed:', error.message);
  }
}
```

## Best Practices

1. **Always align images first** when comparing screenshots from different sessions
2. **Use exclusion regions** for dynamic content like timestamps
3. **Enable parallel processing** for large batches
4. **Set appropriate thresholds** based on your tolerance for differences
5. **Use progressive refinement** to iteratively improve accuracy
6. **Embed metadata** for better traceability and debugging