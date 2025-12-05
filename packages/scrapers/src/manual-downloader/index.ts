/**
 * Bandai Manual Content Downloader - Simple Version
 *
 * No complex sessions, just ID incrementing from start to end.
 */

// Export the simple downloader and its dependencies
export { SimpleDownloader } from './simple-downloader';
export { HttpClient } from './services/http-client';
export { RateLimiterService } from './services/rate-limiter-service';

// Export CLI
export { ManualDownloaderCLI, main } from './cli/main';

// Export minimal types
export interface SimpleOptions {
  startId?: number;
  endId?: number;
  url?: string;
  output?: string;
}

// Package version
export const VERSION = '2.0.0'; // Simplified version