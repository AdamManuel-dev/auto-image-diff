# CSS Fixes Module

The CSS fixes module generates CSS code to correct visual differences detected between images, particularly for style and layout changes.

## Overview

The CSS fix generator:

- Analyzes detected style and layout changes
- Maps visual differences to CSS properties
- Generates corrective CSS rules
- Provides selector recommendations

## Core Components

### CSSFixGenerator Class

```typescript
class CSSFixGenerator {
  constructor(options?: CSSFixOptions);

  async generateFixes(
    classification: ChangeClassification,
    options?: GenerateOptions
  ): Promise<CSSFixes>;
}
```

**Options:**

```typescript
interface CSSFixOptions {
  precision?: number; // Decimal places for values (default: 2)
  units?: CSSUnits; // Preferred units (default: 'px')
  compatibility?: string[]; // Browser prefixes (default: [])
  minify?: boolean; // Minify output (default: false)
}

interface GenerateOptions {
  selector?: string; // CSS selector to use
  important?: boolean; // Add !important flags
  comments?: boolean; // Include explanatory comments
  groupBy?: "property" | "element"; // Grouping strategy
}
```

### CSSFixes Interface

```typescript
interface CSSFixes {
  rules: CSSRule[];
  summary: FixSummary;
  confidence: number;
  warnings?: string[];
}

interface CSSRule {
  selector: string;
  properties: CSSProperty[];
  comment?: string;
  specificity?: number;
  changeType: ChangeType;
}

interface CSSProperty {
  property: string;
  oldValue?: string;
  newValue: string;
  unit?: string;
  important?: boolean;
}
```

## Change Detection and Mapping

### Style Change Analysis

```typescript
class StyleChangeAnalyzer {
  analyzeStyleChanges(change: ChangeDetail): StyleAnalysis {
    const analysis: StyleAnalysis = {
      properties: [],
      confidence: 0,
    };

    // Color changes
    if (this.isColorChange(change)) {
      const colorDiff = this.analyzeColorDifference(change);
      analysis.properties.push({
        type: "color",
        property: this.determineColorProperty(change),
        oldValue: colorDiff.from,
        newValue: colorDiff.to,
        confidence: colorDiff.confidence,
      });
    }

    // Border changes
    if (this.isBorderChange(change)) {
      const borderDiff = this.analyzeBorderDifference(change);
      analysis.properties.push({
        type: "border",
        property: "border",
        oldValue: borderDiff.from,
        newValue: borderDiff.to,
        confidence: borderDiff.confidence,
      });
    }

    // Shadow changes
    if (this.isShadowChange(change)) {
      const shadowDiff = this.analyzeShadowDifference(change);
      analysis.properties.push({
        type: "shadow",
        property: "box-shadow",
        oldValue: shadowDiff.from,
        newValue: shadowDiff.to,
        confidence: shadowDiff.confidence,
      });
    }

    return analysis;
  }

  private determineColorProperty(change: ChangeDetail): string {
    // Analyze region to determine if it's background or text
    const region = change.bounds;
    const analysis = this.analyzeRegionContent(region);

    if (analysis.isText) {
      return "color";
    } else if (analysis.isBackground) {
      return "background-color";
    } else if (analysis.isBorder) {
      return "border-color";
    }

    return "background-color"; // Default
  }
}
```

### Layout Change Analysis

