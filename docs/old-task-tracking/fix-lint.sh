#!/bin/bash

# Fix cli.test.ts
sed -i '' 's/const setupCLI = () => {/const setupCLI = (): void => {/g' src/__tests__/cli.test.ts

# Add eslint-disable comments for require statements in cli.test.ts
sed -i '' '/const { ImageProcessor } = require/i\      // eslint-disable-next-line @typescript-eslint/no-var-requires' src/__tests__/cli.test.ts
sed -i '' '/const { BatchProcessor } = require/i\      // eslint-disable-next-line @typescript-eslint/no-var-requires' src/__tests__/cli.test.ts

# Add eslint-disable comments for require statements in integration.test.ts
sed -i '' "/const gm = require('gm')/i\      // eslint-disable-next-line @typescript-eslint/no-var-requires" src/__tests__/integration.test.ts

# Run prettier to fix formatting
npm run lint:fix

echo "Lint fixes applied!"