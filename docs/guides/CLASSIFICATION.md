# Classification Guide

This guide explains the smart classification system in auto-image-diff that automatically categorizes visual changes.

## Overview

The classification system analyzes visual differences and categorizes them into meaningful types:

- **Content** - Text, images, or data changes
- **Style** - Colors, fonts, borders, shadows
- **Layout** - Position, spacing, margins
- **Size** - Dimension changes, scaling
- **Structural** - DOM structure modifications
- **New Element** - Added UI components
- **Removed Element** - Deleted UI components

## How It Works

### Detection Process

1. **Region Analysis** - Identifies distinct change regions
2. **Pattern Matching** - Analyzes change characteristics
3. **Confidence Scoring** - Assigns confidence levels
4. **Classification** - Categorizes based on heuristics

### Confidence Scores

Each classification includes a confidence score (0-1):

- **0.9-1.0** - Very high confidence
- **0.7-0.9** - High confidence
- **0.5-0.7** - Moderate confidence
- **0.0-0.5** - Low confidence

## Change Types

### Content Changes

Detected when:

- Text content differs
- Images are replaced
- Data values change

```json
{
  "type": "content",
  "confidence": 0.95,
  "bounds": { "x": 100, "y": 50, "width": 200, "height": 30 },
  "details": {
    "changeType": "text",
    "severity": "moderate"
  }
}
```

### Style Changes

Detected when:

- Colors change (background, text, borders)
- Font properties change
- Visual effects change (shadows, gradients)

```json
{
  "type": "style",
  "confidence": 0.88,
  "bounds": { "x": 0, "y": 0, "width": 500, "height": 100 },
  "details": {
    "properties": ["background-color", "border"],
    "severity": "minor"
  }
}
```

### Layout Changes

Detected when:

- Element positions shift
- Spacing/margins change
- Alignment differs

```json
{
  "type": "layout",
  "confidence": 0.82,
  "bounds": { "x": 50, "y": 100, "width": 300, "height": 200 },
  "details": {
    "shift": { "x": 10, "y": -5 },
    "severity": "moderate"
  }
}
```

### Size Changes

Detected when:

- Element dimensions change
- Scaling occurs
- Aspect ratios differ

```json
{
  "type": "size",
  "confidence": 0.91,
  "bounds": { "x": 100, "y": 100, "width": 150, "height": 150 },
  "details": {
    "oldSize": { "width": 100, "height": 100 },
    "newSize": { "width": 150, "height": 150 },
    "severity": "major"
  }
}
```

### Structural Changes

Detected when:

- DOM hierarchy changes
- Element nesting differs
- Component structure modifies

```json
{
  "type": "structural",
  "confidence": 0.76,
  "bounds": { "x": 0, "y": 200, "width": 800, "height": 400 },
  "details": {
    "changeType": "hierarchy",
    "severity": "major"
  }
}
```

### New/Removed Elements

Detected when:

- UI components are added
- Elements are removed
- Sections appear/disappear

```json
{
  "type": "new_element",
  "confidence": 0.94,
  "bounds": { "x": 500, "y": 100, "width": 200, "height": 80 },
  "details": {
    "elementType": "button",
    "severity": "major"
  }
}
```

## Usage

### CLI Usage

```bash
# Enable smart classification
aid diff before.png after.png diff.png --smart

# Generate detailed classification report
aid diff before.png after.png diff.png --smart-diff

# Focus on specific change types
aid diff before.png after.png diff.png -f content,style
```

### Programmatic Usage

```typescript
import { SmartDiff } from "auto-image-diff";

const smartDiff = new SmartDiff();
const classification = await smartDiff.classifyChanges("before.png", "after.png");

// Process classifications
classification.changes.forEach((change) => {
  if (change.confidence > 0.8) {
    console.log(`${change.type}: ${change.confidence}`);
    console.log(`Region: ${JSON.stringify(change.bounds)}`);
  }
});

// Filter by type
const styleChanges = classification.changes.filter((c) => c.type === "style" && c.confidence > 0.7);
```

## Classification Report

### HTML Report

The HTML report includes:

- Interactive visualizations
- Change type breakdown
- Confidence heat maps
- Region highlighting

### JSON Report

