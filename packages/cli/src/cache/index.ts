import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface CacheEntry<T = any> {
  data: T;
  createdAt: number;
  expiresAt: number;
  size: number;
  metadata?: Record<string, any>;
}

export interface CacheOptions {
  cacheDir?: string;
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size in bytes
  compressionEnabled?: boolean;
}

export interface CacheStats {
  totalFiles: number;
  totalSize: number;
  cacheDir: string;
  error?: Error;
}

export class PageCache {
	private options: Required<CacheOptions>;
	private cacheDir: string;

	constructor(options: CacheOptions = {}) {
		this.options = {
			cacheDir: options.cacheDir ?? "./.cache",
			ttl: options.ttl ?? 3_600_000, // 1 hour default
			maxSize: options.maxSize ?? 100 * 1024 * 1024, // 100MB default
			compressionEnabled: options.compressionEnabled ?? false,
		};

		this.cacheDir = this.options.cacheDir;
		this.ensureCacheDir();
	}

	private async ensureCacheDir(): Promise<void> {
		try {
			await fs.access(this.cacheDir);
		} catch {
			await fs.mkdir(this.cacheDir, { recursive: true });
		}
	}

	async get<T = any>(key: string): Promise<T | null> {
		try {
			const filePath = this.getCacheFilePath(key);
			const data = await fs.readFile(filePath, "utf8");
			const entry: CacheEntry<T> = JSON.parse(data);

			// Check if expired
			if (Date.now() > entry.expiresAt) {
				await this.delete(key);
				return null;
			}

			return entry.data;
		} catch {
			// File doesn't exist or corrupted
			return null;
		}
	}

	async set<T = any>(key: string, data: T, customTtl?: number): Promise<void> {
		try {
			const filePath = this.getCacheFilePath(key);
			const ttl = customTtl ?? this.options.ttl;
			const now = Date.now();

			const serializedData = JSON.stringify(data);
			const entry: CacheEntry<T> = {
				data,
				createdAt: now,
				expiresAt: now + ttl,
				size: Buffer.byteLength(serializedData, "utf8"),
			};

			await this.ensureCacheDir();
			await fs.writeFile(filePath, JSON.stringify(entry), "utf8");

			// Check if we need to cleanup
			await this.checkCacheSize();

		} catch (error) {
			throw new Error(`Failed to set cache entry for key "${key}": ${error}`);
		}
	}

	async delete(key: string): Promise<void> {
		try {
			const filePath = this.getCacheFilePath(key);
			await fs.unlink(filePath);
		} catch {
			// File doesn't exist, ignore
		}
	}

	async clear(): Promise<void> {
		try {
			const files = await fs.readdir(this.cacheDir);
			await Promise.all(
				files
					.filter(file => file.endsWith(".json"))
					.map(file => fs.unlink(path.join(this.cacheDir, file))),
			);
		} catch (error) {
			throw new Error(`Failed to clear cache: ${error}`);
		}
	}

	async cleanup(): Promise<void> {
		try {
			const files = await fs.readdir(this.cacheDir);
			const now = Date.now();

			for (const file of files) {
				if (!file.endsWith(".json")) continue;

				try {
					const filePath = path.join(this.cacheDir, file);
					const data = await fs.readFile(filePath, "utf8");
					const entry: CacheEntry = JSON.parse(data);

					if (now > entry.expiresAt) {
						await fs.unlink(filePath);
					}
				} catch {
					// Remove corrupted files
					const filePath = path.join(this.cacheDir, file);
					await fs.unlink(filePath).catch(() => {});
				}
			}
		} catch (error) {
			throw new Error(`Failed to cleanup cache: ${error}`);
		}
	}

	async getStats(): Promise<CacheStats> {
		try {
			const files = await fs.readdir(this.cacheDir);
			const jsonFiles = files.filter(file => file.endsWith(".json"));

			let totalSize = 0;
			let totalFiles = 0;

			for (const file of jsonFiles) {
				try {
					const filePath = path.join(this.cacheDir, file);
					const stats = await fs.stat(filePath);
					totalSize += stats.size;
					totalFiles++;
				} catch {
					// Skip files that can't be accessed
				}
			}

			return {
				totalFiles,
				totalSize,
				cacheDir: this.cacheDir,
			};
		} catch (error) {
			return {
				totalFiles: 0,
				totalSize: 0,
				cacheDir: this.cacheDir,
				error: error instanceof Error ? error : new Error("Unknown error"),
			};
		}
	}

	private async checkCacheSize(): Promise<void> {
		const stats = await this.getStats();

		if (stats.totalSize > this.options.maxSize) {
			await this.evictLRU(stats.totalSize - this.options.maxSize * 0.8); // Remove 80% of excess
		}
	}

	private async evictLRU(bytesToRemove: number): Promise<void> {
		try {
			const files = await fs.readdir(this.cacheDir);
			const fileInfos = [];

			for (const file of files) {
				if (!file.endsWith(".json")) continue;

				try {
					const filePath = path.join(this.cacheDir, file);
					const stats = await fs.stat(filePath);
					const data = await fs.readFile(filePath, "utf8");
					const entry: CacheEntry = JSON.parse(data);

					fileInfos.push({
						file,
						filePath,
						size: stats.size,
						createdAt: entry.createdAt,
					});
				} catch {
					// Remove corrupted files
					const filePath = path.join(this.cacheDir, file);
					await fs.unlink(filePath).catch(() => {});
				}
			}

			// Sort by creation time (oldest first)
			fileInfos.sort((a, b) => a.createdAt - b.createdAt);

			let removedBytes = 0;
			for (const info of fileInfos) {
				if (removedBytes >= bytesToRemove) break;

				await fs.unlink(info.filePath);
				removedBytes += info.size;
			}
		} catch (error) {
			throw new Error(`Failed to evict from cache: ${error}`);
		}
	}

