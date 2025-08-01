# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-01

### 🎉 Initial Release

This is the first stable release of auto-image-diff, a powerful command-line tool that automatically aligns UI screenshots and generates visual difference reports.

### ✨ Features

#### Core Functionality

- **Smart Image Alignment**: Automatic alignment using ImageMagick's subimage search
- **Accurate Visual Diffs**: Pixel-perfect comparison with configurable thresholds
- **CLI & API**: Both command-line interface and programmatic API
- **TypeScript Support**: Fully typed for better developer experience

#### Advanced Features

- **Smart Classification System**: Automatically categorizes changes into:
  - Content changes (text, images, data)
  - Style changes (colors, fonts, visual styling)
  - Layout changes (position, arrangement)
  - Size changes (dimensions, scaling)
  - Structural changes (DOM modifications)
  - New/removed elements
- **Exclusion Regions**: Define areas to ignore (timestamps, dynamic content)
- **Progressive Refinement**: Iteratively improve accuracy by learning patterns
- **CSS Fix Suggestions**: Automatically generate CSS to fix style differences
- **Batch Processing**: Process multiple images with parallel execution
- **Smart File Pairing**: Fuzzy matching for batch comparisons
- **PNG Metadata Embedding**: Embed comparison data directly in output images

#### Reporting

- **Interactive HTML Reports**:
  - Before/after slider for visual comparison
  - Region highlighting synchronized with data tables
  - Chart.js visualizations for batch summaries
- **Comprehensive JSON Output**: Detailed statistics and classification data
- **Batch Summary Reports**: Aggregated results with performance metrics

#### Developer Experience

- **Extensive Documentation**:
  - Comprehensive API documentation
  - 6 detailed example scripts
  - Full TypeScript type definitions
- **High Test Coverage**: 51%+ coverage with comprehensive test suite
- **CI/CD Ready**: GitHub Actions pipeline included
- **Multiple CLI Commands**:
  - `compare`: Full comparison workflow
  - `align`: Image alignment only
  - `diff`: Difference generation only
  - `batch`: Batch processing
  - `read-metadata`: Extract embedded PNG metadata
  - `refine`: Interactive progressive refinement

### 🛠️ Technical Implementation

#### Architecture

- **Modular Design**: Clean separation of concerns
- **Plugin System**: Extensible classifier architecture
- **Worker Pool**: Parallel processing for batch operations
- **Stream Processing**: Efficient handling of large images

#### Quality

- **ESLint Configuration**: Strict linting rules enforced
- **Prettier Integration**: Consistent code formatting
- **Husky Pre-commit Hooks**: Automated quality checks
- **Jest Testing**: Comprehensive unit and integration tests

### 📦 Installation

```bash
npm install -g auto-image-diff
```

### 🚀 Quick Start

```bash
# Basic comparison
auto-image-diff compare screenshot1.png screenshot2.png output/

# Batch processing with classification
auto-image-diff batch baseline/ current/ results/ --classify --parallel

# Progressive refinement
auto-image-diff refine before.png after.png --output-dir refinement/
```

### 🙏 Acknowledgments

Special thanks to all contributors and the open source community for making this project possible.

### 📄 License

MIT © Adam Manuel

---

For more information, see the [README](README.md) and [API Documentation](docs/API.md).
