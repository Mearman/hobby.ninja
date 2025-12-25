/**
 * P-Bandai US List Parser (Hybrid Approach)
 * Fetches and parses search results from p-bandai.com/us
 *
 * Uses a hybrid approach for optimal speed:
 * 1. Playwright once to get session tokens (bypass bot detection)
 * 2. Direct HTTP fetch for subsequent pages (fast!)
 * 3. Extract embedded product JSON from SSR'd HTML (no JS execution needed)
 *
 * P-Bandai US uses Nuxt.js SSR - products are embedded in the HTML as JSON,
 * not fetched via separate API calls.
 *
 * Example URL: https://p-bandai.com/us/search?limit=40&offset=0&sortType=NewArrival&_f_brands=06-0037
 *
 * Output paths:
 * - Data: data/src/pbandai/en/items/{id}.json
 * - Index: data/src/pbandai/en/index.json
 * - Assets: assets/pbandai/en/items/{id}/
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { load, type CheerioAPI } from "cheerio";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import { computeBufferHash, writeJsonIfChanged } from "../utils/file-utils.js";
import { ImageHashIndex } from "../utils/image-utils.js";

/** Image entry matching main item structure */
export interface PBandaiUSImage {
	/** Display order (1-based) */
	order: number;
	/** Original source URL (optional - may be omitted after download) */
	src?: string;
	/** Local path relative to assets root */
	path: string;
	/** MD5 hash of image file contents */
	hash?: string;
}

/** Base item data */
export interface PBandaiUSListItem {
	/** P-Bandai US item ID (e.g., "F2525021002") */
	id: string;
	type: "pbandai-us-item";
	/** Localized product name */
	name: {
		en: string;
	};
	/** Price information - undefined if no price available */
	price?: {
		amount: number;
		currency: "USD";
		taxIncluded: boolean;
	};
	/** Product images */
	images: PBandaiUSImage[];
	/** Item page URL */
	sourceUrl: string;
}

/** Metadata for an item stored in index */
export interface PBandaiUSItemMeta {
	/** When this item was first discovered */
	discoveredAt: string;
	/** When this item was last updated */
	updatedAt: string;
}

/** Index file structure with per-item metadata (lexically ordered by ID) */
export type PBandaiUSIndex = Record<string, PBandaiUSItemMeta>;


/** Parser options */
export interface PBandaiUSListParserOptions {
	/** Brand filter ID (default: "06-0037" for Gundam) */
	brandId?: string;
	/** Items per page (default: 40, max: 40) */
	limit?: number;
	/** Maximum pages to fetch (default: unlimited) */
	maxPages?: number;
	/** Delay between page fetches in ms (default: 2000) */
	pageDelay?: number;
	/** Delay between image downloads in ms (default: 500) */
	imageDelay?: number;
	/** Skip image downloads (default: false) */
	skipImages?: boolean;
	/** Only fetch new items not in index (default: false) */
	incrementalOnly?: boolean;
}

/** Parse result for a single page */
interface PageParseResult {
	items: PBandaiUSListItem[];
	totalResults: number;
	hasMore: boolean;
	needsPlaywright?: boolean;
}

/** Session tokens captured from Playwright */
interface SessionTokens {
	cookies: string;
	csrfToken?: string;
}

/** Embedded product data structure from Nuxt SSR */
interface EmbeddedProduct {
	areaProductNo?: string;
	productCode: string;
	areaCode?: string;
	productName?: {
		en?: string;
		ja?: string;
	};
	productType?: string;
	fixedPrice?: boolean;
	fixedListPrice?: {
		amount?: number;
		currency?: string;
	};
	productImages?: Array<{
		fileUrl?: string;
		mediaType?: string;
		altText?: string;
		width?: number;
		height?: number;
	}>;
	shopName?: {
		en?: string;
	};
}

export class PBandaiUSListParser {
	private browser: Browser | null = null;
	private context: BrowserContext | null = null;
	private page: Page | null = null;
	private sessionTokens: SessionTokens | null = null;
	private hashIndex: ImageHashIndex | null = null;

