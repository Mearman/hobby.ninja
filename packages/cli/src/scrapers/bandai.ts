import * as cheerio from 'cheerio';
import { PageCache } from '../cache';
import { execFileNoThrow } from '@unnamed-gunpla-app/utils/execFileNoThrow';

export interface BandaiProduct {
  sku: string;
  name: string;
  price: string;
  category: string;
  grade: string;
  series: string;
  scale?: string;
  releaseDate?: string;
  imageUrl?: string;
  description?: string;
  specifications?: Record<string, string>;
  urls: {
    product?: string;
    image?: string;
  };
  metadata: {
    scrapedAt: string;
    source: 'bandai-official-store';
    currency: 'JPY';
  };
}

export interface BandaiScraperOptions {
  useCache?: boolean;
  timeout?: number;
  maxRetries?: number;
  concurrency?: number;
  cache?: PageCache;
  baseUrl?: string;
  headers?: Record<string, string>;
}

export class BandaiScraper {
  private options: Required<BandaiScraperOptions>;
  private cache?: PageCache;

  constructor(options: BandaiScraperOptions = {}) {
    this.options = {
      useCache: options.useCache ?? true,
      timeout: options.timeout ?? 30000,
      maxRetries: options.maxRetries ?? 3,
      concurrency: options.concurrency ?? 2,
      cache: options.cache,
      baseUrl: options.baseUrl ?? 'https://bandai-hobby.net',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GunplaScraper/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...options.headers,
      },
    };

