# Exclusions Guide

This guide explains how to use exclusion regions to ignore dynamic or irrelevant areas during image comparison.

## Overview

Exclusion regions allow you to:

- Ignore timestamps and dynamic content
- Skip advertisements or third-party widgets
- Focus on relevant UI changes
- Reduce false positives in tests

## Configuration

### Basic Structure

Create an `exclusions.json` file:

```json
{
  "regions": [
    {
      "name": "header-timestamp",
      "bounds": {
        "x": 10,
        "y": 10,
        "width": 200,
        "height": 30
      },
      "reason": "Dynamic timestamp changes every second"
    },
    {
      "name": "ad-banner",
      "bounds": {
        "x": 0,
        "y": 100,
        "width": 728,
        "height": 90
      },
      "reason": "Third-party advertisement content"
    }
  ]
}
```

### Region Properties

Each exclusion region requires:

- `name` - Unique identifier for the region
- `bounds` - Rectangle defining the area
  - `x` - Left position (pixels)
  - `y` - Top position (pixels)
  - `width` - Region width (pixels)
  - `height` - Region height (pixels)
- `reason` - Optional explanation for exclusion

## Usage

### CLI Usage

```bash
# Single comparison with exclusions
aid compare before.png after.png results/ -e exclusions.json

# Batch processing with exclusions
aid batch baseline/ current/ output/ -e exclusions.json

# Diff with exclusions
aid diff image1.png image2.png diff.png -e exclusions.json
```

### Programmatic Usage

```typescript
import { ImageProcessor, Region } from "auto-image-diff";

const processor = new ImageProcessor();

const exclusions: Region[] = [
  {
    x: 0,
    y: 0,
    width: 200,
    height: 50,
    name: "header",
    reason: "Contains timestamp",
  },
];

const result = await processor.generateDiff("before.png", "after.png", "diff.png", {
  excludeRegions: exclusions,
});
```

## Common Patterns

### Dynamic Timestamps

```json
{
  "regions": [
    {
      "name": "header-time",
      "bounds": { "x": 1720, "y": 10, "width": 180, "height": 30 },
      "reason": "Current time display"
    },
    {
      "name": "last-updated",
      "bounds": { "x": 10, "y": 1050, "width": 300, "height": 20 },
      "reason": "Last updated timestamp"
    }
  ]
}
```

### Loading Indicators

```json
{
  "regions": [
    {
      "name": "spinner",
      "bounds": { "x": 940, "y": 500, "width": 40, "height": 40 },
      "reason": "Loading spinner animation"
    },
    {
      "name": "progress-bar",
      "bounds": { "x": 0, "y": 0, "width": 1920, "height": 4 },
      "reason": "Page load progress bar"
    }
  ]
}
```

### Third-Party Content

```json
{
  "regions": [
    {
      "name": "google-ads",
      "bounds": { "x": 0, "y": 100, "width": 728, "height": 90 },
      "reason": "Google AdSense banner"
    },
    {
      "name": "social-feed",
      "bounds": { "x": 1500, "y": 200, "width": 400, "height": 600 },
      "reason": "Twitter/Facebook feed widget"
    },
    {
      "name": "chat-widget",
      "bounds": { "x": 1820, "y": 920, "width": 100, "height": 160 },
      "reason": "Customer support chat"
    }
  ]
}
```

## Advanced Features

### Multiple Exclusion Files

Combine exclusions for different environments:

```bash
# Merge multiple exclusion files
aid compare before.png after.png results/ \
  -e base-exclusions.json \
  -e environment-exclusions.json \
  -e test-exclusions.json
```

### Dynamic Exclusions

Generate exclusions programmatically:

```typescript
function generateExclusions(viewport: { width: number; height: number }): Region[] {
  const exclusions: Region[] = [];

  // Header (responsive)
  exclusions.push({
    x: 0,
    y: 0,
    width: viewport.width,
    height: 60,
    name: "header",
    reason: "Contains dynamic user info",
  });

  // Footer (responsive)
  exclusions.push({
    x: 0,
    y: viewport.height - 100,
    width: viewport.width,
    height: 100,
    name: "footer",
    reason: "Contains dynamic links",
  });

  return exclusions;
}
```

### Conditional Exclusions

Apply exclusions based on conditions:

```typescript
interface ConditionalExclusion extends Region {
  condition?: {
    minWidth?: number;
    maxWidth?: number;
    environment?: string;
  };
}

function applyConditionalExclusions(
  exclusions: ConditionalExclusion[],
  context: { width: number; env: string }
): Region[] {
  return exclusions.filter((exclusion) => {
    if (!exclusion.condition) return true;

    const { condition } = exclusion;

    if (condition.minWidth && context.width < condition.minWidth) {
      return false;
    }

    if (condition.maxWidth && context.width > condition.maxWidth) {
      return false;
    }

    if (condition.environment && context.env !== condition.environment) {
      return false;
    }

    return true;
  });
}
```

## Progressive Refinement

Use the refinement feature to automatically suggest exclusions:

