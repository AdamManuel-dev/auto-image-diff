# Development Guide

This guide covers setting up and contributing to auto-image-diff development.

## Development Setup

### Prerequisites

1. **Node.js** (v14.0+)

   ```bash
   # Using nvm
   nvm install 18
   nvm use 18
   ```

2. **ImageMagick** (v6.9+ or v7.0+)

   ```bash
   # macOS
   brew install imagemagick

   # Ubuntu/Debian
   sudo apt-get install imagemagick

   # Verify
   convert -version
   ```

3. **Git**
   ```bash
   git --version
   ```

### Clone and Install

```bash
# Clone repository
git clone https://github.com/AdamManuel-dev/auto-image-diff.git
cd auto-image-diff

# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test
```

### Development Environment

#### VS Code Setup

`.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "jest.autoRun": "off",
  "files.exclude": {
    "dist": true,
    "coverage": true,
    "node_modules": true
  }
}
```

#### Recommended Extensions

- ESLint
- Prettier
- Jest Runner
- GitLens
- TypeScript Hero

## Project Structure

```
auto-image-diff/
├── src/                    # Source code
│   ├── cli.ts             # CLI entry point
│   ├── index.ts           # Library entry point
│   ├── lib/               # Core modules
│   │   ├── imageProcessor.ts
│   │   ├── alignment/     # Alignment strategies
│   │   ├── batch/         # Batch processing
│   │   ├── diff/          # Diff generation
│   │   ├── reports/       # Report generation
│   │   └── smart/         # Smart features
│   ├── types/             # TypeScript types
│   └── utils/             # Utilities
├── __tests__/             # Test files
├── docs/                  # Documentation
├── examples/              # Example usage
├── scripts/               # Build scripts
└── package.json
```

## Development Workflow

### 1. Create Feature Branch

```bash
# Create from main
git checkout main
git pull origin main
git checkout -b feature/my-feature

# Or create from issue
git checkout -b fix/issue-123
```

### 2. Make Changes

Follow the coding standards:

- TypeScript for all new code
- JSDoc for public APIs
- Unit tests for new features
- Update documentation

### 3. Test Changes

```bash
# Run all tests
npm test

# Run specific test
npm test -- imageProcessor.test.ts

# Run with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Linting
npm run lint
```

### 4. Manual Testing

```bash
# Build and link locally
npm run build
npm link

# Test CLI
aid compare test1.png test2.png output/

# Unlink when done
npm unlink
```

### 5. Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional message
git commit -m "feat: add new alignment method"

# Push to remote
git push origin feature/my-feature
```

## Coding Standards

### TypeScript Guidelines

```typescript
// Use explicit types
function processImage(path: string, options: ProcessOptions): Promise<Result> {
  // Implementation
}

// Use interfaces for objects
interface ProcessOptions {
  threshold: number;
  method?: AlignmentMethod;
  verbose?: boolean;
}

// Use enums for constants
enum AlignmentMethod {
  Subimage = "subimage",
  Phase = "phase",
  Feature = "feature",
}

// Use type guards
function isProcessingError(error: unknown): error is ProcessingError {
  return error instanceof ProcessingError;
}
```

### Code Style

```typescript
// File header with JSDoc
/**
 * @fileoverview Image processing core functionality
 * @module lib/imageProcessor
 */

// Class documentation
/**
 * Processes images for comparison and alignment
 * @class
 */
export class ImageProcessor {
  /**
   * Aligns two images using the specified method
   * @param reference - Path to reference image
   * @param target - Path to target image
   * @param output - Path for aligned output
   * @param options - Alignment options
   * @returns Promise resolving when complete
   * @throws {AlignmentError} If alignment fails
   */
  async alignImages(
    reference: string,
    target: string,
    output: string,
    options?: AlignmentOptions
  ): Promise<void> {
    // Implementation
  }
}
```

### Error Handling

```typescript
// Custom error classes
export class ProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = "ProcessingError";
  }
}

// Proper error handling
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof SpecificError) {
    // Handle specific error
    logger.warn("Handled error:", error);
  } else {
    // Re-throw unknown errors
    throw error;
  }
}
```

## Testing

### Unit Tests

```typescript
// __tests__/imageProcessor.test.ts
import { ImageProcessor } from "../src/lib/imageProcessor";

