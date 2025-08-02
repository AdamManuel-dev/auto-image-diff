# Frequently Asked Questions (FAQ)

## General Questions

### What is auto-image-diff?

auto-image-diff is a command-line tool that automatically aligns UI screenshots and generates visual difference reports. It solves the problem of false positives in visual regression testing caused by minor positioning differences.

### Why use auto-image-diff instead of pixel-by-pixel comparison?

Traditional pixel comparison fails when:

- Elements shift by 1-2 pixels
- Anti-aliasing differs slightly
- Rendering engines have minor variations
- Dynamic content causes alignment issues

auto-image-diff intelligently aligns images before comparison, eliminating these false positives.

### What image formats are supported?

Currently supported:

- PNG (recommended)
- JPEG/JPG
- GIF
- BMP
- TIFF

Coming soon:

- WebP
- AVIF
- HEIC

## Installation & Setup

### How do I install auto-image-diff?

```bash
# Global installation (recommended)
npm install -g auto-image-diff

# Local project installation
npm install --save-dev auto-image-diff
```

### What are the system requirements?

- Node.js 14.0 or higher
- ImageMagick 6.9+ or 7.0+
- 4GB RAM minimum (8GB recommended for large images)
- Windows, macOS, or Linux

### How do I verify ImageMagick is installed correctly?

```bash
# Check ImageMagick version
convert -version

# Test with auto-image-diff
aid --verify-dependencies
```

### Can I use auto-image-diff without ImageMagick?

No, ImageMagick is a core dependency. However, OpenCV support is being added as an alternative backend.

## Usage Questions

### How do I compare two images?

```bash
# Basic comparison
aid compare baseline.png current.png output/

# With options
aid compare baseline.png current.png output/ --threshold 0.5 --smart
```

### What's the difference between `compare`, `align`, and `diff` commands?

- **compare** - Full workflow: align → diff → report
- **align** - Only align images (no comparison)
- **diff** - Only generate diff (assumes pre-aligned images)

### How do I process multiple images at once?

Use batch processing:

```bash
aid batch baseline-folder/ current-folder/ output/ --parallel
```

### How do I ignore dynamic regions like timestamps?

Create an exclusions file:

```json
{
  "regions": [
    {
      "name": "timestamp",
      "bounds": { "x": 0, "y": 0, "width": 200, "height": 30 }
    }
  ]
}
```

Then use:

```bash
aid compare before.png after.png output/ -e exclusions.json
```

### What do the threshold values mean?

- **0.0** - Exact match required (pixel-perfect)
- **0.1** - Very strict (default, good for most cases)
- **0.5** - Moderate tolerance
- **1.0** - Lenient (1% difference allowed)
- **5.0** - Very lenient (5% difference allowed)

## Smart Features

### What is smart classification?

Smart classification automatically categorizes visual changes into types:

- Content (text/data changes)
- Style (colors/fonts)
- Layout (positioning)
- Size (dimensions)
- Structural (DOM changes)
- New/Removed elements

Enable with `--smart` or `--smart-diff` flags.

### How accurate is the classification?

Classification accuracy depends on:

- Image quality (higher resolution = better accuracy)
- Change complexity (simple changes = higher confidence)
- Exclusion regions (fewer dynamic areas = better results)

Typical accuracy: 85-95% for well-defined changes.

### What are CSS fix suggestions?

When style/layout changes are detected, auto-image-diff can suggest CSS fixes:

```bash
aid diff before.png after.png diff.png --suggest-css --css-selector ".my-component"
```

This generates a `diff-fixes.css` file with suggested corrections.

### How does progressive refinement work?

Progressive refinement iteratively improves comparison accuracy:

```bash
aid refine before.png after.png output/ --auto
```

It:

1. Analyzes initial differences
2. Suggests exclusion regions
3. Re-runs comparison
4. Repeats until target accuracy is reached

## Performance & Optimization

### How can I speed up batch processing?

1. **Increase concurrency**:

   ```bash
   aid batch ref/ target/ out/ -c 8  # Use 8 workers
   ```

2. **Process smaller images**:

   ```bash
   # Resize before comparison
   convert input.png -resize 50% output.png
   ```

3. **Use faster alignment**:
   ```bash
   aid compare ref.png target.png out/ --method phase
   ```

### What if I run out of memory?

For large images or batches:

```bash
# Reduce concurrency
aid batch ref/ target/ out/ -c 1

# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=8192" aid batch ref/ target/ out/
```

### How do I optimize for CI/CD environments?

```bash
# CI-optimized settings
aid batch baseline/ current/ results/ \
  --threshold 0.1 \
  --concurrency 2 \
  --no-interactive \
  --quiet \
  --format json
```

## Troubleshooting

### Why am I getting "Command not found" errors?

Ensure auto-image-diff is in your PATH:

```bash
# Check installation
npm list -g auto-image-diff

# Reinstall if needed
npm install -g auto-image-diff

# Verify
which aid
```

