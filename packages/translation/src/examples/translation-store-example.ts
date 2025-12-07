/**
 * Comprehensive examples demonstrating TranslationStore integration with TranslationService
 */

import {
  TranslationService,
  createTranslationServiceWithStore,
  createTranslationStore,
  createServerTranslationStore,
  createBrowserTranslationStore,
  createTestTranslationStore,
  translateText,
  SupportedLanguage,
  TranslationResult,
  TranslationStoreError,
  type StoreConfiguration,
} from '../mod';

/**
 * Example 1: Basic usage with factory function
 */
async function basicUsageExample() {
  console.log('=== Basic TranslationStore Example ===');

  try {
    // Create service with persistent storage using default configuration
    const service = await createTranslationServiceWithStore(
      { cacheEnabled: true }, // Translation options
      { storagePath: './example-translations' } // Store configuration
    );

    // First translation - will call API and store result
    console.log('Translating "Hello world"...');
    const result1 = await service.translateText('Hello world', 'ja', 'en');
    console.log(`Result: ${result1.translated} (cached: ${result1.cached})`);

    // Second translation - will use stored result
    console.log('Translating "Hello world" again...');
    const result2 = await service.translateText('Hello world', 'ja', 'en');
    console.log(`Result: ${result2.translated} (cached: ${result2.cached})`);

    // Different translation - will call API
    console.log('Translating "Goodbye"...');
    const result3 = await service.translateText('Goodbye', 'ja', 'en');
    console.log(`Result: ${result3.translated} (cached: ${result3.cached})`);

  } catch (error) {
    console.error('Error in basic example:', error);
  }
}

/**
 * Example 2: Custom store configuration
 */
async function customConfigurationExample() {
  console.log('\n=== Custom Configuration Example ===');

  try {
    // Create custom store configuration
    const customConfig: Partial<StoreConfiguration> = {
      storagePath: './custom-translations',
      maxEntries: 5000,
      maxSizeBytes: 50 * 1024 * 1024, // 50MB
      defaultTTL: 30 * 24 * 60 * 60 * 1000, // 30 days
      enableCompression: true,
      enableMetrics: true,
      memoryCacheSize: 500,
    };

    // Create store with custom configuration
    const store = await createTranslationStore(customConfig);

    // Create service with the store
    const service = new TranslationService(
      {
        cacheEnabled: true,
        cacheTtl: 2 * 60 * 60 * 1000, // 2 hours memory cache
        timeout: 15000, // 15 seconds
      },
      undefined, // Use default memory cache
      store
    );

    // Test the service
    const texts = [
      'Machine learning',
      'Artificial intelligence',
      'Deep learning',
    ];

    for (const text of texts) {
      const result = await service.translateText(text, 'ja', 'en');
      console.log(`${text} -> ${result.translated}`);
    }

    // Show store statistics
    const stats = store.getStatistics();
    console.log('\nStore Statistics:');
    console.log(`Total entries: ${stats.totalEntries}`);
    console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    console.log(`Average lookup time: ${stats.averageLookupTime.toFixed(2)}ms`);

  } catch (error) {
    console.error('Error in custom configuration example:', error);
  }
}

/**
 * Example 3: Environment-specific configurations
 */
