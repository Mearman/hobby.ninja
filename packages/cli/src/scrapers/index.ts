/**
 * Scrapers module exports
 */

import { ScraperRegistry, getScraper, AVAILABLE_SCRAPERS } from './registry.js';
import type { ScraperType } from './registry.js';

export type { BaseScraper } from './base-scraper.js';
export { BandaiHobbyScraper } from './bandai-hobby.js';
export { GundamInfoScraper } from './gundam-info.js';
export { HobbyLinkScraper } from './hobbylink.js';

export type {
  ScraperType,
  ScraperInfo
} from './registry.js';

export {
  ScraperRegistry,
  getScraper,
  AVAILABLE_SCRAPERS
} from './registry.js';

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
  getRecommendations: (dataNeed: 'pricing' | 'specifications' | 'images' | 'availability' | 'general') =>
    ScraperRegistry.getRecommendedFor(dataNeed),

  /**
   * Get quality ranking
   */
  getQualityRanking: () => ScraperRegistry.getQualityRanking(),

  /**
   * Get default scraper
   */
  getDefault: () => ScraperRegistry.getDefaultScraper()
};

/**
 * Default export for convenience
 */
export default Scrapers;