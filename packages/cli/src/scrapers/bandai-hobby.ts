import * as cheerio from 'cheerio';
import { z } from 'zod';
import { BaseScraper } from './base-scraper.js';
import { ProductData } from '../types/product-data.js';

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
    const price = this.extractPrice($);
    const description = this.extractDescription($);
    const specifications = this.extractSpecifications($);
    const images = this.extractImages($);
    const categories = this.extractCategories($);

    const productData: ProductData = {
      id: this.generateId('bandai-hobby', sku),
      name,
      sku,
      price: price || undefined,
      description: description || undefined,
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
        completeness: this.calculateCompleteness({ name, sku, price, description, specifications, images, categories }),
        confidence: this.calculateConfidence({ name, sku, price, description, specifications, images, categories }),
        validationErrors: [],
        lastValidated: Date.now()
      }
    };

    return productData;
  }

  private extractProductName($: cheerio.CheerioAPI): string {
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

  private extractSku($: cheerio.CheerioAPI, url: string): string {
    // Try to extract SKU from URL path
    const urlMatch = url.match(/\/([^\/]+)\/?$/);
    if (urlMatch) {
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

  private extractPrice($: cheerio.CheerioAPI) {
    const priceSelectors = [
      '.price',
      '.product-price',
      '.item-price',
      '.price-current',
      '.amount'
    ];

    for (const selector of priceSelectors) {
      const price = this.extractPrice($, selector);
      if (price) {
        return {
          amount: price.amount,
          currency: price.currency,
          originalText: price.originalText,
          includesTax: true // Assume Japanese prices include tax
        };
      }
    }

    return null;
  }

  private extractDescription($: cheerio.CheerioAPI): string {
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

  private extractSpecifications($: cheerio.CheerioAPI): Record<string, any> {
    const specs: Record<string, any> = {};

    // Look for specification tables or lists
    const specTable = $('.specifications table, .spec-table, .product-specs table');

    if (specTable.length > 0) {
      specTable.find('tr').each((_, row) => {
        const $row = cheerio.load(row);
        const label = this.extractTextContent($row, 'th, .spec-label, .label');
        const value = this.extractTextContent($row, 'td, .spec-value, .value');

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
    individualSpecs.each((_, element) => {
      const $element = cheerio.load(element);
      const label = this.extractTextContent($element, '.spec-label, .label');
      const value = this.extractTextContent($element, '.spec-value, .value');

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
    if (numberMatch) {
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
    return unitMatch ? unitMatch[1] : undefined;
  }

  private extractImages($: cheerio.CheerioAPI) {
    const images = [];

    $('.product-image, .item-image, .main-image img, .gallery-image img, .product-image img').each((_, element) => {
      const $img = cheerio.load(element);
      const src = $img.attr('src') || $img.attr('data-src');
      const alt = $img.attr('alt') || '';
      const width = parseInt($img.attr('width') || '0', 10);
      const height = parseInt($img.attr('height') || '0', 10);

      if (src) {
        images.push({
          url: src.startsWith('http') ? src : `${this.baseUrl}${src}`,
          alt,
          width,
          height,
          type: this.determineImageType($img)
        });
      }
    });

    return images;
  }

  private determineImageType($img: cheerio.CheerioAPI): 'main' | 'gallery' | 'thumbnail' | 'box' {
    const classes = $img.attr('class') || '';

    if (classes.includes('main') || classes.includes('primary')) {
      return 'main';
    } else if (classes.includes('gallery')) {
      return 'gallery';
    } else if (classes.includes('thumbnail') || classes.includes('thumb')) {
      return 'thumbnail';
    } else if (classes.includes('box')) {
      return 'box';
    }

    return 'gallery';
  }

  private extractCategories($: cheerio.CheerioAPI): string[] {
    const categories = [];

    // Look for breadcrumb or category information
    $('.breadcrumb a, .category a, .product-category a, .tag a').each((_, element) => {
      const $a = cheerio.load(element);
      const category = this.extractTextContent($a);
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

  private calculateCompleteness(data: Partial<ProductData>): number {
    const requiredFields = ['name', 'sku'];
    const optionalFields = ['price', 'description', 'images'];

    let completeness = 0;
    const totalFields = requiredFields.length + optionalFields.length;

    // Required fields count for 60% of completeness
    requiredFields.forEach(field => {
      if (data[field as keyof ProductData]) completeness += 0.6 / requiredFields.length;
    });

    // Optional fields count for 40% of completeness
    optionalFields.forEach(field => {
      if (data[field as keyof ProductData]) completeness += 0.4 / optionalFields.length;
    });

    return Math.min(completeness, 1.0);
  }

  private calculateConfidence(data: Partial<ProductData>): number {
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