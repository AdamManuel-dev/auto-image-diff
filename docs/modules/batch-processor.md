# BatchProcessor Module

The batch processing module enables parallel comparison of multiple images with smart file pairing and comprehensive reporting.

## Overview

The `BatchProcessor` class provides:

- Parallel image processing with configurable concurrency
- Smart file pairing with fuzzy matching
- Progress tracking and reporting
- Performance optimization for large datasets

## API Reference

### Constructor

```typescript
const batchProcessor = new BatchProcessor(options?: BatchOptions);
```

**Options:**

```typescript
interface BatchOptions {
  concurrency?: number; // Default: 4
  pattern?: string; // Default: "*.png"
  recursive?: boolean; // Default: true
  continueOnError?: boolean; // Default: false
  verbose?: boolean; // Default: false
}
```

### Methods

#### processBatch()

Process multiple images in batch mode.

```typescript
async processBatch(
  referenceDir: string,
  targetDir: string,
  outputDir: string,
  options?: ProcessBatchOptions
): Promise<BatchResult>
```

**Parameters:**

- `referenceDir` - Directory containing reference images
- `targetDir` - Directory containing target images
- `outputDir` - Directory for output files
- `options` - Processing options

**Options:**

```typescript
interface ProcessBatchOptions extends BatchOptions {
  threshold?: number;
  smart?: boolean;
  smartPairing?: boolean;
  excludeFile?: string;
  pairingManifest?: string;
  reportFormat?: "html" | "json" | "both";
}
```

**Returns:**

```typescript
interface BatchResult {
  summary: BatchSummary;
  results: ComparisonResult[];
  performance: PerformanceMetrics;
  errors?: BatchError[];
}

interface BatchSummary {
  totalFiles: number;
  processed: number;
  passed: number;
  failed: number;
  skipped: number;
  averageDifference: number;
  processingTime: number;
}
```

**Example:**

```typescript
const result = await batchProcessor.processBatch("baseline/", "screenshots/", "results/", {
  concurrency: 8,
  smart: true,
  smartPairing: true,
  threshold: 0.5,
});

console.log(`Processed ${result.summary.processed} files`);
console.log(`Failed: ${result.summary.failed}`);
```

#### pairFiles()

Pair files between directories using various strategies.

```typescript
async pairFiles(
  referenceDir: string,
  targetDir: string,
  options?: PairingOptions
): Promise<FilePair[]>
```

**Options:**

```typescript
interface PairingOptions {
  strategy?: "exact" | "fuzzy" | "smart";
  pattern?: string;
  recursive?: boolean;
  manifest?: string;
}

interface FilePair {
  reference: string;
  target: string;
  confidence: number;
  strategy: string;
}
```

**Example:**

```typescript
const pairs = await batchProcessor.pairFiles("baseline/", "current/", {
  strategy: "smart",
  pattern: "*.png",
});

pairs.forEach((pair) => {
  console.log(`${pair.reference} -> ${pair.target} (${pair.confidence})`);
});
```

## File Pairing Strategies

### Exact Matching

Matches files with identical names.

```typescript
// baseline/home.png -> current/home.png
const pairs = await batchProcessor.pairFiles(ref, target, {
  strategy: "exact",
});
```

### Fuzzy Matching

Uses string similarity algorithms for renamed files.

```typescript
// baseline/login.png -> current/login-page.png
const pairs = await batchProcessor.pairFiles(ref, target, {
  strategy: "fuzzy",
});
```

### Smart Pairing

Combines multiple strategies with intelligent heuristics.

```typescript
const smartPairer = new SmartPairer({
  strategies: [
    new ExactMatcher(),
    new FuzzyMatcher({ threshold: 0.8 }),
    new SequenceMatcher({ pattern: /\d+/ }),
    new DateMatcher({ format: "YYYY-MM-DD" }),
  ],
});

const pairs = await smartPairer.pair(referenceFiles, targetFiles);
```

## Parallel Processing

### Concurrency Control

```typescript
class BatchProcessor {
  private async processWithConcurrency(
    pairs: FilePair[],
    concurrency: number
  ): Promise<ComparisonResult[]> {
    const limit = pLimit(concurrency);
    const processor = new ImageProcessor();

    const tasks = pairs.map((pair) =>
      limit(async () => {
        try {
          const result = await this.processPair(processor, pair);
          this.emit("file-complete", { pair, result });
          return result;
        } catch (error) {
          this.emit("file-error", { pair, error });
          throw error;
        }
      })
    );

    return Promise.all(tasks);
  }
}
```

### Progress Tracking

```typescript
const batchProcessor = new BatchProcessor();

// Track progress
batchProcessor.on("progress", ({ completed, total, percentage }) => {
  console.log(`Progress: ${completed}/${total} (${percentage}%)`);
});

// Track individual files
batchProcessor.on("file-complete", ({ pair, result }) => {
  console.log(`✓ ${pair.reference}: ${result.difference}%`);
});

// Track errors
batchProcessor.on("file-error", ({ pair, error }) => {
  console.error(`✗ ${pair.reference}: ${error.message}`);
});
```

