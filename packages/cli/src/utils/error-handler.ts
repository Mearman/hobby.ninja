import { writeFile } from "node:fs/promises";

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

export enum ErrorCategory {
  NETWORK = "network",
  PARSING = "parsing",
  VALIDATION = "validation",
  FILE_SYSTEM = "file_system",
  CONFIGURATION = "configuration",
  RATE_LIMIT = "rate_limit",
  UNKNOWN = "unknown"
}

export type ErrorContext = Record<string, string | number | boolean | undefined>;

export interface ScraperError {
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  url?: string;
  source?: string;
  timestamp: number;
  retryable: boolean;
  context?: ErrorContext;
  originalError?: Error;
  stackTrace?: string;
}

export interface ErrorReport {
  totalErrors: number;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByCategory: Record<ErrorCategory, number>;
  retryableErrors: number;
  criticalErrors: number;
  errors: ScraperError[];
  generatedAt: number;
}

export class ErrorHandler {
	private errors: ScraperError[] = [];
	private maxErrors: number;
	private logToFile: boolean;
	private logFilePath?: string;

	constructor(options: { maxErrors?: number; logToFile?: boolean; logFilePath?: string } = {}) {
		this.maxErrors = options.maxErrors ?? 1000;
		this.logToFile = options.logToFile ?? false;
		if (options.logFilePath) {
			this.logFilePath = options.logFilePath;
		}
	}

	createError(
		message: string,
		category: ErrorCategory = ErrorCategory.UNKNOWN,
		severity: ErrorSeverity = ErrorSeverity.MEDIUM,
		context?: ErrorContext,
		originalError?: Error,
		url?: string,
		source?: string,
	): ScraperError {
		const error: ScraperError = {
			message,
			severity,
			category,
			timestamp: Date.now(),
			retryable: this.isRetryableError(category, severity),
		};

		// Only add optional properties if they exist
		if (context !== undefined) {
			error.context = context;
		}
		if (originalError !== undefined) {
			error.originalError = originalError;
		}
		if (url !== undefined) {
			error.url = url;
		}
		if (source !== undefined) {
			error.source = source;
		}

		if (originalError?.stack) {
			error.stackTrace = originalError.stack;
		}

		return error;
	}

	addError(error: ScraperError): void {
		this.errors.push(error);

		// Remove old errors if we exceed the limit
		if (this.errors.length > this.maxErrors) {
			this.errors = this.errors.slice(-this.maxErrors);
		}

		// Log critical errors immediately
		if (error.severity === ErrorSeverity.CRITICAL) {
			this.logError(error, "CRITICAL");
		}

		// Log to file if enabled
		if (this.logToFile) {
			this.logErrorToFile(error).catch((logError: unknown) => {
				console.warn("Failed to log error to file:", logError);
			});
		}
	}

	addErrorFromException(
		error: Error,
		category: ErrorCategory = ErrorCategory.UNKNOWN,
		severity: ErrorSeverity = ErrorSeverity.MEDIUM,
		context?: ErrorContext,
		url?: string,
		source?: string,
	): void {
		const scraperError = this.createError(
			error.message,
			category,
			severity,
			context,
			error,
			url,
			source,
		);
		this.addError(scraperError);
	}

	getErrorReport(): ErrorReport {
		const errorsBySeverity: Record<ErrorSeverity, number> = {
			[ErrorSeverity.LOW]: 0,
			[ErrorSeverity.MEDIUM]: 0,
			[ErrorSeverity.HIGH]: 0,
			[ErrorSeverity.CRITICAL]: 0,
		};

		const errorsByCategory: Record<ErrorCategory, number> = {
			[ErrorCategory.NETWORK]: 0,
			[ErrorCategory.PARSING]: 0,
			[ErrorCategory.VALIDATION]: 0,
			[ErrorCategory.FILE_SYSTEM]: 0,
			[ErrorCategory.CONFIGURATION]: 0,
			[ErrorCategory.RATE_LIMIT]: 0,
			[ErrorCategory.UNKNOWN]: 0,
		};

		let retryableErrors = 0;
		let criticalErrors = 0;

		for (const error of this.errors) {
			errorsBySeverity[error.severity]++;
			errorsByCategory[error.category]++;
			if (error.retryable) retryableErrors++;
			if (error.severity === ErrorSeverity.CRITICAL) criticalErrors++;
		}

		return {
			totalErrors: this.errors.length,
			errorsBySeverity,
			errorsByCategory,
			retryableErrors,
			criticalErrors,
			errors: [...this.errors],
			generatedAt: Date.now(),
		};
	}

	getErrorsByCategory(category: ErrorCategory): ScraperError[] {
		return this.errors.filter(error => error.category === category);
	}

	getErrorsBySeverity(severity: ErrorSeverity): ScraperError[] {
		return this.errors.filter(error => error.severity === severity);
	}

	getRetryableErrors(): ScraperError[] {
		return this.errors.filter(error => error.retryable);
	}

	getCriticalErrors(): ScraperError[] {
		return this.errors.filter(error => error.severity === ErrorSeverity.CRITICAL);
	}

	hasErrors(): boolean {
		return this.errors.length > 0;
	}

