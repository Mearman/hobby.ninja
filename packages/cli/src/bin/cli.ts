#!/usr/bin/env node

import { Command } from 'commander';
import { scrapeCommand } from '../commands/scrape';
import { clearCacheCommand } from '../commands/clear-cache';
import { exportCommand } from '../commands/export';
import { version } from '../../package.json';

const program = new Command();

program
  .name('gunpla-scraper')
  .description('CLI tool for scraping Gundam/Gunpla data from various sources')
  .version(version);

// Main scrape command
program
  .command('scrape')
  .description('Scrape data from configured sources')
  .option('-s, --scrapers <scrapers>', 'Comma-separated list of scrapers to run (bandai, gundam-info, dalong)', 'bandai,gundam-info,dalong')
  .option('-o, --output <dir>', 'Output directory for scraped data', './apps/webapp/public/data')
  .option('--no-cache', 'Disable caching')
  .option('--force-refresh', 'Force refresh of cached data')
  .option('-i, --interactive', 'Run in interactive mode')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '30000')
  .option('--max-retries <count>', 'Maximum number of retries per request', '3')
  .option('--concurrency <count>', 'Number of concurrent requests', '2')
  .option('--per-sku', 'Create per-SKU JSON files')
  .option('--no-index', 'Skip generating index files')
  .option('--dry-run', 'Show what would be scraped without actually scraping')
  .action(async (options) => {
    try {
      await scrapeCommand(options);
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      if (options.verbose && error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Cache management commands
program
  .command('cache')
  .description('Manage cache')
  .command('clear')
  .description('Clear all cached data')
  .option('-s, --scraper <scraper>', 'Clear cache for specific scraper only')
  .option('-a, --all', 'Clear all cache including index files')
  .option('--older-than <days>', 'Clear cache older than specified days')
  .action(async (options) => {
    try {
      await clearCacheCommand(options);
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Export command
program
  .command('export')
  .description('Export cached data in various formats')
  .option('-f, --format <format>', 'Export format (json, csv, xlsx)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('-s, --scraper <scraper>', 'Export data from specific scraper')
  .option('--include-cache', 'Include cache metadata')
  .action(async (options) => {
    try {
      await exportCommand(options);
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Configuration command
program
  .command('config')
  .description('Manage configuration')
  .command('show')
  .description('Show current configuration')
  .action(async () => {
    try {
      const config = await import('../config');
      console.log('Current configuration:');
      console.log(JSON.stringify(config.default, null, 2));
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show scraping status and statistics')
  .option('-s, --scraper <scraper>', 'Show status for specific scraper')
  .option('--cache-stats', 'Show cache statistics')
  .action(async (options) => {
    try {
      const { getStatusCommand } = await import('../commands/status');
      await getStatusCommand(options);
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Help command
program
  .command('help')
  .description('Show help information')
  .action(() => {
    program.outputHelp();
  });

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Parse command line arguments
if (process.argv.length < 3) {
  program.outputHelp();
  process.exit(1);
}

program.parse();