### Why are my images not aligning properly?

Common causes:

1. Images are too different structurally
2. Low image quality
3. Incorrect alignment method

Solutions:

```bash
# Try different alignment methods
aid align ref.png target.png out.png --method phase
aid align ref.png target.png out.png --method feature

# Increase alignment timeout
aid align ref.png target.png out.png --timeout 30000
```

### Why am I getting false positives?

1. **Sub-pixel rendering differences**:

   ```bash
   # Increase threshold slightly
   aid compare ref.png current.png out/ --threshold 0.2
   ```

2. **Dynamic content**:

   ```bash
   # Use exclusions
   aid compare ref.png current.png out/ -e exclusions.json
   ```

3. **Anti-aliasing**:
   ```bash
   # Enable anti-aliasing tolerance
   aid compare ref.png current.png out/ --aa-tolerance
   ```

### How do I debug comparison issues?

```bash
# Enable verbose output
aid compare ref.png current.png out/ --verbose

# Save intermediate files
aid compare ref.png current.png out/ --save-intermediate

# Generate detailed report
aid compare ref.png current.png out/ --debug-report
```

## Integration Questions

### How do I integrate with Jest?

```javascript
// jest.config.js
module.exports = {
  testMatch: ["**/*.visual.test.js"],
  setupFilesAfterEnv: ["<rootDir>/visual-test-setup.js"],
};

// visual-test-setup.js
const { ImageProcessor } = require("auto-image-diff");

global.compareScreenshots = async (baseline, current, threshold = 0.1) => {
  const processor = new ImageProcessor();
  const result = await processor.compareImages(baseline, current, threshold);
  expect(result.isEqual).toBe(true);
};
```

### How do I integrate with Playwright?

```typescript
import { test, expect } from "@playwright/test";
import { ImageProcessor } from "auto-image-diff";

test("visual regression", async ({ page }) => {
  await page.goto("https://example.com");
  await page.screenshot({ path: "current.png" });

  const processor = new ImageProcessor();
  const result = await processor.compareImages("baseline.png", "current.png", 0.1);

  expect(result.isEqual).toBeTruthy();
});
```

### How do I integrate with CI/CD?

See the [CI Integration Guide](./CI_INTEGRATION.md) for detailed examples for:

- GitHub Actions
- GitLab CI
- Jenkins
- CircleCI
- Azure DevOps

### Can I use auto-image-diff programmatically?

Yes! See the [Programmatic Usage Guide](./PROGRAMMATIC_USAGE.md) for API documentation.

## Advanced Questions

### How do I create custom alignment methods?

```typescript
import { AlignmentMethod } from "auto-image-diff";

class CustomAlignment implements AlignmentMethod {
  async align(reference: string, target: string): Promise<AlignmentResult> {
    // Custom alignment logic
    return {
      success: true,
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    };
  }
}
```

### Can I extend the classification system?

```typescript
import { Classifier } from "auto-image-diff";

class CustomClassifier extends Classifier {
  async classify(changes: Change[]): Promise<Classification[]> {
    // Custom classification logic
    return changes.map((change) => ({
      type: "custom",
      confidence: 0.9,
      bounds: change.bounds,
    }));
  }
}
```

### How do I generate custom reports?

```typescript
import { ReportGenerator } from "auto-image-diff";

const generator = new ReportGenerator();
const report = await generator.generate({
  results: comparisonResults,
  template: "custom-template.html",
  customSections: [
    {
      title: "Custom Analysis",
      content: myCustomAnalysis,
    },
  ],
});
```

## Best Practices

### What's the recommended threshold for CI/CD?

- **Unit/Component tests**: 0.1% (very strict)
- **Integration tests**: 0.5% (moderate)
- **E2E tests**: 1.0% (lenient)
- **Cross-browser tests**: 2.0% (more lenient)

### Should I commit baseline images?

Yes, but:

- Use Git LFS for large images
- Organize by feature/component
- Document update procedures
- Review changes carefully

### How often should I update baselines?

- After intentional UI changes
- During major releases
- When fixing visual bugs
- Not for temporary states

### What's the best image format?

**PNG** is recommended because:

- Lossless compression
- Consistent rendering
- Metadata support
- Wide compatibility

## Getting Help

### Where can I report bugs?

Report issues on GitHub:
https://github.com/AdamManuel-dev/auto-image-diff/issues

### How can I contribute?

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

### Where can I find more examples?

- [Examples directory](../../examples/)
- [Integration tests](../../tests/integration/)
- [CLI Usage Guide](./CLI_USAGE.md)

### Is there commercial support?

Currently, community support only. Enterprise support may be available in the future.

## See Also

- [Getting Started Guide](./GETTING_STARTED.md)
- [CLI Usage](./CLI_USAGE.md)
- [Troubleshooting Guide](../TROUBLESHOOTING.md)
