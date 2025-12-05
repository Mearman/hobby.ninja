/**
 * Error handling system exports for the Gundam scraper CLI
 */

export {
  ErrorCode,
  ErrorCategory,
  ErrorInfo,
  ErrorRegistry
} from './error-codes.js';

export {
  ScraperError,
  ErrorContext,
  ErrorMetadata,
  createScraperError,
  withErrorHandling
} from './scraper-error.js';

export {
  ErrorHandler,
  ErrorReport,
  RetryConfig,
  ErrorMetrics
} from './error-handler.js';

// Re-export commonly used error creation functions
export const ErrorHelpers = {
  network: ScraperError.network,
  filesystem: ScraperError.filesystem,
  configuration: ScraperError.configuration,
  scraping: ScraperError.scraping,
  validation: ScraperError.validation,
  create: createScraperError,
  fromError: ScraperError.fromError
};