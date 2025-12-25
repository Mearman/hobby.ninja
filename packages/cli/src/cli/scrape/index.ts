/**
 * Scrape module - exports for internal and external use
 */

// Types and constants
export {
	type ScrapeOptions,
	type ScrapeResult,
	type StepTiming,
	type DownloadStats,
	UNKNOWN_ERROR,
	MAX_ITEM_ID,
	DEFAULT_USER_AGENT,
	FETCH_TIMEOUT_MS,
	MAX_FETCH_RETRIES,
	RETRY_DELAY_MS,
	MS_PER_SECOND,
	SECONDS_PER_MINUTE,
	MINUTES_PER_HOUR,
	HOURS_PER_DAY,
	ITEMS_DATA_DIR,
	MANUALS_DATA_DIR,
	BRANDS_DATA_DIR,
	SERIES_DATA_DIR,
	CATEGORIES_DATA_DIR,
	ASSETS_DIR,
	MANUALS_ASSETS_DIR,
} from "./types.js";

// ID utilities
export {
	padManualId,
	unpadManualId,
	parseItemIdSuffix,
	formatItemId,
} from "./id-utils.js";

// HTTP client and browser management
export {
	withTimeout,
	fetchWithRetry,
	BrowserManager,
} from "./http-client.js";

// Cache management
export {
	checkCacheValidity,
	calculateMaxAgeMs,
	readCachedHtml,
	writeCachedHtml,
} from "./cache-manager.js";

// Translation handling
export {
	translateWithFallback,
	translateItemFallback,
	translateManualFallback,
	storeCanonicalTranslations,
} from "./translation-handler.js";

// Image processing
export {
	downloadItemImages,
	downloadImage,
	extractImageFilename,
	mergeImagePaths,
	downloadManualImage,
	cleanupManualImages,
	removeEmptyDir,
	findImageSrcFromHtml,
} from "./image-processor.js";

// PDF processing
export {
	downloadPdf,
	findExistingPdf,
	downloadManualPdfs,
} from "./pdf-processor.js";

// Data merging
export {
	mergeWithExistingItem,
	mergeWithExistingManual,
	mergeEnglishTranslation,
	mergeEnglishAccessories,
	saveItemJson,
	saveManualJson,
	upsertEntities,
	getEntityDir,
} from "./data-merger.js";
