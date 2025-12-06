# URL Validation Scanner - Quick Start Guide

**Date**: 2025-12-05
**Purpose**: Quick start guide for implementing and using the URL validation scanner

## Implementation Overview

The URL Validation Scanner is a CLI utility that systematically checks Bandai hobby URLs to classify their validity and data extraction requirements. It integrates into the existing `packages/scrapers` module within the Nx monorepo.

## File Structure

```
packages/scrapers/src/
├── url-scanner/
│   ├── index.ts                 # Main scanner class
│   ├── url-checker.ts           # Individual URL validation
│   ├── static-data-detector.ts  # Static content analysis
│   ├── progress-manager.ts      # Progress persistence
│   ├── output-manager.ts        # File output handling
│   ├── file-manager.ts          # File system operations
│   ├── types.ts                 # TypeScript interfaces
│   └── utils.ts                 # Utility functions
└── cli/
    └── scan-urls.ts             # CLI command entry point
```

## Basic Usage

### Command Line Interface

```bash
# Scan all URL patterns with default settings
pnpm nx run @hobby-ninja/scrapers:scan-urls

# Scan with custom configuration
pnpm nx run @hobby-ninja/scrapers:scan-urls \
  --concurrency 20 \
  --timeout 10000 \
  --output ./scan-results \
  --patterns bandai-hobby,manual,p-bandai

# Resume interrupted scan
pnpm nx run @hobby-ninja/scrapers:scan-urls --resume

# Check specific URLs
pnpm nx run @hobby-ninja/scrapers:scan-urls \
  --urls https://bandai-hobby.net/item/01_3804/ \
        https://manual.bandai-hobby.net/menus/detail/652/
```

### Programmatic Usage

```typescript
import { URLScanner } from '@hobby-ninja/scrapers/url-scanner';

const scanner = new URLScanner();

// Define URL patterns to scan
const config = {
  urlPatterns: [
    {
      pattern: 'https://bandai-hobby.net/item/{id}/',
      placeholder: '{id}',
      start: 1,
      end: 1000,
      step: 1
    }
  ],
  concurrency: 10,
  timeoutMs: 5000,
  outputDirectory: './scan-results'
};

// Start scanning
const results = await scanner.scan(config);
console.log(`Scanned ${results.total} URLs`);
console.log(`Static: ${results.validStatic}, Dynamic: ${results.validDynamic}, Invalid: ${results.invalid}`);
```

## Configuration

### Default URL Patterns

The scanner comes with pre-configured patterns for Bandai hobby sites:

```typescript
const defaultPatterns = [
  {
    name: 'bandai-hobby',
    pattern: 'https://bandai-hobby.net/item/{id}/',
    start: 1,
    end: 9999,
    format: 'zero-pad-4' // 0001, 0002, etc.
  },
  {
    name: 'manual-bandai',
    pattern: 'https://manual.bandai-hobby.net/menus/detail/{id}/',
    start: 1,
    end: 9999,
    format: 'zero-pad-3'
  },
  {
    name: 'p-bandai-us',
    pattern: 'https://p-bandai.com/us/item/{id}/',
    start: 1,
    end: 9999,
    format: 'alphanumeric'
  }
];
```

### Configuration File

Create `url-scanner.config.json` in project root:

```json
{
  "urlPatterns": [
    {
      "pattern": "https://bandai-hobby.net/item/{id}/",
      "placeholder": "{id}",
      "start": 1,
      "end": 100,
      "step": 1,
      "numberFormat": "decimal",
      "zeroPad": 4
    }
  ],
  "concurrency": 15,
  "timeoutMs": 8000,
  "retryAttempts": 3,
  "requestDelayMs": 200,
  "outputDirectory": "./scan-results",
  "followRedirects": true,
  "maxRedirects": 5,
  "userAgent": "GundamURLScanner/1.0"
}
```

## Output Files

### Classification Files

After scanning completes, you'll find three files in the output directory:

#### `valid_static_urls.txt`
```
https://bandai-hobby.net/item/4753/	2025-12-05T10:30:15.123Z	200	0.95	static-title,structured-data,sku-found
https://manual.bandai-hobby.net/menus/detail/652/	2025-12-05T10:30:16.456Z	200	0.87	static-title,partial-data
```

#### `valid_dynamic_urls.txt`
```
https://p-bandai.com/us/item/F2434385006	2025-12-05T10:30:18.789Z	200	0.92	dynamic-indicator,react-root,js-data-source
```

#### `invalid_urls.txt`
```
https://bandai-hobby.net/item/99999/	2025-12-05T10:30:20.012Z	404	Not Found
https://manual.bandai-hobby.net/menus/detail/0/	2025-12-05T10:30:21.345Z	timeout	Request timeout after 5000ms
```

### Progress File

`progress.json` contains scan state for resuming:

```json
{
  "scanId": "scan_2025-12-05_10-30-00",
  "startedAt": "2025-12-05T10:30:00.000Z",
  "lastProcessedIndex": 47,
  "totalProcessed": 47,
  "successfulCount": 45,
  "errorCount": 2,
  "status": "paused",
  "configuration": { ... }
}
```

## Testing

### Unit Tests

```typescript
import { URLChecker } from '../src/url-scanner/url-checker';

describe('URLChecker', () => {
  it('should classify static pages correctly', async () => {
    const checker = new URLChecker();
    const result = await checker.checkURL('https://bandai-hobby.net/item/4753/');

    expect(result.hasStaticData).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.85);
    expect(result.indicators).toContain('static-title');
  });
});
```

### Integration Tests

```typescript
import { URLScanner } from '../src/url-scanner';

describe('URLScanner Integration', () => {
  it('should scan a range of URLs and persist results', async () => {
    const scanner = new URLScanner();
    const config = {
      urlPatterns: [{
        pattern: 'https://bandai-hobby.net/item/{id}/',
        start: 4750,
        end: 4752
      }],
      outputDirectory: './test-output'
    };

    const results = await scanner.scan(config);
    expect(results.total).toBe(3);
    expect(await fs.fileExists('./test-output/valid_static_urls.txt')).toBe(true);
  });
});
```

## Performance Tips

1. **Concurrency**: Adjust based on network and server limits. Start with 10-20 concurrent requests.
2. **Timeouts**: 5-10 seconds is usually sufficient for most sites.
3. **Rate Limiting**: Add delays between requests to avoid being blocked.
4. **Memory Usage**: Process URLs in batches to avoid memory issues with large ranges.
5. **Resume Capability**: Always use resume functionality for large scans.

## Error Handling

The scanner handles these common error scenarios:

- **Network Timeouts**: Automatically retry with exponential backoff
- **Server Errors (5xx)**: Retry with delays
- **Client Errors (4xx)**: Mark as invalid (no retry)
- **Rate Limiting (429)**: Implement backoff and retry
- **Redirect Loops**: Stop after max redirects and mark as invalid

## Integration with Existing Scraper

The URL scanner integrates with the existing scraper registry:

```typescript
import { scrapers } from '@hobby-ninja/scrapers';

// Add URL validation capability to existing scrapers
const enhancedScrapers = {
  ...scrapers,
  'url-validator': new URLScanner()
};
```

This allows you to pre-validate URLs before running the full scraping pipeline.