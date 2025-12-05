/**
 * Unit tests for URL checker functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { URLChecker } from '../../../packages/scrapers/src/url-scanner/url-checker';
import { URLCheckResult, CheckOptions } from '../../../packages/scrapers/src/url-scanner/types';
import { promises as fs } from 'fs';
import path from 'path';

describe('URLChecker', () => {
  let urlChecker: URLChecker;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    urlChecker = new URLChecker();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe('checkURL', () => {
    it('should return valid result for successful static HTML page', async () => {
      // Arrange
      const url = 'https://bandai-hobby.net/item/4753/';
      const htmlContent = await fs.readFile(
        path.join(__dirname, '../fixtures/static-bandai-page.html'),
        'utf8'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8',
          'content-length': '2048'
        }),
        text: () => Promise.resolve(htmlContent)
      });

      const options: CheckOptions = {
        timeoutMs: 5000,
        followRedirects: true,
        maxRedirects: 5,
        retryAttempts: 3
      };

      // Act
      const result = await urlChecker.checkURL(url, options);

      // Assert
      expect(result).toBeDefined();
      expect(result.url).toBe(url);
      expect(result.validity).toBe('valid');
      expect(result.statusCode).toBe(200);
      expect(result.hasStaticData).toBe(true);
      expect(result.dataType).toBe('complete');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.indicators).toContain('static-title');
      expect(result.indicators).toContain('structured-data');
      expect(result.requestTime).toBeDefined();
      expect(result.requestTime).toBeGreaterThanOrEqual(0);
    });

    it('should return invalid result for 404 page', async () => {
      // Arrange
      const url = 'https://bandai-hobby.net/item/99999/';
      const htmlContent = await fs.readFile(
        path.join(__dirname, '../fixtures/not-found-page.html'),
        'utf8'
      );

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: () => Promise.resolve(htmlContent)
      });

      const options: CheckOptions = {
        timeoutMs: 5000,
        followRedirects: true,
        maxRedirects: 5,
        retryAttempts: 3
      };

      // Act
      const result = await urlChecker.checkURL(url, options);

      // Assert
      expect(result).toBeDefined();
      expect(result.url).toBe(url);
      expect(result.validity).toBe('invalid');
      expect(result.statusCode).toBe(404);
      expect(result.hasStaticData).toBe(false);
    });

    it('should return dynamic result for JavaScript-reliant page', async () => {
      // Arrange
      const url = 'https://p-bandai.com/us/item/F2434385006';
      const htmlContent = await fs.readFile(
        path.join(__dirname, '../fixtures/dynamic-p-bandai-page.html'),
        'utf8'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: () => Promise.resolve(htmlContent)
      });

      const options: CheckOptions = {
        timeoutMs: 5000,
        followRedirects: true,
        maxRedirects: 5,
        retryAttempts: 3
      };

      // Act
      const result = await urlChecker.checkURL(url, options);

      // Assert
      expect(result).toBeDefined();
      expect(result.url).toBe(url);
      expect(result.validity).toBe('valid');
      expect(result.statusCode).toBe(200);
      expect(result.hasStaticData).toBe(false);
      expect(result.dataType).toBe('none');
      expect(result.indicators).toContain('dynamic-indicator');
      expect(result.indicators).toContain('loading-placeholder');
    });

    it('should return error result for network timeout', async () => {
      // Arrange
      const url = 'https://slow-bandai-site.net/item/123/';

      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      const options: CheckOptions = {
        timeoutMs: 1000,
        followRedirects: true,
        maxRedirects: 5,
        retryAttempts: 1
      };

      // Act
      const result = await urlChecker.checkURL(url, options);

      // Assert
      expect(result).toBeDefined();
      expect(result.url).toBe(url);
      expect(result.validity).toBe('error');
      expect(result.errorMessage).toContain('Request timeout');
    });

    it('should follow redirects and return final URL', async () => {
      // Arrange
      const originalUrl = 'https://bandai-hobby.net/item/redirect';
      const finalUrl = 'https://bandai-hobby.net/item/4753/';
      const htmlContent = await fs.readFile(
        path.join(__dirname, '../fixtures/static-bandai-page.html'),
        'utf8'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: finalUrl,
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: () => Promise.resolve(htmlContent)
      });

      const options: CheckOptions = {
        timeoutMs: 5000,
        followRedirects: true,
        maxRedirects: 5,
        retryAttempts: 3
      };

      // Act
      const result = await urlChecker.checkURL(originalUrl, options);

      // Assert
      expect(result).toBeDefined();
      expect(result.url).toBe(originalUrl);
      expect(result.finalUrl).toBe(finalUrl);
      expect(result.validity).toBe('valid');
    });

    it('should handle empty response gracefully', async () => {
      // Arrange
      const url = 'https://bandai-hobby.net/item/empty/';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8',
          'content-length': '0'
        }),
        text: () => Promise.resolve('')
      });

      const options: CheckOptions = {
        timeoutMs: 5000,
        followRedirects: true,
        maxRedirects: 5,
        retryAttempts: 3
      };

      // Act
      const result = await urlChecker.checkURL(url, options);

      // Assert
      expect(result).toBeDefined();
      expect(result.validity).toBe('valid');
      expect(result.hasStaticData).toBe(false);
      expect(result.dataType).toBe('none');
      expect(result.responseSize).toBe(0);
    });
  });
});