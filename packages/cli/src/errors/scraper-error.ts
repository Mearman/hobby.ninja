/**
 * Custom error class for the Gundam scraper CLI
 * Integrates with error codes system and provides rich context for debugging
 */

import { ErrorCode, ErrorCategory, ErrorRegistry } from "./error-codes.js";

// Constants for retry logic
const DEFAULT_MAX_RETRY_COUNT = 3;
const BASE_RETRY_DELAY_MS = 1000; // 1 second
const EXPONENTIAL_BACKOFF_BASE = 2;
const MAX_RETRY_DELAY_MS = 30_000; // 30 seconds
const JITTER_PERCENTAGE = 0.1;

// HTTP status code constants
const HTTP_STATUS_NOT_FOUND = 404;
const HTTP_STATUS_FORBIDDEN = 403;
const HTTP_STATUS_RATE_LIMITED = 429;
const HTTP_STATUS_SERVER_ERROR_MIN = 500;

export interface ErrorContext {
  url?: string;
  statusCode?: number;
  retryCount?: number;
  duration?: number;
  userAgent?: string;
  proxy?: string;
  dataSize?: number;
  selector?: string;
  configKey?: string;
  filePath?: string;
  operation?: string;
  [key: string]: unknown;
}

export interface ErrorMetadata {
  timestamp: string;
  sessionId?: string;
  correlationId?: string;
  stackTrace?: string;
  originalError?: Error;
}

export class ScraperError extends Error {
	public readonly code: ErrorCode;
	public readonly category: ErrorCategory;
	public readonly context: ErrorContext;
	public metadata: ErrorMetadata;
	public readonly retryable: boolean;
	public readonly severity: "low" | "medium" | "high" | "critical";
	public readonly userMessage: string;
	public readonly suggestions: string[];

	constructor(
		code: ErrorCode,
		context: ErrorContext = {},
		originalError?: Error,
		customMessage?: string,
	) {
		const errorInfo = ErrorRegistry.getErrorInfo(code);

		if (!errorInfo) {
			throw new Error(`Unknown error code: ${code}`);
		}

		const message = customMessage ?? errorInfo.message;
		super(message);

		this.name = "ScraperError";
		this.code = code;
		this.category = errorInfo.category;
		this.context = context;
		this.retryable = errorInfo.retryable;
		this.severity = errorInfo.severity;
		this.userMessage = errorInfo.userMessage;
		this.suggestions = errorInfo.suggestions;

		this.metadata = {
			timestamp: new Date().toISOString(),
			...(this.stack ? { stackTrace: this.stack } : {}),
			...(originalError ? { originalError } : {}),
		};

		// Maintains proper prototype chain for instanceof checks
		Object.setPrototypeOf(this, ScraperError.prototype);
	}

	/**
   * Create a ScraperError from a generic Error with automatic code detection
   */
	static fromError(error: Error, context: ErrorContext = {}): ScraperError {
		// Auto-detect error type based on error message or properties
		const detectedCode = this.detectErrorCode(error);

		return new ScraperError(
			detectedCode,
			context,
			error,
			error.message,
		);
	}

	/**
   * Create a ScraperError for network-related issues
   */
	static network(code: ErrorCode, url: string, statusCode?: number, originalError?: Error): ScraperError {
		const context: ErrorContext = {
			url,
			operation: "http_request",
		};
		if (statusCode !== undefined) {
			context.statusCode = statusCode;
		}
		return new ScraperError(code, context, originalError);
	}

	/**
   * Create a ScraperError for filesystem issues
   */
	static filesystem(code: ErrorCode, filePath: string, operation?: string, originalError?: Error): ScraperError {
		return new ScraperError(code, {
			filePath,
			operation: operation ?? "file_operation",
		}, originalError);
	}

	/**
   * Create a ScraperError for configuration issues
   */
	static configuration(code: ErrorCode, configKey?: string, originalError?: Error): ScraperError {
		const context: ErrorContext = {
			operation: "configuration",
		};
		if (configKey !== undefined) {
			context.configKey = configKey;
		}
		return new ScraperError(code, context, originalError);
	}

	/**
   * Create a ScraperError for scraping issues
   */
	static scraping(code: ErrorCode, url?: string, selector?: string, originalError?: Error): ScraperError {
		return new ScraperError(code, {
			...(url && { url }),
			...(selector && { selector }),
			operation: "data_extraction",
		}, originalError);
	}

	/**
   * Create a ScraperError for data validation issues
   */
	static validation(code: ErrorCode, fieldName?: string, value?: unknown, originalError?: Error): ScraperError {
		return new ScraperError(code, {
			fieldName,
			value,
			operation: "data_validation",
		}, originalError);
	}

	/**
   * Get a detailed error report for logging
   */
	toDetailedString(): string {
		const lines = [
			`Error: ${this.code}`,
			`Message: ${this.message}`,
			`Category: ${this.category}`,
			`Severity: ${this.severity}`,
			`Retryable: ${String(this.retryable)}`,
			`Timestamp: ${this.metadata.timestamp}`,
			"",
		];

		if (Object.keys(this.context).length > 0) {
			lines.push("Context:");
			for (const [key, value] of Object.entries(this.context)) {
				lines.push(`  ${key}: ${value !== null && typeof value === "object" ? JSON.stringify(value) : String(value)}`);
			}
			lines.push("");
		}

		if (this.metadata.originalError) {
			lines.push("Original Error:", `  ${this.metadata.originalError.name}: ${this.metadata.originalError.message}`);
			if (this.metadata.originalError.stack) {
				lines.push("  Stack:");
				for (const line of this.metadata.originalError.stack.split("\n")) {
					lines.push(`    ${line}`);
				}
			}
			lines.push("");
		}

		if (this.metadata.stackTrace) {
			lines.push("Stack Trace:");
			for (const line of this.metadata.stackTrace.split("\n")) {
				lines.push(`  ${line}`);
			}
		}

		return lines.join("\n");
	}

