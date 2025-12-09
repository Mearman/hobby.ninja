import { CacheManager } from '../utils/cache-manager.js';
import { EXIT_CODES, FILE_SIZE_LIMITS } from '../constants/cli-constants.js';

export interface CacheCommandOptions {
  clear?: boolean;
  stats?: boolean;
  cleanup?: boolean;
}

export class CacheCommand {
  private cacheManager: CacheManager;

  constructor() {
    this.cacheManager = new CacheManager();
  }

  async execute(options: CacheCommandOptions): Promise<void> {
    try {
      await this.cacheManager.initialize();

      if (options.clear) {
        await this.clearCache();
      } else if (options.stats) {
        await this.showStats();
      } else if (options.cleanup) {
        await this.cleanupCache();
      } else {
        await this.showDefaultInfo();
      }
    } catch (error) {
      console.error('❌ Cache command failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(EXIT_CODES.GENERAL_ERROR);
    }
  }

  private async clearCache(): Promise<void> {
    console.log('🗑️ Clearing cache...');
    await this.cacheManager.clear();
    console.log('✅ Cache cleared successfully');
  }

  private async showStats(): Promise<void> {
    console.log('📊 Cache Statistics:');
    const stats = await this.cacheManager.getStats();

    console.log(`Total files: ${stats.totalFiles}`);
    console.log(`Total size: ${(stats.totalSize / FILE_SIZE_LIMITS.MEGABYTE).toFixed(2)} MB`);
    console.log(`Compression ratio: ${(stats.compressionRatio * 100).toFixed(1)}%`);
    console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    console.log(`Oldest entry: ${new Date(stats.oldestEntry).toLocaleString()}`);
    console.log(`Newest entry: ${new Date(stats.newestEntry).toLocaleString()}`);
  }

  private async cleanupCache(): Promise<void> {
    console.log('🧹 Cleaning up expired cache entries...');
    await this.cacheManager.cleanup();
    console.log('✅ Cache cleanup completed');
  }

  private async showDefaultInfo(): Promise<void> {
    console.log('💾 Cache Information:');
    console.log('Use --stats to view cache statistics');
    console.log('Use --clear to clear all cached data');
    console.log('Use --cleanup to remove expired entries');
  }
}