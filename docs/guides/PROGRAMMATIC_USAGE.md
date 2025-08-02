# Programmatic Usage Guide

This guide covers using auto-image-diff as a library in your Node.js or TypeScript applications.

## Installation

```bash
npm install auto-image-diff
```

## Basic Usage

### JavaScript

```javascript
const { ImageProcessor } = require("auto-image-diff");

async function compareImages() {
  const processor = new ImageProcessor();

  // Compare two images
  const result = await processor.compareImages(
    "baseline.png",
    "current.png",
    0.1 // threshold percentage
  );

  console.log(`Images are ${result.isEqual ? "equal" : "different"}`);
  console.log(`Difference: ${result.statistics.percentageDifferent}%`);
}
```

### TypeScript

```typescript
import { ImageProcessor, ComparisonResult } from "auto-image-diff";

async function compareImages(): Promise<void> {
  const processor = new ImageProcessor();

  const result: ComparisonResult = await processor.compareImages(
    "baseline.png",
    "current.png",
    0.1
  );

  if (!result.isEqual) {
    console.log(`Images differ by ${result.statistics.percentageDifferent}%`);
  }
}
```

## Core Classes

### ImageProcessor

The main class for image operations.

```typescript
import { ImageProcessor } from "auto-image-diff";

const processor = new ImageProcessor();
```

**Methods:**

#### alignImages()

```typescript
await processor.alignImages(
  reference: string,
  target: string,
  output: string,
  options?: AlignmentOptions
): Promise<void>
```

#### compareImages()

```typescript
await processor.compareImages(
  image1: string,
  image2: string,
  threshold: number
): Promise<ComparisonResult>
```

#### generateDiff()

```typescript
await processor.generateDiff(
  image1: string,
  image2: string,
  output: string,
  options?: DiffOptions
): Promise<DiffResult>
```

### BatchProcessor

For processing multiple images.

```typescript
import { BatchProcessor } from "auto-image-diff";

const batch = new BatchProcessor();

const results = await batch.processBatch("baseline/", "current/", "output/", {
  pattern: "*.png",
  parallel: true,
  concurrency: 4,
});
```

### SmartDiff

For intelligent change classification.

```typescript
import { SmartDiff } from "auto-image-diff";

const smartDiff = new SmartDiff();

const classification = await smartDiff.classifyChanges("before.png", "after.png");

classification.changes.forEach((change) => {
  console.log(`${change.type}: ${change.confidence}`);
});
```

## Types and Interfaces

### AlignmentOptions

```typescript
interface AlignmentOptions {
  method?: "subimage" | "phase" | "feature";
  timeout?: number;
  verbose?: boolean;
}
```

### DiffOptions

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

### ComparisonResult

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

### Region

```typescript
interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
  reason?: string;
}
```

### ClassificationType

```typescript
type ClassificationType =
  | "content"
  | "style"
  | "layout"
  | "size"
  | "structural"
  | "new_element"
  | "removed_element";
```

## Advanced Examples

### Custom Alignment with Error Handling

```typescript
import { ImageProcessor, AlignmentError } from "auto-image-diff";

async function alignWithRetry(ref: string, target: string): Promise<string> {
  const processor = new ImageProcessor();
  const methods: AlignmentOptions["method"][] = ["subimage", "phase", "feature"];

  for (const method of methods) {
    try {
      const output = `aligned-${method}.png`;
      await processor.alignImages(ref, target, output, { method });
      console.log(`Successfully aligned using ${method} method`);
      return output;
    } catch (error) {
      if (error instanceof AlignmentError) {
        console.warn(`${method} alignment failed: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  throw new Error("All alignment methods failed");
}
```

### Batch Processing with Progress

```typescript
import { BatchProcessor, BatchOptions, BatchResult } from "auto-image-diff";
import { EventEmitter } from "events";

class BatchWithProgress extends EventEmitter {
  private processor = new BatchProcessor();

  async process(
    refDir: string,
    targetDir: string,
    outDir: string,
    options: BatchOptions
  ): Promise<BatchResult> {
    let completed = 0;

    this.processor.on("file-complete", (file) => {
      completed++;
      this.emit("progress", {
        file,
        completed,
        total: this.processor.totalFiles,
      });
    });

    return await this.processor.processBatch(refDir, targetDir, outDir, options);
  }
}

// Usage
const batch = new BatchWithProgress();

batch.on("progress", ({ completed, total }) => {
  console.log(`Progress: ${completed}/${total}`);
});

await batch.process("ref/", "target/", "out/", {
  parallel: true,
  concurrency: 4,
});
```

### Smart Diff with Custom Handlers

```typescript
import { SmartDiff, Classification, ChangeType } from "auto-image-diff";

class CustomAnalyzer {
  private smartDiff = new SmartDiff();

