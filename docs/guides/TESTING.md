# Testing Guide

This guide covers testing strategies, running tests, and writing new tests for auto-image-diff.

## Table of Contents

- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Testing Best Practices](#testing-best-practices)
- [Continuous Integration](#continuous-integration)

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test src/lib/imageProcessor.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="align"
```

### Test Scripts

The project includes several test-related npm scripts:

```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:ci": "jest --ci --coverage --maxWorkers=2"
}
```

### Coverage Reports

After running tests with coverage:

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html

# Coverage thresholds are enforced:
# - Statements: 80%
# - Branches: 80%
# - Functions: 80%
# - Lines: 80%
```

## Test Structure

### Directory Organization

```
src/
├── __tests__/                    # Integration tests
│   ├── cli.test.ts              # CLI integration tests
│   ├── integration.test.ts      # Full workflow tests
│   ├── e2e-integration.test.ts  # End-to-end tests
│   └── fixtures/                # Test images and data
│       ├── test1.png
│       └── test2.png
├── lib/
│   ├── __tests__/               # Unit tests for lib modules
│   │   ├── imageProcessor.test.ts
│   │   └── batchProcessor.test.ts
│   ├── classifiers/
│   │   └── __tests__/           # Classifier tests
│   │       ├── content.test.ts
│   │       └── style.test.ts
│   └── imageProcessor.ts        # Source file
└── index.test.ts                # Public API tests
```

### Test Categories

#### 1. Unit Tests
Test individual functions and classes in isolation.

```typescript
// src/lib/__tests__/imageProcessor.test.ts
describe('ImageProcessor', () => {
  describe('alignImages', () => {
    it('should align images with default options', async () => {
      // Test implementation
    });
  });
});
```

#### 2. Integration Tests
Test multiple components working together.

```typescript
// src/__tests__/integration.test.ts
describe('Full workflow integration', () => {
  it('should process images end-to-end', async () => {
    // Test complete workflow
  });
});
```

#### 3. CLI Tests
Test command-line interface functionality.

```typescript
// src/__tests__/cli.test.ts
describe('CLI commands', () => {
  it('should execute compare command', async () => {
    // Test CLI execution
  });
});
```

## Writing Tests

### Test Template

Use this template for new test files:

```typescript
/**
 * @fileoverview Tests for [module name]
 * @lastmodified [ISO timestamp]
 */

import { ModuleName } from '../module-name';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock external dependencies
jest.mock('child_process');
jest.mock('gm');

describe('ModuleName', () => {
  let instance: ModuleName;
  
  beforeEach(() => {
    instance = new ModuleName();
    jest.clearAllMocks();
  });
  
  afterEach(async () => {
    // Cleanup
  });
  
  describe('methodName', () => {
    it('should handle normal case', async () => {
      // Arrange
      const input = 'test-input';
      const expected = 'expected-output';
      
      // Act
      const result = await instance.methodName(input);
      
      // Assert
      expect(result).toBe(expected);
    });
    
    it('should handle error case', async () => {
      // Arrange
      const invalidInput = null;
      
      // Act & Assert
      await expect(instance.methodName(invalidInput))
        .rejects.toThrow('Invalid input');
    });
  });
});
```

### Testing Image Processing

```typescript
import { ImageProcessor } from '../imageProcessor';
import * as path from 'path';

describe('Image processing tests', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const processor = new ImageProcessor();
  
  it('should compare identical images', async () => {
    const image1 = path.join(fixturesDir, 'test1.png');
    const image2 = path.join(fixturesDir, 'test1.png');
    
    const result = await processor.compareImages(image1, image2);
    
    expect(result.isEqual).toBe(true);
    expect(result.difference).toBe(0);
  });
});
```

### Mocking External Dependencies

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

jest.mock('child_process');
const mockExec = exec as jest.MockedFunction<typeof exec>;

describe('ImageMagick operations', () => {
  it('should handle ImageMagick commands', async () => {
    // Mock successful execution
    mockExec.mockImplementation((cmd, callback) => {
      callback(null, { stdout: '0', stderr: '' });
    });
    
    // Test code that uses exec
  });
});
```

### Testing Async Operations

```typescript
describe('Async operations', () => {
  it('should handle promises correctly', async () => {
    const result = await asyncFunction();
    expect(result).toBeDefined();
  });
  
  it('should handle promise rejection', async () => {
    await expect(failingAsyncFunction())
      .rejects.toThrow('Expected error');
  });
});
```

### Testing File Operations

```typescript
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

describe('File operations', () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'test-')
    );
  });
  
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });
  
  it('should create output file', async () => {
    const outputPath = path.join(tempDir, 'output.png');
    
    await processImage(inputPath, outputPath);
    
    const exists = await fs.access(outputPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });
});
```

## Testing Best Practices

### 1. Test Naming

Use descriptive test names that explain what is being tested:

```typescript
// Good
it('should return null when classifier cannot handle region type', () => {});

