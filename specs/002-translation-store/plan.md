# Implementation Plan: TranslationStore

**Branch**: `002-translation-store` | **Date**: 2025-12-04-185621 | **Spec**: [TranslationStore](spec.md)
**Input**: Feature specification from `/specs/002-translation-store/spec.md`

## Summary

The TranslationStore provides permanent disk-based caching for CLI translation operations, specifically designed to eliminate redundant Google Translate API calls during Japanese to English translation workflows for the Gunpla collection manager. The system uses JSON files with SHA-256 hash-based naming for content-addressable storage, `proper-lockfile` for concurrent process coordination, and Brotli compression for storage efficiency.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)
**Primary Dependencies**: Node.js crypto (built-in), proper-lockfile, Node.js zlib (Brotli/Gzip)
**Storage**: JSON files with content-addressable hash-based naming
**Testing**: Vitest for unit tests, integration tests for file operations
**Target Platform**: CLI applications (Node.js 20+) - Windows/macOS/Linux
**Project Type**: CLI utility package within Nx monorepo
**Performance Goals**: <50ms initialization, <10ms average lookup, <8MB for 10k translations
**Constraints**: TypeScript strict mode, no untyped files, atomic file operations, concurrent process safety
**Scale/Scope**: 10,000+ translations, 40+ MB disk usage, 10+ concurrent CLI processes

## Constitution Check

✅ **I. Test-First Development**: Plan includes comprehensive test strategy with Vitest unit tests and storage integration tests
✅ **II. Modular Monorepo Architecture**: Translation package extends existing packages/translation with clear boundaries
✅ **III. Static Hosting Compatibility**: CLI-only, no impact on static web hosting requirements
✅ **V. Comprehensive TypeScript Type Checking**: All interfaces strictly typed, Zod validation schemas included
✅ **VI. Configuration Type Safety**: TypeScript configuration files with proper project references
✅ **VII. Build Process Isolation**: Source files remain pristine with `noEmit: true`, build outputs to dist/
✅ **IX. Nx Build System Optimization**: Uses @nx/vite:build, @nx/eslint:lint, specialized executors
✅ **X. Persistence and Resilience**: Comprehensive error handling, graceful degradation, recovery mechanisms
✅ **XI. Security by Default**: File permission handling, input validation via Zod schemas

## Project Structure

### Documentation (this feature)

```text
specs/002-translation-store/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - CLI storage patterns research
├── data-model.md        # Phase 1 output - Entity definitions and relationships
├── quickstart.md        # Phase 1 output - Usage examples and integration guide
├── contracts/           # Phase 1 output - API specifications
│   └── translation-store-api.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/translation/src/
├── store/               # New store package (extends existing translation package)
│   ├── translation-store.ts      # Main TranslationStore class implementation
│   ├── sqlite-storage.ts         # SQLite storage layer with compression
│   ├── file-lock.ts              # File locking mechanism using proper-lockfile
│   ├── compression.ts            # Gzip compression utilities
│   ├── metadata.ts               # Store metadata management
│   ├── health-monitor.ts         # Health checking and diagnostics
│   ├── statistics.ts             # Performance statistics collection
│   ├── cleanup.ts                # Cleanup and maintenance operations
│   ├── search.ts                 # Search functionality implementation
│   ├── migration.ts              # Store migration and compatibility
│   ├── recovery.ts               # Error recovery and repair
│   ├── index.ts                  # Public API exports
│   └── types.ts                  # Store-specific type definitions
├── tests/               # Test files (updated)
│   ├── store/                    # Store-specific tests
│   │   ├── translation-store.test.ts
│   │   ├── sqlite-storage.test.ts
│   │   ├── file-lock.test.ts
│   │   ├── compression.test.ts
│   │   ├── integration.test.ts
│   │   └── performance.test.ts
│   └── ...                       # Existing test files
└── index.ts            # Updated to export store functionality
```

## Phase 0: Research & Analysis ✅

### Completed Research Tasks

- **Hash Algorithm**: Resolved - SHA-256 for content-addressable storage with hash-based file naming
- **File Locking Mechanisms**: Resolved - `proper-lockfile` for cross-platform concurrent access coordination
- **Storage Strategy**: Resolved - JSON files with two-level hash sharding for performance
- **Compression Strategy**: Resolved - Brotli for >1KB files, Gzip for smaller files
- **Performance Optimization**: Resolved - File system optimization with concurrent I/O control
- **Atomic Write Operations**: Resolved - Temp file + rename pattern with proper cleanup
- **Cross-Platform Compatibility**: Resolved - Platform-agnostic file system operations
- **Error Handling Strategy**: Resolved - Comprehensive error recovery with fallback mechanisms

### Key Research Findings

1. **JSON vs SQLite**: JSON file storage provides simplicity, debuggability, and easier maintenance for CLI use case
2. **Hash-based Storage**: Content-addressable storage with SHA-256 provides deduplication and integrity verification
3. **File Performance**: Two-level sharding with 40-70% performance improvement for large file sets
4. **Compression Benefits**: Brotli provides 75-85% compression ratio, reducing storage requirements significantly
5. **Simplicity Advantage**: No database dependencies reduces complexity and maintenance overhead

