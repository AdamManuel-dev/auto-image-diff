/**
 * @fileoverview Smart file pairing algorithm for batch processing
 * @lastmodified 2025-08-01T18:30:00Z
 *
 * Features: Fuzzy matching, similarity scoring, best match finding
 * Main APIs: SmartPairing class, findBestPairs()
 * Constraints: Optimized for UI screenshot matching
 * Patterns: Similarity scoring, fuzzy string matching
 */

import * as path from "path";

export interface FilePair {
  reference: string;
  target: string;
  similarity: number;
  relativePath: string;
}

export interface PairingOptions {
  minSimilarity?: number;
  caseSensitive?: boolean;
  ignoreExtensions?: boolean;
  fuzzyMatch?: boolean;
}

export class SmartPairing {
  private options: PairingOptions;

  constructor(options: PairingOptions = {}) {
    this.options = {
      minSimilarity: 0.7,
      caseSensitive: false,
      ignoreExtensions: false,
      fuzzyMatch: true,
      ...options,
    };
  }

  /**
   * Find best pairs between reference and target files
   */
  findBestPairs(
    referenceFiles: string[],
    targetFiles: string[],
    referenceDir: string,
    targetDir: string
  ): FilePair[] {
    const pairs: FilePair[] = [];
    const usedTargets = new Set<string>();

    // Process each reference file
    for (const refFile of referenceFiles) {
      const refRelative = path.relative(referenceDir, refFile);
      const refName = this.normalizeFilename(refRelative);

      let bestMatch: { file: string; similarity: number } | null = null;

      // Find best matching target
      for (const targetFile of targetFiles) {
        if (usedTargets.has(targetFile)) continue;

        const targetRelative = path.relative(targetDir, targetFile);
        const targetName = this.normalizeFilename(targetRelative);

        const similarity = this.calculateSimilarity(refName, targetName);

        if (similarity >= (this.options.minSimilarity || 0.7)) {
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = { file: targetFile, similarity };
          }
        }
      }

      if (bestMatch) {
        usedTargets.add(bestMatch.file);
        pairs.push({
          reference: refFile,
          target: bestMatch.file,
          similarity: bestMatch.similarity,
          relativePath: refRelative,
        });
      }
    }

    return pairs.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Normalize filename for comparison
   */
  private normalizeFilename(filename: string): string {
    let normalized = filename;

    if (this.options.ignoreExtensions) {
      normalized = normalized.replace(/\.[^.]+$/, "");
    }

    if (!this.options.caseSensitive) {
      normalized = normalized.toLowerCase();
    }

    // Replace common separators with a standard one
    normalized = normalized.replace(/[-_. ]+/g, "_");

    return normalized;
  }

  /**
   * Calculate similarity between two filenames
   */
  private calculateSimilarity(name1: string, name2: string): number {
    if (name1 === name2) return 1.0;

    if (!this.options.fuzzyMatch) {
      return 0.0;
    }

    // Use multiple strategies
    const strategies = [
      this.exactMatchScore(name1, name2),
      this.prefixMatchScore(name1, name2),
      this.suffixMatchScore(name1, name2),
      this.levenshteinScore(name1, name2),
      this.tokenMatchScore(name1, name2),
    ];

    // Return weighted average
    const weights = [5, 3, 3, 2, 2];
    let totalScore = 0;
    let totalWeight = 0;

    for (let i = 0; i < strategies.length; i++) {
      totalScore += strategies[i] * weights[i];
      totalWeight += weights[i];
    }

    return totalScore / totalWeight;
  }

  /**
   * Exact match score
   */
  private exactMatchScore(name1: string, name2: string): number {
    return name1 === name2 ? 1.0 : 0.0;
  }