	private readonly dataDir: string;
	private readonly assetsDir: string;
	private readonly indexPath: string;

	/** User agent string for HTTP requests */
	private readonly userAgent =
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

	constructor(
		private readonly projectRoot: string = process.cwd(),
	) {
		this.dataDir = path.join(projectRoot, "data/src/pbandai/en/items");
		this.assetsDir = path.join(projectRoot, "assets/pbandai/en/items");
		this.indexPath = path.join(projectRoot, "data/src/pbandai/en/index.json");
	}

	/**
	 * Set the hash index for image deduplication
	 * Item assets are authoritative - P-Bandai images will be deduplicated against them
	 */
	setHashIndex(hashIndex: ImageHashIndex): void {
		this.hashIndex = hashIndex;
	}

	/**
	 * Initialize browser with anti-detection measures and capture session tokens
	 * Uses Playwright once to bypass bot detection and get session cookies
	 */
	async init(): Promise<void> {
		console.log("Initializing browser for session token capture...");

		this.browser = await chromium.launch({
			headless: true,
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-blink-features=AutomationControlled",
				"--disable-infobars",
				"--window-size=1920,1080",
			],
		});

		this.context = await this.browser.newContext({
			userAgent: this.userAgent,
			viewport: { width: 1920, height: 1080 },
			locale: "en-US",
			timezoneId: "America/New_York",
			extraHTTPHeaders: {
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.9",
				"Cache-Control": "no-cache",
				Pragma: "no-cache",
			},
		});

		// Remove webdriver detection
		await this.context.addInitScript(() => {
			Object.defineProperty(navigator, "webdriver", {
				get() {
					return;
				},
			});
			// @ts-expect-error - removing chrome detection
			globalThis.chrome = { runtime: {} };
		});

		this.page = await this.context.newPage();

		// Visit the search page once to get session tokens
		console.log("Visiting P-Bandai to capture session tokens...");
		await this.page.goto("https://p-bandai.com/us/search?limit=1&offset=0&sortType=NewArrival&_f_brands=06-0037", {
			waitUntil: "domcontentloaded",
			timeout: 60_000,
		});

		// Wait for content to load
		await this.page.waitForTimeout(5000);

		// Capture cookies
		const cookies = await this.context.cookies();
		const pbandaiCookies = cookies
			.filter((c) => c.domain.includes("p-bandai.com"))
			.map((c) => `${c.name}=${c.value}`)
			.join("; ");

		// Try to extract CSRF token from page
		let csrfToken: string | undefined;
		try {
			const html = await this.page.content();
			const csrfMatch = /csrf[_-]?token["']?\s*[:=]\s*["']([^"']+)["']/i.exec(html);
			if (csrfMatch) {
				csrfToken = csrfMatch[1];
			}
		} catch {
			// CSRF token optional
		}

		this.sessionTokens = {
			cookies: pbandaiCookies,
			csrfToken,
		};