async function environmentSpecificExample() {
  console.log('\n=== Environment-Specific Example ===');

  const environment = process.env['NODE_ENV'] || 'development';

  try {
    let service: TranslationService;

    switch (environment) {
      case 'production':
        // Production-optimized configuration
        const serverStore = await createServerTranslationStore('/var/cache/translations', {
          maxEntries: 100000,
          maxSizeBytes: 2 * 1024 * 1024 * 1024, // 2GB
          enableMetrics: false, // Disable in production
        });
        service = new TranslationService(
          { cacheEnabled: true, timeout: 20000 },
          undefined,
          serverStore
        );
        console.log('Created production-optimized service');
        break;

      case 'development':
        // Development configuration
        const devStore = await createBrowserTranslationStore('./dev-translations', {
          enableMetrics: true,
          maxEntries: 1000,
        });
        service = new TranslationService(
          { cacheEnabled: true },
          undefined,
          devStore
        );
        console.log('Created development-optimized service');
        break;

      case 'test':
        // Test configuration
        const testStore = await createTestTranslationStore('./test-translations');
        service = new TranslationService(
          { cacheEnabled: false }, // Disable memory cache in tests
          undefined,
          testStore
        );
        console.log('Created test-optimized service');
        break;

      default:
        // Default configuration
        service = await createTranslationServiceWithStore();
        console.log('Created default service');
    }

    // Test the service
    const result = await service.translateText('Environment-specific test', 'ja', 'en');
    console.log(`Translation result: ${result.translated}`);

  } catch (error) {
    console.error('Error in environment-specific example:', error);
  }
}

