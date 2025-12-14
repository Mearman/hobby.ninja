import type { LanguageDetection } from "@hobby-ninja/types/language";
import type { GundamData, PriceInfo, ProductImage, ProductSpecification } from "@hobby-ninja/types/product";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";

import { BaseScraper } from "./base-scraper";

/**
 * Data extracted from global.bandai-hobby.net English site
 */
export interface GlobalSiteData {
	/** English product name */
	name?: string;
	/** Description bullet points (from PRODUCTS INFO section) */
	description?: string[];
	/** English release date text */
	releaseDate?: string;
	/** Brand name (e.g., "REAL GRADE") */
	brand?: string;
	/** Series name (e.g., "Mobile Suit Gundam") */
	series?: string;
	/** Whether the page exists */
	hasPage: boolean;
	/** Error message if lookup failed (not for 404s) */
	error?: string;
}

export class BandaiHobbyScraper extends BaseScraper {
	/** Base URL for the global English site */
	private static readonly GLOBAL_BASE_URL = "https://global.bandai-hobby.net/en-us";

	constructor() {
		super({
			baseUrl: "https://bandai-hobby.net",
			userAgent: "GundamDataScraper/1.0 (compatible; +https://bandai-hobby.net)",
			delayMs: 2000,
			cacheEnabled: true,
		});
	}

	async extractFromPage(html: string, url: string): Promise<GundamData> {
		const $ = cheerio.load(html);
		const rawLanguageDetection = this.parseLanguage(html, url);

		// Transform language detection to match expected structure
		const languageDetection: LanguageDetection = {
			language: rawLanguageDetection.language,
			confidence: rawLanguageDetection.confidence,
			method: rawLanguageDetection.method,
			evidence: rawLanguageDetection.evidence,
		};

		// Extract basic product information
		const name = this.extractProductName($);
		const sku = this.extractSku($, url);
		const price = this.extractPriceInfo($);
		const description = this.extractDescription($);
		const specifications = this.extractSpecifications($);
		const rawImages = this.extractImages($);
		const categories = this.extractCategories($);
		const manualId = this.extractManualId($);

		// Transform images to match GundamData interface (alt is required)
		const images = rawImages.map(img => ({
			type: img.type,
			url: img.url,
			alt: img.alt ?? "",
		}));

		const productData: GundamData = {
			id: this.generateId("bandai-hobby", sku),
			name,
			sku,
			specifications,
			description: description || "",
			source: "bandai-hobby.net",
			url,
			images,
			language: languageDetection,
			scrapedAt: new Date().toISOString(),
		};

		// Add optional price only if it exists (convert PriceInfo to number)
		if (price !== undefined) {
			productData.price = price.amount;
			productData.currency = price.currency;
		}

		// Add category from categories array
		if (categories.length > 0) {
			productData.category = categories.join(" > ");
		}

		// Add manual ID if found (links to manual.bandai-hobby.net)
		if (manualId) {
			productData.manualId = manualId;
		}

		return productData;
	}

	private extractProductName($: cheerio.CheerioAPI): string {
		// Try multiple selectors for product name
		const selectors = [
			".product-title",
			".item-title",
			".title h1",
			".main-title",
			"h1",
			".product-name",
			"[data-product-name]",
		];

		for (const selector of selectors) {
			const name = this.extractTextContent($, selector);
			if (name) {
				return name;
			}
		}

		return "";
	}

	private extractSku($: cheerio.CheerioAPI, url: string): string {
		// Try to extract SKU from URL path
		const urlMatch = /\/([^/]+)\/?$/.exec(url);
		if (urlMatch && urlMatch[1]) {
			return urlMatch[1];
		}

		// Try to find SKU in the page content
		const skuSelectors = [
			".product-sku",
			".item-sku",
			".sku",
			".model-number",
			"[data-sku]",
		];

		for (const selector of skuSelectors) {
			const sku = this.extractTextContent($, selector);
			if (sku) {
				return sku;
			}
		}

		return "";
	}

	private extractPriceInfo($: cheerio.CheerioAPI): PriceInfo | undefined {
		const priceSelectors = [
			".price",
			".product-price",
			".item-price",
			".price-current",
			".amount",
		];

		for (const selector of priceSelectors) {
			const price = super.extractPrice($, selector);
			if (price) {
				return {
					amount: price.amount,
					currency: price.currency,
					originalText: price.originalText,
					includesTax: true, // Assume Japanese prices include tax
				};
			}
		}

		return undefined;
	}

	private extractDescription($: cheerio.CheerioAPI): string {
		const selectors = [
			".product-description",
			".item-description",
			".description",
			".product-details",
			".details",
		];

		for (const selector of selectors) {
			const description = this.extractTextContent($, selector);
			if (description && description.length > 20) {
				return description;
			}
		}

		return "";
	}

