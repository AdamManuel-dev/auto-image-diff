# Automated UI Screenshot Alignment and Comparison Tool

<div align="center">
  
  ![auto-image-diff Logo](https://img.shields.io/badge/auto--image--diff-v0.1.0-blue.svg)
  [![Build Status](https://img.shields.io/github/workflow/status/adammanuel-dev/auto-image-diff/CI)](https://github.com/adammanuel-dev/auto-image-diff/actions)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
  [![Node](https://img.shields.io/badge/node-14+-green.svg)](https://nodejs.org/)
  
  **auto-image-diff**
  
  [Installation](#installation) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Examples](#examples) • [Contributing](#contributing)

</div>

---

## 🎯 Overview

auto-image-diff is a powerful command-line tool that automatically aligns UI screenshots and generates visual difference reports. It solves the common problem of false positives in visual regression testing caused by minor positioning differences between screenshots.

### ✨ Key Features

- 🔄 **Automatic Alignment** - Uses SIFT/ORB algorithms to detect and correct positioning differences
- 🎨 **Pixel-Perfect Comparison** - Leverages Pixelmatch for accurate difference detection
- 🚀 **Fast Processing** - Compares images in under 5 seconds
- 📊 **Multiple Output Formats** - PNG, HTML, and JSON reports
- 🔧 **CI/CD Ready** - Designed for seamless integration into automated workflows
- 🎯 **Smart Difference Detection** - Distinguishes between anti-aliasing and actual changes
<!-- 
## 📸 Visual Example

<table>
<tr>
<td align="center"><b>Before</b><br><img src="docs/images/before.png" width="250"/></td>
<td align="center"><b>After</b><br><img src="docs/images/after.png" width="250"/></td>
<td align="center"><b>Difference</b><br><img src="docs/images/diff.png" width="250"/></td>
</tr>
</table> -->

## 🚀 Quick Start

### Basic Usage

```bash
# Simple comparison
auto-image-diff screenshot1.png screenshot2.png -o diff.png

# With custom threshold
auto-image-diff before.png after.png -o diff.png --pm-threshold 0.2

# Generate HTML report
auto-image-diff before.png after.png -o report.html --format html
```
<!-- 
### Batch Processing

```bash
# Compare entire directories
auto-image-diff --batch \
  --before-dir ./baseline \
  --after-dir ./current \
  --output-dir ./results
``` -->

## 📦 Installation
<!-- 
### Option 1: Using Package Managers (Recommended) (NOT IMPLEMENTED YET)

```bash
# Install via pip and npm
pip install auto-image-diff-align
npm install -g pixelmatch-cli
pip install auto-image-diff

# Verify installation
auto-image-diff --version
```

### Option 2: Pre-built Binaries (NOT IMPLEMENTED YET)

Download the latest release for your platform:

- [Windows (x64)](https://github.com/yourusername/auto-image-diff/releases/latest/download/auto-image-diff-win-x64.exe)
- [macOS (x64)](https://github.com/yourusername/auto-image-diff/releases/latest/download/auto-image-diff-macos-x64)
- [macOS (ARM64)](https://github.com/yourusername/auto-image-diff/releases/latest/download/auto-image-diff-macos-arm64)
- [Linux (x64)](https://github.com/yourusername/auto-image-diff/releases/latest/download/auto-image-diff-linux-x64)

```bash
# Linux/macOS
chmod +x auto-image-diff-*
sudo mv auto-image-diff-* /usr/local/bin/auto-image-diff

# Windows
# Add to PATH or use directly
```

### Option 3: Docker (NOT IMPLEMENTED YET)

```bash
# Pull the image
docker pull auto-image-diff/auto-image-diff:latest

# Create alias for convenience
alias auto-image-diff='docker run -v $(pwd):/work auto-image-diff/auto-image-diff:latest'

# Use normally
auto-image-diff image1.png image2.png -o diff.png
``` -->

<!-- ### Option 4: From Source -->

### From Source

```bash
# Clone repository
git clone https://github.com/yourusername/auto-image-diff.git
cd auto-image-diff

# Install dependencies
pip install -r requirements.txt
npm install

# Install in development mode
pip install -e .

# Run tests
pytest
npm test
```

## 📖 Documentation

### Command Line Options

```bash
auto-image-diff [OPTIONS] IMAGE1 IMAGE2

Positional Arguments:
  IMAGE1    Reference image (ground truth)
  IMAGE2    Image to compare against reference

Options:
  # Alignment Options
  --auto                Enable automatic alignment (default: true)
  --algorithm ALGO      Feature detection algorithm: sift, orb, akaze, brisk
  --confidence N        Minimum alignment confidence (0-1, default: 0.7)
  
  # Comparison Options  
  --pm-threshold N      Pixel difference threshold (0-1, default: 0.1)
  --pm-aa               Include anti-aliasing detection (default: true)
  
  # Output Options
  -o, --output PATH     Output file path (required)
  --format FORMAT       Output format: png, html, json, all
  
  # Processing Options
  --exclude FILE        Exclude regions from comparison (JSON file)
  --verbose             Show detailed progress
  --config FILE         Load options from config file

Exit Codes:
  0   Images match within threshold
  1   Images differ beyond threshold
  2   Alignment failed
  3   Invalid arguments
```

### Configuration File

Create `.auto-image-diff.yml` in your project root:

```yaml
alignment:
  algorithm: sift
  confidence_threshold: 0.8

comparison:
  pixelmatch:
    threshold: 0.1
    include_aa: true
    colors:
      diff: [255, 0, 0]
      aa: [255, 255, 0]

output:
  formats: [png, json]
  include_metadata: true
```
<!-- 
## 🔧 CI/CD Integration

### GitHub Actions (NOT IMPLEMENTED YET)

```yaml
name: Visual Regression Tests
on: [push, pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install auto-image-diff
        run: |
          pip install auto-image-diff
          npm install -g pixelmatch-cli
      
      - name: Run Visual Tests
        run: |
          auto-image-diff --batch \
            --before-dir ./tests/baseline \
            --after-dir ./tests/screenshots \
            --output-dir ./tests/diff \
            --format json \
            --output results.json
        continue-on-error: true
      
      - name: Upload Differences
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-differences
          path: ./tests/diff/
```

### Jenkins (NOT IMPLEMENTED YET)

```groovy
pipeline {
    agent any
    stages {
        stage('Visual Tests') {
            steps {
                sh '''
                    auto-image-diff --batch \
                        --before-dir baseline/ \
                        --after-dir screenshots/ \
                        --output-dir diff/
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'diff/**/*.png'
                    publishHTML([
                        reportDir: 'diff',
                        reportFiles: 'index.html',
                        reportName: 'Visual Regression Report'
                    ])
                }
            }
        }
    }
}
```

### GitLab CI (NOT IMPLEMENTED YET)

```yaml
visual-regression:
  stage: test
  script:
    - pip install auto-image-diff
    - npm install -g pixelmatch-cli
    - auto-image-diff --batch --before-dir baseline/ --after-dir current/ --output-dir diff/
  artifacts:
    when: on_failure
    paths:
      - diff/
    expire_in: 1 week
``` -->

## 📚 Examples

### Excluding Dynamic Regions

Create an exclusions file:

```json
{
  "regions": [
    {
      "name": "timestamp",
      "bounds": {"x": 10, "y": 10, "width": 200, "height": 30}
    },
    {
      "name": "advertisement",
      "bounds": {"x": 300, "y": 100, "width": 250, "height": 300}
    }
  ]
}
```

Use with auto-image-diff:

```bash
auto-image-diff before.png after.png -o diff.png --exclude exclusions.json
```

### Python Integration

```python
import subprocess
import json

def run_visual_test(before, after):
    result = subprocess.run([
        'auto-image-diff',
        before,
        after,
        '--format', 'json',
        '--output', 'result.json'
    ], capture_output=True)
    
    with open('result.json') as f:
        data = json.load(f)
    
    if data['result']['differencePercentage'] > 0.1:
        raise AssertionError(f"Visual difference: {data['result']['summary']}")
```

### Node.js Integration

```javascript
const { exec } = require('child_process');
const fs = require('fs').promises;

async function compareImages(image1, image2) {
    return new Promise((resolve, reject) => {
        exec(`auto-image-diff ${image1} ${image2} --format json --output result.json`, 
            async (error, stdout, stderr) => {
                if (error && error.code !== 1) {
                    reject(error);
                    return;
                }
                
                const result = JSON.parse(await fs.readFile('result.json', 'utf8'));
                resolve(result);
            }
        );
    });
}
```

## 🏗️ Architecture

auto-image-diff uses a modular architecture with three main components:

1. **Image Aligner** (Python) - Handles feature detection and alignment
2. **Pixelmatch CLI** (Node.js) - Performs pixel-level comparison
3. **Orchestrator** (Python) - Coordinates the workflow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Image Aligner  │────▶│   Orchestrator   │────▶│ Pixelmatch CLI  │
│    (Python)     │     │     (Python)     │     │   (Node.js)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                                 │
         └─────────────────────┬───────────────────────────┘
                               │
                               ▼
                         Final Output
                    (PNG/HTML/JSON Report)
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/auto-image-diff.git
cd auto-image-diff

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install in development mode
pip install -e ".[dev]"
npm install --save-dev

# Run tests
pytest
npm test

# Run linters
flake8 .
npm run lint
```

### Running Tests

```bash
# Unit tests
pytest tests/unit/

# Integration tests
pytest tests/integration/

# Full test suite
pytest

# With coverage
pytest --cov=auto-image-diff --cov-report=html
```
<!-- 
## 📊 Performance

Benchmarked on Ubuntu 20.04, Intel i7-9700K, 16GB RAM:

| Image Size | Processing Time | Memory Usage |
|------------|----------------|--------------|
| 1920×1080  | ~1.5 seconds   | ~250 MB      |
| 3840×2160  | ~4.7 seconds   | ~980 MB      |
| 1280×720   | ~1.0 seconds   | ~150 MB      | -->

## 🔍 Troubleshooting

### Common Issues

**Problem**: "Insufficient feature matches" error
```bash
# Solution: Try different algorithm
auto-image-diff image1.png image2.png -o diff.png --algorithm orb

# Or lower the confidence threshold
auto-image-diff image1.png image2.png -o diff.png --confidence 0.5
```

**Problem**: High memory usage with large images
```bash
# Solution: Process in batches with limited workers
auto-image-diff --batch --parallel 2 --before-dir ./large-images --after-dir ./new-images
```

**Problem**: Docker permission errors
```bash
# Solution: Use proper volume mounting
docker run -v $(pwd):/work -w /work auto-image-diff/auto-image-diff image1.png image2.png -o diff.png
```

### Debug Mode

Enable debug mode for detailed diagnostics:

```bash
auto-image-diff image1.png image2.png -o diff.png --debug --verbose
```

This saves intermediate files in `./auto-image-diff-debug/`:
- `features_detected.png` - Visualization of detected features
- `matches.png` - Feature matches between images
- `aligned.png` - Aligned version of second image
- `transform.json` - Transformation matrix details

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenCV](https://opencv.org/) for computer vision algorithms
- [Pixelmatch](https://github.com/mapbox/pixelmatch) for pixel comparison
- [NumPy](https://numpy.org/) for numerical computations
- [Click](https://click.palletsprojects.com/) for CLI framework

## 📬 Support

- 📧 Email: adam@manuel.dev
<!-- - 💬 Discord: [Join our community](https://discord.gg/auto-image-diff)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/auto-image-diff/issues)
- 📖 Wiki: [Documentation Wiki](https://github.com/yourusername/auto-image-diff/wiki) -->

<!-- ## 🗺️ Roadmap

See our [public roadmap](https://github.com/adammanuel-dev/auto-image-diff/projects/1) for upcoming features:

- [ ] v1.1 - Plugin architecture for custom algorithms
- [ ] v1.2 - Web service API
- [ ] v2.0 - GUI application
- [ ] v2.1 - Cloud processing support -->

---

<div align="center">
  Made with ❤️ by the Adam Manuel
  
  ⭐ Star this on GitHub — it helps!
</div>