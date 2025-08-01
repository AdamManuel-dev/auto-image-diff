/**
 * @fileoverview Tests for PNG metadata embedding
 * @lastmodified 2025-08-01T23:10:00Z
 */

import { PngMetadataEmbedder, EmbeddedMetadata } from "../lib/png-metadata";
import { ComparisonResult } from "../lib/imageProcessor";
import { ClassificationSummary } from "../lib/classifiers/manager";
import { EnhancedMetadata } from "../lib/metadata-enhancer";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

describe("PngMetadataEmbedder", () => {
  let embedder: PngMetadataEmbedder;
  let tempDir: string;
  let testPngPath: string;

  beforeEach(async () => {
    embedder = new PngMetadataEmbedder();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "png-metadata-test-"));
    testPngPath = path.join(tempDir, "test.png");

    // Create a minimal valid PNG (1x1 red pixel)
    const pngData = Buffer.from([
      // PNG signature
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      // IHDR chunk
      0x00,
      0x00,
      0x00,
      0x0d, // Length: 13
      0x49,
      0x48,
      0x44,
      0x52, // Type: IHDR
      0x00,
      0x00,
      0x00,
      0x01, // Width: 1
      0x00,
      0x00,
      0x00,
      0x01, // Height: 1
      0x08,
      0x02, // Bit depth: 8, Color type: 2 (RGB)
      0x00,
      0x00,
      0x00, // Compression, Filter, Interlace
      0x90,
      0x77,
      0x53,
      0xde, // CRC
      // IDAT chunk (compressed pixel data)
      0x00,
      0x00,
      0x00,
      0x0c, // Length: 12
      0x49,
      0x44,
      0x41,
      0x54, // Type: IDAT
      0x08,
      0xd7,
      0x63,
      0xf8,
      0xcf,
      0xc0,
      0x00,
      0x00,
      0x03,
      0x01,
      0x01,
      0x00, // Data
      0x18,
      0xdd,
      0x8d,
      0xb4, // CRC
      // IEND chunk
      0x00,
      0x00,
      0x00,
      0x00, // Length: 0
      0x49,
      0x45,
      0x4e,
      0x44, // Type: IEND
      0xae,
      0x42,
      0x60,
      0x82, // CRC
    ]);

    await fs.writeFile(testPngPath, pngData);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("embedMetadata", () => {
    it("should embed metadata into PNG file", async () => {
      const metadata: EmbeddedMetadata = {
        version: "1.0",
        timestamp: "2025-01-01T12:00:00Z",
        comparison: {
          source: {
            image1: "image1.png",
            image2: "image2.png",
          },
          statistics: {
            pixelsDifferent: 100,
            totalPixels: 1000,
            percentageDifferent: 10.0,
          },
        },
      };

      await embedder.embedMetadata(testPngPath, metadata);

      // Read back the file and check it's still a valid PNG
      const modifiedPng = await fs.readFile(testPngPath);
      expect(modifiedPng.slice(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

      // Check that metadata can be extracted
      const extracted = await embedder.extractMetadata(testPngPath);
      expect(extracted).toEqual(
        expect.objectContaining({
          version: "1.0",
          timestamp: "2025-01-01T12:00:00Z",
        })
      );
    });

    it("should reject non-PNG files", async () => {
      const nonPngPath = path.join(tempDir, "not-a-png.txt");
      await fs.writeFile(nonPngPath, "Not a PNG file");

      const mockMetadata: EmbeddedMetadata = {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        comparison: {
          source: {
            image1: "test1.png",
            image2: "test2.png",
          },
          statistics: {
            pixelsDifferent: 0,
            totalPixels: 100,
            percentageDifferent: 0,
          },
        },
      };
      await expect(embedder.embedMetadata(nonPngPath, mockMetadata)).rejects.toThrow(
        "File is not a valid PNG image"
      );
    });

    it("should overwrite existing metadata", async () => {
      const metadata1: EmbeddedMetadata = {
        version: "1.0",
        timestamp: "2025-01-01T12:00:00Z",
        comparison: {
          source: { image1: "a.png", image2: "b.png" },
          statistics: { pixelsDifferent: 50, totalPixels: 100, percentageDifferent: 50 },
        },
      };

      const metadata2: EmbeddedMetadata = {
        version: "1.1",
        timestamp: "2025-01-02T12:00:00Z",
        comparison: {
          source: { image1: "c.png", image2: "d.png" },
          statistics: { pixelsDifferent: 25, totalPixels: 100, percentageDifferent: 25 },
        },
      };

      await embedder.embedMetadata(testPngPath, metadata1);
      await embedder.embedMetadata(testPngPath, metadata2);

      const extracted = await embedder.extractMetadata(testPngPath);
      expect(extracted?.version).toBe("1.1");
      expect(extracted?.comparison.source.image1).toBe("c.png");
    });
  });

  describe("extractMetadata", () => {
    it("should return null for PNG without metadata", async () => {
      const result = await embedder.extractMetadata(testPngPath);
      expect(result).toBeNull();
    });

    it("should extract embedded metadata with classification", async () => {
      const metadata: EmbeddedMetadata = {
        version: "1.0",
        timestamp: "2025-01-01T12:00:00Z",
        comparison: {
          source: { image1: "a.png", image2: "b.png" },
          statistics: { pixelsDifferent: 100, totalPixels: 1000, percentageDifferent: 10 },
        },
        classification: {
          totalRegions: 5,
          classifiedRegions: 4,
          byType: { content: 2, style: 1, layout: 1 },
          confidence: { min: 0.7, avg: 0.85, max: 0.95 },
        },
        regions: [
          {
            id: 1,
            bounds: { x: 10, y: 20, width: 30, height: 40 },
            type: "content",
            confidence: 0.9,
            classifier: "text",
          },
        ],
      };

      await embedder.embedMetadata(testPngPath, metadata);
      const extracted = await embedder.extractMetadata(testPngPath);

      expect(extracted).toEqual(expect.objectContaining(metadata));
    });
  });

  describe("createMetadataFromResult", () => {
    it("should create metadata from comparison result", () => {
      const result: ComparisonResult = {
        difference: 5.0,
        isEqual: false,
        statistics: {
          pixelsDifferent: 500,
          totalPixels: 10000,
          percentageDifferent: 5.0,
        },
      };

      const classification: ClassificationSummary = {
        totalRegions: 3,
        classifiedRegions: 3,
        unclassifiedRegions: 0,
        byType: { content: 2, style: 1, layout: 0, text: 0, unknown: 0 },
        confidence: { min: 0.8, avg: 0.9, max: 0.95 },
        regions: [
          {
            region: {
              id: 1,
              bounds: { x: 0, y: 0, width: 100, height: 100 },
            },
            classification: {
              type: "content",
              confidence: 0.9,
            },
            classifier: "text",
          },
        ],
      };

      const metadata = embedder.createMetadataFromResult(
        result,
        "image1.png",
        "image2.png",
        classification
      );

      expect(metadata.version).toBe("1.1");
      expect(metadata.comparison.source.image1).toBe("image1.png");
      expect(metadata.comparison.statistics.pixelsDifferent).toBe(500);
      expect(metadata.classification?.totalRegions).toBe(3);
      expect(metadata.regions?.length).toBe(1);
      expect(metadata.checksum).toBeDefined();
    });

    it("should include enhanced metadata when provided", () => {
      const enhancedMetadata = {
        git: { commit: "abc123", branch: "main" },
        environment: { platform: "darwin", nodeVersion: "v20.0.0" },
      };

      const metadata = embedder.createMetadataFromResult(
        {
          difference: 0,
          isEqual: true,
          statistics: { pixelsDifferent: 0, totalPixels: 100, percentageDifferent: 0 },
        } as ComparisonResult,
        "a.png",
        "b.png",
        undefined,
        enhancedMetadata as EnhancedMetadata
      );

      expect(metadata.enhanced).toEqual(enhancedMetadata);
    });
  });

  describe("verifyMetadata", () => {
    it("should verify metadata integrity", () => {
      const metadata: EmbeddedMetadata = {
        version: "1.0",
        timestamp: "2025-01-01T12:00:00Z",
        comparison: {
          source: { image1: "a.png", image2: "b.png" },
          statistics: { pixelsDifferent: 0, totalPixels: 100, percentageDifferent: 0 },
        },
        checksum: "invalidchecksum",
      };

      expect(embedder.verifyMetadata(metadata)).toBe(false);
    });

    it("should pass verification for valid checksum", async () => {
      const metadata = embedder.createMetadataFromResult(
        {
          statistics: { pixelsDifferent: 0, totalPixels: 100, percentageDifferent: 0 },
        } as ComparisonResult,
        "a.png",
        "b.png"
      );

      expect(embedder.verifyMetadata(metadata)).toBe(true);
    });

    it("should return true for metadata without checksum", () => {
      const metadata: EmbeddedMetadata = {
        version: "1.0",
        timestamp: "2025-01-01T12:00:00Z",
        comparison: {
          source: { image1: "a.png", image2: "b.png" },
          statistics: { pixelsDifferent: 0, totalPixels: 100, percentageDifferent: 0 },
        },
      };

      expect(embedder.verifyMetadata(metadata)).toBe(true);
    });
  });

  describe("generateMetadataReport", () => {
    it("should generate comprehensive report", () => {
      const metadata: EmbeddedMetadata = {
        version: "1.1",
        timestamp: "2025-01-01T12:00:00Z",
        comparison: {
          source: { image1: "before.png", image2: "after.png" },
          statistics: { pixelsDifferent: 1500, totalPixels: 10000, percentageDifferent: 15.0 },
        },
        classification: {
          totalRegions: 10,
          classifiedRegions: 9,
          byType: { content: 5, style: 3, layout: 1 },
          confidence: { min: 0.6, avg: 0.82, max: 0.98 },
        },
        regions: [
          {
            id: 1,
            bounds: { x: 10, y: 20, width: 100, height: 50 },
            type: "content",
            confidence: 0.95,
            classifier: "text",
          },
          {
            id: 2,
            bounds: { x: 200, y: 100, width: 80, height: 80 },
            type: "style",
            confidence: 0.88,
            classifier: "color",
          },
        ],
        enhanced: {
          git: { commit: "abc123def", branch: "feature/test", isDirty: false },
          environment: {
            platform: "darwin",
            arch: "arm64",
            nodeVersion: "v20.0.0",
            imageMagickVersion: "7.1.2",
          },
          executionTime: { duration: 2500 },
        } as EnhancedMetadata,
        checksum: "abcd1234",
      };

      const report = embedder.generateMetadataReport(metadata);

      // Basic info
      expect(report).toContain("Version: 1.1");
      expect(report).toContain("Checksum: abcd1234");

      // Comparison data
      expect(report).toContain("Source Image 1: before.png");
      expect(report).toContain("Pixels Different: 1,500");
      expect(report).toContain("Percentage Different: 15.00%");

      // Classification
      expect(report).toContain("Total Regions: 10");
      expect(report).toContain("Average Confidence: 82.0%");
      expect(report).toContain("content: 5");

      // Regions
      expect(report).toContain("Region #1:");
      expect(report).toContain("Type: content");
      expect(report).toContain("Bounds: (10, 20) 100x50");

      // Enhanced metadata
      expect(report).toContain("Git Commit: abc123de");
      expect(report).toContain("Git Branch: feature/test");
      expect(report).toContain("Platform: darwin arm64");
      expect(report).toContain("Execution Time: 2.5s");
    });

    it("should handle minimal metadata", () => {
      const metadata: EmbeddedMetadata = {
        version: "1.0",
        timestamp: "2025-01-01T12:00:00Z",
        comparison: {
          source: { image1: "a.png", image2: "b.png" },
          statistics: { pixelsDifferent: 0, totalPixels: 100, percentageDifferent: 0 },
        },
      };

      const report = embedder.generateMetadataReport(metadata);

      expect(report).toContain("PNG Metadata Report");
      expect(report).toContain("Version: 1.0");
      expect(report).not.toContain("Classification Summary:");
      expect(report).not.toContain("Region Details:");
      expect(report).not.toContain("Enhanced Metadata:");
    });
  });
});
