# Classification System

The classification system in auto-image-diff automatically categorizes visual differences to help you understand what changed between images.

## Overview

When comparing images, not all differences are equal. A color change is fundamentally different from a layout shift. The classification system identifies and categorizes these differences into meaningful types.

## Architecture

```
┌─────────────────────────────────────────────────┐
│           ClassifierManager                      │
│  Orchestrates classification pipeline            │
└─────────────────┬───────────────────────────────┘
                  │ Manages
                  ▼
┌─────────────────────────────────────────────────┐
│          DifferenceClassifier (Base)             │
│  Abstract base for all classifiers               │
└─────────────────┬───────────────────────────────┘
                  │ Extends
                  ▼
┌──────────┬──────────┬──────────┬──────────────┐
│ Content  │  Style   │  Layout  │   Size       │
│Classifier│Classifier│Classifier│ Classifier    │
└──────────┴──────────┴──────────┴──────────────┘
```

## Difference Types

### 1. Content Changes
**What**: Text, images, or other content has changed
**Examples**:
- Text updates ("Login" → "Sign In")
- Image replacements
- Icon changes
- Dynamic content updates

**Detection**:
- Analyzes color distribution patterns
- Checks for text-like structures
- Identifies image boundaries

### 2. Style Changes
**What**: Visual styling has changed without content modification
**Examples**:
- Color changes (blue button → green button)
- Font changes
- Border modifications
- Shadow/gradient updates

**Detection**:
- Compares average colors
- Analyzes color variance
- Checks shape consistency

### 3. Layout Changes
**What**: Position or structure has changed
**Examples**:
- Element moved to different position
- Margin/padding changes
- Alignment shifts
- Reordering of components

**Detection**:
- Identifies movement patterns
- Analyzes edge positions
- Checks structural boundaries

### 4. Size Changes
**What**: Dimensions have changed
**Examples**:
- Button made larger/smaller
- Image resized
- Container dimension changes
- Font size adjustments

**Detection**:
- Compares bounding boxes
- Analyzes scaling patterns
- Checks aspect ratios

### 5. Structural Changes
**What**: DOM structure or component hierarchy changed
**Examples**:
- New elements added
- Elements removed
- Nesting changes
- Component replacements

**Detection**:
- Analyzes region patterns
- Identifies new/missing areas
- Checks connectivity

## Using Classification

### CLI Usage

```bash
# Enable classification in comparison
aid compare before.png after.png output/ --classify

# The output includes classification results:
# output/report.json will contain classification data
```

### Programmatic Usage

```typescript
import { ImageProcessor } from 'auto-image-diff';

const processor = new ImageProcessor();

const result = await processor.generateDiff(
  'before.png',
  'after.png',
  'diff.png',
  {
    runClassification: true
  }
);

// Access classification results
console.log('Summary:', result.classification.summary);
console.log('Regions:', result.classification.regions);
```

### Understanding Results

```json
{
  "classification": {
    "summary": {
      "content": 2,
      "style": 5,
      "layout": 1,
      "size": 0,
      "structural": 0
    },
    "regions": [
      {
        "type": "style",
        "confidence": 0.92,
        "subType": "color",
        "bounds": {
          "x": 100,
          "y": 50,
          "width": 200,
          "height": 40
        },
        "details": {
          "colorChange": {
            "from": "#3498db",
            "to": "#2ecc71"
          }
        }
      }
    ],
    "dominantType": "style",
    "confidence": 0.87
  }
}
```

## Creating Custom Classifiers

### Basic Structure

```typescript
import { 
  DifferenceClassifier, 
  DifferenceRegion, 
  ClassificationResult,
  AnalysisContext,
  DifferenceType 
} from 'auto-image-diff';

export class CustomClassifier extends DifferenceClassifier {
  constructor() {
    super('custom', 10); // name and priority
  }

  canClassify(
    region: DifferenceRegion, 
    context: AnalysisContext
  ): boolean {
    // Quick check if this classifier applies
    return region.bounds.width > 100;
  }

  classify(
    region: DifferenceRegion,
    context: AnalysisContext
  ): ClassificationResult | null {
    // Analyze the region
    const analysis = this.analyzeRegion(region, context);
    
    if (analysis.matches) {
      return {
        type: DifferenceType.CONTENT,
        subType: 'custom-type',
        confidence: analysis.confidence,
        details: analysis.details
      };
    }
    
    return null;
  }
  
  private analyzeRegion(region, context) {
    // Custom analysis logic
    return {
      matches: true,
      confidence: 0.85,
      details: {}
    };
  }
}
```

### Registering Custom Classifier

```typescript
import { ClassifierManager } from 'auto-image-diff';
import { CustomClassifier } from './custom-classifier';

const manager = new ClassifierManager();
manager.registerClassifier(new CustomClassifier());
```

## Advanced Classification

### Confidence Scores

Each classification includes a confidence score (0-1):
- **0.9-1.0**: Very high confidence
- **0.7-0.9**: High confidence
- **0.5-0.7**: Moderate confidence
- **< 0.5**: Low confidence (usually ignored)

### Sub-Types

Classifications can include sub-types for more detail:

- **Content**:
  - `text`: Text content changed
  - `image`: Image content changed
  - `icon`: Icon or symbol changed
  
- **Style**:
  - `color`: Color changed
  - `typography`: Font properties changed
  - `effects`: Shadows, borders, etc.
  
- **Layout**:
  - `position`: Absolute position changed
  - `spacing`: Margins/padding changed
  - `alignment`: Alignment changed

### Region Analysis

The classifier analyzes regions with these properties:
- **Bounds**: x, y, width, height of the difference
- **Pixel Count**: Total pixels in region
- **Difference Percentage**: How much of the region changed
- **Context**: Surrounding image data

## Best Practices

### 1. Enable for Important Comparisons

Classification adds processing time, so use it when you need insights:

```bash
# Quick check - no classification
aid compare a.png b.png out/

# Detailed analysis - with classification
aid compare a.png b.png out/ --classify
```

### 2. Use Results for Automation

```typescript
// Automatically handle different change types
const result = await processor.generateDiff(before, after, diff, {
  runClassification: true
});

if (result.classification.summary.style > 0) {
  console.log('Style changes detected - check CSS');
}

if (result.classification.summary.content > 0) {
  console.log('Content changes detected - verify text');
}
```

### 3. Combine with CSS Suggestions

```bash
# Get CSS fixes for style changes
aid compare before.png after.png out/ --classify --css-fixes
```

### 4. Filter by Confidence

```typescript
// Only consider high-confidence classifications
const significantChanges = result.classification.regions.filter(
  region => region.confidence > 0.8
);
```

## Troubleshooting Classification

### Issue: Incorrect Classification

**Solution**: Check region size and confidence:
```typescript
// Very small regions may be misclassified
const validRegions = regions.filter(r => 
  r.bounds.width * r.bounds.height > 100
);
```

### Issue: Missing Classifications

**Solution**: Ensure classification is enabled:
```typescript
const result = await processor.generateDiff(img1, img2, out, {
  runClassification: true // Must be explicitly enabled
});
```

### Issue: Low Confidence

**Solution**: Adjust classifier thresholds or create custom classifier for specific use case.

## Performance Considerations

- Classification adds 10-30% to processing time
- Parallel processing helps with batch classification
- Results are cached per image pair
- Disable for quick checks

## Future Enhancements

Planned improvements to the classification system:
- Machine learning-based classifiers
- Animation detection
- Semantic content understanding
- Custom training for specific UIs
- Real-time classification during capture