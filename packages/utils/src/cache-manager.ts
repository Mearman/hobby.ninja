import { promises as fs } from "node:fs";
import path from "node:path";

import type { CacheManager } from "@hobby-ninja/types/profile";

import { logger } from "./logger";

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
  persistToFile?: boolean; // Whether to persist cache to disk
  cacheDir?: string; // Directory for cache files
}

export interface CacheItem {
  value: unknown;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export class FileSystemCacheManager implements CacheManager {
	private memoryCache = new Map<string, CacheItem>();
	private options: Required<CacheOptions>;
	private cleanupInterval: NodeJS.Timeout;

	constructor(options: CacheOptions = {}) {
		this.options = {
			ttl: options.ttl ?? 3_600_000, // 1 hour default
			maxSize: options.maxSize ?? 1000,
			persistToFile: options.persistToFile ?? false,
			cacheDir: options.cacheDir ?? path.join(process.cwd(), ".cache"),
		};

		// Ensure cache directory exists
		if (this.options.persistToFile) {
			void this.ensureCacheDirectory();
		}

		// Start cleanup interval
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, 60_000); // Cleanup every minute
	}

	private async ensureCacheDirectory(): Promise<void> {
		try {
			await fs.mkdir(this.options.cacheDir, { recursive: true });
		} catch (error) {
			logger.warn("Failed to create cache directory:", error);
		}
	}

	private getCacheFilePath(key: string): string {
		const hashKey = Buffer.from(key).toString("base64").replaceAll(/[/+=]/g, "_");
		return path.join(this.options.cacheDir, `${hashKey}.cache`);
	}

	private isExpired(item: CacheItem): boolean {
		return Date.now() - item.timestamp > item.ttl;
	}

	private async loadFromFile(key: string): Promise<CacheItem | null> {
		if (!this.options.persistToFile) return null;

		try {
			const filePath = this.getCacheFilePath(key);
			const data = await fs.readFile(filePath, "utf8");
			const item = JSON.parse(data) as CacheItem;

			if (this.isExpired(item)) {
				await fs.unlink(filePath);
				return null;
			}

			return item;
		} catch {
			// File doesn't exist or is corrupted
			return null;
		}
	}

	private async saveToFile(key: string, item: CacheItem): Promise<void> {
		if (!this.options.persistToFile) return;

		try {
			const filePath = this.getCacheFilePath(key);
			const data = JSON.stringify(item);
			await fs.writeFile(filePath, data, "utf8");
		} catch (error) {
			logger.warn("Failed to save cache item to file:", error);
		}
	}

	private async deleteFromFile(key: string): Promise<void> {
		if (!this.options.persistToFile) return;

		try {
			const filePath = this.getCacheFilePath(key);
			await fs.unlink(filePath);
		} catch {
			// File doesn't exist or can't be deleted
			// This is not a critical error
		}
	}

	private evictLeastRecentlyUsed(): void {
		if (this.memoryCache.size <= this.options.maxSize) return;

		// Sort by last accessed time and remove the least recently used items
		const entries: Array<[string, CacheItem]> = [...this.memoryCache.entries()];
		const items = [...entries].toSorted(
			(a, b) => a[1].lastAccessed - b[1].lastAccessed,
		);

		const itemsToRemove = items.slice(0, items.length - this.options.maxSize);

		for (const [key] of itemsToRemove) {
			this.memoryCache.delete(key);
			this.deleteFromFile(key).catch(() => {/* noop */}); // Fire and forget
		}
	}

	private cleanup(): void {
		const expiredKeys: string[] = [];

		for (const [key, item] of this.memoryCache.entries()) {
			if (this.isExpired(item)) {
				expiredKeys.push(key);
			}
		}

		// Remove expired items
		for (const key of expiredKeys) {
			this.memoryCache.delete(key);
			this.deleteFromFile(key).catch(() => {/* noop */}); // Fire and forget
		}

		// Evict LRU items if cache is still too large
		this.evictLeastRecentlyUsed();
	}

