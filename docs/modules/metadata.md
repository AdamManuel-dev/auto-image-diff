# Metadata Module

The metadata module handles embedding, extracting, and managing comparison metadata within PNG files using tEXt chunks.

## Overview

The metadata system enables:

- Embedding comparison results in PNG files
- Tracking image processing history
- Maintaining audit trails
- Preserving context for future analysis

## Core Components

### MetadataManager Class

```typescript
class MetadataManager {
  async embed(imagePath: string, metadata: ImageMetadata): Promise<void>;

  async extract(imagePath: string): Promise<ImageMetadata | null>;

  async update(imagePath: string, updates: Partial<ImageMetadata>): Promise<void>;
}
```

### ImageMetadata Interface

```typescript
interface ImageMetadata {
  version: string;
  timestamp: string;
  comparison?: ComparisonMetadata;
  processing?: ProcessingMetadata;
  exclusions?: ExclusionMetadata[];
  custom?: Record<string, any>;
}

interface ComparisonMetadata {
  reference: string;
  target: string;
  difference: number;
  threshold: number;
  isEqual: boolean;
  pixelsDifferent: number;
  totalPixels: number;
  classification?: ChangeClassification;
}

interface ProcessingMetadata {
  alignmentMethod?: string;
  processingTime: number;
  imageSize: { width: number; height: number };
  options: Record<string, any>;
}
```

## PNG Metadata Implementation

### Embedding Metadata

```typescript
class PNGMetadataEmbedder {
  private readonly CHUNK_TYPE = "tEXt";
  private readonly KEYWORD = "auto-image-diff";

  async embed(imagePath: string, metadata: ImageMetadata): Promise<void> {
    // Read PNG file
    const buffer = await fs.readFile(imagePath);
    const chunks = this.parseChunks(buffer);

    // Create metadata chunk
    const metadataChunk = this.createTextChunk(this.KEYWORD, JSON.stringify(metadata));

    // Insert before IEND chunk
    const iendIndex = chunks.findIndex((c) => c.type === "IEND");
    chunks.splice(iendIndex, 0, metadataChunk);

    // Write modified PNG
    const newBuffer = this.assembleChunks(chunks);
    await fs.writeFile(imagePath, newBuffer);
  }

  private createTextChunk(keyword: string, text: string): PNGChunk {
    const data = Buffer.concat([
      Buffer.from(keyword),
      Buffer.from([0]), // Null separator
      Buffer.from(text),
    ]);

    return {
      type: this.CHUNK_TYPE,
      data,
      crc: this.calculateCRC(this.CHUNK_TYPE, data),
    };
  }
}
```

### Extracting Metadata

```typescript
class PNGMetadataExtractor {
  async extract(imagePath: string): Promise<ImageMetadata | null> {
    const buffer = await fs.readFile(imagePath);
    const chunks = this.parseChunks(buffer);

    // Find metadata chunk
    const metadataChunk = chunks.find(
      (chunk) => chunk.type === "tEXt" && this.getKeyword(chunk.data) === "auto-image-diff"
    );

    if (!metadataChunk) {
      return null;
    }

    // Parse metadata
    const text = this.getText(metadataChunk.data);
    return JSON.parse(text);
  }

  private getKeyword(data: Buffer): string {
    const nullIndex = data.indexOf(0);
    return data.slice(0, nullIndex).toString();
  }

  private getText(data: Buffer): string {
    const nullIndex = data.indexOf(0);
    return data.slice(nullIndex + 1).toString();
  }
}
```

## Metadata Types

### 1. Comparison Metadata

```typescript
interface ComparisonMetadata {
  id: string;
  timestamp: string;
  reference: {
    path: string;
    hash: string;
    size: number;
  };
  target: {
    path: string;
    hash: string;
    size: number;
  };
  results: {
    difference: number;
    threshold: number;
    isEqual: boolean;
    statistics: DiffStatistics;
  };
  configuration: {
    alignmentMethod: string;
    excludeRegions?: Region[];
    options: Record<string, any>;
  };
}
```

### 2. Processing History

```typescript
interface ProcessingHistory {
  operations: ProcessingOperation[];
  totalTime: number;
  version: string;
}

interface ProcessingOperation {
  type: "align" | "compare" | "diff" | "classify";
  timestamp: string;
  duration: number;
  parameters: Record<string, any>;
  result: OperationResult;
}
```

### 3. Classification Metadata