```json
{
  "summary": {
    "totalChanges": 15,
    "byType": {
      "content": 3,
      "style": 5,
      "layout": 4,
      "size": 2,
      "new_element": 1
    },
    "averageConfidence": 0.84
  },
  "changes": [
    {
      "id": "change_001",
      "type": "style",
      "confidence": 0.92,
      "bounds": { "x": 0, "y": 0, "width": 800, "height": 100 },
      "severity": "minor",
      "details": {
        "properties": ["background-color"],
        "description": "Header background color changed"
      }
    }
  ],
  "metadata": {
    "timestamp": "2025-01-15T10:00:00Z",
    "processingTime": 523,
    "version": "1.0.0"
  }
}
```

## Advanced Features

### CSS Fix Suggestions

When style or layout changes are detected:

```bash
aid diff before.png after.png diff.png \
  --smart-diff \
  --suggest-css \
  --css-selector ".my-component"
```

Output CSS fixes:

```css
/* Generated CSS fixes for style changes */
.my-component {
  background-color: #f0f0f0; /* was: #ffffff */
  padding: 20px; /* was: 10px */
  margin-top: 15px; /* was: 10px */
}
```

### Focus Types

Focus on specific change types:

```bash
# Only content and style changes
aid diff before.png after.png diff.png -f content,style

# Exclude structural changes
aid diff before.png after.png diff.png --exclude-types structural,size
```

### Confidence Thresholds

```typescript
// Only high-confidence classifications
const highConfidence = classification.changes.filter((c) => c.confidence > 0.8);

// Group by confidence level
const grouped = {
  high: changes.filter((c) => c.confidence > 0.8),
  medium: changes.filter((c) => c.confidence > 0.5 && c.confidence <= 0.8),
  low: changes.filter((c) => c.confidence <= 0.5),
};
```

## Best Practices

### 1. Understand Confidence Levels

- **High confidence (>0.8)** - Reliable for automation
- **Medium confidence (0.5-0.8)** - Review recommended
- **Low confidence (<0.5)** - Manual verification needed

### 2. Use Appropriate Thresholds

```javascript
// Strict mode - only very confident classifications
const strict = changes.filter((c) => c.confidence > 0.9);

// Lenient mode - include moderate confidence
const lenient = changes.filter((c) => c.confidence > 0.6);
```

### 3. Combine with Exclusions

```json
// Exclude regions prone to false positives
{
  "regions": [
    {
      "name": "dynamic-content",
      "bounds": { "x": 0, "y": 100, "width": 800, "height": 200 },
      "reason": "Contains dynamic data"
    }
  ]
}
```

### 4. Review Classifications

```typescript
// Generate review summary
function reviewClassifications(classifications) {
  const review = {
    critical: [],
    review: [],
    minor: [],
  };

  classifications.forEach((c) => {
    if (["structural", "removed_element"].includes(c.type)) {
      review.critical.push(c);
    } else if (c.confidence < 0.7) {
      review.review.push(c);
    } else {
      review.minor.push(c);
    }
  });

  return review;
}
```

## Troubleshooting

### False Positives

**Problem**: Too many incorrect classifications

**Solutions**:

1. Increase confidence threshold
2. Use exclusion regions
3. Focus on specific change types

```bash
# Higher confidence threshold
aid diff before.png after.png diff.png \
  --smart \
  --min-confidence 0.8

# Exclude problematic regions
aid diff before.png after.png diff.png \
  --smart \
  -e exclusions.json
```

### Missing Classifications

**Problem**: Expected changes not detected

**Solutions**:

1. Lower confidence threshold
2. Check image quality
3. Verify alignment

```bash
# Lower threshold for detection
aid diff before.png after.png diff.png \
  --smart \
  --min-confidence 0.4 \
  --verbose
```

### Performance Issues

**Problem**: Classification takes too long

**Solutions**:

1. Reduce image size
2. Limit classification regions
3. Use sampling

```typescript
// Sample-based classification for large images
const sampled = await smartDiff.classifyChanges(
  "before.png",
  "after.png",
  { sampling: 0.5 } // Analyze 50% of pixels
);
```

## See Also

- [Smart Diff Module](../modules/classifiers.md) - Technical details
- [CSS Fixes](../modules/css-fixes.md) - Fix generation
- [Reports Guide](./REPORTS.md) - Understanding reports
