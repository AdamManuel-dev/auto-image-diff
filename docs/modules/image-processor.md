# ImageProcessor Module

The core module for image processing operations including alignment, comparison, and diff generation.

## Overview

The `ImageProcessor` class provides the main functionality for:

- Image alignment using multiple methods
- Pixel-by-pixel comparison
- Visual diff generation
- Metadata handling

## API Reference

### Constructor

```typescript
const processor = new ImageProcessor(options?: ProcessorOptions);
```

**Options:**

```typescript
interface ProcessorOptions {
  verbose?: boolean;
  debug?: boolean;
  timeout?: number;
  tempDir?: string;
}
```

### Methods

#### alignImages()

Aligns two images using the specified method.

```typescript
async alignImages(
  reference: string,
  target: string,
  output: string,
  options?: AlignmentOptions
): Promise<void>
```

**Parameters:**

- `reference` - Path to reference/baseline image
- `target` - Path to target image to align
- `output` - Path for aligned output image
- `options` - Optional alignment configuration

**Options:**

```typescript
interface AlignmentOptions {
  method?: "subimage" | "phase" | "feature";
  timeout?: number;
  verbose?: boolean;
  saveIntermediate?: boolean;
}
```

**Example:**

```typescript
await processor.alignImages("baseline.png", "current.png", "aligned.png", { method: "phase" });
```

#### compareImages()

Compares two images and returns difference statistics.

```typescript
async compareImages(
  image1: string,
  image2: string,
  threshold: number
): Promise<ComparisonResult>
```

**Parameters:**

- `image1` - First image path
- `image2` - Second image path
- `threshold` - Difference threshold percentage (0-100)

**Returns:**

```typescript
interface ComparisonResult {
  difference: number;
  isEqual: boolean;
  statistics: {
    pixelsDifferent: number;
    totalPixels: number;
    percentageDifferent: number;
  };
  metadata?: {
    threshold: number;
    timestamp: string;
    processingTime: number;
  };
}
```

**Example:**

```typescript
const result = await processor.compareImages("image1.png", "image2.png", 0.1);

if (!result.isEqual) {
  console.log(`Images differ by ${result.statistics.percentageDifferent}%`);
}
```

#### generateDiff()

Generates a visual diff highlighting differences between images.

```typescript
async generateDiff(
  image1: string,
  image2: string,
  output: string,
  options?: DiffOptions
): Promise<DiffResult>
```

**Parameters:**

- `image1` - First image path
- `image2` - Second image path
- `output` - Output path for diff image
- `options` - Diff generation options

**Options:**

```typescript
interface DiffOptions {
  highlightColor?: string;
  lowlight?: boolean;
  excludeRegions?: Region[];
  smart?: boolean;
  focusTypes?: ClassificationType[];
  suggestCSS?: boolean;
  cssSelector?: string;
  embedMetadata?: boolean;
}
```

**Example:**

```typescript
const result = await processor.generateDiff("before.png", "after.png", "diff.png", {
  highlightColor: "red",
  lowlight: true,
  smart: true,
});
```

## Alignment Methods

### Subimage Search

Default method using ImageMagick's subimage search.

**Characteristics:**

- Most accurate for UI screenshots
- Handles translations well
- Slower for large images

**Usage:**

```typescript
await processor.alignImages(ref, target, output, {
  method: "subimage",
});
```

### Phase Correlation

Fast frequency-domain alignment.

**Characteristics:**

- Very fast
- Good for small shifts
- Less accurate for complex transforms

**Usage:**

```typescript
await processor.alignImages(ref, target, output, {
  method: "phase",
});
```

### Feature-Based

Advanced alignment using feature detection (requires OpenCV).

**Characteristics:**

- Handles rotation and scaling
- Works with perspective changes
- Requires more processing

**Usage:**

```typescript
await processor.alignImages(ref, target, output, {
  method: "feature",
});
```

## Image Processing Pipeline

### 1. Preprocessing

```typescript
class ImageProcessor {
  private async preprocess(imagePath: string): Promise<ProcessedImage> {
    // Load image
    const image = await this.loadImage(imagePath);

    // Validate format
    this.validateFormat(image);

    // Normalize color space
    await this.normalizeColorSpace(image);

    return image;
  }
}
```

### 2. Alignment

```typescript
private async performAlignment(
  reference: ProcessedImage,
  target: ProcessedImage,
  method: AlignmentMethod
): Promise<Transform> {
  const aligner = this.createAligner(method);

  // Find transformation
  const transform = await aligner.findTransform(reference, target);

  // Apply transformation
  await aligner.applyTransform(target, transform);

  return transform;
}
```

### 3. Comparison

```typescript
private async comparePixels(
  img1: ProcessedImage,
  img2: ProcessedImage,
  threshold: number
): Promise<ComparisonData> {
  let differentPixels = 0;
  const totalPixels = img1.width * img1.height;

  for (let y = 0; y < img1.height; y++) {
    for (let x = 0; x < img1.width; x++) {
      const pixel1 = img1.getPixel(x, y);
      const pixel2 = img2.getPixel(x, y);

      if (this.pixelsDiffer(pixel1, pixel2, threshold)) {
        differentPixels++;
      }
    }
  }

  return {
    differentPixels,
    totalPixels,
    percentage: (differentPixels / totalPixels) * 100
  };
}
```

