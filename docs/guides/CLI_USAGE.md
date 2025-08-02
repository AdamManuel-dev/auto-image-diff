# CLI Usage Guide

This guide covers the command-line interface (CLI) for auto-image-diff, including all commands, options, and usage patterns.

## Installation

```bash
npm install -g auto-image-diff
```

After installation, you can use either `auto-image-diff` or the shorter alias `aid`.

## Commands

### `compare` - Complete Comparison Workflow

Performs alignment and diff generation in one command.

```bash
aid compare <reference> <target> <output-dir> [options]
```

**Arguments:**

- `reference` - Path to the reference/baseline image
- `target` - Path to the target/comparison image
- `output-dir` - Directory for output files

**Options:**

- `-t, --threshold <percent>` - Difference threshold (default: 0.1)
- `-c, --color <color>` - Highlight color for differences (default: "red")
- `-e, --exclude <file>` - Path to exclusions.json file
- `-s, --smart` - Enable smart classification

**Example:**

```bash
aid compare baseline.png current.png results/ -t 0.5 -s
```

### `align` - Image Alignment

Aligns two images using various methods.

```bash
aid align <reference> <target> <output> [options]
```

**Options:**

- `-m, --method <method>` - Alignment method: subimage, phase, or feature (default: "subimage")

**Examples:**

```bash
# Default subimage alignment
aid align ref.png target.png aligned.png

# Phase correlation alignment
aid align ref.png target.png aligned.png -m phase

# Feature-based alignment (requires OpenCV)
aid align ref.png target.png aligned.png -m feature
```

### `diff` - Generate Visual Diff

Creates a visual diff between two images.

```bash
aid diff <image1> <image2> <output> [options]
```

**Options:**

- `-c, --color <color>` - Highlight color (default: "red")
- `--no-lowlight` - Disable lowlighting of unchanged areas
- `-e, --exclude <file>` - Exclusions file path
- `-s, --smart` - Enable smart classification
- `--smart-diff` - Generate detailed smart diff report
- `-f, --focus <types>` - Focus on specific change types
- `--suggest-css` - Generate CSS fix suggestions
- `--css-selector <selector>` - CSS selector for fixes
- `--embed-metadata` - Embed metadata in PNG output

**Examples:**

```bash
# Basic diff
aid diff before.png after.png diff.png

# Smart diff with CSS suggestions
aid diff before.png after.png diff.png --smart-diff --suggest-css

# Focus on specific changes
aid diff before.png after.png diff.png -f content,style
```

### `batch` - Batch Processing

Process multiple images in parallel.

```bash
aid batch <reference-dir> <target-dir> <output-dir> [options]
```

**Options:**

- `-p, --pattern <pattern>` - File pattern (default: "\*.png")
- `-r, --recursive` - Scan recursively (default: true)
- `-t, --threshold <percent>` - Difference threshold (default: 0.1)
- `--no-parallel` - Disable parallel processing
- `-c, --concurrency <n>` - Worker count (default: 4)
- `-e, --exclude <file>` - Exclusions file
- `-s, --smart` - Enable smart classification
- `--smart-pairing` - Use fuzzy file matching

**Example:**

```bash
aid batch baseline/ current/ results/ -p "*.png" -c 8 --smart-pairing
```

### `refine` - Progressive Refinement

Iteratively improve comparison accuracy.

```bash
aid refine <before> <after> <output-dir> [options]
```

**Options:**

- `-e, --exclude <file>` - Existing exclusions file
- `--auto` - Auto-apply high-confidence suggestions
- `--exclude-types <types>` - Types to auto-exclude
- `--target <percent>` - Target difference percentage
- `--max-iterations <n>` - Maximum iterations

**Example:**

```bash
aid refine before.png after.png refinement/ --auto --target 0.5
```

### `report` - Generate HTML Report

Create an interactive HTML report from comparison results.

```bash
aid report <results-dir> [options]
```

**Example:**

```bash
aid report comparison-results/
```

### `read-metadata` - Read Embedded Metadata

Extract metadata embedded in PNG files.

```bash
aid read-metadata <image-file>
```

## Global Options

These options work with all commands:

- `-h, --help` - Display help
- `-v, --version` - Display version
- `--verbose` - Enable verbose logging
- `--quiet` - Suppress output except errors

## Configuration

### Exclusion Regions

Create an `exclusions.json` file to ignore specific regions:

```json
{
  "regions": [
    {
      "name": "timestamp",
      "bounds": { "x": 10, "y": 10, "width": 200, "height": 30 },
      "reason": "Dynamic timestamp"
    }
  ]
}
```

### Environment Variables

- `AID_CONCURRENCY` - Default worker count for batch processing
- `AID_THRESHOLD` - Default difference threshold
- `AID_COLOR` - Default highlight color

## Output Files

### Compare Command

- `aligned.png` - Aligned target image
- `diff.png` - Visual difference
- `report.json` - Comparison statistics
- `metadata.json` - Extended metadata

### Smart Diff

- `diff-smart-report.json` - Classification data
- `diff-smart-report.html` - Interactive report
- `diff-fixes.css` - CSS suggestions

### Batch Processing

- `batch-report.html` - Interactive summary
- `batch-report.json` - Complete results
- Individual comparison directories

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Invalid arguments
- `3` - File not found
- `4` - ImageMagick not found
- `5` - Processing error

## Tips and Tricks

### Performance Optimization

```bash
# Increase concurrency for large batches
aid batch ref/ target/ out/ -c 16

# Disable parallel for debugging
aid batch ref/ target/ out/ --no-parallel
```

### Smart Workflows

```bash
# Full smart analysis
aid compare before.png after.png results/ \
  --smart \
  --smart-diff \
  --suggest-css \
  --embed-metadata

# Focus on UI changes only
aid diff before.png after.png diff.png \
  -f style,layout \
  --suggest-css \
  --css-selector ".my-component"
```

### CI Integration

```bash
# Strict mode for CI
aid compare baseline.png screenshot.png results/ \
  -t 0.01 \
  -e ci-exclusions.json \
  || exit 1
```

## See Also

- [Programmatic Usage](./PROGRAMMATIC_USAGE.md) - Using as a library
- [Batch Processing Guide](./BATCH_PROCESSING.md) - Advanced batch features
- [CI Integration](./CI_INTEGRATION.md) - CI/CD setup
