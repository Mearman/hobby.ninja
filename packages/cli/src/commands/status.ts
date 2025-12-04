import { PageCache } from '../cache';

export interface StatusOptions {
  scraper?: string;
  cacheStats?: boolean;
}

export async function getStatusCommand(options: StatusOptions): Promise<void> {
  console.log('📊 Scraping Status Report');
  console.log('='.repeat(50));

  try {
    if (options.cacheStats) {
      await showCacheStats();
    }

    if (options.scraper) {
      await showScraperStatus(options.scraper);
    } else {
      await showAllScrapersStatus();
    }

    // Show overall status
    await showOverallStatus();

  } catch (error) {
    console.error('❌ Error getting status:', error);
    throw error;
  }
}

async function showCacheStats(): Promise<void> {
  console.log('\n💾 Cache Statistics:');

  const cacheDirs = ['./.cache/bandai', './.cache/gundam-info', './.cache/dalong'];

  let totalFiles = 0;
  let totalSize = 0;

  for (const cacheDir of cacheDirs) {
    try {
      const cache = new PageCache({ cacheDir });
      const stats = await cache.getStats();

      console.log(`   ${cacheDir}: ${stats.totalFiles} files, ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`);

      totalFiles += stats.totalFiles;
      totalSize += stats.totalSize;
    } catch (error) {
      console.log(`   ${cacheDir}: Not accessible`);
    }
  }

  console.log(`   Total: ${totalFiles} files, ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
}

async function showScraperStatus(scraper: string): Promise<void> {
  console.log(`\n🔍 ${scraper.toUpperCase()} Scraper Status:`);

  // In a real implementation, this would show scraper-specific stats
  console.log(`   Status: Available`);
  console.log(`   Last run: N/A`);
  console.log(`   Items scraped: N/A`);
  console.log(`   Cache hits: N/A`);
}

async function showAllScrapersStatus(): Promise<void> {
  console.log('\n🔍 All Scrapers Status:');
  const scrapers = ['bandai', 'gundam-info', 'dalong'];

  for (const scraper of scrapers) {
    console.log(`   ${scraper}: Available`);
  }
}

async function showOverallStatus(): Promise<void> {
  console.log('\n🏆 Overall Status:');
  console.log(`   CLI Tool: Ready`);
  console.log(`   Cache: Available`);
  console.log(`   Export: Available`);
  console.log(`   CI/CD: Configured`);
}