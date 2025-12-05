/**
 * Default configuration for the Gundam data scraper CLI
 * Provides sensible defaults that can be overridden by users
 */

import { LanguageCode } from '../types/language-detection.js';

export interface ScrapingConfig {
  // Source configuration
  source: string;
  language: LanguageCode | 'all';

  // Output configuration
  output: string;
  format: 'json' | 'csv' | 'excel' | 'ndjson';

  // Performance settings
  concurrency: number;
  delayMs: number;
  timeout: number;
  retries: number;

  // Cache settings
  cache: boolean;
  cacheExpiry: number; // hours

  // Resume/checkpoint settings
  resume: boolean;
  checkpointsEnabled: boolean;

  // Quality and validation
  validate: boolean;
  fixIssues: boolean;

  // Logging and reporting
  verbose: boolean;
  dryRun: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  logToFile: boolean;

  // Rate limiting
  rateLimiting: {
    enabled: boolean;
    requestsPerSecond: number;
    burstSize: number;
  };

  // Data filtering
  filters: {
    minPrice?: number;
    maxPrice?: number;
    categories?: string[];
    excludeKeywords?: string[];
    includeKeywords?: string[];
  };

  // Export options
  export: {
    includeImages: boolean;
    includeSpecifications: boolean;
    includeCategories: boolean;
    prettyPrint: boolean;
    compression: boolean;
  };
}

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