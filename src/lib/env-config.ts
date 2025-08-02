/**
 * @fileoverview Environment configuration validation and loading
 * @lastmodified 2025-08-02T00:00:00Z
 *
 * Features: Environment validation, type-safe config, default values
 * Main APIs: loadConfig(), validateConfig(), getConfig()
 * Constraints: Requires valid .env file or defaults
 * Patterns: Singleton pattern, validation on load
 */

import * as dotenv from "dotenv";

interface Config {
  // Node Environment
  nodeEnv: "development" | "production" | "test";

  // Logging
  logLevel: "debug" | "info" | "warn" | "error";
  logFormat: "json" | "text";

  // Performance
  maxWorkers: number;
  batchSize: number;
  memoryLimit: number;

  // Image Processing
  imageQuality: number;
  maxImageSize: number;
  diffThreshold: number;

  // Output
  outputDir: string;
  enableHtmlReports: boolean;
  enableJsonReports: boolean;

  // Cache
  enableCache: boolean;
  cacheDir: string;
  cacheTTL: number;

  // Debug
  debugMode: boolean;
  verboseOutput: boolean;
}

class EnvConfig {
  private static instance: EnvConfig;
  private config: Config | null = null;

  private constructor() {}

  static getInstance(): EnvConfig {
    if (!EnvConfig.instance) {
      EnvConfig.instance = new EnvConfig();
    }
    return EnvConfig.instance;
  }

  loadConfig(): Config {
    if (this.config) {
      return this.config;
    }

    // Load .env file using dotenv
    dotenv.config();

    // Build config from environment variables with defaults
    this.config = {
      nodeEnv: (process.env.NODE_ENV as Config["nodeEnv"]) || "development",
      logLevel: (process.env.LOG_LEVEL as Config["logLevel"]) || "info",
      logFormat: (process.env.LOG_FORMAT as Config["logFormat"]) || "json",
      maxWorkers: parseInt(process.env.MAX_WORKERS || "4", 10),
      batchSize: parseInt(process.env.BATCH_SIZE || "10", 10),
      memoryLimit: parseInt(process.env.MEMORY_LIMIT || "4096", 10),
      imageQuality: parseInt(process.env.IMAGE_QUALITY || "85", 10),
      maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE || "10485760", 10),
      diffThreshold: parseFloat(process.env.DIFF_THRESHOLD || "0.1"),
      outputDir: process.env.OUTPUT_DIR || "./output",
      enableHtmlReports: process.env.ENABLE_HTML_REPORTS !== "false",
      enableJsonReports: process.env.ENABLE_JSON_REPORTS !== "false",
      enableCache: process.env.ENABLE_CACHE !== "false",
      cacheDir: process.env.CACHE_DIR || "./cache",
      cacheTTL: parseInt(process.env.CACHE_TTL || "86400", 10),
      debugMode: process.env.DEBUG_MODE === "true",
      verboseOutput: process.env.VERBOSE_OUTPUT === "true",
    };

    this.validateConfig(this.config);
    return this.config;
  }

  private validateConfig(config: Config): void {
    const errors: string[] = [];

    // Validate numeric ranges
    if (config.maxWorkers < 1 || config.maxWorkers > 32) {
      errors.push("MAX_WORKERS must be between 1 and 32");
    }

    if (config.batchSize < 1 || config.batchSize > 100) {
      errors.push("BATCH_SIZE must be between 1 and 100");
    }

    if (config.memoryLimit < 512 || config.memoryLimit > 16384) {
      errors.push("MEMORY_LIMIT must be between 512 and 16384 MB");
    }

    if (config.imageQuality < 1 || config.imageQuality > 100) {
      errors.push("IMAGE_QUALITY must be between 1 and 100");
    }

    if (config.diffThreshold < 0 || config.diffThreshold > 1) {
      errors.push("DIFF_THRESHOLD must be between 0 and 1");
    }

    // Validate paths
    if (!config.outputDir) {
      errors.push("OUTPUT_DIR must not be empty");
    }

    if (!config.cacheDir) {
      errors.push("CACHE_DIR must not be empty");
    }

    if (errors.length > 0) {
      throw new Error(`Environment configuration errors:\n${errors.join("\n")}`);
    }
  }

  getConfig(): Config {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config as Config;
  }

  // Helper method to get single config value
  get<K extends keyof Config>(key: K): Config[K] {
    return this.getConfig()[key];
  }
}

// Export singleton instance
export const envConfig = EnvConfig.getInstance();
export type { Config };

// Export convenience functions
export const loadConfig = (): Config => envConfig.loadConfig();
export const getConfig = (): Config => envConfig.getConfig();
export const get = <K extends keyof Config>(key: K): Config[K] => envConfig.get(key);