/**
 * Example 4: Error handling and resilience
 */
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');

  try {
    // Create service with potentially invalid configuration
    const service = await createTranslationServiceWithStore(
      { cacheEnabled: true },
      {
        storagePath: '/invalid/path/that/does/not/exist',
        maxEntries: 1000,
      }
    );

    console.log('Testing translation with store initialization failure...');

    // Even if store fails, translation should work with API
    const result = await service.translateText('Resilience test', 'ja', 'en');
    console.log(`Translation succeeded: ${result.translated}`);

    // Check store status
    if (service.hasTranslationStore()) {
      console.log('TranslationStore is available and ready');
    } else {
      console.log('TranslationStore is not available, using API only');
    }

  } catch (error) {
    if (error instanceof TranslationStoreError) {
      console.log(`Expected store error: ${error.code} - ${error.message}`);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Example 5: Batch translation with store
 */
async function batchTranslationExample() {
  console.log('\n=== Batch Translation Example ===');

  try {
    const service = await createTranslationServiceWithStore(
      { cacheEnabled: true },
      { storagePath: './batch-translations' }
    );

    const texts = [
      'React is a JavaScript library',
      'TypeScript adds static typing',
      'Node.js enables server-side JavaScript',
      'Vite is a fast build tool',
      'pnpm is a package manager',
    ];

    console.log('Translating batch of texts...');
    const batchResult = await service.translateBatch({
      texts,
      options: {
        targetLanguage: 'ja' as SupportedLanguage,
        sourceLanguage: 'en',
        batchSize: 3,
        cacheEnabled: true,
        cacheTtl: 60 * 60 * 1000, // 1 hour
        timeout: 10000,
        retryAttempts: 3,
        retryDelay: 1000,
      },
    });

    console.log(`Batch translation completed:`);
    console.log(`- Total: ${batchResult.totalCount}`);
    console.log(`- Success: ${batchResult.successCount}`);
    console.log(`- Errors: ${batchResult.errorCount}`);
    console.log(`- Time: ${batchResult.processingTime}ms`);

    // Show some results
    batchResult.results.slice(0, 3).forEach((result, index) => {
      console.log(`${texts[index]} -> ${result.translated}`);
    });

    // Translate the same texts again to test caching
    console.log('\nTranslating same batch again (should use cache)...');
    const cachedBatchResult = await service.translateBatch({
      texts,
      options: {
        targetLanguage: 'ja' as SupportedLanguage,
        sourceLanguage: 'en',
        batchSize: 3,
        cacheEnabled: true,
        cacheTtl: 60 * 60 * 1000, // 1 hour
        timeout: 10000,
        retryAttempts: 3,
        retryDelay: 1000,
      },
    });

    console.log(`Cached batch time: ${cachedBatchResult.processingTime}ms`);
    console.log(`Speedup: ${(batchResult.processingTime / cachedBatchResult.processingTime).toFixed(1)}x`);

  } catch (error) {
    console.error('Error in batch translation example:', error);
  }
}

/**
 * Example 6: Dynamic store management
 */
async function dynamicStoreManagementExample() {
  console.log('\n=== Dynamic Store Management Example ===');

  try {
    // Start with basic service (no store)
    const service = new TranslationService({ cacheEnabled: true });

    console.log('Translating without persistent store...');
    const result1 = await service.translateText('First translation', 'ja', 'en');
    console.log(`Result: ${result1.translated}`);

    // Add store dynamically
    console.log('Adding persistent store...');
    const store = await createTranslationStore({
      storagePath: './dynamic-translations',
    });
    service.setTranslationStore(store);

    console.log('Translating with persistent store...');
    const result2 = await service.translateText('Second translation', 'ja', 'en');
    console.log(`Result: ${result2.translated} (cached: ${result2.cached})`);

    // Remove store
    console.log('Removing persistent store...');
    service.setTranslationStore(undefined);

    console.log('Translating without persistent store again...');
    const result3 = await service.translateText('Third translation', 'ja', 'en');
    console.log(`Result: ${result3.translated}`);

  } catch (error) {
    console.error('Error in dynamic store management example:', error);
  }
}

/**
 * Example 7: Store monitoring and health checks
 */
async function monitoringExample() {
  console.log('\n=== Monitoring and Health Check Example ===');

  try {
    const store = await createTranslationStore({
      storagePath: './monitoring-translations',
      enableMetrics: true,
    });

    const service = new TranslationService(
      { cacheEnabled: true },
      undefined,
      store
    );

    // Perform some translations to generate data
    const texts = [
      'Monitoring test 1',
      'Monitoring test 2',
      'Monitoring test 3',
    ];

    for (const text of texts) {
      await service.translateText(text, 'ja', 'en');
      // Translate again to generate cache hits
      await service.translateText(text, 'ja', 'en');
    }

    // Get store statistics
    const stats = store.getStatistics();
    console.log('Store Statistics:');
    console.log(`- Total entries: ${stats.totalEntries}`);
    console.log(`- Active entries: ${stats.activeEntries}`);
    console.log(`- Expired entries: ${stats.expiredEntries}`);
    console.log(`- Disk usage: ${stats.diskUsageBytes} bytes`);
    console.log(`- Compression ratio: ${stats.compressionRatio.toFixed(2)}`);
    console.log(`- Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    console.log(`- Average lookup time: ${stats.averageLookupTime.toFixed(2)}ms`);
    console.log(`- Average write time: ${stats.averageWriteTime.toFixed(2)}ms`);
    console.log(`- Total lookups: ${stats.totalLookups}`);
    console.log(`- Total writes: ${stats.totalWrites}`);

    // Get store health
    const health = store.getHealth();
    console.log('\nStore Health:');
    console.log(`- Status: ${health.status}`);
    console.log(`- Errors: ${health.errors.length}`);
    console.log(`- Warnings: ${health.warnings.length}`);
    console.log(`- Lock status: ${health.lockStatus}`);

    if (health.errors.length > 0) {
      console.log('\nErrors:');
      health.errors.forEach(error => {
        console.log(`  - ${error.code}: ${error.message} (${error.severity})`);
      });
    }

    // Get service statistics
    const cacheStats = service.getCacheStats();
    console.log('\nService Cache Statistics:');
    console.log(`- Size: ${cacheStats.size}`);
    console.log(`- Max size: ${cacheStats.maxSize}`);
    console.log(`- Hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('Error in monitoring example:', error);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('TranslationStore Integration Examples\n');

  await basicUsageExample();
  await customConfigurationExample();
  await environmentSpecificExample();
  await errorHandlingExample();
  await batchTranslationExample();
  await dynamicStoreManagementExample();
  await monitoringExample();

  console.log('\nAll examples completed!');
}

// Export examples for individual testing
export {
  basicUsageExample,
  customConfigurationExample,
  environmentSpecificExample,
  errorHandlingExample,
  batchTranslationExample,
  dynamicStoreManagementExample,
  monitoringExample,
  runAllExamples,
};

// Run all examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}