	private getCacheFilePath(key: string): string {
		// Sanitize key and create a hash for the filename
		const sanitizedKey = key.replaceAll(/[^a-zA-Z0-9_-]/g, "_");
		const hash = crypto.createHash("md5").update(key).digest("hex");
		return path.join(this.cacheDir, `${sanitizedKey}_${hash}.json`);
	}

	async setWithMetadata<T = any>(
		key: string,
		data: T,
		metadata: Record<string, any>,
		customTtl?: number,
	): Promise<void> {
		try {
			const filePath = this.getCacheFilePath(key);
			const ttl = customTtl ?? this.options.ttl;
			const now = Date.now();

			const serializedData = JSON.stringify(data);
			const entry: CacheEntry<T> = {
				data,
				createdAt: now,
				expiresAt: now + ttl,
				size: Buffer.byteLength(serializedData, "utf8"),
				metadata,
			};

			await this.ensureCacheDir();
			await fs.writeFile(filePath, JSON.stringify(entry), "utf8");
			await this.checkCacheSize();

		} catch (error) {
			throw new Error(`Failed to set cache entry with metadata for key "${key}": ${error}`);
		}
	}

	async getWithMetadata<T = any>(key: string): Promise<{ data: T; metadata?: Record<string, any> } | null> {
		try {
			const filePath = this.getCacheFilePath(key);
			const data = await fs.readFile(filePath, "utf8");
			const entry: CacheEntry<T> = JSON.parse(data);

			// Check if expired
			if (Date.now() > entry.expiresAt) {
				await this.delete(key);
				return null;
			}

			return {
				data: entry.data,
				metadata: entry.metadata,
			};
		} catch {
			return null;
		}
	}

	async has(key: string): Promise<boolean> {
		try {
			const filePath = this.getCacheFilePath(key);
			await fs.access(filePath);

			// Check if expired
			const data = await fs.readFile(filePath, "utf8");
			const entry: CacheEntry = JSON.parse(data);

			if (Date.now() > entry.expiresAt) {
				await this.delete(key);
				return false;
			}

			return true;
		} catch {
			return false;
		}
	}

	async getKeys(): Promise<string[]> {
		try {
			const files = await fs.readdir(this.cacheDir);
			const keys: string[] = [];

			for (const file of files) {
				if (!file.endsWith(".json")) continue;

				try {
					// Extract key from filename
					const match = file.match(/^(.+)_[a-f0-9]{32}\.json$/);
					if (match) {
						keys.push(match[1]);
					}
				} catch {
					// Skip invalid filenames
				}
			}

			return keys;
		} catch {
			return [];
		}
	}

	async getTTL(key: string): Promise<number> {
		try {
			const filePath = this.getCacheFilePath(key);
			const data = await fs.readFile(filePath, "utf8");
			const entry: CacheEntry = JSON.parse(data);

			const remaining = entry.expiresAt - Date.now();
			return Math.max(0, remaining);
		} catch {
			return 0;
		}
	}

	async touch(key: string, customTtl?: number): Promise<void> {
		try {
			const filePath = this.getCacheFilePath(key);
			const data = await fs.readFile(filePath, "utf8");
			const entry: CacheEntry = JSON.parse(data);

			const ttl = customTtl ?? this.options.ttl;
			entry.expiresAt = Date.now() + ttl;

			await fs.writeFile(filePath, JSON.stringify(entry), "utf8");
		} catch (error) {
			throw new Error(`Failed to touch cache entry for key "${key}": ${error}`);
		}
	}

	// Batch operations
	async mget<T = any>(keys: string[]): Promise<Map<string, T | null>> {
		const results = new Map<string, T | null>();

		await Promise.all(
			keys.map(async (key) => {
				const value = await this.get<T>(key);
				results.set(key, value);
			}),
		);

		return results;
	}

	async mset<T = any>(entries: Array<{ key: string; data: T; ttl?: number }>): Promise<void> {
		await Promise.all(
			entries.map(({ key, data, ttl }) => this.set(key, data, ttl)),
		);
	}

	async mdelete(keys: string[]): Promise<void> {
		await Promise.all(
			keys.map(key => this.delete(key)),
		);
	}

	// Health check
	async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
		const issues: string[] = [];

		try {
			// Check if cache directory is accessible
			await fs.access(this.cacheDir);

			// Check if we can write to cache
			const testKey = `health-check-${Date.now()}`;
			await this.set(testKey, { test: true });
			await this.delete(testKey);

			// Check cache size
			const stats = await this.getStats();
			if (stats.error) {
				issues.push(`Cache stats error: ${stats.error.message}`);
			}

			// Check if too many expired files
			await this.cleanup();

			return {
				healthy: issues.length === 0,
				issues,
			};
		} catch (error) {
			issues.push(`Cache health check failed: ${error}`);
			return {
				healthy: false,
				issues,
			};
		}
	}
}

// Cache factory for different types
export function createPageCache(options: CacheOptions = {}): PageCache {
	return new PageCache(options);
}

export function createProductCache(options: CacheOptions = {}): PageCache {
	return new PageCache({
		...options,
		cacheDir: path.join(options.cacheDir || "./.cache", "products"),
		ttl: options.ttl ?? 7_200_000, // 2 hours for products
		maxSize: options.maxSize ?? 200 * 1024 * 1024, // 200MB for products
	});
}

export function createImageCache(options: CacheOptions = {}): PageCache {
	return new PageCache({
		...options,
		cacheDir: path.join(options.cacheDir || "./.cache", "images"),
		ttl: options.ttl ?? 86_400_000, // 24 hours for images
		maxSize: options.maxSize ?? 500 * 1024 * 1024, // 500MB for images
	});
}