	private extractSpecifications($: cheerio.CheerioAPI): ProductSpecification {
		const specs: ProductSpecification = {};

		// Look for specification tables or lists
		const specTable = $(".specifications table, .spec-table, .product-specs table");

		if (specTable.length > 0) {
			specTable.find("tr").each((_: number, row: Element) => {
				const $row = $(row);
				const label = this.extractTextContentFromElement($row.find("th, .spec-label, .label"));
				const value = this.extractTextContentFromElement($row.find("td, .spec-value, .value"));

				if (label && value) {
					specs[this.normalizeSpecKey(label)] = this.parseSpecValue(value);
				}
			});
		}

		// Look for individual spec items
		const individualSpecs = $(".spec-item, .product-spec");
		individualSpecs.each((_: number, element: Element) => {
			const $element = $(element);
			const label = this.extractTextContentFromElement($element.find(".spec-label, .label"));
			const value = this.extractTextContentFromElement($element.find(".spec-value, .value"));

			if (label && value) {
				specs[this.normalizeSpecKey(label)] = this.parseSpecValue(value);
			}
		});

		return specs;
	}

	private normalizeSpecKey(key: string): string {
		// Japanese to English mapping for common specifications
		const japaneseToEnglish: Record<string, string> = {
			"スケール": "scale",
			"価格": "price",
			"発売日": "release_date",
			"重さ": "weight",
			"サイズ": "size",
			"高さ": "height",
			"幅": "width",
			"奥行き": "depth",
		};

		// First check if we have a direct Japanese mapping
		if (japaneseToEnglish[key]) {
			return japaneseToEnglish[key];
		}

		const normalized = key
			.toLowerCase()
			.replaceAll(/[^\w\s\u3040-\u309F\u30A0-\u30FF]/g, "") // Keep Japanese characters
			.replaceAll(/\s+/g, "_")
			.replaceAll(/^_+|_+$/g, ""); // Remove leading/trailing underscores

		// If normalization results in empty string, use a simplified version
		if (!normalized) {
			return key.toLowerCase().replaceAll(/[^a-z\u3040-\u309F\u30A0-\u30FF]/g, "_").slice(0, 20);
		}

		return normalized;
	}