All NEEDS CLARIFICATION items from technical context have been resolved through research.

## Phase 1: Design & Contracts ✅

### Data Model Design

**Completed Components**:
- **TranslationEntry**: Complete entity definition with lifecycle management
- **TranslationStore**: Store configuration, statistics, and health monitoring
- **StorageMetadata**: Version compatibility and migration support
- **Validation Rules**: Zod schemas for type safety and data integrity
- **State Transitions**: Clear lifecycle and health state management
- **Performance Considerations**: Indexing strategy and optimization guidelines

### API Contracts

**Completed Components**:
- **OpenAPI Specification**: Complete REST-style API contract for store operations
- **Request/Response Schemas**: Strictly typed interfaces for all operations
- **Error Handling**: Comprehensive error codes and response formats
- **Batch Operations**: Efficient bulk translation storage
- **Search & Filter**: Advanced query capabilities with pagination
- **Health & Monitoring**: Store health checks and statistics endpoints

### Integration Design

**Completed Components**:
- **TranslationService Integration**: Seamless integration with existing translation package
- **CLI Workflow Examples**: Complete usage patterns for Gunpla data scraping
- **Configuration Management**: Flexible configuration options with sensible defaults
- **Error Recovery**: Graceful degradation and fallback strategies
- **Performance Optimization**: Memory management and caching strategies

## Architecture Decisions

### Storage Architecture

**Decision**: JSON file-based storage with content-addressable hashing
```typescript
// Architecture layers:
// 1. Application Layer: TranslationService (existing)
// 2. Store Layer: TranslationStore (new)
// 3. File System Layer: JSONStorage (new)
// 4. Hash Strategy: SHA-256 content addressing

// File structure:
// .gundam-cache/translations/
// ├── ab/                    # First 2 chars of SHA-256 hash
// │   ├── abcdef...json     # Translation files
// │   └── abcdef...json.br  # Compressed files
// ├── cd/
// │   └── cdef78...json
// └── metadata.json         # Store metadata and index
```

**Rationale**: JSON files provide simplicity, debuggability, and easier maintenance for CLI use case compared to SQLite database complexity.

### Concurrency Strategy

**Decision**: File-based locking with atomic write operations
- `proper-lockfile` for cross-process coordination
- Temp file + rename pattern for atomic writes
- Two-level sharding (`ab/abcdef1234...`) for file system optimization
- Process-safe file operations with proper cleanup

### Performance Strategy

**Decision**: Optimized for CLI use case with file system awareness
- In-memory LRU cache for frequently accessed JSON files
- Two-level hash sharding for directory optimization (40-70% performance improvement)
- Brotli compression for files >1KB (75-85% compression ratio)
- Concurrent I/O with `p-limit` for performance control
- OS-level caching through appropriate access patterns

### Hash-Based Content Addressing

**Decision**: SHA-256 content addressing for file naming and deduplication
```typescript
// Key generation: "source:target:base64hash"
const key = `${sourceLang}:${targetLang}:${base64Hash(originalText)}`;
const filePath = `${hashPrefix[0:2]}/${hashPrefix}.json`;
```

**Benefits**:
- Natural deduplication (identical content = identical file)
- Data integrity verification through hash validation
- O(1) lookup performance regardless of dataset size
- Simple backup and migration with standard file operations

## Implementation Gates

### Phase 2 Prerequisites

✅ **Research Complete**: All technical unknowns resolved
✅ **Design Complete**: Data models and API contracts finalized
✅ **Architecture Defined**: Clear separation of concerns and interfaces
✅ **Compliance Verified**: Constitution requirements addressed

### Critical Success Factors

1. **Data Integrity**: Atomic operations and proper locking prevent corruption
2. **Performance**: Sub-100ms initialization, sub-50ms lookups at target scale
3. **Reliability**: Graceful degradation when disk access fails
4. **Maintainability**: Clean interfaces and comprehensive error handling
5. **Integration**: Seamless addition to existing translation package

## Dependencies Required

```json
{
  "dependencies": {
    "proper-lockfile": "^5.0.0"
  },
  "devDependencies": {}
}
```

**Note**: Using built-in Node.js modules for core functionality:
- `crypto` - SHA-256 hashing (built-in)
- `zlib` - Brotli/Gzip compression (built-in)
- `fs/promises` - Async file operations (built-in)
- `path` - Cross-platform path handling (built-in)

## Success Metrics

- **Functional**: 95% API call reduction for repeated translations
- **Performance**: <100ms initialization, <50ms lookup, <10MB for 10k entries
- **Reliability**: 99.9% data integrity across restarts
- **Usability**: Drop-in replacement for existing cache interface
- **Maintainability**: 100% TypeScript coverage, comprehensive test suite

## Next Steps

**Phase 2**: Implementation task generation
- Use `/speckit.tasks` to create atomic implementation tasks
- Prioritize P1 user stories (persistent storage core functionality)
- Include comprehensive test coverage for all components
- Plan integration testing with existing translation package

The plan is ready for implementation with all research completed, design finalized, and constitutional requirements satisfied.