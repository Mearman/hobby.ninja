/**
 * Rate limiting service for Bandai Manual Content Downloader
 *
 * Implements respectful request throttling with configurable delays,
 * exponential backoff, and rate limit detection.
 *
 * @version 1.0.0
 * @since 2025-12-05
 */

import { setTimeout } from "node:timers/promises";

export interface RateLimiterConfig {
  baseDelay: number;           // milliseconds between requests
  maxConcurrent: number;      // concurrent request limit
  exponentialBackoff: boolean; // enable exponential backoff
  backoffMultiplier: number;  // multiplier for backoff
  maxDelay: number;          // maximum delay between requests
}

export interface RateLimitResponse {
  retryAfter?: number;       // seconds to wait before retry
  suggestedDelay?: number;   // server-suggested delay
}

/**
 * Rate limiter service implementation
 */
export class RateLimiterService {
	private config: RateLimiterConfig;
	private lastRequestTime = 0;
	private activeRequests = 0;
	private retryCount = 0;

	constructor(config: Partial<RateLimiterConfig> = {}) {
		this.config = {
			baseDelay: 8000,          // 8 seconds for Japanese sites
			maxConcurrent: 1,          // single connection
			exponentialBackoff: true,
			backoffMultiplier: 2,
			maxDelay: 60_000,           // 1 minute maximum
			...config,
		};
	}

	/**
   * Wait before making next request
   */
	async wait(): Promise<void> {
		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequestTime;

		// Calculate required delay
		let requiredDelay = this.config.baseDelay;

		// Apply exponential backoff if enabled
		if (this.config.exponentialBackoff && this.retryCount > 0) {
			requiredDelay = Math.min(
				this.config.baseDelay * Math.pow(this.config.backoffMultiplier, this.retryCount),
				this.config.maxDelay,
			);
		}

		// Wait if we need to respect the delay
		if (timeSinceLastRequest < requiredDelay) {
			const waitTime = requiredDelay - timeSinceLastRequest;
			await setTimeout(waitTime);
		}

		// Wait if we're at concurrent limit
		while (this.activeRequests >= this.config.maxConcurrent) {
			await setTimeout(100); // Check every 100ms
		}

		this.lastRequestTime = Date.now();
	}

	/**
   * Start a request
   */
	startRequest(): void {
		this.activeRequests++;
	}

	/**
   * End a request
   */
	endRequest(success = true): void {
		this.activeRequests = Math.max(0, this.activeRequests - 1);

		if (success) {
			this.retryCount = 0; // Reset retry count on success
		}
	}

	/**
   * Handle rate limit response
   */
	handleRateLimit(response?: RateLimitResponse): void {
		this.retryCount++;

		if (response?.retryAfter) {
			// Use server-specified retry time
			this.lastRequestTime = Date.now() + (response.retryAfter * 1000);
		} else if (response?.suggestedDelay) {
			// Use server-suggested delay
			this.lastRequestTime = Date.now() + response.suggestedDelay;
		}
	}

	/**
   * Reset retry count
   */
	resetRetries(): void {
		this.retryCount = 0;
	}

	/**
   * Get current rate limit status
   */
	getStatus(): {
    activeRequests: number;
    retryCount: number;
    nextRequestTime: number;
    timeUntilNextRequest: number;
    } {
		return {
			activeRequests: this.activeRequests,
			retryCount: this.retryCount,
			nextRequestTime: this.lastRequestTime + this.config.baseDelay,
			timeUntilNextRequest: Math.max(0, (this.lastRequestTime + this.config.baseDelay) - Date.now()),
		};
	}

	/**
   * Wait for specific delay (custom wait time)
   */
	async waitFor(delay: number): Promise<void> {
		await setTimeout(delay);
	}

	/**
   * Test if rate limiter allows a request
   */
	canMakeRequest(): boolean {
		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequestTime;

		return timeSinceLastRequest >= this.config.baseDelay &&
           this.activeRequests < this.config.maxConcurrent;
	}

	/**
   * Get wait time until next request
   */
	getTimeUntilNextRequest(): number {
		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequestTime;
		const requiredDelay = this.config.exponentialBackoff && this.retryCount > 0
			? Math.min(this.config.baseDelay * Math.pow(this.config.backoffMultiplier, this.retryCount), this.config.maxDelay)
			: this.config.baseDelay;

		return Math.max(0, requiredDelay - timeSinceLastRequest);
	}
}