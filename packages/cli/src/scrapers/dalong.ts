import { execFileNoThrow } from "@unnamed-gunpla-app/utils/execFileNoThrow";
import * as cheerio from "cheerio";

import { PageCache } from "../cache";

export interface DalongProduct {
  sku: string;
  name: string;
  grade: string;
  series: string;
  scale?: string;
  releaseDate?: string;
  price?: string;
  description?: string;
  imageUrl?: string;
  reviewUrl?: string;
  kitType?: string;
  rating?: number;
  specifications?: Record<string, string>;
  metadata: {
    scrapedAt: string;
    source: "dalong-net";
  };
}

export interface DalongScraperOptions {
  useCache?: boolean;
  timeout?: number;
  maxRetries?: number;
  concurrency?: number;
  cache?: PageCache;
  baseUrl?: string;
  headers?: Record<string, string>;
}

export class DalongScraper {
	private options: Required<DalongScraperOptions>;
	private cache?: PageCache;

	constructor(options: DalongScraperOptions = {}) {
		this.options = {
			useCache: options.useCache ?? true,
			timeout: options.timeout ?? 30_000,
			maxRetries: options.maxRetries ?? 3,
			concurrency: options.concurrency ?? 2,
			cache: options.cache,
			baseUrl: options.baseUrl ?? "http://dalong.net",
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; DalongScraper/1.0)",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
				"Accept-Encoding": "gzip, deflate",
				"Connection": "keep-alive",
				...options.headers,
			},
		};

		if (this.options.useCache && !options.cache) {
			this.cache = new PageCache({
				cacheDir: "./.cache/dalong",
				ttl: 7_200_000, // 2 hours
				maxSize: 30 * 1024 * 1024, // 30MB
			});
		} else {
			this.cache = options.cache;
		}
	}

	async scrapeAllPages(): Promise<DalongProduct[]> {
		const allProducts: DalongProduct[] = [];

		try {
			// Get all kit categories from Dalong
			const categories = await this.getCategories();

			// Scrape each category
			for (const category of categories) {
				const products = await this.scrapeCategory(category);
				allProducts.push(...products);
			}

			// Remove duplicates
			const uniqueProducts = this.deduplicateProducts(allProducts);

			console.log(`✅ Dalong.net scraping completed: ${uniqueProducts.length} unique products`);
			return uniqueProducts;

		} catch (error) {
			console.error("❌ Error during Dalong.net scraping:", error);
			throw error;
		}
	}

	private async getCategories(): Promise<string[]> {
		const cacheKey = "dalong-categories";

		if (this.cache) {
			const cached = await this.cache.get(cacheKey);
			if (cached) return cached;
		}

		const categories = [
			"high-grade-hg",
			"master-grade-mg",
			"perfect-grade-pg",
			"real-grade-rg",
			"mega-size-model-msm",
			"super-deformed-sd",
			"other-grades",
			"accessories",
		];

		if (this.cache) {
			await this.cache.set(cacheKey, categories, 86_400_000); // 24 hours
		}

		return categories;
	}

	private async scrapeCategory(category: string): Promise<DalongProduct[]> {
		const products: DalongProduct[] = [];
		let page = 1;

		while (true) {
			const url = `${this.options.baseUrl}/category/${category}?page=${page}`;
			const pageProducts = await this.scrapePage(url, category);

			if (pageProducts.length === 0) break;

			products.push(...pageProducts);
			page++;

			// Rate limiting
			await this.delay(2000);
		}

		return products;
	}

	private async scrapePage(url: string, category: string): Promise<DalongProduct[]> {
		const cacheKey = `dalong-page-${Buffer.from(url).toString("base64")}`;

		// Try to get from cache
		if (this.cache) {
			const cached = await this.cache.get(cacheKey);
			if (cached) return cached;
		}

		// Fetch page
		const html = await this.fetchWithRetry(url);
		const $ = cheerio.load(html);

		const products: DalongProduct[] = [];

		$(".kit-review, .model-kit, .review-item").each((_, element) => {
			const $item = $(element);

			try {
				const product = this.parseProductItem($item, category);
				if (product) {
					products.push(product);
				}
			} catch (error) {
				console.warn("⚠️  Error parsing Dalong.net product item:", error);
			}
		});

		// Cache the results
		if (this.cache && products.length > 0) {
			await this.cache.set(cacheKey, products, 3_600_000); // 1 hour
		}

		return products;
	}

	private parseProductItem($item: cheerio.Cheerio<any>, category: string): DalongProduct | null {
		// Extract product name
		const name = this.cleanText($item.find(".kit-name, .model-name, .review-title").first().text());
		if (!name) return null;

		// Extract URL and generate SKU
		let reviewUrl = $item.find("a").first().attr("href");
		if (reviewUrl && !reviewUrl.startsWith("http")) {
			reviewUrl = new URL(reviewUrl, this.options.baseUrl).href;
		}

		// Generate SKU from URL or name
		const sku = this.extractSkuFromUrl(reviewUrl) || this.generateSkuFromName(name);

		// Extract grade from category or name
		const grade = this.extractGrade(name, category);

		// Extract image
		let imageUrl = $item.find(".kit-image img, .model-image img").first().attr("src");
		if (imageUrl && !imageUrl.startsWith("http")) {
			imageUrl = new URL(imageUrl, this.options.baseUrl).href;
		}

		// Extract description/review summary
		const description = this.cleanText($item.find(".review-summary, .kit-description, .model-info").first().text());

		// Extract release date
		const releaseDate = this.cleanText($item.find(".release-date, .kit-release").first().text());

		// Extract price
		const price = this.cleanText($item.find(".price, .kit-price").first().text());

		// Extract rating
		const rating = this.extractRating($item);

		// Extract scale
		const scale = this.extractScale(name);

		// Extract kit type
		const kitType = this.extractKitType(name, category);

		// Extract specifications
		const specifications = this.extractSpecifications($item);

		return {
			sku,
			name,
			grade,
			series: this.extractSeries(name),
			scale,
			releaseDate,
			price,
			description,
			imageUrl,
			reviewUrl,
			kitType,
			rating,
			specifications,
			metadata: {
				scrapedAt: new Date().toISOString(),
				source: "dalong-net",
			},
		};
	}

	private extractSkuFromUrl(url?: string): string | null {
		if (!url) return null;

		const match = url.match(/\/kit\/([^\/]+)/) || url.match(/\/review\/([^\/]+)/);
		return match ? match[1].toUpperCase().replaceAll(/[^A-Z0-9]/g, "") : null;
	}

	private generateSkuFromName(name: string): string {
		const clean = name.replaceAll(/[^a-zA-Z0-9\s]/g, "").trim();
		const words = clean.split(/\s+/).slice(0, 3);
		const prefix = words.map(w => w.slice(0, 3).toUpperCase()).join("");
		const suffix = Date.now().toString(36).toUpperCase();
		return `DALONG-${prefix}-${suffix}`;
	}

	private extractGrade(name: string, category: string): string {
		const gradePatterns = [
			/HG/i,
			/MG/i,
			/PG/i,
			/RG/i,
			/MSM/i,
			/SD/i,
		];

		for (const pattern of gradePatterns) {
			if (pattern.test(name) || pattern.test(category)) {
				return pattern.source.replaceAll(/[\/\\i]/g, "");
			}
		}

		return "Unknown";
	}

	private extractRating($item: cheerio.Cheerio<any>): number | undefined {
		const ratingText = this.cleanText($item.find(".rating, .kit-rating, .score").first().text());
		const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
		return ratingMatch ? Number.parseFloat(ratingMatch[1]) : undefined;
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
			{ pattern: /Iron/i, series: "Gundam Iron Blooded Orphans" },
			{ pattern: /Thunder/i, series: "Gundam Thunderbolt" },
			{ pattern: /Unicorn/i, series: "Gundam Unicorn" },
			{ pattern: /Narrative/i, series: "Gundam Narrative" },
			{ pattern: /F91/i, series: "Gundam F91" },
			{ pattern: /Victory/i, series: "Victory Gundam" },
			{ pattern: /Turn/i, series: "Turn A Gundam" },
			{ pattern: /ZZ/i, series: "Mobile Suit Zeta Gundam" },
			{ pattern: /CCA/i, series: "Char's Counterattack" },
		];

		for (const { pattern, series } of seriesPatterns) {
			if (pattern.test(name)) {
				return series;
			}
		}

		return "Gundam Series";
	}

	private extractKitType(name: string, category: string): string {
		if (name.includes("Metal")) return "Metal";
		if (name.includes("Clear")) return "Clear Color";
		if (name.includes("Titanium")) return "Titanium";
		if (name.includes("LED")) return "LED";
		if (name.includes("Sound")) return "Sound Unit";
		return "Standard";
	}

	private extractSpecifications($item: cheerio.Cheerio<any>): Record<string, string> {
		const specs: Record<string, string> = {};

		$item.find(".spec-item, .kit-spec, .model-spec").each((_, element) => {
			const $spec = $(element);
			const label = this.cleanText($spec.find(".spec-label, .spec-name").first().text());
			const value = this.cleanText($spec.find(".spec-value, .spec-data").first().text());

			if (label && value) {
				specs[label] = value;
			}
		});

		return specs;
	}

	private deduplicateProducts(products: DalongProduct[]): DalongProduct[] {
		const seen = new Set<string>();
		const unique: DalongProduct[] = [];

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
					const delay = Math.min(3000 * Math.pow(2, attempt - 1), 20_000);
					console.warn(`⚠️  Dalong.net attempt ${attempt} failed, retrying in ${delay}ms...`);
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
export async function scrapeDalongProducts(options?: DalongScraperOptions): Promise<DalongProduct[]> {
	const scraper = new DalongScraper(options);
	return scraper.scrapeAllPages();
}

export async function scrapeDalongCategory(category: string, options?: DalongScraperOptions): Promise<DalongProduct[]> {
	const scraper = new DalongScraper(options);
	return scraper.scrapeCategory(category);
}