/**
 * @fileoverview Main entry point for auto-image-diff
 * @lastmodified 2025-08-01T03:57:00Z
 *
 * Features: Image alignment, comparison, diff generation using ImageMagick
 * Main APIs: ImageProcessor, alignImages, compareImages, generateDiff
 * Constraints: Requires Node.js 22+, ImageMagick installed
 * Patterns: TypeScript, CommonJS modules, async/await
 */

export { ImageProcessor, ComparisonResult, AlignmentOptions } from './lib/imageProcessor';

// CLI is handled separately in cli.ts
