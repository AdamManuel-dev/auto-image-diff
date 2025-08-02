# Batch Processing Guide

This guide covers the batch processing capabilities of auto-image-diff, including parallel execution, smart file pairing, and report generation.

## Overview

Batch processing allows you to compare multiple images at once with:

- Parallel execution for maximum performance
- Smart file pairing with fuzzy matching
- Comprehensive HTML and JSON reports
- Progress tracking and statistics

## Basic Usage

```bash
aid batch <reference-dir> <target-dir> <output-dir> [options]
```

### Simple Example

```bash
# Compare all PNG files in two directories
aid batch baseline/ current/ results/
```

This will:

1. Find all PNG files in both directories
2. Pair files by name
3. Process comparisons in parallel
4. Generate a comprehensive report

## Options

### File Selection

**Pattern Matching:**

```bash
# Only process specific files
aid batch ref/ target/ out/ -p "screenshot-*.png"

# Multiple patterns (using glob)
aid batch ref/ target/ out/ -p "*.{png,jpg,jpeg}"
```

**Recursive Scanning:**

```bash
# Disable recursive scanning
aid batch ref/ target/ out/ --no-recursive

# Process only top-level files
aid batch ref/ target/ out/ -r false
```

### Performance Options

**Concurrency Control:**

```bash
# Use 8 parallel workers
aid batch ref/ target/ out/ -c 8

# Use maximum available cores
aid batch ref/ target/ out/ -c $(nproc)

# Disable parallel processing (sequential)
aid batch ref/ target/ out/ --no-parallel
```

### Smart Features

**Smart File Pairing:**

```bash
# Enable fuzzy matching for renamed files
aid batch ref/ target/ out/ --smart-pairing
```

Smart pairing handles:

- Exact name matches
- Similar names (edit distance)
- Numbered sequences
- Date/time patterns

**Smart Classification:**

```bash
# Enable change classification
aid batch ref/ target/ out/ --smart
```

### Exclusion Regions

```bash
# Apply exclusions to all comparisons
aid batch ref/ target/ out/ -e exclusions.json
```

## Output Structure

```
output-dir/
├── batch-report.html       # Interactive HTML summary
├── batch-report.json       # Complete results data
├── batch-summary.json      # Quick statistics
├── performance.json        # Timing and resource usage
└── comparisons/           # Individual results
    ├── file1/
    │   ├── aligned.png
    │   ├── diff.png
    │   └── report.json
    └── file2/
        └── ...
```

## Report Features

### HTML Report

The interactive HTML report includes:

1. **Summary Dashboard**
   - Total files processed
   - Pass/fail statistics
   - Average difference percentage
   - Processing time

2. **Results Table**
   - Sortable by name, status, difference
   - Filterable by status
   - Quick preview thumbnails

3. **Detailed Views**
   - Click any result for full comparison
   - Before/after slider
   - Difference visualization

4. **Performance Metrics**
   - Processing timeline
   - Throughput graph
   - Resource utilization

### JSON Report

```json
{
  "summary": {
    "totalFiles": 50,
    "passed": 45,
    "failed": 5,
    "averageDifference": 0.23,
    "processingTime": 12.5
  },
  "results": [
    {
      "reference": "baseline/home.png",
      "target": "current/home.png",
      "status": "passed",
      "difference": 0.15,
      "outputDir": "comparisons/home"
    }
  ],
  "performance": {
    "startTime": "2025-01-15T10:00:00Z",
    "endTime": "2025-01-15T10:00:12Z",
    "throughput": 4.0,
    "concurrency": 8
  }
}
```

## Advanced Usage

### Custom Workflows

**CI/CD Integration:**

```bash
#!/bin/bash
# ci-visual-tests.sh

THRESHOLD=0.5
BASELINE_DIR="tests/baseline"
CURRENT_DIR="tests/screenshots"
OUTPUT_DIR="tests/results"

# Run batch comparison
aid batch "$BASELINE_DIR" "$CURRENT_DIR" "$OUTPUT_DIR" \
  -t "$THRESHOLD" \
  -c 4 \
  --smart-pairing \
  -e tests/exclusions.json

# Check results
if [ -f "$OUTPUT_DIR/batch-summary.json" ]; then
  FAILED=$(jq '.failed' "$OUTPUT_DIR/batch-summary.json")
  if [ "$FAILED" -gt 0 ]; then
    echo "Visual regression tests failed: $FAILED differences found"
    exit 1
  fi
fi
```

**Progressive Processing:**

```bash
# Process in chunks for very large sets
find baseline -name "*.png" | split -l 100 - chunk_
for chunk in chunk_*; do
  aid batch baseline/ current/ "results/$chunk/" \
    --files-from "$chunk"
done
```

### Smart Pairing Examples

The smart pairing algorithm handles various scenarios:

```
baseline/                current/
├── home.png            ├── home.png          ✓ Exact match
├── login.png           ├── login-page.png    ✓ Fuzzy match
├── dashboard-v1.png    ├── dashboard-v2.png  ✓ Version match
├── test-001.png        ├── test-002.png      ✓ Sequence match
└── old-page.png        └── (missing)         ✗ Unmatched
```

### Performance Tuning

**For Large Images:**

```bash
# Reduce concurrency to avoid memory issues
aid batch ref/ target/ out/ -c 2
```

**For Many Small Images:**

```bash
# Increase concurrency for better throughput
aid batch ref/ target/ out/ -c 16
```

**Memory-Constrained Environments:**

```bash
# Sequential processing with progress
aid batch ref/ target/ out/ --no-parallel --verbose
```

## Best Practices

1. **Organize Files Logically**
   - Use consistent naming conventions
   - Group related images in subdirectories
   - Maintain parallel directory structures

2. **Configure Exclusions**
   - Create reusable exclusion files
   - Exclude dynamic content (timestamps, ads)
   - Document exclusion reasons

3. **Monitor Performance**
   - Start with default concurrency
   - Adjust based on system resources
   - Check performance metrics in reports

4. **Handle Failures**
   - Review failed comparisons individually
   - Adjust thresholds as needed
   - Update baselines when appropriate

## Troubleshooting

### Common Issues

**Out of Memory:**

```bash
# Reduce concurrency
aid batch ref/ target/ out/ -c 1
```

**Slow Processing:**

```bash
# Check image sizes
find baseline -name "*.png" -exec identify {} \; | sort -k2 -n

# Process large images separately
aid batch ref/ target/ out/ -p "thumb-*.png" -c 8
aid batch ref/ target/ out/ -p "full-*.png" -c 2
```

**Pairing Issues:**

```bash
# Debug pairing with verbose output
aid batch ref/ target/ out/ --smart-pairing --verbose

# Manual pairing with manifest file
aid batch ref/ target/ out/ --pairing-manifest pairs.json
```

## See Also

- [CLI Usage](./CLI_USAGE.md) - Complete CLI reference
- [Reports Guide](./REPORTS.md) - Understanding reports
- [CI Integration](./CI_INTEGRATION.md) - CI/CD setup
