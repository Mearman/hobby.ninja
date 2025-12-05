import * as cheerio from 'cheerio';
import { BaseScraper } from './base-scraper.js';
import { ProductData, ProductImage, PriceInfo } from '../types/product-data.js';

export class BandaiHobbyScraper extends BaseScraper {
  constructor() {
    super({
      baseUrl: 'https://bandai-hobby.net',
      userAgent: 'GundamDataScraper/1.0 (compatible; +https://bandai-hobby.net)',
      delayMs: 2000,
      cacheEnabled: true
    });
  }

  async extractFromPage(html: string, url: string): Promise<ProductData> {
    const $ = cheerio.load(html);
    const languageDetection = this.parseLanguage(html, url);

    // Extract basic product information
    const name = this.extractProductName($);
    const sku = this.extractSku($, url);
    const price = this.extractPriceInfo($);
    const description = this.extractDescription($);
    const specifications = this.extractSpecifications($);
    const images = this.extractImages($);
    const categories = this.extractCategories($);

    const productData: ProductData = {
      id: this.generateId('bandai-hobby', sku),
      name,
      sku,
      specifications,
      detectedLanguage: languageDetection,
      source: {
        domain: 'bandai-hobby.net',
        section: 'gunpla',
        pageType: this.determinePageType(url),
        version: '1.0'
      },
      url,
      extractedAt: Date.now(),
      images,
      categories,
      extraction: {
        method: 'cheerio',
        renderingType: 'static',
        extractedAt: Date.now(),
        extractionDuration: 0,
        requiresJavaScript: false
      },
      quality: {
        completeness: this.calculateCompleteness({
          ...(name && { name }),
          ...(sku && { sku }),
          ...(price && { price }),
          ...(description && { description }),
          ...(specifications && { specifications }),
          ...(images && { images })
        }),
        confidence: this.calculateConfidence({
          ...(name && { name }),
          ...(sku && { sku }),
          ...(price && { price }),
          ...(description && { description }),
          ...(specifications && { specifications }),
          ...(images && { images })
        }),
        validationErrors: [],
        lastValidated: Date.now()
      }
    };

    // Add optional properties only if they exist
    if (price !== undefined) {
      productData.price = price;
    }
    if (description !== undefined && description !== '') {
      productData.description = description;
    }

    return productData;
  }

  private extractProductName($: cheerio.Root): string {
    // Try multiple selectors for product name
    const selectors = [
      '.product-title',
      '.item-title',
      '.title h1',
      '.main-title',
      'h1',
      '.product-name',
      '[data-product-name]'
    ];

    for (const selector of selectors) {
      const name = this.extractTextContent($, selector);
      if (name) {
        return name;
      }
    }

    return '';
  }

  private extractSku($: cheerio.Root, url: string): string {
    // Try to extract SKU from URL path
    const urlMatch = url.match(/\/([^\/]+)\/?$/);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }

    // Try to find SKU in the page content
    const skuSelectors = [
      '.product-sku',
      '.item-sku',
      '.sku',
      '.model-number',
      '[data-sku]'
    ];

    for (const selector of skuSelectors) {
      const sku = this.extractTextContent($, selector);
      if (sku) {
        return sku;
      }
    }

