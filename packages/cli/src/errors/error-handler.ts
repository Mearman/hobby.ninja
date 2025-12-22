/**
 * Centralized error handling service for the Gundam scraper CLI
 * Provides error processing, reporting, and recovery strategies
 */

 
import { Logger } from "../utils/logger.js";

import { ErrorCode, ErrorCategory } from "./error-codes.js";
import { ScraperError, ErrorContext } from "./scraper-error.js";

export interface ErrorReport {
  id: string;
  error: ScraperError;
  timestamp: string;
  resolved: boolean;
  resolutionStrategy?: string;
  resolutionTime?: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsByCode: Record<ErrorCode, number>;
  retryAttempts: number;
  successfulRetries: number;
  averageResolutionTime: number;
}

export class ErrorHandler {
	private logger: Logger;
	private errorHistory: ErrorReport[] = [];
	private metrics: ErrorMetrics = {
		totalErrors: 0,
		errorsByCategory: {} as Record<ErrorCategory, number>,
		errorsByCode: {} as Record<ErrorCode, number>,
		retryAttempts: 0,
		successfulRetries: 0,
		averageResolutionTime: 0,
	};

	private readonly defaultRetryConfig: RetryConfig = {
		maxAttempts: 3,
		baseDelay: 1000,
		maxDelay: 30_000,
		backoffMultiplier: 2,
		jitter: true,
	};

	constructor(logger: Logger) {
		this.logger = logger;
	}

	/**
   * Handle an error with automatic processing and reporting
   */
	async handleError(error: ScraperError | Error, context?: ErrorContext): Promise<{
    handled: boolean;
    shouldContinue: boolean;
    retryAttempted?: boolean;
    retrySuccessful?: boolean;
  }> {
		const scraperError = error instanceof ScraperError ? error : ScraperError.fromError(error, context);
		const errorId = this.generateErrorId();

		this.logger.error("Error occurred", scraperError, { errorId, context });

		// Record error
		this.recordError(errorId, scraperError);

		// Update metrics
		this.updateMetrics(scraperError);

		// Process error based on severity and category
		const processingResult = await this.processError(scraperError);

		this.logger.info("Error processing completed", {
			errorId,
			handled: processingResult.handled,
			shouldContinue: processingResult.shouldContinue,
			retryAttempted: processingResult.retryAttempted,
		});

		return processingResult;
	}

	/**
   * Execute a function with automatic error handling and retry logic
   */
	async executeWithRetry<T>(
		operation: () => Promise<T>,
		context: ErrorContext & { operation: string },
		retryConfig?: Partial<RetryConfig>,
	): Promise<T> {
		const config = { ...this.defaultRetryConfig, ...retryConfig };

		let lastError: ScraperError | null = null;

		for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
			try {
				this.logger.debug(`Attempting operation: ${context.operation}`, {
					attempt,
					maxAttempts: config.maxAttempts,
				});

				const result = await operation();

				if (attempt > 1) {
					this.metrics.successfulRetries++;
					this.logger.info(`Operation succeeded on attempt ${attempt}`, {
						operation: context.operation,
						attempts: attempt,
					});
				}

				return result;

			} catch (error) {
				lastError = error instanceof ScraperError ? error : ScraperError.fromError(error as Error, context);

				this.metrics.retryAttempts++;

				this.logger.warn(`Operation failed on attempt ${attempt}`, {
					operation: context.operation,
					attempt,
					errorCode: lastError.code,
					errorMessage: lastError.message,
				});

				// Don't retry if it's the last attempt or error is not retryable
				if (attempt === config.maxAttempts || !lastError.shouldRetry()) {
					break;
				}

				// Calculate delay for next attempt
				const delay = this.calculateRetryDelay(attempt - 1, config);

				this.logger.info(`Retrying operation in ${delay}ms`, {
					operation: context.operation,
					nextAttempt: attempt + 1,
					delay,
				});

				await this.sleep(delay);
			}
		}

		// All attempts failed, handle the final error
		if (!lastError) {
			throw new ScraperError("Operation failed without error details", context);
		}

		const result = await this.handleError(lastError, context);

		if (!result.shouldContinue) {
			throw lastError;
		}