describe("ImageProcessor", () => {
  let processor: ImageProcessor;

  beforeEach(() => {
    processor = new ImageProcessor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("alignImages", () => {
    it("should align images successfully", async () => {
      // Arrange
      const mockAlign = jest.spyOn(processor, "alignImages");

      // Act
      await processor.alignImages("ref.png", "target.png", "out.png");

      // Assert
      expect(mockAlign).toHaveBeenCalledWith("ref.png", "target.png", "out.png");
    });

    it("should throw on invalid input", async () => {
      // Assert
      await expect(processor.alignImages("", "target.png", "out.png")).rejects.toThrow(
        "Invalid input"
      );
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/cli.test.ts
import { execSync } from "child_process";
import path from "path";

describe("CLI Integration", () => {
  const cli = path.join(__dirname, "../../dist/cli.js");

  it("should compare images via CLI", () => {
    const output = execSync(`node ${cli} compare test1.png test2.png output/`).toString();

    expect(output).toContain("Comparison complete");
  });
});
```

### Snapshot Tests

```typescript
// __tests__/reports.test.ts
describe("Report Generation", () => {
  it("should generate consistent HTML", async () => {
    const report = await generator.generateHTML(mockResults);
    expect(report).toMatchSnapshot();
  });
});
```

## Adding Features

### 1. New Alignment Method

```typescript
// src/lib/alignment/myMethod.ts
import { AlignmentMethod } from "../types";

export class MyAlignmentMethod implements AlignmentMethod {
  async align(reference: string, target: string): Promise<AlignmentResult> {
    // Implementation
    return {
      success: true,
      transform: { x: 0, y: 0 },
    };
  }
}

// Register in alignmentFactory.ts
import { MyAlignmentMethod } from "./myMethod";

export function createAlignmentMethod(type: string): AlignmentMethod {
  switch (type) {
    case "my-method":
      return new MyAlignmentMethod();
    // ... other methods
  }
}
```

### 2. New CLI Command

```typescript
// src/cli.ts
program
  .command("my-command <input>")
  .description("My new command")
  .option("-o, --option <value>", "Command option")
  .action(async (input, options) => {
    try {
      await myCommandHandler(input, options);
    } catch (error) {
      console.error("Command failed:", error);
      process.exit(1);
    }
  });
```

### 3. New Smart Feature

```typescript
// src/lib/smart/myFeature.ts
export class MySmartFeature {
  async analyze(image: string): Promise<Analysis> {
    // Implementation
  }
}

// Add to smart diff
import { MySmartFeature } from "./myFeature";

export class SmartDiff {
  private myFeature = new MySmartFeature();

  async classify(before: string, after: string) {
    const analysis = await this.myFeature.analyze(after);
    // Use analysis
  }
}
```

## Debugging

### Debug Configuration

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "program": "${workspaceFolder}/src/cli.ts",
      "args": ["compare", "test1.png", "test2.png", "output/"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "preLaunchTask": "npm: build"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug Logging

```typescript
// Enable debug logging
import debug from "debug";

const log = debug("auto-image-diff:processor");

export class ImageProcessor {
  async processImage(path: string) {
    log("Processing image: %s", path);

    try {
      const result = await this.doProcess(path);
      log("Processing complete: %O", result);
      return result;
    } catch (error) {
      log("Processing failed: %O", error);
      throw error;
    }
  }
}

// Run with debug
// DEBUG=auto-image-diff:* npm test
```

## Performance Optimization

### Profiling

```typescript
// Add performance marks
performance.mark("process-start");

await heavyOperation();

performance.mark("process-end");
performance.measure("process", "process-start", "process-end");

const measure = performance.getEntriesByName("process")[0];
console.log(`Processing took ${measure.duration}ms`);
```

### Memory Management

```typescript
// Clean up resources
class ImageProcessor {
  private cache = new Map();

  async process(path: string) {
    try {
      // Process
    } finally {
      // Clean up
      this.cache.clear();
      if (global.gc) {
        global.gc();
      }
    }
  }
}
```

## Release Process

### 1. Update Version

```bash
# Patch release (1.0.0 -> 1.0.1)
npm version patch

# Minor release (1.0.0 -> 1.1.0)
npm version minor

# Major release (1.0.0 -> 2.0.0)
npm version major
```

### 2. Update Changelog

Update `CHANGELOG.md`:

```markdown
## [1.1.0] - 2025-01-15

### Added

- New feature X
- Support for Y

### Fixed

- Bug in Z

### Changed

- Improved performance of A
```

### 3. Create Release

```bash
# Push tags
git push origin main --tags

# Create GitHub release
gh release create v1.1.0 \
  --title "Release v1.1.0" \
  --notes-file RELEASE_NOTES.md
```

### 4. Publish to npm

```bash
# Dry run
npm publish --dry-run

# Publish
npm publish
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for:

- Code of Conduct
- Pull Request process
- Issue guidelines
- Development setup

## See Also

- [Architecture](../ARCHITECTURE.md) - System design
- [Testing Guide](./TESTING.md) - Testing practices
- [API Reference](../API-REFERENCE.md) - API documentation
