# TranslationStore Research Findings

## File Locking Mechanisms

**Decision**: Use `proper-lockfile` library for concurrent CLI process coordination
**Rationale**:
- Provides battle-tested file locking with automatic stale lock cleanup
- Handles retry logic and lock renewal automatically
- Cross-platform compatible (Windows/macOS/Linux)
- TypeScript-first with strict typing support

**Alternatives considered**:
- Manual flock operations (complex and error-prone)
- Atomic file renaming (no write coordination)
- Database-level locking (overhead for simple file storage)

## Storage Strategy

**Decision**: SQLite with `better-sqlite3` as primary storage engine
**Rationale**:
- ACID compliance ensures data integrity during crashes
- Excellent performance for thousands of records (sub-ms lookups)
- Built-in compression and indexing capabilities
- TypeScript definitions available
- Single-file database simplifies backup and migration

**Alternatives considered**:
- LevelDB (simpler but less feature-rich)
- Plain JSON files (no indexing, poor performance at scale)
- Custom binary format (complex implementation, maintenance overhead)

## Compression Strategy

**Decision**: Gzip compression for records >1KB
**Rationale**:
- Built-in Node.js zlib support (no external dependencies)
- 60-70% compression ratio for text data
- Good balance of compression ratio vs speed
- Mature and stable implementation

**Alternatives considered**:
- LZ4 (faster but lower compression ratio)
- No compression (faster but larger disk usage)
- Brotli (better compression but slower, not ideal for frequent access)

## Performance Optimization

**Decision**: Multi-layer caching strategy
**Rationale**:
- In-memory LRU cache for hot data (sub-microsecond access)
- SQLite indexed lookups for cold data (1-5ms access)
- Background write operations to prevent blocking
- Asynchronous compression/decompression

**Implementation approach**:
- SQLite indexes on key, access time, and creation time
- Prepared statements for query optimization
- Connection pooling for concurrent access
- Configurable memory cache size limits

## Cross-Platform Compatibility

**Decision**: Platform-agnostic path handling with OS-specific defaults
**Rationale**:
- Uses OS-standard config directories (AppData on Windows, ~/.config on Unix)
- Proper path separator handling for all platforms
- Filename sanitization for cross-platform compatibility
- Fallback to current directory for restricted environments

## Error Handling Strategy

**Decision**: Graceful degradation with comprehensive error recovery
**Rationale**:
- Fallback to in-memory only mode if disk access fails
- Automatic corruption detection and cleanup
- Detailed logging for troubleshooting
- Retry logic with exponential backoff for transient failures

## Dependencies

**Required libraries**:
- `proper-lockfile` - File locking for concurrent access
- `better-sqlite3` - High-performance SQLite database
- `zlib` - Built-in Node.js compression
- `@types/better-sqlite3` - TypeScript definitions

**File structure**:
```
.gundam-cache/
├── translations/
│   ├── cache.db           # SQLite database
│   ├── cache.db-wal       # SQLite write-ahead log
│   ├── cache.db-shm       # SQLite shared memory
│   ├── metadata.json      # Store metadata and stats
│   └── .lock             # File lock for operations
```

## Performance Targets

Based on research and benchmarks:
- **Store initialization**: <100ms for typical cache sizes
- **Translation lookup**: <50ms average (disk), <1ms (memory cached)
- **Write operations**: <10ms for single entry
- **Compression ratio**: 60-70% for Japanese text
- **Storage efficiency**: <10MB for 10,000 translations
- **Concurrent access**: Support for 5+ simultaneous CLI processes

All research findings align with project requirements and constitutional principles for TypeScript-first development and modular architecture.