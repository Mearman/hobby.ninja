import { ERROR_MESSAGES } from "./constants";
import { log } from "./logger";
import { TranslationErrorCode, TranslationError } from "./types";

// Browser globals
declare const setTimeout: typeof globalThis.setTimeout;

/**
 * Custom error class for translation-related errors
 */
export class TranslationServiceError extends Error {
	public readonly code: TranslationErrorCode;
	public readonly originalError?: unknown;
	public readonly requestInfo?: {
    text: string;
    sourceLanguage?: string;
    targetLanguage: string;
  };

	constructor(
		code: TranslationErrorCode,
		message?: string,
		originalError?: unknown,
		requestInfo?: TranslationError["requestInfo"],
	) {
		const errorMessage = message || ERROR_MESSAGES[code];
		super(errorMessage);

		this.name = "TranslationServiceError";
		this.code = code;
		this.originalError = originalError;
		this.requestInfo = requestInfo;
	}

	/**
   * Create error from network error
   */
	static fromNetworkError(
		error: unknown,
		requestInfo?: TranslationError["requestInfo"],
	): TranslationServiceError {
		if (error instanceof TypeError) {
			return new TranslationServiceError(
				TranslationErrorCode.NETWORK_ERROR,
				`Network error: ${error.message}`,
				error,
				requestInfo,
			);
		}

		if (error instanceof Error) {
			return new TranslationServiceError(
				TranslationErrorCode.UNKNOWN_ERROR,
				error.message,
				error,
				requestInfo,
			);
		}

		return new TranslationServiceError(
			TranslationErrorCode.UNKNOWN_ERROR,
			"Unknown network error occurred",
			error,
			requestInfo,
		);
	}

	/**
   * Create error from HTTP response
   */
	static fromHttpResponse(
		status: number,
		statusText: string,
		requestInfo?: TranslationError["requestInfo"],
	): TranslationServiceError {
		let code: TranslationErrorCode;
		let message: string;

		switch (status) {
			case 429: {
				code = TranslationErrorCode.RATE_LIMIT_EXCEEDED;
				message = "Rate limit exceeded. Please try again later.";
				break;
			}
			case 403: {
				code = TranslationErrorCode.QUOTA_EXCEEDED;
				message = "Translation quota exceeded. Please try again later.";
				break;
			}
			case 400:
			case 422: {
				code = TranslationErrorCode.INVALID_REQUEST;
				message = "Invalid translation request.";
				break;
			}
			case 503: {
				code = TranslationErrorCode.SERVICE_UNAVAILABLE;
				message = "Translation service is temporarily unavailable.";
				break;
			}
			default: {
				code = TranslationErrorCode.UNKNOWN_ERROR;
				message = `HTTP ${status}: ${statusText}`;
			}
		}

		return new TranslationServiceError(code, message, undefined, requestInfo);
	}

	/**
   * Create timeout error
   */
	static fromTimeout(
		timeout: number,
		requestInfo?: TranslationError["requestInfo"],
	): TranslationServiceError {
		return new TranslationServiceError(
			TranslationErrorCode.TIMEOUT,
			`Translation request timed out after ${timeout}ms`,
			undefined,
			requestInfo,
		);
	}

	/**
   * Create parsing error
   */
	static fromParsingError(
		error: unknown,
		requestInfo?: TranslationError["requestInfo"],
	): TranslationServiceError {
		return new TranslationServiceError(
			TranslationErrorCode.PARSING_ERROR,
			`Failed to parse translation response: ${error instanceof Error ? error.message : String(error)}`,
			error,
			requestInfo,
		);
	}

	/**
   * Check if error is retryable
   */
	public get isRetryable(): boolean {
		switch (this.code) {
			case TranslationErrorCode.NETWORK_ERROR:
			case TranslationErrorCode.TIMEOUT:
			case TranslationErrorCode.SERVICE_UNAVAILABLE:
			case TranslationErrorCode.RATE_LIMIT_EXCEEDED: {
				return true;
			}
			case TranslationErrorCode.QUOTA_EXCEEDED:
			case TranslationErrorCode.INVALID_REQUEST:
			case TranslationErrorCode.PARSING_ERROR:
			case TranslationErrorCode.CACHE_ERROR: {
				return false;
			}
			default: {
				return false;
			}
		}
	}

	/**
   * Get recommended retry delay in milliseconds
   */
	public get recommendedRetryDelay(): number {
		switch (this.code) {
			case TranslationErrorCode.RATE_LIMIT_EXCEEDED: {
				return 5000 + Math.random() * 5000;
			} // 5-10 seconds with jitter
			case TranslationErrorCode.SERVICE_UNAVAILABLE: {
				return 2000 + Math.random() * 3000;
			} // 2-5 seconds with jitter
			case TranslationErrorCode.NETWORK_ERROR:
			case TranslationErrorCode.TIMEOUT: {
				return 1000 + Math.random() * 2000;
			} // 1-3 seconds with jitter
			default: {
				return 1000;
			} // Default 1 second
		}
	}

