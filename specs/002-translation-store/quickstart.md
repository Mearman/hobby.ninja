# TranslationStore Quickstart Guide

## Overview

The TranslationStore provides permanent disk-based caching for CLI translation operations, specifically designed for the Gunpla collection manager's Japanese to English translation workflows. It eliminates redundant API calls by storing translations persistently across CLI runs.

## Installation

```bash
# Add to translation package dependencies
pnpm add proper-lockfile better-sqlite3
pnpm add -D @types/better-sqlite3
```

## Basic Usage

### Creating a Translation Store

```typescript
import { TranslationStore, createTranslationStore } from '@unnamed-gunpla-app/translation';

// Create store with default configuration
const store = createTranslationStore();

// Or with custom configuration
const store = createTranslationStore({
  storagePath: './.cache/translations',
  maxEntries: 10000,
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
  compressionThreshold: 1024,
  defaultTTL: 30 * 24 * 60 * 60 * 1000, // 30 days
  enableCompression: true,
  memoryCacheSize: 1000
});
```

### Storing and Retrieving Translations

```typescript
// Store a translation
const entry = await store.set({
  originalText: 'ガンダム Mk-II',
  translatedText: 'Gundam Mk-II',
  sourceLanguage: 'ja',
  targetLanguage: 'en',
  confidence: 0.95,
  apiProvider: 'google-translate'
});

// Retrieve a translation
const translation = await store.get('ja:en:base64hash');
if (translation) {
  console.log('Found cached translation:', translation.translatedText);
} else {
  console.log('Translation not found, calling API...');
}
```

### Integration with Translation Service

```typescript
import { TranslationService } from '@unnamed-gunpla-app/translation';

// Create store-enabled translation service
const store = createTranslationStore();
const translator = new TranslationService(
  { cacheEnabled: true, targetLanguage: 'en' },
  store // Pass store as cache implementation
);

// Translation will automatically use persistent storage
const result = await translator.translateText(
  'ガンダム',
  'en',
  'ja'
);
```

## Configuration Options

### StoreConfiguration

```typescript
interface StoreConfiguration {
  // Storage settings
  storagePath: string;           // Directory for store files
  maxEntries: number;            // Maximum entries to store
  maxSizeBytes: number;          // Maximum disk usage
  compressionThreshold: number;   // Min size to trigger compression

  // Performance settings
  memoryCacheSize: number;       // Memory cache entries
  syncInterval: number;          // Sync interval (ms)
  lockTimeout: number;           // File lock timeout

  // Behavior settings
  defaultTTL: number;            // Default time-to-live
  enableCompression: boolean;    // Enable data compression
  enableMetrics: boolean;        // Enable performance metrics
}
```

### Default Configuration

```typescript
const defaultConfig = {
  storagePath: '.gundam-cache/translations',
  maxEntries: 10000,
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
  compressionThreshold: 1024,
  memoryCacheSize: 1000,
  syncInterval: 5000,
  lockTimeout: 10000,
  defaultTTL: 30 * 24 * 60 * 60 * 1000, // 30 days
  enableCompression: true,
  enableMetrics: true
};
```

## CLI Integration Example

### Gunpla Scraper with Translation Caching

```typescript
#!/usr/bin/env node
import { TranslationService, createTranslationStore } from '@unnamed-gunpla-app/translation';

class GunplaScraper {
  private translator: TranslationService;

  constructor() {
    // Initialize persistent translation store
    const store = createTranslationStore({
      storagePath: './.cache/translations',
      maxEntries: 50000,
      maxSizeBytes: 200 * 1024 * 1024 // 200MB for large dataset
    });

    // Create translation service with persistent cache
    this.translator = new TranslationService({
      cacheEnabled: true,
      targetLanguage: 'en',
      retryAttempts: 3,
      timeout: 10000
    }, store);
  }

  async scrapeAndTranslate(): Promise<void> {
    console.log('Starting Gunpla data scraping with translation caching...');

    const kitData = await this.fetchKitData();

    for (const kit of kitData) {
      // Translation will automatically use cached results
      if (kit.descriptionJa) {
        const translation = await this.translator.translateText(
          kit.descriptionJa,
          'en',
          'ja'
        );

        kit.descriptionEn = translation.translatedText;
        console.log(`✓ Translated: ${kit.name}`);
      }
    }

    // Save translated data
    await this.saveTranslatedData(kitData);

    // Get cache statistics
    const stats = this.translator.getCacheStats();
    console.log(`Cache stats: ${stats.size}/${stats.maxSize} entries, ${Math.round(stats.hitRate * 100)}% hit rate`);
  }

  private async fetchKitData(): Promise<any[]> {
    // Implementation for fetching Japanese kit data
    return [];
  }

  private async saveTranslatedData(data: any[]): Promise<void> {
    // Implementation for saving translated data
  }
}

// Run scraper
const scraper = new GunplaScraper();
scraper.scrapeAndTranslate().catch(console.error);
```