  /**
   * Prefix match score
   */
  private prefixMatchScore(name1: string, name2: string): number {
    const minLength = Math.min(name1.length, name2.length);
    let commonPrefix = 0;

    for (let i = 0; i < minLength; i++) {
      if (name1[i] === name2[i]) {
        commonPrefix++;
      } else {
        break;
      }
    }

    return commonPrefix / Math.max(name1.length, name2.length);
  }

  /**
   * Suffix match score
   */
  private suffixMatchScore(name1: string, name2: string): number {
    const minLength = Math.min(name1.length, name2.length);
    let commonSuffix = 0;

    for (let i = 1; i <= minLength; i++) {
      if (name1[name1.length - i] === name2[name2.length - i]) {
        commonSuffix++;
      } else {
        break;
      }
    }

    return commonSuffix / Math.max(name1.length, name2.length);
  }

  /**
   * Levenshtein distance-based score
   */
  private levenshteinScore(name1: string, name2: string): number {
    const distance = this.levenshteinDistance(name1, name2);
    const maxLength = Math.max(name1.length, name2.length);
    return 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0) as number[]);

    // Initialize base cases
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill the DP table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] =
            1 +
            Math.min(
              dp[i - 1][j], // deletion
              dp[i][j - 1], // insertion
              dp[i - 1][j - 1] // substitution
            );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Token-based matching score
   */
  private tokenMatchScore(name1: string, name2: string): number {
    const tokens1 = this.tokenize(name1);
    const tokens2 = this.tokenize(name2);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    let commonTokens = 0;
    for (const token of set1) {
      if (set2.has(token)) {
        commonTokens++;
      }
    }

    const totalTokens = Math.max(set1.size, set2.size);
    return commonTokens / totalTokens;
  }

  /**
   * Tokenize a string
   */
  private tokenize(str: string): string[] {
    return str
      .split(/[^a-zA-Z0-9]+/)
      .filter((token) => token.length > 0)
      .map((token) => (this.options.caseSensitive ? token : token.toLowerCase()));
  }

  /**
   * Find unpaired files
   */
  findUnpairedFiles(
    referenceFiles: string[],
    targetFiles: string[],
    pairs: FilePair[]
  ): {
    unpairedReference: string[];
    unpairedTarget: string[];
  } {
    const pairedReference = new Set(pairs.map((p) => p.reference));
    const pairedTarget = new Set(pairs.map((p) => p.target));

    return {
      unpairedReference: referenceFiles.filter((f) => !pairedReference.has(f)),
      unpairedTarget: targetFiles.filter((f) => !pairedTarget.has(f)),
    };
  }

  /**
   * Generate pairing report
   */
  generatePairingReport(
    pairs: FilePair[],
    unpaired: { unpairedReference: string[]; unpairedTarget: string[] }
  ): string {
    const lines: string[] = [
      "=== Smart Pairing Report ===",
      "",
      `Total pairs found: ${pairs.length}`,
      `Unpaired reference files: ${unpaired.unpairedReference.length}`,
      `Unpaired target files: ${unpaired.unpairedTarget.length}`,
      "",
    ];

    if (pairs.length > 0) {
      lines.push("Matched Pairs (sorted by similarity):");
      lines.push("-----------------------------------");

      for (const pair of pairs) {
        const refName = path.basename(pair.reference);
        const targetName = path.basename(pair.target);
        lines.push(`${(pair.similarity * 100).toFixed(1)}% | ${refName} <-> ${targetName}`);
      }
      lines.push("");
    }

    if (unpaired.unpairedReference.length > 0) {
      lines.push("Unpaired Reference Files:");
      lines.push("------------------------");
      for (const file of unpaired.unpairedReference) {
        lines.push(`- ${path.basename(file)}`);
      }
      lines.push("");
    }

    if (unpaired.unpairedTarget.length > 0) {
      lines.push("Unpaired Target Files:");
      lines.push("---------------------");
      for (const file of unpaired.unpairedTarget) {
        lines.push(`- ${path.basename(file)}`);
      }
    }

    return lines.join("\n");
  }
}
