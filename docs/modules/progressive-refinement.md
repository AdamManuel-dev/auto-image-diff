# Progressive Refinement Module

The progressive refinement module iteratively improves comparison accuracy by automatically suggesting and applying exclusion regions based on detected changes.

## Overview

Progressive refinement helps:

- Automatically identify dynamic content regions
- Reduce false positives over multiple iterations
- Learn patterns from your UI
- Generate optimal exclusion configurations

## Core Components

### ProgressiveRefiner Class

```typescript
class ProgressiveRefiner {
  constructor(options?: RefinerOptions);

  async refine(reference: string, target: string, outputDir: string): Promise<RefinementResult>;
}
```

**Options:**

```typescript
interface RefinerOptions {
  maxIterations?: number; // Default: 5
  targetThreshold?: number; // Default: 0.1
  minImprovement?: number; // Default: 0.05
  autoApply?: boolean; // Default: false
  confidenceThreshold?: number; // Default: 0.8
  excludeTypes?: ChangeType[]; // Default: ['content']
}
```

### RefinementResult Interface

```typescript
interface RefinementResult {
  iterations: Iteration[];
  finalDifference: number;
  suggestedExclusions: ExclusionRegion[];
  improvements: ImprovementMetrics;
  converged: boolean;
}

interface Iteration {
  number: number;
  difference: number;
  exclusionsApplied: ExclusionRegion[];
  changeDetected: ChangeClassification[];
  improvement: number;
}
```

## Refinement Process

### 1. Initial Analysis

```typescript
class ProgressiveRefiner {
  private async performInitialAnalysis(
    reference: string,
    target: string
  ): Promise<InitialAnalysis> {
    const processor = new ImageProcessor();
    const smartDiff = new SmartDiff();

    // Align images
    const aligned = await processor.alignImages(reference, target);

    // Compare
    const comparison = await processor.compareImages(reference, aligned);

    // Classify changes
    const classification = await smartDiff.classifyChanges(reference, aligned);

    return {
      comparison,
      classification,
      baseline: {
        difference: comparison.statistics.percentageDifferent,
        regions: this.identifyHighVarianceRegions(classification),
      },
    };
  }
}
```

### 2. Exclusion Generation

```typescript
private generateExclusions(
  classification: ChangeClassification,
  options: RefinerOptions
): ExclusionRegion[] {
  const exclusions: ExclusionRegion[] = [];

  for (const change of classification.changes) {
    // Check if change type should be excluded
    if (options.excludeTypes?.includes(change.type)) {
      if (change.confidence >= options.confidenceThreshold!) {
        exclusions.push({
          bounds: change.bounds,
          name: `auto-${change.type}-${change.id}`,
          reason: `Automated exclusion: ${change.type} change`,
          confidence: change.confidence,
          iteration: this.currentIteration
        });
      }
    }
  }

  // Merge overlapping regions
  return this.mergeOverlappingRegions(exclusions);
}
```

### 3. Iterative Refinement

```typescript
async refine(
  reference: string,
  target: string,
  outputDir: string
): Promise<RefinementResult> {
  const iterations: Iteration[] = [];
  let currentExclusions: ExclusionRegion[] = [];
  let previousDifference = Infinity;
  let converged = false;

  for (let i = 0; i < this.options.maxIterations!; i++) {
    const iteration = await this.performIteration(
      reference,
      target,
      currentExclusions,
      i + 1
    );

    iterations.push(iteration);

    // Check convergence
    const improvement = previousDifference - iteration.difference;

    if (
      iteration.difference <= this.options.targetThreshold! ||
      improvement < this.options.minImprovement!
    ) {
      converged = true;
      break;
    }

    // Generate new exclusions
    const newExclusions = this.generateExclusions(
      iteration.changeDetected,
      this.options
    );

    currentExclusions = [...currentExclusions, ...newExclusions];
    previousDifference = iteration.difference;
  }

  return {
    iterations,
    finalDifference: iterations[iterations.length - 1].difference,
    suggestedExclusions: currentExclusions,
    improvements: this.calculateImprovements(iterations),
    converged
  };
}
```

## Exclusion Strategies

### 1. High Variance Detection

```typescript
class VarianceDetector {
  detectHighVarianceRegions(changes: ChangeClassification[]): VarianceRegion[] {
    const regions: VarianceRegion[] = [];

    // Group changes by spatial proximity
    const clusters = this.clusterChanges(changes);

    for (const cluster of clusters) {
      const variance = this.calculateVariance(cluster);

      if (variance.temporal > 0.8 || variance.spatial > 0.7) {
        regions.push({
          bounds: this.getBoundingBox(cluster),
          variance,
          changeCount: cluster.length,
          primaryType: this.getMostFrequentType(cluster),
        });
      }
    }

    return regions;
  }
}
```

