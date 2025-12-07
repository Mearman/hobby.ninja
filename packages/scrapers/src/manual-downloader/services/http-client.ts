/**
 * HTTP client service for Bandai Manual Content Downloader
 *
 * Provides HTTP request abstraction with retry logic,
 * timeout handling, and response validation.
 *
 * @version 1.0.0
 * @since 2025-12-05
 */

export interface HttpClientOptions {
  timeout?: number;
  headers?: Record<string, string>;
  followRedirects?: boolean;
  maxRedirects?: number;
  userAgent?: string;
  headersOnly?: boolean;
}

export interface HttpResponse<T = string> {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  url: string;
  data: T;
  duration: number;
}

export interface HttpClientConfig {
  defaultTimeout: number;
  defaultHeaders: Record<string, string>;
  maxRetries: number;
  retryDelay: number;
  userAgent: string;
}

/**
 * HTTP client implementation using Node.js fetch
 */
export class HttpClient {
	private config: HttpClientConfig;

	constructor(config: Partial<HttpClientConfig> = {}) {
		this.config = {
			defaultTimeout: 30_000,  // 30 seconds
			defaultHeaders: {},
			maxRetries: 3,
			retryDelay: 5000,         // 5 seconds
			userAgent: "ManualDownloader/1.0; +http://example.com/bot-info",
			...config,
		};
	}

	/**
   * Make HTTP GET request
   */
	async get<T = string>(url: string, options: HttpClientOptions = {}): Promise<HttpResponse<T>> {
		return this.request<T>("GET", url, undefined, options);
	}

	/**
   * Make HTTP HEAD request (headers only, fast)
   */
	async head(url: string, options: HttpClientOptions = {}): Promise<HttpResponse> {
		return this.request("HEAD", url, undefined, { ...options, headersOnly: true });
	}

	/**
   * Make HTTP request with method
   */
	async request<T = string>(
		method: string,
		url: string,
		body?: string,
		options: HttpClientOptions = {},
	): Promise<HttpResponse<T>> {
		const startTime = Date.now();
		let lastError: Error | null = null;

		// Merge options with defaults
		const mergedOptions = {
			timeout: options.timeout || this.config.defaultTimeout,
			headers: {
				...this.config.defaultHeaders,
				"User-Agent": options.userAgent || this.config.userAgent,
				...options.headers,
			},
			followRedirects: options.followRedirects !== false,
			maxRedirects: options.maxRedirects || 5,
			signal: null as AbortSignal | null,
		};

		// Retry loop
		for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
			try {
				// Create abort controller for timeout
				const controller = new AbortController();
				const timeoutId = setTimeout(() => { controller.abort(); }, mergedOptions.timeout);
				mergedOptions.signal = controller.signal;

				// Make request
				const response = await fetch(url, {
					method,
					headers: mergedOptions.headers,
					body,
					signal: mergedOptions.signal,
					redirect: mergedOptions.followRedirects ? "follow" : "follow", // Always follow redirects for now
				});

				// Clear timeout
				clearTimeout(timeoutId);

				// Get response data (only for non-HEAD requests)
				let data: T;
				const isHeadRequest = (options as any).headersOnly;

				if (isHeadRequest) {
					// For HEAD requests, return empty string
					data = "" as T;
				} else {
					const contentType = response.headers.get("content-type");
					data = contentType?.includes("application/json") ? (await response.json()) as T : (await response.text()) as T;
				}

				const duration = Date.now() - startTime;

				// Return successful response
				return {
					statusCode: response.status,
					statusText: response.statusText,
					headers: this.parseHeaders(response.headers),
					url: response.url,
					data,
					duration,
				};

			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				// Don't retry on certain errors
				if (!this.shouldRetry(lastError, attempt)) {
					throw lastError;
				}

				// Wait before retry
				if (attempt < this.config.maxRetries) {
					await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (attempt + 1)));
				}
			}
		}

		// All retries failed
		throw lastError || new Error("Request failed after maximum retries");
	}

	/**
   * Validate URL and make request
   */
	async validateUrl(url: string, options: HttpClientOptions = {}): Promise<{
    statusCode: number;
    contentLength: number;
    isValid: boolean;
    duration: number;
    headers: Record<string, string>;
    finalUrl: string;
    fromCache: boolean;
  }> {
		try {
			const response = await this.head(url, options);

			return {
				statusCode: response.statusCode,
				contentLength: this.getContentLength(response.headers),
				isValid: response.statusCode === 200,
				duration: response.duration,
				headers: response.headers,
				finalUrl: response.url,
				fromCache: false,
			};
		} catch {
			return {
				statusCode: 0,
				contentLength: 0,
				isValid: false,
				duration: 0,
				headers: {},
				finalUrl: url,
				fromCache: false,
			};
		}
	}

	/**
   * Check if error should be retried
   */
	private shouldRetry(error: Error, attempt: number): boolean {
		if (attempt >= this.config.maxRetries) {
			return false;
		}

		const message = error.message.toLowerCase();

		// Don't retry on client errors (4xx)
		if (message.includes("400") || message.includes("401") || message.includes("403") || message.includes("404")) {
			return false;
		}

		// Retry on network errors and server errors (5xx)
		if (message.includes("timeout") ||
        message.includes("connection") ||
        message.includes("network") ||
        message.includes("500") ||
        message.includes("502") ||
        message.includes("503") ||
        message.includes("504") ||
        message.includes("aborted")) {
			return true;
		}

		return false;
	}

	/**
   * Parse Headers object to plain object
   */
	private parseHeaders(headers: Headers): Record<string, string> {
		const result: Record<string, string> = {};
		for (const [key, value] of headers.entries()) {
			result[key] = value;
		}
		return result;
	}

	/**
   * Get content length from headers
   */
	private getContentLength(headers: Record<string, string>): number {
		const contentLength = headers["content-length"];
		return contentLength ? Number.parseInt(contentLength, 10) : 0;
	}

	/**
   * Get HTTP client statistics
   */
	getStats(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    bytesTransferred: number;
    } {
		// In a real implementation, this would track actual statistics
		return {
			totalRequests: 0,
			successfulRequests: 0,
			failedRequests: 0,
			averageResponseTime: 0,
			bytesTransferred: 0,
		};
	}
}