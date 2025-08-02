# Troubleshooting Guide

This guide helps you resolve common issues with auto-image-diff.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Runtime Errors](#runtime-errors)
- [Image Processing Problems](#image-processing-problems)
- [Performance Issues](#performance-issues)
- [Classification Issues](#classification-issues)
- [Integration Problems](#integration-problems)
- [Debug Mode](#debug-mode)
- [Getting Help](#getting-help)

## Installation Issues

### ImageMagick Not Found

**Problem**: Error message "ImageMagick not found" or "convert: command not found"

**Solutions**:

1. **Verify ImageMagick installation**:
   ```bash
   # Check if installed
   convert -version
   # or on Windows
   magick -version
   ```

2. **Install ImageMagick**:
   ```bash
   # macOS
   brew install imagemagick
   
   # Ubuntu/Debian
   sudo apt-get update && sudo apt-get install imagemagick
   
   # Windows - download from imagemagick.org
   ```

3. **Add to PATH** (Windows):
   - Add ImageMagick bin directory to system PATH
   - Restart terminal/command prompt

4. **Check Node.js bindings**:
   ```bash
   # Reinstall gm module
   npm rebuild gm
   ```

### Node.js Version Issues

**Problem**: "Unsupported Node.js version" or syntax errors

**Solution**:
```bash
# Check version (need 22.0.0+)
node --version

# Install correct version using nvm
nvm install 22
nvm use 22
```

### Permission Errors

**Problem**: "EACCES: permission denied" during global install

**Solutions**:

1. **Use npm prefix**:
   ```bash
   npm config set prefix ~/.npm-global
   export PATH=~/.npm-global/bin:$PATH
   npm install -g auto-image-diff
   ```

2. **Fix npm permissions**:
   ```bash
   sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
   ```

## Runtime Errors

### Out of Memory

**Problem**: "JavaScript heap out of memory"

**Solutions**:

1. **Increase Node.js memory**:
   ```bash
   # Set memory limit to 8GB
   export NODE_OPTIONS="--max-old-space-size=8192"
   aid batch ref/ target/ output/
   ```

2. **Reduce batch concurrency**:
   ```bash
   aid batch ref/ target/ output/ --max-concurrency 2
   ```

3. **Process smaller images**:
   ```bash
   # Resize images first
   convert large.png -resize 50% smaller.png
   ```

### File Not Found

**Problem**: "ENOENT: no such file or directory"

**Solutions**:

1. **Check file paths**:
   ```bash
   # Use absolute paths
   aid compare /full/path/to/image1.png /full/path/to/image2.png output/
   ```

2. **Verify file exists**:
   ```bash
   ls -la image1.png image2.png
   ```

3. **Check working directory**:
   ```bash
   pwd
   ```

### Permission Denied

**Problem**: "EACCES: permission denied" when writing output

**Solutions**:

1. **Check directory permissions**:
   ```bash
   ls -la output/
   chmod 755 output/
   ```

2. **Create output directory**:
   ```bash
   mkdir -p output
   ```

## Image Processing Problems

### Cannot Align Images

**Problem**: "Failed to align images" or poor alignment results

**Solutions**:

1. **Try different alignment methods**:
   ```bash
   # Default subimage method
   aid compare ref.png target.png out/
   
   # OpenCV feature-based
   aid compare ref.png target.png out/ --alignment-method opencv
   
   # Phase correlation
   aid compare ref.png target.png out/ --alignment-method phase
   ```

2. **Check image similarity**:
   - Images must have overlapping content
   - Very different images cannot be aligned

3. **Verify image formats**:
   ```bash
   file image1.png image2.png
   # Should show: PNG image data
   ```

### Incorrect Difference Detection

**Problem**: False positives or missing differences

**Solutions**:

1. **Adjust threshold**:
   ```bash
   # More sensitive (lower threshold)
   aid compare ref.png target.png out/ --threshold 0.01
   
   # Less sensitive (higher threshold)
   aid compare ref.png target.png out/ --threshold 1.0
   ```

2. **Use exclusion regions**:
   ```json
   // exclusions.json
   {
     "regions": [
       {
         "x": 0,
         "y": 0,
         "width": 200,
         "height": 50,
         "reason": "Dynamic timestamp"
       }
     ]
   }
   ```
   ```bash
   aid compare ref.png target.png out/ --exclusions exclusions.json
   ```

3. **Enable classification**:
   ```bash
   aid compare ref.png target.png out/ --classify
   ```

### OpenCV Errors

**Problem**: "OpenCV not loaded" or "Feature detection failed"

**Solutions**:

1. **Install OpenCV dependencies**:
   ```bash
   npm run setup:opencv
   ```

2. **Check WASM file**:
   ```bash
   ls node_modules/opencv-js/opencv.js
   ```

3. **Use fallback method**:
   ```bash
   aid compare ref.png target.png out/ --alignment-method subimage
   ```

## Performance Issues

### Slow Processing

**Problem**: Image processing takes too long

**Solutions**:

1. **Enable parallel processing**:
   ```bash
   aid batch ref/ target/ out/ --parallel --max-concurrency 8
   ```

2. **Reduce image size**:
   ```bash
   # Preprocess large images
   for img in *.png; do
     convert "$img" -resize 2000x2000\> "resized_$img"
   done
   ```

3. **Skip classification**:
   ```bash
   # Faster without classification
   aid compare ref.png target.png out/
   ```

4. **Use SSD for temp files**:
   ```bash
   export TMPDIR=/path/to/ssd/temp
   ```

### High Memory Usage

**Problem**: Excessive memory consumption

**Solutions**:

1. **Process in batches**:
   ```bash
   # Process 10 images at a time
   find ref/ -name "*.png" | head -10 | while read f; do
     aid compare "$f" "target/$(basename $f)" output/
   done
   ```

2. **Clear Node.js cache**:
   ```bash
   node --expose-gc script.js
   # Call global.gc() in code
   ```

## Classification Issues

### Incorrect Classification

**Problem**: Changes classified incorrectly

**Solutions**:

1. **Review classification rules**:
   - Content: Text/image changes
   - Style: Color/visual changes
   - Layout: Position changes
   - Size: Dimension changes

2. **Adjust confidence thresholds**:
   ```typescript
   // Custom classifier
   class MyClassifier extends DifferenceClassifier {
     classify(region, context) {
       // Adjust confidence calculation
     }
   }
   ```

3. **Check region size**:
   - Very small regions may be misclassified
   - Merge adjacent regions for better accuracy

## Integration Problems

### CI/CD Failures

**Problem**: Tests fail in CI but pass locally

**Solutions**:

1. **Check ImageMagick version**:
   ```yaml
   # .github/workflows/ci.yml
   - name: Install ImageMagick
     run: |
       sudo apt-get update
       sudo apt-get install -y imagemagick
       convert -version
   ```

2. **Set consistent environment**:
   ```bash
   # Use same Node version
   nvm use 22
   
   # Set timezone
   export TZ=UTC
   ```

3. **Debug CI output**:
   ```bash
   # Add debug flag
   aid compare ref.png target.png out/ --debug
   ```

### API Integration Issues

**Problem**: Errors when using programmatically

**Solutions**:

1. **Check async/await usage**:
   ```typescript
   // Correct
   try {
     const result = await processor.compareImages(img1, img2);
   } catch (error) {
     console.error('Comparison failed:', error);
   }
   ```

2. **Handle file paths correctly**:
   ```typescript
   import * as path from 'path';
   
   const absolutePath = path.resolve(relativePath);
   ```

## Debug Mode

### Enable Debug Output

```bash
# Set debug environment variable
export DEBUG=auto-image-diff:*
aid compare ref.png target.png out/

# Or inline
DEBUG=auto-image-diff:* aid compare ref.png target.png out/
```

### Debug Categories

- `auto-image-diff:align` - Alignment operations
- `auto-image-diff:compare` - Comparison operations
- `auto-image-diff:classify` - Classification process
- `auto-image-diff:batch` - Batch processing

### Verbose Logging

```bash
# Enable verbose mode
aid compare ref.png target.png out/ --verbose

# Save debug output
aid compare ref.png target.png out/ --verbose 2> debug.log
```

### Creating Debug Reports

```bash
# Generate full debug report
aid debug-report > debug-report.txt

# Include system info
aid compare ref.png target.png out/ --debug --system-info
```

## Getting Help

### Diagnostic Commands

```bash
# Check installation
aid doctor

# Version information
aid --version

# Help for specific command
aid compare --help
```

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 1 | General error | Check error message |
| 2 | File not found | Verify file paths |
| 3 | ImageMagick error | Check IM installation |
| 4 | Memory error | Increase heap size |
| 5 | Permission denied | Check file permissions |

### Reporting Issues

When reporting issues, include:

1. **Error message**: Full error output
2. **Environment**: OS, Node.js version, ImageMagick version
3. **Command**: Exact command that failed
4. **Files**: Sample images if possible
5. **Debug output**: Run with `--debug` flag

### Community Support

- [GitHub Issues](https://github.com/AdamManuel-dev/auto-image-diff/issues)
- [Discussions](https://github.com/AdamManuel-dev/auto-image-diff/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/auto-image-diff)

### Emergency Fixes

If nothing else works:

1. **Clean install**:
   ```bash
   npm uninstall -g auto-image-diff
   npm cache clean --force
   npm install -g auto-image-diff
   ```

2. **Use Docker** (if available):
   ```bash
   docker run -v $(pwd):/work auto-image-diff compare /work/ref.png /work/target.png /work/out/
   ```

3. **Manual ImageMagick**:
   ```bash
   # Direct ImageMagick commands
   compare -metric RMSE ref.png target.png diff.png
   ```