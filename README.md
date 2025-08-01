# auto-image-diff

[![CI](https://github.com/AdamManuel-dev/auto-image-diff/actions/workflows/ci.yml/badge.svg)](https://github.com/AdamManuel-dev/auto-image-diff/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/auto-image-diff.svg)](https://badge.fury.io/js/auto-image-diff)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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

- 🎯 **Smart Alignment**: Uses ImageMagick's subimage search to align images automatically
- 🔍 **Accurate Diffs**: Compares aligned images to show only real visual changes
- 📊 **Detailed Reports**: Generates comprehensive comparison reports with statistics
- 🛠️ **CLI & API**: Use as a command-line tool or integrate into your code
- 🔧 **CI/CD Ready**: Easy integration with GitHub Actions, Jenkins, etc.
- ⚡ **Fast**: Leverages ImageMagick's optimized C++ implementation
- 📝 **TypeScript**: Fully typed for better developer experience

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

# Just align images
auto-image-diff align reference.png target.png aligned.png

# Just generate diff (for pre-aligned images)
auto-image-diff diff image1.png image2.png diff.png
```

### Options

**align command:**

- `-m, --method <method>`: Alignment method (feature|phase|subimage) (default: "subimage")

**diff command:**

- `-c, --color <color>`: Highlight color for differences (default: "red")
- `--no-lowlight`: Disable lowlighting of unchanged areas

**compare command:**

- `-t, --threshold <threshold>`: Difference threshold percentage (default: "0.1")
- `-c, --color <color>`: Highlight color for differences (default: "red")

### Examples

```bash
# Basic comparison with default settings
auto-image-diff compare before.png after.png results/

# Set a higher threshold for differences (1%)
auto-image-diff compare before.png after.png results/ -t 1.0

# Use blue highlights for differences
auto-image-diff diff before.png after.png diff.png -c blue

# Align images using phase correlation method
auto-image-diff align reference.png test.png aligned.png -m phase
```

### Output

The `compare` command creates a directory with:

- `aligned.png` - The aligned version of the target image
- `diff.png` - Visual diff highlighting the changes
- `report.json` - Detailed comparison statistics

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

## 🔧 Advanced Usage

### Node.js API

```javascript
const { ImageProcessor } = require("auto-image-diff");

const processor = new ImageProcessor();

// Align images
await processor.alignImages("reference.png", "target.png", "aligned.png");

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

// Generate visual diff
const diffResult = await processor.generateDiff("image1.png", "image2.png", "diff.png", {
  highlightColor: "red",
  lowlight: true,
});
```

### TypeScript API

```typescript
import { ImageProcessor, ComparisonResult, AlignmentOptions } from "auto-image-diff";

const processor = new ImageProcessor();

// Typed alignment options
const alignOptions: AlignmentOptions = {
  method: "subimage",
};

await processor.alignImages("ref.png", "target.png", "out.png", alignOptions);

// Typed comparison result
const result: ComparisonResult = await processor.compareImages("image1.png", "image2.png", 0.1);

if (!result.isEqual) {
  console.log(`Images differ by ${result.statistics.percentageDifferent}%`);
}
```

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
│   ├── cli.ts              # CLI interface
│   ├── index.ts            # Main exports
│   ├── lib/
│   │   └── imageProcessor.ts # Core image processing
│   └── types/
│       └── gm.d.ts         # TypeScript definitions
├── dist/                   # Compiled JavaScript
├── docs/                   # Documentation
│   └── initial-planning/
├── package.json
├── tsconfig.json
└── jest.config.js
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

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

## 📚 Documentation

- [Detailed PRD](docs/initial-planning/imagediff-prd-detailed.md)
- [Figma Website Refinement Guide](docs/initial-planning/figma-website-refinement-guide.md)
- [Methodology](docs/initial-planning/methodology-vibes.md)

## 🚀 Roadmap

- [ ] Add support for batch processing multiple image pairs
- [ ] Implement smart exclusion regions (ignore timestamps, etc.)
- [ ] Add support for different image formats (WebP, AVIF)
- [ ] Create web-based UI for visual comparisons
- [ ] Add machine learning-based alignment for complex UIs
- [ ] Support for responsive design testing at multiple breakpoints

## 📄 License

MIT © Adam Manuel

---

<p align="center">Made with ❤️ using TypeScript and ImageMagick</p>
