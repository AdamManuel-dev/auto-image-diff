/**
 * @fileoverview ImageMagick-based image processing module
 * @lastmodified 2025-08-01T03:55:00Z
 *
 * Features: Image alignment, comparison, diff generation using ImageMagick
 * Main APIs: alignImages(), compareImages(), generateDiff()
 * Constraints: Requires ImageMagick installed on system
 * Patterns: Async/await, error handling, TypeScript types
 */

import * as gm from "gm";
import * as fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as os from "os";
import { ExclusionsConfig } from "./exclusions";
import { MaskGenerator } from "./mask-generator";
import { ClassifierManager, ClassificationSummary } from "./classifiers/manager";
import { getAllClassifiers } from "./classifiers";
import { CssFixSuggester, FixSuggestion } from "./css-fix-suggester";
import { PngMetadataEmbedder } from "./png-metadata";
import { MetadataEnhancer } from "./metadata-enhancer";

const execAsync = promisify(exec);
const imageMagick = gm.subClass({ imageMagick: true });

export interface ComparisonResult {
  difference: number;
  diffImagePath?: string;
  isEqual: boolean;
  statistics: {
    pixelsDifferent: number;
    totalPixels: number;
    percentageDifferent: number;
  };
  classification?: ClassificationSummary;
  cssSuggestions?: FixSuggestion[];
}

export interface AlignmentOptions {
  method: "feature" | "phase" | "subimage";
  threshold?: number;
}

export class ImageProcessor {
  private metadataEnhancer: MetadataEnhancer;

  constructor() {
    this.metadataEnhancer = new MetadataEnhancer();
  }

  /**
   * Align two images using ImageMagick's subimage search
   */
  async alignImages(
    referenceImage: string,
    targetImage: string,
    outputPath: string,
    _options: AlignmentOptions = { method: "subimage" }
  ): Promise<void> {
    try {
      // Use shell command for subimage search
      const cmd = `compare -metric rmse -subimage-search "${referenceImage}" "${targetImage}" null: 2>&1`;

      const offset = { x: 0, y: 0 };
      try {
        await execAsync(cmd);
      } catch (error) {
        // Compare returns non-zero exit when images differ
        // The offset info is in stderr/stdout
        const execError = error as { stdout?: string; stderr?: string };
        const output = execError.stderr || execError.stdout || "";

        // Extract offset from output
        const match = output.match(/@ ([-\d]+),([-\d]+)/);
        if (match) {
          offset.x = parseInt(match[1], 10);
          offset.y = parseInt(match[2], 10);
        }
      }

      // Apply transformation to align images or copy as-is
      if (offset.x !== 0 || offset.y !== 0) {
        // Use convert to apply offset
        const convertCmd = `convert "${targetImage}" -geometry +${offset.x}+${offset.y} "${outputPath}"`;
        await execAsync(convertCmd);
      } else {
        // No offset needed, just copy
        const copyCmd = `cp "${targetImage}" "${outputPath}"`;
        await execAsync(copyCmd);
      }
    } catch (error) {
      throw new Error(`Failed to align images: ${(error as Error).message}`);
    }
  }

