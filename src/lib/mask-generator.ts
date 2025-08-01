/**
 * @fileoverview Mask generation for excluded regions in image comparison
 * @lastmodified 2025-08-01T15:10:00Z
 *
 * Features: Generate masks from exclusion regions, apply masks to images
 * Main APIs: generateMask(), applyMask(), MaskGenerator class
 * Constraints: Requires valid image dimensions and exclusion regions
 * Patterns: Creates binary masks for pixel exclusion during comparison
 */

import { ExclusionRegion } from "./exclusions";

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface MaskOptions {
  /**
   * Padding to add around exclusion regions (in pixels)
   */
  padding?: number;
  /**
   * Whether to feather the edges of excluded regions
   */
  featherEdges?: boolean;
  /**
   * Feather radius in pixels (if featherEdges is true)
   */
  featherRadius?: number;
}

export class MaskGenerator {
  private options: Required<MaskOptions>;

  constructor(options: MaskOptions = {}) {
    this.options = {
      padding: options.padding ?? 0,
      featherEdges: options.featherEdges ?? false,
      featherRadius: options.featherRadius ?? 3,
    };
  }

  /**
   * Generates a binary mask from exclusion regions
   * @param dimensions - Image dimensions
   * @param regions - Array of exclusion regions
   * @returns Uint8Array where 0 = excluded, 255 = included
   */
  generateMask(dimensions: ImageDimensions, regions: ExclusionRegion[]): Uint8Array {
    const { width, height } = dimensions;
    const maskSize = width * height;
    const mask = new Uint8Array(maskSize);

    // Initialize mask to all included (255)
    mask.fill(255);

    // Apply each exclusion region
    for (const region of regions) {
      this.applyRegionToMask(mask, width, height, region);
    }

    // Apply feathering if enabled
    if (this.options.featherEdges) {
      this.featherMask(mask, width, height);
    }

    return mask;
  }

  /**
   * Applies a single exclusion region to the mask
   */
  private applyRegionToMask(
    mask: Uint8Array,
    imageWidth: number,
    imageHeight: number,
    region: ExclusionRegion
  ): void {
    const { x, y, width, height } = region.bounds;
    const padding = this.options.padding;

    // Calculate padded bounds
    const startX = Math.max(0, x - padding);
    const startY = Math.max(0, y - padding);
    const endX = Math.min(imageWidth, x + width + padding);
    const endY = Math.min(imageHeight, y + height + padding);

    // Set pixels to excluded (0)
    for (let py = startY; py < endY; py++) {
      for (let px = startX; px < endX; px++) {
        const index = py * imageWidth + px;
        mask[index] = 0;
      }
    }
  }

  /**
   * Applies feathering to the mask edges
   */
  private featherMask(mask: Uint8Array, width: number, height: number): void {
    const radius = this.options.featherRadius;
    const tempMask = new Uint8Array(mask);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;

        // Skip if already excluded
        if (mask[index] === 0) continue;

        // Check distance to nearest excluded pixel
        const distance = this.getDistanceToExcluded(mask, width, height, x, y, radius);

        if (distance < radius) {
          // Apply gradient based on distance
          const factor = distance / radius;
          tempMask[index] = Math.round(255 * factor);
        }
      }
    }

    // Copy feathered mask back
    mask.set(tempMask);
  }

  /**
   * Gets the distance to the nearest excluded pixel
   */
  private getDistanceToExcluded(
    mask: Uint8Array,
    width: number,
    height: number,
    x: number,
    y: number,
    maxRadius: number
  ): number {
    let minDistance = maxRadius;

    const startX = Math.max(0, x - maxRadius);
    const endX = Math.min(width, x + maxRadius + 1);
    const startY = Math.max(0, y - maxRadius);
    const endY = Math.min(height, y + maxRadius + 1);

    for (let py = startY; py < endY; py++) {
      for (let px = startX; px < endX; px++) {
        const index = py * width + px;
        if (mask[index] === 0) {
          const distance = Math.sqrt((px - x) ** 2 + (py - y) ** 2);
          minDistance = Math.min(minDistance, distance);
        }
      }
    }

    return minDistance;
  }

  /**
   * Applies a mask to image difference data
   * @param diffData - Raw difference data (RGBA format)
   * @param mask - Binary mask
   * @param maskValue - Value to set for masked pixels (default: transparent black)
   */
  applyMask(
    diffData: Uint8Array | Uint8ClampedArray,
    mask: Uint8Array,
    maskValue: { r: number; g: number; b: number; a: number } = { r: 0, g: 0, b: 0, a: 0 }
  ): void {
    const pixelCount = mask.length;

    for (let i = 0; i < pixelCount; i++) {
      if (mask[i] === 0) {
        // Pixel is excluded, set to mask value
        const pixelIndex = i * 4;
        diffData[pixelIndex] = maskValue.r;
        diffData[pixelIndex + 1] = maskValue.g;
        diffData[pixelIndex + 2] = maskValue.b;
        diffData[pixelIndex + 3] = maskValue.a;
      } else if (mask[i] < 255) {
        // Feathered edge - blend
        const pixelIndex = i * 4;
        const factor = mask[i] / 255;
        diffData[pixelIndex] = Math.round(
          diffData[pixelIndex] * factor + maskValue.r * (1 - factor)
        );
        diffData[pixelIndex + 1] = Math.round(
          diffData[pixelIndex + 1] * factor + maskValue.g * (1 - factor)
        );
        diffData[pixelIndex + 2] = Math.round(
          diffData[pixelIndex + 2] * factor + maskValue.b * (1 - factor)
        );
        diffData[pixelIndex + 3] = Math.round(
          diffData[pixelIndex + 3] * factor + maskValue.a * (1 - factor)
        );
      }
    }
  }

  /**
   * Creates a visual representation of the mask for debugging
   */
  createDebugImage(mask: Uint8Array, width: number, height: number): Uint8Array {
    const imageData = new Uint8Array(width * height * 4);

    for (let i = 0; i < mask.length; i++) {
      const pixelIndex = i * 4;
      const value = mask[i];

      // Excluded regions are red, included are green, feathered are yellow
      if (value === 0) {
        // Red for excluded
        imageData[pixelIndex] = 255;
        imageData[pixelIndex + 1] = 0;
        imageData[pixelIndex + 2] = 0;
        imageData[pixelIndex + 3] = 255;
      } else if (value === 255) {
        // Green for included
        imageData[pixelIndex] = 0;
        imageData[pixelIndex + 1] = 255;
        imageData[pixelIndex + 2] = 0;
        imageData[pixelIndex + 3] = 255;
      } else {
        // Yellow gradient for feathered
        imageData[pixelIndex] = 255;
        imageData[pixelIndex + 1] = value;
        imageData[pixelIndex + 2] = 0;
        imageData[pixelIndex + 3] = 255;
      }
    }

    return imageData;
  }
}

/**
 * Helper function to create a mask generator with default options
 */
export function createMaskGenerator(options?: MaskOptions): MaskGenerator {
  return new MaskGenerator(options);
}

/**
 * Helper function to check if a pixel is within an exclusion region
 */
export function isPixelExcluded(
  x: number,
  y: number,
  regions: ExclusionRegion[],
  padding = 0
): boolean {
  for (const region of regions) {
    const bounds = region.bounds;
    if (
      x >= bounds.x - padding &&
      x < bounds.x + bounds.width + padding &&
      y >= bounds.y - padding &&
      y < bounds.y + bounds.height + padding
    ) {
      return true;
    }
  }
  return false;
}