### Memory Management

```typescript
class BatchProcessor {
  private async processBatchChunk(
    pairs: FilePair[],
    chunkSize: number = 10
  ): Promise<ComparisonResult[]> {
    const results: ComparisonResult[] = [];

    for (let i = 0; i < pairs.length; i += chunkSize) {
      const chunk = pairs.slice(i, i + chunkSize);

      // Process chunk
      const chunkResults = await this.processWithConcurrency(chunk, 4);
      results.push(...chunkResults);

      // Free memory between chunks
      if (global.gc && i % 50 === 0) {
        global.gc();
      }

      // Emit progress
      this.emit("chunk-complete", {
        processed: i + chunk.length,
        total: pairs.length,
      });
    }

    return results;
  }
}
```

## Report Generation

### Batch Report Structure

```typescript
interface BatchReport {
  metadata: {
    timestamp: string;
    version: string;
    configuration: BatchOptions;
  };
  summary: BatchSummary;
  results: DetailedResult[];
  performance: PerformanceMetrics;
  failures?: FailureAnalysis[];
}

interface DetailedResult extends ComparisonResult {
  id: string;
  reference: string;
  target: string;
  outputDir: string;
  processingTime: number;
  classification?: ChangeClassification;
}
```

### HTML Report Generation

```typescript
class BatchReporter {
  async generateHTMLReport(batchResult: BatchResult, outputPath: string): Promise<void> {
    const html = await this.renderTemplate("batch-report.hbs", {
      summary: batchResult.summary,
      results: this.prepareResults(batchResult.results),
      charts: await this.generateCharts(batchResult),
      performance: this.formatPerformance(batchResult.performance),
    });

    await fs.writeFile(outputPath, html);
  }

  private async generateCharts(result: BatchResult) {
    return {
      distribution: this.createDistributionChart(result),
      timeline: this.createTimelineChart(result),
      performance: this.createPerformanceChart(result),
    };
  }
}
```

### JSON Report Generation

```typescript
class BatchReporter {
  async generateJSONReport(
    batchResult: BatchResult,
    outputPath: string,
    options?: JSONReportOptions
  ): Promise<void> {
    const report = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      summary: batchResult.summary,
      results: options?.detailed ? batchResult.results : this.summarizeResults(batchResult.results),
      performance: batchResult.performance,
      configuration: options?.includeConfig ? this.getConfiguration() : undefined,
    };

    const json = options?.pretty ? JSON.stringify(report, null, 2) : JSON.stringify(report);

    await fs.writeFile(outputPath, json);
  }
}
```

## Performance Optimization

### Adaptive Concurrency

```typescript
class AdaptiveBatchProcessor extends BatchProcessor {
  private async determineConcurrency(): Promise<number> {
    const cpuCount = os.cpus().length;
    const freeMemory = os.freemem();
    const avgImageSize = await this.estimateAverageImageSize();

    // Calculate optimal concurrency
    const memoryConcurrency = Math.floor(
      freeMemory / (avgImageSize * 3) // 3x for safety
    );
    const cpuConcurrency = Math.max(1, cpuCount - 1);

    return Math.min(memoryConcurrency, cpuConcurrency, 16);
  }

  async processBatch(refDir: string, targetDir: string, outDir: string): Promise<BatchResult> {
    const concurrency = await this.determineConcurrency();
    console.log(`Using adaptive concurrency: ${concurrency}`);

    return super.processBatch(refDir, targetDir, outDir, {
      concurrency,
    });
  }
}
```

### Caching Strategy

```typescript
class CachedBatchProcessor extends BatchProcessor {
  private cache = new Map<string, ComparisonResult>();

  private getCacheKey(pair: FilePair): string {
    const refStat = fs.statSync(pair.reference);
    const targetStat = fs.statSync(pair.target);

    return `${pair.reference}:${refStat.mtimeMs}:${pair.target}:${targetStat.mtimeMs}`;
  }

  protected async processPair(
    processor: ImageProcessor,
    pair: FilePair
  ): Promise<ComparisonResult> {
    const cacheKey = this.getCacheKey(pair);

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Process and cache
    const result = await super.processPair(processor, pair);
    this.cache.set(cacheKey, result);

    return result;
  }
}
```

### Stream Processing

```typescript
class StreamingBatchProcessor extends BatchProcessor {
  async *processStream(
    pairs: FilePair[]
  ): AsyncGenerator<ComparisonResult> {
    const processor = new ImageProcessor();

    for (const pair of pairs) {
      try {
        const result = await this.processPair(processor, pair);
        yield result;
      } catch (error) {
        if (this.options.continueOnError) {
          yield {
            ...this.createErrorResult(pair, error),
            error: true
          };
        } else {
          throw error;
        }
      }
    }
  }

  // Usage
  async function streamProcess() {
    const processor = new StreamingBatchProcessor();
    const pairs = await processor.pairFiles('ref/', 'target/');

    for await (const result of processor.processStream(pairs)) {
      console.log(`Processed: ${result.reference}`);
      // Handle result immediately
    }
  }
}
```

