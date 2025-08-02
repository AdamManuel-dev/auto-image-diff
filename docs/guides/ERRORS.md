# Error Handling Guide

This guide covers common errors in auto-image-diff and how to resolve them.

## Error Types

### System Errors

#### ImageMagick Not Found

**Error:**

```
Error: ImageMagick is not installed or not in PATH
```

**Causes:**

- ImageMagick not installed
- ImageMagick not in system PATH
- Wrong ImageMagick version

**Solutions:**

```bash
# Install ImageMagick
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt-get install imagemagick

# Windows (with Chocolatey)
choco install imagemagick

# Verify installation
convert -version
```

#### Node.js Version Error

**Error:**

```
Error: Node.js version 14.0 or higher required
```

**Solution:**

```bash
# Check current version
node --version

# Update Node.js
nvm install 18
nvm use 18
```

### File Errors

#### Image Not Found

**Error:**

```
Error: Image not found: /path/to/image.png
```

**Causes:**

- Incorrect file path
- File doesn't exist
- Permission issues

**Solutions:**

```bash
# Check file exists
ls -la /path/to/image.png

# Check permissions
chmod 644 /path/to/image.png

# Use absolute paths
aid compare $(pwd)/image1.png $(pwd)/image2.png output/
```

#### Invalid Image Format

**Error:**

```
Error: Unsupported image format: file.xyz
```

**Causes:**

- Unsupported file format
- Corrupted image file
- Incorrect file extension

**Solutions:**

```bash
# Check file type
file image.xyz

# Convert to supported format
convert image.xyz image.png

# Verify image integrity
identify -verbose image.png
```

### Processing Errors

#### Alignment Failed

**Error:**

```
Error: Failed to align images: No matching regions found
```

**Causes:**

- Images too different
- Poor image quality
- Wrong alignment method

**Solutions:**

```javascript
// Try different alignment methods
const methods = ["subimage", "phase", "feature"];
for (const method of methods) {
  try {
    await processor.alignImages(ref, target, output, { method });
    break;
  } catch (error) {
    console.log(`${method} failed, trying next...`);
  }
}
```

#### Memory Exceeded

**Error:**

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Causes:**

- Large images
- Too many concurrent processes
- Memory leaks

**Solutions:**

```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=8192" aid batch ref/ target/ out/

# Reduce concurrency
aid batch ref/ target/ out/ -c 1

# Process in smaller batches
find images -name "*.png" | split -l 10 - batch_
for batch in batch_*; do
  aid batch --files-from "$batch"
done
```

### Comparison Errors

#### Threshold Exceeded

**Error:**

```
Error: Difference threshold exceeded: 5.23% > 0.5%
```

**Causes:**

- Actual visual differences
- Incorrect threshold
- Missing exclusions

**Solutions:**

```bash
# Adjust threshold
aid compare ref.png target.png out/ --threshold 1.0

# Add exclusions
aid compare ref.png target.png out/ -e exclusions.json

# Review differences
aid compare ref.png target.png out/ --save-intermediate
```

#### Invalid Exclusions

**Error:**

```
Error: Invalid exclusion region: bounds exceed image dimensions
```

**Causes:**

- Incorrect coordinates
- Image size mismatch
- Typo in JSON

**Solutions:**

```javascript
// Validate exclusions
function validateExclusions(exclusions, imageSize) {
  return exclusions.filter((region) => {
    return (
      region.x >= 0 &&
      region.y >= 0 &&
      region.x + region.width <= imageSize.width &&
      region.y + region.height <= imageSize.height
    );
  });
}
```

### Batch Processing Errors

#### Pairing Failed

**Error:**

```
Error: Could not pair files: No matching pattern found
```

**Causes:**

- Different file structures
- Naming mismatches
- Missing files

**Solutions:**

```bash
# Use smart pairing
aid batch ref/ target/ out/ --smart-pairing

# Specify pattern
aid batch ref/ target/ out/ --pattern "screenshot-*.png"

# Create pairing manifest
echo '[["ref/a.png", "target/b.png"]]' > pairs.json
aid batch --pairing-manifest pairs.json
```

#### Partial Batch Failure

**Error:**

```
Warning: 5 of 20 comparisons failed
```

**Solutions:**

```bash
# Continue on error
aid batch ref/ target/ out/ --continue-on-error

# Retry failed only
aid batch ref/ target/ out/ --retry-failed

# Generate failure report
aid batch ref/ target/ out/ --failure-report failures.json
```

## Error Codes

| Code | Type       | Description            |
| ---- | ---------- | ---------------------- |
| 1    | General    | Unspecified error      |
| 2    | Args       | Invalid arguments      |
| 3    | File       | File not found         |
| 4    | Dependency | Missing dependency     |
| 5    | Processing | Processing failed      |
| 10   | Alignment  | Alignment failed       |
| 11   | Comparison | Comparison failed      |
| 12   | Threshold  | Threshold exceeded     |
| 20   | Memory     | Out of memory          |
| 21   | Timeout    | Operation timed out    |
| 30   | Batch      | Batch processing error |
| 31   | Pairing    | File pairing failed    |

