import { promises as fs } from 'fs';
import * as path from 'path';
import { getScraper } from '@unnamed-gunpla-app/scrapers';
import { CacheManager } from '../utils/cache-manager.js';
import { BandaiRateLimiter } from '../utils/rate-limiter.js';
import { validateProductData } from '../schemas/validation.js';

export interface ScrapeOptions {
  source: string;
  language: string;
  output: string;
  cache: boolean;
  resume: boolean;
  verbose: boolean;
  dryRun: boolean;
}

export interface ScrapeResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  cached: number;
  new: number;
  errors: string[];
  duration: number;
}

export class ScrapeCommand {
  private cacheManager: CacheManager;
  private rateLimiter: BandaiRateLimiter;
  private scraper: any;
  private checkpointFile: string;

  constructor() {
    this.cacheManager = new CacheManager();
    this.rateLimiter = new BandaiRateLimiter();
    this.scraper = getScraper('bandai-hobby');
    this.checkpointFile = path.join(process.cwd(), '.gundam-scraper-checkpoint.json');
  }

  async execute(options: ScrapeOptions): Promise<ScrapeResult> {
    const startTime = Date.now();

    try {
      // Initialize cache
      if (options.cache) {
        await this.cacheManager.initialize();
      }

      // Load checkpoint if resuming
      let urls: string[] = [];
      if (options.resume) {
        urls = await this.loadCheckpoint();
        if (urls.length === 0) {
          console.log('No checkpoint found. Starting fresh.');
          urls = await this.getUrlsToScrape(options.source);
        }
      } else {
        urls = await this.getUrlsToScrape(options.source);
      }

      console.log(`Starting scrape: ${urls.length} URLs to process`);

      if (options.dryRun) {
        console.log('DRY RUN MODE - No actual scraping will be performed');
        return {
          totalProcessed: urls.length,
          successful: 0,
          failed: 0,
          cached: 0,
          new: 0,
          errors: [],
          duration: Date.now() - startTime
        };
      }

      // Process URLs
      const result = await this.processUrls(urls, options);
      result.duration = Date.now() - startTime;

      // Save checkpoint
      if (options.cache) {
        await this.saveCheckpoint(urls.filter(url => !result.errors.some(error => error.includes(url))));
      }

      return result;
    } catch (error) {
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 1,
        cached: 0,
        new: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration: Date.now() - startTime
      };
    }
  }

  private async getUrlsToScrape(source: string): Promise<string[]> {
    // This would normally fetch URLs from the source
    // For now, return example URLs
    const urls: string[] = [];

    if (source === 'bandai-hobby') {
      // Example Bandai Hobby URLs
      urls.push(
        'https://bandai-hobby.net/site/hg-1-144-gundam-aerial/',
        'https://bandai-hobby.net/site/hg-1-144-gundam-requiem/',
        'https://bandai-hobby.net/site/rg-1-144-gundam-exia/'
      );
    }

    return urls;
  }

  private async processUrls(urls: string[], options: ScrapeOptions): Promise<ScrapeResult> {
    const results: any[] = [];
    const errors: string[] = [];
    let cached = 0;
    let newItems = 0;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      if (!url) {
        continue; // Skip undefined URLs
      }

      try {
        console.log(`Processing ${i + 1}/${urls.length}: ${url}`);

        // Check cache first
        let productData = null;
        if (options.cache) {
          const cachedData = await this.cacheManager.getByUrl(url);
          if (cachedData?.rawHtml) {
            productData = JSON.parse(cachedData.rawHtml);
            cached++;
            if (options.verbose) {
              console.log(`  ✓ Cached data found`);
            }
          }
        }

        // Scrape if not in cache
        if (!productData) {
          productData = await this.rateLimiter.executeWithLimit(async () => {
            const html = await this.fetchPage(url);
            return this.scraper.extractFromPage(html, url);
          });

          // Cache the result
          if (options.cache && productData) {
            await this.cacheManager.setByUrl(url, JSON.stringify(productData), 'bandai-hobby');
          }
          newItems++;

          if (options.verbose) {
            console.log(`  ✓ Fresh data scraped`);
          }
        }

        // Validate the data
        if (productData) {
          const validation = validateProductData(productData);
          if (!validation.isValid) {
            errors.push(`${url}: ${validation.errors.join(', ')}`);
            if (options.verbose) {
              console.log(`  ⚠ Validation failed: ${validation.errors.join(', ')}`);
            }
          } else {
            results.push(productData);
            if (options.verbose) {
              console.log(`  ✓ Data validated successfully`);
            }
          }
        }

        // Save progress
        await this.saveCheckpoint(urls.slice(i + 1));

      } catch (error) {
        const errorMsg = `${url}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`  ✗ Error: ${errorMsg}`);
      }

      // Add delay between requests
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Save results to output directory
    if (results.length > 0) {
      await this.saveResults(results, options.output);
    }

    return {
      totalProcessed: urls.length,
      successful: results.length,
      failed: errors.length,
      cached,
      new: newItems,
      errors,
      duration: 0 // Will be set by caller
    };
  }

  private async fetchPage(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GundamDataScraper/1.0 (+https://github.com/user/repo)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  }

  private async saveResults(results: any[], outputDir: string): Promise<void> {
    try {
      await fs.mkdir(outputDir, { recursive: true });

      // Save as JSON
      const jsonFile = path.join(outputDir, `products-${Date.now()}.json`);
      await fs.writeFile(jsonFile, JSON.stringify(results, null, 2));

      // Save as NDJSON for streaming
      const ndjsonFile = path.join(outputDir, `products-${Date.now()}.ndjson`);
      const ndjsonContent = results.map(item => JSON.stringify(item)).join('\n');
      await fs.writeFile(ndjsonFile, ndjsonContent);

      console.log(`Results saved to: ${jsonFile} and ${ndjsonFile}`);
      console.log(`Total products: ${results.length}`);
    } catch (error) {
      throw new Error(`Failed to save results: ${error}`);
    }
  }

  private async loadCheckpoint(): Promise<string[]> {
    try {
      const data = await fs.readFile(this.checkpointFile, 'utf-8');
      const checkpoint = JSON.parse(data);
      return checkpoint.remainingUrls || [];
    } catch (error) {
      return [];
    }
  }

  private async saveCheckpoint(remainingUrls: string[]): Promise<void> {
    try {
      const checkpoint = {
        timestamp: Date.now(),
        remainingUrls
      };
      await fs.writeFile(this.checkpointFile, JSON.stringify(checkpoint, null, 2));
    } catch (error) {
      console.error(`Failed to save checkpoint: ${error}`);
    }
  }
}