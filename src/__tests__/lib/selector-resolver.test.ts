/**
 * @fileoverview Tests for CSS selector resolver
 * @lastmodified 2025-08-01T17:05:00Z
 */

import { SelectorResolver } from "../../lib/selector-resolver";
import { ExclusionRegion } from "../../lib/exclusions";

describe("SelectorResolver", () => {
  let resolver: SelectorResolver;

  beforeEach(() => {
    resolver = new SelectorResolver();
    // Suppress console warnings in tests
    jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("resolveExclusionRegions", () => {
    it("should pass through regions without selectors", async () => {
      const regions: ExclusionRegion[] = [
        {
          name: "manual-region",
          bounds: { x: 10, y: 20, width: 100, height: 50 },
        },
      ];

      const resolved = await resolver.resolveExclusionRegions(regions);
      expect(resolved).toEqual(regions);
    });

    it("should fallback to manual bounds when selector resolution fails", async () => {
      const regions: ExclusionRegion[] = [
        {
          name: "with-selector",
          selector: ".some-class",
          bounds: { x: 10, y: 20, width: 100, height: 50 },
        },
      ];

      const resolved = await resolver.resolveExclusionRegions(regions);
      expect(resolved).toEqual(regions);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("CSS selector resolution not implemented")
      );
    });

    it("should skip regions with only selector when fallback is disabled", async () => {
      resolver = new SelectorResolver({ fallbackToBounds: false });
      
      const regions: ExclusionRegion[] = [
        {
          name: "only-selector",
          selector: ".some-class",
          bounds: { x: 0, y: 0, width: 0, height: 0 },
        },
      ];

      const resolved = await resolver.resolveExclusionRegions(regions);
      expect(resolved).toHaveLength(0);
    });

    it("should handle mixed regions", async () => {
      const regions: ExclusionRegion[] = [
        {
          name: "manual-only",
          bounds: { x: 10, y: 20, width: 100, height: 50 },
        },
        {
          name: "with-selector",
          selector: ".some-class",
          bounds: { x: 50, y: 60, width: 200, height: 100 },
        },
      ];

      const resolved = await resolver.resolveExclusionRegions(regions);
      expect(resolved).toHaveLength(2);
    });
  });

  describe("validateBounds", () => {
    it("should validate bounds within viewport", () => {
      const validBounds = { x: 10, y: 10, width: 100, height: 100 };
      expect(resolver.validateBounds(validBounds)).toBe(true);
    });

    it("should reject bounds outside viewport", () => {
      resolver = new SelectorResolver({ viewport: { width: 800, height: 600 } });
      
      const invalidBounds = { x: 700, y: 500, width: 200, height: 200 };
      expect(resolver.validateBounds(invalidBounds)).toBe(false);
    });

    it("should accept any bounds when viewport is not set", () => {
      resolver = new SelectorResolver({ viewport: undefined });
      
      const bounds = { x: 5000, y: 5000, width: 100, height: 100 };
      expect(resolver.validateBounds(bounds)).toBe(true);
    });
  });

  describe("mergeOverlappingRegions", () => {
    it("should not merge non-overlapping regions", () => {
      const regions: ExclusionRegion[] = [
        {
          name: "region1",
          bounds: { x: 0, y: 0, width: 100, height: 100 },
        },
        {
          name: "region2",
          bounds: { x: 200, y: 200, width: 100, height: 100 },
        },
      ];

      const merged = resolver.mergeOverlappingRegions(regions);
      expect(merged).toHaveLength(2);
      expect(merged[0].name).toBe("region1");
      expect(merged[1].name).toBe("region2");
    });

    it("should merge overlapping regions", () => {
      const regions: ExclusionRegion[] = [
        {
          name: "region1",
          bounds: { x: 0, y: 0, width: 100, height: 100 },
        },
        {
          name: "region2",
          bounds: { x: 50, y: 50, width: 100, height: 100 },
        },
      ];

      const merged = resolver.mergeOverlappingRegions(regions);
      expect(merged).toHaveLength(1);
      expect(merged[0].name).toBe("region1 + region2");
      expect(merged[0].bounds).toEqual({
        x: 0,
        y: 0,
        width: 150,
        height: 150,
      });
    });

    it("should merge multiple overlapping regions", () => {
      const regions: ExclusionRegion[] = [
        {
          name: "region1",
          bounds: { x: 0, y: 0, width: 100, height: 100 },
        },
        {
          name: "region2",
          bounds: { x: 50, y: 0, width: 100, height: 100 },
        },
        {
          name: "region3",
          bounds: { x: 100, y: 0, width: 100, height: 100 },
        },
        {
          name: "region4",
          bounds: { x: 300, y: 300, width: 100, height: 100 },
        },
      ];

      const merged = resolver.mergeOverlappingRegions(regions);
      expect(merged).toHaveLength(2);
      
      // First merged group
      expect(merged[0].name).toBe("region1 + region2 + region3");
      expect(merged[0].bounds).toEqual({
        x: 0,
        y: 0,
        width: 200,
        height: 100,
      });
      
      // Standalone region
      expect(merged[1].name).toBe("region4");
    });

    it("should handle adjacent but non-overlapping regions", () => {
      const regions: ExclusionRegion[] = [
        {
          name: "region1",
          bounds: { x: 0, y: 0, width: 100, height: 100 },
        },
        {
          name: "region2",
          bounds: { x: 100, y: 0, width: 100, height: 100 },
        },
      ];

      const merged = resolver.mergeOverlappingRegions(regions);
      expect(merged).toHaveLength(2);
    });
  });

  describe("resolveSelectorToBounds", () => {
    it("should return null for placeholder implementation", async () => {
      const result = await resolver.resolveSelectorToBounds(".test-selector");
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("CSS selector resolution not implemented")
      );
    });
  });
});