## Error Handling

### Batch Error Recovery

```typescript
class ResilientBatchProcessor extends BatchProcessor {
  private failedPairs: FilePair[] = [];

  async processBatchWithRetry(
    refDir: string,
    targetDir: string,
    outDir: string,
    maxRetries: number = 3
  ): Promise<BatchResult> {
    let attempt = 0;
    let result: BatchResult;

    do {
      attempt++;

      if (attempt > 1) {
        console.log(`Retry attempt ${attempt} for ${this.failedPairs.length} failed files`);
      }

      const pairs = attempt === 1 ? await this.pairFiles(refDir, targetDir) : this.failedPairs;

      result = await this.processBatch(refDir, targetDir, outDir, {
        pairs,
        continueOnError: true,
      });

      this.failedPairs = this.extractFailedPairs(result);
    } while (this.failedPairs.length > 0 && attempt < maxRetries);

    return result;
  }
}
```

### Error Reporting

```typescript
interface BatchError {
  pair: FilePair;
  error: Error;
  timestamp: string;
  attempt: number;
  context?: any;
}

class BatchErrorReporter {
  private errors: BatchError[] = [];

  recordError(error: BatchError): void {
    this.errors.push(error);
  }

  generateErrorReport(): ErrorReport {
    return {
      totalErrors: this.errors.length,
      byType: this.groupByErrorType(this.errors),
      byFile: this.groupByFile(this.errors),
      suggestions: this.generateSuggestions(this.errors),
    };
  }

  private generateSuggestions(errors: BatchError[]): string[] {
    const suggestions: string[] = [];

    // Memory errors
    if (errors.some((e) => e.error.message.includes("memory"))) {
      suggestions.push("Reduce concurrency with -c 2");
    }

    // Timeout errors
    if (errors.some((e) => e.error.message.includes("timeout"))) {
      suggestions.push("Increase timeout with --timeout 60000");
    }

    return suggestions;
  }
}
```

## Integration Examples

### CI/CD Integration

```typescript
// ci-visual-tests.ts
async function runCIVisualTests(): Promise<void> {
  const processor = new BatchProcessor({
    concurrency: 2, // Conservative for CI
    continueOnError: true,
    verbose: process.env.CI_DEBUG === "true",
  });

  const result = await processor.processBatch(
    process.env.BASELINE_DIR || "baseline/",
    process.env.SCREENSHOT_DIR || "screenshots/",
    process.env.OUTPUT_DIR || "visual-results/",
    {
      threshold: parseFloat(process.env.THRESHOLD || "0.1"),
      smart: true,
      reportFormat: "both",
    }
  );

  // Generate CI-friendly output
  console.log(`::set-output name=total::${result.summary.totalFiles}`);
  console.log(`::set-output name=failed::${result.summary.failed}`);
  console.log(`::set-output name=passed::${result.summary.passed}`);

  if (result.summary.failed > 0) {
    process.exit(1);
  }
}
```

### Custom Workflow

```typescript
// custom-batch-workflow.ts
class CustomBatchWorkflow {
  private processor = new BatchProcessor();
  private analyzer = new ChangeAnalyzer();

  async run(config: WorkflowConfig): Promise<WorkflowResult> {
    // Phase 1: Initial processing
    const batchResult = await this.processor.processBatch(
      config.referenceDir,
      config.targetDir,
      config.outputDir,
      config.options
    );

    // Phase 2: Analyze failures
    const analysis = await this.analyzer.analyzeFailures(
      batchResult.results.filter((r) => !r.isEqual)
    );

    // Phase 3: Apply exclusions if needed
    if (analysis.suggestedExclusions.length > 0) {
      const refinedResult = await this.processor.processBatch(
        config.referenceDir,
        config.targetDir,
        config.outputDir,
        {
          ...config.options,
          excludeRegions: analysis.suggestedExclusions,
        }
      );

      return {
        initial: batchResult,
        refined: refinedResult,
        analysis,
      };
    }

    return { initial: batchResult, analysis };
  }
}
```

## Best Practices

1. **Choose appropriate concurrency**
   - Start with CPU count - 1
   - Monitor memory usage
   - Adjust based on image sizes

2. **Use smart pairing for renamed files**

   ```typescript
   {
     smartPairing: true;
   }
   ```

3. **Enable continue on error for large batches**

   ```typescript
   {
     continueOnError: true;
   }
   ```

4. **Generate comprehensive reports**

   ```typescript
   {
     reportFormat: "both";
   }
   ```

5. **Implement proper error handling**
   - Log failed comparisons
   - Retry transient failures
   - Report actionable errors

## See Also

- [Smart Pairing Module](./smart-pairing.md) - File matching algorithms
- [Reports Module](../guides/REPORTS.md) - Report generation
- [CLI Usage](../guides/CLI_USAGE.md) - Batch command usage
