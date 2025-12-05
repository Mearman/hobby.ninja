import type { LanguageDetection } from "@unnamed-gunpla-app/types/language-detection";
import type { GundamData } from "@unnamed-gunpla-app/types/product-data";
import * as cheerio from "cheerio";

import { BaseScraper } from "./base-scraper";

export class HobbyLinkScraper extends BaseScraper {
	constructor() {
		super({
			baseUrl: "https://www.1999.co.jp",
			userAgent: "GundamDataScraper/1.0 (compatible; +https://www.1999.co.jp)",
			delayMs: 4000,
			cacheEnabled: true,
		});
	}

	override async extractFromPage(html: string, url: string): Promise<GundamData> {
		const $ = cheerio.load(html);
		const languageDetection = this.detectLanguage($, url);

		// Extract basic product information
		const name = this.extractName($);
		const brand = this.extractBrand($);
		const category = this.extractCategory($);
		const price = this.extractPrice($);
		const releaseDate = this.extractReleaseDate($);
		const janCode = this.extractJanCode($);
		const description = this.extractDescription($);
		const specifications = this.extractSpecifications($);
		const images = this.extractImages($);

		// Generate ID
		const id = this.generateId("hobbylink", janCode || name || url);

		const result: GundamData = {
			id,
			name,
			specifications: {
				...specifications,
				...(janCode && { janCode }),
			},
			images,
			language: languageDetection,
			url,
			source: "hobbylink",
			scrapedAt: new Date().toISOString(),
		};

		// Add optional properties only if they have values
		if (brand !== undefined && brand !== "") result.brand = brand;
		if (category !== undefined && category !== "") result.category = category;
		if (price !== null && price !== undefined) {
			result.price = price.amount;
			result.currency = price.currency || "JPY";
		}
		if (releaseDate !== null && releaseDate !== undefined) result.releaseDate = releaseDate;
		if (janCode !== null && janCode !== undefined) result.sku = janCode;
		if (description !== null && description !== undefined) result.description = description;

		return result;
	}

	/**
   * Extract product name
   */
	private extractName($: cheerio.CheerioAPI | cheerio.Root): string {
		const selectors = [
			'h1[itemprop="name"]',
			".item-name",
			".product-name",
			"h1",
			"title",
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				let name = selector === "title"
					? element.attr("content") || ""
					: element.attr("content") || element.text() || "";

				if (name) {
					name = name.replaceAll(/\s+/g, " ").trim();
					// Remove common suffixes
					name = name.replace(/\s*\(\d+円\)税抜$/i, "");
					name = name.replace(/\s*\(\d+円\)$/i, "");
					name = name.replace(/\s*\(税抜\)$/i, "");
					return name;
				}
			}
		}

