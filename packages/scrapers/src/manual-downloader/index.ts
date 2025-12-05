/**
 * Bandai Manual Content Downloader
 *
 * CLI tool for discovering and downloading Bandai hobby manuals
 * from unknown ID ranges with intelligent algorithms and
 * respectful rate limiting.
 *
 * @version 1.0.0
 * @since 2025-12-05
 */

// Export main services and types
export { DownloaderService } from './services/downloader-service';
export { DiscoveryService } from './services/discovery-service';
export { RateLimiterService } from './services/rate-limiter-service';
export { HttpClient } from './services/http-client';
export { ConfigurationService } from './services/configuration';
export { LoggingService } from './services/logging';

// Export types and entities
export * from './types';
export * from './utils/crypto';

// CLI entry point
export * from './cli';

// Package version
export const VERSION = '1.0.0';