    return '';
  }

  private extractPriceInfo($: cheerio.Root): PriceInfo | undefined {
    const priceSelectors = [
      '.price',
      '.product-price',
      '.item-price',
      '.price-current',
      '.amount'
    ];

    for (const selector of priceSelectors) {
      const price = super.extractPrice($, selector);
      if (price) {
        return {
          amount: price.amount,
          currency: price.currency,
          originalText: price.originalText,
          includesTax: true // Assume Japanese prices include tax
        };
      }
    }

    return undefined;
  }

  private extractDescription($: cheerio.Root): string {
    const selectors = [
      '.product-description',
      '.item-description',
      '.description',
      '.product-details',
      '.details'
    ];

    for (const selector of selectors) {
      const description = this.extractTextContent($, selector);
      if (description && description.length > 20) {
        return description;
      }
    }

    return '';
  }

  private extractSpecifications($: cheerio.Root): Record<string, any> {
    const specs: Record<string, any> = {};

    // Look for specification tables or lists
    const specTable = $('.specifications table, .spec-table, .product-specs table');

    if (specTable.length > 0) {
      specTable.find('tr').each((_: number, row: any) => {
        const $row = $(row);
        const label = this.extractTextContentFromElement($row.find('th, .spec-label, .label'));
        const value = this.extractTextContentFromElement($row.find('td, .spec-value, .value'));

        if (label && value) {
          specs[this.normalizeSpecKey(label)] = {
            value: this.parseSpecValue(value),
            unit: this.extractUnit(value),
            originalText: value
          };
        }
      });
    }

    // Look for individual spec items
    const individualSpecs = $('.spec-item, .product-spec');
    individualSpecs.each((_: number, element: any) => {
      const $element = $(element);
      const label = this.extractTextContentFromElement($element.find('.spec-label, .label'));
      const value = this.extractTextContentFromElement($element.find('.spec-value, .value'));

      if (label && value) {
        specs[this.normalizeSpecKey(label)] = {
          value: this.parseSpecValue(value),
          unit: this.extractUnit(value),
          originalText: value
        };
      }
    });

    return specs;
  }

  private normalizeSpecKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_');
  }

  private parseSpecValue(value: string): string | number | boolean {
    // Try to parse as number first
    const numberMatch = value.match(/([\d,]+(?:\.\d+)?)/);
    if (numberMatch && numberMatch[1]) {
      return parseFloat(numberMatch[1].replace(/,/g, ''));
    }

    // Try to parse as boolean
    if (value.toLowerCase() === 'yes' || value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'no' || value.toLowerCase() === 'false') {
      return false;
    }

    // Return as string
    return value;
  }

  private extractUnit(value: string): string | undefined {
    const unitMatch = value.match(/(mm|cm|m|g|kg|%|deg|°)/);
    return unitMatch?.[1] || undefined;
  }

  private extractImages($: cheerio.Root): ProductImage[] {
    const images: ProductImage[] = [];

    $('.product-image, .item-image, .main-image img, .gallery-image img, .product-image img').each((_: number, element: any) => {
      const $element = $(element);
      const src = this.extractAttributeFromElement($element, 'src') || this.extractAttributeFromElement($element, 'data-src') || '';
      const alt = this.extractAttributeFromElement($element, 'alt') || '';
      const width = parseInt(this.extractAttributeFromElement($element, 'width') || '0', 10);
      const height = parseInt(this.extractAttributeFromElement($element, 'height') || '0', 10);

      if (src) {
        const image: ProductImage = {
          url: src.startsWith('http') ? src : `${this.baseUrl}${src}`,
          alt,
          type: 'gallery'
        };
        if (width !== 0) {
          image.width = width;
        }
        if (height !== 0) {
          image.height = height;
        }
        images.push(image);
      }
    });

    return images;
  }

  
  private extractCategories($: cheerio.Root): string[] {
    const categories: string[] = [];

    // Look for breadcrumb or category information
    $('.breadcrumb a, .category a, .product-category a, .tag a').each((_: number, element: any) => {
      const category = this.extractTextContentFromElement($(element));
      if (category) {
        categories.push(category);
      }
    });

    // Remove duplicates while preserving order
    return [...new Set(categories)];
  }

  private determinePageType(url: string): 'listing' | 'detail' | 'variant' {
    if (url.includes('/category/') || url.includes('/list/')) {
      return 'listing';
    } else if (url.includes('/product/') || url.includes('/item/')) {
      return 'detail';
    } else {
      return 'variant';
    }
  }

  private calculateCompleteness(data: { name?: string; sku?: string; price?: PriceInfo; description?: string; specifications?: Record<string, any>; images?: ProductImage[]; }): number {
    const requiredFields = ['name', 'sku'];
    const optionalFields = ['price', 'description', 'images'];

    let completeness = 0;

    // Required fields count for 60% of completeness
    requiredFields.forEach(field => {
      if (data[field as keyof typeof data]) completeness += 0.6 / requiredFields.length;
    });

    // Optional fields count for 40% of completeness
    optionalFields.forEach(field => {
      if (data[field as keyof typeof data]) completeness += 0.4 / optionalFields.length;
    });

    return Math.min(completeness, 1.0);
  }

  private calculateConfidence(data: { name?: string; sku?: string; price?: PriceInfo; description?: string; specifications?: Record<string, any>; images?: ProductImage[]; }): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on data completeness
    if (data.name && data.name.length > 0) confidence += 0.1;
    if (data.sku && data.sku.length > 0) confidence += 0.1;
    if (data.price) confidence += 0.1;
    if (data.description && data.description.length > 50) confidence += 0.1;
    if (data.images && data.images.length > 0) confidence += 0.1;
    if (data.specifications && Object.keys(data.specifications).length > 0) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }
}