		return "";
	}

	/**
   * Extract brand information
   */
	private extractBrand($: cheerio.CheerioAPI | cheerio.Root): string {
		// Look for brand in breadcrumbs or meta tags
		const selectors = [
			".brand-name",
			".manufacturer",
			'meta[property="brand"]',
			'meta[property="product:brand"]',
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				const brand = element.attr("content") || element.text() || "";
				if (brand) {
					return brand.trim();
				}
			}
		}

		// Try to extract from canonical URL or link elements
		const canonicalLink = $('link[rel="canonical"]').attr("href") || "";
		const urlPath = canonicalLink.includes("/") ? new URL(canonicalLink).pathname : "";
		const pathSegments = urlPath.split("/");
		const brandSegment = pathSegments.find(segment =>
			["bandai", "kotobukiya", "tamashii", "amazon", "yahoo"].includes(segment.toLowerCase()),
		);

		if (brandSegment) {
			return brandSegment.charAt(0).toUpperCase() + brandSegment.slice(1);
		}

		return "";
	}

	/**
   * Extract category
   */
	private extractCategory($: cheerio.CheerioAPI | cheerio.Root): string {
		// Look for category in breadcrumbs or navigation
		const selectors = [
			".breadcrumb a",
			".category-name",
			".nav-category a",
			"li.category a",
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				const category = element.text().trim();
				if (category) {
					return this.normalizeCategory(category);
				}
			}
		}

		// Try to extract from page title or meta
		const title = $("title").text();
		const categoryKeywords = ["ガンプラ", "プラモデル", "MG", "HG", "PG", "RG", "SD"];

		for (const keyword of categoryKeywords) {
			if (title.includes(keyword)) {
				return keyword;
			}
		}

		return "";
	}

	/**
   * Extract price information
   */
	protected override extractPrice($: cheerio.CheerioAPI | cheerio.Root): { amount: number; currency: string; originalText: string } | null {
		const selectors = [
			".price",
			".price-value",
			".amount",
			'span[itemprop="price"]',
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				const priceText = element.text() || element.attr("content") || "";
				if (priceText) {
					return this.parseJapanesePrice(priceText);
				}
			}
		}

		return null;
	}

	/**
   * Parse Japanese price text
   */
	private parseJapanesePrice(priceText: string): { amount: number; currency: string; originalText: string } | null {
		// Remove common Japanese price text patterns
		const cleaned = priceText
			.replaceAll("円(税抜)", "")
			.replaceAll(/円$/g, "")
			.replaceAll("¥", "")
			.replaceAll(",", "")
			.trim();

		const numberMatch = cleaned.match(/\d+/);
		if (numberMatch) {
			const amount = Number.parseInt(numberMatch[0], 10);
			return { amount, currency: "JPY", originalText: priceText };
		}

		return null;
	}

	/**
   * Extract release date
   */
	private extractReleaseDate($: cheerio.CheerioAPI | cheerio.Root): string | null {
		const selectors = [
			".release-date",
			".launch-date",
			'meta[property="product:release_date"]',
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				const dateText = element.text() || element.attr("content") || "";
				if (dateText) {
					return this.parseJapaneseDate(dateText);
				}
			}
		}

		return null;
	}

	/**
   * Extract JAN code (Japanese Article Number)
   */
	private extractJanCode($: cheerio.CheerioAPI | cheerio.Root): string | null {
		const selectors = [
			".jan-code",
			".product-code",
			'[itemprop="sku"]',
			"span.code",
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				const code = element.text() || element.attr("content") || "";
				if (code) {
					const cleaned = code.replaceAll(/[^0-9]/g, "").trim();
					if (cleaned.length >= 8) {
						return cleaned;
					}
				}
			}
		}

		return null;
	}

	/**
   * Extract description
   */
	private extractDescription($: cheerio.CheerioAPI | cheerio.Root): string | null {
		const selectors = [
			".description",
			".product-description",
			".item-description",
			'meta[name="description"]',
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				const description = element.attr("content") || element.text() || "";
				if (description && description.length > 20) {
					return description.trim();
				}
			}
		}

		return null;
	}

	/**
   * Extract specifications
   */
	private extractSpecifications($: cheerio.CheerioAPI | cheerio.Root): Record<string, unknown> | null {
		const specs: Record<string, unknown> = {};

		// Look for specification table
		$(".spec-table tr, .specs tr").each((_index: number, element: cheerio.Element) => {
			const row = $(element);
			const header = row.find("th, td:first").text().trim();
			const value = row.find("td:last").text().trim();

			if (header && value) {
				const key = this.normalizeSpecKey(header);
				specs[key] = value;
			}
		});

		// Look for list-style specifications
		$(".spec-list li").each((_index: number, element: cheerio.Element) => {
			const item = $(element);
			const text = item.text().trim();
			const parts = text.split(/[:：]/);

			if (parts.length === 2) {
				const key = this.normalizeSpecKey(parts[0]?.trim() ?? "");
				const value = parts[1]?.trim() ?? "";
				specs[key] = value;
			}
		});

		return Object.keys(specs).length > 0 ? specs : null;
	}

	/**
   * Extract images
   */
	private extractImages($: cheerio.CheerioAPI | cheerio.Root): Array<{ type: string; url: string; alt: string }> {
		const images: Array<{ type: string; url: string; alt: string }> = [];

		// Main product images
		$(".item-image img, .product-image img, .gallery img").each((_index: number, element: cheerio.Element) => {
			const img = $(element);
			const src = img.attr("src") || img.attr("data-src") || img.attr("data-original");
			const alt = img.attr("alt") || "";

			if (src && !src.startsWith("data:")) {
				const url = src.startsWith("http") ? src : `${this.baseUrl}${src}`;
				const type = this.determineImageType(img, url);

				images.push({ type, url, alt });
			}
		});

		return images;
	}

	/**
   * Detect language
   */
	private detectLanguage(_$: cheerio.CheerioAPI | cheerio.Root, _url: string): LanguageDetection {
		// Japanese site defaults to Japanese
		return {
			language: "ja",
			confidence: 0.95,
			method: "fallback",
			evidence: ["HobbyLink is a Japanese site"],
		};
	}

	/**
   * Normalize category name
   */
	private normalizeCategory(category: string): string {
		const categoryMap: Record<string, string> = {
			"ガンプラ": "gunpla",
			"プラモデル": "plastic model",
			"マスターグレード": "master grade",
			"ハイグレード": "high grade",
			"パーフェクトグレード": "perfect grade",
			"リアルグレード": "real grade",
			"エントリーグレード": "entry grade",
			"スーパーデフォームド": "super deformed",
		};

		const normalized = category.toLowerCase();
		return categoryMap[normalized] || category;
	}

	/**
   * Normalize specification key
   */
	private normalizeSpecKey(key: string): string {
		// Japanese spec key normalization
		const keyMap: Record<string, string> = {
			"スケール": "scale",
			"サイズ": "size",
			"メーカー": "manufacturer",
			"ブランド": "brand",
			"価格": "price",
			"発売日": "releaseDate",
			"対象年齢": "ageRecommendation",
		};

		const normalized = key.toLowerCase().replaceAll(/\s+/g, "_");
		return keyMap[normalized] || normalized;
	}

	/**
   * Determine image type
   */
	private determineImageType(img: cheerio.Cheerio, url: string): string {
		if (img.hasClass("main") || img.parent().hasClass("main-image")) {
			return "main";
		}

		if (img.hasClass("sub") || img.parent().hasClass("sub-image")) {
			return "sub";
		}

		if (url.includes("thumbnail") || img.hasClass("thumb")) {
			return "thumbnail";
		}

		return "gallery";
	}

	/**
   * Parse Japanese date
   */
	private parseJapaneseDate(dateText: string): string | null {
		// Common Japanese date patterns
		const patterns = [
			/(\d{4})年(\d{1,2})月(\d{1,2})日/, // YYYY年MM月DD日
			/(\d{4})\/(\d{1,2})\/(\d{1,2})/, // YYYY/MM/DD
			/(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
		];

		for (const pattern of patterns) {
			const match = dateText.match(pattern);
			if (match && match.length >= 4) {
				let year, month, day;

				if (pattern === patterns[0]) { // YYYY年MM月DD日
					year = match[1] ?? "";
					month = (match[2] ?? "").padStart(2, "0");
					day = (match[3] ?? "").padStart(2, "0");
				} else if (pattern === patterns[1]) { // YYYY/MM/DD
					year = match[1] ?? "";
					month = (match[2] ?? "").padStart(2, "0");
					day = (match[3] ?? "").padStart(2, "0");
				} else { // MM/DD/YYYY
					year = match[3] ?? "";
					month = (match[1] ?? "").padStart(2, "0");
					day = (match[2] ?? "").padStart(2, "0");
				}

				return `${year}-${month}-${day}`;
			}
		}

		return null;
	}

	/**
   * Generate unique ID
   */
	protected override generateId(source: string, identifier: string): string {
		const cleanId = identifier.replaceAll(/[^a-zA-Z0-9]/g, "").toLowerCase();
		const hash = this.simpleHash(`${source}:${identifier}`);
		return `${source}-${cleanId}-${hash}`;
	}
}