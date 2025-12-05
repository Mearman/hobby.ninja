/**
 * Default configuration for the Gundam data scraper CLI
 * Provides sensible defaults that can be overridden by users
 */

import type { ValidatedConfig } from './validators.js';

export type ScrapingConfig = ValidatedConfig;

export const DEFAULT_CONFIG: ScrapingConfig = {
  source: 'bandai-hobby',
  language: 'all',

  output: './output',
  format: 'json',

  concurrency: 3,
  delayMs: 2000,
  timeout: 30000,
  retries: 3,

  cache: true,
  cacheExpiry: 24,

  resume: false,
  checkpointsEnabled: true,

  validate: true,
  fixIssues: false,

  verbose: false,
  dryRun: false,
  logLevel: 'info',
  logToFile: false,

  rateLimiting: {
    enabled: true,
    requestsPerSecond: 2,
    burstSize: 5
  },

  filters: {},

  export: {
    includeImages: true,
    includeSpecifications: true,
    includeCategories: true,
    prettyPrint: true,
    compression: false
  }
};

export const CONFIG_FILE_NAMES = [
  '.gundam-scraper.config.json',
  'gundam-scraper.config.json',
  '.gundam-scraper.json',
  'gundam-scraper.json'
];

export const ENV_PREFIX = 'GUNDAM_SCRAPER_';