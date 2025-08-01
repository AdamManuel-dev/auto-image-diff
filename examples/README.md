# Auto Image Diff Examples

This directory contains comprehensive examples demonstrating the various features and capabilities of auto-image-diff.

## 📚 Examples Overview

### Basic Examples

#### 1. **basic-comparison.ts**

Demonstrates fundamental image comparison functionality.

```bash
npm run example:basic
```

- Simple before/after comparison
- Basic diff generation
- Statistics reporting

#### 2. **smart-classification.ts**

Shows the intelligent classification system for categorizing changes.

```bash
npm run example:classification
```

- Automatic change type detection
- Confidence scoring
- Detailed classification reports

### Advanced Examples

#### 3. **batch-processing.ts**

Demonstrates batch processing with parallel execution.

```bash
npm run example:batch
```

- Process multiple images concurrently
- Smart file pairing
- Comprehensive batch reports
- HTML summary generation

#### 4. **progressive-refinement.ts**

Interactive refinement process for improving accuracy.

```bash
npm run example:refine
```

- Iterative exclusion suggestions
- Interactive acceptance/rejection
- Session persistence
- Accuracy improvement tracking

#### 5. **css-fix-suggestions.ts**

Automatic CSS fix generation for style changes.

```bash
npm run example:css-fixes
```

- Style change detection
- CSS property suggestions
- Confidence-based prioritization
- HTML preview generation

#### 6. **metadata-tracking.ts**

Enhanced metadata collection and embedding.

```bash
npm run example:metadata
```

- Git information capture
- Environment details
- PNG metadata embedding/extraction
- Execution tracking

## 🚀 Running Examples

### Prerequisites

1. Install dependencies:

```bash
npm install
```

2. Create example directories:

```bash
mkdir -p examples/screenshots/baseline
mkdir -p examples/screenshots/current
mkdir -p examples/output
```

3. Add sample images to the screenshots directories

### Run Individual Examples

```bash
# Basic comparison
npx ts-node examples/basic-comparison.ts

# With classification
npx ts-node examples/smart-classification.ts

# Batch processing
npx ts-node examples/batch-processing.ts

# Progressive refinement (interactive)
npx ts-node examples/progressive-refinement.ts

# CSS suggestions
npx ts-node examples/css-fix-suggestions.ts

# Metadata tracking
npx ts-node examples/metadata-tracking.ts
```

### Run All Examples

```bash
npm run examples:all
```

## 📁 Example File Structure

```
examples/
├── README.md                    # This file
├── basic-comparison.ts          # Basic usage
├── smart-classification.ts      # Classification demo
├── batch-processing.ts          # Batch operations
├── progressive-refinement.ts    # Refinement workflow
├── css-fix-suggestions.ts       # CSS fix generation
├── metadata-tracking.ts         # Metadata features
├── screenshots/                 # Input images
│   ├── baseline/               # Reference images
│   └── current/                # Comparison images
└── output/                     # Generated results
    ├── batch-results/          # Batch processing output
    ├── refinement/             # Refinement session data
    ├── css-fixes/              # CSS suggestions
    └── metadata-example/       # Metadata reports
```

## 💡 Tips

1. **Sample Images**: Use real screenshots from your application for best results
2. **Exclusions**: Define exclusion regions for dynamic content (timestamps, user data)
3. **Thresholds**: Adjust difference thresholds based on your tolerance
4. **Parallel Processing**: Enable for large batches to improve performance
5. **Classification**: Use classification to understand the nature of changes
6. **Refinement**: Use progressive refinement to eliminate false positives

## 🔧 Customization

Each example can be customized by modifying:

- Input/output paths
- Processing options
- Threshold values
- Classification settings
- Report formats

## 📊 Output Files

Examples generate various output files:

- **PNG diffs**: Visual difference images
- **JSON reports**: Detailed comparison data
- **HTML summaries**: Interactive reports
- **CSS files**: Suggested style fixes
- **Session data**: Refinement progress

## 🐛 Troubleshooting

If examples fail:

1. Ensure ImageMagick is installed: `convert -version`
2. Check that input images exist in the screenshots directory
3. Verify output directories are writable
4. Check console output for specific error messages

## 📚 Further Reading

- [API Documentation](../docs/API.md)
- [Main README](../README.md)
- [TypeScript Types](../src/types/)
