# System Architecture

## Overview

auto-image-diff is a TypeScript-based image comparison tool that leverages ImageMagick and OpenCV.js for advanced image alignment and difference detection. The system is designed with a modular architecture that allows for extensibility and maintainability.

## Design Philosophy

- **Modularity**: Each feature is encapsulated in its own module with clear interfaces
- **Extensibility**: Plugin-based classifier system allows easy addition of new difference types
- **Performance**: Parallel processing and efficient algorithms for handling large batches
- **Accuracy**: Multiple alignment methods with fallback strategies
- **Developer Experience**: Fully typed TypeScript with comprehensive documentation

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Interface                        │
│                        (src/cli.ts)                         │
└─────────────────┬───────────────────────────┬──────────────┘
                  │                           │
                  ▼                           ▼
┌─────────────────────────────┐ ┌────────────────────────────┐
│      Image Processor        │ │      Batch Processor       │
│  (lib/imageProcessor.ts)    │ │  (lib/batchProcessor.ts)   │
└──────────┬──────────────────┘ └──────────┬─────────────────┘
           │                               │
           ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Processing Layer                     │
├─────────────────┬─────────────────┬────────────────────────┤
│   Alignment     │  Classification │    Enhancement         │
│   - Subimage    │  - Content      │    - CSS Fixes         │
│   - Feature     │  - Style        │    - Metadata          │
│   - Phase       │  - Layout       │    - Reports           │
│   - OpenCV      │  - Structure    │    - Refinement        │
└─────────────────┴─────────────────┴────────────────────────┘
```

## Core Components

### 1. Image Processor (`lib/imageProcessor.ts`)
The heart of the system, responsible for:
- **Image Alignment**: Multiple strategies including subimage search, feature matching, and phase correlation
- **Difference Generation**: Visual diff creation with customizable highlighting
- **Comparison Metrics**: Pixel-level difference calculations
- **Integration Points**: Hooks for classifiers, metadata, and exclusions

### 2. Batch Processor (`lib/batchProcessor.ts`)
Handles multiple image comparisons:
- **Directory Scanning**: Recursive file discovery with pattern matching
- **File Pairing**: Smart matching algorithms for corresponding images
- **Parallel Processing**: Concurrent processing with worker pool
- **Report Generation**: Aggregate statistics and summaries

### 3. Classifier System (`lib/classifiers/`)
Modular system for categorizing differences:
- **Base Architecture**: Abstract classifier with plugin interface
- **Classifier Types**:
  - **Content**: Text and image content changes
  - **Style**: CSS and visual styling changes
  - **Layout**: Positioning and structure changes
  - **Size**: Dimension and scaling changes
  - **Structural**: DOM structure modifications
- **Manager**: Orchestrates classifier execution and result aggregation

### 4. Enhancement Modules
Additional features that enhance core functionality:
- **CSS Fix Suggester**: Generates CSS to resolve style differences
- **Metadata Enhancer**: Embeds comparison data in PNG files
- **Progressive Refiner**: Interactive refinement of exclusion regions
- **Smart Report Generator**: HTML reports with visualizations

### 5. Alignment Strategies

#### Subimage Search (Default)
- Uses ImageMagick's compare command
- Searches for one image within another
- Multiple variations: target-in-ref, ref-in-target, cropped regions

#### Feature-Based (OpenCV)
- ORB, AKAZE, or BRISK feature detectors
- Homography estimation for perspective changes
- Best for images with distinct features

#### Phase Correlation
- Frequency domain alignment
- Good for translations without rotation
- Fallback when other methods fail

#### Edge-Based
- Canny edge detection
- Aligns based on structural features
- Optimized for UI screenshots

## Data Flow

```
1. Input Images
   ↓
2. Alignment Phase
   - Try multiple alignment strategies
   - Select best match based on score
   ↓
3. Comparison Phase
   - Generate pixel difference mask
   - Apply exclusion regions
   ↓
4. Classification Phase
   - Analyze difference regions
   - Categorize by type
   ↓
5. Enhancement Phase
   - Generate CSS suggestions
   - Embed metadata
   - Create reports
   ↓
6. Output Results
```

## Technology Stack

### Runtime & Language
- **Node.js**: v22.18.0+ for modern JavaScript features
- **TypeScript**: 5.x for type safety and better DX
- **Commander.js**: CLI framework

### Image Processing
- **ImageMagick**: Core image manipulation and comparison
- **GraphicsMagick (gm)**: Node.js bindings for ImageMagick
- **OpenCV.js**: Advanced computer vision algorithms

### Testing & Quality
- **Jest**: Unit and integration testing
- **ESLint**: Code quality and standards
- **TypeScript Compiler**: Type checking

### Build & Package
- **npm**: Package management
- **TypeScript Compiler**: Transpilation

## Configuration

### Environment Variables
- `OPENCV_WASM_PATH`: Path to OpenCV WASM file
- `IMAGE_DIFF_TEMP_DIR`: Temporary file directory
- `MAX_PARALLEL_WORKERS`: Concurrency limit

### File Formats
- **Input**: PNG, JPEG, GIF, BMP, TIFF
- **Output**: PNG (with optional metadata)
- **Reports**: HTML, JSON

## Performance Considerations

### Memory Management
- Streaming for large images
- Cleanup of temporary files
- Bounded worker pools

### Optimization Strategies
- Parallel batch processing
- Caching of alignment results
- Efficient region extraction

### Scalability
- Horizontal scaling via worker processes
- Configurable concurrency limits
- Memory-aware processing

## Security Considerations

### Input Validation
- File type verification
- Path traversal prevention
- Size limits for images

### Process Isolation
- Sandboxed ImageMagick execution
- Limited file system access
- Sanitized command construction

## Extension Points

### Custom Classifiers
Implement the `DifferenceClassifier` abstract class:
```typescript
class MyClassifier extends DifferenceClassifier {
  classify(region, context) { /* ... */ }
  canClassify(region, context) { /* ... */ }
}
```

### Custom Alignment Methods
Add new alignment strategies to `ImageProcessor`:
```typescript
private async tryCustomAlignment(ref, target) {
  // Custom alignment logic
  return { score, offset };
}
```

### Report Templates
Create custom HTML templates for reports:
```typescript
class CustomReportGenerator extends SmartReportGenerator {
  protected generateHTML(data) { /* ... */ }
}
```

## Future Architecture Considerations

### Planned Enhancements
- WebAssembly for browser support
- GPU acceleration for large images
- Cloud-based processing options
- Real-time collaboration features

### Modularization
- Separate packages for classifiers
- Plugin marketplace
- Custom reporter packages

### API Gateway
- RESTful API for remote processing
- WebSocket for real-time updates
- Authentication and rate limiting