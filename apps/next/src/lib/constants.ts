/**
 * Application-wide constants
 * Centralized to avoid magic numbers throughout the codebase
 */

// Pagination and Limits
export const PAGINATION = {
  ITEMS_PER_PAGE: 24,
  STATIC_PARAMS_COUNT: 20,
  DEFAULT_SEARCH_LIMIT: 100,
  DEFAULT_SUGGESTION_LIMIT: 10,
  RANDOM_ITEMS_COUNT: 12,
  CATEGORY_PREVIEW_COUNT: 12,
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
  MAX_YEAR: 2024,
  MIN_PRICE: 0,
  MAX_PRICE: 50_000,
  PRICE_STEP: 1_000,
  FUZZY_SEARCH_DISTANCE: 100,
  FUZZY_THRESHOLD: 0.05,
} as const;

// Z-Index layers
export const Z_INDEX = {
  MODAL: 9_999,
  DROPDOWN: 1_000,
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
  MAX_URL_LENGTH: 2_048,
} as const;

// Statistics
export const STATS = {
  TOTAL_ITEMS: 8_485,
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