// Bad
it('should work', () => {});
```

### 2. Test Organization

Group related tests using `describe` blocks:

```typescript
describe('ImageProcessor', () => {
  describe('alignment', () => {
    describe('with feature method', () => {
      it('should align using OpenCV features', () => {});
    });
    
    describe('with subimage method', () => {
      it('should align using subimage search', () => {});
    });
  });
});
```

### 3. Test Data

Keep test fixtures organized:

```
__tests__/
└── fixtures/
    ├── alignment/
    │   ├── reference.png
    │   └── target.png
    ├── classification/
    │   ├── content-change.png
    │   └── style-change.png
    └── batch/
        ├── set1/
        └── set2/
```

### 4. Isolation

Each test should be independent:

```typescript
beforeEach(() => {
  // Reset state
  jest.clearAllMocks();
});

afterEach(async () => {
  // Clean up resources
  await cleanup();
});
```

### 5. Error Testing

Always test error cases:

```typescript
it('should throw when image does not exist', async () => {
  await expect(processor.compareImages('missing.png', 'other.png'))
    .rejects.toThrow('File not found');
});
```

### 6. Performance Testing

For performance-critical code:

```typescript
it('should process large image within time limit', async () => {
  const start = Date.now();
  
  await processor.processLargeImage(largePath);
  
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(5000); // 5 seconds
});
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Nightly builds

### CI Configuration

```yaml
# .github/workflows/ci.yml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '22'
    - run: npm ci
    - run: npm run test:ci
    - uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

Ensure tests pass before committing:

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test"
    }
  }
}
```

## Debugging Tests

### Visual Studio Code

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Current File",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["${file}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Debug Output

```typescript
// Add debug logging
console.log('Debug:', JSON.stringify(result, null, 2));

// Or use Jest's debug utility
expect(result).toMatchInlineSnapshot();
```

### Troubleshooting Failed Tests

1. **Check test output**: Read the full error message
2. **Run in isolation**: `npm test -- --testNamePattern="specific test"`
3. **Check mocks**: Ensure mocks are properly configured
4. **Verify fixtures**: Make sure test files exist
5. **Environment**: Check Node.js version and dependencies

## Test Utilities

### Custom Matchers

```typescript
// test-utils/matchers.ts
expect.extend({
  toBeValidImagePath(received: string) {
    const pass = received.endsWith('.png') || 
                 received.endsWith('.jpg');
    return {
      pass,
      message: () => `Expected ${received} to be valid image path`
    };
  }
});
```

### Test Helpers

```typescript
// test-utils/helpers.ts
export async function createTestImage(
  width: number, 
  height: number
): Promise<string> {
  // Create test image
}

export async function compareResults(
  actual: ComparisonResult,
  expected: Partial<ComparisonResult>
): Promise<void> {
  // Custom comparison logic
}
```

## Next Steps

- Review [examples](../../examples/) for more test patterns
- Check [CI Integration](./CI_INTEGRATION.md) for automation
- See [Contributing](../../CONTRIBUTING.md) for test requirements