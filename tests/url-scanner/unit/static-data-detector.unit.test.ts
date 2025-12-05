/**
 * Unit tests for static data detector functionality
 */

import { describe, it, expect } from 'vitest';
import { StaticDataDetector } from '../../../packages/scrapers/src/url-scanner/static-data-detector';
import { DetectionResult } from '../../../packages/scrapers/src/url-scanner/types';
import { promises as fs } from 'fs';
import path from 'path';

describe('StaticDataDetector', () => {
  let detector: StaticDataDetector;

  beforeEach(() => {
    detector = new StaticDataDetector();
  });

  describe('detectStaticData', () => {
    it('should detect static data in Bandai hobby page with complete information', async () => {
      // Arrange
      const html = await fs.readFile(
        path.join(__dirname, '../fixtures/static-bandai-page.html'),
        'utf8'
      );
      const url = 'https://bandai-hobby.net/item/4753/';
      const headers = new Headers({
        'content-type': 'text/html; charset=utf-8'
      });

      // Act
      const result = await detector.detectStaticData(html, url, headers);

      // Assert
      expect(result.hasStaticData).toBe(true);
      expect(result.dataType).toBe('complete');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.indicators).toContain('static-title');
      expect(result.indicators).toContain('structured-data');
      expect(result.indicators).toContain('meta-description');
      expect(result.indicators).toContain('og-image');
      expect(result.extractedData?.title).toBeTruthy();
      expect(result.extractedData?.sku).toContain('MG 1/100');
    });

    it('should detect dynamic content requiring JavaScript', async () => {
      // Arrange
      const html = await fs.readFile(
        path.join(__dirname, '../fixtures/dynamic-p-bandai-page.html'),
        'utf8'
      );
      const url = 'https://p-bandai.com/us/item/F2434385006';
      const headers = new Headers({
        'content-type': 'text/html; charset=utf-8'
      });

      // Act
      const result = await detector.detectStaticData(html, url, headers);

      // Assert
      expect(result.hasStaticData).toBe(false);
      expect(result.dataType).toBe('none');
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.indicators).toContain('loading-placeholder');
      expect(result.indicators).toContain('script-data-source');
      expect(result.indicators).toContain('empty-root-element');
    });

    it('should identify partial static data with some information available', async () => {
      // Arrange
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>MG Gundam Test</title>
          <meta name="description" content="Test Gundam kit">
        </head>
        <body>
          <h1>MG Gundam</h1>
          <div class="product-info"></div>
          <script>
            var productData = { details: 'loaded via API' };
          </script>
        </body>
        </html>
      `;
      const url = 'https://test-bandai.net/item/123/';
      const headers = new Headers({
        'content-type': 'text/html; charset=utf-8'
      });

      // Act
      const result = await detector.detectStaticData(html, url, headers);

      // Assert
      expect(result.hasStaticData).toBe(true);
      expect(result.dataType).toBe('partial');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.indicators).toContain('static-title');
      expect(result.indicators).toContain('partial-data');
    });

    it('should handle empty HTML content', async () => {
      // Arrange
      const html = '';
      const url = 'https://test-bandai.net/item/empty/';
      const headers = new Headers({
        'content-type': 'text/html; charset=utf-8'
      });

      // Act
      const result = await detector.detectStaticData(html, url, headers);

      // Assert
      expect(result.hasStaticData).toBe(false);
      expect(result.dataType).toBe('none');
      expect(result.confidence).toBe(0);
      expect(result.indicators).toContain('empty-content');
    });

    it('should detect SKU patterns in HTML content', async () => {
      // Arrange
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>HGUC 1/144 Gundam Test Kit</title>
        </head>
        <body>
          <div class="product-info">
            <div class="sku">RG 1/144 RX-78-2 Gundam</div>
            <p>Master Grade PG version available</p>
          </div>
        </body>
        </html>
      `;
      const url = 'https://test-bandai.net/item/456/';
      const headers = new Headers({
        'content-type': 'text/html; charset=utf-8'
      });

      // Act
      const result = await detector.detectStaticData(html, url, headers);

      // Assert
      expect(result.hasStaticData).toBe(true);
      expect(result.indicators).toContain('static-title');
      expect(result.indicators).toContain('sku-pattern-found');
      expect(result.extractedData?.sku).toContain('HGUC 1/144');
    });

    it('should handle non-HTML content types', async () => {
      // Arrange
      const html = '<html><body>Not HTML content</body></html>';
      const url = 'https://test-bandai.net/item/api.json';
      const headers = new Headers({
        'content-type': 'application/json'
      });

      // Act
      const result = await detector.detectStaticData(html, url, headers);

      // Assert
      expect(result.hasStaticData).toBe(false);
      expect(result.dataType).toBe('none');
      expect(result.indicators).toContain('non-html-content');
    });

    it('should detect multiple indicators for confidence scoring', async () => {
      // Arrange
      const html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <title>MG 1/100 Gundam Exia</title>
          <meta name="description" content="Master Grade Gundam Exia">
          <meta property="og:title" content="MG Gundam Exia">
          <script type="application/ld+json">
          {"@context": "https://schema.org", "@type": "Product", "name": "Gundam Exia"}
          </script>
        </head>
        <body>
          <h1>MG 1/100 Gundam Exia</h1>
          <div class="sku">MG 1/100 GN-001</div>
          <img src="/images/exia.jpg" alt="Gundam Exia">
        </body>
        </html>
      `;
      const url = 'https://bandai-hobby.net/item/exia/';
      const headers = new Headers({
        'content-type': 'text/html; charset=utf-8'
      });

      // Act
      const result = await detector.detectStaticData(html, url, headers);

      // Assert
      expect(result.hasStaticData).toBe(true);
      expect(result.dataType).toBe('complete');
      expect(result.confidence).toBeGreaterThan(0.95);
      expect(result.indicators).toContain('static-title');
      expect(result.indicators).toContain('structured-data');
      expect(result.indicators).toContain('meta-description');
      expect(result.indicators).toContain('sku-pattern-found');
      expect(result.indicators).toContain('image-elements');
    });
  });
});