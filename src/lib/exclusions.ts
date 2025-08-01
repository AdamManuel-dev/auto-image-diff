/**
 * @fileoverview Region exclusion system for auto-image-diff
 * @lastmodified 2025-08-01T09:20:00Z
 * 
 * Features: Define and parse exclusion regions, validate JSON schema
 * Main APIs: parseExclusionFile(), validateExclusions(), ExclusionRegion interface
 * Constraints: Requires valid JSON format, bounds must be positive
 * Patterns: Returns validated regions array, throws on invalid format
 */

export interface ExclusionRegion {
  name: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  reason?: string;
  selector?: string; // CSS selector for future enhancement
}

export interface ExclusionsConfig {
  regions: ExclusionRegion[];
  version?: string;
}

export class ExclusionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExclusionValidationError';
  }
}

/**
 * Validates a single exclusion region
 */
export function validateRegion(region: unknown, index: number): ExclusionRegion {
  if (!region || typeof region !== 'object') {
    throw new ExclusionValidationError(
      `Region at index ${index} must be an object`
    );
  }

  const r = region as Record<string, unknown>;

  // Validate name
  if (!r.name || typeof r.name !== 'string') {
    throw new ExclusionValidationError(
      `Region at index ${index} must have a string 'name' property`
    );
  }

  // Validate bounds
  if (!r.bounds || typeof r.bounds !== 'object') {
    throw new ExclusionValidationError(
      `Region '${r.name}' must have a 'bounds' object`
    );
  }

  const bounds = r.bounds as Record<string, unknown>;
  const requiredBounds = ['x', 'y', 'width', 'height'];

  for (const prop of requiredBounds) {
    if (
      typeof bounds[prop] !== 'number' ||
      bounds[prop] < 0 ||
      !Number.isFinite(bounds[prop])
    ) {
      throw new ExclusionValidationError(
        `Region '${r.name}' bounds.${prop} must be a non-negative number`
      );
    }
  }

  // Validate optional properties
  if (r.reason !== undefined && typeof r.reason !== 'string') {
    throw new ExclusionValidationError(
      `Region '${r.name}' reason must be a string if provided`
    );
  }

  if (r.selector !== undefined && typeof r.selector !== 'string') {
    throw new ExclusionValidationError(
      `Region '${r.name}' selector must be a string if provided`
    );
  }

  return {
    name: r.name as string,
    bounds: {
      x: bounds.x as number,
      y: bounds.y as number,
      width: bounds.width as number,
      height: bounds.height as number,
    },
    ...(r.reason && { reason: r.reason as string }),
    ...(r.selector && { selector: r.selector as string }),
  };
}

/**
 * Validates exclusions configuration
 */
export function validateExclusions(config: unknown): ExclusionsConfig {
  if (!config || typeof config !== 'object') {
    throw new ExclusionValidationError('Exclusions must be an object');
  }

  const c = config as Record<string, unknown>;

  if (!Array.isArray(c.regions)) {
    throw new ExclusionValidationError(
      'Exclusions must have a "regions" array'
    );
  }

  const validatedRegions = c.regions.map((region, index) =>
    validateRegion(region, index)
  );

  if (c.version !== undefined && typeof c.version !== 'string') {
    throw new ExclusionValidationError('Version must be a string if provided');
  }

  return {
    regions: validatedRegions,
    ...(c.version && { version: c.version as string }),
  };
}

/**
 * Parses exclusion configuration from JSON string
 */
export function parseExclusionFile(jsonContent: string): ExclusionsConfig {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonContent);
  } catch (error) {
    throw new ExclusionValidationError(
      `Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return validateExclusions(parsed);
}

/**
 * Example exclusion file content for documentation
 */
export const EXAMPLE_EXCLUSION_FILE = `{
  "version": "1.0",
  "regions": [
    {
      "name": "timestamp",
      "bounds": { "x": 10, "y": 10, "width": 200, "height": 30 },
      "reason": "Dynamic timestamp changes on every capture"
    },
    {
      "name": "ads-banner",
      "bounds": { "x": 0, "y": 100, "width": 728, "height": 90 },
      "reason": "Third-party advertising content",
      "selector": ".ad-container"
    },
    {
      "name": "user-avatar",
      "bounds": { "x": 1200, "y": 20, "width": 40, "height": 40 },
      "reason": "User-specific content"
    }
  ]
}`;