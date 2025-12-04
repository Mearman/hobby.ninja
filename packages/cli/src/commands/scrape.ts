import { BandaiScraper } from '../scrapers/bandai';
import { GundamInfoScraper } from '../scrapers/gundam-info';
import { DalongScraper } from '../scrapers/dalong';
import { PageCache } from '../cache';
import { JsonExporter } from '../export/json-export';
import { execFileNoThrow } from '@unnamed-gunpla-app/utils/execFileNoThrow';

export interface ScrapeCommandOptions {
  scrapers: string;
  output: string;
  cache: boolean;
  forceRefresh: boolean;
  interactive: boolean;
  verbose: boolean;
  timeout: string;
  maxRetries: string;
  concurrency: string;
  perSku: boolean;
  index: boolean;
  dryRun: boolean;
}

interface ScrapingResult {
  scraper: string;
  success: boolean;
  itemsCount: number;
  duration: number;
  errors?: string[];
}

export async function scrapeCommand(options: ScrapeCommandOptions): Promise<void> {
  const startTime = Date.now();
  const scrapers = options.scrapers.split(',').map(s => s.trim().toLowerCase());

  if (options.verbose) {
    console.log('🚀 Starting Gunpla data scraping...');
    console.log(`📂 Output directory: ${options.output}`);
    console.log(`🔄 Cache: ${options.cache ? 'Enabled' : 'Disabled'}`);
    console.log(`🎯 Scrapers: ${scrapers.join(', ')}`);
  }

  // Validate scrapers
  const validScrapers = ['bandai', 'gundam-info', 'dalong'];
  const invalidScrapers = scrapers.filter(s => !validScrapers.includes(s));

  if (invalidScrapers.length > 0) {
    throw new Error(`Invalid scrapers: ${invalidScrapers.join(', ')}. Valid options: ${validScrapers.join(', ')}`);
  }

  // Initialize cache
  let cache: PageCache | undefined;
  if (options.cache) {
    cache = new PageCache({
      cacheDir: './.cache',
      ttl: 3600000, // 1 hour
      maxSize: 100 * 1024 * 1024, // 100MB
    });

    if (options.forceRefresh) {
      if (options.verbose) console.log('🗑️  Clearing cache...');
      await cache.clear();
    }
  }

  // Initialize exporter
  const exporter = new JsonExporter({
    outputDir: options.output,
    perSku: options.perSku,
    generateIndex: options.index,
  });

  const results: ScrapingResult[] = [];
  const allData: any[] = [];

  // Run scrapers
  for (const scraperName of scrapers) {
    const scraperStartTime = Date.now();

    try {
      if (options.verbose) {
        console.log(`\n📡 Starting ${scraperName} scraper...`);
      }

      let scraperData: any[];

      switch (scraperName) {
        case 'bandai':
          const bandaiScraper = new BandaiScraper({
            useCache: !!cache,
            timeout: parseInt(options.timeout),
            maxRetries: parseInt(options.maxRetries),
            concurrency: parseInt(options.concurrency),
            cache,
          });

          if (options.dryRun) {
            if (options.verbose) console.log(`🔍 ${scraperName}: Would scrape Bandai official store`);
            scraperData = [];
          } else {
            scraperData = await bandaiScraper.scrapeAllProducts();
          }
          break;

        case 'gundam-info':
          const gundamInfoScraper = new GundamInfoScraper({
            useCache: !!cache,
            timeout: parseInt(options.timeout),
            maxRetries: parseInt(options.maxRetries),
            concurrency: parseInt(options.concurrency),
            cache,
          });

          if (options.dryRun) {
            if (options.verbose) console.log(`🔍 ${scraperName}: Would scrape Gundam.info`);
            scraperData = [];
          } else {
            scraperData = await gundamInfoScraper.scrapeAllPages();
          }
          break;

        case 'dalong':
          const dalongScraper = new DalongScraper({
            useCache: !!cache,
            timeout: parseInt(options.timeout),
            maxRetries: parseInt(options.maxRetries),
            concurrency: parseInt(options.concurrency),
            cache,
          });

          if (options.dryRun) {
            if (options.verbose) console.log(`🔍 ${scraperName}: Would scrape Dalong.net`);
            scraperData = [];
          } else {
            scraperData = await dalongScraper.scrapeAllPages();
          }
          break;

        default:
          throw new Error(`Unknown scraper: ${scraperName}`);
      }

      const duration = Date.now() - scraperStartTime;

      results.push({
        scraper: scraperName,
        success: true,
        itemsCount: scraperData.length,
        duration,
      });

      allData.push(...scraperData);

      if (options.verbose) {
        console.log(`✅ ${scraperName}: ${scraperData.length} items scraped in ${duration}ms`);
      }

    } catch (error) {
      const duration = Date.now() - scraperStartTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      results.push({
        scraper: scraperName,
        success: false,
        itemsCount: 0,
        duration,
        errors: [errorMessage],
      });

      if (options.verbose) {
        console.error(`❌ ${scraperName}: ${errorMessage}`);
      }

      // Continue with other scrapers unless this is a critical error
      if (error instanceof Error && error.message.includes('CRITICAL')) {
        throw error;
      }
    }
  }

  // Export data
  if (!options.dryRun && allData.length > 0) {
    if (options.verbose) {
      console.log(`\n💾 Exporting ${allData.length} items to ${options.output}...`);
    }

    try {
      await exporter.exportData(allData, options.output);

      if (options.verbose) {
        console.log('✅ Data exported successfully');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown export error';
      console.error(`❌ Export failed: ${errorMessage}`);
      throw error;
    }
  }

  // Show summary
  const totalDuration = Date.now() - startTime;
  const totalItems = results.reduce((sum, r) => sum + r.itemsCount, 0);
  const successfulScrapers = results.filter(r => r.success).length;
  const failedScrapers = results.filter(r => !r.success).length;

  console.log('\n' + '='.repeat(50));
  console.log('📊 SCRAPING SUMMARY');
  console.log('='.repeat(50));
  console.log(`⏱️  Total duration: ${totalDuration}ms`);
  console.log(`📦 Total items scraped: ${totalItems}`);
  console.log(`✅ Successful scrapers: ${successfulScrapers}/${scrapers.length}`);

  if (failedScrapers > 0) {
    console.log(`❌ Failed scrapers: ${failedScrapers}`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.scraper}: ${r.errors?.join(', ')}`);
    });
  }

  // Show per-scraper details
  if (options.verbose) {
    console.log('\n📋 PER-SCRAPER DETAILS:');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${result.scraper}: ${result.itemsCount} items (${result.duration}ms)`);
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`      ⚠️  ${error}`);
        });
      }
    });
  }

  if (!options.dryRun && totalItems > 0) {
    console.log(`\n📁 Data exported to: ${options.output}`);
  }

  if (cache && options.verbose) {
    const cacheStats = await cache.getStats();
    console.log(`\n💾 Cache statistics: ${cacheStats.totalFiles} files, ${(cacheStats.totalSize / 1024 / 1024).toFixed(2)}MB`);
  }

  console.log('\n🎉 Scraping completed!');
}