```typescript
class LayoutChangeAnalyzer {
  analyzeLayoutChanges(change: ChangeDetail): LayoutAnalysis {
    const analysis: LayoutAnalysis = {
      properties: [],
      transforms: [],
      confidence: 0,
    };

    // Position changes
    if (this.isPositionChange(change)) {
      const posDiff = this.analyzePositionDifference(change);

      if (posDiff.x !== 0) {
        analysis.properties.push({
          property: "margin-left",
          adjustment: posDiff.x,
          unit: "px",
          confidence: posDiff.confidence,
        });
      }

      if (posDiff.y !== 0) {
        analysis.properties.push({
          property: "margin-top",
          adjustment: posDiff.y,
          unit: "px",
          confidence: posDiff.confidence,
        });
      }
    }

    // Size changes
    if (this.isSizeChange(change)) {
      const sizeDiff = this.analyzeSizeDifference(change);

      if (sizeDiff.width !== 0) {
        analysis.properties.push({
          property: "width",
          oldValue: sizeDiff.oldWidth,
          newValue: sizeDiff.newWidth,
          unit: "px",
          confidence: sizeDiff.confidence,
        });
      }

      if (sizeDiff.height !== 0) {
        analysis.properties.push({
          property: "height",
          oldValue: sizeDiff.oldHeight,
          newValue: sizeDiff.newHeight,
          unit: "px",
          confidence: sizeDiff.confidence,
        });
      }
    }

    // Spacing changes
    if (this.isSpacingChange(change)) {
      const spacingDiff = this.analyzeSpacingDifference(change);
      analysis.properties.push(...spacingDiff.properties);
    }

    return analysis;
  }
}
```

## CSS Generation

### Rule Generation

```typescript
class CSSRuleGenerator {
  generateRule(selector: string, properties: CSSProperty[], options: GenerateOptions): string {
    const rules: string[] = [];

    // Group properties by type
    const grouped = this.groupProperties(properties, options.groupBy);

    for (const [key, props] of grouped) {
      const rule = this.formatRule(selector, props, options);
      rules.push(rule);
    }

    return rules.join("\n\n");
  }

  private formatRule(
    selector: string,
    properties: CSSProperty[],
    options: GenerateOptions
  ): string {
    const lines: string[] = [];

    // Add comment if requested
    if (options.comments) {
      lines.push(`/* ${this.generateComment(properties)} */`);
    }

    // Rule opening
    lines.push(`${selector} {`);

    // Properties
    for (const prop of properties) {
      const value = this.formatValue(prop);
      const important = options.important || prop.important ? " !important" : "";
      lines.push(`  ${prop.property}: ${value}${important};`);
    }

    // Rule closing
    lines.push("}");

    return lines.join("\n");
  }

  private formatValue(prop: CSSProperty): string {
    if (prop.unit && typeof prop.newValue === "number") {
      return `${prop.newValue}${prop.unit}`;
    }
    return prop.newValue.toString();
  }
}
```

### Advanced CSS Generation

```typescript
class AdvancedCSSGenerator extends CSSRuleGenerator {
  generateResponsiveFixes(
    changes: ChangeClassification,
    breakpoints: Breakpoint[]
  ): ResponsiveCSSFixes {
    const fixes: ResponsiveCSSFixes = {
      base: [],
      responsive: {},
    };

    // Analyze changes at different breakpoints
    for (const breakpoint of breakpoints) {
      const relevantChanges = this.filterChangesForBreakpoint(changes, breakpoint);

      if (relevantChanges.length > 0) {
        fixes.responsive[breakpoint.name] = {
          mediaQuery: breakpoint.query,
          rules: this.generateFixesForChanges(relevantChanges),
        };
      }
    }

    return fixes;
  }

  generateAnimationFixes(changes: ChangeClassification): AnimationCSSFixes {
    const transitions: string[] = [];
    const keyframes: Keyframe[] = [];

    // Detect properties that should transition
    for (const change of changes.changes) {
      if (this.shouldTransition(change)) {
        const property = this.mapToCSS(change);
        transitions.push(`${property} 0.3s ease-in-out`);
      }

      if (this.needsKeyframes(change)) {
        keyframes.push(this.generateKeyframes(change));
      }
    }

    return {
      transitions,
      keyframes,
      css: this.formatAnimations(transitions, keyframes),
    };
  }
}
```

## Property Mapping

### Color Properties

```typescript
const COLOR_MAPPINGS = {
  text: "color",
  background: "background-color",
  border: "border-color",
  outline: "outline-color",
  textDecoration: "text-decoration-color",
  columnRule: "column-rule-color",
};

class ColorMapper {
  mapColorChange(analysis: ColorAnalysis): CSSProperty[] {
    const properties: CSSProperty[] = [];

    // Map to appropriate CSS property
    const property = COLOR_MAPPINGS[analysis.type] || "color";

    properties.push({
      property,
      oldValue: this.formatColor(analysis.oldColor),
      newValue: this.formatColor(analysis.newColor),
    });

    // Add opacity if needed
    if (analysis.opacityChange) {
      properties.push({
        property: "opacity",
        oldValue: analysis.oldOpacity.toString(),
        newValue: analysis.newOpacity.toString(),
      });
    }

    return properties;
  }

  private formatColor(color: Color): string {
    if (color.alpha < 1) {
      return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.alpha})`;
    }
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }
}
```

### Layout Properties

```typescript
const LAYOUT_MAPPINGS = {
  position: ["top", "right", "bottom", "left", "margin", "padding"],
  size: ["width", "height", "min-width", "min-height", "max-width", "max-height"],
  spacing: ["margin", "padding", "gap", "column-gap", "row-gap"],
  flex: ["flex-grow", "flex-shrink", "flex-basis", "order"],
  grid: ["grid-column", "grid-row", "grid-area"],
};

