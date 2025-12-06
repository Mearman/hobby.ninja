# @unnamed-gunpla-app/translation

A production-ready translation package for Gunpla data with caching, error handling, and retry logic. Optimized for Japanese to English translation of Gundam/Gunpla model kit information.

## Features

- **🔄 Batch Translation**: Translate multiple texts efficiently with rate limiting
- **💾 Intelligent Caching**: In-memory LRU cache with TTL support
- **🔄 Retry Logic**: Automatic retry with exponential backoff for transient errors
- **⚡ Rate Limiting**: Built-in rate limiting to avoid API abuse
- **🛡️ Circuit Breaker**: Prevents cascade failures during service outages
- **📊 Metrics**: Comprehensive statistics and monitoring
- **🇯🇵 Gundam-Specific**: Pre-configured text replacements for Gunpla terminology
- **📝 JSON Translation**: Recursive translation of objects and arrays
- **🛡️ TypeScript**: Full type safety with Zod schemas
- **🧪 Tested**: Comprehensive unit tests with Vitest

## Installation

```bash
pnpm add @unnamed-gunpla-app/translation
```

## Quick Start

### Basic Text Translation

```typescript
import { translateText } from '@unnamed-gunpla-app/translation';

// Simple translation
const result = await translateText('こんにちは世界', 'en');
console.log(result.translated); // "Hello world"

// With source language specified
const result2 = await translateText('HG 1/144 RX-78-2 ガンダム', 'en', 'ja');
console.log(result2.translated); // "HG 1/144 RX-78-2 Gundam"
```

### JSON Translation

```typescript
import { translateJson } from '@unnamed-gunpla-app/translation';

const gunplaData = {
  name: 'HG 1/144 RX-78-2 ガンダム',
  description: '機動戦士ガンダムの主役機',
  specifications: {
    scale: '1/144',
    series: '機動戦士ガンダム',
  },
  price: 1500, // Numbers preserved by default
};

const translatedData = await translateJson(gunplaData, 'en');
console.log(translatedData);
/*
{
  name: 'HG 1/144 RX-78-2 Gundam',
  description: 'Main mecha from Mobile Suit Gundam',
  specifications: {
    scale: '1/144',
    series: 'Mobile Suit Gundam',
  },
  price: 1500,
}
*/
```

### Batch Translation

```typescript
import { translateBatch } from '@unnamed-gunpla-app/translation';

const texts = [
  'HG 1/144 RX-78-2 ガンダム',
  'MG 1/100 νガンダム',
  'PG 1/60 ストライクフリーダムガンダム',
];

const results = await translateBatch(texts, 'en');
console.log(results.results);
```

## Advanced Usage

### Custom Translation Service

```typescript
import { TranslationService } from '@unnamed-gunpla-app/translation';

const translator = new TranslationService({
  cacheEnabled: true,
  cacheTtl: 1000 * 60 * 60 * 24, // 1 day
  retryAttempts: 5,
  retryDelay: 2000,
  timeout: 15000,
  batchSize: 20,
});

const result = await translator.translateText('テスト', 'en');
```

### JSON Translation with Custom Options

```typescript
import { translateJson } from '@unnamed-gunpla-app/translation';

const data = {
  product_name: '製品名',
  internal_id: '123',
  description: '製品説明',
};

const options = {
  translateKeys: true, // Also translate object keys
  ignoredKeys: ['internal_id'], // Custom ignored keys
  ignoredPatterns: [/^_/], // Ignore keys starting with _
  preserveNumbers: false, // Convert numbers to strings
};

const translated = await translateJson(data, 'en', options);
```

### Custom Cache

```typescript
import { TranslationService, createCache } from '@unnamed-gunpla-app/translation';

// Create custom cache with specific settings
const customCache = createCache({
  maxSize: 5000,
  defaultTtl: 1000 * 60 * 60 * 12, // 12 hours
  enablePeriodicCleanup: true,
});

const translator = new TranslationService({}, customCache);
```

## API Reference

### Types

#### `TranslationResult`

```typescript
interface TranslationResult {
  original: string;
  translated: string;
  sourceLanguage: string;
  targetLanguage: string;
  cached: boolean;
  processingTime: number;
}
```

#### `TranslationOptions`

```typescript
interface TranslationOptions {
  sourceLanguage?: string;
  targetLanguage: string;
  cacheEnabled?: boolean;
  cacheTtl?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  batchSize?: number;
}
```

