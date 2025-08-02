# OpenCV Setup Guide for auto-image-diff

## Overview

auto-image-diff supports advanced feature-based image alignment using OpenCV.js. This is an optional feature that provides more sophisticated alignment capabilities beyond the default ImageMagick methods.

## Installation

OpenCV support is automatically set up when you install auto-image-diff:

```bash
npm install -g auto-image-diff
```

The `@techstark/opencv-js` package is included as a dependency and will be installed automatically.

## How It Works

### 1. Feature Detection
OpenCV uses computer vision algorithms to detect distinctive features in images:
- **ORB** (Oriented FAST and Rotated BRIEF) - Fast and efficient
- **AKAZE** (Accelerated-KAZE) - More accurate but slower
- **BRISK** (Binary Robust Invariant Scalable Keypoints) - Good balance

### 2. Feature Matching
The detected features are matched between images to find correspondences.

### 3. Homography Estimation
A transformation matrix is calculated to align the images based on matched features.

## Usage

To use OpenCV-based alignment, specify the `-m opencv` option:

```bash
# Basic OpenCV alignment
aid compare image1.png image2.png output/ -m opencv

# Use AKAZE detector for better accuracy
aid compare image1.png image2.png output/ -m opencv --opencv-detector akaze

# Use BRISK detector
aid compare image1.png image2.png output/ -m opencv --opencv-detector brisk
```

## When to Use OpenCV

OpenCV alignment is beneficial for:
- Images with rotation or perspective changes
- Complex transformations beyond simple translation
- Images with distinctive features (corners, edges, patterns)
- When ImageMagick methods fail to find good alignment

## Fallback Behavior

If OpenCV fails to initialize or find alignment, the tool automatically falls back to ImageMagick methods:
1. Subimage search
2. Phase correlation
3. Edge-based alignment

## Troubleshooting

### OpenCV Not Loading

If you see "OpenCV feature alignment failed", check:
1. Node.js version (requires Node 14+)
2. Reinstall the package: `npm install -g auto-image-diff`

### Poor Feature Matching

If OpenCV alignment produces poor results:
1. Try different detectors (ORB → AKAZE → BRISK)
2. Ensure images have sufficient distinctive features
3. Use ImageMagick methods for simple translations

### Performance

OpenCV feature matching is more computationally intensive than ImageMagick methods:
- ORB: Fastest, good for most cases
- BRISK: Moderate speed, better accuracy
- AKAZE: Slowest, best accuracy

## Technical Details

### Module Loading
OpenCV.js is a WebAssembly module that requires asynchronous initialization. The implementation:
1. Lazy loads OpenCV on first use
2. Caches the loaded module
3. Falls back gracefully if loading fails

### Memory Usage
OpenCV operations use more memory than ImageMagick. For batch processing of many images, consider:
- Using `--no-parallel` to process sequentially
- Reducing concurrency with `-c 2`

## Example Workflow

```bash
# 1. Try default alignment first
aid compare before.png after.png results/

# 2. If alignment is poor, try OpenCV
aid compare before.png after.png results-opencv/ -m opencv

# 3. Try different detector if needed
aid compare before.png after.png results-akaze/ -m opencv --opencv-detector akaze

# 4. Compare results
open results/diff.png results-opencv/diff.png results-akaze/diff.png
```

## API Usage

```javascript
const { ImageProcessor } = require('auto-image-diff');

const processor = new ImageProcessor();

// Use OpenCV alignment
const result = await processor.alignImages(
  'reference.png',
  'target.png',
  'aligned.png',
  {
    method: 'opencv',
    opencvDetector: 'akaze' // optional: 'orb', 'akaze', 'brisk'
  }
);
```