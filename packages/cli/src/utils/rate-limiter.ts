import {
	TIME,
	RATE_LIMITING,
} from "../constants/index.js";

export interface RateLimiterConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstCapacity: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
	private config: RateLimiterConfig;
	private requestLog: number[] = [];
	private lastCleanup = 0;

	constructor(config: Partial<RateLimiterConfig> = {}) {
		this.config = {
			requestsPerSecond: Math.floor(RATE_LIMITING.MAX_REQUESTS_PER_MINUTE / TIME.MINUTE * TIME.SECOND),
			requestsPerMinute: RATE_LIMITING.MAX_REQUESTS_PER_MINUTE,
			requestsPerHour: RATE_LIMITING.MAX_REQUESTS_PER_HOUR,
			burstCapacity: RATE_LIMITING.BURST_LIMIT,
			...config,
		};
	}

	checkLimit(): RateLimitStatus {
		const now = Date.now();
		this.cleanup(now);

		// Check per-second limit
		const recentSecond = this.requestLog.filter(time => now - time < TIME.SECOND);
		if (recentSecond.length >= this.config.requestsPerSecond) {
			return {
				allowed: false,
				remainingRequests: 0,
				resetTime: Math.min(...recentSecond) + TIME.SECOND,
				retryAfter: Math.max(0, Math.min(...recentSecond) + TIME.SECOND - now),
			};
		}

		// Check per-minute limit
		const recentMinute = this.requestLog.filter(time => now - time < TIME.MINUTE);
		if (recentMinute.length >= this.config.requestsPerMinute) {
			return {
				allowed: false,
				remainingRequests: 0,
				resetTime: Math.min(...recentMinute) + TIME.MINUTE,
				retryAfter: Math.max(0, Math.min(...recentMinute) + TIME.MINUTE - now),
			};
		}

		// Check per-hour limit
		const recentHour = this.requestLog.filter(time => now - time < TIME.HOUR);
		if (recentHour.length >= this.config.requestsPerHour) {
			return {
				allowed: false,
				remainingRequests: 0,
				resetTime: Math.min(...recentHour) + TIME.HOUR,
				retryAfter: Math.max(0, Math.min(...recentHour) + TIME.HOUR - now),
			};
		}

		// Check burst capacity
		if (this.requestLog.length - this.getOldRequests(now) >= this.config.burstCapacity) {
			return {
				allowed: false,
				remainingRequests: 0,
				resetTime: this.getOldestRequest(now) + TIME.HOUR,
				retryAfter: Math.max(0, this.getOldestRequest(now) + TIME.HOUR - now),
			};
		}

		const remainingPerSecond = Math.max(0, this.config.requestsPerSecond - recentSecond.length);
		const remainingPerMinute = Math.max(0, this.config.requestsPerMinute - recentMinute.length);
		const remainingPerHour = Math.max(0, this.config.requestsPerHour - recentHour.length);

		return {
			allowed: true,
			remainingRequests: Math.min(remainingPerSecond, remainingPerMinute, remainingPerHour),
			resetTime: now + TIME.SECOND,
		};
	}

	async waitForSlot(): Promise<void> {
		const status = this.checkLimit();
		if (!status.allowed && status.retryAfter) {
			await new Promise(resolve => setTimeout(resolve, status.retryAfter));
			return this.waitForSlot(); // Recursive retry
		}
	}

	recordRequest(): void {
		this.requestLog.push(Date.now());
	}

	async executeWithLimit<T>(fn: () => Promise<T>): Promise<T> {
		await this.waitForSlot();
		this.recordRequest();
		return fn();
	}

	private cleanup(now: number): void {
		// Only cleanup every 10 seconds to avoid excessive work
		const CLEANUP_INTERVAL = 10 * TIME.SECOND;
		if (now - this.lastCleanup < CLEANUP_INTERVAL) {
			return;
		}

		this.requestLog = this.requestLog.filter(time => now - time < TIME.HOUR);
		this.lastCleanup = now;
	}

	private getOldRequests(now: number): number {
		const oneHourAgo = now - TIME.HOUR;
		return this.requestLog.filter(time => time < oneHourAgo).length;
	}

	private getOldestRequest(now: number): number {
		if (this.requestLog.length === 0) {
			return now;
		}
		return Math.min(...this.requestLog);
	}

	getStats(): {
    totalRequests: number;
    requestsInLastSecond: number;
    requestsInLastMinute: number;
    requestsInLastHour: number;
    } {
		const now = Date.now();
		this.cleanup(now);

		return {
			totalRequests: this.requestLog.length,
			requestsInLastSecond: this.requestLog.filter(time => now - time < TIME.SECOND).length,
			requestsInLastMinute: this.requestLog.filter(time => now - time < TIME.MINUTE).length,
			requestsInLastHour: this.requestLog.filter(time => now - time < TIME.HOUR).length,
		};
	}

	reset(): void {
		this.requestLog = [];
		this.lastCleanup = Date.now();
	}
}

// Domain-specific rate limiters
export class BandaiRateLimiter extends RateLimiter {
	constructor() {
		super({
			requestsPerSecond: 1,  // Very conservative for Bandai
			requestsPerMinute: 30,
			requestsPerHour: 500,
			burstCapacity: 5,
		});
	}
}

export class GeneralRateLimiter extends RateLimiter {
	constructor() {
		super({
			requestsPerSecond: Math.floor(RATE_LIMITING.MAX_REQUESTS_PER_MINUTE / TIME.MINUTE * TIME.SECOND),
			requestsPerMinute: RATE_LIMITING.MAX_REQUESTS_PER_MINUTE,
			requestsPerHour: RATE_LIMITING.MAX_REQUESTS_PER_HOUR,
			burstCapacity: RATE_LIMITING.BURST_LIMIT,
		});
	}
}