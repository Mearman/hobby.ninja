/**
 * Integration tests for complete URL scanner workflow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { URLScanner } from '../../../packages/scrapers/src/url-scanner';
import { ScanConfiguration, URLPattern } from '../../../packages/scrapers/src/url-scanner/types';

describe('URL Scanner Integration Workflow', () => {
  let scanner: URLScanner;
  let tempDir: string;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    scanner = new URLScanner();
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Create temporary directory for test outputs
    tempDir = path.join(__dirname, '../temp-test-output');
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('complete scan workflow', () => {
    it('should scan mixed URL list and create three output files', async () => {
      // Arrange
      const staticHtml = await fs.readFile(
        path.join(__dirname, '../fixtures/static-bandai-page.html'),
        'utf8'
      );
      const dynamicHtml = await fs.readFile(
        path.join(__dirname, '../fixtures/dynamic-p-bandai-page.html'),
        'utf8'
      );
      const notFoundHtml = await fs.readFile(
        path.join(__dirname, '../fixtures/not-found-page.html'),
        'utf8'
      );

      // Mock fetch responses for different URL types
      mockFetch.mockImplementation((url) => {
        if (url.includes('bandai-hobby.net/item/4753')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'text/html' }),
            text: () => Promise.resolve(staticHtml)
          });
        } else if (url.includes('p-bandai.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'text/html' }),
            text: () => Promise.resolve(dynamicHtml)
          });
        } else if (url.includes('bandai-hobby.net/item/99999')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            headers: new Headers({ 'content-type': 'text/html' }),
            text: () => Promise.resolve(notFoundHtml)
          });
        } else {
          return Promise.reject(new Error('Network error'));
        }
      });

      const config: ScanConfiguration = {
        urlPatterns: [],
        concurrency: 3,
        timeoutMs: 5000,
        retryAttempts: 1,
        requestDelayMs: 100,
        outputDirectory: tempDir,
        followRedirects: true,
        maxRedirects: 5,
        userAgent: 'GundamURLScanner/1.0 Test'
      };

      // Act
      const urls = [
        'https://bandai-hobby.net/item/4753/',
        'https://p-bandai.com/us/item/F2434385006',
        'https://bandai-hobby.net/item/99999/'
      ];

      // Manually trigger the scan with specific URLs (since we're testing integration)
      await scanner.initialize(config);
      const results = [];

      for (const url of urls) {
        const result = await scanner.checkSingleUrl(url);
        results.push(result);
        await scanner.writeResult(result);
      }

      // Assert - Check that results are correct
      expect(results).toHaveLength(3);

      const staticResult = results.find(r => r.url.includes('4753'));
      const dynamicResult = results.find(r => r.url.includes('p-bandai'));
      const errorResult = results.find(r => r.url.includes('99999'));

      expect(staticResult?.validity).toBe('valid');
      expect(staticResult?.hasStaticData).toBe(true);
      expect(staticResult?.dataType).toBe('complete');

      expect(dynamicResult?.validity).toBe('valid');
      expect(dynamicResult?.hasStaticData).toBe(false);
      expect(dynamicResult?.dataType).toBe('none');

      expect(errorResult?.validity).toBe('invalid');
      expect(errorResult?.statusCode).toBe(404);

      // Assert - Check output files exist
      const staticFile = path.join(tempDir, 'valid_static_urls.txt');
      const dynamicFile = path.join(tempDir, 'valid_dynamic_urls.txt');
      const invalidFile = path.join(tempDir, 'invalid_urls.txt');

      expect(await fs.access(staticFile)).not.toThrow();
      expect(await fs.access(dynamicFile)).not.toThrow();
      expect(await fs.access(invalidFile)).not.toThrow();

      // Assert - Check output file content
      const staticContent = await fs.readFile(staticFile, 'utf8');
      const dynamicContent = await fs.readFile(dynamicFile, 'utf8');
      const invalidContent = await fs.readFile(invalidFile, 'utf8');

      expect(staticContent).toContain('https://bandai-hobby.net/item/4753/');
      expect(dynamicContent).toContain('https://p-bandai.com/us/item/F2434385006');
      expect(invalidContent).toContain('https://bandai-hobby.net/item/99999/');

      // Assert - Check format (tab-separated)
      expect(staticContent.split('\t')).toHaveLength(4); // URL\tTimestamp\tStatus\tIndicators
      expect(dynamicContent.split('\t')).toHaveLength(4);
      expect(invalidContent.split('\t')).toHaveLength(4);
    });

    it('should save and resume progress correctly', async () => {
      // Arrange
      const config: ScanConfiguration = {
        urlPatterns: [],
        concurrency: 2,
        timeoutMs: 5000,
        retryAttempts: 1,
        requestDelayMs: 100,
        outputDirectory: tempDir,
        followRedirects: true,
        maxRedirects: 5,
        userAgent: 'GundamURLScanner/1.0 Test',
        progressFile: path.join(tempDir, 'progress.json')
      };

      const html = await fs.readFile(
        path.join(__dirname, '../fixtures/static-bandai-page.html'),
        'utf8'
      );

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve(html)
      });

      await scanner.initialize(config);

      // Act - First scan with progress saving
      const urls = [
        'https://bandai-hobby.net/item/4753/',
        'https://bandai-hobby.net/item/4754/',
        'https://bandai-hobby.net/item/4755/'
      ];

      // Process first two URLs and save progress
      await scanner.checkSingleUrl(urls[0]);
      await scanner.checkSingleUrl(urls[1]);
      const progress = await scanner.getProgress();

      // Assert - Progress should be saved
      expect(progress).toBeDefined();
      expect(progress!.totalProcessed).toBe(2);
      expect(progress!.status).toBe('running');

      // Simulate resuming - create new scanner instance
      const resumedScanner = new URLScanner();
      await resumedScanner.initialize(config);
      const resumedProgress = await resumedScanner.getProgress();

      // Assert - Progress should be loadable
      expect(resumedProgress).toBeDefined();
      expect(resumedProgress!.totalProcessed).toBe(2);

      // Process remaining URL
      await resumedScanner.checkSingleUrl(urls[2]);
      const finalProgress = await resumedScanner.getProgress();

      expect(finalProgress!.totalProcessed).toBe(3);
    });

    it('should handle concurrent requests correctly', async () => {
      // Arrange
      const config: ScanConfiguration = {
        urlPatterns: [],
        concurrency: 5,
        timeoutMs: 10000, // Longer timeout for concurrency test
        retryAttempts: 1,
        requestDelayMs: 50, // Short delay for test speed
        outputDirectory: tempDir,
        followRedirects: true,
        maxRedirects: 5,
        userAgent: 'GundamURLScanner/1.0 Test'
      };

      const html = await fs.readFile(
        path.join(__dirname, '../fixtures/static-bandai-page.html'),
        'utf8'
      );

      // Mock fetch with delay to simulate real network requests
      mockFetch.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              statusText: 'OK',
              headers: new Headers({ 'content-type': 'text/html' }),
              text: () => Promise.resolve(html)
            });
          }, Math.random() * 100); // Random delay 0-100ms
        })
      );

      await scanner.initialize(config);

      const urls = Array.from({ length: 10 }, (_, i) =>
        `https://bandai-hobby.net/item/${4000 + i}/`
      );

      const startTime = Date.now();

      // Act - Process URLs concurrently
      const promises = urls.map(url => scanner.checkSingleUrl(url));
      const results = await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Assert
      expect(results).toHaveLength(10);
      expect(results.every(r => r.validity === 'valid')).toBe(true);
      expect(results.every(r => r.hasStaticData === true)).toBe(true);

      // Concurrent processing should be faster than sequential
      expect(totalTime).toBeLessThan(2000); // 2 seconds max for 10 concurrent requests
    });
  });
});