/**
 * Comprehensive unit tests for JsonExporter
 * Tests edge cases, error scenarios, and boundary conditions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import {
  JsonExporter,
  JsonExporterOptions,
  createJsonExporter,
} from './json-export';

// Mock fs promises
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}));

// Mock path
vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
}));

describe('JsonExporter', () => {
  let exporter: JsonExporter;
  let mockFs: typeof fs;
  let mockPath: typeof path;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFs = vi.mocked(fs);
    mockPath = vi.mocked(path);

    // Default successful mock implementations
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{}');
    mockFs.readdir.mockResolvedValue([]);
    mockFs.stat.mockResolvedValue({
      size: 1024,
      isFile: () => true,
      isDirectory: () => false,
    } as any);

    mockPath.join.mockImplementation((...args) => args.join('/'));

    exporter = new JsonExporter({
      outputDir: '/test/output',
      perSku: true,
      generateIndex: true,
      prettyPrint: true,
      compression: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const defaultExporter = new JsonExporter({
        outputDir: '/test',
      });

      expect(defaultExporter).toBeDefined();
    });

    it('should merge provided options with defaults', () => {
      const options: JsonExporterOptions = {
        outputDir: '/custom',
        perSku: false,
        generateIndex: false,
        prettyPrint: false,
        compression: true,
      };

      const customExporter = new JsonExporter(options);

      expect(customExporter).toBeDefined();
    });
  });

  describe('exportData', () => {
    const mockData = [
      {
        sku: 'TEST-001',
        name: 'RX-78-2 Gundam',
        price: '¥1,200',
        category: 'HG',
        grade: 'HG',
        series: 'Mobile Suit Gundam',
        imageUrl: 'https://example.com/image.jpg',
        urls: { product: 'https://example.com/product' },
        metadata: {
          scrapedAt: '2023-01-01T00:00:00.000Z',
          source: 'test-source',
        },
      },
      {
        sku: 'TEST-002',
        name: 'MS-06S Zaku',
        price: '¥900',
        category: 'MG',
        grade: 'MG',
        series: 'Mobile Suit Gundam',
        imageUrl: 'https://example.com/zaku.jpg',
        urls: { product: 'https://example.com/zaku' },
        metadata: {
          scrapedAt: '2023-01-01T01:00:00.000Z',
          source: 'test-source',
        },
      },
    ];

    it('should export data successfully', async () => {
      await exporter.exportData(mockData);

      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/output', { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/output/products.json',
        expect.any(String),
        'utf8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/output/index.json',
        expect.any(String),
        'utf8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/output/statistics.json',
        expect.any(String),
        'utf8'
      );
    });

    it('should create per-SKU files when enabled', async () => {
      await exporter.exportData(mockData);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/output/sku/TEST001.json',
        expect.any(String),
        'utf8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/output/sku/TEST002.json',
        expect.any(String),
        'utf8'
      );
    });

    it('should skip per-SKU files when disabled', async () => {
      const noPerSkuExporter = new JsonExporter({
        outputDir: '/test/output',
        perSku: false,
      });

      await noPerSkuExporter.exportData(mockData);

      expect(mockFs.writeFile).not.toHaveBeenCalledWith(
        expect.stringContaining('/sku/'),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should skip index generation when disabled', async () => {
      const noIndexExporter = new JsonExporter({
        outputDir: '/test/output',
        generateIndex: false,
      });

      await noIndexExporter.exportData(mockData);

      expect(mockFs.writeFile).not.toHaveBeenCalledWith(
        '/test/output/index.json',
        expect.any(String),
        expect.any(String)
      );
    });

    it('should use compact JSON when prettyPrint is disabled', async () => {
      const compactExporter = new JsonExporter({
        outputDir: '/test/output',
        prettyPrint: false,
      });

      await compactExporter.exportData(mockData);

      const writeCall = mockFs.writeFile.mock.calls.find(call => call[0] === '/test/output/products.json');
      const jsonOutput = writeCall![1] as string;

      expect(jsonOutput).not.toContain('\n');
      expect(jsonOutput).not.toContain('  ');
    });

    it('should handle empty data array', async () => {
      await exporter.exportData([]);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/output/products.json',
        expect.stringContaining('"items":[]'),
        'utf8'
      );
    });

    it('should handle missing output directory', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));

      await exporter.exportData(mockData);

      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/output', { recursive: true });
    });

    it('should handle file system errors during export', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      await expect(exporter.exportData(mockData)).rejects.toThrow('Permission denied');
    });

    it('should normalize and deduplicate data', async () => {
      const duplicateData = [
        { sku: 'TEST-001', name: 'Gundam' },
        { sku: 'test-001', name: 'Gundam Updated' }, // Same SKU, different case
        { sku: 'TEST-002', name: 'Zaku' },
      ];

      await exporter.exportData(duplicateData);

      const writeCall = mockFs.writeFile.mock.calls.find(call => call[0] === '/test/output/products.json');
      const jsonOutput = JSON.parse(writeCall![1] as string);

      expect(jsonOutput.items).toHaveLength(2); // Should be deduplicated
    });

    it('should generate products without SKU when missing', async () => {
      const noSkuData = [
        {
          name: 'Gundam Without SKU',
          category: 'Test',
          metadata: { source: 'test' },
        },
      ];

      await exporter.exportData(noSkuData);

      const writeCall = mockFs.writeFile.mock.calls.find(call => call[0] === '/test/output/products.json');
      const jsonOutput = JSON.parse(writeCall![1] as string);

      expect(jsonOutput.items[0].sku).toMatch(/^TEST-/); // Should generate SKU
    });

    it('should handle data without names', async () => {
      const noNameData = [
        {
          sku: 'TEST-001',
          category: 'Test',
          metadata: { source: 'test' },
        },
      ];

      await exporter.exportData(noNameData);

      const writeCall = mockFs.writeFile.mock.calls.find(call => call[0] === '/test/output/products.json');
      const jsonOutput = JSON.parse(writeCall![1] as string);

      expect(jsonOutput.items[0].name).toBe('Unknown Product');
    });
  });

  describe('Data normalization', () => {
    it('should normalize price strings', async () => {
      const data = [
        {
          sku: 'TEST-001',
          name: 'Test',
          price: '  ¥1,200  ',
          category: 'Test',
        },
      ];

      await exporter.exportData(data);

      const writeCall = mockFs.writeFile.mock.calls.find(call => call[0] === '/test/output/products.json');
      const jsonOutput = JSON.parse(writeCall![1] as string);

      expect(jsonOutput.items[0].price).toBe('¥1,200');
    });

    it('should normalize URLs correctly', async () => {
      const data = [
        {
          sku: 'TEST-001',
          name: 'Test',
          category: 'Test',
          productUrl: 'https://example.com/product',
          imageUrl: '/relative/image.jpg',
        },
      ];

      await exporter.exportData(data);

      const writeCall = mockFs.writeFile.mock.calls.find(call => call[0] === '/test/output/products.json');
      const jsonOutput = JSON.parse(writeCall![1] as string);

      expect(jsonOutput.items[0].urls.product).toBe('https://example.com/product');
      expect(jsonOutput.items[0].urls.image).toBe('/relative/image.jpg');
    });

    it('should ensure metadata exists', async () => {
      const data = [
        {
          sku: 'TEST-001',
          name: 'Test',
          category: 'Test',
        },
      ];

      await exporter.exportData(data);

      const writeCall = mockFs.writeFile.mock.calls.find(call => call[0] === '/test/output/products.json');
      const jsonOutput = JSON.parse(writeCall![1] as string);

      expect(jsonOutput.items[0].metadata).toBeDefined();
      expect(jsonOutput.items[0].metadata.scrapedAt).toBeDefined();
    });
  });

  describe('Data deduplication', () => {
    it('should merge duplicate items with complete data', async () => {
      const duplicateData = [
        {
          sku: 'TEST-001',
          name: 'Gundam',
          price: '¥1,000',
          metadata: { source: 'source1' },
        },
        {
          sku: 'test-001',
          name: 'Gundam RX-78-2',
          description: 'Detailed description',
          imageUrl: 'https://example.com/image.jpg',
          metadata: { source: 'source2', scrapedAt: '2023-01-01T00:00:00.000Z' },
        },
      ];

      await exporter.exportData(duplicateData);

      const writeCall = mockFs.writeFile.mock.calls.find(call => call[0] === '/test/output/products.json');
      const jsonOutput = JSON.parse(writeCall![1] as string);

      expect(jsonOutput.items).toHaveLength(1);
      const merged = jsonOutput.items[0];
      expect(merged.name).toBe('Gundam RX-78-2'); // Should use more complete name
      expect(merged.price).toBe('¥1,000'); // Should keep price
      expect(merged.description).toBe('Detailed description'); // Should add description
      expect(merged.imageUrl).toBe('https://example.com/image.jpg'); // Should add image
    });

    it('should handle different SKU normalization cases', async () => {
      const testCases = [
        { sku: 'TEST-001', name: 'Test 1' },
        { sku: 'test-001', name: 'Test 1b' },
        { sku: 'TEST_001', name: 'Test 1c' },
        { sku: 'test001', name: 'Test 1d' },
        { sku: ' TEST-001 ', name: 'Test 1e' },
      ];

      await exporter.exportData(testCases);

      const writeCall = mockFs.writeFile.mock.calls.find(call => call[0] === '/test/output/products.json');
      const jsonOutput = JSON.parse(writeCall![1] as string);

      expect(jsonOutput.items).toHaveLength(1); // All should be deduplicated to one item
    });
  });

  describe('Index generation', () => {
    it('should generate correct index structure', async () => {
      const data = [
        {
          sku: 'TEST-001',
          name: 'Gundam',
          category: 'HG',
          grade: 'HG',
          series: 'Mobile Suit Gundam',
          price: '¥1,200',
          imageUrl: 'https://example.com/gundam.jpg',
          metadata: { source: 'test' },
        },
      ];

      await exporter.exportData(data);

      const writeCall = mockFs.writeFile.mock.calls.find(call => call[0] === '/test/output/index.json');
      const indexOutput = JSON.parse(writeCall![1] as string);

      expect(indexOutput.items).toHaveLength(1);
      expect(indexOutput.items[0]).toEqual({
        sku: 'TEST-001',
        name: 'Gundam',
        grade: 'HG',
        series: 'Mobile Suit Gundam',
        category: 'HG',
        price: '¥1,200',
        imageUrl: 'https://example.com/gundam.jpg',
        source: 'test',
      });

      expect(indexOutput.categories).toEqual({ 'HG': 1 });
      expect(indexOutput.grades).toEqual({ 'HG': 1 });
      expect(indexOutput.series).toEqual({ 'Mobile Suit Gundam': 1 });
      expect(indexOutput.metadata).toBeDefined();
    });

    it('should count categories, grades, and series correctly', async () => {
      const data = [
        { sku: 'TEST-001', name: 'Gundam 1', category: 'HG', grade: 'HG', series: 'UC' },
        { sku: 'TEST-002', name: 'Gundam 2', category: 'HG', grade: 'HG', series: 'UC' },
        { sku: 'TEST-003', name: 'Zaku', category: 'MG', grade: 'MG', series: 'UC' },
        { sku: 'TEST-004', name: 'Wing', category: 'HG', grade: 'HG', series: 'Wing' },
        { sku: 'TEST-005', name: 'No Grade' }, // Missing grade
      ];

      await exporter.exportData(data);

      const writeCall = mockFs.writeFile.mock.calls.find(call => call[0] === '/test/output/index.json');
      const indexOutput = JSON.parse(writeCall![1] as string);

      expect(indexOutput.categories).toEqual({
        'HG': 3,
        'MG': 1,
        'Unknown': 1,
      });

      expect(indexOutput.grades).toEqual({
        'HG': 3,
        'MG': 1,
        'Unknown': 1,
      });

      expect(indexOutput.series).toEqual({
        'UC': 3,
        'Wing': 1,
        'Gundam Series': 1,
      });
    });
  });

  describe('Statistics generation', () => {
    it('should generate comprehensive statistics', async () => {
      const data = [
        {
          sku: 'TEST-001',
          name: 'Gundam',
          category: 'HG',
          grade: 'HG',
          series: 'UC',
          price: '¥1,200',
          description: 'Test description',
          specifications: { scale: '1/144' },
          imageUrl: 'https://example.com/image.jpg',
        },
        {
          sku: 'TEST-002',
          name: 'Zaku',
          category: 'HG',
          grade: 'HG',
          specifications: { scale: '1/100' },
        },
      ];

      await exporter.exportData(data);

      const writeCall = mockFs.writeFile.mock.calls.find(call => call[0] === '/test/output/statistics.json');
      const statsOutput = JSON.parse(writeCall![1] as string);

      expect(statsOutput.overview.totalProducts).toBe(2);
      expect(statsOutput.overview.sources).toContain('unknown');
      expect(statsOutput.categories).toBeDefined();
      expect(statsOutput.grades).toBeDefined();
      expect(statsOutput.series).toBeDefined();
      expect(statsOutput.priceRanges).toBeDefined();
      expect(statsOutput.completeness).toBeDefined();
    });

    it('should calculate price statistics correctly', async () => {
      const data = [
        { sku: 'TEST-001', name: 'Gundam', price: '$1,000.00' },
        { sku: 'TEST-002', name: 'Zaku', price: '$500.00' },
        { sku: 'TEST-003', name: 'Wing', price: '¥3,000' }, // Different currency
        { sku: 'TEST-004', name: 'Strike', price: 'invalid price' }, // Invalid price
        { sku: 'TEST-005', name: 'No Price' }, // No price
      ];

      await exporter.exportData(data);

      const writeCall = mockFs.writeFile.mock.calls.find(call => call[0] === '/test/output/statistics.json');
      const statsOutput = JSON.parse(writeCall![1] as string);

      expect(statsOutput.priceRanges.count).toBe(3); // Only valid numeric prices
      expect(statsOutput.priceRanges.min).toBe(500);
      expect(statsOutput.priceRanges.max).toBe(1000);
    });

    it('should calculate completeness statistics', async () => {
      const data = [
        {
          sku: 'TEST-001',
          name: 'Complete',
          description: 'Has description',
          grade: 'HG',
          series: 'UC',
          imageUrl: 'https://example.com/image.jpg',
          urls: { image: 'url' },
          specifications: { scale: '1/144' },
        },
        {
          sku: 'TEST-002',
          name: 'Partial',
          description: 'Has description',
          grade: 'HG',
          series: 'UC',
        },
        {
          sku: 'TEST-003',
          name: 'Minimal',
        },
      ];

      await exporter.exportData(data);

      const writeCall = mockFs.writeFile.mock.calls.find(call => call[0] === '/test/output/statistics.json');
      const statsOutput = JSON.parse(writeCall![1] as string);

      expect(statsOutput.completeness.complete).toBe(1);
      expect(statsOutput.completeness.partial).toBe(1);
      expect(statsOutput.completeness.minimal).toBe(1);
      expect(statsOutput.completeness.total).toBe(3);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle circular references in data', async () => {
      const circularData: any = [
        {
          sku: 'TEST-001',
          name: 'Circular',
          category: 'Test',
        },
      ];
      circularData[0].self = circularData[0];

      // Should not throw during JSON serialization
      await expect(exporter.exportData(circularData)).rejects.toThrow();
    });

    it('should handle very large datasets', async () => {
      const largeData = Array(10000).fill(null).map((_, i) => ({
        sku: `LARGE-${i.toString().padStart(4, '0')}`,
        name: `Product ${i}`,
        category: 'Test',
        grade: 'HG',
        series: 'Test Series',
        metadata: { source: 'test' },
      }));

      const startTime = Date.now();
      await exporter.exportData(largeData);
      const duration = Date.now() - startTime;

      expect(mockFs.writeFile).toHaveBeenCalled();
      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000);
    });

    it('should handle extremely long strings', async () => {
      const longData = [
        {
          sku: 'LONG-001',
          name: 'A'.repeat(10000),
          description: 'B'.repeat(100000),
          category: 'Test',
          metadata: { source: 'C'.repeat(5000) },
        },
      ];

      await exporter.exportData(longData);

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle special Unicode characters', async () => {
      const unicodeData = [
        {
          sku: 'UNICODE-001',
          name: 'ガンダム RX-78-2 ✨ 特別版 🚀',
          category: 'HG 高グレード',
          description: '🇯🇵 日本のアニメ作品',
          metadata: { source: 'テスト' },
        },
      ];

      await exporter.exportData(unicodeData);

      const writeCall = mockFs.writeFile.mock.calls.find(call => call[0] === '/test/output/products.json');
      const jsonOutput = writeCall![1] as string;

      expect(jsonOutput).toContain('ガンダム');
      expect(jsonOutput).toContain('✨');
      expect(jsonOutput).toContain('🚀');
    });

    it('should handle null and undefined values', async () => {
      const nullData = [
        {
          sku: 'NULL-001',
          name: null,
          description: undefined,
          category: '',
          grade: null,
          series: undefined,
          price: '',
          urls: null,
          metadata: null,
        },
      ];

      await exporter.exportData(nullData);

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle deeply nested objects', async () => {
      const deepData = [
        {
          sku: 'DEEP-001',
          name: 'Deep Object',
          category: 'Test',
          metadata: {
            nested: {
              deeply: {
                very: {
                  deep: {
                    value: 'test',
                    array: [1, 2, { nested: 'value' }],
                  },
                },
              },
            },
          },
        },
      ];

      await exporter.exportData(deepData);

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle arrays in unexpected places', async () => {
      const arrayData = [
        {
          sku: 'ARRAY-001',
          name: ['Array', 'name'],
          category: ['Array', 'category'],
          price: ['¥1,200'],
          metadata: { source: ['Array', 'source'] },
        },
      ];

      await exporter.exportData(arrayData);

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle numeric values as strings', async () => {
      const numericData = [
        {
          sku: 'NUM-001',
          name: 'Numeric Test',
          price: '1234.56',
          category: 'Test',
          grade: '123',
          metadata: { source: '456' },
        },
      ];

      await exporter.exportData(numericData);

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle boolean values', async () => {
      const booleanData = [
        {
          sku: 'BOOL-001',
          name: 'Boolean Test',
          category: true,
          grade: false,
          metadata: { source: true },
        },
      ];

      await exporter.exportData(booleanData);

      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('validateExport method', () => {
    it('should validate successful export', async () => {
      mockFs.readdir.mockResolvedValue(['products.json', 'index.json', 'statistics.json']);
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        items: [],
        metadata: { exportedAt: '2023-01-01T00:00:00.000Z' },
      }));

      const result = await exporter.validateExport();

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing required files', async () => {
      mockFs.readdir.mockResolvedValue(['products.json']); // Missing index.json and statistics.json

      const result = await exporter.validateExport();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing required file: index.json');
      expect(result.issues).toContain('Missing required file: statistics.json');
    });

    it('should detect invalid JSON structure', async () => {
      mockFs.readdir.mockResolvedValue(['products.json', 'index.json', 'statistics.json']);
      mockFs.readFile.mockResolvedValue('invalid json');

      const result = await exporter.validateExport();

      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => issue.includes('invalid JSON'))).toBe(true);
    });

    it('should detect missing items array', async () => {
      mockFs.readdir.mockResolvedValue(['products.json', 'index.json', 'statistics.json']);
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        metadata: { exportedAt: '2023-01-01T00:00:00.000Z' },
        // Missing items array
      }));

      const result = await exporter.validateExport();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('products.json has invalid structure');
    });

    it('should detect missing metadata', async () => {
      mockFs.readdir.mockResolvedValue(['products.json', 'index.json', 'statistics.json']);
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        items: [],
        // Missing metadata
      }));

      const result = await exporter.validateExport();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('products.json missing metadata');
    });

    it('should handle directory access errors', async () => {
      mockFs.access.mockRejectedValue(new Error('Permission denied'));

      const result = await exporter.validateExport();

      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => issue.includes('Cannot access output directory'))).toBe(true);
    });
  });

  describe('getExportSize method', () => {
    it('should calculate total export size', async () => {
      mockFs.readdir.mockResolvedValue(['products.json', 'index.json', 'statistics.json']);
      mockFs.stat
        .mockResolvedValueOnce({ size: 1024 } as any)
        .mockResolvedValueOnce({ size: 512 } as any)
        .mockResolvedValueOnce({ size: 256 } as any);

      const size = await exporter.getExportSize();

      expect(size).toBe(1792); // 1024 + 512 + 256
    });

    it('should ignore directories in size calculation', async () => {
      mockFs.readdir.mockResolvedValue(['products.json', 'sku', 'index.json']);
      mockFs.stat
        .mockResolvedValueOnce({ size: 1024, isFile: () => true } as any)
        .mockResolvedValueOnce({ size: 0, isFile: () => false } as any) // Directory
        .mockResolvedValueOnce({ size: 512, isFile: () => true } as any);

      const size = await exporter.getExportSize();

      expect(size).toBe(1536); // Only files counted
    });

    it('should handle inaccessible files', async () => {
      mockFs.readdir.mockResolvedValue(['products.json', 'corrupted.json']);
      mockFs.stat
        .mockResolvedValueOnce({ size: 1024 } as any)
        .mockRejectedValueOnce(new Error('File not found'));

      const size = await exporter.getExportSize();

      expect(size).toBe(1024); // Only accessible files counted
    });

    it('should handle non-existent directory', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Directory does not exist'));

      const size = await exporter.getExportSize();

      expect(size).toBe(0);
    });
  });

  describe('Factory function', () => {
    it('should create JsonExporter instance', () => {
      const options: JsonExporterOptions = {
        outputDir: '/test',
        perSku: true,
      };

      const instance = createJsonExporter(options);

      expect(instance).toBeInstanceOf(JsonExporter);
    });
  });

  describe('Utility methods', () => {
    describe('simpleHash method', () => {
      it('should generate consistent hashes for same input', () => {
        const input = 'test string';
        const hash1 = exporter['simpleHash'](input);
        const hash2 = exporter['simpleHash'](input);

        expect(hash1).toBe(hash2);
      });

      it('should generate different hashes for different inputs', () => {
        const hash1 = exporter['simpleHash']('string1');
        const hash2 = exporter['simpleHash']('string2');

        expect(hash1).not.toBe(hash2);
      });

      it('should handle empty string', () => {
        const hash = exporter['simpleHash']('');

        expect(hash).toBeDefined();
        expect(hash).toBe('0');
      });

      it('should handle very long strings', () => {
        const longString = 'a'.repeat(10000);
        const hash = exporter['simpleHash'](longString);

        expect(hash).toBeDefined();
      });
    });

    describe('normalizeSku method', () => {
      it('should normalize various SKU formats', () => {
        const testCases = [
          { input: 'TEST-001', expected: 'TEST001' },
          { input: ' test_001 ', expected: 'TEST001' },
          { input: 'TEST/001', expected: 'TEST001' },
          { input: 'TEST.001', expected: 'TEST001' },
          { input: 'test001', expected: 'TEST001' },
        ];

        testCases.forEach(({ input, expected }) => {
          expect(exporter['normalizeSku'](input)).toBe(expected);
        });
      });
    });

    describe('generateSku method', () => {
      it('should generate SKU from item data', () => {
        const item = {
          name: 'Test Gundam',
          metadata: { source: 'bandai' },
        };

        const sku = exporter['generateSku'](item);

        expect(sku).toMatch(/^BANDAI-/);
        expect(sku.length).toBeLessThanOrEqual(20);
      });

      it('should handle missing metadata source', () => {
        const item = {
          name: 'Test Gundam',
        };

        const sku = exporter['generateSku'](item);

        expect(sku).toMatch(/^UNKNOWN-/);
      });

      it('should handle empty name', () => {
        const item = {
          name: '',
          metadata: { source: 'test' },
        };

        const sku = exporter['generateSku'](item);

        expect(sku).toMatch(/^TEST-/);
      });
    });

    describe('extractNumericPrice method', () => {
      it('should extract numeric values from price strings', () => {
        const testCases = [
          { input: '$1,234.56', expected: 1234.56 },
          { input: '¥1,200', expected: 1200 },
          { input: '€25.00', expected: 25 },
          { input: '1,500', expected: 1500 },
          { input: '1000.99', expected: 1000.99 },
          { input: 'invalid price', expected: null },
          { input: '', expected: null },
        ];

        testCases.forEach(({ input, expected }) => {
          expect(exporter['extractNumericPrice'](input)).toBe(expected);
        });
      });
    });
  });
});