### 2. Pattern Recognition

```typescript
class PatternRecognizer {
  recognizePatterns(iterations: Iteration[]): RecognizedPattern[] {
    const patterns: RecognizedPattern[] = [];

    // Timestamp patterns
    const timestampPattern = this.detectTimestampPattern(iterations);
    if (timestampPattern) patterns.push(timestampPattern);

    // Animation patterns
    const animationPattern = this.detectAnimationPattern(iterations);
    if (animationPattern) patterns.push(animationPattern);

    // Dynamic content patterns
    const dynamicPattern = this.detectDynamicContentPattern(iterations);
    if (dynamicPattern) patterns.push(dynamicPattern);

    return patterns;
  }

  private detectTimestampPattern(iterations: Iteration[]): RecognizedPattern | null {
    // Look for consistent changes in small rectangular regions
    const consistentRegions = this.findConsistentRegions(iterations);

    for (const region of consistentRegions) {
      if (this.isTimestampLike(region)) {
        return {
          type: "timestamp",
          confidence: 0.9,
          bounds: region.bounds,
          suggestion: "Exclude timestamp region",
        };
      }
    }

    return null;
  }
}
```

### 3. Smart Merging

```typescript
class RegionMerger {
  mergeOverlappingRegions(regions: ExclusionRegion[]): ExclusionRegion[] {
    const merged: ExclusionRegion[] = [];
    const sorted = this.sortByArea(regions);

    for (const region of sorted) {
      const overlapping = merged.find((r) => this.regionsOverlap(r.bounds, region.bounds));

      if (overlapping) {
        // Merge regions
        overlapping.bounds = this.mergeBounds(overlapping.bounds, region.bounds);
        overlapping.confidence = Math.max(overlapping.confidence, region.confidence);
      } else {
        merged.push({ ...region });
      }
    }

    return merged;
  }

  private regionsOverlap(a: Bounds, b: Bounds): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }
}
```

## Interactive Mode

### User Confirmation

```typescript
class InteractiveRefiner extends ProgressiveRefiner {
  async refineInteractive(
    reference: string,
    target: string,
    outputDir: string
  ): Promise<RefinementResult> {
    const result = await super.refine(reference, target, outputDir);

    // Show suggestions to user
    console.log("\nSuggested Exclusions:");
    for (const exclusion of result.suggestedExclusions) {
      console.log(`- ${exclusion.name}: ${exclusion.reason}`);
      console.log(`  Bounds: ${JSON.stringify(exclusion.bounds)}`);
      console.log(`  Confidence: ${exclusion.confidence}\n`);
    }

    // Get user confirmation
    const confirmed = await this.promptUser("Apply these exclusions? (y/n): ");

    if (confirmed) {
      await this.applyExclusions(reference, target, result.suggestedExclusions);
    }

    return result;
  }
}
```

### Visualization

```typescript
class RefinementVisualizer {
  async visualizeRefinement(result: RefinementResult, outputDir: string): Promise<void> {
    // Generate iteration timeline
    await this.generateTimeline(result.iterations, outputDir);

    // Create exclusion overlay
    await this.createExclusionOverlay(result.suggestedExclusions, outputDir);

    // Generate improvement chart
    await this.generateImprovementChart(result.improvements, outputDir);

    // Create HTML report
    await this.generateHTMLReport(result, outputDir);
  }

  private async createExclusionOverlay(
    exclusions: ExclusionRegion[],
    outputDir: string
  ): Promise<void> {
    const canvas = createCanvas(1920, 1080);
    const ctx = canvas.getContext("2d");

    // Draw exclusion regions
    for (const exclusion of exclusions) {
      ctx.fillStyle = `rgba(255, 0, 0, ${exclusion.confidence * 0.5})`;
      ctx.fillRect(
        exclusion.bounds.x,
        exclusion.bounds.y,
        exclusion.bounds.width,
        exclusion.bounds.height
      );

      // Add label
      ctx.fillStyle = "white";
      ctx.fillText(exclusion.name, exclusion.bounds.x + 5, exclusion.bounds.y + 15);
    }

    await saveCanvas(canvas, path.join(outputDir, "exclusions-overlay.png"));
  }
}
```

## Configuration Examples

### Auto-Exclude Dynamic Content

