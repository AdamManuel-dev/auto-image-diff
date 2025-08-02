# Environment Configuration Guide

This guide explains how to set up and configure environment variables for the Auto Image Diff tool.

## Quick Start

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your preferred values (the defaults work well for most cases)

3. The application will automatically load these settings on startup

## Environment Variables

### Node Environment

- `NODE_ENV` - Application environment (`development`, `production`, `test`)
  - Default: `development`

### Logging Configuration

- `LOG_LEVEL` - Minimum log level to display (`debug`, `info`, `warn`, `error`)
  - Default: `info`
- `LOG_FORMAT` - Log output format (`json`, `text`)
  - Default: `json`

### Performance Settings

- `MAX_WORKERS` - Maximum number of parallel workers (1-32)
  - Default: `4`
- `BATCH_SIZE` - Number of images to process in each batch (1-100)
  - Default: `10`
- `MEMORY_LIMIT` - Memory limit in MB (512-16384)
  - Default: `4096`

### Image Processing Settings

- `IMAGE_QUALITY` - JPEG quality for output images (1-100)
  - Default: `85`
- `MAX_IMAGE_SIZE` - Maximum image file size in bytes
  - Default: `10485760` (10MB)
- `DIFF_THRESHOLD` - Pixel difference threshold (0-1)
  - Default: `0.1`

### Output Configuration

- `OUTPUT_DIR` - Directory for output files
  - Default: `./output`
- `ENABLE_HTML_REPORTS` - Generate HTML reports (`true`, `false`)
  - Default: `true`
- `ENABLE_JSON_REPORTS` - Generate JSON reports (`true`, `false`)
  - Default: `true`

### Cache Settings

- `ENABLE_CACHE` - Enable caching (`true`, `false`)
  - Default: `true`
- `CACHE_DIR` - Directory for cache files
  - Default: `./cache`
- `CACHE_TTL` - Cache time-to-live in seconds
  - Default: `86400` (24 hours)

### Debug Mode

- `DEBUG_MODE` - Enable debug mode (`true`, `false`)
  - Default: `false`
- `VERBOSE_OUTPUT` - Enable verbose output (`true`, `false`)
  - Default: `false`

## Using Environment Variables in Code

The environment configuration is automatically loaded and validated. To use it in your code:

```typescript
import { getConfig, get } from "./lib/env-config";

// Get the entire config object
const config = getConfig();
console.log(config.maxWorkers);

// Get a specific value
const logLevel = get("logLevel");
```

## Validation

The environment configuration includes built-in validation:

- Numeric values are checked for valid ranges
- Required values are verified
- Invalid configurations will throw an error on startup

## Security Notes

- **Never commit `.env` files** to version control
- The `.env` file is automatically excluded via `.gitignore`
- Use `.env.example` as a template for other developers
- Store sensitive values (API keys, passwords) securely
- Consider using environment-specific files (`.env.production`, `.env.test`)

## Troubleshooting

### Environment variables not loading

- Ensure `.env` file exists in the project root
- Check file permissions
- Verify no syntax errors in `.env` file

### Validation errors

- Check that numeric values are within allowed ranges
- Ensure required variables are set
- Review error messages for specific issues

### Performance issues

- Adjust `MAX_WORKERS` based on your CPU cores
- Increase `MEMORY_LIMIT` for large images
- Enable caching for repeated operations
