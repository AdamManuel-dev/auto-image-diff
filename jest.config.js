/**
 * @fileoverview Jest configuration for auto-image-diff
 * @lastmodified 2025-08-01T03:51:00Z
 * 
 * Features: TypeScript support, coverage reporting, test patterns
 * Main APIs: Jest configuration
 * Constraints: Requires ts-jest transformer
 * Patterns: CommonJS module export
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  verbose: true,
  testTimeout: 10000,
};