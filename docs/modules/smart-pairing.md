# Smart Pairing Module

The smart pairing module intelligently matches files between directories using multiple strategies including exact matching, fuzzy matching, and pattern recognition.

## Overview

Smart pairing solves the problem of matching files when:

- Files have been renamed slightly
- Naming conventions differ between environments
- Files include timestamps or version numbers
- Directory structures don't match exactly

## Core Components

### SmartPairer Class

```typescript
class SmartPairer {
  constructor(options?: SmartPairingOptions);

  async pair(referenceFiles: string[], targetFiles: string[]): Promise<FilePair[]>;
}
```

**Options:**

```typescript
interface SmartPairingOptions {
  strategies?: PairingStrategy[];
  minConfidence?: number; // Default: 0.6
  allowDuplicates?: boolean; // Default: false
  fuzzyThreshold?: number; // Default: 0.8
  verbose?: boolean;
}
```

### FilePair Interface

```typescript
interface FilePair {
  reference: string;
  target: string;
  confidence: number;
  strategy: string;
  metadata?: {
    similarity?: number;
    pattern?: string;
    transformations?: string[];
  };
}
```

## Pairing Strategies

### 1. Exact Matcher

Matches files with identical names.

```typescript
class ExactMatcher implements PairingStrategy {
  readonly name = "exact";

  match(reference: string, target: string): MatchResult | null {
    const refName = path.basename(reference);
    const targetName = path.basename(target);

    if (refName === targetName) {
      return {
        confidence: 1.0,
        strategy: this.name,
      };
    }

    return null;
  }
}
```

**Examples:**

```
home.png → home.png (confidence: 1.0)
login.png → login.png (confidence: 1.0)
```

### 2. Fuzzy Matcher

Uses string similarity algorithms for renamed files.

```typescript
class FuzzyMatcher implements PairingStrategy {
  readonly name = "fuzzy";
  private threshold: number;

  constructor(threshold: number = 0.8) {
    this.threshold = threshold;
  }

  match(reference: string, target: string): MatchResult | null {
    const refName = this.normalize(path.basename(reference));
    const targetName = this.normalize(path.basename(target));

    const similarity = this.calculateSimilarity(refName, targetName);

    if (similarity >= this.threshold) {
      return {
        confidence: similarity,
        strategy: this.name,
        metadata: { similarity },
      };
    }

    return null;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Levenshtein distance implementation
    return levenshtein.similarity(str1, str2);
  }

  private normalize(filename: string): string {
    // Remove extension and common suffixes
    return filename
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]\d+$/, "")
      .toLowerCase();
  }
}
```

**Examples:**

```
login.png → login-page.png (confidence: 0.85)
dashboard.png → dashboard_v2.png (confidence: 0.82)
header.png → site-header.png (confidence: 0.78)
```

### 3. Sequence Matcher

Matches numbered sequences of files.

```typescript
class SequenceMatcher implements PairingStrategy {
  readonly name = "sequence";
  private pattern: RegExp;

  constructor(pattern: RegExp = /(\d+)/) {
    this.pattern = pattern;
  }

  match(reference: string, target: string): MatchResult | null {
    const refMatch = this.extractSequence(reference);
    const targetMatch = this.extractSequence(target);

    if (refMatch && targetMatch) {
      const refBase = refMatch.base;
      const targetBase = targetMatch.base;

      if (this.isSimilarBase(refBase, targetBase)) {
        // Calculate confidence based on sequence proximity
        const distance = Math.abs(refMatch.number - targetMatch.number);
        const confidence = Math.max(0.5, 1 - distance * 0.1);

        return {
          confidence,
          strategy: this.name,
          metadata: {
            pattern: this.pattern.source,
            sequenceDiff: distance,
          },
        };
      }
    }

    return null;
  }

  private extractSequence(filename: string): SequenceInfo | null {
    const match = filename.match(this.pattern);
    if (match) {
      return {
        base: filename.replace(this.pattern, "{}"),
        number: parseInt(match[1], 10),
      };
    }
    return null;
  }
}
```

**Examples:**

```
screenshot-001.png → screenshot-002.png (confidence: 0.9)
test_1.png → test_2.png (confidence: 0.9)
page001.png → page003.png (confidence: 0.7)
```

### 4. Pattern Matcher

Matches files based on naming patterns.

```typescript
class PatternMatcher implements PairingStrategy {
  readonly name = "pattern";
  private patterns: PatternRule[];

  constructor(patterns: PatternRule[]) {
    this.patterns = patterns;
  }

  match(reference: string, target: string): MatchResult | null {
    for (const pattern of this.patterns) {
      const refMatch = reference.match(pattern.reference);
      const targetMatch = target.match(pattern.target);

      if (refMatch && targetMatch) {
        return {
          confidence: pattern.confidence || 0.8,
          strategy: this.name,
          metadata: {
            pattern: pattern.name,
            transforms: pattern.transforms,
          },
        };
      }
    }

    return null;
  }
}

interface PatternRule {
  name: string;
  reference: RegExp;
  target: RegExp;
  confidence?: number;
  transforms?: string[];
}
```

