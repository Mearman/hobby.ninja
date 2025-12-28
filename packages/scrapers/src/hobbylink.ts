import type { LanguageDetection } from "@hobby-ninja/types/language";
import type { GundamData } from "@hobby-ninja/types/product";
import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { Element } from "domhandler";

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

	override extractFromPage(html: string, url: string): Promise<GundamData> {
		const $ = load(html);
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
		const id = this.generateId("hobbylink", janCode ?? name || url);

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
		if (brand !== "") result.brand = brand;
		if (category !== "") result.category = category;
		if (price !== null) {
			result.price = price.amount;
			result.currency = price.currency;
		}
		if (releaseDate !== null) result.releaseDate = releaseDate;
		if (janCode !== null) result.sku = janCode;
		if (description !== null) result.description = description;

		return Promise.resolve(result);
	}

	/**
   * Extract product name
   */
	private extractName($: CheerioAPI): string {
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
					? element.attr("content") ?? ""
					: element.attr("content") ?? element.text();

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
	private extractBrand($: CheerioAPI): string {
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
				const brand = element.attr("content") ?? element.text();
				if (brand) {
					return brand.trim();
				}
			}
		}

		// Try to extract from canonical URL or link elements
		const canonicalLink = $('link[rel="canonical"]').attr("href") ?? "";
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
	private extractCategory($: CheerioAPI): string {
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
	protected override extractPrice($: CheerioAPI): { amount: number; currency: string; originalText: string } | null {
		const selectors = [
			".price",
			".price-value",
			".amount",
			'span[itemprop="price"]',
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				const priceText = element.text() || element.attr("content");
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

		const numberMatch = /\d+/.exec(cleaned);
		if (numberMatch) {
			const amount = Number.parseInt(numberMatch[0], 10);
			return { amount, currency: "JPY", originalText: priceText };
		}

		return null;
	}

	/**
   * Extract release date
   */
	private extractReleaseDate($: CheerioAPI): string | null {
		const selectors = [
			".release-date",
			".launch-date",
			'meta[property="product:release_date"]',
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				const dateText = element.text() || element.attr("content");
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
	private extractJanCode($: CheerioAPI): string | null {
		const selectors = [
			".jan-code",
			".product-code",
			'[itemprop="sku"]',
			"span.code",
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				const code = element.text() || element.attr("content");
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
	private extractDescription($: CheerioAPI): string | null {
		const selectors = [
			".description",
			".product-description",
			".item-description",
			'meta[name="description"]',
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				const description = element.attr("content") ?? element.text();
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
	private extractSpecifications($: CheerioAPI): Record<string, unknown> | null {
		const specs: Record<string, unknown> = {};

		// Look for specification table
		$(".spec-table tr, .specs tr").each((_index: number, element: Element) => {
			const row = $(element);
			const header = row.find("th, td:first").text().trim();
			const value = row.find("td:last").text().trim();

			if (header && value) {
				const key = this.normalizeSpecKey(header);
				specs[key] = value;
			}
		});

		// Look for list-style specifications
		$(".spec-list li").each((_index: number, element: Element) => {
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
	private extractImages($: CheerioAPI): Array<{ type: string; url: string; alt: string }> {
		const images: Array<{ type: string; url: string; alt: string }> = [];

		// Main product images
		$(".item-image img, .product-image img, .gallery img").each((_index: number, element: Element) => {
			const img = $(element);
			const src = img.attr("src") ?? img.attr("data-src") ?? img.attr("data-original");
			const alt = img.attr("alt") ?? "";

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
	private detectLanguage(_$: CheerioAPI, _url: string): LanguageDetection {
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
		return categoryMap[normalized] ?? category;
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
		return keyMap[normalized] ?? normalized;
	}

	/**
   * Determine image type
   */
	private determineImageType(img: Cheerio<Element>, url: string): string {
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
		// YYYY年MM月DD日
		const japanesePattern = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
		// YYYY/MM/DD
		const isoSlashPattern = /(\d{4})\/(\d{1,2})\/(\d{1,2})/;
		// MM/DD/YYYY
		const usSlashPattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;

		const japaneseMatch = japanesePattern.exec(dateText);
		if (japaneseMatch) {
			const year = japaneseMatch[1];
			const month = japaneseMatch[2].padStart(2, "0");
			const day = japaneseMatch[3].padStart(2, "0");
			return `${year}-${month}-${day}`;
		}

		const isoMatch = isoSlashPattern.exec(dateText);
		if (isoMatch) {
			const year = isoMatch[1];
			const month = isoMatch[2].padStart(2, "0");
			const day = isoMatch[3].padStart(2, "0");
			return `${year}-${month}-${day}`;
		}

		const usMatch = usSlashPattern.exec(dateText);
		if (usMatch) {
			const year = usMatch[3];
			const month = usMatch[1].padStart(2, "0");
			const day = usMatch[2].padStart(2, "0");
			return `${year}-${month}-${day}`;
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