```typescript
const refiner = new ProgressiveRefiner({
  autoApply: true,
  excludeTypes: ["content", "new_element", "removed_element"],
  confidenceThreshold: 0.85,
  targetThreshold: 0.1,
});

const result = await refiner.refine("baseline.png", "current.png", "refinement/");
```

### Conservative Refinement

```typescript
const refiner = new ProgressiveRefiner({
  maxIterations: 3,
  minImprovement: 0.1,
  confidenceThreshold: 0.95,
  excludeTypes: ["content"], // Only exclude content changes
  autoApply: false, // Require manual confirmation
});
```

### Aggressive Refinement

```typescript
const refiner = new ProgressiveRefiner({
  maxIterations: 10,
  targetThreshold: 0.01, // Very strict
  minImprovement: 0.01,
  confidenceThreshold: 0.7,
  excludeTypes: ["content", "style", "layout"],
  autoApply: true,
});
```

## Integration

### CLI Integration

```bash
# Interactive refinement
aid refine before.png after.png output/

# Auto-apply suggestions
aid refine before.png after.png output/ --auto

# Target specific threshold
aid refine before.png after.png output/ --target 0.5

# Exclude specific types
aid refine before.png after.png output/ --exclude-types content,style
```

### Programmatic Integration

```typescript
import { ProgressiveRefiner, ImageProcessor } from "auto-image-diff";

async function refineUntilPass(
  baseline: string,
  current: string,
  threshold: number
): Promise<void> {
  const refiner = new ProgressiveRefiner({
    targetThreshold: threshold,
    autoApply: true,
    maxIterations: 10,
  });

  const result = await refiner.refine(baseline, current, "output/");

  if (result.converged) {
    console.log(`✓ Converged after ${result.iterations.length} iterations`);
    console.log(`Final difference: ${result.finalDifference}%`);

    // Save exclusions for future use
    await saveExclusions(result.suggestedExclusions, "exclusions.json");
  } else {
    console.log(`✗ Did not converge after ${result.iterations.length} iterations`);
    console.log(`Best difference: ${result.finalDifference}%`);
  }
}
```

### Workflow Integration

```typescript
class RefinementWorkflow {
  private refiner: ProgressiveRefiner;
  private processor: ImageProcessor;

  async runCompleteWorkflow(baseline: string, current: string): Promise<WorkflowResult> {
    // Step 1: Initial comparison
    const initial = await this.processor.compareImages(baseline, current, 0.1);

    if (initial.isEqual) {
      return { passed: true, refinementNeeded: false };
    }

    // Step 2: Progressive refinement
    const refinement = await this.refiner.refine(baseline, current, "refinement/");

    // Step 3: Final comparison with exclusions
    const final = await this.processor.compareImages(baseline, current, 0.1, {
      excludeRegions: refinement.suggestedExclusions,
    });

    return {
      passed: final.isEqual,
      refinementNeeded: true,
      refinement,
      initial,
      final,
    };
  }
}
```

## Best Practices

1. **Start with conservative settings**
   - High confidence threshold (0.9+)
   - Limited exclusion types
   - Manual confirmation

2. **Monitor convergence**
   - Set reasonable iteration limits
   - Track improvement rates
   - Stop when diminishing returns

3. **Validate exclusions**
   - Review generated exclusions
   - Ensure they make semantic sense
   - Test with multiple image pairs

4. **Save successful refinements**
   - Export exclusions for reuse
   - Document patterns found
   - Build exclusion library

## Troubleshooting

### Not Converging

```typescript
// Increase iterations and adjust thresholds
const refiner = new ProgressiveRefiner({
  maxIterations: 20,
  minImprovement: 0.001, // Very small improvements OK
  targetThreshold: 1.0, // More realistic target
});
```

### Too Many Exclusions

```typescript
// Be more selective
const refiner = new ProgressiveRefiner({
  confidenceThreshold: 0.95, // Very high confidence required
  excludeTypes: ["content"], // Only most volatile type
  maxExclusionSize: 10000, // Limit region size
});
```

### Performance Issues

```typescript
// Optimize for speed
const refiner = new ProgressiveRefiner({
  maxIterations: 3,
  fastMode: true, // Skip detailed analysis
  cacheIntermediates: true, // Reuse computations
});
```

## See Also

- [Exclusions Guide](../guides/EXCLUSIONS.md) - Manual exclusion setup
- [Smart Classification](./classifiers.md) - Change detection
- [CLI Usage](../guides/CLI_USAGE.md) - Refinement commands
