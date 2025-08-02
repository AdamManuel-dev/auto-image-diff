# auto-image-diff

[![CI](https://github.com/AdamManuel-dev/auto-image-diff/actions/workflows/ci.yml/badge.svg)](https://github.com/AdamManuel-dev/auto-image-diff/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/auto-image-diff.svg)](https://badge.fury.io/js/auto-image-diff)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Coverage](https://img.shields.io/badge/coverage-51%25-yellowgreen.svg)](https://github.com/AdamManuel-dev/auto-image-diff)

auto-image-diff is a powerful command-line tool that automatically aligns UI screenshots and generates visual difference reports. It solves the common problem of false positives in visual regression testing caused by minor positioning differences between screenshots.

## 🎯 Problem It Solves

When running visual regression tests, even tiny positioning differences (1-2 pixels) between screenshots can cause tests to fail, even though the UI looks identical to the human eye. This leads to:

- ❌ False positive test failures
- 🔄 Constant test maintenance
- 😤 Developer frustration
- ⏱️ Wasted time investigating non-issues

## ✨ Solution

auto-image-diff uses ImageMagick's powerful image processing capabilities to:

1. **Automatically detect and align** UI elements between screenshots
2. **Generate accurate visual diffs** that ignore minor positioning differences
3. **Produce clean reports** showing only meaningful visual changes

## 🚀 Key Features

- 🎯 **Smart Alignment**: Multiple alignment methods including subimage search, phase correlation, and feature matching
- 🔍 **Accurate Diffs**: Compares aligned images to show only real visual changes
- 📊 **Detailed Reports**: Generates comprehensive HTML and JSON reports with statistics
- 🛠️ **CLI & API**: Use as a command-line tool or integrate into your TypeScript/JavaScript code
- 🔧 **CI/CD Ready**: Easy integration with GitHub Actions, Jenkins, and other CI/CD platforms
- ⚡ **Fast**: Parallel batch processing with configurable concurrency
- 📝 **TypeScript**: Fully typed with comprehensive JSDoc documentation
- 🏃 **Alias Support**: Use `aid` as a shorter alias for `auto-image-diff`

### ✨ Advanced Features

- 🤖 **Smart Classification**: Automatically categorizes changes (content, style, layout, size, structural, new/removed elements)
- 🎯 **Exclusion Regions**: Define areas to ignore (timestamps, dynamic content) with JSON configuration
- 🔄 **Progressive Refinement**: Iteratively improve accuracy with confidence-based suggestions
- 🎨 **CSS Fix Suggestions**: Automatically generate CSS to fix style and layout differences
- 📦 **Batch Processing**: Process multiple images with parallel execution and smart pairing
- 🏷️ **Metadata Embedding**: Embed comparison data directly in PNG files for traceability
- 📈 **Interactive Reports**: HTML reports with before/after sliders, charts, and visualizations
- 🔍 **Smart File Pairing**: Fuzzy matching algorithm for intelligent batch comparisons
- 🔬 **OpenCV Support**: Advanced feature-based alignment using ORB and SIFT algorithms
- 📊 **Performance Metrics**: Detailed processing statistics and throughput analysis
- 🤖 **AI Agent Integration**: Optimized for use with Claude Code and other AI coding assistants

## 📦 Installation

### Prerequisites

auto-image-diff requires ImageMagick to be installed on your system:

**macOS:**

```bash
brew install imagemagick
```

**Ubuntu/Debian:**

```bash
sudo apt-get install imagemagick
```

**Windows:**
Download and install from [ImageMagick website](https://imagemagick.org/script/download.php#windows)

### Install auto-image-diff

```bash
npm install -g auto-image-diff
```

## 🎮 Usage

### Basic Commands

```bash
# Compare two images (align + diff in one command)
auto-image-diff compare screenshot1.png screenshot2.png output-dir/
# or use the shorter alias:
aid compare screenshot1.png screenshot2.png output-dir/

# Just align images
aid align reference.png target.png aligned.png

# Just generate diff (for pre-aligned images)
aid diff image1.png image2.png diff.png

# Batch processing
aid batch reference-dir/ target-dir/ output-dir/

# Generate interactive HTML report
aid report comparison-results/

# Read embedded metadata
aid read-metadata diff-image.png

# Progressive refinement (interactive)
aid refine before.png after.png refinement/
```

### Options

**align command:**

- `-m, --method <method>`: Alignment method (feature|phase|subimage) (default: "subimage")

**diff command:**

- `-c, --color <color>`: Highlight color for differences (default: "red")
- `--no-lowlight`: Disable lowlighting of unchanged areas
- `-e, --exclude <regions>`: Path to exclusions.json file defining regions to ignore
- `-s, --smart`: Run smart classification on differences
- `--smart-diff`: Generate detailed smart diff report with classifications
- `-f, --focus <types>`: Focus on specific change types (comma-separated: content,style,layout,size,structural)
- `--suggest-css`: Generate CSS fix suggestions for style and layout changes
- `--css-selector <selector>`: CSS selector to use in fix suggestions
- `--embed-metadata`: Embed comparison metadata into PNG output

**compare command:**

- `-t, --threshold <threshold>`: Difference threshold percentage (default: "0.1")
- `-c, --color <color>`: Highlight color for differences (default: "red")
- `-e, --exclude <regions>`: Path to exclusions.json file defining regions to ignore
- `-s, --smart`: Run smart classification on differences

**batch command:**

- `-p, --pattern <pattern>`: File pattern to match (default: "\*.png")
- `-r, --recursive`: Scan directories recursively (default: true)
- `-t, --threshold <threshold>`: Difference threshold percentage (default: "0.1")
- `--no-parallel`: Disable parallel processing
- `-c, --concurrency <workers>`: Number of parallel workers (default: 4)
- `-e, --exclude <regions>`: Path to exclusions.json file defining regions to ignore
- `-s, --smart`: Run smart classification on differences
- `--smart-pairing`: Use smart file pairing algorithm for fuzzy matching

**refine command:**

- `-e, --exclude <regions>`: Path to existing exclusions.json file
- `--auto`: Automatically apply high-confidence suggestions
- `--exclude-types <types>`: Comma-separated types to auto-exclude (content,style,layout,size,structural)
- `--target <percent>`: Target difference percentage (default: "0.5")
- `--max-iterations <n>`: Maximum refinement iterations (default: "5")

### Examples

```bash
# Basic comparison with default settings
aid compare before.png after.png results/

# Set a higher threshold for differences (1%)
aid compare before.png after.png results/ -t 1.0

# Use blue highlights for differences
aid diff before.png after.png diff.png -c blue

# Align images using phase correlation method
aid align reference.png test.png aligned.png -m phase

# Smart diff with classification and CSS suggestions
aid diff before.png after.png diff.png --smart-diff --suggest-css

# Batch processing with smart features
aid batch baseline/ current/ results/ -s --smart-pairing

# Progressive refinement with auto-exclusion
aid refine before.png after.png refinement/ --auto --exclude-types content,style
```

### Batch Processing

The batch processing feature allows you to compare multiple images at once with parallel execution for maximum performance. It automatically generates comprehensive reports showing the comparison results for all image pairs.

**Key features of batch processing:**

- 🚀 **Parallel execution** with configurable worker count (default: 4 workers)
- 📊 **Smart file pairing** with fuzzy matching algorithm for intelligent comparisons
- 📈 **Comprehensive reports** in both HTML (interactive) and JSON formats
- 🎯 **Exclusion regions** support across all comparisons
- 📉 **Performance metrics** including throughput, timing, and resource usage
- 🔄 **Progress tracking** with real-time updates
- 📁 **Recursive scanning** with configurable file patterns
- 🎨 **Visual summaries** with thumbnail galleries and statistics

The batch processor intelligently pairs files between directories using:

- Exact filename matching
- Similarity scoring for renamed files
- Pattern-based matching for numbered sequences
- Smart handling of missing or extra files

### Output

The `compare` command creates a directory with:

- `aligned.png` - The aligned version of the target image
- `diff.png` - Visual diff highlighting the changes
- `report.json` - Detailed comparison statistics
- `metadata.json` - Extended metadata with processing details

The `diff` command with `--smart-diff` creates additional outputs:

- `diff-smart-report.json` - Detailed classification report with confidence scores
- `diff-smart-report.html` - Interactive HTML report with:
  - Before/after image sliders
  - Change type breakdown charts
  - Region-by-region analysis
  - Confidence heat maps
- `diff-fixes.css` - CSS suggestions when using `--suggest-css`
- `diff-annotated.png` - Visual diff with classification overlays (when using `--annotate`)

Example `report.json`:

```json
{
  "reference": "before.png",
  "target": "after.png",
  "aligned": "results/aligned.png",
  "diff": "results/diff.png",
  "statistics": {
    "pixelsDifferent": 1250,
    "totalPixels": 1920000,
    "percentageDifferent": 0.065
  },
  "isEqual": true,
  "threshold": 0.1,
  "timestamp": "2025-08-01T04:00:00.000Z"
}
```

### Exclusion Regions

You can define regions to ignore in comparisons using an `exclusions.json` file:

```json
{
  "regions": [
    {
      "name": "timestamp",
      "bounds": { "x": 10, "y": 10, "width": 200, "height": 30 },
      "reason": "Dynamic timestamp that changes every render"
    },
    {
      "name": "user-avatar",
      "bounds": { "x": 500, "y": 50, "width": 50, "height": 50 },
      "reason": "User avatars may vary"
    }
  ]
}
```

### Smart Classification

When using the `--smart` or `--smart-diff` flags, auto-image-diff uses advanced heuristics to categorize detected changes:

- **content**: Text, images, or data changes (high confidence for text regions)
- **style**: Colors, fonts, borders, shadows, or visual styling changes
- **layout**: Position, spacing, margin, or arrangement changes
- **size**: Dimension changes, scaling, or resizing of elements
- **structural**: DOM structure modifications or element hierarchy changes
- **new_element**: Newly added UI elements (detected via region analysis)
- **removed_element**: Deleted UI elements (inverse region detection)

Each classification includes:

- **Confidence score** (0-1) based on change characteristics
- **Affected regions** with bounding boxes
- **Severity level** (minor, moderate, major)
- **CSS selectors** when using `--suggest-css`

## 🔧 Advanced Usage

### Node.js API

```javascript
const { ImageProcessor, SmartDiff, BatchProcessor } = require("auto-image-diff");

const processor = new ImageProcessor();

// Align images with options
await processor.alignImages("reference.png", "target.png", "aligned.png", {
  method: "subimage", // or "phase", "feature"
});

// Compare images
const result = await processor.compareImages(
  "image1.png",
  "image2.png",
  0.1 // threshold percentage
);

console.log(result);
// {
//   difference: 0.065,
//   isEqual: true,
//   statistics: {
//     pixelsDifferent: 1250,
//     totalPixels: 1920000,
//     percentageDifferent: 0.065
//   }
// }

// Generate visual diff with smart classification
const diffResult = await processor.generateDiff("image1.png", "image2.png", "diff.png", {
  highlightColor: "red",
  lowlight: true,
  smart: true,
  excludeRegions: [
    { x: 0, y: 0, width: 100, height: 50 }, // Exclude header
  ],
});

// Batch processing
const batchProcessor = new BatchProcessor();
const batchResults = await batchProcessor.processBatch("baseline/", "current/", "output/", {
  pattern: "*.png",
  parallel: true,
  concurrency: 4,
  smart: true,
});
```

### TypeScript API

```typescript
import {
  ImageProcessor,
  ComparisonResult,
  AlignmentOptions,
  DiffOptions,
  SmartDiff,
  BatchProcessor,
  RefineOptions,
  ClassificationType,
} from "auto-image-diff";

const processor = new ImageProcessor();

// Typed alignment options
const alignOptions: AlignmentOptions = {
  method: "subimage", // IntelliSense shows: "subimage" | "phase" | "feature"
};

await processor.alignImages("ref.png", "target.png", "out.png", alignOptions);

// Typed comparison result
const result: ComparisonResult = await processor.compareImages("image1.png", "image2.png", 0.1);

if (!result.isEqual) {
  console.log(`Images differ by ${result.statistics.percentageDifferent}%`);
}

// Smart diff with typed options
const diffOptions: DiffOptions = {
  highlightColor: "red",
  lowlight: true,
  smart: true,
  focusTypes: ["content", "style"], // Typed array of ClassificationType
  suggestCSS: true,
  cssSelector: ".my-component",
};

const smartDiff = new SmartDiff();
const classification = await smartDiff.classifyChanges("before.png", "after.png");

// Type-safe classification handling
classification.changes.forEach((change) => {
  if (change.type === "style" && change.confidence > 0.8) {
    console.log(`High confidence style change at region ${change.bounds}`);
  }
});
```

## 📚 Documentation

Comprehensive documentation is available in the [docs](./docs) directory:

### Getting Started

- [Getting Started Guide](./docs/guides/GETTING_STARTED.md) - Installation and first steps
- [Examples](./examples/README.md) - Code examples for common use cases
- [API Reference](./docs/API-REFERENCE.md) - Complete API documentation

### Guides

- [CLI Usage](./docs/guides/CLI_USAGE.md) - Command-line interface guide
- [Batch Processing](./docs/guides/BATCH_PROCESSING.md) - Processing multiple images
- [Classification System](./docs/modules/classifiers.md) - Understanding change types
- [AI Coding Agents](./docs/guides/AI_CODING_AGENTS.md) - Using with Claude Code and AI assistants
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues and solutions

### Advanced Topics

- [Architecture Overview](./docs/ARCHITECTURE.md) - System design and internals
- [Testing Guide](./docs/guides/TESTING.md) - Running and writing tests
- [OpenCV Setup](./docs/OPENCV_SETUP.md) - Advanced alignment features

### Quick Links

- [Documentation Index](./docs/INDEX.md) - Complete documentation map
- [FAQ](./docs/guides/FAQ.md) - Frequently asked questions
- [Contributing](./CONTRIBUTING.md) - How to contribute

### CI/CD Integration

#### GitHub Actions

```yaml
name: Visual Regression Tests
on: [push, pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install ImageMagick
        run: sudo apt-get install -y imagemagick

      - name: Install auto-image-diff
        run: npm install -g auto-image-diff

      - name: Run Visual Regression Tests
        run: |
          auto-image-diff compare \
            tests/baseline.png \
            tests/screenshot.png \
            tests/results/ \
            --threshold 0.5

      - name: Upload Diff Results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-diff-results
          path: tests/results/
```

#### Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('Visual Tests') {
            steps {
                sh 'npm install -g auto-image-diff'
                sh 'auto-image-diff compare baseline.png current.png results/'

                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'results',
                    reportFiles: 'report.json',
                    reportName: 'Visual Diff Report'
                ])
            }
        }
    }
}
```

## 🏗️ Architecture

```
auto-image-diff/
├── src/
│   ├── cli.ts              # CLI interface with command routing
│   ├── index.ts            # Main exports and public API
│   ├── lib/
│   │   ├── imageProcessor.ts    # Core image processing with ImageMagick
│   │   ├── alignment/           # Alignment strategies (subimage, phase, feature)
│   │   ├── diff/               # Diff generation and visualization
│   │   ├── smart/              # Smart classification and analysis
│   │   ├── batch/              # Batch processing with parallel execution
│   │   ├── refinement/         # Progressive refinement system
│   │   └── reports/            # HTML and JSON report generation
│   ├── types/
│   │   ├── index.ts        # Main type definitions
│   │   └── gm.d.ts         # GraphicsMagick TypeScript definitions
│   └── utils/              # Shared utilities and helpers
├── dist/                   # Compiled JavaScript output
├── docs/                   # Comprehensive documentation
│   ├── guides/            # User guides and tutorials
│   ├── modules/           # Module documentation
│   └── initial-planning/  # Architecture and design docs
├── examples/              # Usage examples
├── __tests__/            # Test suite with fixtures
├── package.json
├── tsconfig.json
├── jest.config.js
└── .github/              # CI/CD workflows
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test suite
npm test -- imageProcessor.test.ts

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

