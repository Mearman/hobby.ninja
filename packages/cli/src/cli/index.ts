#!/usr/bin/env node

import { Command } from 'commander';
import { ScrapeCommand, ScrapeOptions } from './scrape.js';
import { CacheCommand } from './cache.js';
import { ValidateCommand } from './validate.js';
import { SingleUrlCommand } from './single-url.js';

const program = new Command();

program
  .name('gundam-scraper')
  .description('CLI tool for scraping Gundam data from Bandai sources')
  .version('0.0.1');

program
  .command('scrape')
  .description('Scrape data from configured sources')
  .option('--source <source>', 'Source to scrape (bandai-hobby, bandai-manual, gundam-info)', 'bandai-hobby')
  .option('--language <lang>', 'Language filter (en, ja, all)', 'all')
  .option('--output <dir>', 'Output directory', './output')
  .option('--cache', 'Enable caching', true)
  .option('--resume', 'Resume from last checkpoint', false)
  .option('--verbose', 'Enable verbose logging', false)
  .option('--dry-run', 'Perform dry run without actual scraping', false)
  .action(async (options) => {
    const scrapeCommand = new ScrapeCommand();
    const scrapeOptions: ScrapeOptions = {
      source: options.source,
      language: options.language,
      output: options.output,
      cache: options.cache,
      resume: options.resume,
      verbose: options.verbose,
      dryRun: options.dryRun
    };

    try {
      console.log('🚀 Starting Gundam Data Scraper...');
      console.log(`Source: ${scrapeOptions.source}`);
      console.log(`Language: ${scrapeOptions.language}`);
      console.log(`Output: ${scrapeOptions.output}`);
      console.log(`Cache: ${scrapeOptions.cache ? 'enabled' : 'disabled'}`);
      console.log('');

      const result = await scrapeCommand.execute(scrapeOptions);

      console.log('\n📊 Scrape Results:');
      console.log(`Total processed: ${result.totalProcessed}`);
      console.log(`Successful: ${result.successful}`);
      console.log(`Failed: ${result.failed}`);
      console.log(`Cached: ${result.cached}`);
      console.log(`New: ${result.new}`);
      console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);

      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }

      if (result.failed === 0) {
        console.log('\n✅ Scrape completed successfully!');
        process.exit(0);
      } else {
        console.log('\n⚠️ Scrape completed with errors');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Scrape failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('cache')
  .description('Manage cache')
  .option('--clear', 'Clear all cached data')
  .option('--stats', 'Show cache statistics')
  .option('--cleanup', 'Remove expired entries')
  .action(async (options) => {
    const cacheCommand = new CacheCommand();
    await cacheCommand.execute(options);
  });

program
  .command('validate')
  .description('Validate scraped data')
  .option('--source <source>', 'Source to validate (bandai-hobby, bandai-manual, gundam-info, all)')
  .option('--fix', 'Attempt to fix validation errors')
  .option('--file <file>', 'Specific file to validate')
  .option('--output <dir>', 'Output directory for fixed files', './output')
  .action(async (options) => {
    const validateCommand = new ValidateCommand();
    await validateCommand.execute(options);
  });

program
  .command('single-url')
  .description('Scrape data from a single URL')
  .argument('<url>', 'URL to scrape (must be from bandai-hobby.net, manual.bandai-hobby.net, or gundam.info)')
  .option('--output <dir>', 'Output directory', './gundam-single-scrape')
  .option('--verbose', 'Enable verbose logging', false)
  .action(async (url, options) => {
    const singleUrlCommand = new SingleUrlCommand();

    try {
      const result = await singleUrlCommand.execute({
        url,
        output: options.output,
        verbose: options.verbose
      });

      if (result.success) {
        console.log('\n🎉 Single URL scraping completed!');
        console.log(`URL: ${result.url}`);

        if (result.skus && result.skus.length > 0) {
          console.log(`SKUs found: ${result.skus.join(', ')}`);
        }

        if (result.outputFile) {
          console.log(`Output: ${result.outputFile}`);
        }

        process.exit(0);
      } else {
        console.error('❌ Single URL scraping failed:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Single URL scraping failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

if (require.main === module) {
  program.parse();
}