#### `JsonTranslationOptions`

```typescript
interface JsonTranslationOptions extends TranslationOptions {
  translateKeys?: boolean;
  ignoredKeys?: string[];
  ignoredPatterns?: RegExp[];
  preserveNumbers?: boolean;
  preserveBooleans?: boolean;
}
```

### Main Classes

#### `TranslationService`

Main class for text translation with caching and error handling.

```typescript
const translator = new TranslationService(options?, cache?);
```

**Methods:**

- `translateText(text, targetLanguage, sourceLanguage?)`: Translate single text
- `translateBatch(request)`: Translate multiple texts in batch
- `getCacheStats()`: Get cache statistics
- `getCircuitBreakerStatus()`: Get circuit breaker status
- `getErrorStats()`: Get error statistics
- `clearCache()`: Clear all cached translations
- `resetCircuitBreaker()`: Reset circuit breaker state

#### `JsonTranslator`

Class for translating JSON objects and arrays recursively.

```typescript
const jsonTranslator = new JsonTranslator(translator?);
```

**Methods:**

- `translateJson(data, targetLanguage, options?)`: Translate JSON data

#### `TranslationCache`

LRU cache implementation for translations.

```typescript
const cache = new TranslationCache(maxSize?, defaultTtl?, enablePeriodicCleanup?);
```

**Methods:**

- `get(text, sourceLanguage, targetLanguage)`: Get cached translation
- `set(text, sourceLanguage, targetLanguage, value, customTtl?)`: Cache translation
- `has(text, sourceLanguage, targetLanguage)`: Check if translation exists
- `delete(text, sourceLanguage, targetLanguage)`: Delete cached translation
- `clear()`: Clear all entries
- `getStats()`: Get cache statistics
- `evictExpired()`: Remove expired entries
- `export()`: Export cache data
- `import(entries)`: Import cache data

### Error Handling

The package provides comprehensive error handling with custom error types:

```typescript
import { TranslationServiceError, TranslationErrorCode } from '@unnamed-gunpla-app/translation';

try {
  const result = await translateText('テキスト', 'en');
} catch (error) {
  if (error instanceof TranslationServiceError) {
    switch (error.code) {
      case TranslationErrorCode.RATE_LIMIT_EXCEEDED:
        // Handle rate limiting
        break;
      case TranslationErrorCode.NETWORK_ERROR:
        // Handle network issues
        break;
      // ... other error codes
    }
  }
}
```

### Error Codes

- `NETWORK_ERROR`: Network connectivity issues
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded
- `QUOTA_EXCEEDED`: Translation quota exceeded
- `INVALID_REQUEST`: Invalid request parameters
- `SERVICE_UNAVAILABLE`: Translation service down
- `TIMEOUT`: Request timeout
- `PARSING_ERROR`: Failed to parse response
- `CACHE_ERROR`: Cache operation failed
- `UNKNOWN_ERROR`: Unexpected error

## Gundam-Specific Features

### Text Replacements

The package includes pre-configured text replacements for common Gundam/Gunpla terminology:

- `ガンダム` → `Gundam`
- `ガンプラ` → `Gunpla`
- `HG`, `MG`, `PG`, `RG` → Preserved as-is
- Common Japanese particles and markers
- Model kit terminology (ランナー → Runner, etc.)

### Ignored Keys for JSON Translation

Default ignored keys that typically don't need translation:
- `id`, `url`, `image`, `images`
- `pdf`, `scale`, `language`
- `partNumber`, `link`, `price`
- `currency`, `date`, `createdAt`, `updatedAt`

## Performance and Optimization

### Rate Limiting

Built-in rate limiting prevents API abuse:
- Default delay: 1 second between requests
- Configurable via `retryDelay` option
- Automatic jitter to prevent thundering herd

### Caching Strategy

- **Memory Cache**: LRU eviction with configurable TTL
- **Cache Hit Optimization**: Instant returns for cached translations
- **Automatic Cleanup**: Periodic removal of expired entries
- **Cache Statistics**: Monitor hit rates and memory usage

### Batch Processing

- Efficient batch translation with configurable batch sizes
- Automatic chunking for large arrays
- Parallel processing with rate limiting

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Watch mode
pnpm test --watch
```

## Browser Compatibility

- Modern browsers with ES2020 support
- Fetch API required (polyfill available)
- Uses native AbortController for timeouts

## License

Internal package for the Gunpla Collection Manager project.