	/**
   * Get user-friendly error message with suggestions
   */
	toUserMessage(): string {
		const lines = [this.userMessage];

		if (this.suggestions.length > 0) {
			lines.push("\nSuggestions:");
			for (const [index, suggestion] of this.suggestions.entries()) {
				lines.push(`${index + 1}. ${suggestion}`);
			}
		}

		if (this.context.url) {
			lines.push(`\nURL: ${this.context.url}`);
		}

		if (this.context.statusCode) {
			lines.push(`Status Code: ${this.context.statusCode}`);
		}

		lines.push(`\nError Code: ${this.code}`);

		return lines.join("\n");
	}

	/**
   * Get JSON representation for API responses
   */
	toJSON(): Record<string, unknown> {
		return {
			code: this.code,
			category: this.category,
			message: this.message,
			userMessage: this.userMessage,
			suggestions: this.suggestions,
			severity: this.severity,
			retryable: this.retryable,
			context: this.context,
			metadata: {
				timestamp: this.metadata.timestamp,
				originalError: this.metadata.originalError ? {
					name: this.metadata.originalError.name,
					message: this.metadata.originalError.message,
				} : undefined,
			},
		};
	}

	/**
   * Check if this error should trigger a retry
   */
	shouldRetry(): boolean {
		return this.retryable && (this.context.retryCount ?? 0) < DEFAULT_MAX_RETRY_COUNT;
	}

	/**
   * Get recommended delay before retry (in milliseconds)
   */
	getRetryDelay(): number {
		const retryCount = this.context.retryCount ?? 0;

		// Exponential backoff with jitter
		const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(EXPONENTIAL_BACKOFF_BASE, retryCount);
		const jitter = Math.random() * JITTER_PERCENTAGE * exponentialDelay;

		return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS);
	}

	/**
   * Create a copy of this error with updated context
   */
	withContext(additionalContext: Partial<ErrorContext>): ScraperError {
		const newError = new ScraperError(
			this.code,
			{ ...this.context, ...additionalContext },
			this.metadata.originalError,
			this.message,
		);

		// Copy metadata
		newError.metadata = { ...this.metadata };
		return newError;
	}

	/**
   * Auto-detect error code based on error properties
   */
	private static detectErrorCode(error: Error): ErrorCode {
		const message = error.message.toLowerCase();

		// Network-related errors
		if (message.includes("enotfound") || message.includes("getaddrinfo")) {
			return ErrorCode.NETWORK_DNS_RESOLUTION;
		}

		if (message.includes("timeout") || message.includes("etimeout")) {
			return ErrorCode.NETWORK_TIMEOUT;
		}

		if (message.includes("econnrefused") || message.includes("connection refused")) {
			return ErrorCode.NETWORK_CONNECTION_FAILED;
		}

		if (message.includes("certificate") || message.includes("ssl") || message.includes("tls")) {
			return ErrorCode.NETWORK_SSL_ERROR;
		}

		// Filesystem errors
		if (message.includes("enoent") || message.includes("no such file")) {
			return ErrorCode.FS_FILE_NOT_FOUND;
		}

		if (message.includes("eacces") || message.includes("permission denied")) {
			return ErrorCode.FS_PERMISSION_DENIED;
		}

		if (message.includes("enospc") || message.includes("disk full")) {
			return ErrorCode.FS_DISK_FULL;
		}

		// HTTP status codes
		if ("status" in error) {
			const status = (error as { status?: number }).status;
			if (status === HTTP_STATUS_NOT_FOUND) return ErrorCode.SCRAPE_PAGE_NOT_FOUND;
			if (status === HTTP_STATUS_FORBIDDEN) return ErrorCode.SCRAPE_ACCESS_DENIED;
			if (status === HTTP_STATUS_RATE_LIMITED) return ErrorCode.SCRAPE_RATE_LIMITED;
			if (status && status >= HTTP_STATUS_SERVER_ERROR_MIN) return ErrorCode.NETWORK_CONNECTION_FAILED;
		}

		// Configuration errors
		if (message.includes("validation") || message.includes("invalid")) {
			return ErrorCode.CONFIG_VALIDATION_FAILED;
		}

		// Default fallback
		return ErrorCode.SYSTEM_UNKNOWN_ERROR;
	}
}

/**
 * Helper function to create ScraperError instances with type safety
 */
export function createScraperError(
	code: ErrorCode,
	context?: ErrorContext,
	originalError?: Error,
): ScraperError {
	return new ScraperError(code, context, originalError);
}

/**
 * Helper function to wrap async functions with error handling
 */
export function withErrorHandling<T extends unknown[], R>(
	fn: (...args: T) => Promise<R>,
	context?: ErrorContext,
): (...args: T) => Promise<R> {
	return async (...args: T): Promise<R> => {
		try {
			return await fn(...args);
		} catch (error) {
			if (error instanceof Error) {
				throw ScraperError.fromError(error, context);
			}
			throw ScraperError.fromError(new Error(String(error)), context);
		}
	};
}