import { z } from "zod";
import homepageJson from "../dist/homepage.json" with { type: "json" };
import {
	HomepageDataSchema,
	type HomepageData,
	type HomepageStats,
	type Item,
	type Brand,
	type Category,
} from "./schemas.js";

/**
 * Validated homepage data with helper functions
 *
 * Pre-computed homepage data including:
 * - Overall statistics (item/brand/series/category counts)
 * - Featured items (items with images, prices, recent releases)
 * - Popular brands (brands with most items)
 * - Categories for navigation
 */

export const homepage = HomepageDataSchema.parse(homepageJson);

/**
 * Get homepage statistics
 */
export function getStats(): HomepageStats {
	return homepage.stats;
}

/**
 * Get featured items for homepage display
 * These are pre-selected items with images and price information
 */
export function getFeaturedItems(): Item[] {
	return homepage.featuredItems;
}

/**
 * Get popular brands sorted by item count
 */
export function getPopularBrands(): Brand[] {
	return homepage.popularBrands;
}

/**
 * Get all categories for navigation
 */
export function getCategories(): Category[] {
	return homepage.categories;
}

/**
 * Get a specific featured item by ID
 */
export function getFeaturedItemById(id: string): Item | undefined {
	return homepage.featuredItems.find(item => item.id === id);
}

/**
 * Get a popular brand by ID
 */
export function getPopularBrandById(id: string): Brand | undefined {
	return homepage.popularBrands.find(brand => brand.id === id);
}

export type { HomepageData, HomepageStats } from "./schemas.js";
export type { Item } from "./schemas.js";
export type { Brand } from "./schemas.js";
export type { Category } from "./schemas.js";
