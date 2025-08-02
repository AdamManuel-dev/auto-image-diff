# Getting Started with auto-image-diff

This guide will help you get up and running with auto-image-diff, from installation to your first image comparison.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Understanding the Output](#understanding-the-output)
- [Common Use Cases](#common-use-cases)
- [Next Steps](#next-steps)

## Prerequisites

### System Requirements

- **Node.js**: Version 22.0.0 or higher
- **npm**: Version 10.0.0 or higher (comes with Node.js)
- **ImageMagick**: Version 7.0 or higher
- **Operating System**: macOS, Linux, or Windows
- **Memory**: At least 4GB RAM (8GB recommended for batch processing)

### Installing ImageMagick

ImageMagick is required for all image processing operations.

#### macOS

```bash
# Using Homebrew
brew install imagemagick

# Verify installation
convert -version
```

#### Ubuntu/Debian

```bash
# Update package list
sudo apt-get update

# Install ImageMagick
sudo apt-get install imagemagick

# Verify installation
convert -version
```

#### Windows

1. Download the installer from [ImageMagick website](https://imagemagick.org/script/download.php#windows)
2. Run the installer and follow the prompts
3. Make sure to check "Add to PATH" during installation
4. Verify in Command Prompt: `magick -version`

#### Verify ImageMagick Installation

```bash
# Check if ImageMagick is properly installed
convert -version

# Should output something like:
# Version: ImageMagick 7.1.0-52 Q16 x86_64 2022-10-09
```

## Installation

### Global Installation (Recommended)

Install auto-image-diff globally to use it from anywhere:

```bash
# Install globally
npm install -g auto-image-diff

# Verify installation
auto-image-diff --version
# or use the shorter alias
aid --version
```

### Local Installation

For project-specific use:

```bash
# In your project directory
npm install auto-image-diff

# Add to package.json scripts
{
  "scripts": {
    "image-diff": "auto-image-diff"
  }
}
```

### Development Installation

To contribute or modify auto-image-diff:

```bash
# Clone the repository
git clone https://github.com/AdamManuel-dev/auto-image-diff.git
cd auto-image-diff

# Install dependencies
npm install

# Build the project
npm run build

# Link for local development
npm link
```

## Basic Usage

### Your First Comparison

Let's start with a simple image comparison:

```bash
# Compare two images
aid compare screenshot-v1.png screenshot-v2.png output/

# This creates:
# - output/aligned.png (v2 aligned to v1)
# - output/diff.png (visual difference)
# - output/report.json (detailed metrics)
```

### Understanding Commands

auto-image-diff provides several commands:

#### 1. Compare (All-in-One)

```bash
aid compare <reference> <target> <output-dir> [options]
```

This is the most common command - it aligns images and generates a diff.

#### 2. Align Only

```bash
aid align <reference> <target> <output> [options]
```

Just aligns images without generating a diff.

#### 3. Diff Only

```bash
aid diff <image1> <image2> <output> [options]
```

Generates a diff from pre-aligned images.

#### 4. Batch Processing

```bash
aid batch <reference-dir> <target-dir> <output-dir> [options]
```

Processes multiple images at once.

### Command Options

Common options available across commands:

```bash
# Comparison threshold (percentage)
--threshold 0.1

# Highlight color for differences
--highlight-color magenta

# Dim unchanged areas
--lowlight

# Run classification to categorize changes
--classify

# Generate CSS fix suggestions
--css-fixes

# Embed metadata in output
--embed-metadata
```

## Understanding the Output

### Visual Diff Image

The diff image shows:
- **Highlighted areas**: Pixels that differ (default: red)
- **Normal areas**: Unchanged pixels
- **Lowlight mode**: Dims unchanged areas to emphasize differences

### JSON Report

The report contains:

```json
{
  "difference": 2.45,
  "isEqual": false,
  "statistics": {
    "pixelsDifferent": 15420,
    "totalPixels": 629145,
    "percentageDifferent": 2.45
  },
  "classification": {
    "summary": {
      "content": 1,
      "style": 3,
      "layout": 0
    },
    "regions": [...]
  }
}
```

### Classification Types

When using `--classify`, changes are categorized as:
- **Content**: Text or image content changes
- **Style**: Color, font, or visual styling changes
- **Layout**: Position or structure changes
- **Size**: Dimension or scaling changes

## Common Use Cases

### Visual Regression Testing

```bash
# Set a strict threshold for CI/CD
aid compare baseline.png current.png results/ --threshold 0.01

# Check exit code
if [ $? -eq 0 ]; then
  echo "Visual test passed!"
else
  echo "Visual differences detected!"
fi
```

### UI Development

```bash
# Get CSS suggestions for style differences
aid compare design.png implementation.png output/ \
  --classify \
  --css-fixes \
  --highlight-color blue
```

### Batch Screenshot Comparison

```bash
# Compare all screenshots in two directories
aid batch ./screenshots/v1 ./screenshots/v2 ./results \
  --pattern "*.png" \
  --recursive \
  --parallel \
  --max-concurrency 8
```

### Excluding Dynamic Content

Create an exclusions.json file:

```json
{
  "regions": [
    {
      "x": 1200,
      "y": 10,
      "width": 200,
      "height": 30,
      "reason": "Timestamp"
    }
  ]
}
```

Use it in comparison:

```bash
aid compare before.png after.png output/ --exclusions exclusions.json
```

## Next Steps

### Advanced Features

1. **Progressive Refinement**: Interactively improve exclusion regions
   ```bash
   aid refine baseline.png current.png refinement/
   ```

2. **OpenCV Alignment**: Use feature-based alignment for complex images
   ```bash
   aid compare ref.png target.png out/ --alignment-method opencv
   ```

3. **Metadata Tracking**: Embed Git and environment info
   ```bash
   aid compare v1.png v2.png out/ --embed-metadata --git-info
   ```

### Integration

1. **CI/CD Integration**: See [CI Integration Guide](./CI_INTEGRATION.md)
2. **Programmatic Use**: See [API Reference](../API-REFERENCE.md)
3. **Custom Classifiers**: See [Classification Guide](./CLASSIFICATION.md)

### Learning Resources

- [Examples Directory](../../examples/) - Working code samples
- [API Documentation](../API-REFERENCE.md) - Detailed API reference
- [Architecture](../ARCHITECTURE.md) - Understanding internals

## Troubleshooting

### Common Issues

1. **"ImageMagick not found"**
   - Ensure ImageMagick is installed and in PATH
   - Try running `convert -version`

2. **"Cannot align images"**
   - Images may be too different
   - Try different alignment methods
   - Check image dimensions

3. **"Out of memory"**
   - Reduce batch concurrency
   - Process smaller images
   - Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=8192"`

### Getting Help

- [FAQ](./FAQ.md) - Frequently asked questions
- [Troubleshooting Guide](../TROUBLESHOOTING.md) - Detailed solutions
- [GitHub Issues](https://github.com/AdamManuel-dev/auto-image-diff/issues) - Report bugs

## What's Next?

Now that you've completed the basics:

1. Try the [examples](../../examples/) to see more features
2. Read about [batch processing](./BATCH_PROCESSING.md) for multiple images
3. Learn about [exclusion regions](./EXCLUSIONS.md) for dynamic content
4. Explore [classification](./CLASSIFICATION.md) to understand change types

Happy image diffing! 🎯