import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PageCache, CacheStats, CacheConfig } from '../types/cache-types.js';

export class CacheManager {
  private cacheDir: string;
  private compressionEnabled: boolean;
  private defaultTtl: number; // milliseconds

  constructor(options: {
    cacheDir?: string;
    compressionEnabled?: boolean;
    defaultTtl?: number;
  } = {}) {
    this.cacheDir = options.cacheDir || path.join(process.cwd(), '.cache', 'gundam-scraper');
    this.compressionEnabled = options.compressionEnabled ?? true;
    this.defaultTtl = options.defaultTtl || 24 * 60 * 60 * 1000; // 24 hours
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to initialize cache directory: ${error}`);
    }
  }

  private getCacheKey(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex');
  }

  private getCachePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  async get(key: string): Promise<PageCache | null> {
    try {
      const cachePath = this.getCachePath(key);
      const data = await fs.readFile(cachePath, 'utf-8');
      const entry: PageCache = JSON.parse(data);

      // Check if entry is expired
      if (Date.now() > entry.expiresAt) {
        await this.delete(key);
        return null;
      }

      entry.hits = (entry.hits || 0) + 1;
      entry.lastAccessed = Date.now();

      // Update access metadata asynchronously
      this.updateAccessMetadata(key, entry).catch(() => {
        // Ignore errors in metadata updates
      });

      return entry;
    } catch (error) {
      return null; // Cache miss
    }
  }

  async set(key: string, url: string, html: string, source: string, ttl?: number): Promise<void> {
    const now = Date.now();
    const entry: PageCache = {
      url,
      cacheKey: key,
      source: source as any,
      rawHtml: html,
      renderingStrategy: {
        type: 'static',
        staticContentAvailable: true,
        dynamicContentCaptured: false,
        jsDependencies: [],
        playwrightUsed: false,
        cheerioUsed: true
      },
      cachedAt: now,
      lastAccessed: now,
      expiresAt: now + (ttl || this.defaultTtl),
      size: html.length,
      hits: 0,
      contentType: 'text/html',
      encoding: 'utf-8',
      language: 'unknown',
      integrity: {
        checksum: crypto.createHash('md5').update(html).digest('hex'),
        validationStatus: 'valid',
        lastValidated: now
      }
    };

    try {
      const cachePath = this.getCachePath(key);
      await fs.writeFile(cachePath, JSON.stringify(entry, null, 2));
    } catch (error) {
      throw new Error(`Failed to cache data: ${error}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const cachePath = this.getCachePath(key);
      await fs.unlink(cachePath);
    } catch (error) {
      // Ignore file not found errors
    }
  }

  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.cacheDir, file)))
      );
    } catch (error) {
      throw new Error(`Failed to clear cache: ${error}`);
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const files = await fs.readdir(this.cacheDir);
      let totalSize = 0;
      let compressedSize = 0;
      let totalHits = 0;
      let oldestEntry = Date.now();
      let newestEntry = 0;
      let totalAccessTime = 0;
      const now = Date.now();

      for (const file of files) {
        try {
          const filePath = path.join(this.cacheDir, file);
          const stats = await fs.stat(filePath);
          const data = await fs.readFile(filePath, 'utf-8');
          const entry: PageCache = JSON.parse(data);

          totalSize += stats.size;
          compressedSize += entry.size || 0;
          totalHits += entry.hits || 0;

          oldestEntry = Math.min(oldestEntry, entry.cachedAt);
          newestEntry = Math.max(newestEntry, entry.cachedAt);
        } catch (error) {
          // Skip corrupted files
        }
      }

      return {
        totalFiles: files.length,
        totalSize,
        compressionRatio: totalSize > 0 ? compressedSize / totalSize : 1,
        hitRate: 0, // Will be calculated by tracking hits/misses
        averageAccessTime: files.length > 0 ? totalAccessTime / files.length : 0,
        oldestEntry,
        newestEntry
      };
    } catch (error) {
      return {
        totalFiles: 0,
        totalSize: 0,
        compressionRatio: 1,
        hitRate: 0,
        averageAccessTime: 0,
        oldestEntry: Date.now(),
        newestEntry: Date.now()
      };
    }
  }

  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        try {
          const filePath = path.join(this.cacheDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const entry: CacheEntry = JSON.parse(data);

          if (now > entry.expiresAt) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        } catch (error) {
          // Delete corrupted files
          const filePath = path.join(this.cacheDir, file);
          await fs.unlink(filePath).catch(() => {});
          deletedCount++;
        }
      }

      console.log(`Cache cleanup completed: ${deletedCount} entries removed`);
    } catch (error) {
      throw new Error(`Failed to cleanup cache: ${error}`);
    }
  }

  private async updateAccessMetadata(key: string, entry: PageCache): Promise<void> {
    try {
      const cachePath = this.getCachePath(key);
      await fs.writeFile(cachePath, JSON.stringify(entry, null, 2));
    } catch (error) {
      // Ignore metadata update failures
    }
  }

  async getByUrl(url: string): Promise<PageCache | null> {
    const key = this.getCacheKey(url);
    return this.get(key);
  }

  async setByUrl(url: string, html: string, source: string, ttl?: number): Promise<void> {
    const key = this.getCacheKey(url);
    return this.set(key, url, html, source, ttl);
  }
}