class LayoutMapper {
  mapLayoutChange(analysis: LayoutAnalysis): CSSProperty[] {
    const properties: CSSProperty[] = [];

    // Position adjustments
    if (analysis.position) {
      properties.push(...this.mapPositionChange(analysis.position));
    }

    // Size adjustments
    if (analysis.size) {
      properties.push(...this.mapSizeChange(analysis.size));
    }

    // Spacing adjustments
    if (analysis.spacing) {
      properties.push(...this.mapSpacingChange(analysis.spacing));
    }

    return properties;
  }

  private mapPositionChange(position: PositionChange): CSSProperty[] {
    const properties: CSSProperty[] = [];

    // Determine best approach (margin vs position)
    if (position.isAbsolute) {
      properties.push(
        { property: "position", newValue: "absolute" },
        { property: "left", newValue: position.x, unit: "px" },
        { property: "top", newValue: position.y, unit: "px" }
      );
    } else {
      // Use margins for relative positioning
      if (position.deltaX !== 0) {
        properties.push({
          property: "margin-left",
          newValue: position.deltaX,
          unit: "px",
        });
      }
      if (position.deltaY !== 0) {
        properties.push({
          property: "margin-top",
          newValue: position.deltaY,
          unit: "px",
        });
      }
    }

    return properties;
  }
}
```

## Usage Examples

### Basic Usage

```typescript
const generator = new CSSFixGenerator();

// Generate fixes from classification
const classification = await smartDiff.classifyChanges(before, after);
const fixes = await generator.generateFixes(classification, {
  selector: ".my-component",
  comments: true,
});

// Output CSS
console.log(fixes.rules.map((r) => r.css).join("\n"));
```

### Advanced Usage

```typescript
// Generate responsive fixes
const responsiveGenerator = new AdvancedCSSGenerator({
  units: "rem",
  precision: 3,
});

const breakpoints = [
  { name: "mobile", query: "@media (max-width: 768px)" },
  { name: "tablet", query: "@media (max-width: 1024px)" },
  { name: "desktop", query: "@media (min-width: 1025px)" },
];

const responsiveFixes = responsiveGenerator.generateResponsiveFixes(classification, breakpoints);

// Output responsive CSS
for (const [breakpoint, fixes] of Object.entries(responsiveFixes.responsive)) {
  console.log(`${fixes.mediaQuery} {`);
  console.log(fixes.rules.map((r) => "  " + r).join("\n"));
  console.log("}");
}
```

### Integration Example

```typescript
// Complete workflow
class VisualRegressionFixer {
  private imageProcessor = new ImageProcessor();
  private smartDiff = new SmartDiff();
  private cssGenerator = new CSSFixGenerator();

