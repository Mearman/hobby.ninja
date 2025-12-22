/**
 * Scraper registry for managing all available data sources
 *
 * Note: BandaiHobbyScraper has been deprecated and replaced by:
 * - BandaiCatalogParser (packages/cli) for JP site parsing
 * - GlobalSiteLookup (packages/cli) for English translations
 */

import type { BaseScraper } from "./base-scraper";
import { GundamInfoScraper } from "./gundam-info";
import { HobbyLinkScraper } from "./hobbylink";

export type ScraperType = "gundam-info" | "hobbylink";

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

type ScraperConstructor = new (...args: unknown[]) => BaseScraper;

/**
 * Registry of all available scrapers with their metadata
 */
export class ScraperRegistry {
	private static scrapers = new Map<ScraperType, ScraperConstructor>([
		["gundam-info", GundamInfoScraper as unknown as ScraperConstructor],
		["hobbylink", HobbyLinkScraper as unknown as ScraperConstructor],
	]);

	private static scraperInfo = new Map<ScraperType, ScraperInfo>([
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
   * Note: Bandai Hobby scraping is now handled by packages/cli (BandaiCatalogParser + GlobalSiteLookup)
   */
	static getRecommendedFor(dataNeed: "pricing" | "specifications" | "images" | "availability" | "general"): ScraperInfo[] {
		switch (dataNeed) {
			case "pricing": {
				return [this.getScraperInfo("hobbylink")].filter((info): info is ScraperInfo => info !== undefined);
			}

			case "specifications": {
				return [this.getScraperInfo("gundam-info")].filter((info): info is ScraperInfo => info !== undefined);
			}

			case "images": {
				return [this.getScraperInfo("hobbylink")].filter((info): info is ScraperInfo => info !== undefined);
			}

			case "availability": {
				return [this.getScraperInfo("hobbylink")].filter((info): info is ScraperInfo => info !== undefined);
			}

			default: {
				return [this.getScraperInfo("gundam-info"), this.getScraperInfo("hobbylink")].filter((info): info is ScraperInfo => info !== undefined);
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
   * Note: For Bandai Hobby data, use packages/cli (BandaiCatalogParser + GlobalSiteLookup)
   */
	static getDefaultScraper(): ScraperInfo {
		const scraper = this.getScraperInfo("gundam-info");
		if (!scraper) {
			throw new Error("Default scraper 'gundam-info' not found in registry");
		}
		return scraper;
	}

	/**
   * Get scraper recommendations based on quality and reliability
   */
	static getQualityRanking(): ScraperInfo[] {
		const scrapers = [...this.scraperInfo.values()];
		return scrapers.sort((a, b) => {
			// Prioritize official sources (gundam.info is official)
			if (a.baseUrl.includes("gundam.info") && !b.baseUrl.includes("gundam.info")) return -1;
			if (!a.baseUrl.includes("gundam.info") && b.baseUrl.includes("gundam.info")) return 1;

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