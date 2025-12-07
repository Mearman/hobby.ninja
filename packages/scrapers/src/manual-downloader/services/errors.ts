/**
 * Error handling utilities for Bandai Manual Content Downloader
 *
 * Standardized error classes and error classification system
 * for consistent error handling across all services.
 *
 * @version 1.0.0
 * @since 2025-12-05
 */

import { ErrorInfo } from "../types/types";

// Re-export for convenience
export { ErrorInfo } from "../types/types";

/**
 * Base error class for manual downloader operations
 */
export abstract class ManualDownloaderError extends Error {
	public readonly type: ErrorInfo["type"];
	public readonly code: string;
	public readonly timestamp: string;
	public readonly retryCount: number;
	public readonly recoverable: boolean;
	public readonly suggestedAction?: string;

	constructor(
		type: ErrorInfo["type"],
		code: string,
		message: string,
		recoverable = false,
		suggestedAction?: string,
	) {
		super(message);
		this.name = this.constructor.name;
		this.type = type;
		this.code = code;
		this.timestamp = new Date().toISOString();
		this.retryCount = 0;
		this.recoverable = recoverable;
		this.suggestedAction = suggestedAction;
	}

	/**
   * Increment retry count
   */
	incrementRetry(): void {
		(this as any).retryCount++;
	}

	/**
   * Convert to ErrorInfo interface
   */
	toErrorInfo(): ErrorInfo {
		return {
			type: this.type,
			code: this.code,
			message: this.message,
			timestamp: this.timestamp,
			retryCount: this.retryCount,
			recoverable: this.recoverable,
			suggestedAction: this.suggestedAction,
		};
	}
}

/**
 * Network-related errors
 */
export class NetworkError extends ManualDownloaderError {
	constructor(code: string, message: string, recoverable = true) {
		super("network", code, message, recoverable, "Check network connection and retry");
	}
}

/**
 * HTTP request/response errors
 */
export class HttpError extends ManualDownloaderError {
	public readonly statusCode?: number;
	public readonly statusText?: string;

	constructor(code: string, message: string, statusCode?: number, statusText?: string) {
		super("http", code, message, statusCode !== undefined && statusCode >= 400 && statusCode < 500);
		this.statusCode = statusCode;
		this.statusText = statusText;
	}
}

/**
 * File system operation errors
 */
export class FileSystemError extends ManualDownloaderError {
	public readonly filePath?: string;

	constructor(code: string, message: string, filePath?: string, recoverable = false) {
		super("filesystem", code, message, recoverable, "Check file permissions and disk space");
		this.filePath = filePath;
	}
}

/**
 * Content validation errors
 */
export class ValidationError extends ManualDownloaderError {
	public readonly field?: string;
	public readonly value?: any;

	constructor(code: string, message: string, field?: string, value?: any) {
		super("validation", code, message, false, "Fix input data and retry");
		this.field = field;
		this.value = value;
	}
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends ManualDownloaderError {
	public readonly configKey?: string;

	constructor(code: string, message: string, configKey?: string) {
		super("configuration", code, message, false, "Fix configuration settings");
		this.configKey = configKey;
	}
}

/**
 * Error factory for creating standardized errors
 */
export const ErrorFactory = {
	/**
   * Create network error
   */
	network(code: string, message: string, recoverable = true): NetworkError {
		return new NetworkError(code, message, recoverable);
	},

	/**
   * Create HTTP error
   */
	http(code: string, message: string, statusCode?: number, statusText?: string): HttpError {
		return new HttpError(code, message, statusCode, statusText);
	},

	/**
   * Create file system error
   */
	filesystem(code: string, message: string, filePath?: string, recoverable = false): FileSystemError {
		return new FileSystemError(code, message, filePath, recoverable);
	},

	/**
   * Create validation error
   */
	validation(code: string, message: string, field?: string, value?: any): ValidationError {
		return new ValidationError(code, message, field, value);
	},

	/**
   * Create configuration error
   */
	configuration(code: string, message: string, configKey?: string): ConfigurationError {
		return new ConfigurationError(code, message, configKey);
	},

	/**
   * Process error and return standardized error info
   */
	process(error: unknown, context?: string): ErrorInfo {
		const standardError = this.fromUnknown(error, context);
		return standardError.toErrorInfo();
	},

	/**
   * Create error from unknown error
   */
	fromUnknown(error: unknown, context?: string): ManualDownloaderError {
		if (error instanceof ManualDownloaderError) {
			return error;
		}

		if (error instanceof Error) {
			// Try to classify based on error message
			const message = context ? `${context}: ${error.message}` : error.message;

			if (error.message.includes("ENOENT") || error.message.includes("EACCES")) {
				return this.filesystem("FILE_ERROR", message);
			}

			if (error.message.includes("ETIMEDOUT") || error.message.includes("ECONNRESET")) {
				return this.network("CONNECTION_ERROR", message, true);
			}

			// Default to generic error
			return new NetworkError("UNKNOWN_ERROR", message, true);
		}

		return new NetworkError("UNKNOWN_ERROR", String(error || "Unknown error"), true);
	},
};

/**
 * Error handler for consistent error processing
 */
export const ErrorHandler = {
	/**
   * Process error and return standardized error info
   */
	process(error: unknown, context?: string): ErrorInfo {
		const standardError = ErrorFactory.fromUnknown(error, context);
		return standardError.toErrorInfo();
	},

	/**
   * Determine if error is recoverable
   */
	isRecoverable(error: unknown): boolean {
		const errorInfo = this.process(error);
		return errorInfo.recoverable;
	},

	/**
   * Get recovery suggestion
   */
	getSuggestion(error: unknown): string | undefined {
		const errorInfo = this.process(error);
		return errorInfo.suggestedAction;
	},

	/**
   * Log error with context
   */
	log(error: unknown, context?: string): void {
		const errorInfo = this.process(error, context);
		console.error(`[${errorInfo.type.toUpperCase()}] ${errorInfo.code}: ${errorInfo.message}`);

		if (errorInfo.suggestedAction) {
			console.error(`Suggestion: ${errorInfo.suggestedAction}`);
		}

		console.error(`Timestamp: ${errorInfo.timestamp}`);
		console.error(`Retry Count: ${errorInfo.retryCount}`);
	},
};