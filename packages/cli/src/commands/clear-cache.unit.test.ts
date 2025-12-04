/**
 * Comprehensive unit tests for clear-cache command
 * Tests edge cases, error scenarios, and boundary conditions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { clearCacheCommand } from './clear-cache';
import { PageCache } from '../cache';

// Mock dependencies
vi.mock('../cache');
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn(),
    stat: vi.fn(),
  },
}));

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('clearCacheCommand', () => {
  let mockCache: PageCache;
  let mockFs: typeof fs;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock cache
    mockCache = {
      clear: vi.fn().mockResolvedValue(undefined),
      getKeys: vi.fn().mockResolvedValue(['key1', 'key2', 'key3']),
      delete: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue({
        totalFiles: 10,
        totalSize: 1024 * 1024,
      }),
      has: vi.fn().mockResolvedValue(true),
      getTTL: vi.fn().mockResolvedValue(3600000),
    } as any;

    // Mock fs
    mockFs = vi.mocked(fs);
    mockFs.access.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({
      isDirectory: () => true,
      mtime: new Date('2023-01-01'),
    } as any);

    (PageCache as any).mockImplementation(() => mockCache);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  describe('Basic functionality', () => {
    it('should clear all cache when no options provided', async () => {
      const options = {};

      await clearCacheCommand(options);

      expect(PageCache).toHaveBeenCalled();
      expect(mockCache.clear).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Cache cleared successfully')
      );
    });

    it('should clear cache for specific scraper', async () => {
      const options = { scraper: 'bandai' };

      await clearCacheCommand(options);

      expect(PageCache).toHaveBeenCalledWith({
        cacheDir: './.cache/bandai',
        ttl: expect.any(Number),
        maxSize: expect.any(Number),
      });
      expect(mockCache.clear).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('bandai scraper cache cleared')
      );
    });

    it('should clear all cache including index files when --all flag is used', async () => {
      const options = { all: true };

      mockFs.readdir.mockResolvedValue([
        'bandai',
        'gundam-info',
        'dalong',
        'cache-index.json',
        'metadata.json',
      ]);

      await clearCacheCommand(options);

      // Should clear all scraper caches
      expect(PageCache).toHaveBeenCalledTimes(3);
      expect(mockCache.clear).toHaveBeenCalledTimes(3);

      // Should also clear index files
      expect(mockFs.unlink).toHaveBeenCalledWith('./.cache/cache-index.json');
      expect(mockFs.unlink).toHaveBeenCalledWith('./.cache/metadata.json');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('All cache and index files cleared')
      );
    });

    it('should clear cache older than specified days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      mockFs.readdir.mockResolvedValue([
        'cache1.json',
        'cache2.json',
        'recent-cache.json',
        'old-cache.json',
      ]);

      mockFs.stat
        .mockResolvedValueOnce({ mtime: oldDate } as any) // 10 days old
        .mockResolvedValueOnce({ mtime: oldDate } as any) // 10 days old
        .mockResolvedValueOnce({ mtime: new Date() } as any) // recent
        .mockResolvedValueOnce({ mtime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) } as any); // 6 days old

      const options = { olderThan: '7' };

      await clearCacheCommand(options);

      expect(mockFs.unlink).toHaveBeenCalledTimes(2); // Only files older than 7 days
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Cleared 2 cache files older than 7 days')
      );
    });
  });

  describe('Error handling', () => {
    it('should handle cache clear errors gracefully', async () => {
      mockCache.clear.mockRejectedValue(new Error('Permission denied'));

      const options = {};

      await expect(clearCacheCommand(options)).rejects.toThrow('Permission denied');
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should handle non-existent scraper directory', async () => {
      const options = { scraper: 'non-existent' };

      await clearCacheCommand(options);

      expect(PageCache).toHaveBeenCalledWith({
        cacheDir: './.cache/non-existent',
      });
      // Should still attempt to clear cache
      expect(mockCache.clear).toHaveBeenCalled();
    });

    it('should handle file system errors during index file cleanup', async () => {
      mockFs.readdir.mockResolvedValue(['cache-index.json']);
      mockFs.unlink.mockRejectedValue(new Error('File not found'));

      const options = { all: true };

      await expect(clearCacheCommand(options)).rejects.toThrow('File not found');
    });

    it('should handle invalid date parsing in olderThan option', async () => {
      const options = { olderThan: 'invalid' };

      await expect(clearCacheCommand(options)).rejects.toThrow();
    });

    it('should handle permission errors when reading cache directory', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const options = { all: true };

      await expect(clearCacheCommand(options)).rejects.toThrow('Permission denied');
    });

    it('should handle stat errors when checking file ages', async () => {
      mockFs.readdir.mockResolvedValue(['cache1.json']);
      mockFs.stat.mockRejectedValue(new Error('Stat error'));

      const options = { olderThan: '1' };

      await clearCacheCommand(options);

      // Should continue with other files and not throw
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle empty cache directory', async () => {
      mockFs.readdir.mockResolvedValue([]);

      const options = { all: true };

      await clearCacheCommand(options);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('No cache files to clear')
      );
    });

    it('should handle cache directory that does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));

      const options = {};

      await clearCacheCommand(options);

      // Should still attempt to clear cache through cache instance
      expect(PageCache).toHaveBeenCalled();
    });

    it('should handle very old files (years old)', async () => {
      const veryOldDate = new Date();
      veryOldDate.setFullYear(veryOldDate.getFullYear() - 2); // 2 years ago

      mockFs.readdir.mockResolvedValue(['ancient-cache.json']);
      mockFs.stat.mockResolvedValue({ mtime: veryOldDate } as any);

      const options = { olderThan: '30' };

      await clearCacheCommand(options);

      expect(mockFs.unlink).toHaveBeenCalledWith('ancient-cache.json');
    });

    it('should handle files with exactly the threshold age', async () => {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - 5); // Exactly 5 days ago

      mockFs.readdir.mockResolvedValue(['threshold-cache.json']);
      mockFs.stat.mockResolvedValue({ mtime: thresholdDate } as any);

      const options = { olderThan: '5' };

      await clearCacheCommand(options);

      expect(mockFs.unlink).toHaveBeenCalled();
    });

    it('should handle negative days in olderThan option', async () => {
      mockFs.readdir.mockResolvedValue(['cache1.json', 'cache2.json']);

      const options = { olderThan: '-1' };

      await clearCacheCommand(options);

      // Should delete all files since negative days means "older than -1 days" = all files
      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
    });

    it('should handle zero days in olderThan option', async () => {
      mockFs.readdir.mockResolvedValue(['cache1.json']);

      const options = { olderThan: '0' };

      await clearCacheCommand(options);

      // Should delete files older than now (all files)
      expect(mockFs.unlink).toHaveBeenCalled();
    });

    it('should handle very large number of cache files', async () => {
      const manyFiles = Array(10000).fill(null).map((_, i) => `cache${i}.json`);
      mockFs.readdir.mockResolvedValue(manyFiles);
      mockFs.stat.mockResolvedValue({ mtime: new Date('2020-01-01') } as any);

      const options = { olderThan: '1' };

      const startTime = Date.now();
      await clearCacheCommand(options);
      const duration = Date.now() - startTime;

      expect(mockFs.unlink).toHaveBeenCalledTimes(10000);
      // Should complete in reasonable time even with many files
      expect(duration).toBeLessThan(10000);
    });

    it('should handle files with very long names', async () => {
      const longFileName = 'a'.repeat(250) + '.json';
      mockFs.readdir.mockResolvedValue([longFileName]);
      mockFs.stat.mockResolvedValue({ mtime: new Date('2020-01-01') } as any);

      const options = { olderThan: '1' };

      await clearCacheCommand(options);

      expect(mockFs.unlink).toHaveBeenCalledWith(longFileName);
    });

    it('should handle special characters in file names', async () => {
      const specialFiles = [
        'cache with spaces.json',
        'cache-with-dashes.json',
        'cache_with_underscores.json',
        'cache.with.dots.json',
        'cache@special#chars.json',
        'cache文件.json', // Unicode characters
      ];

      mockFs.readdir.mockResolvedValue(specialFiles);
      mockFs.stat.mockResolvedValue({ mtime: new Date('2020-01-01') } as any);

      const options = { olderThan: '1' };

      await clearCacheCommand(options);

      specialFiles.forEach(file => {
        expect(mockFs.unlink).toHaveBeenCalledWith(file);
      });
    });

    it('should handle mixed content in cache directory', async () => {
      mockFs.readdir.mockResolvedValue([
        'cache1.json',
        'subdirectory',
        'readme.txt',
        'cache2.json',
        '.hidden-file',
        'cache3.json',
      ]);

      mockFs.stat
        .mockResolvedValueOnce({ mtime: new Date('2020-01-01'), isDirectory: () => false } as any) // cache1.json
        .mockResolvedValueOnce({ mtime: new Date(), isDirectory: () => true } as any) // subdirectory
        .mockResolvedValueOnce({ mtime: new Date(), isDirectory: () => false } as any) // readme.txt
        .mockResolvedValueOnce({ mtime: new Date('2020-01-01'), isDirectory: () => false } as any) // cache2.json
        .mockResolvedValueOnce({ mtime: new Date(), isDirectory: () => false } as any) // .hidden-file
        .mockResolvedValueOnce({ mtime: new Date('2020-01-01'), isDirectory: () => false } as any); // cache3.json

      const options = { olderThan: '1' };

      await clearCacheCommand(options);

      // Should only delete JSON cache files, not directories or other files
      expect(mockFs.unlink).toHaveBeenCalledTimes(3);
      expect(mockFs.unlink).toHaveBeenCalledWith('cache1.json');
      expect(mockFs.unlink).toHaveBeenCalledWith('cache2.json');
      expect(mockFs.unlink).toHaveBeenCalledWith('cache3.json');
      expect(mockFs.unlink).not.toHaveBeenCalledWith('subdirectory');
      expect(mockFs.unlink).not.toHaveBeenCalledWith('readme.txt');
      expect(mockFs.unlink).not.toHaveBeenCalledWith('.hidden-file');
    });

    it('should handle concurrent cache clear operations', async () => {
      const options = { scraper: 'test' };

      const promises = Array(5).fill(null).map(() => clearCacheCommand(options));

      await Promise.all(promises);

      expect(mockCache.clear).toHaveBeenCalledTimes(5);
    });
  });

  describe('Multiple scraper support', () => {
    it('should handle clearing multiple scrapers sequentially', async () => {
      const options = { scraper: 'bandai' };

      await clearCacheCommand(options);

      expect(PageCache).toHaveBeenCalledWith({
        cacheDir: './.cache/bandai',
      });

      // Test different scrapers
      const scrapers = ['gundam-info', 'dalong', 'custom-scraper'];

      for (const scraper of scrapers) {
        vi.clearAllMocks();
        mockCache.clear.mockResolvedValue(undefined);

        await clearCacheCommand({ scraper });

        expect(PageCache).toHaveBeenCalledWith({
          cacheDir: `./.cache/${scraper}`,
        });
      }
    });

    it('should validate scraper names', async () => {
      const validScrapers = ['bandai', 'gundam-info', 'dalong'];
      const invalidScrapers = ['invalid', '', null, undefined];

      for (const scraper of validScrapers) {
        vi.clearAllMocks();
        mockCache.clear.mockResolvedValue(undefined);

        await clearCacheCommand({ scraper });

        expect(PageCache).toHaveBeenCalled();
      }

      for (const scraper of invalidScrapers) {
        vi.clearAllMocks();
        mockCache.clear.mockResolvedValue(undefined);

        // Should still attempt to create cache with invalid name
        await clearCacheCommand({ scraper: scraper as any });

        expect(PageCache).toHaveBeenCalled();
      }
    });
  });

  describe('Verbose output', () => {
    it('should show detailed progress information', async () => {
      mockFs.readdir.mockResolvedValue(['cache1.json', 'cache2.json']);
      mockFs.stat.mockResolvedValue({ mtime: new Date('2020-01-01') } as any);

      const options = { all: true, verbose: true };

      await clearCacheCommand(options);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Clearing cache for')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('files cleared')
      );
    });

    it('should show cache statistics before clearing', async () => {
      mockCache.getStats.mockResolvedValue({
        totalFiles: 100,
        totalSize: 50 * 1024 * 1024, // 50MB
      });

      const options = { scraper: 'bandai', verbose: true };

      await clearCacheCommand(options);

      expect(mockCache.getStats).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('100 files')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('50.00MB')
      );
    });
  });
});