```bash
# Interactive refinement
aid refine before.png after.png refinement/

# Auto-apply suggestions
aid refine before.png after.png refinement/ \
  --auto \
  --exclude-types content \
  --confidence 0.8
```

This generates suggested exclusions based on detected changes.

## Validation

### Validate Exclusion Bounds

```typescript
function validateExclusions(
  exclusions: Region[],
  imageSize: { width: number; height: number }
): string[] {
  const errors: string[] = [];

  exclusions.forEach((region, index) => {
    // Check bounds
    if (region.x < 0 || region.y < 0) {
      errors.push(`Region ${index}: negative coordinates`);
    }

    if (region.x + region.width > imageSize.width) {
      errors.push(`Region ${index}: exceeds image width`);
    }

    if (region.y + region.height > imageSize.height) {
      errors.push(`Region ${index}: exceeds image height`);
    }

    // Check for overlaps
    for (let j = index + 1; j < exclusions.length; j++) {
      if (regionsOverlap(region, exclusions[j])) {
        errors.push(`Regions ${index} and ${j} overlap`);
      }
    }
  });

  return errors;
}
```

### Visualize Exclusions

Generate a preview showing exclusion regions:

```bash
# Generate exclusion preview
aid preview-exclusions image.png exclusions.json preview.png
```

## Best Practices

### 1. Document Reasons

Always include clear reasons for exclusions:

```json
{
  "regions": [
    {
      "name": "timestamp",
      "bounds": { "x": 0, "y": 0, "width": 200, "height": 30 },
      "reason": "Server time - changes every request"
    }
  ]
}
```

### 2. Use Meaningful Names

Choose descriptive names for regions:

```json
{
  "regions": [
    {
      "name": "header-user-avatar", // Good
      "name": "region1" // Bad
    }
  ]
}
```

### 3. Keep Exclusions Minimal

Only exclude what's necessary:

- Start with no exclusions
- Add them as needed
- Review periodically
- Remove obsolete exclusions

### 4. Version Control

Track exclusion files in version control:

```bash
git add exclusions.json
git commit -m "Add exclusions for dynamic timestamps"
```

### 5. Environment-Specific Files

Use different exclusion files per environment:

```
exclusions/
├── base.json          # Common exclusions
├── development.json   # Dev-specific
├── staging.json       # Staging-specific
└── production.json    # Prod-specific
```

## Examples

### E-commerce Site

```json
{
  "regions": [
    {
      "name": "cart-count",
      "bounds": { "x": 1850, "y": 20, "width": 50, "height": 30 },
      "reason": "Shopping cart item count"
    },
    {
      "name": "recommendations",
      "bounds": { "x": 0, "y": 800, "width": 1920, "height": 300 },
      "reason": "Personalized product recommendations"
    },
    {
      "name": "flash-sale-timer",
      "bounds": { "x": 760, "y": 100, "width": 400, "height": 60 },
      "reason": "Countdown timer for sales"
    }
  ]
}
```

### News Website

```json
{
  "regions": [
    {
      "name": "breaking-news-ticker",
      "bounds": { "x": 0, "y": 60, "width": 1920, "height": 40 },
      "reason": "Live news ticker"
    },
    {
      "name": "weather-widget",
      "bounds": { "x": 1700, "y": 100, "width": 200, "height": 150 },
      "reason": "Current weather display"
    },
    {
      "name": "stock-ticker",
      "bounds": { "x": 0, "y": 1000, "width": 1920, "height": 50 },
      "reason": "Live stock prices"
    }
  ]
}
```

### Dashboard Application

```json
{
  "regions": [
    {
      "name": "realtime-metrics",
      "bounds": { "x": 20, "y": 100, "width": 300, "height": 200 },
      "reason": "Live performance metrics"
    },
    {
      "name": "activity-feed",
      "bounds": { "x": 1600, "y": 100, "width": 300, "height": 800 },
      "reason": "Recent activity log"
    },
    {
      "name": "system-status",
      "bounds": { "x": 20, "y": 20, "width": 200, "height": 40 },
      "reason": "Current system health indicator"
    }
  ]
}
```

## Troubleshooting

### Exclusions Not Working

1. **Verify JSON syntax**

   ```bash
   jq . exclusions.json  # Should parse without errors
   ```

2. **Check bounds accuracy**
   - Use image editor to verify coordinates
   - Ensure regions fully cover dynamic areas

3. **Enable verbose output**
   ```bash
   aid compare before.png after.png results/ \
     -e exclusions.json \
     --verbose
   ```

### Performance Impact

Large numbers of exclusions can impact performance:

```typescript
// Optimize exclusion checking
function optimizeExclusions(regions: Region[]): Region[] {
  // Merge adjacent regions
  const merged = mergeAdjacentRegions(regions);

  // Sort by area (check larger regions first)
  return merged.sort((a, b) => b.width * b.height - a.width * a.height);
}
```

## See Also

- [Progressive Refinement](../modules/progressive-refinement.md) - Auto-generate exclusions
- [CLI Usage](./CLI_USAGE.md) - Command line options
- [Best Practices](./FAQ.md) - Common questions
