import type { GundamData, LanguageDetection } from "@workspace/types/product-data.js";
import * as cheerio from "cheerio";

import { BaseScraper } from "./base-scraper.js";

export class GundamInfoScraper extends BaseScraper {
	constructor() {
		super({
			baseUrl: "https://gundam.info",
			userAgent: "GundamDataScraper/1.0 (compatible; +https://gundam.info)",
			delayMs: 3000,
			cacheEnabled: true,
		});
	}

	async extractFromPage(html: string, url: string): Promise<GundamData> {
		const $ = cheerio.load(html);
		const languageDetection = this.detectLanguage($, url);

		// Extract basic product information
		const name = this.extractName($);
		const brand = this.extractBrand($);
		const category = this.extractCategory($);
		const grade = this.extractGrade($);
		const scale = this.extractScale($);
		const price = this.extractGundamInfoPrice($);
		const releaseDate = this.extractReleaseDate($);
		const description = this.extractDescription($);
		const specifications = this.extractSpecifications($);
		const images = this.extractImages($);

		// Generate ID from URL and name
		const id = this.generateGundamInfoId("gundam-info", name, url);

		const result: GundamData = {
			id,
			name,
			brand,
			category,
			specifications: {
				...specifications,
				...(grade && { grade }),
				...(scale && { scale }),
			},
			images,
			language: languageDetection,
			url,
			source: "gundam-info",
			scrapedAt: new Date().toISOString(),
		};

		// Add optional properties only if they have values
		if (price !== null && price !== undefined) {
			result.price = price.amount;
			result.currency = price.currency;
		}
		if (releaseDate !== null && releaseDate !== undefined) result.releaseDate = releaseDate;
		if (description !== null && description !== undefined) result.description = description;

		return result;
	}

	/**
   * Extract product name
   */
	private extractName($: cheerio.CheerioAPI | cheerio.Root): string {
		// Try multiple selectors for product name
		const selectors = [
			"h1.product-title",
			".product-name h1",
			"h1",
			".entry-title h1",
			'meta[property="og:title"]',
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				let name = selector.includes("meta")
					? element.attr("content") || ""
					: element.text().trim();

				if (name) {
					// Clean up the name
					name = name.replaceAll(/\s+/g, " ").trim();

					// Remove common prefixes
					name = name.replace(/^(MG|HG|PG|RG|EG)\s+/i, "");
					name = name.replace(/^(Master Grade|High Grade|Perfect Grade|Real Grade|Entry Grade)\s+/i, "");

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
		const selectors = [
			".brand-name",
			".product-brand",
			".manufacturer",
			'meta[name="brand"]',
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				const brand = selector.includes("meta")
					? element.attr("content") || ""
					: element.text().trim();

				if (brand) {
					return brand.replaceAll(/\s+/g, " ").trim();
				}
			}
		}

		// Default to Bandai for Gundam models
		return "Bandai";
	}

  
	/**
   * Extract category
   */
	private extractCategory($: cheerio.CheerioAPI | cheerio.Root): string {
		// Look for category in breadcrumbs or tags
		const selectors = [
			".breadcrumb a:last",
			".category",
			".product-category",
			".tag",
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

		return "";
	}

	/**
   * Extract grade information
   */
	private extractGrade($: cheerio.CheerioAPI | cheerio.Root): string {
		const text = $("body").text();

		// Look for grade mentions in text
		const grades = ["MG", "HG", "PG", "RG", "EG", "SD"];

		for (const grade of grades) {
			const regex = new RegExp(String.raw`\b${grade}\b`, "gi");
			if (regex.test(text)) {
				return grade;
			}
		}

		return "";
	}

	/**
   * Extract scale information
   */
	private extractScale($: cheerio.CheerioAPI | cheerio.Root): string {
		const text = $("body").text();

		// Common Gundam scales
		const scales = ["1/144", "1/100", "1/60", "1/48", "1/35", "1/24", "1/12"];

		for (const scale of scales) {
			if (text.includes(scale)) {
				return scale;
			}
		}

		return "";
	}

	/**
   * Extract price information
   */
	private extractGundamInfoPrice($: cheerio.CheerioAPI | cheerio.Root): { amount: number; currency: string } | null {
		const selectors = [
			".price",
			".product-price",
			".price-value",
			'meta[property="product:price:amount"]',
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				const priceText = selector.includes("meta")
					? element.attr("content") || ""
					: element.text().trim();

				if (priceText) {
					return this.parsePrice(priceText);
				}
			}
		}

		return null;
	}

	/**
   * Parse price text
   */
	private parsePrice(priceText: string): { amount: number; currency: string } | null {
		// Remove currency symbols and extract numbers
		const cleaned = priceText.replaceAll(/[¥$€£]/g, "").trim();
		const numberMatch = cleaned.match(/[\d,]+(?:\.\d+)?/);

		if (numberMatch) {
			const amount = Number.parseFloat(numberMatch[0].replaceAll(",", ""));

			// Detect currency
			let currency = "JPY"; // Default
			if (priceText.includes("¥") || priceText.includes("JPY")) {
				currency = "JPY";
			} else if (priceText.includes("$") || priceText.includes("USD")) {
				currency = "USD";
			} else if (priceText.includes("€") || priceText.includes("EUR")) {
				currency = "EUR";
			}

			return { amount, currency };
		}

		return null;
	}

	/**
   * Extract release date
   */
	private extractReleaseDate($: cheerio.CheerioAPI | cheerio.Root): string | null {
		const selectors = [
			".release-date",
			".product-date",
			".launch-date",
			'meta[property="product:release_date"]',
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				const dateText = selector.includes("meta")
					? element.attr("content") || ""
					: element.text().trim();

				if (dateText) {
					return this.parseDate(dateText);
				}
			}
		}

		return null;
	}

