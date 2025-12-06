import { DEFAULT_CACHE_TTL, MAX_CACHE_SIZE } from "./constants";
import { CacheEntry } from "./types";

// Browser globals
declare const setInterval: typeof globalThis.setInterval;
declare const clearInterval: typeof globalThis.clearInterval;

// Type for timer ID that works in both browser and Node.js
type TimerId = ReturnType<typeof setInterval>;

/**
 * In-memory cache for translations
 * Uses LRU (Least Recently Used) eviction strategy
 */
export class TranslationCache {
	private cache: Map<string, CacheEntry> = new Map();
	private accessOrder: Map<string, number> = new Map();
	private accessCounter = 0;
	private cleanupInterval: TimerId | null = null;
	private hits = 0;
	private misses = 0;

	constructor(
    private maxSize: number = MAX_CACHE_SIZE,
    private defaultTtl: number = DEFAULT_CACHE_TTL,
    private enablePeriodicCleanup: boolean = true,
	) {
		if (this.enablePeriodicCleanup) {
			this.startPeriodicCleanup();
		}
	}

	/**
   * Generate cache key from text, source language, and target language
   */
	private generateKey(
		text: string,
		sourceLanguage: string,
		targetLanguage: string,
	): string {
		return `${sourceLanguage}:${targetLanguage}:${text}`;
	}

	/**
   * Get cached translation
   */
	get(
		text: string,
		sourceLanguage: string,
		targetLanguage: string,
	): string | null {
		const key = this.generateKey(text, sourceLanguage, targetLanguage);
		const entry = this.cache.get(key);

		if (!entry) {
			this.misses++;
			return null;
		}

		// Check if entry is expired
		if (Date.now() > entry.timestamp + entry.ttl) {
			this.cache.delete(key);
			this.accessOrder.delete(key);
			this.misses++;
			return null;
		}

		// Update access order for LRU
		this.accessOrder.set(key, ++this.accessCounter);
		this.hits++;
		return entry.value;
	}

	/**
   * Set translation in cache
   */
	set(
		text: string,
		sourceLanguage: string,
		targetLanguage: string,
		value: string,
		customTtl?: number,
	): void {
		const key = this.generateKey(text, sourceLanguage, targetLanguage);
		const ttl = customTtl || this.defaultTtl;
		const timestamp = Date.now();

		// Evict oldest entries if cache is full
		if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
			this.evictOldest();
		}

		const entry: CacheEntry = {
			key,
			value,
			sourceLanguage,
			targetLanguage,
			timestamp,
			ttl,
		};

		this.cache.set(key, entry);
		this.accessOrder.set(key, ++this.accessCounter);
	}

	/**
   * Check if translation exists in cache
   */
	has(
		text: string,
		sourceLanguage: string,
		targetLanguage: string,
	): boolean {
		const key = this.generateKey(text, sourceLanguage, targetLanguage);
		const entry = this.cache.get(key);

		if (!entry) {
			return false;
		}

		// Check if entry is expired
		if (Date.now() > entry.timestamp + entry.ttl) {
			this.cache.delete(key);
			this.accessOrder.delete(key);
			return false;
		}

		return true;
	}

	/**
   * Delete entry from cache
   */
	delete(
		text: string,
		sourceLanguage: string,
		targetLanguage: string,
	): boolean {
		const key = this.generateKey(text, sourceLanguage, targetLanguage);
		const deleted = this.cache.delete(key);
		this.accessOrder.delete(key);
		return deleted;
	}

	/**
   * Clear all cache entries
   */
	clear(): void {
		this.cache.clear();
		this.accessOrder.clear();
		this.accessCounter = 0;
		this.hits = 0;
		this.misses = 0;
	}

	/**
   * Get cache statistics
   */
	getStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
    memoryUsage: number;
    } {
		const size = this.cache.size;
		const hitRate = this.calculateHitRate();
		const memoryUsage = this.estimateMemoryUsage();

		return {
			size,
			maxSize: this.maxSize,
			hits: this.hits,
			misses: this.misses,
			hitRate,
			memoryUsage,
		};
	}

	/**
   * Evict expired entries
   */
	evictExpired(): number {
		const now = Date.now();
		let evictedCount = 0;

		for (const [key, entry] of this.cache) {
			if (now > entry.timestamp + entry.ttl) {
				this.cache.delete(key);
				this.accessOrder.delete(key);
				evictedCount++;
			}
		}

		return evictedCount;
	}

	/**
   * Evict least recently used entry
   */
	private evictOldest(): void {
		let oldestKey: string | null = null;
		let oldestAccess = Infinity;

		for (const [key, accessTime] of this.accessOrder) {
			if (accessTime < oldestAccess) {
				oldestAccess = accessTime;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
			this.accessOrder.delete(oldestKey);
		}
	}

	/**
   * Start periodic cleanup of expired entries
   */
	private startPeriodicCleanup(): void {
		this.cleanupInterval = setInterval(() => {
			this.evictExpired();
		}, 60_000); // Clean up every minute
	}

	/**
   * Stop periodic cleanup
   */
	stopPeriodicCleanup(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
	}

	/**
   * Estimate memory usage in bytes
   */
	private estimateMemoryUsage(): number {
		let totalSize = 0;
		for (const [key, entry] of this.cache) {
			totalSize += Buffer.byteLength(key, "utf8");
			totalSize += Buffer.byteLength(entry.value, "utf8");
			totalSize += Buffer.byteLength(entry.sourceLanguage, "utf8");
			totalSize += Buffer.byteLength(entry.targetLanguage, "utf8");
			// Add overhead for timestamps and metadata
			totalSize += 64;
		}
		return totalSize;
	}

	/**
   * Calculate cache hit rate
   */
	private calculateHitRate(): number {
		const total = this.hits + this.misses;
		if (total === 0) return 0;
		return this.hits / total;
	}

	/**
   * Export cache data
   */
	export(): Array<[string, CacheEntry]> {
		return [...this.cache.entries()];
	}

	/**
   * Import cache data
   */
	import(entries: Array<[string, CacheEntry]>): void {
		this.clear();
		for (const [key, entry] of entries) {
			this.cache.set(key, entry);
			this.accessOrder.set(key, ++this.accessCounter);
		}
	}

	/**
   * Destroy cache and cleanup
   */
	destroy(): void {
		this.stopPeriodicCleanup();
		this.clear();
	}
}

/**
 * Default cache instance
 */
export const defaultCache = new TranslationCache();

/**
 * Cache factory function
 */
export function createCache(options?: {
  maxSize?: number;
  defaultTtl?: number;
  enablePeriodicCleanup?: boolean;
}): TranslationCache {
	return new TranslationCache(
		options?.maxSize,
		options?.defaultTtl,
		options?.enablePeriodicCleanup,
	);
}