**Example patterns:**

```typescript
const patterns: PatternRule[] = [
  {
    name: "version-update",
    reference: /(.+)-v(\d+)/,
    target: /(.+)-v(\d+)/,
    confidence: 0.9,
  },
  {
    name: "timestamp",
    reference: /(.+)-(\d{8})/,
    target: /(.+)-(\d{8})/,
    confidence: 0.85,
  },
  {
    name: "environment",
    reference: /(.+)\.dev\./,
    target: /(.+)\.prod\./,
    confidence: 0.95,
  },
];
```

### 5. Content Hash Matcher

Matches files based on content similarity (slower but accurate).

```typescript
class ContentHashMatcher implements PairingStrategy {
  readonly name = "content-hash";
  private cache = new Map<string, string>();

  async match(reference: string, target: string): Promise<MatchResult | null> {
    const refHash = await this.getPerceptualHash(reference);
    const targetHash = await this.getPerceptualHash(target);

    const similarity = this.compareHashes(refHash, targetHash);

    if (similarity > 0.9) {
      return {
        confidence: similarity,
        strategy: this.name,
        metadata: {
          hashSimilarity: similarity,
        },
      };
    }

    return null;
  }

  private async getPerceptualHash(imagePath: string): Promise<string> {
    if (this.cache.has(imagePath)) {
      return this.cache.get(imagePath)!;
    }

    // Generate perceptual hash using image processing
    const hash = await imageHash(imagePath);
    this.cache.set(imagePath, hash);

    return hash;
  }
}
```

## Implementation

### Smart Pairing Algorithm

```typescript
class SmartPairer {
  private strategies: PairingStrategy[];
  private minConfidence: number;

  constructor(options: SmartPairingOptions = {}) {
    this.minConfidence = options.minConfidence || 0.6;
    this.strategies = options.strategies || this.getDefaultStrategies();
  }

  async pair(referenceFiles: string[], targetFiles: string[]): Promise<FilePair[]> {
    const pairs: FilePair[] = [];
    const usedTargets = new Set<string>();

    // Sort by specificity (exact first, fuzzy last)
    const sortedReferences = this.sortBySpecificity(referenceFiles);

    for (const reference of sortedReferences) {
      let bestMatch: FilePair | null = null;
      let bestConfidence = 0;

      for (const target of targetFiles) {
        if (usedTargets.has(target)) continue;

        // Try each strategy
        for (const strategy of this.strategies) {
          const result = await strategy.match(reference, target);

          if (result && result.confidence > bestConfidence) {
            bestConfidence = result.confidence;
            bestMatch = {
              reference,
              target,
              confidence: result.confidence,
              strategy: result.strategy,
              metadata: result.metadata,
            };
          }
        }
      }

      if (bestMatch && bestMatch.confidence >= this.minConfidence) {
        pairs.push(bestMatch);
        usedTargets.add(bestMatch.target);
      }
    }

    // Handle unmatched files
    this.reportUnmatched(referenceFiles, targetFiles, pairs);

    return pairs;
  }

  private getDefaultStrategies(): PairingStrategy[] {
    return [
      new ExactMatcher(),
      new SequenceMatcher(),
      new PatternMatcher(commonPatterns),
      new FuzzyMatcher(0.8),
    ];
  }
}
```

### Optimization Techniques

#### 1. Caching

```typescript
class CachedSmartPairer extends SmartPairer {
  private pairCache = new Map<string, FilePair[]>();

  private getCacheKey(refs: string[], targets: string[]): string {
    return `${refs.sort().join(",")}::${targets.sort().join(",")}`;
  }

  async pair(referenceFiles: string[], targetFiles: string[]): Promise<FilePair[]> {
    const cacheKey = this.getCacheKey(referenceFiles, targetFiles);

    if (this.pairCache.has(cacheKey)) {
      return this.pairCache.get(cacheKey)!;
    }

    const pairs = await super.pair(referenceFiles, targetFiles);
    this.pairCache.set(cacheKey, pairs);

    return pairs;
  }
}
```

#### 2. Parallel Matching

```typescript
class ParallelSmartPairer extends SmartPairer {
  async pair(referenceFiles: string[], targetFiles: string[]): Promise<FilePair[]> {
    const chunks = this.chunkFiles(referenceFiles, os.cpus().length);

    const chunkResults = await Promise.all(
      chunks.map((chunk) => this.pairChunk(chunk, targetFiles))
    );

    return this.mergeResults(chunkResults);
  }

  private chunkFiles(files: string[], chunkCount: number): string[][] {
    const chunkSize = Math.ceil(files.length / chunkCount);
    const chunks: string[][] = [];

    for (let i = 0; i < files.length; i += chunkSize) {
      chunks.push(files.slice(i, i + chunkSize));
    }

    return chunks;
  }
}
```