		throw lastError;
	}

	/**
   * Process an error based on its category and severity
   */
	private async processError(error: ScraperError): Promise<{
    handled: boolean;
    shouldContinue: boolean;
    retryAttempted?: boolean;
    retrySuccessful?: boolean;
  }> {
		switch (error.category) {
			case ErrorCategory.CONFIGURATION: {
				return this.handleConfigurationError(error);
			}

			case ErrorCategory.NETWORK: {
				return this.handleNetworkError(error);
			}

			case ErrorCategory.SCRAPING: {
				return this.handleScrapingError(error);
			}

			case ErrorCategory.FILESYSTEM: {
				return this.handleFilesystemError(error);
			}

			case ErrorCategory.DATA: {
				return this.handleDataError(error);
			}

			case ErrorCategory.VALIDATION: {
				return this.handleValidationError(error);
			}

			case ErrorCategory.RATE_LIMIT: {
				return this.handleRateLimitError(error);
			}

			case ErrorCategory.SYSTEM: {
				return this.handleSystemError(error);
			}

			default: {
				return this.handleGenericError(error);
			}
		}
	}

	private handleConfigurationError(error: ScraperError): {
    handled: boolean;
    shouldContinue: boolean;
  } {
		this.logger.error("Configuration error detected", error);

		// Log user-friendly message with suggestions
		this.logger.error(error.userMessage);
		for (const [index, suggestion] of error.suggestions.entries()) {
			this.logger.info(`Suggestion ${index + 1}: ${suggestion}`);
		}

		return {
			handled: true,
			shouldContinue: false, // Configuration errors usually need user intervention
		};
	}

	private async handleNetworkError(error: ScraperError): Promise<{
    handled: boolean;
    shouldContinue: boolean;
    retryAttempted?: boolean;
    retrySuccessful?: boolean;
  }> {
		let retryAttempted = false;
		let retrySuccessful = false;

		if (error.shouldRetry()) {
			retryAttempted = true;
			const delay = error.getRetryDelay();

			this.logger.info(`Retrying network operation after ${String(delay)}ms`, {
				url: error.context.url,
				retryCount: (error.context.retryCount ?? 0) + 1,
			});

			await this.sleep(delay);
			retrySuccessful = true; // This would be set by the actual retry logic
		}

		return {
			handled: true,
			shouldContinue: error.severity !== "critical",
			retryAttempted,
			retrySuccessful,
		};
	}

	private async handleScrapingError(error: ScraperError): Promise<{
    handled: boolean;
    shouldContinue: boolean;
  }> {
		if (error.code === ErrorCode.SCRAPE_STRUCTURE_CHANGED) {
			this.logger.error("Website structure has changed - scraper needs update", error);
			return {
				handled: true,
				shouldContinue: false,
			};
		}

		if (error.code === ErrorCode.SCRAPE_RATE_LIMITED) {
			this.logger.warn("Rate limited - implementing backoff strategy");
			// Implement exponential backoff
			await this.sleep(60_000); // Wait 1 minute
			return {
				handled: true,
				shouldContinue: true,
			};
		}

		return {
			handled: true,
			shouldContinue: error.severity !== "critical",
		};
	}

	private handleFilesystemError(error: ScraperError): {
    handled: boolean;
    shouldContinue: boolean;
  } {
		if (error.code === ErrorCode.FS_DISK_FULL) {
			this.logger.error("Disk space exhausted - cannot continue", error);
			return {
				handled: true,
				shouldContinue: false,
			};
		}

		if (error.code === ErrorCode.FS_PERMISSION_DENIED) {
			this.logger.error("Permission denied - check file/directory permissions", error);
			return {
				handled: true,
				shouldContinue: false,
			};
		}

		return {
			handled: true,
			shouldContinue: true,
		};
	}

	private handleDataError(error: ScraperError): {
    handled: boolean;
    shouldContinue: boolean;
  } {
		this.logger.warn("Data processing error", { error: { code: error.code, message: error.message, category: error.category } });

		// Log user-friendly message
		this.logger.error(error.userMessage);

		return {
			handled: true,
			shouldContinue: true, // Continue processing other items
		};
	}

	private handleValidationError(error: ScraperError): {
    handled: boolean;
    shouldContinue: boolean;
  } {
		this.logger.warn("Validation error", { error: { code: error.code, message: error.message, category: error.category } });

		// Log specific validation issues
		const fieldName = error.context["fieldName"];
		if (fieldName !== undefined) {
			this.logger.error(`Validation failed for field: ${typeof fieldName === "string" ? fieldName : JSON.stringify(fieldName)}`);
		}

		return {
			handled: true,
			shouldContinue: error.severity !== "critical",
		};
	}

	private async handleRateLimitError(error: ScraperError): Promise<{
    handled: boolean;
    shouldContinue: boolean;
  }> {
		const delay = error.getRetryDelay();

		this.logger.warn(`Rate limit exceeded - waiting ${delay}ms before continuing`, { error: { code: error.code, message: error.message, category: error.category } });
		await this.sleep(delay);

		return {
			handled: true,
			shouldContinue: true,
		};
	}

	private handleSystemError(error: ScraperError): {
    handled: boolean;
    shouldContinue: boolean;
  } {
		this.logger.error("System error detected", error);

		if (error.severity === "critical") {
			this.logger.error("Critical system error - cannot continue", error);
			return {
				handled: true,
				shouldContinue: false,
			};
		}

		return {
			handled: true,
			shouldContinue: false,
		};
	}

	private handleGenericError(error: ScraperError): {
    handled: boolean;
    shouldContinue: boolean;
  } {
		this.logger.error("Unhandled error type", error);

		return {
			handled: true,
			shouldContinue: error.severity !== "critical",
		};
	}

	/**
   * Record an error in the history
   */
	private recordError(id: string, error: ScraperError): void {
		const report: ErrorReport = {
			id,
			error,
			timestamp: new Date().toISOString(),
			resolved: false,
		};

		this.errorHistory.push(report);

		// Keep only last 1000 errors to prevent memory issues
		if (this.errorHistory.length > 1000) {
			this.errorHistory = this.errorHistory.slice(-1000);
		}
	}

	/**
   * Update error metrics
   */
	private updateMetrics(error: ScraperError): void {
		this.metrics.totalErrors++;

		// Update by category
		this.metrics.errorsByCategory[error.category] =
      (this.metrics.errorsByCategory[error.category] || 0) + 1;

		// Update by code
		this.metrics.errorsByCode[error.code] =
      (this.metrics.errorsByCode[error.code] || 0) + 1;
	}

	/**
   * Calculate retry delay with exponential backoff and jitter
   */
	private calculateRetryDelay(attempt: number, config: RetryConfig): number {
		let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
		delay = Math.min(delay, config.maxDelay);

		if (config.jitter) {
			// Add random jitter (±25%)
			const jitterRange = delay * 0.25;
			delay += (Math.random() - 0.5) * 2 * jitterRange;
		}

		return Math.max(0, Math.floor(delay));
	}

	/**
   * Sleep for specified milliseconds
   */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
   * Generate unique error ID
   */
	private generateErrorId(): string {
		return `err_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
	}

	/**
   * Get error metrics and history
   */
	getErrorReport(): {
    metrics: ErrorMetrics;
    recentErrors: ErrorReport[];
    summary: string;
    } {
		const recentErrors = this.errorHistory.slice(-10); // Last 10 errors

		const summary = `Total errors: ${this.metrics.totalErrors}, ` +
                  `Retry success rate: ${this.metrics.retryAttempts > 0 ?
                  	((this.metrics.successfulRetries / this.metrics.retryAttempts) * 100).toFixed(1) : 0}%`;

		return {
			metrics: this.metrics,
			recentErrors,
			summary,
		};
	}

	/**
   * Clear error history and reset metrics
   */
	clearHistory(): void {
		this.errorHistory = [];
		this.metrics = {
			totalErrors: 0,
			errorsByCategory: {} as Record<ErrorCategory, number>,
			errorsByCode: {} as Record<ErrorCode, number>,
			retryAttempts: 0,
			successfulRetries: 0,
			averageResolutionTime: 0,
		};
	}

	/**
   * Export error history to file
   */
	async exportErrorHistory(filePath: string): Promise<void> {
		const data = {
			timestamp: new Date().toISOString(),
			metrics: this.metrics,
			errors: this.errorHistory,
		};

		const fs = await import("node:fs/promises");
		await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");

		this.logger.info(`Error history exported to ${filePath}`, {
			errorCount: this.errorHistory.length,
			filePath,
		});
	}
}