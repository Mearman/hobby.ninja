/**
 * URL checker implementation for validating URLs and detecting static data availability
 */

import { URLCheckResult, CheckOptions } from './types.js';
import { StaticDataDetector } from './static-data-detector.js';
import { promises as fs } from 'fs';
import path from 'path';

export class URLChecker {
  private staticDataDetector: StaticDataDetector;

  constructor() {
    this.staticDataDetector = new StaticDataDetector();
  }

  private static readonly STATIC_DATA_PATTERNS = {
    title: [
      /<title[^>]*>([^<]+)<\/title>/gi,
      /<h1[^>]*>([^<]+)<\/h1>/gi,
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/gi,
      /<meta[^>]*name=["']title["'][^>]*content=["']([^"']+)["']/gi
    ],
    description: [
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/gi,
      /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/gi
    ],
    structuredData: [
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ],
    sku: [
      /(?:HG|MG|PG|RG|SD|RE\/100|MGEX|EG|MB)[\s-_]*\d+/gi,
      /1\/(?:100|144|60|48|550)\s*(?:HG|MG|PG|RG|SD)/gi
    ],
    loadingIndicators: [
      /loading/i,
      /spinner/i,
      /<div[^>]*class=["'][^"']*loading[^"']*["']/gi,
      /<div[^>]*>\s*<\/div>/gi
    ],
    scriptDataSources: [
      /<script[^>]*>[\s\S]*?(?:productData|var\s+data|const\s+data)[\s\S]*?<\/script>/gi
    ],
    images: [
      /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi,
      /<img[^>]*src=["']([^"']+)["'][^>]*>/gi
    ]
  };

  /**
   * Check a single URL for validity and data extraction viability
   */
  async checkURL(url: string, options: CheckOptions): Promise<URLCheckResult> {
    const startTime = Date.now();

    try {
      // Validate URL format
      new URL(url);
    } catch {
      return this.createErrorResult(url, 'Invalid URL format', startTime);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': options.userAgent || 'GundamURLScanner/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
        redirect: options.followRedirects ? 'follow' : 'manual'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return this.createErrorResult(
          url,
          `HTTP ${response.status}: ${response.statusText}`,
          startTime,
          response.status
        );
      }

      const responseSize = parseInt(response.headers.get('content-length') || '0');
      const contentType = response.headers.get('content-type') || '';

      let html = '';
      try {
        html = await response.text();
      } catch (error) {
        return this.createErrorResult(
          url,
          `Failed to read response body: ${error instanceof Error ? error.message : 'Unknown error'}`,
          startTime,
          response.status
        );
      }

      // Use StaticDataDetector for comprehensive analysis
      const staticDataResult = await this.staticDataDetector.detectStaticData(html, url, response.headers);

      return {
        url,
        timestamp: new Date().toISOString(),
        validity: 'valid',
        statusCode: response.status,
        hasStaticData: staticDataResult.hasStaticData,
        dataType: staticDataResult.dataType,
        confidence: staticDataResult.confidence,
        indicators: staticDataResult.indicators,
        finalUrl: response.url || url,
        contentType,
        responseSize,
        requestTime: Date.now() - startTime
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return this.createErrorResult(url, 'Request timeout', startTime);
        }
        return this.createErrorResult(url, error.message, startTime);
      }

      return this.createErrorResult(url, 'Unknown error occurred', startTime);
    }
  }

  /**
   * Detect if essential Gundam data is available in static HTML
   */
  private detectStaticData(html: string): boolean {
    if (!html || html.trim().length === 0) {
      return false;
    }

    // Check for essential data indicators
    const hasTitle = this.extractPattern(html, URLChecker.STATIC_DATA_PATTERNS.title).length > 0;
    const hasSku = this.extractPattern(html, URLChecker.STATIC_DATA_PATTERNS.sku).length > 0;

    return hasTitle && (hasSku || this.hasStructuredData(html));
  }

  /**
   * Check if page has structured data (JSON-LD, microdata)
   */
  private hasStructuredData(html: string): boolean {
    const structuredData = this.extractPattern(html, URLChecker.STATIC_DATA_PATTERNS.structuredData);

    if (structuredData.length === 0) {
      return false;
    }

    try {
      // Parse JSON-LD to check if it's valid product data
      const jsonStr = structuredData[0];
      const data = JSON.parse(jsonStr);
      return data['@type'] === 'Product' ||
             data['@type'] === 'Toy' ||
             (data.name && (data.name.toLowerCase().includes('gundam') ||
                          data.name.toLowerCase().includes('ガンダム')));
    } catch {
      return false;
    }
  }

  /**
   * Analyze HTML for various indicators
   */
  private analyzeIndicators(html: string, response: Response): string[] {
    const indicators: string[] = [];

    // Check for static content indicators
    if (this.extractPattern(html, URLChecker.STATIC_DATA_PATTERNS.title).length > 0) {
      indicators.push('static-title');
    }

    if (this.extractPattern(html, URLChecker.STATIC_DATA_PATTERNS.description).length > 0) {
      indicators.push('meta-description');
    }

    if (this.hasStructuredData(html)) {
      indicators.push('structured-data');
    }

    if (this.extractPattern(html, URLChecker.STATIC_DATA_PATTERNS.sku).length > 0) {
      indicators.push('sku-pattern-found');
    }

    if (this.extractPattern(html, URLChecker.STATIC_DATA_PATTERNS.images).length > 0) {
      indicators.push('image-elements');
    }

    // Check for dynamic content indicators
    if (this.extractPattern(html, URLChecker.STATIC_DATA_PATTERNS.loadingIndicators).length > 0) {
      indicators.push('loading-placeholder');
    }

    if (this.extractPattern(html, URLChecker.STATIC_DATA_PATTERNS.scriptDataSources).length > 0) {
      indicators.push('script-data-source');
    }

    // Check for empty containers
    if (/<div[^>]*>\s*<\/div>/gi.test(html)) {
      indicators.push('empty-content');
    }

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      indicators.push('non-html-content');
    }

    // Check for SPA frameworks
    if (html.includes('data-reactroot') || html.includes('ng-app') || html.includes('data-vue-')) {
      indicators.push('spa-framework');
    }

    return indicators;
  }

