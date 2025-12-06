# Quick Start Guide: Bandai Manual Parser

**Purpose**: Get started with parsing Bandai manual HTML files into structured JSON

## Prerequisites

- Node.js 20+ with TypeScript support
- pnpm package manager
- Access to Bandai manual HTML files in `./data/bandai/manuals/` directory

## Installation

```bash
# Install dependencies
pnpm install

# Build the parser
pnpm nx build manual-parser

# Verify installation
pnpm nx test manual-parser
```

## Basic Usage

### Single File Processing

```bash
# Parse a single manual file
pnpm nx manual-parser:parse --id 1234

# Output location
./data/bandai/manuals/1234/1234.jp.json
```

### Batch Processing

```bash
# Process all manuals in directory
pnpm nx manual-parser:batch --source ./data/bandai/manuals

# Process specific range
pnpm nx manual-parser:batch --range 1000-2000

# Process with custom output directory
pnpm nx manual-parser:batch --source ./data/bandai/manuals --output ./processed
```

### Advanced Options

```bash
# Include progress reporting
pnpm nx manual-parser:batch --source ./data/bandai/manuals --progress

# Set concurrency limit
pnpm nx manual-parser:batch --source ./data/bandai/manuals --concurrency 50

# Enable verbose logging
pnpm nx manual-parser:batch --source ./data/bandai/manuals --verbose

# Dry run (validation only)
pnpm nx manual-parser:batch --source ./data/bandai/manuals --dry-run
```

## API Usage

### Programmatic Interface

```typescript
import { ManualParser, ProcessingOptions } from '@hobby-ninja/manual-parser';

const parser = new ManualParser();

// Single file processing
const result = await parser.parseFile({
  htmlPath: './data/bandai/manuals/1234.html',
  outputPath: './data/bandai/manuals/1234/1234.jp.json'
});

// Batch processing
const batchResult = await parser.parseBatch({
  sourceDirectory: './data/bandai/manuals',
  options: {
    concurrency: 100,
    progress: true,
    retries: 3
  }
});
```

### Event-Driven Processing

```typescript
import { ManualProcessor } from '@hobby-ninja/manual-parser';

const processor = new ManualProcessor();

// Listen to progress events
processor.on('progress', (progress) => {
  console.log(`Progress: ${progress.percentage}% (${progress.processed}/${progress.total})`);
  console.log(`Rate: ${progress.rate} | Memory: ${progress.memory}MB`);
});

processor.on('error', (error) => {
  console.error(`Processing error: ${error.file} - ${error.message}`);
});

processor.on('complete', (summary) => {
  console.log(`Processing complete: ${summary.successful} files, ${summary.failed} errors`);
});

// Start processing
await processor.processBatch('./data/bandai/manuals');
```

## Output Structure

### Generated JSON Format

```json
{
  "id": "1234",
  "metadata": {
    "title": {
      "ja": "RX-78-2 ガンダム 組立説明書",
      "en": "RX-78-2 Gundam Assembly Manual"
    },
    "product": {
      "name": "RX-78-2 Gundam",
      "series": "Mobile Suit Gundam",
      "grade": "MG",
      "scale": "1/100"
    },
    "publication": {
      "date": "2020-03-15",
      "language": "ja"
    }
  },
  "content": {
    "sections": [...],
    "blocks": [...],
    "statistics": {
      "totalSections": 12,
      "totalBlocks": 245,
      "wordCount": 5432,
      "japaneseCharacterCount": 2876,
      "imageCount": 38
    }
  },
  "assets": {
    "images": [...],
    "diagrams": [...],
    "thumbnails": [...]
  },
  "structure": {
    "outline": [...],
    "navigation": [...]
  },
  "extractedAt": "2025-12-05T10:30:00.000Z",
  "source": {
    "htmlPath": "./data/bandai/manuals/1234.html",
    "htmlSize": 2048576
  }
}
```

## Validation

### Schema Validation

```bash
# Validate generated JSON files
pnpm nx manual-parser:validate --directory ./data/bandai/manuals

# Validate specific file
pnpm nx manual-parser:validate --file ./data/bandai/manuals/1234/1234.jp.json
```

### Quality Checks

```bash
# Run quality checks on processed files
pnpm nx manual-parser:quality-check --directory ./data/bandai/manuals

# Generate quality report
pnpm nx manual-parser:quality-report --directory ./data/bandai/manuals --output ./report.json
```

## Performance Monitoring

### System Requirements

- **Memory**: 1GB minimum for batch processing
- **Storage**: Additional space for JSON output (~200% of HTML size)
- **CPU**: Multi-core recommended for parallel processing

### Performance Tuning

```typescript
const options: ProcessingOptions = {
  concurrency: 50,        // Concurrent file processing
  memoryThreshold: 1024,  // Memory limit in MB
  batchSize: 100,         // Files per batch
  retries: 3,             // Retry attempts
  progressInterval: 100,  // Progress update interval
  enableGC: true          // Enable garbage collection
};
```

### Monitoring Commands

```bash
# Monitor memory usage during processing
pnpm nx manual-parser:batch --source ./data/bandai/manuals --monitor-memory

# Generate performance report
pnpm nx manual-parser:performance-report --source ./data/bandai/manuals
```

## Error Handling

### Common Errors

| Error Type | Description | Solution |
|------------|-------------|----------|
| File not found | HTML file doesn't exist | Check file path and permissions |
| Invalid HTML | Malformed HTML structure | Run HTML validation first |
| Encoding issues | Japanese text corruption | Ensure UTF-8 encoding |
| Memory exceeded | Out of memory during processing | Reduce concurrency or increase memory |
| Schema validation | Output doesn't match schema | Check parser configuration |

### Recovery Strategies

```bash
# Resume failed batch processing
pnpm nx manual-parser:resume --checkpoint-file ./checkpoint.json

# Process only failed files
pnpm nx manual-parser:retry-failed --error-log ./errors.log

# Skip problematic files
pnpm nx manual-parser:batch --source ./data/bandai/manuals --skip-errors
```

## Integration Examples

### with Existing Build Pipeline

```json
// package.json scripts
{
  "scripts": {
    "parse-manuals": "pnpm nx manual-parser:batch --source ./data/bandai/manuals",
    "validate-manuals": "pnpm nx manual-parser:validate --directory ./data/bandai/manuals",
    "build-data": "pnpm parse-manuals && pnpm validate-manuals"
  }
}
```

### with CI/CD Pipeline

```yaml
# .github/workflows/manual-parser.yml
name: Parse Manuals
on:
  push:
    paths:
      - 'data/bandai/manuals/*.html'

jobs:
  parse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm nx manual-parser:batch --source ./data/bandai/manuals
      - run: pnpm nx manual-parser:validate --directory ./data/bandai/manuals
```

## Troubleshooting

### Debug Mode

```bash
# Enable debug logging
DEBUG=manual-parser:* pnpm nx manual-parser:batch --source ./data/bandai/manuals

# Generate debug report
pnpm nx manual-parser:debug-report --source ./data/bandai/manuals --output ./debug.json
```

### Common Issues

1. **Slow Processing**: Increase concurrency or check disk I/O
2. **Memory Leaks**: Enable GC monitoring and reduce batch size
3. **Japanese Text Issues**: Verify UTF-8 encoding and normalization
4. **Validation Failures**: Check schema version compatibility

### Getting Help

- Check logs in `./logs/manual-parser.log`
- Review error documentation in `docs/errors.md`
- Open issue with sample file and error details
- Use `--help` flag for detailed command options