```typescript
interface ClassificationMetadata {
  changes: ChangeDetail[];
  summary: {
    totalChanges: number;
    byType: Record<ChangeType, number>;
    averageConfidence: number;
  };
  suggestions?: {
    exclusions: ExclusionSuggestion[];
    cssFixex: CSSFix[];
  };
}
```

## Advanced Features

### Metadata Versioning

```typescript
class MetadataVersionManager {
  private readonly CURRENT_VERSION = "1.0.0";

  async migrateMetadata(metadata: any): Promise<ImageMetadata> {
    const version = metadata.version || "0.0.0";

    if (version === this.CURRENT_VERSION) {
      return metadata;
    }

    // Apply migrations
    let migrated = metadata;

    for (const migration of this.getMigrations(version)) {
      migrated = await migration.apply(migrated);
    }

    return {
      ...migrated,
      version: this.CURRENT_VERSION,
    };
  }

  private getMigrations(fromVersion: string): Migration[] {
    const migrations: Migration[] = [];

    if (semver.lt(fromVersion, "0.5.0")) {
      migrations.push(new MigrationV050());
    }

    if (semver.lt(fromVersion, "1.0.0")) {
      migrations.push(new MigrationV100());
    }

    return migrations;
  }
}
```

### Metadata Compression

```typescript
class CompressedMetadataManager extends MetadataManager {
  async embed(imagePath: string, metadata: ImageMetadata): Promise<void> {
    // Compress large metadata
    const json = JSON.stringify(metadata);

    if (json.length > 1024) {
      // 1KB threshold
      const compressed = await this.compress(json);
      await this.embedCompressed(imagePath, compressed);
    } else {
      await super.embed(imagePath, metadata);
    }
  }

  private async compress(data: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gzip(Buffer.from(data), (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed);
      });
    });
  }

  private async embedCompressed(imagePath: string, compressed: Buffer): Promise<void> {
    // Use zTXt chunk for compressed data
    const chunk = {
      type: "zTXt",
      keyword: "auto-image-diff",
      compressionMethod: 0, // zlib
      data: compressed,
    };

    await this.embedChunk(imagePath, chunk);
  }
}
```

### Metadata Validation

```typescript
class MetadataValidator {
  validate(metadata: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Check required fields
    if (!metadata.version) {
      errors.push({
        field: "version",
        message: "Version is required",
      });
    }

    if (!metadata.timestamp) {
      errors.push({
        field: "timestamp",
        message: "Timestamp is required",
      });
    }

    // Validate timestamp format
    if (!this.isValidISO8601(metadata.timestamp)) {
      errors.push({
        field: "timestamp",
        message: "Invalid timestamp format",
      });
    }

    // Validate nested structures
    if (metadata.comparison) {
      errors.push(...this.validateComparison(metadata.comparison));
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private validateComparison(comparison: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof comparison.difference !== "number") {
      errors.push({
        field: "comparison.difference",
        message: "Must be a number",
      });
    }

    if (comparison.difference < 0 || comparison.difference > 100) {
      errors.push({
        field: "comparison.difference",
        message: "Must be between 0 and 100",
      });
    }

    return errors;
  }
}
```

## Usage Examples

### Basic Usage

```typescript
const metadataManager = new MetadataManager();

// Embed metadata after comparison
const metadata: ImageMetadata = {
  version: "1.0.0",
  timestamp: new Date().toISOString(),
  comparison: {
    reference: "baseline.png",
    target: "current.png",
    difference: 0.23,
    threshold: 0.5,
    isEqual: true,
    pixelsDifferent: 4567,
    totalPixels: 2073600,
  },
  processing: {
    alignmentMethod: "subimage",
    processingTime: 523,
    imageSize: { width: 1920, height: 1080 },
  },
};

await metadataManager.embed("diff.png", metadata);

// Extract metadata later
const extracted = await metadataManager.extract("diff.png");
console.log(`Difference: ${extracted.comparison.difference}%`);
```

### Advanced Usage

```typescript
// Create metadata-aware processor
class MetadataAwareProcessor extends ImageProcessor {
  async generateDiff(
    image1: string,
    image2: string,
    output: string,
    options: DiffOptions
  ): Promise<DiffResult> {
    // Generate diff
    const result = await super.generateDiff(image1, image2, output, options);

    // Embed metadata if requested
    if (options.embedMetadata) {
      const metadata: ImageMetadata = {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        comparison: {
          reference: image1,
          target: image2,
          ...result.statistics,
        },
        processing: {
          options,
          processingTime: result.processingTime,
        },
      };

      if (result.classification) {
        metadata.comparison.classification = result.classification;
      }

      await this.metadataManager.embed(output, metadata);
    }

    return result;
  }
}
```

