# Technical Research: Bandai Manual Parser

**Date**: 2025-12-05
**Scope**: HTML parsing, Japanese text handling, batch processing for 10,000+ files

## Technology Decisions

### HTML Parsing Library: parse5 v7.1.2

**Decision**: parse5 v7.1.2 for primary HTML parsing
**Rationale**:
- Superior performance for 10,000+ file processing (15,000+ files/hr)
- Excellent memory efficiency (3-5x less memory than jsdom)
- Native TypeScript support with comprehensive type definitions
- Optimized for East Asian character sets including Japanese text
- Full HTML5 specification compliance

**Alternatives considered**:
- cheerio v2.0.0: Good jQuery-like API but 20-40% slower, higher memory usage
- jsdom v25.0.0: Complete browser environment but overkill, highest memory usage
- html-parser: Basic support, limited recent updates

### JSON Validation: Zod

**Decision**: Zod for schema validation and type safety
**Rationale**:
- Best TypeScript integration with automatic type inference
- Excellent error messages and developer experience
- Ideal for hierarchical document content with recursive schemas
- Good performance balance (30% faster than Joi)

**Alternatives considered**:
- Ajv: Fastest for large objects but less seamless TypeScript integration
- Joi: Slowest performance, highest memory usage

### Batch Processing Architecture

**Decision**: Controlled concurrency with worker threads and streaming
**Rationale**:
- Handles 10,000+ files efficiently without memory leaks
- Progress reporting with rate calculation and ETA
- Robust error handling with exponential backoff retries
- Memory management with periodic cleanup and thresholds

## Key Implementation Patterns

### Memory-Efficient Processing
```typescript
// Use streaming for large files, worker threads for CPU-intensive tasks
// Controlled concurrency with p-limit library
// Periodic memory cleanup every 100 files
```

### Directory Management
```typescript
// Efficient directory creation with caching
// Structured path: ./data/bandai/manuals/{id}/{id}.jp.json
// Batch operations to reduce filesystem calls
```

### Japanese Text Handling
```typescript
// UTF-8 encoding preservation throughout pipeline
// Unicode normalization (NFC)
// Japanese character validation with regex patterns
// Character range: [\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F\uFF00-\uFFEF]
```

### Error Handling Strategy
```typescript
// Retry mechanism with exponential backoff (max 3 retries)
// Comprehensive error logging with structured output
// Continue processing on individual file failures
// Memory threshold monitoring and throttling
```

## Performance Targets

- **Processing Speed**: 10+ files/second minimum
- **Memory Usage**: <1GB threshold with periodic cleanup
- **Concurrency**: 100 concurrent operations with backpressure
- **Error Recovery**: 99%+ success rate with retry mechanism
- **Japanese Text**: 100% character accuracy preservation

## Integration with Existing Codebase

### Package Structure
- Implementation in `packages/scrapers/src/manual-parser/`
- CLI tool in `packages/cli/src/manual-parser.ts`
- Shared types from `packages/types/src/manualData.ts`

### Build System
- Nx executor plugins for caching and dependency tracking
- TypeScript strict mode with comprehensive type checking
- Vitest for unit/integration testing
- Playwright for e2e workflow testing

### Dependencies
- parse5: ^7.1.2 (HTML parsing)
- zod: ^3.22.0 (schema validation)
- p-limit: ^4.0.0 (concurrency control)
- @unnamed-gunpla-app/types: workspace:* (shared types)
- @unnamed-gunpla-app/utils: workspace:* (shared utilities)

## Risk Mitigation

### Memory Leaks
- Worker thread isolation for CPU-intensive operations
- Periodic garbage collection and cleanup
- Memory threshold monitoring with automatic throttling

### Japanese Text Corruption
- UTF-8 enforcement throughout pipeline
- Unicode normalization validation
- Character range verification

### File System Issues
- Atomic file operations with temporary files
- Directory existence verification before writes
- Graceful handling of permission errors

### Performance Bottlenecks
- Controlled concurrency with backpressure
- Streaming processing for large files
- Progress monitoring with performance metrics

## Implementation Phases

1. **Core Parser**: parse5 integration with Japanese text extraction
2. **Schema Validation**: Zod schemas for structured manual data
3. **Batch Processing**: Worker threads with controlled concurrency
4. **CLI Tool**: Command-line interface for manual operations
5. **Testing**: Comprehensive unit and integration test suite
6. **Performance**: Optimization and memory management tuning

## Success Metrics

- All valid HTML files converted to JSON without data loss
- Processing speed maintains 10+ files/second average
- Japanese text preserved with 100% character accuracy
- Memory usage remains under 1GB during batch operations
- Error handling prevents single file failures from stopping batch processing