	/**
   * Convert to plain object for serialization
   */
	toJSON(): TranslationError {
		return {
			code: this.code,
			message: this.message,
			originalError: this.originalError,
			requestInfo: this.requestInfo,
		};
	}
}

/**
 * Utility function to retry async operations with exponential backoff
 */
export async function retryWithBackoff<T>(
	operation: () => Promise<T>,
	maxAttempts: number = 3,
	baseDelay: number = 1000,
	maxDelay: number = 30_000,
	backoffFactor: number = 2,
	jitter: boolean = true,
): Promise<T> {
	let lastError: unknown;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;

			// Don't retry if this is the last attempt
			if (attempt === maxAttempts) {
				throw error;
			}

			// Check if error is retryable
			let shouldRetry = false;
			let delay = baseDelay;

			if (error instanceof TranslationServiceError) {
				shouldRetry = error.isRetryable;
				delay = error.recommendedRetryDelay;
			} else if (error instanceof Error && isRetryableNetworkError(error)) {
				shouldRetry = true;
			}

			if (!shouldRetry) {
				throw error;
			}

			// Calculate delay with exponential backoff
			const exponentialDelay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);

			// Add jitter to prevent thundering herd
			const jitterAmount = jitter ? Math.random() * 0.1 * exponentialDelay : 0;
			const finalDelay = Math.max(delay, exponentialDelay + jitterAmount);

			// Wait before retrying
			await new Promise(resolve => setTimeout(resolve, finalDelay));
		}
	}

	throw lastError;
}

/**
 * Check if a network error is retryable
 */
function isRetryableNetworkError(error: Error): boolean {
	// Retry on network-related errors
	if (error.name === "TypeError" || error.name === "NetworkError") {
		return true;
	}

	// Retry on timeout errors
	if (error.message.toLowerCase().includes("timeout") ||
      error.message.toLowerCase().includes("aborted")) {
		return true;
	}

	return false;
}

/**
 * Circuit breaker pattern for preventing cascade failures
 */
export class CircuitBreaker {
	private failureCount = 0;
	private lastFailureTime = 0;
	private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

	constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60_000, // 1 minute
    private monitoringPeriod: number = 300_000, // 5 minutes
	) {}

	/**
   * Execute operation with circuit breaker protection
   */
	async execute<T>(operation: () => Promise<T>): Promise<T> {
		if (this.state === "OPEN") {
			if (Date.now() - this.lastFailureTime < this.recoveryTimeout) {
				throw new TranslationServiceError(
					TranslationErrorCode.SERVICE_UNAVAILABLE,
					"Circuit breaker is OPEN - service temporarily unavailable",
				);
			}
			this.state = "HALF_OPEN";
		}

		try {
			const result = await operation();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	private onSuccess(): void {
		this.failureCount = 0;
		this.state = "CLOSED";
	}

	private onFailure(): void {
		this.failureCount++;
		this.lastFailureTime = Date.now();

		if (this.failureCount >= this.failureThreshold) {
			this.state = "OPEN";
		}
	}

	/**
   * Get circuit breaker state
   */
	getState(): { state: string; failureCount: number; lastFailureTime: number } {
		return {
			state: this.state,
			failureCount: this.failureCount,
			lastFailureTime: this.lastFailureTime,
		};
	}

	/**
   * Reset circuit breaker
   */
	reset(): void {
		this.failureCount = 0;
		this.state = "CLOSED";
		this.lastFailureTime = 0;
	}
}

/**
 * Error handler for logging and monitoring
 */
export class ErrorHandler {
	private errorCounts: Map<TranslationErrorCode, number> = new Map();

	/**
   * Handle and log errors
   */
	handleError(error: unknown, context?: string): void {
		const translationError: TranslationServiceError = error instanceof TranslationServiceError
			? error
			: TranslationServiceError.fromNetworkError(error);

		// Count errors for monitoring
		const currentCount = this.errorCounts.get(translationError.code) || 0;
		this.errorCounts.set(translationError.code, currentCount + 1);

		// Log error using the logger utility
		log.error("Translation error occurred", {
			code: translationError.code,
			message: translationError.message,
			requestInfo: translationError.requestInfo,
			originalError: translationError.originalError,
		}, context);

		// Send to monitoring service in production
		if (process["env"]["NODE_ENV"] === "production") {
			this.sendToMonitoring(translationError);
		}
	}

	/**
   * Get error statistics
   */
	getErrorStats(): Partial<Record<TranslationErrorCode, number>> {
		return Object.fromEntries(this.errorCounts) as Partial<Record<TranslationErrorCode, number>>;
	}

	/**
   * Reset error counts
   */
	resetErrorCounts(): void {
		this.errorCounts.clear();
	}

	private sendToMonitoring(error: TranslationServiceError): void {
		// In a real implementation, you might send this to Sentry, DataDog, etc.
		// For now, we'll just log it using the logger utility
		log.warn("Translation error detected by monitoring", error.toJSON(), "Monitoring");
	}
}