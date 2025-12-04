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
  private lastCleanup: number = 0;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = {
      requestsPerSecond: 2,
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      burstCapacity: 5,
      ...config
    };
  }

  async checkLimit(): Promise<RateLimitStatus> {
    const now = Date.now();
    this.cleanup(now);

    // Check per-second limit
    const recentSecond = this.requestLog.filter(time => now - time < 1000);
    if (recentSecond.length >= this.config.requestsPerSecond) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: Math.min(...recentSecond) + 1000,
        retryAfter: Math.max(0, Math.min(...recentSecond) + 1000 - now)
      };
    }

    // Check per-minute limit
    const recentMinute = this.requestLog.filter(time => now - time < 60000);
    if (recentMinute.length >= this.config.requestsPerMinute) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: Math.min(...recentMinute) + 60000,
        retryAfter: Math.max(0, Math.min(...recentMinute) + 60000 - now)
      };
    }

    // Check per-hour limit
    const recentHour = this.requestLog.filter(time => now - time < 3600000);
    if (recentHour.length >= this.config.requestsPerHour) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: Math.min(...recentHour) + 3600000,
        retryAfter: Math.max(0, Math.min(...recentHour) + 3600000 - now)
      };
    }

    // Check burst capacity
    if (this.requestLog.length - this.getOldRequests(now) >= this.config.burstCapacity) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: this.getOldestRequest(now) + 3600000,
        retryAfter: Math.max(0, this.getOldestRequest(now) + 3600000 - now)
      };
    }

    const remainingPerSecond = Math.max(0, this.config.requestsPerSecond - recentSecond.length);
    const remainingPerMinute = Math.max(0, this.config.requestsPerMinute - recentMinute.length);
    const remainingPerHour = Math.max(0, this.config.requestsPerHour - recentHour.length);

    return {
      allowed: true,
      remainingRequests: Math.min(remainingPerSecond, remainingPerMinute, remainingPerHour),
      resetTime: now + 1000
    };
  }

  async waitForSlot(): Promise<void> {
    const status = await this.checkLimit();
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
    if (now - this.lastCleanup < 10000) {
      return;
    }

    this.requestLog = this.requestLog.filter(time => now - time < 3600000);
    this.lastCleanup = now;
  }

  private getOldRequests(now: number): number {
    const oneHourAgo = now - 3600000;
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
      requestsInLastSecond: this.requestLog.filter(time => now - time < 1000).length,
      requestsInLastMinute: this.requestLog.filter(time => now - time < 60000).length,
      requestsInLastHour: this.requestLog.filter(time => now - time < 3600000).length
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
      burstCapacity: 3
    });
  }
}

export class GeneralRateLimiter extends RateLimiter {
  constructor() {
    super({
      requestsPerSecond: 2,
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      burstCapacity: 5
    });
  }
}