## Store Management

### Monitoring Store Health

```typescript
// Get store statistics
const stats = await store.getStatistics();
console.log('Store Statistics:', {
  totalEntries: stats.totalEntries,
  activeEntries: stats.activeEntries,
  diskUsage: `${(stats.diskUsageBytes / 1024 / 1024).toFixed(2)} MB`,
  hitRate: `${Math.round(stats.hitRate * 100)}%`,
  compressionRatio: `${Math.round(stats.compressionRatio * 100)}%`
});

// Check store health
const health = await store.getHealth();
if (health.status !== 'healthy') {
  console.warn('Store health issues detected:', health.errors);
}
```

### Maintenance Operations

```typescript
// Cleanup expired entries
const cleanupResult = await store.cleanup({
  removeExpired: true,
  removeCorrupted: true,
  enforceSizeLimit: true,
  dryRun: false
});

console.log(`Cleanup completed: ${cleanupResult.entriesRemoved} entries removed, ${cleanupResult.bytesFreed} bytes freed`);

// Search for specific translations
const searchResults = await store.search({
  sourceLanguage: 'ja',
  targetLanguage: 'en',
  textContains: 'ガンダム',
  limit: 100
});

console.log(`Found ${searchResults.total} matching translations`);
```

## Performance Optimization

### Batch Operations

```typescript
// Store multiple translations efficiently
const translations = [
  { originalText: 'ガンダム', translatedText: 'Gundam', sourceLanguage: 'ja', targetLanguage: 'en' },
  { originalText: 'ザク', translatedText: 'Zaku', sourceLanguage: 'ja', targetLanguage: 'en' },
  { originalText: 'ヒャッck', translatedText: 'Hyaku-Shiki', sourceLanguage: 'ja', targetLanguage: 'en' }
];

const batchResult = await store.setBatch(translations);
console.log(`Stored ${batchResult.successful}/${batchResult.total} translations`);
```

### Memory Management

```typescript
// Configure memory cache for frequently accessed translations
const store = createTranslationStore({
  memoryCacheSize: 2000, // Keep 2000 entries in memory
  enableMetrics: true    // Track performance
});

// Monitor memory usage
const memoryUsage = store.getMemoryUsage();
if (memoryUsage.usedRatio > 0.8) {
  console.warn('Memory cache approaching capacity limit');
}
```

## Error Handling

```typescript
try {
  const translation = await store.get('ja:en:invalid-key');
} catch (error) {
  if (error.code === 'STORAGE_CORRUPTED') {
    console.error('Store corrupted, attempting recovery...');
    await store.recover();
  } else if (error.code === 'DISK_FULL') {
    console.error('Disk full, running cleanup...');
    await store.cleanup({ enforceSizeLimit: true });
  } else {
    console.error('Translation store error:', error);
    // Fallback to in-memory only mode
    const fallbackTranslator = new TranslationService();
  }
}
```

## File Structure

The TranslationStore creates the following file structure:

```
.gundam-cache/
└── translations/
    ├── cache.db           # SQLite database with translations
    ├── cache.db-wal       # Write-ahead log for concurrent access
    ├── cache.db-shm       # Shared memory for concurrent access
    ├── metadata.json      # Store metadata and configuration
    └── .lock             # File lock for coordination
```

## Migration and Backup

### Exporting Data

```typescript
// Export all translations to JSON
const exportData = await store.export();
await fs.writeFile('translations-backup.json', JSON.stringify(exportData, null, 2));
```

### Importing Data

```typescript
// Import translations from JSON backup
const importData = JSON.parse(await fs.readFile('translations-backup.json', 'utf8'));
await store.import(importData);
```

## Best Practices

1. **Configure appropriate TTL**: Set TTL based on how frequently source data changes
2. **Monitor disk usage**: Regularly check store size and run cleanup as needed
3. **Handle errors gracefully**: Always wrap store operations in try-catch blocks
4. **Use batch operations**: Store multiple translations in batches for better performance
5. **Test with realistic data**: Validate performance with your actual dataset sizes
6. **Plan for migration**: Store version compatibility handles future format changes

## Troubleshooting

### Common Issues

**Store initialization fails**:
- Check directory permissions for storage path
- Ensure sufficient disk space available
- Verify no other processes are locking the files

**Poor performance**:
- Increase memory cache size for frequently accessed data
- Enable compression for large text entries
- Consider reducing max entries if memory is constrained

**High disk usage**:
- Run cleanup with size limit enforcement
- Reduce TTL for entries that become stale quickly
- Monitor compression ratio effectiveness

For additional support, check the store health endpoint and review error logs for specific issues.