## Error Handling in Code

### Basic Error Handling

```typescript
import { ImageProcessor, ProcessingError } from "auto-image-diff";

async function safeCompare(img1: string, img2: string) {
  const processor = new ImageProcessor();

  try {
    return await processor.compareImages(img1, img2, 0.1);
  } catch (error) {
    if (error instanceof ProcessingError) {
      console.error(`Processing failed: ${error.message}`);
      console.error(`Details: ${JSON.stringify(error.details)}`);
    } else {
      throw error; // Re-throw unknown errors
    }
  }
}
```

### Advanced Error Handling

```typescript
class ErrorHandler {
  private retryCount = 3;
  private retryDelay = 1000;

  async withRetry<T>(
    operation: () => Promise<T>,
    errorType?: new (...args: any[]) => Error
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < this.retryCount; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (errorType && !(error instanceof errorType)) {
          throw error; // Don't retry unexpected errors
        }

        if (i < this.retryCount - 1) {
          await this.delay(this.retryDelay * (i + 1));
        }
      }
    }

    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### Custom Error Classes

```typescript
export class AlignmentError extends Error {
  constructor(
    message: string,
    public readonly method: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = "AlignmentError";
  }
}

export class ThresholdExceededError extends Error {
  constructor(
    public readonly actual: number,
    public readonly threshold: number
  ) {
    super(`Threshold exceeded: ${actual}% > ${threshold}%`);
    this.name = "ThresholdExceededError";
  }
}
```

## Debugging

### Enable Debug Mode

```bash
# Verbose output
aid compare ref.png target.png out/ --verbose

# Debug logging
DEBUG=auto-image-diff:* aid compare ref.png target.png out/

# Save intermediate files
aid compare ref.png target.png out/ --save-intermediate
```

### Debug Configuration

```javascript
// Enable debug logging
const processor = new ImageProcessor({
  debug: true,
  verbose: true,
  saveIntermediate: true,
});

// Custom logger
processor.on("log", (level, message, data) => {
  console.log(`[${level}] ${message}`, data);
});
```

### Common Debug Techniques

1. **Check Image Properties**

   ```bash
   identify -verbose image.png
   ```

2. **Test ImageMagick Commands**

   ```bash
   convert image1.png image2.png -compose difference -composite diff.png
   ```

3. **Validate JSON Files**

   ```bash
   jq . exclusions.json
   ```

4. **Monitor Memory Usage**
   ```bash
   NODE_OPTIONS="--trace-gc" aid batch ref/ target/ out/
   ```

## Prevention Strategies

### Input Validation

```typescript
function validateInputs(ref: string, target: string) {
  // Check file existence
  if (!fs.existsSync(ref)) {
    throw new Error(`Reference image not found: ${ref}`);
  }

  if (!fs.existsSync(target)) {
    throw new Error(`Target image not found: ${target}`);
  }

  // Check file permissions
  try {
    fs.accessSync(ref, fs.constants.R_OK);
    fs.accessSync(target, fs.constants.R_OK);
  } catch {
    throw new Error("Insufficient permissions to read images");
  }

  // Validate image format
  const validFormats = [".png", ".jpg", ".jpeg", ".gif"];
  const refExt = path.extname(ref).toLowerCase();
  const targetExt = path.extname(target).toLowerCase();

  if (!validFormats.includes(refExt) || !validFormats.includes(targetExt)) {
    throw new Error("Unsupported image format");
  }
}
```

### Graceful Degradation

```typescript
async function compareWithFallback(ref: string, target: string) {
  const processor = new ImageProcessor();

  try {
    // Try smart comparison
    return await processor.compareImages(ref, target, 0.1, {
      smart: true,
      alignment: "feature",
    });
  } catch (error) {
    console.warn("Smart comparison failed, falling back to basic");

    try {
      // Fallback to basic comparison
      return await processor.compareImages(ref, target, 0.5, {
        smart: false,
        alignment: "subimage",
      });
    } catch (fallbackError) {
      // Last resort - simple diff
      return await processor.generateDiff(ref, target, "emergency-diff.png");
    }
  }
}
```

## Recovery Procedures

### Corrupted Output

```bash
# Clean output directory
rm -rf output/*

# Verify disk space
df -h

# Re-run with fresh output
aid compare ref.png target.png output/
```

### Stuck Processes

```bash
# Find stuck processes
ps aux | grep "aid\|convert"

# Kill stuck processes
pkill -f "aid|convert"

# Clear temp files
rm -rf /tmp/magick-*
```

## See Also

- [Troubleshooting Guide](../TROUBLESHOOTING.md)
- [FAQ](./FAQ.md)
- [CLI Usage](./CLI_USAGE.md)