	get(key: string): unknown {
		// Check memory cache first
		const memoryItem = this.memoryCache.get(key);

		if (memoryItem) {
			if (this.isExpired(memoryItem)) {
				this.memoryCache.delete(key);
				this.deleteFromFile(key).catch(() => {/* noop */}); // Fire and forget
				return null;
			}

			// Update access statistics
			memoryItem.accessCount++;
			memoryItem.lastAccessed = Date.now();
			return memoryItem.value;
		}

		// Try to load from file if not in memory cache
		if (this.options.persistToFile) {
			return this.loadFromFile(key).then(item => {
				if (item) {
					if (this.isExpired(item)) {
						this.deleteFromFile(key).catch(() => {/* noop */});
						return null;
					}

					// Add to memory cache
					item.accessCount = 1;
					item.lastAccessed = Date.now();
					this.memoryCache.set(key, item);

					// Evict if necessary
					this.evictLeastRecentlyUsed();

					return item.value;
				}
				return null;
			}).catch(() => null);
		}

		return null;
	}

	set(key: string, value: unknown, ttl: number = this.options.ttl): void {
		const item: CacheItem = {
			value,
			timestamp: Date.now(),
			ttl,
			accessCount: 1,
			lastAccessed: Date.now(),
		};

		this.memoryCache.set(key, item);

		// Save to file if persistence is enabled
		if (this.options.persistToFile) {
			this.saveToFile(key, item).catch(() => {/* noop */}); // Fire and forget
		}

		// Evict if necessary
		this.evictLeastRecentlyUsed();
	}

	clear(): void {
		this.memoryCache.clear();

		// Clear all cache files if persistence is enabled
		if (this.options.persistToFile) {
			fs.readdir(this.options.cacheDir)
				.then(files => {
					const cacheFiles = files.filter(file => file.endsWith(".cache"));
					return Promise.all(
						cacheFiles.map(file =>
							fs.unlink(path.join(this.options.cacheDir, file)).catch(() => {/* noop */}),
						),
					);
				})
				.catch(() => {/* noop */}); // Fire and forget
		}
	}

	delete(key: string): boolean {
		const deleted = this.memoryCache.delete(key);

		// Delete from file if persistence is enabled
		if (this.options.persistToFile) {
			this.deleteFromFile(key).catch(() => {/* noop */}); // Fire and forget
		}

		return deleted;
	}

	// Additional utility methods
	size(): number {
		return this.memoryCache.size;
	}

	keys(): string[] {
		return [...this.memoryCache.keys()];
	}

	has(key: string): boolean {
		const item = this.memoryCache.get(key);
		return item !== undefined && !this.isExpired(item);
	}

	getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
    } {
		let totalAccess = 0;
		let memoryUsage = 0;

		for (const item of this.memoryCache.values()) {
			totalAccess += item.accessCount;
			memoryUsage += JSON.stringify(item.value).length;
		}

		const hitRate = totalAccess > 0 ? (totalAccess - this.memoryCache.size) / totalAccess : 0;

		return {
			size: this.memoryCache.size,
			maxSize: this.options.maxSize,
			hitRate,
			memoryUsage,
		};
	}

	// Additional methods for URL-based caching
	async getByUrl(url: string): Promise<unknown> {
		const urlKey = `url:${url}`;
		return this.get(urlKey);
	}

	async setByUrl(url: string, value: unknown, type: string): Promise<void> {
		const urlKey = `url:${url}:${type}`;
		const ttl = type === "profile-analysis" ? 1_800_000 : this.options.ttl; // 30 minutes for profile analysis
		this.set(urlKey, { rawHtml: value }, ttl);
	}

	// Cleanup method to be called when shutting down
	destroy(): void {
		clearInterval(this.cleanupInterval);
	}
}

// Create a singleton instance with default options
export const cacheManager = new FileSystemCacheManager({
	ttl: 3_600_000, // 1 hour
	maxSize: 500,
	persistToFile: true,
	cacheDir: path.join(process.cwd(), ".cache", "profiles"),
});