  /**
   * Calculate confidence score based on indicators
   */
  private calculateConfidence(indicators: string[], hasStaticData: boolean): number {
    let confidence = 0;

    // High confidence indicators
    if (indicators.includes('structured-data')) confidence += 0.4;
    if (indicators.includes('static-title')) confidence += 0.3;
    if (indicators.includes('meta-description')) confidence += 0.2;
    if (indicators.includes('sku-pattern-found')) confidence += 0.1;

    // Penalty for negative indicators
    if (indicators.includes('loading-placeholder')) confidence -= 0.3;
    if (indicators.includes('script-data-source')) confidence -= 0.2;
    if (indicators.includes('empty-content')) confidence -= 0.1;
    if (indicators.includes('spa-framework')) confidence -= 0.2;
    if (indicators.includes('non-html-content')) confidence -= 0.5;

    // Base confidence if static data detected
    if (hasStaticData && confidence < 0.7) {
      confidence = 0.7;
    } else if (!hasStaticData && confidence > 0.5) {
      confidence = 0.3;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Extract text using regex patterns
   */
  private extractPattern(html: string, patterns: RegExp[]): string[] {
    const results: string[] = [];

    for (const pattern of patterns) {
      const matches = html.match(pattern);
      if (matches) {
        for (const match of matches) {
          if (typeof match === 'string') {
            results.push(match);
          } else if (match && match[1]) {
            results.push(match[1]);
          }
        }
      }
    }

    return results;
  }

  /**
   * Create error result
   */
  private createErrorResult(
    url: string,
    errorMessage: string,
    startTime: number,
    statusCode?: number
  ): URLCheckResult {
    return {
      url,
      timestamp: new Date().toISOString(),
      validity: 'error',
      statusCode,
      hasStaticData: false,
      dataType: 'none',
      confidence: 0,
      indicators: ['error'],
      errorMessage,
      requestTime: Date.now() - startTime
    };
  }
}