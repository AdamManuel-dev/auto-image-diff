/**
 * @fileoverview Jest configuration for auto-image-diff
 * @lastmodified 2025-08-01T08:10:45Z
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
      branches: 70,
      functions: 80,
      lines: 70,
      statements: 70,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  verbose: true,
  testTimeout: 10000,
};