	hasCriticalErrors(): boolean {
		return this.errors.some(error => error.severity === ErrorSeverity.CRITICAL);
	}

	clearErrors(): void {
		this.errors = [];
	}

	private isRetryableError(category: ErrorCategory, severity: ErrorSeverity): boolean {
		// Network errors are often retryable unless critical
		if (category === ErrorCategory.NETWORK) {
			return severity !== ErrorSeverity.CRITICAL;
		}

		// Rate limit errors are retryable with backoff
		if (category === ErrorCategory.RATE_LIMIT) {
			return true;
		}

		// File system errors are generally not retryable
		if (category === ErrorCategory.FILE_SYSTEM) {
			return false;
		}

		// Parsing errors are not retryable with same input
		if (category === ErrorCategory.PARSING) {
			return false;
		}

		// Configuration errors are not retryable without changes
		if (category === ErrorCategory.CONFIGURATION) {
			return false;
		}

		// Validation errors are not retryable with same data
		if (category === ErrorCategory.VALIDATION) {
			return false;
		}

		// Unknown errors are not retryable by default
		return false;
	}

	private logError(error: ScraperError, level: string): void {
		const timestamp = new Date(error.timestamp).toISOString();
		const logMessage = `[${timestamp}] [${level}] [${error.category.toUpperCase()}] [${error.severity.toUpperCase()}] ${error.message}`;

		if (error.url) {
			console.error(`${logMessage} (URL: ${error.url})`);
		} else {
			console.error(logMessage);
		}

		if (error.context) {
			console.error("Context:", JSON.stringify(error.context, null, 2));
		}

		if (error.stackTrace && error.severity === ErrorSeverity.CRITICAL) {
			console.error("Stack trace:", error.stackTrace);
		}
	}

	private async logErrorToFile(error: ScraperError): Promise<void> {
		if (!this.logFilePath) return;

		try {
			const logEntry = {
				timestamp: new Date(error.timestamp).toISOString(),
				level: "ERROR",
				category: error.category,
				severity: error.severity,
				message: error.message,
				url: error.url,
				source: error.source,
				retryable: error.retryable,
				context: error.context,
				stackTrace: error.stackTrace,
			};

			const logLine = JSON.stringify(logEntry) + "\n";
			await writeFile(this.logFilePath, logLine, { flag: "a" });
		} catch (logError) {
			console.warn("Failed to write error to log file:", logError);
		}
	}

	// Utility methods for common error types
	static createNetworkError(message: string, url?: string, originalError?: Error): ScraperError {
		return new ErrorHandler().createError(
			message,
			ErrorCategory.NETWORK,
			ErrorSeverity.HIGH,
			undefined,
			originalError,
			url,
		);
	}

	static createParsingError(message: string, url?: string, context?: ErrorContext): ScraperError {
		return new ErrorHandler().createError(
			message,
			ErrorCategory.PARSING,
			ErrorSeverity.MEDIUM,
			context,
			undefined,
			url,
		);
	}

	static createValidationError(message: string, context?: ErrorContext): ScraperError {
		return new ErrorHandler().createError(
			message,
			ErrorCategory.VALIDATION,
			ErrorSeverity.MEDIUM,
			context,
		);
	}

	static createRateLimitError(message: string, url?: string, retryAfter?: number): ScraperError {
		const context = retryAfter ? { retryAfter } : undefined;
		return new ErrorHandler().createError(
			message,
			ErrorCategory.RATE_LIMIT,
			ErrorSeverity.MEDIUM,
			context,
			undefined,
			url,
		);
	}

	static createFileSystemError(message: string, path?: string, originalError?: Error): ScraperError {
		const context = path ? { path } : undefined;
		return new ErrorHandler().createError(
			message,
			ErrorCategory.FILE_SYSTEM,
			ErrorSeverity.HIGH,
			context,
			originalError,
		);
	}

	static createConfigurationError(message: string, context?: ErrorContext): ScraperError {
		return new ErrorHandler().createError(
			message,
			ErrorCategory.CONFIGURATION,
			ErrorSeverity.MEDIUM,
			context,
		);
	}

	// Async error handling wrapper
	static async withErrorHandling<T>(
		operation: () => Promise<T>,
		context: string,
		errorHandler?: (error: Error) => void,
	): Promise<T | null> {
		try {
			return await operation();
		} catch (error) {
			if (errorHandler) {
				errorHandler(error instanceof Error ? error : new Error(String(error)));
			} else {
				console.error(`Error in ${context}:`, error);
			}
			return null;
		}
	}

	// Retry logic with exponential backoff
	static async withRetry<T>(
		operation: () => Promise<T>,
		maxRetries = 3,
		baseDelay = 1000,
		context?: string,
	): Promise<T> {
		let lastError: Error | undefined;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				if (attempt === maxRetries) {
					break;
				}

				const delay = baseDelay * Math.pow(2, attempt);
				console.warn(`${context ?? "Operation"} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${String(delay)}ms...`);

				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}

		if (!lastError) {
			throw new Error("Operation failed without error details");
		}

		throw lastError;
	}
}

// Export singleton instance for convenience
export const errorHandler = new ErrorHandler({
	maxErrors: 1000,
	logToFile: false,
});