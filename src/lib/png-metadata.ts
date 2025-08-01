/**
 * @fileoverview PNG metadata embedding for comparison results
 * @lastmodified 2025-08-01T20:30:00Z
 *
 * Features: Embed classification data, statistics, and regions into PNG metadata
 * Main APIs: PngMetadataEmbedder class, embedMetadata(), extractMetadata()
 * Constraints: Works with PNG format only
 * Patterns: Uses PNG chunks for metadata storage
 */

import * as fs from "fs/promises";
import * as crypto from "crypto";
import { ComparisonResult } from "./imageProcessor";
import { ClassificationSummary } from "./classifiers/manager";
import { EnhancedMetadata } from "./metadata-enhancer";

interface PngChunk {
  type: string;
  data: Buffer;
}

export interface EmbeddedMetadata {
  version: string;
  timestamp: string;
  enhanced?: EnhancedMetadata;
  comparison: {
    source: {
      image1: string;
      image2: string;
    };
    statistics: {
      pixelsDifferent: number;
      totalPixels: number;
      percentageDifferent: number;
    };
    threshold?: number;
  };
  classification?: {
    totalRegions: number;
    classifiedRegions: number;
    byType: Record<string, number>;
    confidence: {
      min: number;
      avg: number;
      max: number;
    };
  };
  regions?: Array<{
    id: number;
    bounds: { x: number; y: number; width: number; height: number };
    type: string;
    confidence: number;
    classifier: string;
  }>;
  checksum?: string;
}

export class PngMetadataEmbedder {
  private readonly PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  private readonly CHUNK_TYPE_METADATA = "tEXt"; // Standard text chunk
  private readonly CHUNK_TYPE_COMPRESSED = "zTXt"; // Compressed text chunk
  private readonly METADATA_KEY = "AutoImageDiff";

  /**
   * Embed metadata into a PNG file
   */
  async embedMetadata(
    pngPath: string,
    metadata: EmbeddedMetadata,
    outputPath?: string
  ): Promise<void> {
    const imageData = await fs.readFile(pngPath);

    // Verify PNG signature
    if (!this.isPng(imageData)) {
      throw new Error("File is not a valid PNG image");
    }

    // Parse existing chunks
    const chunks = this.parseChunks(imageData);

    // Remove any existing metadata chunks
    const filteredChunks = chunks.filter(
      (chunk) =>
        !(chunk.type === this.CHUNK_TYPE_METADATA && this.isOurMetadata(chunk)) &&
        !(chunk.type === this.CHUNK_TYPE_COMPRESSED && this.isOurMetadata(chunk))
    );

    // Create metadata chunk
    const metadataChunk = this.createMetadataChunk(metadata);

    // Insert metadata chunk before IEND
    const iendIndex = filteredChunks.findIndex((chunk) => chunk.type === "IEND");
    if (iendIndex === -1) {
      throw new Error("Invalid PNG: No IEND chunk found");
    }

    filteredChunks.splice(iendIndex, 0, metadataChunk);

    // Rebuild PNG
    const outputBuffer = this.buildPng(filteredChunks);

    // Write to output
    await fs.writeFile(outputPath || pngPath, outputBuffer);
  }