    if (this.options.useCache && !options.cache) {
      this.cache = new PageCache({
        cacheDir: './.cache/bandai',
        ttl: 3600000, // 1 hour
        maxSize: 50 * 1024 * 1024, // 50MB
      });
    } else {
      this.cache = options.cache;
    }
  }

  async scrapeAllProducts(): Promise<BandaiProduct[]> {
    const startTime = Date.now();
    const allProducts: BandaiProduct[] = [];

    try {
      // Get all product categories
      const categories = await this.getCategories();

      // Scrape each category
      for (const category of categories) {
        const products = await this.scrapeCategory(category);
        allProducts.push(...products);
      }

      // Remove duplicates based on SKU
      const uniqueProducts = this.deduplicateProducts(allProducts);

      console.log(`✅ Scrape completed: ${uniqueProducts.length} unique products in ${Date.now() - startTime}ms`);
      return uniqueProducts;

    } catch (error) {
      console.error('❌ Error during scraping:', error);
      throw error;
    }
  }

  async scrapeCategory(category: string): Promise<BandaiProduct[]> {
    const products: BandaiProduct[] = [];
    let page = 1;

    while (true) {
      const url = `${this.options.baseUrl}/category/${category}?page=${page}`;
      const pageProducts = await this.scrapePage(url, category);

      if (pageProducts.length === 0) break;

      products.push(...pageProducts);
      page++;

      // Rate limiting
      await this.delay(1000);
    }

    return products;
  }

  private async scrapePage(url: string, category: string): Promise<BandaiProduct[]> {
    const cacheKey = `page-${Buffer.from(url).toString('base64')}`;

    // Try to get from cache
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Fetch page
    const html = await this.fetchWithRetry(url);
    const $ = cheerio.load(html);

    const products: BandaiProduct[] = [];

    $('.product-item, .item-box, .product-list-item').each((_, element) => {
      const $item = $(element);

      try {
        const product = this.parseProductItem($item, category);
        if (product) {
          products.push(product);
        }
      } catch (error) {
        console.warn('⚠️  Error parsing product item:', error);
      }
    });

    // Cache the results
    if (this.cache && products.length > 0) {
      await this.cache.set(cacheKey, products, 1800000); // 30 minutes
    }

    return products;
  }

  private parseProductItem($item: cheerio.Cheerio<any>, category: string): BandaiProduct | null {
    // Extract product name
    const name = this.cleanText($item.find('.product-name, .item-title, .product-title').first().text());
    if (!name) return null;

    // Extract SKU
    let sku = this.cleanText($item.find('.product-code, .item-sku, .product-sku, .jan-code').first().text());
    if (!sku) {
      // Generate SKU from name if not found
      sku = this.generateSkuFromName(name);
    }

    // Extract price
    const price = this.cleanText($item.find('.price, .product-price, .item-price').first().text());

    // Extract image URL
    let imageUrl = $item.find('.product-image img, .item-image img').first().attr('src');
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = new URL(imageUrl, this.options.baseUrl).href;
    }

    // Extract product URL
    let productUrl = $item.find('a').first().attr('href');
    if (productUrl && !productUrl.startsWith('http')) {
      productUrl = new URL(productUrl, this.options.baseUrl).href;
    }

    // Extract grade from category or product details
    const grade = this.extractGrade(name, category);

    // Extract series
    const series = this.extractSeries(name);

    // Extract description
    const description = this.cleanText($item.find('.product-description, .item-description').first().text());

    // Extract specifications if available
    const specifications = this.extractSpecifications($item);

    return {
      sku,
      name,
      price: price || 'Price not available',
      category: this.formatCategory(category),
      grade,
      series,
      imageUrl,
      description,
      specifications,
      urls: {
        product: productUrl,
        image: imageUrl,
      },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'bandai-official-store',
        currency: 'JPY',
      },
    };
  }

  private async scrapeProductDetail(sku: string): Promise<Partial<BandaiProduct> | null> {
    // Implementation for detailed product scraping
    // This would fetch individual product pages for more detailed information
    return null;
  }

  private async getCategories(): Promise<string[]> {
    const cacheKey = 'categories';

    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const categories = [
      'hg-high-grade',
      'mg-master-grade',
      'pg-perfect-grade',
      'rg-real-grade',
      'sdc-sd-crossover',
      'mb-mega-size',
      'fw-future-works',
      'other-grades',
    ];

    if (this.cache) {
      await this.cache.set(cacheKey, categories, 86400000); // 24 hours
    }

    return categories;
  }

  private deduplicateProducts(products: BandaiProduct[]): BandaiProduct[] {
    const seen = new Set<string>();
    const unique: BandaiProduct[] = [];

    for (const product of products) {
      const normalizedSku = this.normalizeSku(product.sku);
      if (!seen.has(normalizedSku)) {
        seen.add(normalizedSku);
        unique.push(product);
      }
    }

    return unique;
  }

  private normalizeSku(sku: string): string {
    return sku.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  private generateSkuFromName(name: string): string {
    // Generate a reasonable SKU from the product name
    const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const words = clean.split(/\s+/).slice(0, 3);
    const prefix = words.map(w => w.substring(0, 3).toUpperCase()).join('');
    const suffix = Date.now().toString(36).toUpperCase();
    return `BANDAI-${prefix}-${suffix}`;
  }

  private extractGrade(name: string, category: string): string {
    const gradePatterns = [
      /HG/i,
      /MG/i,
      /PG/i,
      /RG/i,
      /SD/i,
      /RE\/100/i,
      /MEGA/i,
      /FW/i,
    ];

    for (const pattern of gradePatterns) {
      if (pattern.test(name) || pattern.test(category)) {
        return pattern.source.replace(/[\/\\i]/g, '');
      }
    }

    return 'Unknown';
  }

  private extractSeries(name: string): string {
    const seriesPatterns = [
      { pattern: /Gundam/i, series: 'Mobile Suit Gundam' },
      { pattern: /Zaku/i, series: 'Mobile Suit Gundam' },
      { pattern: /Wing/i, series: 'Gundam Wing' },
      { pattern: /Seed/i, series: 'Gundam Seed' },
      { pattern: /00/i, series: 'Gundam 00' },
      { pattern: /Build/i, series: 'Gundam Build Fighters' },
      { pattern: /Iron/i, series: 'Gundam Iron Blooded Orphans' },
      { pattern: /Thunder/i, series: 'Gundam Thunderbolt' },
      { pattern: /Unicorn/i, series: 'Gundam Unicorn' },
      { pattern: /F91/i, series: 'Gundam F91' },
      { pattern: /Victory/i, series: 'Victory Gundam' },
      { pattern: /X/i, series: 'Gundam X' },
      { pattern: /Turn/i, series: 'Turn A Gundam' },
      { pattern: /AGE/i, series: 'Gundam AGE' },
    ];

    for (const { pattern, series } of seriesPatterns) {
      if (pattern.test(name)) {
        return series;
      }
    }

    return 'Gundam Series';
  }

  private extractSpecifications($item: cheerio.Cheerio<any>): Record<string, string> {
    const specs: Record<string, string> = {};

    $item.find('.spec-item, .product-spec, .specification').each((_, element) => {
      const $spec = $(element);
      const label = this.cleanText($spec.find('.spec-label, .spec-name').first().text());
      const value = this.cleanText($spec.find('.spec-value, .spec-data').first().text());

      if (label && value) {
        specs[label] = value;
      }
    });

    return specs;
  }

  private formatCategory(category: string): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]/g, ' ')
      .trim();
  }

  private async fetchWithRetry(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        // Use curl for more reliable fetching
        const result = await execFileNoThrow('curl', [
          '-s',
          '-L',
          '-m', String(Math.floor(this.options.timeout / 1000)),
          '-H', `User-Agent: ${this.options.headers['User-Agent']}`,
          '-H', `Accept: ${this.options.headers['Accept']}`,
          url,
        ]);

        if (result.success && result.stdout) {
          return result.stdout;
        } else {
          throw new Error(`curl failed: ${result.stderr}`);
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown fetch error');

        if (attempt < this.options.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.warn(`⚠️  Attempt ${attempt} failed, retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export convenience functions
export async function scrapeBandaiProducts(options?: BandaiScraperOptions): Promise<BandaiProduct[]> {
  const scraper = new BandaiScraper(options);
  return scraper.scrapeAllProducts();
}

export async function scrapeBandaiCategory(category: string, options?: BandaiScraperOptions): Promise<BandaiProduct[]> {
  const scraper = new BandaiScraper(options);
  return scraper.scrapeCategory(category);
}

export async function scrapeBandaiProductDetail(sku: string, options?: BandaiScraperOptions): Promise<Partial<BandaiProduct> | null> {
  const scraper = new BandaiScraper(options);
  return scraper.scrapeProductDetail(sku);
}