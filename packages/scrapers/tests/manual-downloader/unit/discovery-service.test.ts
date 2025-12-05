/**
 * Unit tests for DiscoveryService
 *
 * Test-driven development for intelligent ID discovery algorithms
 * that handle unknown ranges and gap detection.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiscoveryService } from '../../../src/manual-downloader/services/discovery-service';
import { HttpClient } from '../../../src/manual-downloader/services/http-client';

describe('DiscoveryService', () => {
  let discoveryService: DiscoveryService;
  let mockHttpClient: vi.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      head: vi.fn(),
      validateUrl: vi.fn()
    } as any;

    discoveryService = new DiscoveryService(mockHttpClient);
  });

  describe('discoverRange', () => {
    it('should discover valid ID range efficiently', async () => {
      // Arrange
      const baseUrl = 'https://manual.bandai-hobby.net/menus/detail/';
      mockHttpClient.validateUrl.mockImplementation(async (id) => {
        // Simulate existing pages 650-660
        const pageNum = parseInt(id.split('/').pop() || '0');
        return {
          statusCode: pageNum >= 650 && pageNum <= 660 ? 200 : 404,
          contentLength: pageNum >= 650 && pageNum <= 660 ? 5000 : 0,
          isValid: pageNum >= 650 && pageNum <= 660,
          duration: 100,
          headers: {},
          finalUrl: id,
          fromCache: false
        };
      });

      // Act
      const result = await discoveryService.discoverRange(baseUrl);

      // Assert
      expect(result.minId).toBe(650);
      expect(result.maxId).toBe(660);
      expect(result.validIds).toHaveLength(11); // 650-660 inclusive
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.strategy).toBeDefined();
    });

    it('should handle when only invalid pages found', async () => {
      // Arrange
      const baseUrl = 'https://manual.bandai-hobby.net/menus/detail/';
      mockHttpClient.validateUrl.mockResolvedValue({
        statusCode: 404,
        contentLength: 0,
        isValid: false,
        duration: 100,
        headers: {},
        finalUrl: baseUrl,
        fromCache: false
      });

      // Act & Assert
      await expect(discoveryService.discoverRange(baseUrl)).rejects.toThrow();
    });

    it('should respect rate limiting during discovery', async () => {
      // Arrange
      const baseUrl = 'https://manual.bandai-hobby.net/menus/detail/';
      const startTime = Date.now();

      mockHttpClient.validateUrl.mockImplementation(async (url) => {
        // Simulate some delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          statusCode: 200,
          contentLength: 5000,
          isValid: true,
          duration: 100,
          headers: {},
          finalUrl: url,
          fromCache: false
        };
      });

      // Act
      await discoveryService.discoverRange(baseUrl, { maxSteps: 3 });

      // Assert - should have taken time due to rate limiting
      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThan(1000); // Should have delays between requests
    });
  });

  describe('validateIds', () => {
    it('should validate multiple IDs in parallel', async () => {
      // Arrange
      const baseUrl = 'https://manual.bandai-hobby.net/menus/detail/';
      const ids = [650, 651, 652, 999, 1000];

      mockHttpClient.validateUrl.mockImplementation(async (url) => {
        const pageNum = parseInt(url.split('/').pop() || '0');
        return {
          statusCode: pageNum <= 652 ? 200 : 404,
          contentLength: pageNum <= 652 ? 5000 : 0,
          isValid: pageNum <= 652,
          duration: 100,
          headers: {},
          finalUrl: url,
          fromCache: false
        };
      });

      // Act
      const result = await discoveryService.validateIds(baseUrl, ids, { concurrency: 2 });

      // Assert
      expect(result.results).toHaveLength(5);
      expect(result.summary.valid).toBe(3); // 650, 651, 652
      expect(result.summary.invalid).toBe(2); // 999, 1000
      expect(result.performance.requestsPerSecond).toBeGreaterThan(0);
    });

    it('should cache validation results', async () => {
      // Arrange
      const baseUrl = 'https://manual.bandai-hobby.net/menus/detail/';
      const ids = [650, 651];

      mockHttpClient.validateUrl.mockResolvedValue({
        statusCode: 200,
        contentLength: 5000,
        isValid: true,
        duration: 100,
        headers: {},
        finalUrl: baseUrl + '650',
        fromCache: false
      });

      // Act - First call
      const result1 = await discoveryService.validateIds(baseUrl, ids, { cache: true });

      // Second call should use cache
      const result2 = await discoveryService.validateIds(baseUrl, ids, { cache: true });

      // Assert
      expect(mockHttpClient.validateUrl).toHaveBeenCalledTimes(2); // Once for each ID
      expect(result1.summary.total).toBe(2);
      expect(result2.summary.total).toBe(2);
    });
  });

  describe('detectGaps', () => {
    it('should detect gaps in ID sequences', async () => {
      // Arrange
      const baseUrl = 'https://manual.bandai-hobby.net/menus/detail/';
      const minId = 650;
      const maxId = 660;

      mockHttpClient.validateUrl.mockImplementation(async (url) => {
        const pageNum = parseInt(url.split('/').pop() || '0');
        // Valid IDs: 650-652, 654-656, 658-660 (gaps at 653, 657)
        const isValid = [650, 651, 652, 654, 655, 656, 658, 659, 660].includes(pageNum);
        return {
          statusCode: isValid ? 200 : 404,
          contentLength: isValid ? 5000 : 0,
          isValid,
          duration: 100,
          headers: {},
          finalUrl: url,
          fromCache: false
        };
      });

      // Act
      const gaps = await discoveryService.detectGaps(baseUrl, minId, maxId);

      // Assert
      expect(gaps).toHaveLength(2);
      expect(gaps[0]).toMatchObject({
        startId: 653,
        endId: 653,
        gapSize: 1,
        type: 'small-gap'
      });
      expect(gaps[1]).toMatchObject({
        startId: 657,
        endId: 657,
        gapSize: 1,
        type: 'small-gap'
      });
    });
  });

  describe('expandRange', () => {
    it('should expand range in both directions from start ID', async () => {
      // Arrange
      const baseUrl = 'https://manual.bandai-hobby.net/menus/detail/';
      const startId = 652;

      mockHttpClient.validateUrl.mockImplementation(async (url) => {
        const pageNum = parseInt(url.split('/').pop() || '0');
        // Simulate range 645-660
        const isValid = pageNum >= 645 && pageNum <= 660;
        return {
          statusCode: isValid ? 200 : 404,
          contentLength: isValid ? 5000 : 0,
          isValid,
          duration: 100,
          headers: {},
          finalUrl: url,
          fromCache: false
        };
      });

      // Act
      const result = await discoveryService.expandRange(baseUrl, startId, {
        direction: 'both',
        maxSteps: 10
      });

      // Assert
      expect(result.minId).toBe(645);
      expect(result.maxId).toBe(660);
      expect(result.rangeSize).toBe(16); // 645-660 inclusive
      expect(result.quality.confidence).toBeGreaterThan(0.9);
    });

    it('should handle when no valid pages found beyond start', async () => {
      // Arrange
      const baseUrl = 'https://manual.bandai-hobby.net/menus/detail/';
      const startId = 652;

      mockHttpClient.validateUrl.mockResolvedValue({
        statusCode: 404,
        contentLength: 0,
        isValid: false,
        duration: 100,
        headers: {},
        finalUrl: baseUrl + '652',
        fromCache: false
      });

      // Act
      const result = await discoveryService.expandRange(baseUrl, startId, {
        direction: 'both',
        maxSteps: 5
      });

      // Assert
      expect(result.minId).toBe(startId);
      expect(result.maxId).toBe(startId);
      expect(result.quality.confidence).toBeLessThan(0.5);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange
      const baseUrl = 'https://manual.bandai-hobby.net/menus/detail/';
      mockHttpClient.validateUrl.mockRejectedValue(new Error('Network timeout'));

      // Act
      const result = await discoveryService.discoverRange(baseUrl, { timeLimit: 1000 });

      // Assert - Should handle errors and return partial results
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.errors).toBeDefined();
    });

    it('should respect time limits', async () => {
      // Arrange
      const baseUrl = 'https://manual.bandai-hobby.net/menus/detail/';
      mockHttpClient.validateUrl.mockImplementation(async () => {
        // Simulate long-running request
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
          statusCode: 200,
          contentLength: 5000,
          isValid: true,
          duration: 2000,
          headers: {},
          finalUrl: baseUrl,
          fromCache: false
        };
      });

      // Act
      const startTime = Date.now();
      const result = await discoveryService.discoverRange(baseUrl, { timeLimit: 1000 });
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(2000); // Should be limited by time limit
      expect(result.confidence).toBeDefined();
    });
  });
});