  async fixVisualRegression(
    baseline: string,
    current: string,
    selector: string
  ): Promise<FixResult> {
    // Step 1: Compare images
    const comparison = await this.imageProcessor.compareImages(baseline, current, 0.1);

    if (comparison.isEqual) {
      return { needed: false };
    }

    // Step 2: Classify changes
    const classification = await this.smartDiff.classifyChanges(baseline, current);

    // Step 3: Generate CSS fixes
    const fixes = await this.cssGenerator.generateFixes(classification, {
      selector,
      important: true,
      comments: true,
    });

    // Step 4: Save CSS file
    const css = this.formatCSS(fixes);
    await fs.writeFile("visual-fixes.css", css);

    return {
      needed: true,
      css,
      confidence: fixes.confidence,
      changes: classification.changes.length,
    };
  }
}
```

## Output Examples

### Style Fix Output

```css
/* Style changes detected with 92% confidence */
.header {
  background-color: rgb(240, 240, 240) !important; /* was: rgb(255, 255, 255) */
  border-color: rgb(204, 204, 204) !important; /* was: rgb(221, 221, 221) */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important; /* was: none */
}

/* Text color changes */
.header h1 {
  color: rgb(51, 51, 51) !important; /* was: rgb(0, 0, 0) */
}
```

### Layout Fix Output

```css
/* Layout adjustments detected with 88% confidence */
.sidebar {
  width: 250px !important; /* was: 200px */
  margin-left: 20px !important; /* position shift detected */
}

/* Spacing adjustments */
.content {
  padding: 20px !important; /* was: 15px */
  margin-top: 30px !important; /* was: 20px */
}

/* Flexbox adjustments */
.container {
  gap: 20px !important; /* was: 15px */
  align-items: center !important; /* alignment change detected */
}
```

### Responsive Fix Output

```css
/* Base styles */
.component {
  font-size: 16px;
  padding: 15px;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .component {
    font-size: 14px !important;
    padding: 10px !important;
  }
}

/* Tablet adjustments */
@media (max-width: 1024px) {
  .component {
    width: 100% !important;
    margin: 0 !important;
  }
}
```

## Best Practices

1. **Use specific selectors**

   ```typescript
   {
     selector: "#header .nav-item";
   } // Good
   {
     selector: "div";
   } // Too broad
   ```

2. **Review generated CSS**
   - Check specificity conflicts
   - Validate color values
   - Test responsive breakpoints

3. **Consider CSS architecture**

   ```css
   /* Use CSS custom properties for theming */
   :root {
     --primary-color: rgb(0, 123, 255);
   }
   ```

4. **Handle browser compatibility**

   ```typescript
   new CSSFixGenerator({
     compatibility: ["webkit", "moz"],
   });
   ```

5. **Minimize !important usage**
   - Use only when necessary
   - Increase selector specificity instead

## Limitations

1. **Cannot detect all CSS properties**
   - Pseudo-elements
   - Animations
   - Complex gradients
   - Custom properties

2. **Selector accuracy**
   - Requires manual selector input
   - Cannot determine exact DOM structure

3. **Dynamic content**
   - JavaScript-driven styles
   - Runtime calculations
   - Media queries

## Troubleshooting

### No CSS Generated

```typescript
// Check if changes are style-related
const styleChanges = classification.changes.filter(
  (c) => c.type === "style" || c.type === "layout"
);

if (styleChanges.length === 0) {
  console.log("No style or layout changes detected");
}
```

### Incorrect Properties

```typescript
// Enable debug mode
const generator = new CSSFixGenerator({
  debug: true,
  onPropertyMap: (change, property) => {
    console.log(`Mapping ${change.type} to ${property}`);
  },
});
```

### Low Confidence

```typescript
// Filter by confidence
const highConfidenceFixes = fixes.rules.filter((rule) => rule.confidence > 0.8);
```

## See Also

- [Smart Classification](./classifiers.md) - Change detection
- [CLI Usage](../guides/CLI_USAGE.md) - CSS generation commands
- [Examples](../../examples/) - CSS fix examples