  /**
   * Compare two images and generate difference metrics
   */
  async compareImages(
    image1Path: string,
    image2Path: string,
    threshold: number = 0.1
  ): Promise<ComparisonResult> {
    // Use shell command for compare
    const cmd = `compare -metric AE "${image1Path}" "${image2Path}" null: 2>&1`;
    let pixelsDifferent = 0;

    try {
      const { stdout } = await execAsync(cmd);
      pixelsDifferent = parseInt(stdout.trim() || "0", 10);
    } catch (error) {
      // Compare returns non-zero exit when images differ
      // The pixel count is in stdout
      const execError = error as { stdout?: string };
      if (execError.stdout) {
        pixelsDifferent = parseInt(execError.stdout.trim() || "0", 10);
      } else {
        throw error;
      }
    }

    // Get image dimensions using gm
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      imageMagick(image1Path).size((err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const totalPixels = size.width * size.height;
    const percentageDifferent = (pixelsDifferent / totalPixels) * 100;

    return {
      difference: percentageDifferent,
      isEqual: percentageDifferent <= threshold,
      statistics: {
        pixelsDifferent,
        totalPixels,
        percentageDifferent,
      },
    };
  }

  /**
   * Generate a visual diff between two images
   */
  async generateDiff(
    image1Path: string,
    image2Path: string,
    outputPath: string,
    options: {
      highlightColor?: string;
      lowlight?: boolean;
      exclusions?: ExclusionsConfig;
      runClassification?: boolean;
      suggestCssFixes?: boolean;
      cssSelector?: string;
      embedMetadata?: boolean;
    } = {}
  ): Promise<ComparisonResult> {
    const { highlightColor = "red", exclusions } = options;

    let processedImage1 = image1Path;
    let processedImage2 = image2Path;
    let tempFiles: string[] = [];

    try {
      // Apply exclusion masks if provided
      if (exclusions && exclusions.regions.length > 0) {
        const result = await this.applyExclusionMasks(image1Path, image2Path, exclusions);
        processedImage1 = result.maskedImage1;
        processedImage2 = result.maskedImage2;
        tempFiles = result.tempFiles;
      }

      // Use shell command directly for better compatibility
      const cmd = `compare -highlight-color "${highlightColor}" "${processedImage1}" "${processedImage2}" "${outputPath}" 2>&1`;

      try {
        await execAsync(cmd);
      } catch (error) {
        // Compare returns non-zero exit code when images differ, which is expected
        // Check if the output file was created
        if (!(await this.fileExists(outputPath))) {
          throw new Error(`Failed to generate diff: ${(error as Error).message}`);
        }
      }

      // Get comparison metrics using the masked images if applicable
      const result = await this.compareImages(processedImage1, processedImage2);
      result.diffImagePath = outputPath;

      // Run classification if requested
      if (options.runClassification && result.statistics.pixelsDifferent > 0) {
        try {
          const classification = await this.classifyDifferences(
            processedImage1,
            processedImage2,
            outputPath
          );
          result.classification = classification;

          // Generate CSS suggestions if we have style or layout changes
          if (options.suggestCssFixes) {
            const suggester = new CssFixSuggester();
            const classificationResults = classification.regions
              .map((r) => r.classification)
              .filter((c) => c !== null);

            result.cssSuggestions = suggester.suggestFixes(classificationResults, {
              selector: options.cssSelector,
            });
          }
        } catch (error) {
          // Classification errors shouldn't fail the diff generation
          console.warn("Classification failed:", error);
        }
      }

      // Embed metadata into PNG if requested
      if (options.embedMetadata && outputPath.toLowerCase().endsWith(".png")) {
        try {
          const embedder = new PngMetadataEmbedder();

          // Collect enhanced metadata
          const enhancedMetadata = await this.metadataEnhancer.collectMetadata("auto-image-diff", [
            "diff",
            image1Path,
            image2Path,
            outputPath,
          ]);

          // Mark as complete
          this.metadataEnhancer.markComplete(enhancedMetadata);

          const metadata = embedder.createMetadataFromResult(
            result,
            image1Path,
            image2Path,
            result.classification,
            enhancedMetadata
          );
          await embedder.embedMetadata(outputPath, metadata);
        } catch (error) {
          console.warn("Failed to embed metadata:", error);
        }
      }

      return result;
    } finally {
      // Clean up temporary files
      for (const tempFile of tempFiles) {
        try {
          await fs.unlink(tempFile);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Apply exclusion masks to images before comparison
   */
  private async applyExclusionMasks(
    image1Path: string,
    image2Path: string,
    exclusions: ExclusionsConfig
  ): Promise<{ maskedImage1: string; maskedImage2: string; tempFiles: string[] }> {
    const tempDir = os.tmpdir();
    const tempFiles: string[] = [];

    // Get image dimensions
    const dimensions = await this.getImageDimensions(image1Path);

    // Generate mask
    const maskGenerator = new MaskGenerator({ featherEdges: true, featherRadius: 3 });
    const mask = maskGenerator.generateMask(dimensions, exclusions.regions);

    // Create mask image file
    const maskPath = path.join(tempDir, `mask-${Date.now()}.png`);
    tempFiles.push(maskPath);

    // Create a PNG mask where excluded regions are black (0) and included are white (255)
    await this.createMaskImage(mask, dimensions.width, dimensions.height, maskPath);

    // Apply mask to both images
    const maskedImage1 = path.join(tempDir, `masked1-${Date.now()}.png`);
    const maskedImage2 = path.join(tempDir, `masked2-${Date.now()}.png`);
    tempFiles.push(maskedImage1, maskedImage2);

    // Use ImageMagick to apply the mask
    // This will make excluded regions transparent
    await execAsync(
      `convert "${image1Path}" "${maskPath}" -alpha off -compose CopyOpacity -composite "${maskedImage1}"`
    );
    await execAsync(
      `convert "${image2Path}" "${maskPath}" -alpha off -compose CopyOpacity -composite "${maskedImage2}"`
    );

    return { maskedImage1, maskedImage2, tempFiles };
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      imageMagick(imagePath).size((err, size) => {
        if (err) {
          reject(err);
        } else {
          resolve({ width: size.width, height: size.height });
        }
      });
    });
  }

  /**
   * Create a mask image from binary mask data
   */
  private async createMaskImage(
    mask: Uint8Array,
    width: number,
    height: number,
    outputPath: string
  ): Promise<void> {
    // Create a simple PGM (grayscale) image from the mask data
    // PGM format: P5 width height maxval data
    const header = `P5\n${width} ${height}\n255\n`;
    const headerBuffer = Buffer.from(header);
    const dataBuffer = Buffer.from(mask);
    const pgmBuffer = Buffer.concat([headerBuffer, dataBuffer]);

    // Write as PGM first
    const pgmPath = outputPath.replace(".png", ".pgm");
    await fs.writeFile(pgmPath, pgmBuffer);

    // Convert PGM to PNG using ImageMagick
    try {
      await execAsync(`convert "${pgmPath}" "${outputPath}"`);
    } finally {
      // Clean up temporary PGM file
      try {
        await fs.unlink(pgmPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Classify differences in the comparison
   */
  private async classifyDifferences(
    image1Path: string,
    image2Path: string,
    diffPath: string
  ): Promise<ClassificationSummary> {
    // Create classifier manager and register all classifiers
    const manager = new ClassifierManager();
    const classifiers = getAllClassifiers();
    classifiers.forEach((c) => manager.registerClassifier(c));

    // Load images as buffers for analysis
    const [image1Data, image2Data, diffData] = await Promise.all([
      fs.readFile(image1Path),
      fs.readFile(image2Path),
      fs.readFile(diffPath),
    ]);

    // Get image dimensions
    const dimensions = await this.getImageDimensions(image1Path);

    // For now, we'll analyze the entire image as one region
    // In a more sophisticated implementation, we would segment the diff into regions
    const region: import("./classifiers/base").DifferenceRegion = {
      id: 1,
      bounds: {
        x: 0,
        y: 0,
        width: dimensions.width,
        height: dimensions.height,
      },
      pixelCount: dimensions.width * dimensions.height,
      differencePixels: 0, // This would be calculated from the diff
      differencePercentage: 0, // This would be calculated
    };

    // Create analysis context
    // Note: This is a simplified implementation. A full implementation would
    // properly decode the image data into pixel arrays
    const context: import("./classifiers/base").AnalysisContext = {
      originalImage: {
        data: new Uint8Array(image1Data),
        width: dimensions.width,
        height: dimensions.height,
      },
      comparedImage: {
        data: new Uint8Array(image2Data),
        width: dimensions.width,
        height: dimensions.height,
      },
      diffMask: new Uint8Array(diffData),
    };

    // Calculate actual difference metrics from the diff image
    // This is a placeholder - real implementation would analyze the diff image
    const diffPixelCount = context.diffMask ? this.estimateDifferencePixels(context.diffMask) : 0;
    region.differencePixels = diffPixelCount;
    region.differencePercentage = (diffPixelCount / region.pixelCount) * 100;

    // Run classification
    const summary = manager.classifyRegions([region], context);
    return summary;
  }

  /**
   * Estimate the number of different pixels from a diff image
   * This is a simplified placeholder implementation
   */
  private estimateDifferencePixels(diffData: Uint8Array | Uint8ClampedArray): number {
    // In a real implementation, we would analyze the diff image
    // to count non-black pixels or pixels above a threshold
    let count = 0;
    for (let i = 0; i < diffData.length; i += 4) {
      // Check if pixel is not black (assuming RGBA format)
      if (diffData[i] > 10 || diffData[i + 1] > 10 || diffData[i + 2] > 10) {
        count++;
      }
    }
    return count;
  }
}