	private parseSpecValue(value: string): string | number | boolean {
		// Special handling for scale ratios (e.g., "1/144", "1/60")
		if (value.includes("/")) {
			const ratioMatch = /^\s*([\d]+)\s*\/\s*([\d]+)\s*$/.exec(value);
			if (ratioMatch) {
				return value.trim(); // Keep the full ratio as string
			}
		}

		// Try to parse as number first, handling currency symbols
		const currencyMatch = /([¥$€£]\s*|)([\d,]+(?:\.\d+)?)(\s*[円元€£$]?)/.exec(value);
		if (currencyMatch && currencyMatch[2]) {
			return Number.parseFloat(currencyMatch[2].replaceAll(",", ""));
		}

		// Try to parse as plain number (but not if it looks like a ratio)
		const numberMatch = /^([\d,]+(?:\.\d+)?)\s*$/.exec(value);
		if (numberMatch && numberMatch[1]) {
			return Number.parseFloat(numberMatch[1].replaceAll(",", ""));
		}

		// Try to parse as boolean
		if (value.toLowerCase() === "yes" || value.toLowerCase() === "true") {
			return true;
		}
		if (value.toLowerCase() === "no" || value.toLowerCase() === "false") {
			return false;
		}

		// Return as string
		return value;
	}

	
	private extractImages($: cheerio.CheerioAPI): ProductImage[] {
		const images: ProductImage[] = [];

		$(".product-image, .item-image, .main-image img, .gallery-image, .product-image img, .thumbnail").each((_: number, element: Element) => {
			const $element = $(element);
			const src = this.extractAttributeFromElement($element, "src") || this.extractAttributeFromElement($element, "data-src") || "";
			const alt = this.extractAttributeFromElement($element, "alt") || "";
			const width = Number.parseInt(this.extractAttributeFromElement($element, "width") || "0", 10);
			const height = Number.parseInt(this.extractAttributeFromElement($element, "height") || "0", 10);

			if (src) {
				// Determine image type based on CSS classes and attributes
				let imageType: "main" | "gallery" | "thumbnail" | "box" = "gallery";
				if ($element.hasClass("thumbnail") || $element.attr("alt")?.includes("Thumbnail")) {
					imageType = "thumbnail";
				} else if ($element.hasClass("main-image")) {
					imageType = "main";
				} else if ($element.hasClass("box-image") || $element.attr("alt")?.includes("Box")) {
					imageType = "box";
				}

				const image: ProductImage = {
					url: src.startsWith("http") ? src : `${this.baseUrl}/${src.replace(/^\//, "")}`,
					alt,
					type: imageType,
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

  
	private extractCategories($: cheerio.CheerioAPI): string[] {
		const categories: string[] = [];

		// Look for breadcrumb or category information
		$(".breadcrumb a, .category a, .product-category a, .tag a").each((_: number, element: Element) => {
			const category = this.extractTextContentFromElement($(element));
			if (category) {
				categories.push(category);
			}
		});

		// Remove duplicates while preserving order
		return [...new Set(categories)];
	}

	/**
	 * Extract manual ID from links to manual.bandai-hobby.net/menus/detail/{id}
	 * These links appear on item pages and connect products to their assembly manuals.
	 */
	private extractManualId($: cheerio.CheerioAPI): string | undefined {
		// Pattern to match manual.bandai-hobby.net/menus/detail/{id}
		const manualUrlPattern = /manual\.bandai-hobby\.net\/menus\/detail\/(\d+)/;

		// Search for links containing the manual URL pattern
		let manualId: string | undefined;

		$("a[href]").each((_: number, element: Element) => {
			if (manualId) return; // Already found

			const href = $(element).attr("href");
			if (href) {
				const match = manualUrlPattern.exec(href);
				if (match?.[1]) {
					manualId = match[1];
				}
			}
		});

		return manualId;
	}

	// =========================================================================
	// Global Site (English) Lookup Methods
	// =========================================================================

	/**
	 * Look up canonical English translation from global.bandai-hobby.net
	 * @param itemId The item ID (e.g., "01_5261")
	 * @returns GlobalSiteData with translation info or hasPage: false
	 */
	async lookupEnglishTranslation(itemId: string): Promise<GlobalSiteData> {
		const url = `${BandaiHobbyScraper.GLOBAL_BASE_URL}/item/${itemId}/`;

		try {
			const result = await this.fetchPage(url);
			const $ = cheerio.load(result.html);

			// Check if page has actual content (not error page)
			const hasContent = $("main h1").length > 0;
			if (!hasContent) {
				return { hasPage: false };
			}

			// Check for generic error title
			const title = $("title").text().trim();
			if (title.includes("404") || title.includes("Not Found")) {
				return { hasPage: false };
			}

			return {
				name: this.extractGlobalName($),
				description: this.extractGlobalDescriptionBullets($),
				releaseDate: this.extractGlobalReleaseDate($),
				brand: this.extractGlobalBrand($),
				series: this.extractGlobalSeries($),
				hasPage: true,
			};
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : "Unknown error";
			// 404 is expected for items without global pages
			const is404 = errorMsg.includes("404") || errorMsg.includes("Not Found");
			return {
				hasPage: false,
				error: is404 ? undefined : errorMsg,
			};
		}
	}

	/**
	 * Extract product name from global site H1
	 */
	private extractGlobalName($: cheerio.CheerioAPI): string {
		return $("main h1").first().text().trim();
	}

	/**
	 * Extract release date from global site
	 * Looks for "Launch date" text pattern
	 */
	private extractGlobalReleaseDate($: cheerio.CheerioAPI): string | undefined {
		const mainText = $("main").text();
		const match = /Launch date\s*([\w\s,()]+?)(?=Age|$)/i.exec(mainText);
		return match?.[1]?.trim();
	}

	/**
	 * Extract description bullets from PRODUCTS INFO section
	 * These are the detailed feature descriptions prefixed with a bullet marker
	 */
	private extractGlobalDescriptionBullets($: cheerio.CheerioAPI): string[] {
		const bullets: string[] = [];

		// Find PRODUCTS INFO section and extract bullet points
		$("main").find("h2, h3").each((_, heading) => {
			const headingText = $(heading).text();
			if (headingText.includes("PRODUCTS INFO") || headingText.includes("PRODUCT INFO")) {
				// Get content after this heading until next heading
				let node = $(heading).next();
				while (node.length && !node.is("h2, h3")) {
					const text = node.text().trim();
					// Look for bullet points (square bullet or round bullet prefixed)
					if (text.startsWith("\u25A0") || text.startsWith("\u2022")) {
						bullets.push(text.slice(1).trim());
					} else if (text.length > 0) {
						// Also check for list items
						node.find("li").each((_, li) => {
							const liText = $(li).text().trim();
							if (liText) {
								bullets.push(liText.replace(/^[\u25A0\u2022]\s*/, "").trim());
							}
						});
					}
					node = node.next();
				}
			}
		});

		// If no bullets found from PRODUCTS INFO, try to find any square-bullet-prefixed text
		if (bullets.length === 0) {
			const mainText = $("main").text();
			const bulletMatches = mainText.match(/\u25A0[^\u25A0\n]+/g);
			if (bulletMatches) {
				for (const match of bulletMatches) {
					bullets.push(match.slice(1).trim());
				}
			}
		}

		return bullets;
	}

	/**
	 * Extract brand from global site (e.g., "REAL GRADE")
	 */
	private extractGlobalBrand($: cheerio.CheerioAPI): string | undefined {
		const brandLink = $("a[href*='/brand/']").first();
		return brandLink.length > 0 ? brandLink.text().trim() : undefined;
	}

	/**
	 * Extract series from global site (e.g., "Mobile Suit Gundam")
	 */
	private extractGlobalSeries($: cheerio.CheerioAPI): string | undefined {
		const seriesLink = $("a[href*='/series/']").first();
		return seriesLink.length > 0 ? seriesLink.text().trim() : undefined;
	}
}