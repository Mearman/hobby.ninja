/**
 * Comprehensive unit tests for scrape command
 * Tests edge cases, error scenarios, and boundary conditions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import {
  scrapeCommand,
  ScrapeCommandOptions,
  promptScraperSelection,
  promptConfiguration,
} from './scrape';
import { BandaiScraper } from '../scrapers/bandai';
import { GundamInfoScraper } from '../scrapers/gundam-info';
import { DalongScraper } from '../scrapers/dalong';
import { PageCache } from '../cache';
import { JsonExporter } from '../export/json-export';

// Mock dependencies
vi.mock('../scrapers/bandai');
vi.mock('../scrapers/gundam-info');
vi.mock('../scrapers/dalong');
vi.mock('../cache');
vi.mock('../export/json-export');
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
  },
}));

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('scrapeCommand', () => {
  let mockOptions: ScrapeCommandOptions;
  let mockCache: PageCache;
  let mockExporter: JsonExporter;
  let mockBandaiScraper: BandaiScraper;
  let mockGundamInfoScraper: GundamInfoScraper;
  let mockDalongScraper: DalongScraper;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock options
    mockOptions = {
      scrapers: 'bandai,gundam-info',
      output: './test-output',
      cache: true,
      forceRefresh: false,
      interactive: false,
      verbose: true,
      timeout: '30000',
      maxRetries: '3',
      concurrency: '2',
      perSku: true,
      index: true,
      dryRun: false,
    };

    // Mock cache
    mockCache = {
      clear: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue({
        totalFiles: 10,
        totalSize: 1024 * 1024,
      }),
    } as any;

    // Mock exporter
    mockExporter = {
      exportData: vi.fn().mockResolvedValue(undefined),
    } as any;

    // Mock scrapers
    mockBandaiScraper = {
      scrapeAllProducts: vi.fn().mockResolvedValue([
        {
          sku: 'BANDAI-001',
          name: 'RX-78-2 Gundam',
          price: '¥1,200',
          category: 'HG',
          grade: 'HG',
          series: 'Mobile Suit Gundam',
          urls: { product: 'url1', image: 'img1' },
          metadata: {
            scrapedAt: new Date().toISOString(),
            source: 'bandai-official-store',
            currency: 'JPY',
          },
        },
      ]),
    } as any;

    mockGundamInfoScraper = {
      scrapeAllPages: vi.fn().mockResolvedValue([
        {
          sku: 'GI-001',
          name: 'Gundam Info Product',
          price: '$25.00',
          category: 'MG',
          grade: 'MG',
          series: 'Gundam Series',
          urls: { product: 'url2', image: 'img2' },
          metadata: {
            scrapedAt: new Date().toISOString(),
            source: 'gundam-info',
            currency: 'USD',
          },
        },
      ]),
    } as any;

    mockDalongScraper = {
      scrapeAllPages: vi.fn().mockResolvedValue([
        {
          sku: 'DALONG-001',
          name: 'Dalong Review Item',
          price: '€20.00',
          category: 'RG',
          grade: 'RG',
          series: 'Gundam Series',
          urls: { product: 'url3', image: 'img3' },
          metadata: {
            scrapedAt: new Date().toISOString(),
            source: 'dalong',
            currency: 'EUR',
          },
        },
      ]),
    } as any;

    // Mock constructors
    (BandaiScraper as any).mockImplementation(() => mockBandaiScraper);
    (GundamInfoScraper as any).mockImplementation(() => mockGundamInfoScraper);
    (DalongScraper as any).mockImplementation(() => mockDalongScraper);
    (PageCache as any).mockImplementation(() => mockCache);
    (JsonExporter as any).mockImplementation(() => mockExporter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  describe('Basic functionality', () => {
    it('should execute scraping successfully with valid options', async () => {
      await scrapeCommand(mockOptions);

      expect(BandaiScraper).toHaveBeenCalledWith(expect.objectContaining({
        useCache: true,
        timeout: 30000,
        maxRetries: 3,
        concurrency: 2,
        cache: mockCache,
      }));
      expect(GundamInfoScraper).toHaveBeenCalled();
      expect(mockExporter.exportData).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('🚀 Starting Gunpla data scraping')
      );
    });

    it('should handle dry run mode', async () => {
      const dryRunOptions = { ...mockOptions, dryRun: true };

      await scrapeCommand(dryRunOptions);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Would scrape Bandai official store')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Would scrape Gundam.info')
      );
      expect(mockExporter.exportData).not.toHaveBeenCalled();
    });

    it('should skip export when no data is scraped', async () => {
      mockBandaiScraper.scrapeAllProducts.mockResolvedValue([]);
      mockGundamInfoScraper.scrapeAllPages.mockResolvedValue([]);

      await scrapeCommand(mockOptions);

      expect(mockExporter.exportData).not.toHaveBeenCalled();
    });

    it('should display correct summary statistics', async () => {
      await scrapeCommand(mockOptions);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('SCRAPING SUMMARY')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Total items scraped: 2')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Successful scrapers: 2/2')
      );
    });
  });

  describe('Error handling', () => {
    it('should handle invalid scraper names', async () => {
      const invalidOptions = {
        ...mockOptions,
        scrapers: 'invalid-scraper,another-invalid',
      };

      await expect(scrapeCommand(invalidOptions)).rejects.toThrow(
        'Invalid scrapers: invalid-scraper, another-invalid'
      );
    });

    it('should handle scraper errors and continue with other scrapers', async () => {
      mockBandaiScraper.scrapeAllProducts.mockRejectedValue(new Error('Network error'));

      await scrapeCommand(mockOptions);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('bandai: Network error')
      );
      expect(mockGundamInfoScraper.scrapeAllPages).toHaveBeenCalled(); // Should continue
      expect(mockExporter.exportData).toHaveBeenCalled(); // Should export successful data
    });

    it('should handle critical errors that stop all scraping', async () => {
      const criticalError = new Error('CRITICAL: Authentication failed');
      mockBandaiScraper.scrapeAllProducts.mockRejectedValue(criticalError);

      await expect(scrapeCommand(mockOptions)).rejects.toThrow('Authentication failed');
    });

    it('should handle export failures', async () => {
      mockExporter.exportData.mockRejectedValue(new Error('Export failed'));

      await expect(scrapeCommand(mockOptions)).rejects.toThrow('Export failed');
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Export failed')
      );
    });

    it('should handle cache initialization failures', async () => {
      (PageCache as any).mockImplementation(() => {
        throw new Error('Cache initialization failed');
      });

      await expect(scrapeCommand(mockOptions)).rejects.toThrow('Cache initialization failed');
    });

    it('should handle JSON parsing errors in scrapers', async () => {
      mockBandaiScraper.scrapeAllProducts.mockRejectedValue(new Error('Invalid JSON response'));

      await scrapeCommand(mockOptions);

      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockGundamInfoScraper.scrapeAllPages).toHaveBeenCalled();
    });

    it('should handle network timeout errors', async () => {
      mockBandaiScraper.scrapeAllProducts.mockRejectedValue(new Error('Request timeout'));

      await scrapeCommand(mockOptions);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Request timeout')
      );
    });
  });

  describe('Cache operations', () => {
    it('should initialize cache when enabled', async () => {
      const cachedOptions = { ...mockOptions, cache: true };

      await scrapeCommand(cachedOptions);

      expect(PageCache).toHaveBeenCalledWith({
        cacheDir: './.cache',
        ttl: 3600000,
        maxSize: 100 * 1024 * 1024,
      });
    });

    it('should clear cache when force refresh is enabled', async () => {
      const refreshOptions = { ...mockOptions, forceRefresh: true };

      await scrapeCommand(refreshOptions);

      expect(mockCache.clear).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Clearing cache')
      );
    });

    it('should skip cache initialization when disabled', async () => {
      const noCacheOptions = { ...mockOptions, cache: false };

      await scrapeCommand(noCacheOptions);

      expect(PageCache).not.toHaveBeenCalled();
      expect(BandaiScraper).toHaveBeenCalledWith(
        expect.objectContaining({ useCache: false })
      );
    });

    it('should display cache statistics in verbose mode', async () => {
      const verboseOptions = { ...mockOptions, verbose: true };

      await scrapeCommand(verboseOptions);

      expect(mockCache.getStats).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Cache statistics')
      );
    });

    it('should handle cache statistics errors', async () => {
      mockCache.getStats.mockRejectedValue(new Error('Stats error'));

      const verboseOptions = { ...mockOptions, verbose: true };

      await scrapeCommand(verboseOptions);

      expect(mockConsoleLog).not.toContain('Cache statistics');
    });
  });

  describe('Option parsing and validation', () => {
    it('should parse scraper list correctly', async () => {
      const options = {
        ...mockOptions,
        scrapers: 'bandai,gundam-info,dalong',
      };

      await scrapeCommand(options);

      expect(BandaiScraper).toHaveBeenCalled();
      expect(GundamInfoScraper).toHaveBeenCalled();
      expect(DalongScraper).toHaveBeenCalled();
    });

    it('should handle whitespace in scraper list', async () => {
      const options = {
        ...mockOptions,
        scrapers: ' bandai , gundam-info , dalong ',
      };

      await scrapeCommand(options);

      expect(BandaiScraper).toHaveBeenCalled();
      expect(GundamInfoScraper).toHaveBeenCalled();
      expect(DalongScraper).toHaveBeenCalled();
    });

    it('should parse numeric options correctly', async () => {
      const numericOptions = {
        ...mockOptions,
        timeout: '60000',
        maxRetries: '5',
        concurrency: '4',
      };

      await scrapeCommand(numericOptions);

      expect(BandaiScraper).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000,
          maxRetries: 5,
          concurrency: 4,
        })
      );
    });

    it('should handle invalid numeric options', async () => {
      const invalidOptions = {
        ...mockOptions,
        timeout: 'invalid',
        maxRetries: 'not-a-number',
        concurrency: 'NaN',
      };

      await scrapeCommand(invalidOptions);

      expect(BandaiScraper).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: NaN, // parseInt('invalid') -> NaN
          maxRetries: NaN,
          concurrency: NaN,
        })
      );
    });

    it('should handle single scraper', async () => {
      const singleOptions = {
        ...mockOptions,
        scrapers: 'bandai',
      };

      await scrapeCommand(singleOptions);

      expect(BandaiScraper).toHaveBeenCalledTimes(1);
      expect(GundamInfoScraper).not.toHaveBeenCalled();
      expect(DalongScraper).not.toHaveBeenCalled();
    });

    it('should handle duplicate scrapers', async () => {
      const duplicateOptions = {
        ...mockOptions,
        scrapers: 'bandai,bandai,gundam-info,bandai',
      };

      await scrapeCommand(duplicateOptions);

      expect(BandaiScraper).toHaveBeenCalledTimes(3); // Will process duplicates
      expect(GundamInfoScraper).toHaveBeenCalledTimes(1);
    });
  });

  describe('Export configuration', () => {
    it('should configure exporter with correct options', async () => {
      const exportOptions = {
        ...mockOptions,
        perSku: true,
        index: false,
      };

      await scrapeCommand(exportOptions);

      expect(JsonExporter).toHaveBeenCalledWith({
        outputDir: './test-output',
        perSku: true,
        generateIndex: false,
      });
    });

    it('should handle exporter configuration errors', async () => {
      (JsonExporter as any).mockImplementation(() => {
        throw new Error('Invalid export configuration');
      });

      await expect(scrapeCommand(mockOptions)).rejects.toThrow('Invalid export configuration');
    });

    it('should handle export to non-existent directory', async () => {
      const mockFs = vi.mocked(fs);
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(scrapeCommand(mockOptions)).rejects.toThrow();
    });
  });

  describe('Verbose output', () => {
    it('should show detailed progress in verbose mode', async () => {
      const verboseOptions = { ...mockOptions, verbose: true };

      await scrapeCommand(verboseOptions);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('📂 Output directory')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('🔄 Cache')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('🎯 Scrapers')
      );
    });

    it('should show per-scraper details in verbose mode', async () => {
      const verboseOptions = { ...mockOptions, verbose: true };

      await scrapeCommand(verboseOptions);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('PER-SCRAPER DETAILS')
      );
    });

    it('should show minimal output in non-verbose mode', async () => {
      const quietOptions = { ...mockOptions, verbose: false };

      await scrapeCommand(quietOptions);

      expect(mockConsoleLog).not.toContain('📂 Output directory');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('SCRAPING SUMMARY')
      );
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle empty scraper list', async () => {
      const emptyOptions = {
        ...mockOptions,
        scrapers: '',
      };

      await scrapeCommand(emptyOptions);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Total items scraped: 0')
      );
    });

    it('should handle extremely large data sets', async () => {
      const largeDataset = Array(10000).fill(null).map((_, i) => ({
        sku: `LARGE-${i.toString().padStart(4, '0')}`,
        name: `Large Product ${i}`,
        price: `¥${(i + 1) * 100}`,
        category: 'HG',
        grade: 'HG',
        series: 'Test Series',
        urls: {},
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'test',
          currency: 'JPY',
        },
      }));

      mockBandaiScraper.scrapeAllProducts.mockResolvedValue(largeDataset);

      const startTime = Date.now();
      await scrapeCommand(mockOptions);
      const duration = Date.now() - startTime;

      expect(mockExporter.exportData).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Total items scraped: 10000')
      );
      // Should complete in reasonable time
      expect(duration).toBeLessThan(10000);
    });

    it('should handle zero timeout', async () => {
      const zeroTimeoutOptions = {
        ...mockOptions,
        timeout: '0',
      };

      await scrapeCommand(zeroTimeoutOptions);

      expect(BandaiScraper).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 0 })
      );
    });

    it('should handle negative timeout', async () => {
      const negativeTimeoutOptions = {
        ...mockOptions,
        timeout: '-5000',
      };

      await scrapeCommand(negativeTimeoutOptions);

      expect(BandaiScraper).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: -5000 })
      );
    });

    it('should handle very large timeout values', async () => {
      const largeTimeoutOptions = {
        ...mockOptions,
        timeout: '999999999',
      };

      await scrapeCommand(largeTimeoutOptions);

      expect(BandaiScraper).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 999999999 })
      );
    });

    it('should handle maximum concurrency', async () => {
      const maxConcurrencyOptions = {
        ...mockOptions,
        concurrency: '100',
      };

      await scrapeCommand(maxConcurrencyOptions);

      expect(BandaiScraper).toHaveBeenCalledWith(
        expect.objectContaining({ concurrency: 100 })
      );
    });

    it('should handle zero concurrency', async () => {
      const zeroConcurrencyOptions = {
        ...mockOptions,
        concurrency: '0',
      };

      await scrapeCommand(zeroConcurrencyOptions);

      expect(BandaiScraper).toHaveBeenCalledWith(
        expect.objectContaining({ concurrency: 0 })
      );
    });

    it('should handle products with missing required fields', async () => {
      const incompleteProduct = {
        sku: '', // Empty SKU
        name: 'Incomplete Product',
        price: '¥1,000',
        category: '', // Empty category
        grade: '', // Empty grade
        series: 'Test Series',
        urls: {},
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'test',
          currency: 'JPY',
        },
      };

      mockBandaiScraper.scrapeAllProducts.mockResolvedValue([incompleteProduct]);

      await scrapeCommand(mockOptions);

      expect(mockExporter.exportData).toHaveBeenCalledWith(
        expect.arrayContaining([incompleteProduct]),
        './test-output'
      );
    });

    it('should handle malformed metadata', async () => {
      const malformedProduct = {
        sku: 'MALFORMED-001',
        name: 'Malformed Product',
        price: '¥1,000',
        category: 'Test',
        grade: 'HG',
        series: 'Test Series',
        urls: {},
        metadata: {
          // Missing required fields
          scrapedAt: new Date().toISOString(),
        },
      } as any;

      mockBandaiScraper.scrapeAllProducts.mockResolvedValue([malformedProduct]);

      await scrapeCommand(mockOptions);

      expect(mockExporter.exportData).toHaveBeenCalled();
    });

    it('should handle circular references in product data', async () => {
      const circularProduct: any = {
        sku: 'CIRCULAR-001',
        name: 'Circular Product',
        price: '¥1,000',
        category: 'Test',
        grade: 'HG',
        series: 'Test Series',
        urls: {},
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'test',
          currency: 'JPY',
        },
      };
      circularProduct.self = circularProduct;

      mockBandaiScraper.scrapeAllProducts.mockResolvedValue([circularProduct]);

      // Should not throw during processing
      await scrapeCommand(mockOptions);
    });

    it('should handle very long product names and descriptions', async () => {
      const longProduct = {
        sku: 'LONG-001',
        name: 'A'.repeat(1000),
        price: '¥1,000',
        category: 'Test',
        grade: 'HG',
        series: 'Test Series',
        description: 'B'.repeat(10000),
        urls: {},
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'test',
          currency: 'JPY',
        },
      };

      mockBandaiScraper.scrapeAllProducts.mockResolvedValue([longProduct]);

      await scrapeCommand(mockOptions);

      expect(mockExporter.exportData).toHaveBeenCalled();
    });

    it('should handle special characters in product data', async () => {
      const specialProduct = {
        sku: 'SPECIAL-001',
        name: 'ガンダム RX-78-2 ✨ 特別版 🚀',
        price: '¥1,200.50',
        category: 'HG High Grade',
        grade: 'HG',
        series: '機動戦士ガンダム',
        description: 'Test with "quotes" and \'apostrophes\' & symbols',
        urls: {},
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'テスト',
          currency: 'JPY',
        },
      };

      mockBandaiScraper.scrapeAllProducts.mockResolvedValue([specialProduct]);

      await scrapeCommand(mockOptions);

      expect(mockExporter.exportData).toHaveBeenCalled();
    });
  });

  describe('Performance and resource management', () => {
    it('should handle memory pressure scenarios', async () => {
      // Simulate memory pressure by creating many large products
      const memoryIntensiveProducts = Array(1000).fill(null).map((_, i) => ({
        sku: `MEMORY-${i}`,
        name: 'A'.repeat(10000), // 10KB name
        price: '¥1,000',
        category: 'Test',
        grade: 'HG',
        series: 'Test Series',
        description: 'B'.repeat(50000), // 50KB description
        urls: {},
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'test',
          currency: 'JPY',
        },
      }));

      mockBandaiScraper.scrapeAllProducts.mockResolvedValue(memoryIntensiveProducts);

      const startMemory = process.memoryUsage().heapUsed;
      await scrapeCommand(mockOptions);
      const endMemory = process.memoryUsage().heapUsed;

      // Memory usage should not grow excessively
      expect(endMemory - startMemory).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    });

    it('should handle rapid successive calls', async () => {
      const promises = Array(5).fill(null).map(() => scrapeCommand(mockOptions));

      await Promise.all(promises);

      expect(mockExporter.exportData).toHaveBeenCalledTimes(5);
    });
  });
});

describe('Interactive functions', () => {
  describe('promptScraperSelection', () => {
    it('should prompt for scraper selection', async () => {
      const mockInquirer = {
        prompt: vi.fn().mockResolvedValue({
          scrapers: ['bandai', 'dalong'],
        }),
      };

      vi.doMock('inquirer', () => mockInquirer);

      const result = await promptScraperSelection();

      expect(result).toEqual(['bandai', 'dalong']);
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'checkbox',
          name: 'scrapers',
          message: 'Select scrapers to run:',
        }),
      ]);
    });

    it('should handle inquirer import errors', async () => {
      vi.doMock('inquirer', () => {
        throw new Error('Module not found');
      });

      await expect(promptScraperSelection()).rejects.toThrow('Module not found');
    });
  });

  describe('promptConfiguration', () => {
    it('should prompt for configuration options', async () => {
      const mockInquirer = {
        prompt: vi.fn().mockResolvedValue({
          cache: true,
          perSku: false,
          index: true,
          concurrency: '4',
          timeout: '60000',
        }),
      };

      vi.doMock('inquirer', () => mockInquirer);

      const result = await promptConfiguration();

      expect(result).toEqual({
        cache: true,
        perSku: false,
        index: true,
        concurrency: '4',
        timeout: '60000',
      });
    });

    it('should return partial configuration when cancelled', async () => {
      const mockInquirer = {
        prompt: vi.fn().mockResolvedValue({
          cache: true,
          // User cancelled remaining questions
        }),
      };

      vi.doMock('inquirer', () => mockInquirer);

      const result = await promptConfiguration();

      expect(result.cache).toBe(true);
    });
  });
});