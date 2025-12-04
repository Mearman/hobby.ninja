# TranslationStore Integration

This document explains how to use the TranslationStore with the TranslationService for persistent caching of translations.

## Overview

The TranslationStore provides persistent storage for translation data, allowing you to:

- Cache translations across application restarts
- Reduce API calls by reusing previously translated content
- Store translation metadata (confidence scores, API providers, TTL)
- Monitor translation usage patterns and performance

## Quick Start

### Basic Usage

```typescript
import {
  createTranslationServiceWithStore,
  translateText
} from '@workspace/translation';

// Create a service with persistent storage (uses defaults)
const service = await createTranslationServiceWithStore(
  { cacheEnabled: true }, // Translation options
  { storagePath: './translations' } // Store configuration
);

// Translate - will check store first, then API if needed
const result = await service.translateText('Hello world', 'ja', 'en');
console.log(result.translated); // 'こんにちは世界'

// Subsequent calls will use the store cache
const cachedResult = await service.translateText('Hello world', 'ja', 'en');
console.log(cachedResult.cached); // true
```

### Using Factory Functions

```typescript
import {
  createTranslationStore,
  createServerTranslationStore,
  createBrowserTranslationStore,
  TranslationService
} from '@workspace/translation';

// Create a store with custom configuration
const store = await createTranslationStore({
  storagePath: './my-translations',
  maxEntries: 5000,
  defaultTTL: 30 * 24 * 60 * 60 * 1000, // 30 days
  enableCompression: true,
});

// Create service with the store
const service = new TranslationService(
  { cacheEnabled: true },
  undefined, // Use default cache
  store
);

// Or use the convenience function
const service = await createTranslationServiceWithStore(
  { cacheEnabled: true },
  { storagePath: './my-translations' }
);
```

### Environment-Specific Configurations

#### Server Environment

```typescript
const serverStore = await createServerTranslationStore('/var/cache/translations', {
  maxEntries: 50000, // Large capacity
  maxSizeBytes: 1024 * 1024 * 1024, // 1GB
  enableMetrics: true,
});
```

#### Browser Environment

```typescript
const browserStore = await createBrowserTranslationStore('./user-data', {
  maxEntries: 1000, // Smaller for client
  enableMetrics: false, // Reduce overhead
});
```

#### Test Environment

```typescript
const testStore = await createTestTranslationStore('./test-data');
```

## Translation Workflow

When using TranslationStore with TranslationService, the workflow is:

1. **Store Check**: First check if translation exists in TranslationStore
2. **Memory Cache**: Check in-memory cache if not in store
3. **API Translation**: Call translation API if not cached
4. **Store Storage**: Store new translation in TranslationStore
5. **Memory Cache**: Also store in memory cache for immediate access

## Error Handling

The integration is designed to be resilient:

```typescript
const service = await createTranslationServiceWithStore();

// If store fails, translation continues with API only
const result = await service.translateText('Hello', 'ja');
// Store errors are logged but don't break the translation
```

## Configuration Options

### StoreConfiguration

```typescript
interface StoreConfiguration {
  // Storage settings
  storagePath: string;           // Directory for store files
  maxEntries: number;            // Maximum entries to store
  maxSizeBytes: number;          // Maximum disk usage
  compressionThreshold: number;  // Minimum size to compress

  // Performance settings
  memoryCacheSize: number;       // In-memory cache entries
  syncInterval: number;          // Sync operation interval
  lockTimeout: number;           // File lock timeout

  // Behavior settings
  defaultTTL: number;            // Default time-to-live
  enableCompression: boolean;    // Enable data compression
  enableMetrics: boolean;        // Collect performance metrics
}
```

### TranslationOptions

```typescript
interface TranslationOptions {
  cacheEnabled: boolean;         // Enable in-memory caching
  cacheTtl: number;             // Cache TTL in milliseconds
  batchSize: number;            // Batch translation size
  timeout: number;              // Request timeout
  retryAttempts: number;        // Retry attempts
  retryDelay: number;           // Retry delay
}
```

## Advanced Usage

### Custom Store Integration

```typescript
import { TranslationService, createTranslationStore } from '@workspace/translation';

// Create custom store
const store = await createTranslationStore({
  storagePath: './custom-translations',
  maxEntries: 10000,
  defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  enableCompression: true,
  enableMetrics: true,
});

// Create service with custom options
const service = new TranslationService(
  {
    cacheEnabled: true,
    cacheTtl: 60 * 60 * 1000, // 1 hour memory cache
    timeout: 10000,
  },
  undefined, // Default memory cache
  store
);

// Use the service
const result = await service.translateText('Custom text', 'ja');
```

