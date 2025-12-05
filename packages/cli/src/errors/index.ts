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