### Test Structure

- **Unit Tests**: Core functionality testing with mocked dependencies
- **Integration Tests**: End-to-end command testing with real images
- **Performance Tests**: Batch processing and large image handling
- **Visual Tests**: Snapshot testing for generated reports

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/) (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 📋 Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and changelog generation:

- `feat:` - New features (minor version bump)
- `fix:` - Bug fixes (patch version bump)
- `docs:` - Documentation changes
- `style:` - Code formatting changes
- `refactor:` - Code changes that neither fix bugs nor add features
- `test:` - Adding or updating tests
- `chore:` - Build process or auxiliary tool changes

For breaking changes, add `!` after the type: `feat!: remove deprecated API`

### 🔄 Automated Releases

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated versioning and publishing. When commits are merged to `main`, releases are automatically created based on the conventional commit messages. See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

### Development Setup

```bash
# Clone the repo
git clone https://github.com/AdamManuel-dev/auto-image-diff.git
cd auto-image-diff

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

## 📚 Additional Resources

- [API Documentation](docs/API.md)
- [Code Examples](examples/README.md)
- [Architecture Details](docs/ARCHITECTURE.md)
- [Detailed PRD](docs/initial-planning/imagediff-prd-detailed.md)
- [Figma Website Refinement Guide](docs/initial-planning/figma-website-refinement-guide.md)
- [Methodology](docs/initial-planning/methodology-vibes.md)

## 🚀 Roadmap

### ✅ Completed (v1.0.0)

- [x] Smart image alignment using multiple methods (subimage, phase, feature)
- [x] Batch processing with parallel execution and concurrency control
- [x] Smart exclusion regions with JSON configuration
- [x] Interactive HTML reports with before/after sliders and charts
- [x] Smart classification of 7 change types with confidence scoring
- [x] CSS fix suggestions for style and layout changes
- [x] Progressive refinement mode with auto-exclusion
- [x] PNG metadata embedding for traceability
- [x] Smart file pairing with fuzzy matching algorithm
- [x] Comprehensive test coverage (51%+)
- [x] TypeScript with full type safety
- [x] Detailed JSDoc documentation
- [x] CI/CD integration examples

### 🚧 In Progress

- [ ] OpenCV.js integration for browser-based alignment
- [ ] Performance optimizations for 4K+ resolution images
- [ ] Enhanced smart classification using ML models

### 📋 Planned Features

- [ ] Support for WebP, AVIF, and HEIC formats
- [ ] Web-based UI dashboard for visual comparisons
- [ ] Machine learning-based alignment for complex UIs
- [ ] Responsive design testing at multiple breakpoints
- [ ] Visual regression baseline management system
- [ ] Cloud storage integration (S3, GCS, Azure)
- [ ] Slack/Teams/Discord notifications for CI/CD
- [ ] Distributed processing for large test suites
- [ ] Integration with popular testing frameworks (Playwright, Cypress)
- [ ] Visual diff annotations and comments
- [ ] A/B testing support for design variations

## 📄 License

MIT © Adam Manuel

## 🏆 Performance

auto-image-diff is optimized for speed and accuracy:

- **Fast alignment**: < 500ms for 1920x1080 images
- **Parallel batch processing**: Process 100+ images in seconds
- **Memory efficient**: Streaming processing for large images
- **Accurate classification**: 90%+ accuracy in change type detection
- **Smart caching**: Reuses alignment data for multiple comparisons

## 🔒 Security

- No external API calls or data transmission
- All processing happens locally
- Safe handling of file paths and user input
- Secure exclusion region validation
- No execution of arbitrary code

## 📊 Performance Benchmarks

| Operation         | 1080p (1920x1080) | 4K (3840x2160) | Time   |
| ----------------- | ----------------- | -------------- | ------ |
| Align (subimage)  | ✓                 | ✓              | ~400ms |
| Align (phase)     | ✓                 | ✓              | ~300ms |
| Align (feature)   | ✓                 | ✓              | ~600ms |
| Compare           | ✓                 | ✓              | ~200ms |
| Smart Diff        | ✓                 | ✓              | ~500ms |
| Batch (10 images) | ✓                 | ✓              | ~2.5s  |

---

<p align="center">
  Made with ❤️ using TypeScript and ImageMagick
  <br>
  <a href="https://github.com/AdamManuel-dev/auto-image-diff">GitHub</a> •
  <a href="https://www.npmjs.com/package/auto-image-diff">npm</a> •
  <a href="./docs/INDEX.md">Docs</a>
</p>
