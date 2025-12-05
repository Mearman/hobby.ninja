/**
 * Scraper registry for managing all available data sources
 */

import { BandaiHobbyScraper } from "./bandai-hobby";
import type { BaseScraper } from "./base-scraper";
import { GundamInfoScraper } from "./gundam-info";
import { HobbyLinkScraper } from "./hobbylink";

export type ScraperType = "bandai-hobby" | "gundam-info" | "hobbylink";

export interface ScraperInfo {
  type: ScraperType;
  name: string;
  description: string;
  baseUrl: string;
  supportedLanguages: string[];
  defaultDelayMs: number;
  requiresAuth: boolean;
  specialties: string[];
}

type ScraperConstructor = new (...args: any[]) => BaseScraper;

/**
 * Registry of all available scrapers with their metadata
 */
export class ScraperRegistry {
	private static scrapers: Map<ScraperType, ScraperConstructor> = new Map([
		["bandai-hobby", BandaiHobbyScraper as unknown as ScraperConstructor],
		["gundam-info", GundamInfoScraper as unknown as ScraperConstructor],
		["hobbylink", HobbyLinkScraper as unknown as ScraperConstructor],
	]);

	private static scraperInfo: Map<ScraperType, ScraperInfo> = new Map([
		["bandai-hobby", {
			type: "bandai-hobby",
			name: "Bandai Hobby Official Site",
			description: "Official Bandai hobby site with comprehensive product information and high-quality images",
			baseUrl: "https://bandai-hobby.net",
			supportedLanguages: ["ja", "en"],
			defaultDelayMs: 3000,
			requiresAuth: false,
			specialties: ["gunpla", "product-catalog", "official-specs", "release-dates"],
		}],
		["gundam-info", {
			type: "gundam-info",
			name: "Gundam.Info",
			description: "Official Gundam portal with series information and product details",
			baseUrl: "https://gundam.info",
			supportedLanguages: ["ja", "en", "zh"],
			defaultDelayMs: 4000,
			requiresAuth: false,
			specialties: ["series-info", "product-details", "grade-information", "scale-data"],
		}],
		["hobbylink", {
			type: "hobbylink",
			name: "HobbyLink Japan (1999.co.jp)",
			description: "Major Japanese hobby retailer with extensive catalog and pricing information",
			baseUrl: "https://www.1999.co.jp",
			supportedLanguages: ["ja"],
			defaultDelayMs: 4000,
			requiresAuth: false,
			specialties: ["pricing", "jan-codes", "availability", "japanese-market"],
		}],
	]);

	/**
   * Create a scraper instance for the specified type
   */
	static createScraper(type: ScraperType): BaseScraper {
		const ScraperClass = this.scrapers.get(type);
		if (!ScraperClass) {
			throw new Error(`Unknown scraper type: ${type}. Available types: ${this.getAvailableTypes().join(", ")}`);
		}
		return new ScraperClass();
	}

	/**
   * Get all available scraper types
   */
	static getAvailableTypes(): ScraperType[] {
		return [...this.scrapers.keys()];
	}

	/**
   * Get information about a specific scraper
   */
	static getScraperInfo(type: ScraperType): ScraperInfo | null {
		return this.scraperInfo.get(type) || null;
	}

	/**
   * Get information about all scrapers
   */
	static getAllScraperInfo(): ScraperInfo[] {
		return [...this.scraperInfo.values()];
	}

	/**
   * Find scrapers by specialty
   */
	static findBySpecialty(specialty: string): ScraperInfo[] {
		const normalizedSpecialty = specialty.toLowerCase();
		return [...this.scraperInfo.values()].filter(info =>
			info.specialties.some(s => s.toLowerCase() === normalizedSpecialty),
		);
	}

	/**
   * Find scrapers that support a specific language
   */
	static findByLanguage(language: string): ScraperInfo[] {
		return [...this.scraperInfo.values()].filter(info =>
			info.supportedLanguages.includes(language),
		);
	}

	/**
   * Get recommended scrapers for specific data needs
   */
	static getRecommendedFor(dataNeed: "pricing" | "specifications" | "images" | "availability" | "general"): ScraperInfo[] {
		switch (dataNeed) {
			case "pricing": {
				return [this.getScraperInfo("hobbylink")!, this.getScraperInfo("bandai-hobby")!].filter(Boolean);
			}

			case "specifications": {
				return [this.getScraperInfo("bandai-hobby")!, this.getScraperInfo("gundam-info")!].filter(Boolean);
			}

			case "images": {
				return [this.getScraperInfo("bandai-hobby")!, this.getScraperInfo("hobbylink")!].filter(Boolean);
			}

			case "availability": {
				return [this.getScraperInfo("hobbylink")!].filter(Boolean);
			}

			case "general":
			default: {
				return [this.getScraperInfo("bandai-hobby")!, this.getScraperInfo("gundam-info")!, this.getScraperInfo("hobbylink")!].filter(Boolean);
			}
		}
	}

	/**
   * Validate scraper type
   */
	static isValidType(type: string): type is ScraperType {
		return this.scrapers.has(type as ScraperType);
	}

	/**
   * Get default scraper for general use
   */
	static getDefaultScraper(): ScraperInfo {
		return this.getScraperInfo("bandai-hobby")!;
	}

	/**
   * Get scraper recommendations based on quality and reliability
   */
	static getQualityRanking(): ScraperInfo[] {
		return [...this.scraperInfo.values()]
			.sort((a, b) => {
				// Prioritize official sources
				if (a.baseUrl.includes("bandai") && !b.baseUrl.includes("bandai")) return -1;
				if (!a.baseUrl.includes("bandai") && b.baseUrl.includes("bandai")) return 1;

				// Then by language support
				if (a.supportedLanguages.length > b.supportedLanguages.length) return -1;
				if (a.supportedLanguages.length < b.supportedLanguages.length) return 1;

				// Finally by name for consistency
				return a.name.localeCompare(b.name);
			});
	}
}

/**
 * Export convenience function for getting a scraper
 */
export function getScraper(type: ScraperType): BaseScraper {
	return ScraperRegistry.createScraper(type);
}

/**
 * Export list of available scraper types
 */
export const AVAILABLE_SCRAPERS = ScraperRegistry.getAvailableTypes();