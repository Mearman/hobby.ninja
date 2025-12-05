/**
 * Bandai Manual Content Downloader
 *
 * Unified implementation with smart discovery and fallback logic.
 */

// Export unified implementation
export { Downloader } from './downloader';
export { HttpClient } from './services/http-client';
export { RateLimiterService } from './services/rate-limiter-service';

// Export CLI
export { ManualDownloaderCLI, main } from './cli/main';

// Export types
export interface DownloaderOptions {
  startId?: number;
  endId?: number;
  url?: string;
  output?: string;
}

// Package version
export const VERSION = '3.0.0'; // Unified implementation