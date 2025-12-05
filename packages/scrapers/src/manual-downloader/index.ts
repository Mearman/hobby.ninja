/**
 * Bandai Manual Content Downloader
 *
 * Most reliable basic implementation with zero-padding.
 */

// Export both versions
export { SimpleDownloader } from './simple-downloader';
export { BasicDownloader } from './basic-downloader';
export { HttpClient } from './services/http-client';
export { RateLimiterService } from './services/rate-limiter-service';

// Export CLI
export { ManualDownloaderCLI, main } from './cli/main';

// Export types
export interface SimpleOptions {
  startId?: number;
  endId?: number;
  url?: string;
  output?: string;
}

// Package version
export const VERSION = '2.1.0'; // Added BasicDownloader