## Configuration

### Custom Patterns

```typescript
// Define custom patterns for your project
const customPatterns: PatternRule[] = [
  {
    name: "feature-branch",
    reference: /feature-(.+)-before/,
    target: /feature-(.+)-after/,
    confidence: 0.95,
  },
  {
    name: "responsive",
    reference: /(.+)-desktop/,
    target: /(.+)-mobile/,
    confidence: 0.9,
    transforms: ["viewport-change"],
  },
  {
    name: "locale",
    reference: /(.+)\.en\./,
    target: /(.+)\.([a-z]{2})\./,
    confidence: 0.85,
    transforms: ["translation"],
  },
];

const pairer = new SmartPairer({
  strategies: [new ExactMatcher(), new PatternMatcher(customPatterns), new FuzzyMatcher(0.7)],
});
```

### Confidence Tuning

```typescript
// Strict pairing (high confidence required)
const strictPairer = new SmartPairer({
  minConfidence: 0.9,
  strategies: [
    new ExactMatcher(),
    new ContentHashMatcher(), // Very accurate but slower
  ],
});

// Lenient pairing (lower confidence acceptable)
const lenientPairer = new SmartPairer({
  minConfidence: 0.5,
  strategies: [new ExactMatcher(), new FuzzyMatcher(0.6), new SequenceMatcher()],
});
```

## Usage Examples

### Basic Usage

```typescript
const pairer = new SmartPairer();

const referenceFiles = ["baseline/home.png", "baseline/login.png", "baseline/dashboard.png"];

const targetFiles = ["current/home.png", "current/login-page.png", "current/dashboard-v2.png"];

const pairs = await pairer.pair(referenceFiles, targetFiles);

pairs.forEach((pair) => {
  console.log(
    `${pair.reference} → ${pair.target} ` + `(${pair.strategy}, confidence: ${pair.confidence})`
  );
});
```

### Advanced Usage

```typescript
// Custom workflow with validation
async function pairWithValidation(refDir: string, targetDir: string): Promise<ValidatedPairs> {
  const pairer = new SmartPairer({
    minConfidence: 0.7,
    strategies: [
      new ExactMatcher(),
      new PatternMatcher(projectPatterns),
      new FuzzyMatcher(0.75),
      new ContentHashMatcher(),
    ],
  });

  const refFiles = await glob(`${refDir}/**/*.png`);
  const targetFiles = await glob(`${targetDir}/**/*.png`);

  const pairs = await pairer.pair(refFiles, targetFiles);

  // Validate pairs
  const validated = await validatePairs(pairs);

  // Report results
  console.log(`Total files: ${refFiles.length}`);
  console.log(`Paired: ${pairs.length}`);
  console.log(`High confidence: ${validated.high.length}`);
  console.log(`Low confidence: ${validated.low.length}`);
  console.log(`Unmatched: ${validated.unmatched.length}`);

  return validated;
}
```

### Integration with BatchProcessor

```typescript
const batchProcessor = new BatchProcessor();
const pairer = new SmartPairer({
  strategies: [new ExactMatcher(), new FuzzyMatcher(0.8), new SequenceMatcher()],
});

// Get file pairs
const pairs = await pairer.pair(await glob("baseline/*.png"), await glob("current/*.png"));

// Process with pairs
const result = await batchProcessor.processPairs(pairs, {
  concurrency: 4,
  threshold: 0.1,
});
```

## Troubleshooting

### Common Issues

1. **Too many false matches**
   - Increase `minConfidence`
   - Use more specific patterns
   - Add ContentHashMatcher for validation

2. **Missing expected matches**
   - Lower `minConfidence`
   - Add more flexible patterns
   - Check fuzzy threshold

3. **Performance issues**
   - Remove ContentHashMatcher
   - Use caching
   - Implement parallel matching

### Debug Mode

```typescript
const pairer = new SmartPairer({
  verbose: true,
  onMatch: (ref, target, result) => {
    console.log(`Trying: ${ref} → ${target}`);
    console.log(`Result: ${JSON.stringify(result)}`);
  },
});
```

## Best Practices

1. **Order strategies by speed**
   - Exact matching first (fastest)
   - Pattern/sequence matching
   - Fuzzy matching
   - Content matching last (slowest)

2. **Use appropriate confidence thresholds**
   - 0.9+ for production
   - 0.7-0.9 for development
   - 0.5-0.7 for exploration

3. **Cache results when possible**
   - Especially for content-based matching
   - Clear cache when files change

4. **Monitor unmatched files**
   - Log files that couldn't be paired
   - Adjust strategies based on patterns

## See Also

- [Batch Processor](./batch-processor.md) - Uses smart pairing
- [CLI Usage](../guides/CLI_USAGE.md) - Smart pairing options
- [FAQ](../guides/FAQ.md) - Common pairing questions
