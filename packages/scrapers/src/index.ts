/**
 * Scrapers module exports
 */

import { ScraperRegistry, getScraper, AVAILABLE_SCRAPERS } from "./registry";
import type { ScraperType } from "./registry";

export type { BaseScraper } from "./base-scraper";
export { BandaiHobbyScraper } from "./bandai-hobby";
export { GundamInfoScraper } from "./gundam-info";
export { HobbyLinkScraper } from "./hobbylink";

export type {
	ScraperType,
	ScraperInfo,
} from "./registry";

export {
	ScraperRegistry,
	getScraper,
	AVAILABLE_SCRAPERS,
} from "./registry";

// Convenience exports for common operations
export const Scrapers = {
	/**
   * Get all available scraper types
   */
	getAvailable: () => AVAILABLE_SCRAPERS,

	/**
   * Create a scraper instance
   */
	create: (type: ScraperType) => getScraper(type),

	/**
   * Get scraper information
   */
	getInfo: (type: ScraperType) => ScraperRegistry.getScraperInfo(type),

	/**
   * Get all scraper information
   */
	getAllInfo: () => ScraperRegistry.getAllScraperInfo(),

	/**
   * Find scrapers by specialty
   */
	findBySpecialty: (specialty: string) => ScraperRegistry.findBySpecialty(specialty),

	/**
   * Find scrapers by language
   */
	findByLanguage: (language: string) => ScraperRegistry.findByLanguage(language),

	/**
   * Get recommendations for specific needs
   */
	getRecommendations: (dataNeed: "pricing" | "specifications" | "images" | "availability" | "general") =>
		ScraperRegistry.getRecommendedFor(dataNeed),

	/**
   * Get quality ranking
   */
	getQualityRanking: () => ScraperRegistry.getQualityRanking(),

	/**
   * Get default scraper
   */
	getDefault: () => ScraperRegistry.getDefaultScraper(),
};