  async analyzeChanges(before: string, after: string) {
    const classification = await this.smartDiff.classifyChanges(before, after);

    const report = {
      critical: [] as ChangeType[],
      minor: [] as ChangeType[],
      suggestions: [] as string[],
    };

    for (const change of classification.changes) {
      if (change.confidence > 0.8) {
        if (["structural", "removed_element"].includes(change.type)) {
          report.critical.push(change);
        } else if (["style", "layout"].includes(change.type)) {
          report.minor.push(change);

          if (change.type === "style") {
            const css = await this.smartDiff.suggestCSS(change);
            report.suggestions.push(css);
          }
        }
      }
    }

    return report;
  }
}
```

### Integration with Testing Frameworks

#### Jest

```typescript
import { ImageProcessor } from "auto-image-diff";

describe("Visual Regression Tests", () => {
  const processor = new ImageProcessor();

  test("homepage should match baseline", async () => {
    const result = await processor.compareImages(
      "tests/baseline/homepage.png",
      "tests/screenshots/homepage.png",
      0.1
    );

    expect(result.isEqual).toBe(true);
    expect(result.statistics.percentageDifferent).toBeLessThan(0.1);
  });
});
```

#### Playwright

```typescript
import { test, expect } from "@playwright/test";
import { ImageProcessor } from "auto-image-diff";

test("visual regression", async ({ page }) => {
  await page.goto("https://example.com");

  const screenshot = "test-screenshot.png";
  await page.screenshot({ path: screenshot });

  const processor = new ImageProcessor();
  const result = await processor.compareImages("baseline.png", screenshot, 0.1);

  expect(result.isEqual).toBeTruthy();
});
```

### Custom Exclusion Regions

```typescript
import { ImageProcessor, Region } from "auto-image-diff";

async function compareWithExclusions() {
  const processor = new ImageProcessor();

  // Define dynamic regions to exclude
  const exclusions: Region[] = [
    {
      x: 0,
      y: 0,
      width: 200,
      height: 50,
      name: "header-timestamp",
      reason: "Dynamic timestamp",
    },
    {
      x: 100,
      y: 100,
      width: 300,
      height: 200,
      name: "ad-banner",
      reason: "Dynamic advertisement",
    },
  ];

  const result = await processor.generateDiff("before.png", "after.png", "diff.png", {
    excludeRegions: exclusions,
    smart: true,
  });

  console.log("Excluded regions:", exclusions.length);
  console.log("Difference after exclusions:", result.statistics.percentageDifferent);
}
```

### Metadata and Reporting

```typescript
import { ImageProcessor, MetadataExtractor, ReportGenerator } from "auto-image-diff";

async function generateDetailedReport() {
  const processor = new ImageProcessor();
  const extractor = new MetadataExtractor();
  const reporter = new ReportGenerator();

  // Process with metadata embedding
  const diffResult = await processor.generateDiff("before.png", "after.png", "diff.png", {
    embedMetadata: true,
    smart: true,
  });

  // Extract embedded metadata
  const metadata = await extractor.extract("diff.png");

  // Generate comprehensive report
  const report = await reporter.generate({
    results: [diffResult],
    metadata: metadata,
    format: "html",
    includeCharts: true,
    includeTimeline: true,
  });

  console.log("Report generated:", report.path);
}
```

## Error Handling

```typescript
import {
  ImageProcessor,
  ImageNotFoundError,
  AlignmentError,
  ProcessingError,
} from "auto-image-diff";

async function safeCompare(image1: string, image2: string) {
  const processor = new ImageProcessor();

  try {
    const result = await processor.compareImages(image1, image2, 0.1);
    return result;
  } catch (error) {
    if (error instanceof ImageNotFoundError) {
      console.error("Image not found:", error.path);
    } else if (error instanceof AlignmentError) {
      console.error("Failed to align images:", error.message);
    } else if (error instanceof ProcessingError) {
      console.error("Processing failed:", error.details);
    } else {
      throw error; // Re-throw unknown errors
    }
  }
}
```

## Performance Optimization

```typescript
import { ImageProcessor, BatchProcessor } from "auto-image-diff";

// Reuse processor instances
const processor = new ImageProcessor();

// Process in chunks for memory efficiency
async function processLargeSet(files: string[][]) {
  const chunkSize = 10;
  const results = [];

  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(([ref, target]) => processor.compareImages(ref, target, 0.1))
    );
    results.push(...chunkResults);

    // Optional: Free memory between chunks
    if (global.gc) global.gc();
  }

  return results;
}
```

## See Also

- [API Reference](../API-REFERENCE.md) - Complete API documentation
- [Examples](../../examples/README.md) - More code examples
- [TypeScript Types](../modules/types.md) - Type definitions
