/**
 * @fileoverview Tests for region exclusion system
 * @lastmodified 2025-08-01T09:25:00Z
 */

import {
  parseExclusionFile,
  validateExclusions,
  validateRegion,
  ExclusionValidationError,
  EXAMPLE_EXCLUSION_FILE,
} from '../../lib/exclusions';

describe('exclusions', () => {
  describe('validateRegion', () => {
    it('should validate a complete region', () => {
      const region = {
        name: 'test-region',
        bounds: { x: 10, y: 20, width: 100, height: 50 },
        reason: 'Test reason',
        selector: '.test-selector',
      };

      const result = validateRegion(region, 0);
      expect(result).toEqual(region);
    });

    it('should validate a region with only required fields', () => {
      const region = {
        name: 'minimal-region',
        bounds: { x: 0, y: 0, width: 50, height: 50 },
      };

      const result = validateRegion(region, 0);
      expect(result).toEqual(region);
    });

    it('should throw on missing name', () => {
      const region = {
        bounds: { x: 0, y: 0, width: 50, height: 50 },
      };

      expect(() => validateRegion(region, 0)).toThrow(
        ExclusionValidationError
      );
    });

    it('should throw on invalid bounds', () => {
      const invalidBounds = [
        { name: 'test', bounds: null },
        { name: 'test', bounds: {} },
        { name: 'test', bounds: { x: -1, y: 0, width: 50, height: 50 } },
        { name: 'test', bounds: { x: 0, y: 'invalid', width: 50, height: 50 } },
        { name: 'test', bounds: { x: 0, y: 0, width: NaN, height: 50 } },
        { name: 'test', bounds: { x: 0, y: 0, width: 50 } }, // missing height
      ];

      invalidBounds.forEach((region) => {
        expect(() => validateRegion(region, 0)).toThrow(
          ExclusionValidationError
        );
      });
    });

    it('should throw on invalid optional fields', () => {
      const invalidOptionals = [
        { name: 'test', bounds: { x: 0, y: 0, width: 50, height: 50 }, reason: 123 },
        { name: 'test', bounds: { x: 0, y: 0, width: 50, height: 50 }, selector: true },
      ];

      invalidOptionals.forEach((region) => {
        expect(() => validateRegion(region, 0)).toThrow(
          ExclusionValidationError
        );
      });
    });
  });

  describe('validateExclusions', () => {
    it('should validate a complete exclusions config', () => {
      const config = {
        version: '1.0',
        regions: [
          {
            name: 'region1',
            bounds: { x: 0, y: 0, width: 100, height: 100 },
          },
          {
            name: 'region2',
            bounds: { x: 200, y: 200, width: 50, height: 50 },
            reason: 'Dynamic content',
          },
        ],
      };

      const result = validateExclusions(config);
      expect(result).toEqual(config);
    });

    it('should validate config without version', () => {
      const config = {
        regions: [
          {
            name: 'region1',
            bounds: { x: 0, y: 0, width: 100, height: 100 },
          },
        ],
      };

      const result = validateExclusions(config);
      expect(result).toEqual(config);
    });

    it('should throw on missing regions array', () => {
      const configs = [
        {},
        { version: '1.0' },
        { regions: null },
        { regions: 'not-an-array' },
      ];

      configs.forEach((config) => {
        expect(() => validateExclusions(config)).toThrow(
          ExclusionValidationError
        );
      });
    });

    it('should throw on invalid config format', () => {
      expect(() => validateExclusions(null)).toThrow(ExclusionValidationError);
      expect(() => validateExclusions('string')).toThrow(
        ExclusionValidationError
      );
      expect(() => validateExclusions(123)).toThrow(ExclusionValidationError);
    });

    it('should validate each region in the array', () => {
      const config = {
        regions: [
          {
            name: 'valid',
            bounds: { x: 0, y: 0, width: 100, height: 100 },
          },
          {
            // Missing name
            bounds: { x: 0, y: 0, width: 100, height: 100 },
          },
        ],
      };

      expect(() => validateExclusions(config)).toThrow(
        ExclusionValidationError
      );
    });
  });

  describe('parseExclusionFile', () => {
    it('should parse valid JSON', () => {
      const json = JSON.stringify({
        version: '1.0',
        regions: [
          {
            name: 'test',
            bounds: { x: 10, y: 20, width: 30, height: 40 },
          },
        ],
      });

      const result = parseExclusionFile(json);
      expect(result.version).toBe('1.0');
      expect(result.regions).toHaveLength(1);
      expect(result.regions[0].name).toBe('test');
    });

    it('should parse the example exclusion file', () => {
      const result = parseExclusionFile(EXAMPLE_EXCLUSION_FILE);
      expect(result.regions).toHaveLength(3);
      expect(result.regions[0].name).toBe('timestamp');
      expect(result.regions[1].name).toBe('ads-banner');
      expect(result.regions[2].name).toBe('user-avatar');
    });

    it('should throw on invalid JSON', () => {
      const invalidJsons = [
        '',
        'not json',
        '{ invalid json',
        '{ "regions": [',
      ];

      invalidJsons.forEach((json) => {
        expect(() => parseExclusionFile(json)).toThrow(
          ExclusionValidationError
        );
      });
    });

    it('should throw on valid JSON with invalid schema', () => {
      const invalidSchemas = [
        '{}', // missing regions
        '{ "regions": "not-array" }',
        '{ "regions": [{ "name": "test" }] }', // missing bounds
      ];

      invalidSchemas.forEach((json) => {
        expect(() => parseExclusionFile(json)).toThrow(
          ExclusionValidationError
        );
      });
    });
  });

  describe('error messages', () => {
    it('should provide helpful error messages', () => {
      try {
        parseExclusionFile('{ invalid json');
      } catch (error) {
        expect(error).toBeInstanceOf(ExclusionValidationError);
        expect((error as Error).message).toContain('Invalid JSON format');
      }

      try {
        validateRegion({ bounds: { x: 0, y: 0, width: 50, height: 50 } }, 5);
      } catch (error) {
        expect(error).toBeInstanceOf(ExclusionValidationError);
        expect((error as Error).message).toContain('Region at index 5');
      }

      try {
        validateExclusions({ regions: 'not-array' });
      } catch (error) {
        expect(error).toBeInstanceOf(ExclusionValidationError);
        expect((error as Error).message).toContain('must have a "regions" array');
      }
    });
  });
});