### 4. Diff Generation

```typescript
private async createDiff(
  img1: ProcessedImage,
  img2: ProcessedImage,
  options: DiffOptions
): Promise<DiffImage> {
  const diff = new DiffImage(img1.width, img1.height);

  // Apply exclusions
  const mask = this.createExclusionMask(options.excludeRegions);

  // Generate diff
  for (let y = 0; y < img1.height; y++) {
    for (let x = 0; x < img1.width; x++) {
      if (mask.isExcluded(x, y)) continue;

      const pixel1 = img1.getPixel(x, y);
      const pixel2 = img2.getPixel(x, y);

      if (this.pixelsDiffer(pixel1, pixel2)) {
        diff.setPixel(x, y, options.highlightColor);
      } else if (options.lowlight) {
        diff.setPixel(x, y, this.lowlightPixel(pixel1));
      }
    }
  }

  return diff;
}
```

## Error Handling

### Error Types

```typescript
export class ProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly details?: any
  ) {
    super(message);
  }
}

export class AlignmentError extends ProcessingError {
  constructor(message: string, method: string) {
    super(message, ErrorCode.AlignmentFailed, { method });
  }
}

export class ComparisonError extends ProcessingError {
  constructor(message: string, details: any) {
    super(message, ErrorCode.ComparisonFailed, details);
  }
}
```

### Error Recovery

```typescript
async function processWithFallback(
  processor: ImageProcessor,
  ref: string,
  target: string
): Promise<ComparisonResult> {
  try {
    // Try smart alignment
    await processor.alignImages(ref, target, "aligned.png", {
      method: "feature",
    });
  } catch (error) {
    if (error instanceof AlignmentError) {
      // Fallback to simpler method
      await processor.alignImages(ref, target, "aligned.png", {
        method: "subimage",
      });
    } else {
      throw error;
    }
  }

  return processor.compareImages(ref, "aligned.png", 0.1);
}
```

## Performance Optimization

### Caching

```typescript
class ImageProcessor {
  private cache = new LRUCache<string, ProcessedImage>({
    max: 100,
    ttl: 1000 * 60 * 5, // 5 minutes
  });

  private async loadImage(path: string): Promise<ProcessedImage> {
    const cached = this.cache.get(path);
    if (cached) return cached;

    const image = await this.loadFromDisk(path);
    this.cache.set(path, image);

    return image;
  }
}
```

### Parallel Processing

```typescript
async function processMultiple(
  processor: ImageProcessor,
  pairs: Array<[string, string]>
): Promise<ComparisonResult[]> {
  // Process in parallel with concurrency limit
  const limit = pLimit(4);

  return Promise.all(
    pairs.map(([ref, target]) => limit(() => processor.compareImages(ref, target, 0.1)))
  );
}
```

### Memory Management

```typescript
class ImageProcessor {
  async processBatch(images: string[]): Promise<void> {
    const batchSize = 10;

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);

      await this.processBatchChunk(batch);

      // Free memory between batches
      this.cache.clear();
      if (global.gc) global.gc();
    }
  }
}
```

## Integration

### With Testing Frameworks

```typescript
// Jest integration
expect.extend({
  async toVisuallyMatch(received: string, expected: string) {
    const processor = new ImageProcessor();
    const result = await processor.compareImages(expected, received, 0.1);

    return {
      pass: result.isEqual,
      message: () =>
        `Expected images to match, but they differ by ${result.statistics.percentageDifferent}%`,
    };
  },
});

// Usage
await expect("screenshot.png").toVisuallyMatch("baseline.png");
```

### With CI/CD

```typescript
// CI helper
export async function runVisualTests(baselineDir: string, screenshotDir: string): Promise<boolean> {
  const processor = new ImageProcessor();
  const files = await glob(`${screenshotDir}/*.png`);

  let passed = true;

  for (const screenshot of files) {
    const name = path.basename(screenshot);
    const baseline = path.join(baselineDir, name);

    try {
      const result = await processor.compareImages(baseline, screenshot, 0.1);

      if (!result.isEqual) {
        console.error(`❌ ${name}: ${result.statistics.percentageDifferent}% difference`);
        passed = false;
      } else {
        console.log(`✅ ${name}: Passed`);
      }
    } catch (error) {
      console.error(`❌ ${name}: ${error.message}`);
      passed = false;
    }
  }

  return passed;
}
```

## Best Practices

1. **Always validate inputs**

   ```typescript
   if (!fs.existsSync(imagePath)) {
     throw new Error(`Image not found: ${imagePath}`);
   }
   ```

2. **Use appropriate thresholds**
   - 0.1% for critical UI elements
   - 0.5% for general content
   - 1.0% for dynamic areas

3. **Handle errors gracefully**
   - Provide meaningful error messages
   - Include recovery suggestions
   - Log detailed debugging info

4. **Optimize for performance**
   - Cache processed images
   - Use appropriate concurrency
   - Clean up resources

## See Also

- [Alignment Module](./alignment.md) - Alignment algorithms
- [Diff Module](./diff.md) - Diff generation
- [API Reference](../API-REFERENCE.md) - Complete API docs