### Metadata Workflow

```typescript
class MetadataWorkflow {
  async processWithHistory(reference: string, target: string): Promise<ProcessingResult> {
    const operations: ProcessingOperation[] = [];

    // Track alignment
    const alignStart = Date.now();
    const aligned = await this.align(reference, target);
    operations.push({
      type: "align",
      timestamp: new Date().toISOString(),
      duration: Date.now() - alignStart,
      parameters: { method: "subimage" },
      result: { success: true },
    });

    // Track comparison
    const compareStart = Date.now();
    const comparison = await this.compare(reference, aligned);
    operations.push({
      type: "compare",
      timestamp: new Date().toISOString(),
      duration: Date.now() - compareStart,
      parameters: { threshold: 0.1 },
      result: comparison,
    });

    // Embed complete history
    const metadata: ImageMetadata = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      processing: {
        operations,
        totalTime: operations.reduce((sum, op) => sum + op.duration, 0),
      },
    };

    await this.metadataManager.embed("result.png", metadata);

    return { comparison, metadata };
  }
}
```

## CLI Integration

```bash
# Read metadata from image
aid read-metadata diff.png

# Embed custom metadata
aid embed-metadata image.png --data '{"custom": "value"}'

# Extract specific fields
aid read-metadata diff.png --field comparison.difference

# Validate metadata
aid validate-metadata diff.png
```

## Metadata Reports

### Generate Metadata Report

```typescript
class MetadataReporter {
  async generateReport(images: string[]): Promise<MetadataReport> {
    const metadataList: ImageMetadata[] = [];

    for (const image of images) {
      const metadata = await this.metadataManager.extract(image);
      if (metadata) {
        metadataList.push(metadata);
      }
    }

    return {
      summary: this.generateSummary(metadataList),
      timeline: this.generateTimeline(metadataList),
      statistics: this.calculateStatistics(metadataList),
    };
  }

  private generateSummary(metadataList: ImageMetadata[]): MetadataSummary {
    return {
      totalImages: metadataList.length,
      averageDifference: this.average(metadataList.map((m) => m.comparison?.difference || 0)),
      processingTime: this.sum(metadataList.map((m) => m.processing?.processingTime || 0)),
      dateRange: {
        start: this.min(metadataList.map((m) => m.timestamp)),
        end: this.max(metadataList.map((m) => m.timestamp)),
      },
    };
  }
}
```

## Best Practices

1. **Always validate metadata**

   ```typescript
   const validator = new MetadataValidator();
   const result = validator.validate(metadata);
   if (!result.valid) {
     throw new Error(`Invalid metadata: ${result.errors}`);
   }
   ```

2. **Use compression for large metadata**

   ```typescript
   const manager = new CompressedMetadataManager();
   await manager.embed(image, largeMetadata);
   ```

3. **Version your metadata schema**

   ```typescript
   metadata.version = "1.0.0";
   ```

4. **Include relevant context**
   - Processing options
   - Environment info
   - Tool versions

5. **Respect privacy**
   - Don't embed sensitive paths
   - Anonymize user data
   - Allow metadata stripping

## Troubleshooting

### Metadata Not Found

```typescript
// Check if image has metadata
const metadata = await manager.extract(image);
if (!metadata) {
  console.log("No metadata found in image");

  // Check if it's a PNG
  const format = await getImageFormat(image);
  if (format !== "PNG") {
    console.log("Metadata only supported in PNG files");
  }
}
```

### Corrupted Metadata

```typescript
try {
  const metadata = await manager.extract(image);
} catch (error) {
  if (error instanceof SyntaxError) {
    console.error("Corrupted metadata JSON");

    // Try to recover
    const raw = await manager.extractRaw(image);
    console.log("Raw metadata:", raw);
  }
}
```

### Large Metadata

```typescript
// Monitor metadata size
const size = Buffer.byteLength(JSON.stringify(metadata));
if (size > 10240) {
  // 10KB
  console.warn(`Large metadata: ${size} bytes`);

  // Consider pruning
  const pruned = pruneMetadata(metadata, {
    keepHistory: false,
    keepClassification: true,
  });
}
```

## See Also

- [Image Processor](./image-processor.md) - Core processing
- [Reports Guide](../guides/REPORTS.md) - Report generation
- [CLI Usage](../guides/CLI_USAGE.md) - Metadata commands