  /**
   * Extract metadata from a PNG file
   */
  async extractMetadata(pngPath: string): Promise<EmbeddedMetadata | null> {
    const imageData = await fs.readFile(pngPath);

    if (!this.isPng(imageData)) {
      throw new Error("File is not a valid PNG image");
    }

    const chunks = this.parseChunks(imageData);

    // Find our metadata chunk
    const metadataChunk = chunks.find(
      (chunk) =>
        (chunk.type === this.CHUNK_TYPE_METADATA || chunk.type === this.CHUNK_TYPE_COMPRESSED) &&
        this.isOurMetadata(chunk)
    );

    if (!metadataChunk) {
      return null;
    }

    // Extract and parse metadata
    const metadataText = this.extractTextFromChunk(metadataChunk);
    const keyValue = metadataText.split("\0");

    if (keyValue.length >= 2 && keyValue[0] === this.METADATA_KEY) {
      try {
        return JSON.parse(keyValue[1]) as EmbeddedMetadata;
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Create metadata from comparison result
   */
  createMetadataFromResult(
    result: ComparisonResult,
    image1Path: string,
    image2Path: string,
    classification?: ClassificationSummary,
    enhancedMetadata?: EnhancedMetadata
  ): EmbeddedMetadata {
    const metadata: EmbeddedMetadata = {
      version: "1.1",
      timestamp: new Date().toISOString(),
      enhanced: enhancedMetadata,
      comparison: {
        source: {
          image1: image1Path,
          image2: image2Path,
        },
        statistics: {
          pixelsDifferent: result.statistics.pixelsDifferent,
          totalPixels: result.statistics.totalPixels,
          percentageDifferent: result.statistics.percentageDifferent,
        },
      },
    };

    // Add classification data if available
    if (classification) {
      metadata.classification = {
        totalRegions: classification.totalRegions,
        classifiedRegions: classification.classifiedRegions,
        byType: classification.byType as Record<string, number>,
        confidence: {
          min: classification.confidence.min,
          avg: classification.confidence.avg,
          max: classification.confidence.max,
        },
      };

      // Add region details
      metadata.regions = classification.regions.map((r) => ({
        id: r.region.id,
        bounds: r.region.bounds,
        type: r.classification.type,
        confidence: r.classification.confidence,
        classifier: r.classifier,
      }));
    }

    // Add checksum for integrity
    metadata.checksum = this.calculateChecksum(metadata);

    return metadata;
  }

  /**
   * Check if buffer is a PNG
   */
  private isPng(buffer: Buffer): boolean {
    return buffer.slice(0, 8).equals(this.PNG_SIGNATURE);
  }

  /**
   * Parse PNG chunks
   */
  private parseChunks(buffer: Buffer): PngChunk[] {
    const chunks: PngChunk[] = [];
    let offset = 8; // Skip PNG signature

    while (offset < buffer.length) {
      // Read chunk length (4 bytes)
      const length = buffer.readUInt32BE(offset);
      offset += 4;

      // Read chunk type (4 bytes)
      const type = buffer.toString("ascii", offset, offset + 4);
      offset += 4;

      // Read chunk data
      const data = buffer.slice(offset, offset + length);
      offset += length;

      // Skip CRC (4 bytes)
      offset += 4;

      chunks.push({ type, data });

      // Stop at IEND
      if (type === "IEND") break;
    }

    return chunks;
  }

  /**
   * Build PNG from chunks
   */
  private buildPng(chunks: PngChunk[]): Buffer {
    const buffers: Buffer[] = [this.PNG_SIGNATURE];

    for (const chunk of chunks) {
      // Length
      const lengthBuffer = Buffer.allocUnsafe(4);
      lengthBuffer.writeUInt32BE(chunk.data.length, 0);
      buffers.push(lengthBuffer);

      // Type
      buffers.push(Buffer.from(chunk.type, "ascii"));

      // Data
      buffers.push(chunk.data);

      // CRC
      const crcData = Buffer.concat([Buffer.from(chunk.type, "ascii"), chunk.data]);
      const crc = this.calculateCrc(crcData);
      const crcBuffer = Buffer.allocUnsafe(4);
      crcBuffer.writeUInt32BE(crc, 0);
      buffers.push(crcBuffer);
    }

    return Buffer.concat(buffers);
  }

  /**
   * Create metadata chunk
   */
  private createMetadataChunk(metadata: EmbeddedMetadata): PngChunk {
    const metadataJson = JSON.stringify(metadata);
    const textData = `${this.METADATA_KEY}\0${metadataJson}`;

    // Use compressed chunk if metadata is large
    if (textData.length > 1024) {
      // For now, we'll use uncompressed text chunks
      // zTXt implementation would require zlib compression
    }

    return {
      type: this.CHUNK_TYPE_METADATA,
      data: Buffer.from(textData, "latin1"),
    };
  }

  /**
   * Check if chunk contains our metadata
   */
  private isOurMetadata(chunk: PngChunk): boolean {
    const text = this.extractTextFromChunk(chunk);
    return text.startsWith(this.METADATA_KEY);
  }

  /**
   * Extract text from chunk
   */
  private extractTextFromChunk(chunk: PngChunk): string {
    if (chunk.type === this.CHUNK_TYPE_METADATA) {
      return chunk.data.toString("latin1");
    } else if (chunk.type === this.CHUNK_TYPE_COMPRESSED) {
      // zTXt chunks would need decompression
      // For now, we only support tEXt chunks
      return "";
    }
    return "";
  }

  /**
   * Calculate CRC32
   */
  private calculateCrc(data: Buffer): number {
    // CRC32 table
    const crcTable = this.getCrcTable();
    let crc = 0xffffffff;

    for (let i = 0; i < data.length; i++) {
      crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
  }

  /**
   * Get CRC32 table
   */
  private getCrcTable(): Uint32Array {
    const table = new Uint32Array(256);

    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c;
    }

    return table;
  }

  /**
   * Calculate checksum for metadata
   */
  private calculateChecksum(metadata: Omit<EmbeddedMetadata, "checksum">): string {
    const dataString = JSON.stringify(metadata);
    return crypto.createHash("sha256").update(dataString).digest("hex").slice(0, 16);
  }

  /**
   * Verify metadata integrity
   */
  verifyMetadata(metadata: EmbeddedMetadata): boolean {
    if (!metadata.checksum) return true; // No checksum to verify

    const { checksum, ...dataWithoutChecksum } = metadata;
    const calculatedChecksum = this.calculateChecksum(dataWithoutChecksum);

    return checksum === calculatedChecksum;
  }

  /**
   * Generate metadata report
   */
  generateMetadataReport(metadata: EmbeddedMetadata): string {
    const lines: string[] = [
      "=== PNG Metadata Report ===",
      "",
      `Version: ${metadata.version}`,
      `Timestamp: ${new Date(metadata.timestamp).toLocaleString()}`,
      `Checksum: ${metadata.checksum || "N/A"}`,
      "",
      "Comparison Data:",
      `--------------`,
      `Source Image 1: ${metadata.comparison.source.image1}`,
      `Source Image 2: ${metadata.comparison.source.image2}`,
      `Pixels Different: ${metadata.comparison.statistics.pixelsDifferent.toLocaleString()}`,
      `Total Pixels: ${metadata.comparison.statistics.totalPixels.toLocaleString()}`,
      `Percentage Different: ${metadata.comparison.statistics.percentageDifferent.toFixed(2)}%`,
      "",
    ];

    if (metadata.classification) {
      lines.push(
        "Classification Summary:",
        "---------------------",
        `Total Regions: ${metadata.classification.totalRegions}`,
        `Classified Regions: ${metadata.classification.classifiedRegions}`,
        `Average Confidence: ${(metadata.classification.confidence.avg * 100).toFixed(1)}%`,
        "",
        "Types Distribution:"
      );

      for (const [type, count] of Object.entries(metadata.classification.byType)) {
        lines.push(`  - ${type}: ${count}`);
      }
      lines.push("");
    }

    if (metadata.regions && metadata.regions.length > 0) {
      lines.push(
        `Region Details (${metadata.regions.length} regions):`,
        "-----------------------------------"
      );

      for (const region of metadata.regions.slice(0, 5)) {
        lines.push(
          `Region #${region.id}:`,
          `  Type: ${region.type}`,
          `  Bounds: (${region.bounds.x}, ${region.bounds.y}) ${region.bounds.width}x${region.bounds.height}`,
          `  Confidence: ${(region.confidence * 100).toFixed(1)}%`,
          `  Classifier: ${region.classifier}`,
          ""
        );
      }

      if (metadata.regions.length > 5) {
        lines.push(`... and ${metadata.regions.length - 5} more regions`);
      }
    }

    // Enhanced metadata section
    if (metadata.enhanced) {
      lines.push("");
      lines.push("Enhanced Metadata:");
      lines.push("-----------------");

      if (metadata.enhanced.git) {
        const git = metadata.enhanced.git;
        lines.push(`Git Commit: ${git.commit?.substring(0, 8) || "N/A"}`);
        lines.push(`Git Branch: ${git.branch || "N/A"}`);
        lines.push(`Git Status: ${git.isDirty ? "Modified" : "Clean"}`);
      }

      if (metadata.enhanced.environment) {
        const env = metadata.enhanced.environment;
        lines.push(`Platform: ${env.platform} ${env.arch}`);
        lines.push(`Node Version: ${env.nodeVersion}`);
        lines.push(`ImageMagick: ${env.imageMagickVersion || "N/A"}`);
      }

      if (metadata.enhanced.executionTime) {
        const exec = metadata.enhanced.executionTime;
        if (exec.duration) {
          lines.push(`Execution Time: ${this.formatDuration(exec.duration)}`);
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}
