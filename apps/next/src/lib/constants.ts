/**
 * Application-wide constants
 * Centralized to avoid magic numbers throughout the codebase
 */

import { itemsList } from "@hobby-ninja/data/items";

// Pagination and Limits
export const PAGINATION = {
	ITEMS_PER_PAGE: 24,
	STATIC_PARAMS_COUNT: 20,
	DEFAULT_SEARCH_LIMIT: 100,
	DEFAULT_SUGGESTION_LIMIT: 10,
	RANDOM_ITEMS_COUNT: 12,
	CATEGORY_PREVIEW_COUNT: 12,
	// Grid layout columns
	MOBILE_GRID_COLS: 1,
	SMALL_SCREEN_GRID_COLS: 2,
	TABLET_GRID_COLS: 3,
	DESKTOP_GRID_COLS: 4,
} as const;

// UI Sizing and Dimensions
export const UI = {
	// Icon sizes
	ICON_SIZE_XS: 12,
	ICON_SIZE_SM: 14,
	ICON_SIZE_MD: 16,
	ICON_SIZE_LG: 20,
	ICON_SIZE_XL: 24,
	ICON_SIZE_XXL: 32,

	// Image dimensions
	THUMBNAIL_WIDTH: 280,
	THUMBNAIL_HEIGHT: 200,
	PLACEHOLDER_HEIGHT: 200,
	AVATAR_SIZE: 40,
	AVATAR_SMALL_SIZE: 60,
	BRAND_LOGO_SIZE: 60,
	SERIES_IMAGE_WIDTH: 160,
	SERIES_IMAGE_HEIGHT: 80,

	// Layout dimensions
	MENU_WIDTH: 200,
	DRAWER_WIDTH: 300,
	SELECT_WIDTH: 150,
	CONTAINER_WIDTH: 400,
	STICKY_TOP_POSITION: 20,

	// Skeleton loading
	SKELETON_COUNT: 9,
	SKELETON_HEIGHT_SMALL: 8,
	SKELETON_HEIGHT_MEDIUM: 16,
	SKELETON_HEIGHT_LARGE: 20,
	SKELETON_HEIGHT_XL: 24,
	SKELETON_HEIGHT_XXL: 32,
	SKELETON_HEIGHT_XXXL: 48,

	// Feature icon sizes
	FEATURE_ICON_SIZE: 48,
	FEATURE_ICON_INNER_SIZE: 24,

	// Button icon sizes
	BUTTON_ICON_SIZE: 18,

	// Search results
	HOMEPAGE_SEARCH_RESULTS: 8,
} as const;

// Typography
export const TYPOGRAPHY = {
	FONT_WEIGHT_LIGHT: 400,
	FONT_WEIGHT_NORMAL: 500,
	FONT_WEIGHT_MEDIUM: 600,
	FONT_WEIGHT_BOLD: 700,
} as const;

// Timing and Delays
export const TIMING = {
	DEBOUNCE_SHORT: 100,
	DEBOUNCE_MEDIUM: 200,
	DEBOUNCE_DEFAULT: 300,
	DEBOUNCE_LONG: 500,
	DEBOUNCE_SEARCH: 300,
} as const;

// Filtering and Search
export const FILTER = {
	MIN_YEAR: 1980,
	MIN_PRICE: 0,
	MAX_PRICE: 50_000,
	PRICE_STEP: 1000,
	FUZZY_SEARCH_DISTANCE: 100,
	FUZZY_THRESHOLD: 0.05,
	// Calculated year markers for sliders
	YEAR_MARK_1990: 1990,
	YEAR_MARK_2000: 2000,
	YEAR_MARK_2010: 2010,
	YEAR_MARK_2020: 2020,
	// Calculated price markers for sliders (percentages of MAX_PRICE)
	PRICE_MARK_20_PERCENT: 10_000, // 20% of MAX_PRICE
	PRICE_MARK_50_PERCENT: 25_000, // 50% of MAX_PRICE
} as const;

// Dynamic MAX_YEAR - calculated from dataset at build time
// Data is embedded via top-level import from @hobby-ninja/data
export function getMaxYear(): number {
	const years = itemsList
		.map(item => item.releaseDate?.year)
		.filter((year): year is number => year !== undefined && year !== null && year > 0);

	if (years.length === 0) {
		return new Date().getFullYear();
	}

	return Math.max(...years);
}

// Legacy constant for backward compatibility - deprecated
// Use getMaxYear() instead for dynamic calculation
export const LEGACY_MAX_YEAR = 2025;

// Z-Index layers
export const Z_INDEX = {
	MODAL: 9999,
	DROPDOWN: 1000,
	STICKY: 100,
} as const;

// Data Generation
export const DATA_GENERATION = {
	TESTING_ITEMS_LIMIT: 100,
	DESCRIPTION_TRUNCATION_LENGTH: 160,
} as const;

// Progress calculations
export const PROGRESS = {
	PERCENTAGE_MULTIPLIER: 100,
} as const;

// URL and API
export const URL = {
	MAX_URL_LENGTH: 2048,
} as const;

// Statistics
export const STATS = {
	TOTAL_ITEMS: 8485,
	TOTAL_SERIES: 137,
	TOTAL_BRANDS: 80,
} as const;

// CSS Values
export const CSS = {
	FULL_WIDTH: "100%",
	FULL_HEIGHT: "100%",
	PERCENT_ZERO: "0%",
	PERCENT_SIXTY: "60%",
	GRADIENT_START: "0%",
	GRADIENT_END: "100%",
	OPACITY_HIDDEN: "0",
	OPACITY_VISIBLE: "1",
} as const;