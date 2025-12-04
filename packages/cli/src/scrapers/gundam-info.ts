import { execFileNoThrow } from "@unnamed-gunpla-app/utils/execFileNoThrow";
import * as cheerio from "cheerio";

import { PageCache } from "../cache";

export interface GundamInfoProduct {
  sku: string;
  name: string;
  grade: string;
  series: string;
  scale?: string;
  manufacturer?: string;
  releaseDate?: string;
  price?: string;
  description?: string;
  imageUrl?: string;
  pageUrl?: string;
  kitType?: string;
  accessories?: string[];
  metadata: {
    scrapedAt: string;
    source: "gundam-info";
  };
}

export interface GundamInfoScraperOptions {
  useCache?: boolean;
  timeout?: number;
  maxRetries?: number;
  concurrency?: number;
  cache?: PageCache;
  baseUrl?: string;
  headers?: Record<string, string>;
}

export class GundamInfoScraper {
	private options: Required<GundamInfoScraperOptions>;
	private cache?: PageCache;

	constructor(options: GundamInfoScraperOptions = {}) {
		this.options = {
			useCache: options.useCache ?? true,
			timeout: options.timeout ?? 30_000,
			maxRetries: options.maxRetries ?? 3,
			concurrency: options.concurrency ?? 2,
			cache: options.cache,
			baseUrl: options.baseUrl ?? "https://gundam.info",
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; GundamInfoScraper/1.0)",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
				"Accept-Encoding": "gzip, deflate",
				"Connection": "keep-alive",
				...options.headers,
			},
		};

		if (this.options.useCache && !options.cache) {
			this.cache = new PageCache({
				cacheDir: "./.cache/gundam-info",
				ttl: 7_200_000, // 2 hours
				maxSize: 50 * 1024 * 1024, // 50MB
			});
		} else {
			this.cache = options.cache;
		}
	}

	async scrapeAllPages(): Promise<GundamInfoProduct[]> {
		const allProducts: GundamInfoProduct[] = [];

		try {
			// Get all kit categories
			const categories = await this.getCategories();

			// Scrape each category
			for (const category of categories) {
				const products = await this.scrapeCategory(category);
				allProducts.push(...products);
			}

			// Remove duplicates
			const uniqueProducts = this.deduplicateProducts(allProducts);

			console.log(`✅ Gundam.info scraping completed: ${uniqueProducts.length} unique products`);
			return uniqueProducts;

		} catch (error) {
			console.error("❌ Error during Gundam.info scraping:", error);
			throw error;
		}
	}

	private async getCategories(): Promise<string[]> {
		const cacheKey = "gundam-info-categories";

		if (this.cache) {
			const cached = await this.cache.get(cacheKey);
			if (cached) return cached;
		}

		const categories = [
			"high-grade",
			"master-grade",
			"perfect-grade",
			"real-grade",
			"metal-build",
			"entry-grade",
			"re-100",
			"mega-size",
			"super-deformed",
			"uc-hardgraph",
			"advanced-ms",
			"fix-figuration",
			"ms-girl",
		];

		if (this.cache) {
			await this.cache.set(cacheKey, categories, 86_400_000); // 24 hours
		}

		return categories;
	}

	private async scrapeCategory(category: string): Promise<GundamInfoProduct[]> {
		const products: GundamInfoProduct[] = [];
		let page = 1;

		while (true) {
			const url = `${this.options.baseUrl}/category/${category}?page=${page}`;
			const pageProducts = await this.scrapePage(url, category);

			if (pageProducts.length === 0) break;

			products.push(...pageProducts);
			page++;

			// Rate limiting
			await this.delay(1500);
		}

		return products;
	}

	private async scrapePage(url: string, category: string): Promise<GundamInfoProduct[]> {
		const cacheKey = `gundam-info-page-${Buffer.from(url).toString("base64")}`;

		// Try to get from cache
		if (this.cache) {
			const cached = await this.cache.get(cacheKey);
			if (cached) return cached;
		}

		// Fetch page
		const html = await this.fetchWithRetry(url);
		const $ = cheerio.load(html);

		const products: GundamInfoProduct[] = [];

		$(".kit-item, .product-item, .entry-item").each((_, element) => {
			const $item = $(element);

			try {
				const product = this.parseProductItem($item, category);
				if (product) {
					products.push(product);
				}
			} catch (error) {
				console.warn("⚠️  Error parsing Gundam.info product item:", error);
			}
		});

		// Cache the results
		if (this.cache && products.length > 0) {
			await this.cache.set(cacheKey, products, 3_600_000); // 1 hour
		}

		return products;
	}

	private parseProductItem($item: cheerio.Cheerio<any>, category: string): GundamInfoProduct | null {
		// Extract product name
		const name = this.cleanText($item.find(".kit-name, .product-name, .entry-title").first().text());
		if (!name) return null;

		// Extract URL and generate SKU
		let pageUrl = $item.find("a").first().attr("href");
		if (pageUrl && !pageUrl.startsWith("http")) {
			pageUrl = new URL(pageUrl, this.options.baseUrl).href;
		}

		// Generate SKU from URL or name
		const sku = this.extractSkuFromUrl(pageUrl) || this.generateSkuFromName(name);

		// Extract grade from category or name
		const grade = this.extractGrade(name, category);

		// Extract image
		let imageUrl = $item.find(".kit-image img, .product-image img").first().attr("src");
		if (imageUrl && !imageUrl.startsWith("http")) {
			imageUrl = new URL(imageUrl, this.options.baseUrl).href;
		}

		// Extract description
		const description = this.cleanText($item.find(".kit-description, .product-description").first().text());

		// Extract release date
		const releaseDate = this.cleanText($item.find(".release-date, .kit-release").first().text());

		// Extract price
		const price = this.cleanText($item.find(".price, .kit-price").first().text());

		// Extract scale
		const scale = this.extractScale(name);

		// Extract manufacturer
		const manufacturer = "Bandai";

		// Extract kit type
		const kitType = this.extractKitType(name, category);

		// Extract accessories
		const accessories = this.extractAccessories($item);

		return {
			sku,
			name,
			grade,
			series: this.extractSeries(name),
			scale,
			manufacturer,
			releaseDate,
			price,
			description,
			imageUrl,
			pageUrl,
			kitType,
			accessories,
			metadata: {
				scrapedAt: new Date().toISOString(),
				source: "gundam-info",
			},
		};
	}

	private extractSkuFromUrl(url?: string): string | null {
		if (!url) return null;

		const match = url.match(/\/kit\/([^\/]+)/) || url.match(/\/product\/([^\/]+)/);
		return match ? match[1].toUpperCase().replaceAll(/[^A-Z0-9]/g, "") : null;
	}

	private generateSkuFromName(name: string): string {
		const clean = name.replaceAll(/[^a-zA-Z0-9\s]/g, "").trim();
		const words = clean.split(/\s+/).slice(0, 3);
		const prefix = words.map(w => w.slice(0, 3).toUpperCase()).join("");
		const suffix = Date.now().toString(36).toUpperCase();
		return `GUNDAM-INFO-${prefix}-${suffix}`;
	}

	private extractGrade(name: string, category: string): string {
		const gradePatterns = [
			/HG/i,
			/MG/i,
			/PG/i,
			/RG/i,
			/EG/i,
			/MB/i,
			/RE\/?100/i,
			/MEGA/i,
			/SD/i,
			/UC/i,
			/AMS/i,
			/FIX/i,
			/MS/i,
		];

		for (const pattern of gradePatterns) {
			if (pattern.test(name) || pattern.test(category)) {
				return pattern.source.replaceAll(/[\/\\i]/g, "");
			}
		}

		return "Unknown";
	}

	private extractScale(name: string): string | undefined {
		const scalePatterns = [
			/1\/60/i,
			/1\/100/i,
			/1\/144/i,
			/1\/48/i,
			/1\/35/i,
			/1\/72/i,
			/1\/200/i,
			/1\/550/i,
			/1\/1200/i,
			/1\/2400/i,
			/ND/i,
		];

		for (const pattern of scalePatterns) {
			const match = name.match(pattern);
			if (match) {
				return match[0];
			}
		}

		return undefined;
	}

	private extractSeries(name: string): string {
		const seriesPatterns = [
			{ pattern: /Gundam/i, series: "Mobile Suit Gundam" },
			{ pattern: /Zaku/i, series: "Mobile Suit Gundam" },
			{ pattern: /Wing/i, series: "Gundam Wing" },
			{ pattern: /X/i, series: "Gundam X" },
			{ pattern: /Seed/i, series: "Gundam Seed" },
			{ pattern: /Destiny/i, series: "Gundam Seed Destiny" },
			{ pattern: /00/i, series: "Gundam 00" },
			{ pattern: /Age/i, series: "Gundam AGE" },
			{ pattern: /Build/i, series: "Gundam Build Fighters" },
			{ pattern: /Try/i, series: "Gundam Build Fighters Try" },
			{ pattern: /Divers/i, series: "Gundam Build Divers" },
			{ pattern: /Iron/i, series: "Gundam Iron Blooded Orphans" },
			{ pattern: /Thunder/i, series: "Gundam Thunderbolt" },
			{ pattern: /Unicorn/i, series: "Gundam Unicorn" },
			{ pattern: /Narrative/i, series: "Gundam Narrative" },
			{ pattern: /F91/i, series: "Gundam F91" },
			{ pattern: /Victory/i, series: "Victory Gundam" },
			{ pattern: /Turn/i, series: "Turn A Gundam" },
			{ pattern: /G/i, series: "Gundam G" },
			{ pattern: /ZZ/i, series: "Mobile Suit Zeta Gundam" },
			{ pattern: /CCA/i, series: "Char's Counterattack" },
			{ pattern: /08th/i, series: "08th MS Team" },
			{ pattern: /War/i, series: "Mobile Suit Gundam: The 08th MS Team" },
			{ pattern: /Stardust/i, series: "Stardust Memory" },
		];

		for (const { pattern, series } of seriesPatterns) {
			if (pattern.test(name)) {
				return series;
			}
		}

		return "Gundam Series";
	}

	private extractKitType(name: string, category: string): string {
		if (name.includes("Water Slide")) return "Water Slide Series";
		if (name.includes("Metal")) return "Metal Build";
		if (name.includes("Clear")) return "Clear Color";
		if (name.includes("Titanium")) return "Titanium Finish";
		if (name.includes("PBandai")) return "Premium Bandai";
		return "Standard Kit";
	}

	private extractAccessories($item: cheerio.Cheerio<any>): string[] {
		const accessories: string[] = [];

		$item.find(".accessories-list li, .kit-accessories li").each((_, element) => {
			const accessory = this.cleanText($(element).text());
			if (accessory) {
				accessories.push(accessory);
			}
		});

		return accessories;
	}

	private deduplicateProducts(products: GundamInfoProduct[]): GundamInfoProduct[] {
		const seen = new Set<string>();
		const unique: GundamInfoProduct[] = [];

		for (const product of products) {
			const normalizedSku = product.sku.toUpperCase();
			if (!seen.has(normalizedSku)) {
				seen.add(normalizedSku);
				unique.push(product);
			}
		}

		return unique;
	}

	private cleanText(text: string): string {
		return text
			.replaceAll(/\s+/g, " ")
			.replaceAll(/[\r\n\t]/g, " ")
			.trim();
	}

	private async fetchWithRetry(url: string): Promise<string> {
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
			try {
				const result = await execFileNoThrow("curl", [
					"-s",
					"-L",
					"-m", String(Math.floor(this.options.timeout / 1000)),
					"-H", `User-Agent: ${this.options.headers["User-Agent"]}`,
					"-H", `Accept: ${this.options.headers["Accept"]}`,
					url,
				]);

				if (result.success && result.stdout) {
					return result.stdout;
				} else {
					throw new Error(`curl failed: ${result.stderr}`);
				}

			} catch (error) {
				lastError = error instanceof Error ? error : new Error("Unknown fetch error");

				if (attempt < this.options.maxRetries) {
					const delay = Math.min(2000 * Math.pow(2, attempt - 1), 15_000);
					console.warn(`⚠️  Gundam.info attempt ${attempt} failed, retrying in ${delay}ms...`);
					await this.delay(delay);
				}
			}
		}

		throw lastError || new Error("Max retries exceeded");
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

// Export convenience functions
export async function scrapeGundamInfoProducts(options?: GundamInfoScraperOptions): Promise<GundamInfoProduct[]> {
	const scraper = new GundamInfoScraper(options);
	return scraper.scrapeAllPages();
}

export async function scrapeGundamInfoCategory(category: string, options?: GundamInfoScraperOptions): Promise<GundamInfoProduct[]> {
	const scraper = new GundamInfoScraper(options);
	return scraper.scrapeCategory(category);
}