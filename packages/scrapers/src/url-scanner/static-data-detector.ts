/**
 * Static data detector for analyzing HTML content and determining data extraction viability
 */

import { DetectionResult, DetectionResult } from './types.js';

export class StaticDataDetector {
  private static readonly INDICATOR_PATTERNS = {
    // Static content indicators
    staticTitle: [
      /<title[^>]*>([^<]+)<\/title>/gi,
      /<h1[^>]*>([^<]{5,})<\/h1>/gi,
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']{10,})["']/gi
    ],
    metaDescription: [
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']{20,})["']/gi,
      /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']{20,})["']/gi
    ],
    structuredData: [
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ],
    skuPatterns: [
      /(?:^|\s)[A-Z]{0,2}(?:HG|MG|PG|RG|SD|RE\/100|MGEX|EG|MB|HY2M)(?:\s+|[_-])[\dA-Za-z]+/gi,
      /(?:^|\s)1\/(?:100|144|60|48|550)\s+(?:HG|MG|PG|RG|SD|HGUC|HY2M)/gi,
      /ガンダム[\s-_]*[^\s<]*\((?:HG|MG|PG|RG|SD|HY2M)/gi,
      /機動戦士[\s-_]*[^\s<]*\((?:HG|MG|PG|RG|SD|HY2M)/gi
    ],
    imageElements: [
      /<img[^>]*(?:src|srcset)=["']([^"']+)["'][^>]*(?:alt=["']([^"']+)["'])?/gi
    ],

    // Dynamic content indicators
    loadingPlaceholders: [
      /loading/i,
      /spinner/i,
      /<div[^>]*class=["'][^"']*loading[^"']*["']/gi,
      /読み込み中/gi,
      /ローディング/gi
    ],
    scriptDataSources: [
      /<script[^>]*>[\s\S]*?(?:productData|var\s+\w+.*?=.*?=|const\s+\w+.*?=.*?=|let\s+\w+.*?=.*?=)[\s\S]*?<\/script>/gi
    ],
    emptyContainers: [
      /<div[^>]*>\s*<\/div>/gi,
      /<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>\s*<\/div>/gi,
      /<div[^>]*class=["'][^"']*empty[^"']*["'][^>]*>\s*<\/div>/gi
    ],
    spaFrameworks: [
      /data-reactroot/gi,
      /ng-app/gi,
      /data-vue-/gi,
      /data-svelte-/gi,
      /id=["']app["']/gi,
      /<div[^>]*id=["']root["'][^>]*>/gi
    ],
    clientSideScripts: [
      /<script[^>]*src=["'](?:https?:\/\/)?(?:cdnjs|cdn\.jsdelivr|unpkg)\//gi,
      /<script[^>]*crossorigin=["']anonymous["'][^>]*>/gi
    ],
    minimalContent: [
      /<body><\/body>/gi,
      /<html><\/html>/gi,
      /<html><head><\/head><body><\/body><\/html>/gi
    ]
  };

  /**
   * Analyze HTML content to determine if essential Gundam data is statically available
   */
  async detectStaticData(html: string, url: string, headers: Headers): Promise<DetectionResult> {
    if (!html || html.trim().length === 0) {
      return {
        hasStaticData: false,
        dataType: 'none',
        confidence: 0,
        indicators: ['empty-content'],
        extractedData: undefined
      };
    }

    const indicators: string[] = [];
    const extractedData: any = {};

    // Check content type
    const contentType = headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      indicators.push('non-html-content');
      return {
        hasStaticData: false,
        dataType: 'none',
        confidence: 0.2,
        indicators,
        extractedData: undefined
      };
    }

    // Extract static title
    const titles = this.extractAllPatterns(html, StaticDataDetector.INDICATOR_PATTERNS.staticTitle);
    if (titles.length > 0) {
      indicators.push('static-title');
      extractedData.title = this.cleanText(titles[0]);

      // Check if this is a 404 error page
      if (extractedData.title.toLowerCase().includes('404') ||
          extractedData.title.toLowerCase().includes('not found')) {
        indicators.push('404-error');
      }
    }

    // Extract meta description
    const descriptions = this.extractAllPatterns(html, StaticDataDetector.INDICATOR_PATTERNS.metaDescription);
    if (descriptions.length > 0) {
      indicators.push('meta-description');
      extractedData.description = this.cleanText(descriptions[0]);
    }

    // Extract structured data (JSON-LD)
    const structuredDataResults = this.extractAllPatterns(html, StaticDataDetector.INDICATOR_PATTERNS.structuredData);
    if (structuredDataResults.length > 0) {
      indicators.push('structured-data');
      const structuredData = this.parseStructuredData(structuredDataResults[0]);
      if (structuredData) {
        extractedData.title = extractedData.title || extractedData.title || extractedData.name;
        extractedData.description = extractedData.description || extractedData.description;
        if (structuredData.sku) {
          extractedData.sku = structuredData.sku;
        }
        if (structuredData.image) {
          extractedData.images = [structuredData.image];
        }
      }
    }

    // Extract SKU patterns
    const skuPatterns = this.extractAllPatterns(html, StaticDataDetector.INDICATOR_PATTERNS.skuPatterns);
    if (skuPatterns.length > 0) {
      indicators.push('sku-pattern-found');
      if (!extractedData.sku) {
        extractedData.sku = skuPatterns[0].trim();
      }
    }

    // Extract images
    const images = this.extractAllPatterns(html, StaticDataDetector.INDICATOR_PATTERNS.imageElements);
    if (images.length > 0) {
      indicators.push('image-elements');
      extractedData.images = images.map(img => img[1] || img[0]); // alt text or src
    }

    // Check for dynamic indicators
    if (this.hasAnyPattern(html, StaticDataDetector.INDICATOR_PATTERNS.loadingPlaceholders)) {
      indicators.push('loading-placeholder');
    }

    if (this.hasAnyPattern(html, StaticDataDetector.INDICATOR_PATTERNS.scriptDataSources)) {
      indicators.push('script-data-source');
    }

    if (this.hasAnyPattern(html, StaticDataDetector.INDICATOR_PATTERNS.emptyContainers)) {
      indicators.push('empty-content');
    }

    if (this.hasAnyPattern(html, StaticDataDetector.INDICATOR_PATTERNS.spaFrameworks)) {
      indicators.push('spa-framework');
    }

    if (this.hasAnyPattern(html, StaticDataDetector.INDICATOR_PATTERNS.clientSideScripts)) {
      indicators.push('client-side-scripts');
    }

    if (this.hasAnyPattern(html, StaticDataDetector.INDICATOR_PATTERNS.minimalContent)) {
      indicators.push('minimal-content');
    }

    // Determine data type and confidence
    const hasStaticData = this.hasEssentialGundamData(extractedData, indicators);
    const dataType = this.determineDataType(indicators, hasStaticData);
    const confidence = this.calculateConfidence(indicators, hasStaticData);

    return {
      hasStaticData,
      dataType,
      confidence,
      indicators,
      extractedData: hasStaticData ? extractedData : undefined
    };
  }

  /**
   * Extract all matches for a given pattern array
   */
  private extractAllPatterns(html: string, patterns: RegExp[]): string[] {
    const results: string[] = [];

    for (const pattern of patterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches) {
        for (const match of matches) {
          if (match[1]) {
            results.push(match[1]);
          } else if (match[0]) {
            results.push(match[0]);
          }
        }
      }
    }

    return results;
  }

  /**
   * Check if any pattern matches
   */
  private hasAnyPattern(html: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(html));
  }

  /**
   * Parse structured data from JSON-LD
   */
  private parseStructuredData(jsonStr: string): any {
    try {
      const data = JSON.parse(jsonStr);

      // Check if it's relevant Gundam/product data
      if (this.isGundamProductData(data)) {
        return {
          title: data.name || data.title,
          description: data.description,
          sku: this.extractSkuFromStructuredData(data),
          brand: data.brand || data.manufacturer,
          image: data.image || data.image?.[0] || data.imageUrl
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if structured data represents Gundam product information
   */
  private isGundamProductData(data: any): boolean {
    if (!data) return false;

    const name = (data.name || data.title || '').toLowerCase();
    const description = (data.description || '').toLowerCase();

    return name.includes('gundam') ||
           name.includes('ガンダム') ||
           name.includes('gunpla') ||
           description.includes('gundam') ||
           description.includes('ガンダム') ||
           description.includes('gunpla');
  }

  /**
   * Extract SKU information from structured data
   */
  private extractSkuFromStructuredData(data: any): string | undefined {
    if (data.sku) return data.sku;
    if (data.model) return data.model;
    if (data.identifier) return data.identifier;

    // Look in other possible fields
    for (const field of ['productId', 'itemNumber', 'partNumber', 'catalogNumber']) {
      if (data[field]) {
        return data[field];
      }
    }

    return undefined;
  }

  /**
   * Determine if essential Gundam data is available
   */
  private hasEssentialGundamData(extractedData: any, indicators: string[]): boolean {
    // Must have a title or description
    const hasTitle = extractedData.title && extractedData.title.length > 0;
    const hasDescription = extractedData.description && extractedData.description.length > 0;

    // Consider content valuable if it has either title/description OR structured data
    return hasTitle || hasDescription || indicators.includes('structured-data');
  }

  /**
   * Determine the type of data availability
   */
  private determineDataType(indicators: string[], hasStaticData: boolean): 'complete' | 'partial' | 'none' {
    if (!hasStaticData) {
      return 'none';
    }

    const hasStructuredData = indicators.includes('structured-data');
    const hasAllKeyIndicators = [
      'static-title',
      'meta-description',
      'image-elements'
    ].every(indicator => indicators.includes(indicator));

    const hasBasicIndicators = [
      'static-title',
      'meta-description'
    ].every(indicator => indicators.includes(indicator));

    if (hasStructuredData && hasAllKeyIndicators) {
      return 'complete';
    }

    if (hasStructuredData || hasBasicIndicators) {
      return 'complete';
    }

    return 'partial';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(indicators: string[], hasStaticData: boolean): number {
    let confidence = 0.3; // Base confidence

    // Check for 404 error pages (which should have very low confidence)
    const is404Page = indicators.some(indicator =>
      indicator.toLowerCase().includes('404') ||
      indicator.toLowerCase().includes('not found')
    );

    // Add for strong positive indicators
    if (indicators.includes('structured-data')) confidence += 0.4;
    if (indicators.includes('static-title') && !is404Page) confidence += 0.3;
    if (indicators.includes('meta-description')) confidence += 0.2;
    if (indicators.includes('image-elements') && !is404Page) confidence += 0.1;
    if (indicators.includes('sku-pattern-found')) confidence += 0.1;

    // Subtract for negative indicators
    if (indicators.includes('loading-placeholder')) confidence -= 0.3;
    if (indicators.includes('script-data-source')) confidence -= 0.2;
    if (indicators.includes('spa-framework')) confidence -= 0.2;
    if (indicators.includes('client-side-scripts')) confidence -= 0.1;
    if (indicators.includes('minimal-content')) confidence -= 0.4;
    if (indicators.includes('empty-content')) confidence -= 0.3;
    if (indicators.includes('non-html-content')) confidence -= 0.5;

    // Heavy penalty for 404 pages - they need JavaScript
    if (is404Page) {
      confidence = Math.min(confidence, 0.2);
    }

    // Heavy penalty for script-data-source without other real content
    if (indicators.includes('script-data-source') &&
        !indicators.includes('structured-data') &&
        !indicators.includes('sku-pattern-found')) {
      confidence = Math.min(confidence, 0.3);
    }

    // Don't artificially inflate confidence - remove minimum threshold
    if (!hasStaticData && confidence > 0.7) {
      confidence = 0.7;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Clean text content by removing HTML tags and normalizing whitespace
   */
  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}