	/**
   * Parse date text
   */
	private parseDate(dateText: string): string | null {
		// Try to parse various date formats
		const date = new Date(dateText);
		if (!isNaN(date.getTime())) {
			return date.toISOString().split("T")[0] || null; // Return just the date part
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
			".summary",
			'meta[name="description"]',
		];

		for (const selector of selectors) {
			const element = $(selector).first();
			if (element.length > 0) {
				const description = selector.includes("meta")
					? element.attr("content") || ""
					: element.text().trim();

				if (description && description.length > 10) {
					return description.replaceAll(/\s+/g, " ").trim();
				}
			}
		}

		return null;
	}

	/**
   * Extract specifications
   */
	private extractSpecifications($: cheerio.CheerioAPI | cheerio.Root): Record<string, unknown> {
		const specs: Record<string, unknown> = {};

		// Look for specification table
		$(".specifications tr, .specs tr").each((_index: number, element: cheerio.Element) => {
			const row = $(element);
			const header = row.find("th, td:first").text().trim();
			const value = row.find("td:last").text().trim();

			if (header && value) {
				const key = this.normalizeSpecKey(header);
				specs[key] = value;
			}
		});

		return specs;
	}

	/**
   * Extract images
   */
	private extractImages($: cheerio.CheerioAPI | cheerio.Root): Array<{ type: string; url: string; alt: string }> {
		const images: Array<{ type: string; url: string; alt: string }> = [];

		// Main product image
		$(".product-image img, .main-image img, .gallery img").each((_index: number, element: cheerio.Element) => {
			const img = $(element);
			const src = img.attr("src") || img.attr("data-src");
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
   * Detect language of the page
   */
	private detectLanguage($: cheerio.CheerioAPI | cheerio.Root, url: string): LanguageDetection {
		// Check URL for language indicators
		if (url.includes("/en/") || url.includes("/english")) {
			return {
				language: "en",
				confidence: 0.9,
				method: "url-pattern",
				evidence: ["URL contains language indicator"],
			};
		}

		// Check page content
		const text = $("body").text().slice(0, 1000);
		const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
		const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;

		if (japaneseChars > englishWords * 2) {
			return {
				language: "ja",
				confidence: 0.8,
				method: "content-analysis",
				evidence: ["High proportion of Japanese characters"],
			};
		} else if (englishWords > japaneseChars * 2) {
			return {
				language: "en",
				confidence: 0.8,
				method: "content-analysis",
				evidence: ["High proportion of English text"],
			};
		}

		return {
			language: "unknown",
			confidence: 0.1,
			method: "fallback",
			evidence: ["Could not determine language"],
		};
	}

	/**
   * Normalize category name
   */
	private normalizeCategory(category: string): string {
		const categoryMap: Record<string, string> = {
			"master grade": "MG",
			"high grade": "HG",
			"perfect grade": "PG",
			"real grade": "RG",
			"entry grade": "EG",
			"super deformed": "SD",
		};

		const normalized = category.toLowerCase();
		return categoryMap[normalized] || category;
	}

	/**
   * Normalize specification key
   */
	private normalizeSpecKey(key: string): string {
		return key
			.toLowerCase()
			.replaceAll(/\s+/g, "_")
			.replaceAll(/[^\w_]/g, "");
	}

	/**
   * Determine image type
   */
	private determineImageType(img: cheerio.Cheerio, url: string): string {
		if (img.hasClass("main") || img.parent().hasClass("main-image")) {
			return "main";
		}

		if (img.hasClass("gallery") || img.parent().hasClass("gallery")) {
			return "gallery";
		}

		if (url.includes("thumbnail") || img.hasClass("thumb")) {
			return "thumbnail";
		}

		return "product-image";
	}

	/**
   * Generate unique ID
   */
	private generateGundamInfoId(source: string, name: string, url: string): string {
		const cleanName = name.replaceAll(/[^a-zA-Z0-9]/g, "").toLowerCase();
		const urlHash = Buffer.from(url).toString("base64").slice(0, 8);
		return `${source}-${cleanName}-${urlHash}`;
	}
}