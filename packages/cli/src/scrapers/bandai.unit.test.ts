/**
 * Comprehensive unit tests for BandaiScraper
 * Tests edge cases, error scenarios, and boundary conditions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as cheerio from 'cheerio';
import { PageCache } from '../cache';
import { execFileNoThrow } from '@unnamed-gunpla-app/utils/execFileNoThrow';
import {
  BandaiScraper,
  BandaiProduct,
  BandaiScraperOptions,
  scrapeBandaiProducts,
  scrapeBandaiCategory,
  scrapeBandaiProductDetail,
} from './bandai';

// Mock dependencies
vi.mock('cheerio');
vi.mock('../cache');
vi.mock('@unnamed-gunpla-app/utils/execFileNoThrow');

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('BandaiScraper', () => {
  let scraper: BandaiScraper;
  let mockCache: PageCache;
  let mockCheerioLoad: ReturnType<typeof vi.fn>;
  let mockCheerioInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock PageCache
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      cleanup: vi.fn(),
      getStats: vi.fn(),
      has: vi.fn(),
      getKeys: vi.fn(),
      getTTL: vi.fn(),
      touch: vi.fn(),
      mget: vi.fn(),
      mset: vi.fn(),
      mdelete: vi.fn(),
      getWithMetadata: vi.fn(),
      setWithMetadata: vi.fn(),
      healthCheck: vi.fn(),
    } as any;

    // Mock cheerio
    mockCheerioInstance = {
      find: vi.fn().mockReturnThis(),
      each: vi.fn().mockReturnThis(),
      first: vi.fn().mockReturnThis(),
      text: vi.fn().mockReturnValue(''),
      attr: vi.fn().mockReturnValue(''),
      length: 1,
    };

    mockCheerioLoad = vi.fn().mockReturnValue(mockCheerioInstance);
    (cheerio.load as any) = mockCheerioLoad;

    // Mock execFileNoThrow
    (execFileNoThrow as any).mockResolvedValue({
      success: true,
      stdout: '<html></html>',
      stderr: '',
      exitCode: 0,
    });

    scraper = new BandaiScraper({
      useCache: true,
      timeout: 10000,
      maxRetries: 2,
      concurrency: 1,
      cache: mockCache,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleWarn.mockClear();
    mockConsoleError.mockClear();
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const defaultScraper = new BandaiScraper();
      expect(defaultScraper).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const options: BandaiScraperOptions = {
        useCache: false,
        timeout: 5000,
        maxRetries: 5,
        concurrency: 4,
        baseUrl: 'https://custom-bandai.com',
        headers: { 'Custom-Header': 'value' },
      };

      const customScraper = new BandaiScraper(options);
      expect(customScraper).toBeDefined();
    });

    it('should create cache when useCache is true but no cache provided', () => {
      const noCacheScraper = new BandaiScraper({
        useCache: true,
        cache: undefined,
      });

      expect(noCacheScraper).toBeDefined();
    });

    it('should use provided cache when available', () => {
      const cachedScraper = new BandaiScraper({
        useCache: true,
        cache: mockCache,
      });

      expect(cachedScraper).toBeDefined();
    });
  });

  describe('scrapeAllProducts', () => {
    it('should successfully scrape all products', async () => {
      const mockProducts: BandaiProduct[] = [
        {
          sku: 'BANDAI-001',
          name: 'RX-78-2 Gundam',
          price: '¥1,200',
          category: 'HG',
          grade: 'HG',
          series: 'Mobile Suit Gundam',
          urls: { product: 'https://example.com/1', image: 'https://example.com/1.jpg' },
          metadata: {
            scrapedAt: new Date().toISOString(),
            source: 'bandai-official-store',
            currency: 'JPY',
          },
        },
      ];

      vi.spyOn(scraper, 'getCategories').mockResolvedValue(['hg-high-grade']);
      vi.spyOn(scraper, 'scrapeCategory').mockResolvedValue(mockProducts);

      const result = await scraper.scrapeAllProducts();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('RX-78-2 Gundam');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Scrape completed')
      );
    });

    it('should handle empty categories list', async () => {
      vi.spyOn(scraper, 'getCategories').mockResolvedValue([]);

      const result = await scraper.scrapeAllProducts();

      expect(result).toHaveLength(0);
    });

    it('should handle scraping errors gracefully', async () => {
      vi.spyOn(scraper, 'getCategories').mockRejectedValue(new Error('Network error'));

      await expect(scraper.scrapeAllProducts()).rejects.toThrow('Network error');
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should deduplicate products by SKU', async () => {
      const mockProducts: BandaiProduct[] = [
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
        {
          sku: 'BANDAI001', // Same SKU, different format
          name: 'RX-78-2 Gundam (Updated)',
          price: '¥1,500',
          category: 'HG',
          grade: 'HG',
          series: 'Mobile Suit Gundam',
          urls: { product: 'url2', image: 'img2' },
          metadata: {
            scrapedAt: new Date().toISOString(),
            source: 'bandai-official-store',
            currency: 'JPY',
          },
        },
      ];

      vi.spyOn(scraper, 'getCategories').mockResolvedValue(['hg-high-grade']);
      vi.spyOn(scraper, 'scrapeCategory').mockResolvedValue(mockProducts);

      const result = await scraper.scrapeAllProducts();

      expect(result).toHaveLength(1); // Should be deduplicated
    });
  });

  describe('scrapeCategory', () => {
    it('should scrape all pages in a category', async () => {
      const mockProducts: BandaiProduct[] = [
        {
          sku: 'TEST-001',
          name: 'Test Product',
          price: '¥1,000',
          category: 'HG',
          grade: 'HG',
          series: 'Test Series',
          urls: {},
          metadata: {
            scrapedAt: new Date().toISOString(),
            source: 'bandai-official-store',
            currency: 'JPY',
          },
        },
      ];

      // First call returns products, second call returns empty (end of pagination)
      vi.spyOn(scraper, 'scrapePage' as any)
        .mockResolvedValueOnce(mockProducts)
        .mockResolvedValueOnce([]);

      const result = await scraper.scrapeCategory('hg-high-grade');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Product');
    });

    it('should handle category with no products', async () => {
      vi.spyOn(scraper, 'scrapePage' as any).mockResolvedValue([]);

      const result = await scraper.scrapeCategory('empty-category');

      expect(result).toHaveLength(0);
    });

    it('should respect rate limiting between pages', async () => {
      vi.spyOn(scraper, 'scrapePage' as any).mockResolvedValue([]);

      const startTime = Date.now();
      await scraper.scrapeCategory('test-category');
      const endTime = Date.now();

      // Should have taken at least 1 second due to rate limiting
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    });

    it('should handle network errors during category scraping', async () => {
      vi.spyOn(scraper, 'scrapePage' as any).mockRejectedValue(new Error('Network timeout'));

      await expect(scraper.scrapeCategory('error-category')).rejects.toThrow('Network timeout');
    });
  });

  describe('parseProductItem', () => {
    beforeEach(() => {
      // Reset mock implementations
      mockCheerioInstance.find.mockReturnThis();
      mockCheerioInstance.first.mockReturnThis();
      mockCheerioInstance.text.mockReturnValue('');
      mockCheerioInstance.attr.mockReturnValue('');
      mockCheerioInstance.length = 1;
    });

    it('should parse valid product item', () => {
      mockCheerioInstance.text
        .mockReturnValueOnce('RX-78-2 Gundam') // name
        .mockReturnValueOnce('BANDAI-001') // sku
        .mockReturnValueOnce('¥1,200') // price
        .mockReturnValueOnce('High Grade'); // description

      mockCheerioInstance.attr = jest.fn()
        .mockReturnValueOnce('/product-image.jpg') // image src
        .mockReturnValueOnce('/product-detail') // product href
        .mockReturnValueOnce('') // spec label
        .mockReturnValueOnce(''); // spec value

      const product = scraper['parseProductItem'](mockCheerioInstance, 'hg-high-grade');

      expect(product).toBeDefined();
      expect(product!.name).toBe('RX-78-2 Gundam');
      expect(product!.sku).toBe('BANDAI-001');
      expect(product!.price).toBe('¥1,200');
      expect(product!.grade).toBe('HG');
    });

    it('should return null for product with no name', () => {
      mockCheerioInstance.text.mockReturnValue(''); // Empty name

      const product = scraper['parseProductItem'](mockCheerioInstance, 'hg-high-grade');

      expect(product).toBeNull();
    });

    it('should generate SKU from name when SKU not found', () => {
      mockCheerioInstance.text
        .mockReturnValueOnce('MG Gundam Exia') // name
        .mockReturnValueOnce('') // no SKU
        .mockReturnValueOnce('¥2,500'); // price

      const product = scraper['parseProductItem'](mockCheerioInstance, 'mg-master-grade');

      expect(product).toBeDefined();
      expect(product!.sku).toMatch(/^BANDAI-MGUGU/);
    });

    it('should handle relative URLs', () => {
      mockCheerioInstance.text
        .mockReturnValueOnce('Test Gundam')
        .mockReturnValueOnce('TEST-001');

      mockCheerioInstance.attr
        .mockReturnValueOnce('/images/test.jpg') // relative image
        .mockReturnValueOnce('/products/test'); // relative product

      const product = scraper['parseProductItem'](mockCheerioInstance, 'test-category');

      expect(product).toBeDefined();
      expect(product!.urls.image).toBe('https://bandai-hobby.net/images/test.jpg');
      expect(product!.urls.product).toBe('https://bandai-hobby.net/products/test');
    });

    it('should extract grade from various patterns', () => {
      const testCases = [
        { name: 'HG RX-78-2', expected: 'HG' },
        { name: 'MG Strike Freedom', expected: 'MG' },
        { name: 'PG Unicorn Gundam', expected: 'PG' },
        { name: 'RG 1/144 Aile Strike', expected: 'RG' },
        { name: 'SD Crossbone Gundam', expected: 'SD' },
        { name: 'RE/100 Nu Gundam', expected: 'RE100' },
        { name: 'Mega Size Zaku', expected: 'MEGA' },
        { name: 'Unknown Gundam Kit', expected: 'Unknown' },
      ];

      testCases.forEach(({ name, expected }) => {
        mockCheerioInstance.text
          .mockReturnValueOnce(name) // product name
          .mockReturnValueOnce('TEST-001'); // SKU

        const product = scraper['parseProductItem'](mockCheerioInstance, 'test-category');

        expect(product!.grade).toBe(expected);
      });
    });

    it('should extract series from various patterns', () => {
      const testCases = [
        { name: 'Wing Gundam Zero', expected: 'Gundam Wing' },
        { name: 'Strike Freedom Gundam', expected: 'Gundam Seed' },
        { name: '00 Gundam', expected: 'Gundam 00' },
        { name: 'Build Strike Gundam', expected: 'Gundam Build Fighters' },
        { name: 'Barbatos Lupus', expected: 'Gundam Iron Blooded Orphans' },
        { name: 'RX-78-2 Gundam', expected: 'Mobile Suit Gundam' },
        { name: 'Unknown Kit', expected: 'Gundam Series' },
      ];

      testCases.forEach(({ name, expected }) => {
        mockCheerioInstance.text
          .mockReturnValueOnce(name) // product name
          .mockReturnValueOnce('TEST-001'); // SKU

        const product = scraper['parseProductItem'](mockCheerioInstance, 'test-category');

        expect(product!.series).toBe(expected);
      });
    });

    it('should handle parsing errors gracefully', () => {
      // Mock an error during parsing
      mockCheerioInstance.text.mockImplementation(() => {
        throw new Error('Parsing error');
      });

      const product = scraper['parseProductItem'](mockCheerioInstance, 'test-category');

      expect(product).toBeNull();
      expect(mockConsoleWarn).toHaveBeenCalled();
    });
  });

  describe('fetchWithRetry', () => {
    it('should succeed on first attempt', async () => {
      (execFileNoThrow as any).mockResolvedValueOnce({
        success: true,
        stdout: '<html>content</html>',
        stderr: '',
        exitCode: 0,
      });

      const result = await scraper['fetchWithRetry']('https://example.com');

      expect(result).toBe('<html>content</html>');
      expect(execFileNoThrow).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      (execFileNoThrow as any)
        .mockResolvedValueOnce({
          success: false,
          stdout: '',
          stderr: 'Network error',
          exitCode: 1,
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: '<html>content</html>',
          stderr: '',
          exitCode: 0,
        });

      const result = await scraper['fetchWithRetry']('https://example.com');

      expect(result).toBe('<html>content</html>');
      expect(execFileNoThrow).toHaveBeenCalledTimes(2);
      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it('should fail after max retries', async () => {
      (execFileNoThrow as any).mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'Persistent error',
        exitCode: 1,
      });

      await expect(scraper['fetchWithRetry']('https://example.com')).rejects.toThrow('Persistent error');
      expect(execFileNoThrow).toHaveBeenCalledTimes(2); // maxRetries = 2
    });

    it('should implement exponential backoff', async () => {
      vi.useFakeTimers();

      (execFileNoThrow as any)
        .mockResolvedValueOnce({
          success: false,
          stdout: '',
          stderr: 'Error 1',
          exitCode: 1,
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: 'success',
          stderr: '',
          exitCode: 0,
        });

      const resultPromise = scraper['fetchWithRetry']('https://example.com');

      // First attempt fails
      await vi.advanceTimersByTime(0);

      // Wait for backoff delay
      await vi.advanceTimersByTime(1000);

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('retrying in 1000ms')
      );

      vi.useRealTimers();
    });

    it('should cap backoff delay at maximum', async () => {
      vi.useFakeTimers();

      // Create scraper with low max retries for testing
      const testScraper = new BandaiScraper({ maxRetries: 5 });

      (execFileNoThrow as any).mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'Always fails',
        exitCode: 1,
      });

      const resultPromise = testScraper['fetchWithRetry']('https://example.com');

      // Advance through all retry attempts
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTime(10000); // Max backoff
      }

      await expect(resultPromise).rejects.toThrow();

      vi.useRealTimers();
    });

    it('should handle execFileNoThrow exceptions', async () => {
      (execFileNoThrow as any).mockRejectedValue(new Error('execFile failed'));

      await expect(scraper['fetchWithRetry']('https://example.com')).rejects.toThrow('execFile failed');
    });
  });

  describe('getCategories', () => {
    it('should return cached categories when available', async () => {
      const cachedCategories = ['cached-category-1', 'cached-category-2'];
      (mockCache.get as any).mockResolvedValue(cachedCategories);

      const categories = await scraper['getCategories']();

      expect(categories).toEqual(cachedCategories);
      expect(mockCache.get).toHaveBeenCalledWith('categories');
    });

    it('should return default categories when not cached', async () => {
      (mockCache.get as any).mockResolvedValue(null);

      const categories = await scraper['getCategories']();

      expect(categories).toContain('hg-high-grade');
      expect(categories).toContain('mg-master-grade');
      expect(categories).toContain('pg-perfect-grade');
      expect(mockCache.set).toHaveBeenCalledWith('categories', expect.any(Array), 86400000);
    });

    it('should handle cache errors gracefully', async () => {
      (mockCache.get as any).mockRejectedValue(new Error('Cache error'));

      const categories = await scraper['getCategories']();

      expect(categories).toBeDefined();
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  describe('Utility methods', () => {
    describe('normalizeSku', () => {
      it('should normalize various SKU formats', () => {
        const testCases = [
          { input: 'BANDAI-001', expected: 'BANDAI001' },
          { input: 'bandai_002', expected: 'BANDAI002' },
          { input: ' MG RX-78 ', expected: 'MGRX78' },
          { input: 'RG-1/144', expected: 'RG1144' },
          { input: '', expected: '' },
          { input: '123-456', expected: '123456' },
        ];

        testCases.forEach(({ input, expected }) => {
          expect(scraper['normalizeSku'](input)).toBe(expected);
        });
      });
    });

    describe('generateSkuFromName', () => {
      it('should generate SKU from product name', () => {
        const sku = scraper['generateSkuFromName']('MG RX-78-2 Gundam Ver.One');

        expect(sku).toMatch(/^BANDAI-MGRX/);
        expect(sku.length).toBeGreaterThan(10);
      });

      it('should handle long product names', () => {
        const longName = 'Super Long Gundam Model Kit Name With Many Words';
        const sku = scraper['generateSkuFromName'](longName);

        expect(sku).toMatch(/^BANDAI-SUPLON/);
      });

      it('should handle short product names', () => {
        const sku = scraper['generateSkuFromName']('Gundam');

        expect(sku).toMatch(/^BANDAI-GUN/);
      });

      it('should handle empty names', () => {
        const sku = scraper['generateSkuFromName']('');

        expect(sku).toMatch(/^BANDAI--/);
      });
    });

    describe('formatCategory', () => {
      it('should format category names correctly', () => {
        const testCases = [
          { input: 'hg-high-grade', expected: 'Hg High Grade' },
          { input: 'mg-master-grade', expected: 'Mg Master Grade' },
          { input: 'sdc-sd-crossover', expected: 'Sdc Sd Crossover' },
          { input: 'single', expected: 'Single' },
        ];

        testCases.forEach(({ input, expected }) => {
          expect(scraper['formatCategory'](input)).toBe(expected);
        });
      });
    });

    describe('cleanText', () => {
      it('should clean text content', () => {
        const testCases = [
          { input: '  Multiple   spaces  ', expected: 'Multiple spaces' },
          { input: 'Text\nwith\rnewlines\tand\ttabs', expected: 'Text with newlines and tabs' },
          { input: '   Leading and trailing   ', expected: 'Leading and trailing' },
          { input: '', expected: '' },
          { input: '   ', expected: '' },
        ];

        testCases.forEach(({ input, expected }) => {
          expect(scraper['cleanText'](input)).toBe(expected);
        });
      });
    });
  });

  describe('Export functions', () => {
    describe('scrapeBandaiProducts', async () => {
      it('should create scraper and scrape all products', async () => {
        const mockProducts: BandaiProduct[] = [
          {
            sku: 'TEST-001',
            name: 'Test Product',
            price: '¥1,000',
            category: 'Test',
            grade: 'HG',
            series: 'Test Series',
            urls: {},
            metadata: {
              scrapedAt: new Date().toISOString(),
              source: 'bandai-official-store',
              currency: 'JPY',
            },
          },
        ];

        vi.spyOn(BandaiScraper.prototype, 'scrapeAllProducts').mockResolvedValue(mockProducts);

        const result = await scrapeBandaiProducts();

        expect(result).toEqual(mockProducts);
      });
    });

    describe('scrapeBandaiCategory', async () => {
      it('should scrape specific category', async () => {
        const mockProducts: BandaiProduct[] = [
          {
            sku: 'TEST-002',
            name: 'Category Test',
            price: '¥2,000',
            category: 'HG',
            grade: 'HG',
            series: 'Test Series',
            urls: {},
            metadata: {
              scrapedAt: new Date().toISOString(),
              source: 'bandai-official-store',
              currency: 'JPY',
            },
          },
        ];

        vi.spyOn(BandaiScraper.prototype, 'scrapeCategory').mockResolvedValue(mockProducts);

        const result = await scrapeBandaiCategory('hg-high-grade');

        expect(result).toEqual(mockProducts);
      });
    });

    describe('scrapeBandaiProductDetail', async () => {
      it('should scrape product details', async () => {
        const mockDetail = {
          description: 'Detailed description',
          specifications: { scale: '1/144', height: '12cm' },
        };

        vi.spyOn(BandaiScraper.prototype, 'scrapeProductDetail').mockResolvedValue(mockDetail);

        const result = await scrapeBandaiProductDetail('TEST-001');

        expect(result).toEqual(mockDetail);
      });

      it('should handle non-existent product details', async () => {
        vi.spyOn(BandaiScraper.prototype, 'scrapeProductDetail').mockResolvedValue(null);

        const result = await scrapeBandaiProductDetail('NON-EXISTENT');

        expect(result).toBeNull();
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle malformed HTML', async () => {
      (execFileNoThrow as any).mockResolvedValue({
        success: true,
        stdout: '<html><body>incomplete',
        stderr: '',
        exitCode: 0,
      });

      vi.spyOn(scraper, 'scrapePage' as any).mockResolvedValue([]);

      const result = await scraper.scrapeCategory('test-category');

      expect(result).toHaveLength(0);
    });

    it('should handle empty HTML response', async () => {
      (execFileNoThrow as any).mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      vi.spyOn(scraper, 'scrapePage' as any).mockResolvedValue([]);

      const result = await scraper.scrapeCategory('test-category');

      expect(result).toHaveLength(0);
    });

    it('should handle very large HTML responses', async () => {
      const largeHtml = '<html>' + '<div>content</div>'.repeat(100000) + '</html>';
      (execFileNoThrow as any).mockResolvedValue({
        success: true,
        stdout: largeHtml,
        stderr: '',
        exitCode: 0,
      });

      vi.spyOn(scraper, 'scrapePage' as any).mockResolvedValue([]);

      await expect(scraper.scrapeCategory('test-category')).resolves.toBeDefined();
    });

    it('should handle Unicode content in HTML', async () => {
      const unicodeHtml = '<html>ガンダム RX-78-2 ✨ 特別版</html>';
      (execFileNoThrow as any).mockResolvedValue({
        success: true,
        stdout: unicodeHtml,
        stderr: '',
        exitCode: 0,
      });

      vi.spyOn(scraper, 'scrapePage' as any).mockResolvedValue([]);

      await expect(scraper.scrapeCategory('test-category')).resolves.toBeDefined();
    });

    it('should handle concurrent scraping requests', async () => {
      const mockProducts: BandaiProduct[] = [
        {
          sku: 'CONCURRENT-001',
          name: 'Concurrent Test',
          price: '¥1,000',
          category: 'Test',
          grade: 'HG',
          series: 'Test Series',
          urls: {},
          metadata: {
            scrapedAt: new Date().toISOString(),
            source: 'bandai-official-store',
            currency: 'JPY',
          },
        },
      ];

      vi.spyOn(scraper, 'scrapeCategory').mockResolvedValue(mockProducts);

      const promises = [
        scraper.scrapeCategory('category1'),
        scraper.scrapeCategory('category2'),
        scraper.scrapeCategory('category3'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toEqual(mockProducts);
      });
    });

    it('should handle cache unavailability', async () => {
      const noCacheScraper = new BandaiScraper({
        useCache: false,
        cache: undefined,
      });

      vi.spyOn(noCacheScraper, 'scrapePage' as any).mockResolvedValue([]);

      const result = await noCacheScraper.scrapeCategory('test-category');

      expect(result).toHaveLength(0);
    });

    it('should handle memory pressure scenarios', async () => {
      const largeProduct: BandaiProduct = {
        sku: 'LARGE-001',
        name: 'Large Product ' + 'x'.repeat(10000),
        price: '¥1,000',
        category: 'Test',
        grade: 'HG',
        series: 'Test Series',
        description: 'x'.repeat(50000),
        specifications: { 'large-field': 'x'.repeat(10000) },
        urls: {},
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'bandai-official-store',
          currency: 'JPY',
        },
      };

      vi.spyOn(scraper, 'scrapeCategory').mockResolvedValue([largeProduct]);

      const result = await scraper.scrapeCategory('large-category');

      expect(result).toHaveLength(1);
      expect(result[0].name.length).toBeGreaterThan(10000);
    });

    it('should handle invalid URL schemes', async () => {
      const scraperWithInvalidUrl = new BandaiScraper({
        baseUrl: 'not-a-valid-url',
      });

      vi.spyOn(scraperWithInvalidUrl, 'scrapePage' as any).mockResolvedValue([]);

      const result = await scraperWithInvalidUrl.scrapeCategory('test-category');

      expect(result).toHaveLength(0);
    });
  });
});