// Interactive mode helper
export async function promptScraperSelection(): Promise<string[]> {
  const inquirer = await import('inquirer');

  const { scrapers } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'scrapers',
      message: 'Select scrapers to run:',
      choices: [
        { name: 'Bandai Official Store', value: 'bandai' },
        { name: 'Gundam.info', value: 'gundam-info' },
        { name: 'Dalong.net', value: 'dalong' },
      ],
      default: ['bandai', 'gundam-info'],
    },
  ]);

  return scrapers;
}

export async function promptConfiguration(): Promise<Partial<ScrapeCommandOptions>> {
  const inquirer = await import('inquirer');

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'cache',
      message: 'Enable caching?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'perSku',
      message: 'Create per-SKU files?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'index',
      message: 'Generate index files?',
      default: true,
    },
    {
      type: 'list',
      name: 'concurrency',
      message: 'Number of concurrent requests:',
      choices: [
        { name: '1 (Sequential)', value: '1' },
        { name: '2 (Low)', value: '2' },
        { name: '4 (Medium)', value: '4' },
        { name: '8 (High)', value: '8' },
      ],
      default: '2',
    },
    {
      type: 'list',
      name: 'timeout',
      message: 'Request timeout:',
      choices: [
        { name: '15 seconds', value: '15000' },
        { name: '30 seconds', value: '30000' },
        { name: '60 seconds', value: '60000' },
        { name: '120 seconds', value: '120000' },
      ],
      default: '30000',
    },
  ]);

  return answers;
}