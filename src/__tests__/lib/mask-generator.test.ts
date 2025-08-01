/**
 * @fileoverview Tests for mask generation functionality
 * @lastmodified 2025-08-01T15:15:00Z
 */

import { MaskGenerator, createMaskGenerator, isPixelExcluded } from "../../lib/mask-generator";
import { ExclusionRegion } from "../../lib/exclusions";

describe("MaskGenerator", () => {
  const testRegions: ExclusionRegion[] = [
    {
      name: "region1",
      bounds: { x: 10, y: 10, width: 20, height: 20 },
    },
    {
      name: "region2",
      bounds: { x: 50, y: 50, width: 30, height: 30 },
    },
  ];

  describe("generateMask", () => {
    it("should create a mask with all pixels included by default", () => {
      const generator = new MaskGenerator();
      const mask = generator.generateMask({ width: 100, height: 100 }, []);

      expect(mask.length).toBe(100 * 100);
      expect(mask.every((pixel) => pixel === 255)).toBe(true);
    });

    it("should exclude regions specified", () => {
      const generator = new MaskGenerator();
      const mask = generator.generateMask({ width: 100, height: 100 }, testRegions);

      // Check excluded regions
      for (let y = 10; y < 30; y++) {
        for (let x = 10; x < 30; x++) {
          expect(mask[y * 100 + x]).toBe(0);
        }
      }

      // Check included regions
      expect(mask[0]).toBe(255); // Top-left corner
      expect(mask[99]).toBe(255); // Top-right corner
    });

    it("should apply padding to exclusion regions", () => {
      const generator = new MaskGenerator({ padding: 5 });
      const mask = generator.generateMask({ width: 100, height: 100 }, [testRegions[0]]);

      // Check padded exclusion
      for (let y = 5; y < 35; y++) {
        for (let x = 5; x < 35; x++) {
          expect(mask[y * 100 + x]).toBe(0);
        }
      }

      // Check outside padding is included
      expect(mask[4 * 100 + 4]).toBe(255);
    });

    it("should handle regions at image boundaries", () => {
      const edgeRegions: ExclusionRegion[] = [
        {
          name: "edge",
          bounds: { x: 90, y: 90, width: 20, height: 20 },
        },
      ];

      const generator = new MaskGenerator();
      const mask = generator.generateMask({ width: 100, height: 100 }, edgeRegions);

      // Check that it doesn't overflow
      expect(mask.length).toBe(100 * 100);

      // Check excluded region (clipped to image bounds)
      for (let y = 90; y < 100; y++) {
        for (let x = 90; x < 100; x++) {
          expect(mask[y * 100 + x]).toBe(0);
        }
      }
    });

    it("should apply feathering when enabled", () => {
      const generator = new MaskGenerator({ featherEdges: true, featherRadius: 3 });
      const mask = generator.generateMask({ width: 100, height: 100 }, [testRegions[0]]);

      // Check for gradient values at edges
      let hasGradient = false;
      for (let i = 0; i < mask.length; i++) {
        if (mask[i] > 0 && mask[i] < 255) {
          hasGradient = true;
          break;
        }
      }

      expect(hasGradient).toBe(true);
    });
  });

  describe("applyMask", () => {
    it("should mask excluded pixels in difference data", () => {
      const generator = new MaskGenerator();
      const mask = new Uint8Array([255, 0, 255, 0]);
      const diffData = new Uint8Array([
        255, 128, 64, 255, // Pixel 1 (included)
        255, 128, 64, 255, // Pixel 2 (excluded)
        255, 128, 64, 255, // Pixel 3 (included)
        255, 128, 64, 255, // Pixel 4 (excluded)
      ]);

      generator.applyMask(diffData, mask);

      // Check included pixels are unchanged
      expect(diffData[0]).toBe(255);
      expect(diffData[8]).toBe(255);

      // Check excluded pixels are zeroed
      expect(diffData[4]).toBe(0);
      expect(diffData[5]).toBe(0);
      expect(diffData[6]).toBe(0);
      expect(diffData[7]).toBe(0);
    });

    it("should apply custom mask values", () => {
      const generator = new MaskGenerator();
      const mask = new Uint8Array([0, 255]);
      const diffData = new Uint8Array([255, 128, 64, 255, 255, 128, 64, 255]);

      generator.applyMask(diffData, mask, { r: 100, g: 100, b: 100, a: 100 });

      // Check custom values applied
      expect(diffData[0]).toBe(100);
      expect(diffData[1]).toBe(100);
      expect(diffData[2]).toBe(100);
      expect(diffData[3]).toBe(100);
    });

    it("should blend feathered edges", () => {
      const generator = new MaskGenerator();
      const mask = new Uint8Array([128, 255]); // 50% feathered
      const diffData = new Uint8Array([200, 200, 200, 200, 100, 100, 100, 100]);

      generator.applyMask(diffData, mask);

      // Check blended pixel
      expect(diffData[0]).toBe(100); // 200 * 0.5 + 0 * 0.5
      expect(diffData[1]).toBe(100);
      expect(diffData[2]).toBe(100);
      expect(diffData[3]).toBe(100);

      // Check unmasked pixel
      expect(diffData[4]).toBe(100);
    });
  });

  describe("createDebugImage", () => {
    it("should create a visual representation of the mask", () => {
      const generator = new MaskGenerator();
      const mask = new Uint8Array([0, 255, 128]);
      const debugImage = generator.createDebugImage(mask, 3, 1);

      // Check excluded pixel (red)
      expect(debugImage[0]).toBe(255); // R
      expect(debugImage[1]).toBe(0); // G
      expect(debugImage[2]).toBe(0); // B
      expect(debugImage[3]).toBe(255); // A

      // Check included pixel (green)
      expect(debugImage[4]).toBe(0); // R
      expect(debugImage[5]).toBe(255); // G
      expect(debugImage[6]).toBe(0); // B
      expect(debugImage[7]).toBe(255); // A

      // Check feathered pixel (yellow gradient)
      expect(debugImage[8]).toBe(255); // R
      expect(debugImage[9]).toBe(128); // G
      expect(debugImage[10]).toBe(0); // B
      expect(debugImage[11]).toBe(255); // A
    });
  });
});