### Monitoring and Statistics

```typescript
// Get store statistics
const stats = store.getStatistics();
console.log(`Total entries: ${stats.totalEntries}`);
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`Disk usage: ${stats.diskUsageBytes} bytes`);

// Get store health
const health = store.getHealth();
console.log(`Status: ${health.status}`);
console.log(`Errors: ${health.errors.length}`);

// Get service cache stats
const cacheStats = service.getCacheStats();
console.log(`Memory cache size: ${cacheStats.size}`);
```

### Dynamic Store Management

```typescript
// Add store after service creation
const service = new TranslationService();
const store = await createTranslationStore();
service.setTranslationStore(store);

// Remove store
service.setTranslationStore(undefined);

// Check if store is available
if (service.hasTranslationStore()) {
  console.log('Persistent storage is available');
}
```

## Migration from Existing Code

The integration maintains backward compatibility:

```typescript
// Existing code continues to work
import { TranslationService, translateText } from '@workspace/translation';

const service = new TranslationService();
const result = await translateText('Hello', 'ja');

// Enhanced with store - optional
const storeService = await createTranslationServiceWithStore();
const cachedResult = await storeService.translateText('Hello', 'ja');
```

## Performance Considerations

- **Disk I/O**: Store operations are asynchronous and don't block translations
- **Compression**: Enabled by default for entries > 1KB
- **Memory Usage**: Configurable memory cache for frequently accessed translations
- **Cleanup**: Automatic cleanup of expired entries
- **Metrics**: Optional performance monitoring (disable in production if needed)

## File Structure

```
translations/
├── metadata.json           # Store metadata and configuration
├── ab/                     # First two characters of hash
│   └── abc123...json       # Translation entry file
├── cd/
│   └── cdef456...json
└── ...
```

Each translation is stored in a separate file with content-addressable naming based on SHA-256 hash.

## Security Considerations

- Store files are stored locally and not encrypted by default
- Translation data may contain sensitive information
- Ensure appropriate file permissions on storage directory
- Consider encryption for sensitive applications

## Troubleshooting

### Common Issues

1. **Store initialization fails**
   - Check storage directory permissions
   - Ensure sufficient disk space
   - Validate configuration parameters

2. **Translations not caching**
   - Verify store is initialized: `store.isReady()`
   - Check for store errors: `store.getHealth().errors`
   - Ensure TTL is appropriate

3. **Performance issues**
   - Reduce `memoryCacheSize` if memory constrained
   - Disable `enableMetrics` in production
   - Adjust `compressionThreshold` based on typical text sizes

### Debug Logging

```typescript
// Enable console logging for store operations
const store = await createTranslationStore({
  storagePath: './translations',
  enableMetrics: true,
});

// Check for errors
const health = store.getHealth();
health.errors.forEach(error => {
  console.error(`Store error: ${error.code}: ${error.message}`);
});
```

## Best Practices

1. **Configuration**: Use environment-specific configurations
2. **Error Handling**: Always handle store errors gracefully
3. **Monitoring**: Enable metrics in development, disable in production
4. **Cleanup**: Set appropriate TTL values for your use case
5. **Testing**: Use `createTestTranslationStore` for unit tests

## API Reference

See the TypeScript definitions and JSDoc comments in the source files for detailed API documentation.

### Key Functions

- `createTranslationStore(config?)` - Create store with defaults
- `createServerTranslationStore(path, config?)` - Server-optimized store
- `createBrowserTranslationStore(path?, config?)` - Browser-optimized store
- `createTestTranslationStore(path?)` - Test-optimized store
- `createTranslationServiceWithStore(options?, storeConfig?)` - Service with store

### Key Methods

- `service.translateText(text, targetLang, sourceLang?)` - Translate with caching
- `service.setTranslationStore(store?)` - Add/remove store
- `service.hasTranslationStore()` - Check store availability
- `store.set(source, target, sourceLang, targetLang, metadata?)` - Store translation
- `store.getByText(source, sourceLang, targetLang)` - Retrieve by text
- `store.getStatistics()` - Get usage statistics
- `store.getHealth()` - Get health status