		console.log("Session tokens captured successfully");
		console.log(`  Cookies: ${pbandaiCookies.length > 0 ? "✓" : "✗"}`);
		console.log(`  CSRF Token: ${csrfToken ? "✓" : "N/A"}`);
	}

	/**
	 * Close browser
	 */
	async close(): Promise<void> {
		await this.browser?.close();
		this.browser = null;
		this.context = null;
		this.page = null;
	}

	/**
	 * Run the full list scrape
	 */
	async scrape(options: PBandaiUSListParserOptions = {}): Promise<{
		newItems: number;
		updatedItems: number;
		totalItems: number;
		imagesDownloaded: number;
	}> {
		const {
			brandId = "06-0037",
			limit = 40,
			maxPages,
			pageDelay = 2000,
			imageDelay = 500,
			skipImages = false,
			incrementalOnly = false,
		} = options;

		// Ensure directories exist
		await mkdir(this.dataDir, { recursive: true });
		await mkdir(this.assetsDir, { recursive: true });

		// Load existing index
		const existingIndex = await this.loadIndex();
		const existingIds = new Set(Object.keys(existingIndex ?? {}));

		let offset = 0;
		let pageNum = 0;
		let hasMore = true;
		const processedItems: Array<{ item: PBandaiUSListItem; isNew: boolean }> = [];
		let imagesDownloaded = 0;
		let newItemCount = 0;
		let updatedItemCount = 0;

		console.log(`Starting P-Bandai US scrape (brand: ${brandId})`);

		while (hasMore) {
			if (maxPages && pageNum >= maxPages) {
				console.log(`Reached max pages limit (${maxPages})`);
				break;
			}

			const url = this.buildSearchUrl(brandId, limit, offset);
			console.log(`Fetching page ${pageNum + 1} (offset: ${offset})...`);

			const result = await this.fetchAndParsePage(url);

			if (!result || result.items.length === 0) {
				console.log("No more items found");
				break;
			}

			console.log(`  Found ${result.items.length} items (total: ${result.totalResults})`);

			// Process items
			for (const item of result.items) {
				const isNew = !existingIds.has(item.id);

				if (incrementalOnly && !isNew) {
					console.log(`  Skipping existing item: ${item.id}`);
					continue;
				}

				// Download images if not skipping
				if (!skipImages) {
					const downloaded = await this.downloadImages(item, imageDelay);
					imagesDownloaded += downloaded;
				}

				// Save item JSON
				await this.saveItem(item, isNew);

				if (isNew) {
					newItemCount++;
					existingIds.add(item.id);
				} else {
					updatedItemCount++;
				}

				processedItems.push({ item, isNew });
			}

			hasMore = result.hasMore;
			offset += limit;
			pageNum++;

			if (hasMore && pageDelay > 0) {
				await this.delay(pageDelay);
			}
		}

		// Update index with metadata
		await this.updateIndex(processedItems, existingIndex);

		const totalItems = existingIds.size;
		console.log(`\nScrape complete:`);
		console.log(`  New items: ${newItemCount}`);
		console.log(`  Updated items: ${updatedItemCount}`);
		console.log(`  Total items in index: ${totalItems}`);
		console.log(`  Images downloaded: ${imagesDownloaded}`);

		return { newItems: newItemCount, updatedItems: updatedItemCount, totalItems, imagesDownloaded };
	}

	/**
	 * Build search URL with parameters
	 */
	private buildSearchUrl(brandId: string, limit: number, offset: number): string {
		return `https://p-bandai.com/us/search?limit=${limit}&offset=${offset}&sortType=NewArrival&_f_brands=${brandId}`;
	}

	/**
	 * Fetch and parse a single search results page using direct HTTP
	 * Uses session tokens captured during init() for authentication
	 */
	private async fetchAndParsePage(url: string): Promise<PageParseResult | null> {
		if (!this.sessionTokens) {
			throw new Error("Session tokens not captured. Call init() first.");
		}

		try {
			const response = await fetch(url, {
				headers: {
					Cookie: this.sessionTokens.cookies,
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
					"Accept-Language": "en-US,en;q=0.9",
					"User-Agent": this.userAgent,
					"Cache-Control": "no-cache",
					Pragma: "no-cache",
				},
			});

			if (!response.ok) {
				console.error(`HTTP error ${response.status} for ${url}`);
				return null;
			}

			const html = await response.text();

			// Check for bot detection / blocked response
			if (html.length < 10_000) {
				console.warn(`  Short response (${html.length} chars) - falling back to Playwright`);
				return await this.fetchAndParsePageWithPlaywright(url);
			}

			if (html.includes("challenge") || html.includes("captcha")) {
				console.warn("  Bot detection detected - falling back to Playwright");
				return await this.fetchAndParsePageWithPlaywright(url);
			}

			const result = this.parseSearchResults(html);

			// If both JSON and DOM parsing failed, retry with Playwright
			if (result.needsPlaywright) {
				console.warn("  HTTP response parsing failed - retrying with Playwright");
				return await this.fetchAndParsePageWithPlaywright(url);
			}

			return result;
		} catch (error) {
			console.error(`Error fetching ${url}:`, error);
			return null;
		}
	}

	/**
	 * Fallback: Fetch page using Playwright if HTTP fetch fails
	 */
	private async fetchAndParsePageWithPlaywright(url: string): Promise<PageParseResult | null> {
		if (!this.page) {
			throw new Error("Browser not initialized. Call init() first.");
		}

		try {
			await this.page.goto(url, {
				waitUntil: "domcontentloaded",
				timeout: 30_000,
			});

			// Wait for content to render
			await this.page.waitForTimeout(3000);

			const html = await this.page.content();
			return this.parseSearchResults(html);
		} catch (error) {
			console.error(`Playwright fallback error for ${url}:`, error);
			return null;
		}
	}

	/**
	 * Parse search results HTML
	 * Prefers extracting embedded JSON from Nuxt SSR data for accuracy and speed
	 * Falls back to DOM parsing if embedded JSON not found
	 */
	private parseSearchResults(html: string): PageParseResult {
		// Try to extract embedded product JSON from SSR data first (faster and more accurate)
		const embeddedItems = this.extractEmbeddedProducts(html);
		if (embeddedItems.length > 0) {
			// Parse total results from page
			const totalResults = this.extractTotalResults(html);
			const hasMore = embeddedItems.length >= 40;
			return { items: embeddedItems, totalResults, hasMore };
		}

		// Fallback to DOM parsing if embedded JSON not found
		console.log("  Falling back to DOM parsing...");
		const domResult = this.parseSearchResultsDom(html);

		// If DOM parsing also fails, return empty with flag to retry with Playwright
		if (domResult.items.length === 0) {
			return { items: [], totalResults: 0, hasMore: false, needsPlaywright: true };
		}

		return domResult;
	}

	/**
	 * Extract embedded product JSON from Nuxt SSR data
	 */
	private extractEmbeddedProducts(html: string): PBandaiUSListItem[] {
		const items: PBandaiUSListItem[] = [];

		// Look for products array in embedded JSON
		// Pattern: "products":[{...},{...}]
		const productsMatch = /"products"\s*:\s*\[/.exec(html);
		if (!productsMatch) {
			return items;
		}

		try {
			// Find complete array with proper string handling
			let bracketCount = 0;
			let inString = false;
			let escapeNext = false;
			const matchIndex = html.indexOf(productsMatch[0]);
			const startIndex = matchIndex + productsMatch[0].length - 1; // Position of '['
			let endIndex = startIndex;

			for (let i = startIndex; i < html.length; i++) {
				const char = html[i];

				if (escapeNext) {
					escapeNext = false;
					continue;
				}

				if (char === "\\") {
					escapeNext = true;
					continue;
				}

				if (char === '"') {
					inString = !inString;
					continue;
				}

				if (!inString) {
					if (char === "[") bracketCount++;
					if (char === "]") bracketCount--;
					if (bracketCount === 0) {
						endIndex = i + 1;
						break;
					}
				}
			}

			const productsJson = html.slice(startIndex, endIndex);
			const products = JSON.parse(productsJson) as EmbeddedProduct[];

			for (const product of products) {
				if (!product.productCode) continue;

				const item = this.convertEmbeddedProduct(product);
				if (item) {
					items.push(item);
				}
			}
		} catch (error) {
			console.warn("  Failed to parse embedded products JSON:", error);
		}

		return items;
	}

	/**
	 * Convert embedded product to list item format
	 */
	private convertEmbeddedProduct(product: EmbeddedProduct): PBandaiUSListItem | null {
		const id = product.productCode;
		if (!id) return null;

		// Extract images - store src URLs, path will be added after download
		const productImages: PBandaiUSImage[] = [];
		if (product.productImages) {
			let order = 1;
			for (const img of product.productImages) {
				if (img.fileUrl && img.mediaType === "Image") {
					// fileUrl is relative like "files/seller-products/FSP0002642001/ICokyF1jSmY6lsMl8TUw.webp"
					// Full URL is https://p-bandai.com/{fileUrl} (note: no /us/ prefix)
					const fullUrl = `https://p-bandai.com/${img.fileUrl}`;
					productImages.push({ order, src: fullUrl, path: "" });
					order++;
				}
			}
		}

		// Only include price if available
		const priceAmount = product.fixedListPrice?.amount;
		const price =
			priceAmount === undefined
				? undefined
				: {
					amount: priceAmount,
					currency: "USD" as const,
					taxIncluded: true,
				};

		return {
			id,
			type: "pbandai-us-item",
			name: {
				en: product.productName?.en ?? product.productName?.ja ?? "",
			},
			price,
			images: productImages,
			sourceUrl: `https://p-bandai.com/us/item/${id}`,
		};
	}

	/**
	 * Extract total results count from HTML
	 */
	private extractTotalResults(html: string): number {
		const $ = load(html);
		const totalText = $(".p-search-result__count, [class*='result-count']").text();
		const totalMatch = /(\d+)/.exec(totalText);
		return totalMatch ? Number.parseInt(totalMatch[1], 10) : 0;
	}

	/**
	 * Fallback: Parse search results from DOM elements
	 */
	private parseSearchResultsDom(html: string): PageParseResult {
		const $ = load(html);
		const items: PBandaiUSListItem[] = [];

		// Parse total results from page (if available)
		const totalResults = this.extractTotalResults(html);

		// Parse each item card
		$(".p-col__item").each((_, el) => {
			const $item = $(el);
			const item = this.parseItemCard($, $item);
			if (item) {
				items.push(item);
			}
		});

		// Determine if there are more pages
		const hasMore = items.length > 0 && (totalResults === 0 || items.length >= 40);

		return { items, totalResults, hasMore };
	}

	/**
	 * Parse a single item card (DOM fallback)
	 */
	private parseItemCard($: CheerioAPI, $item: ReturnType<CheerioAPI>): PBandaiUSListItem | null {
		// Extract ID from link
		const link = $item.find("a[href*='/us/item/']").first().attr("href");
		const id = link?.match(/\/us\/item\/([A-Z0-9]+)/)?.[1];

		if (!id) {
			return null;
		}

		// Extract name
		const name = $item.find(".c-product__title").text().trim();

		// Extract price from data-fp attribute
		let priceAmount: number | undefined;
		const priceDiv = $item.find(".c-product__price-currency");
		const fpData = priceDiv.attr("data-fp");
		if (fpData) {
			try {
				const fp = JSON.parse(fpData) as { US?: number };
				priceAmount = fp.US;
			} catch {
				// Fallback to text extraction
				const priceText = $item.find(".c-product__price-amount").text().trim();
				const parsed = Number.parseFloat(priceText);
				if (!Number.isNaN(parsed)) {
					priceAmount = parsed;
				}
			}
		}

		// Extract image URLs - store src, path will be added after download
		const images: PBandaiUSImage[] = [];
		let order = 1;
		$item.find(".c-product__img").each((_, img) => {
			const src = $(img).attr("src");
			if (src) {
				images.push({ order, src, path: "" });
				order++;
			}
		});

		// Only include price if available
		const price =
			priceAmount === undefined
				? undefined
				: {
					amount: priceAmount,
					currency: "USD" as const,
					taxIncluded: true,
				};

		return {
			id,
			type: "pbandai-us-item",
			name: { en: name },
			price,
			images,
			sourceUrl: `https://p-bandai.com/us/item/${id}`,
		};
	}

	/**
	 * Download images for an item
	 * Iterates through item.images, downloads from src, and updates path
	 * Uses hash-based deduplication when hashIndex is available
	 */
	private async downloadImages(item: PBandaiUSListItem, delay: number): Promise<number> {
		const itemDir = path.join(this.assetsDir, item.id);
		let downloaded = 0;

		for (let i = 0; i < item.images.length; i++) {
			const img = item.images[i];
			if (!img?.src) continue;

			const filename = this.getFilenameFromUrl(img.src);
			const filePath = path.join(itemDir, filename);
			const relativePath = `/pbandai/en/items/${item.id}/${filename}`;

			// Skip if already exists locally
			if (existsSync(filePath)) {
				// Compute hash for existing file if we have an index
				if (this.hashIndex && !img.hash) {
					try {
						const buffer = await readFile(filePath);
						img.hash = computeBufferHash(buffer);
					} catch {
						// Ignore hash computation errors
					}
				}
				img.path = relativePath;
				continue;
			}

			try {
				const response = await fetch(img.src);
				if (response.ok) {
					const buffer = Buffer.from(await response.arrayBuffer());
					const hash = computeBufferHash(buffer);
					img.hash = hash;

					// Check if image already exists in item assets (deduplicate)
					const existingPath = this.hashIndex?.findByHash(hash);
					if (existingPath) {
						// Use existing path from item assets - don't save duplicate
						img.path = existingPath;
						console.log(`    Deduplicated: ${item.id} image → ${existingPath}`);
					} else {
						// Save new image
						await mkdir(itemDir, { recursive: true });
						await writeFile(filePath, buffer);
						img.path = relativePath;
						downloaded++;

						// Add to index for future deduplication
						this.hashIndex?.add(hash, relativePath);
					}

					if (delay > 0 && i < item.images.length - 1) {
						await this.delay(delay);
					}
				}
			} catch (error) {
				console.error(`  Failed to download image for ${item.id}:`, error);
			}
		}

		return downloaded;
	}

	/**
	 * Extract original filename from URL
	 * e.g., https://p-bandai.com/files/.../geiWmsGA4QVN1phJ0mmy.webp -> geiWmsGA4QVN1phJ0mmy.webp
	 */
	private getFilenameFromUrl(url: string): string {
		const urlPath = new URL(url).pathname;
		const filename = urlPath.split("/").pop();
		return filename ?? "image.jpg";
	}

	/**
	 * Save item to JSON file (clean data only, no metadata)
	 */
	private async saveItem(item: PBandaiUSListItem, isNew: boolean): Promise<void> {
		const filePath = path.join(this.dataDir, `${item.id}.json`);

		const changed = await writeJsonIfChanged(filePath, item);
		if (changed) {
			console.log(`  ${isNew ? "Created" : "Updated"}: ${item.id} - ${item.name.en.slice(0, 50)}`);
		}
	}

	/**
	 * Load existing index
	 */
	private async loadIndex(): Promise<PBandaiUSIndex | null> {
		try {
			const content = await readFile(this.indexPath, "utf8");
			return JSON.parse(content) as PBandaiUSIndex;
		} catch {
			return null;
		}
	}

	/**
	 * Update index with new items and metadata
	 */
	private async updateIndex(
		processedItems: Array<{ item: PBandaiUSListItem; isNew: boolean }>,
		existingIndex: PBandaiUSIndex | null,
	): Promise<void> {
		// Ensure data directory exists
		await mkdir(path.dirname(this.indexPath), { recursive: true });

		const now = new Date().toISOString();

		// Build metadata for all items
		const items: PBandaiUSIndex = { ...existingIndex };
		for (const { item, isNew } of processedItems) {
			if (isNew) {
				items[item.id] = {
					discoveredAt: now,
					updatedAt: now,
				};
			} else if (items[item.id]) {
				items[item.id].updatedAt = now;
			}
		}

		// Sort items lexically by ID
		const sortedIndex: PBandaiUSIndex = {};
		for (const id of Object.keys(items).toSorted()) {
			sortedIndex[id] = items[id];
		}

		await writeJsonIfChanged(this.indexPath, sortedIndex);
	}

	/**
	 * Delay helper
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Scrape from a custom search URL
	 * Paginates automatically in batches of 100
	 */
	async scrapeFromUrl(
		searchUrl: string,
		options: Pick<PBandaiUSListParserOptions, "skipImages" | "imageDelay" | "incrementalOnly" | "pageDelay"> = {},
	): Promise<{
		newItems: number;
		updatedItems: number;
		totalItems: number;
		imagesDownloaded: number;
	}> {
		const { imageDelay = 500, skipImages = false, incrementalOnly = false, pageDelay = 2000 } = options;
		const batchSize = 40; // Matches default scraper, more reliable than larger batches

		// Ensure directories exist
		await mkdir(this.dataDir, { recursive: true });
		await mkdir(this.assetsDir, { recursive: true });

		// Load existing index
		const existingIndex = await this.loadIndex();
		const existingIds = new Set(Object.keys(existingIndex ?? {}));

		const processedItems: Array<{ item: PBandaiUSListItem; isNew: boolean }> = [];
		let imagesDownloaded = 0;
		let newItemCount = 0;
		let updatedItemCount = 0;

		// Parse base URL and override limit/offset for pagination
		const baseUrl = new URL(searchUrl);
		let offset = 0;
		let pageNum = 0;
		let hasMore = true;

		console.log(`Scraping from custom URL with pagination (batch size: ${batchSize})`);
		console.log(`Base URL: ${baseUrl.origin}${baseUrl.pathname}`);
		console.log(`Filters: ${baseUrl.search}`);

		while (hasMore) {
			// Build paginated URL
			baseUrl.searchParams.set("limit", String(batchSize));
			baseUrl.searchParams.set("offset", String(offset));
			const pageUrl = baseUrl.toString();

			console.log(`\nFetching page ${pageNum + 1} (offset: ${offset})...`);

			const result = await this.fetchAndParsePage(pageUrl);

			if (!result || result.items.length === 0) {
				console.log("No more items found");
				break;
			}

			console.log(`  Found ${result.items.length} items`);

			// Process items
			for (const item of result.items) {
				const isNew = !existingIds.has(item.id);

				if (incrementalOnly && !isNew) {
					continue;
				}

				// Download images if not skipping
				if (!skipImages) {
					const downloaded = await this.downloadImages(item, imageDelay);
					imagesDownloaded += downloaded;
				}

				// Save item JSON
				await this.saveItem(item, isNew);

				if (isNew) {
					newItemCount++;
					existingIds.add(item.id);
				} else {
					updatedItemCount++;
				}

				processedItems.push({ item, isNew });
			}

			hasMore = result.items.length >= batchSize;
			offset += batchSize;
			pageNum++;

			if (hasMore && pageDelay > 0) {
				await this.delay(pageDelay);
			}
		}

		// Update index with metadata
		await this.updateIndex(processedItems, existingIndex);

		const totalItems = existingIds.size;
		console.log(`\nScrape complete:`);
		console.log(`  Pages fetched: ${pageNum}`);
		console.log(`  New items: ${newItemCount}`);
		console.log(`  Updated items: ${updatedItemCount}`);
		console.log(`  Total items in index: ${totalItems}`);
		console.log(`  Images downloaded: ${imagesDownloaded}`);

		return { newItems: newItemCount, updatedItems: updatedItemCount, totalItems, imagesDownloaded };
	}

	/**
	 * Static helper to get data path
	 */
	static getDataPath(id: string): string {
		return `data/src/pbandai/en/items/${id}.json`;
	}

	/**
	 * Static helper to get assets path
	 */
	static getAssetsDir(id: string): string {
		return `assets/pbandai/en/items/${id}`;
	}

	/**
	 * Static helper to build item URL
	 */
	static buildItemUrl(id: string): string {
		return `https://p-bandai.com/us/item/${id}`;
	}
}
