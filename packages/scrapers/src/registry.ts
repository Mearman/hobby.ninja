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

// Constants for duplicate strings
const GUNDAM_INFO_TYPE = "gundam-info" as const;
const GUNDAM_INFO_DOMAIN = "gundam.info";

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

// Private registry data
const scrapers = new Map<ScraperType, ScraperConstructor>([
	[GUNDAM_INFO_TYPE, GundamInfoScraper as unknown as ScraperConstructor],
	["hobbylink", HobbyLinkScraper as unknown as ScraperConstructor],
]);

const scraperInfo = new Map<ScraperType, ScraperInfo>([
	[GUNDAM_INFO_TYPE, {
		type: GUNDAM_INFO_TYPE,
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
export function createScraper(type: ScraperType): BaseScraper {
	const ScraperClass = scrapers.get(type);
	if (!ScraperClass) {
		throw new Error(`Unknown scraper type: ${type}. Available types: ${getAvailableTypes().join(", ")}`);
	}
	return new ScraperClass();
}

/**
 * Get all available scraper types
 */
export function getAvailableTypes(): ScraperType[] {
	return [...scrapers.keys()];
}

/**
 * Get information about a specific scraper
 */
export function getScraperInfo(type: ScraperType): ScraperInfo | null {
	return scraperInfo.get(type) ?? null;
}

/**
 * Get information about all scrapers
 */
export function getAllScraperInfo(): ScraperInfo[] {
	return [...scraperInfo.values()];
}

/**
 * Find scrapers by specialty
 */
export function findBySpecialty(specialty: string): ScraperInfo[] {
	const normalizedSpecialty = specialty.toLowerCase();
	return [...scraperInfo.values()].filter(info =>
		info.specialties.some(s => s.toLowerCase() === normalizedSpecialty),
	);
}

/**
 * Find scrapers that support a specific language
 */
export function findByLanguage(language: string): ScraperInfo[] {
	return [...scraperInfo.values()].filter(info =>
		info.supportedLanguages.includes(language),
	);
}

/**
 * Get recommended scrapers for specific data needs
 * Note: Bandai Hobby scraping is now handled by packages/cli (BandaiCatalogParser + GlobalSiteLookup)
 */
export function getRecommendedFor(dataNeed: "pricing" | "specifications" | "images" | "availability" | "general"): ScraperInfo[] {
	switch (dataNeed) {
		case "pricing": {
			return [getScraperInfo("hobbylink")].filter((info): info is ScraperInfo => info !== null);
		}

		case "specifications": {
			return [getScraperInfo(GUNDAM_INFO_TYPE)].filter((info): info is ScraperInfo => info !== null);
		}

		case "images": {
			return [getScraperInfo("hobbylink")].filter((info): info is ScraperInfo => info !== null);
		}

		case "availability": {
			return [getScraperInfo("hobbylink")].filter((info): info is ScraperInfo => info !== null);
		}

		default: {
			return [getScraperInfo(GUNDAM_INFO_TYPE), getScraperInfo("hobbylink")].filter((info): info is ScraperInfo => info !== null);
		}
	}
}

/**
 * Validate scraper type
 */
export function isValidType(type: string): type is ScraperType {
	return scrapers.has(type as ScraperType);
}

/**
 * Get default scraper for general use
 * Note: For Bandai Hobby data, use packages/cli (BandaiCatalogParser + GlobalSiteLookup)
 */
export function getDefaultScraper(): ScraperInfo {
	const scraper = getScraperInfo(GUNDAM_INFO_TYPE);
	if (!scraper) {
		throw new Error("Default scraper 'gundam-info' not found in registry");
	}
	return scraper;
}

/**
 * Get scraper recommendations based on quality and reliability
 */
export function getQualityRanking(): ScraperInfo[] {
	const allScrapers = [...scraperInfo.values()];
	return allScrapers.toSorted((a, b) => {
		// Prioritize official sources (gundam.info is official)
		if (a.baseUrl.includes(GUNDAM_INFO_DOMAIN) && !b.baseUrl.includes(GUNDAM_INFO_DOMAIN)) return -1;
		if (!a.baseUrl.includes(GUNDAM_INFO_DOMAIN) && b.baseUrl.includes(GUNDAM_INFO_DOMAIN)) return 1;

		// Then by language support
		if (a.supportedLanguages.length > b.supportedLanguages.length) return -1;
		if (a.supportedLanguages.length < b.supportedLanguages.length) return 1;

		// Finally by name for consistency
		return a.name.localeCompare(b.name);
	});
}

/**
 * Export convenience function for getting a scraper
 */
export function getScraper(type: ScraperType): BaseScraper {
	return createScraper(type);
}

/**
 * Export list of available scraper types
 */
export const AVAILABLE_SCRAPERS = getAvailableTypes();

/**
 * Scraper registry namespace for backward compatibility
 * @deprecated Use individual exported functions instead
 */
export const ScraperRegistry = {
	createScraper,
	getAvailableTypes,
	getScraperInfo,
	getAllScraperInfo,
	findBySpecialty,
	findByLanguage,
	getRecommendedFor,
	isValidType,
	getDefaultScraper,
	getQualityRanking,
} as const;