describe("createMaskGenerator", () => {
  it("should create a mask generator with default options", () => {
    const generator = createMaskGenerator();
    expect(generator).toBeInstanceOf(MaskGenerator);
  });

  it("should create a mask generator with custom options", () => {
    const generator = createMaskGenerator({ padding: 10 });
    expect(generator).toBeInstanceOf(MaskGenerator);
  });
});

describe("isPixelExcluded", () => {
  const regions: ExclusionRegion[] = [
    {
      name: "test",
      bounds: { x: 10, y: 10, width: 20, height: 20 },
    },
  ];

  it("should return true for pixels inside exclusion regions", () => {
    expect(isPixelExcluded(15, 15, regions)).toBe(true);
    expect(isPixelExcluded(10, 10, regions)).toBe(true);
    expect(isPixelExcluded(29, 29, regions)).toBe(true);
  });

  it("should return false for pixels outside exclusion regions", () => {
    expect(isPixelExcluded(0, 0, regions)).toBe(false);
    expect(isPixelExcluded(30, 30, regions)).toBe(false);
    expect(isPixelExcluded(100, 100, regions)).toBe(false);
  });

  it("should account for padding", () => {
    expect(isPixelExcluded(9, 9, regions, 1)).toBe(true);
    expect(isPixelExcluded(30, 30, regions, 1)).toBe(true);
    expect(isPixelExcluded(8, 8, regions, 1)).toBe(false);
  });

  it("should handle multiple regions", () => {
    const multiRegions: ExclusionRegion[] = [
      { name: "r1", bounds: { x: 0, y: 0, width: 10, height: 10 } },
      { name: "r2", bounds: { x: 20, y: 20, width: 10, height: 10 } },
    ];

    expect(isPixelExcluded(5, 5, multiRegions)).toBe(true);
    expect(isPixelExcluded(25, 25, multiRegions)).toBe(true);
    expect(isPixelExcluded(15, 15, multiRegions)).toBe(false);
  });
});