// Main exports
export {
	TranslationService,
	defaultTranslator,
	translateText,
	translateBatch,
	createTranslationServiceWithStore,
} from "./translator";

export {
	JsonTranslator,
	defaultJsonTranslator,
	translateJson,
} from "./json-translator";

export {
	TranslationCache,
	defaultCache,
	createCache,
} from "./cache";

export {
	TranslationServiceError,
	CircuitBreaker,
	ErrorHandler,
	retryWithBackoff,
} from "./errors";

// Type exports
export type {
	SupportedLanguage,
	TranslationOptions,
	TranslationResult,
	JsonTranslationOptions,
	CacheEntry,
	TextReplacementRule,
	TranslationError,
	TranslationMetrics,
	BatchTranslationRequest,
	BatchTranslationResult,
} from "./types";

export { TranslationErrorCode } from "./types";

// Constant exports
export {
	SUPPORTED_LANGUAGES,
	DEFAULT_TRANSLATION_OPTIONS,
	GUNDAM_TEXT_REPLACEMENTS,
	RATE_LIMIT_DELAY,
	MAX_TEXT_LENGTH,
	MAX_BATCH_SIZE,
	DEFAULT_CACHE_TTL,
	TRANSLATION_STORE_DIR,
	TRANSLATION_DICTIONARY_PATH,
	TRANSLATION_CACHE_DIR,
} from "./constants";

export { ERROR_MESSAGES } from "./constants";

// Store exports
export {
	TranslationStore,
	TranslationStoreError,
} from "./store/translation-store";

// Store factory exports
export {
	createTranslationStore,
	createServerTranslationStore,
	createBrowserTranslationStore,
	createTestTranslationStore,
	validateStoreConfig,
	createStoreConfig,
	DEFAULT_STORE_CONFIG as defaultStoreConfig,
} from "./store/translation-store-factory";

export type {
	TranslationEntry,
	StoreConfiguration,
	StoreStatistics,
	StoreHealth,
	StorageMetadata,
	StoreError as StoreErrorType,
	StoreWarning,
} from "./store/translation-store";

// JSON Storage exports
export {
	JSONStorage,
	JSONStorageError,
} from "./store/json-storage";

export type {
	JSONStorageConfig,
	FileOperationResult,
	StorageStatistics,
} from "./store/json-storage";

// Hashing exports
export {
	generateTextHash,
	generateKey,
	validateKey,
	extractKeyComponents,
	validateHash,
	normalizeLanguageCode,
	areKeysEquivalent,
	generateBatchHash,
	HashingError,
	KEY_SEPARATOR,
	KEY_FORMAT_REGEX,
} from "./store/hashing";

export type {
	KeyComponents,
	HashingOptions,
} from "./store/hashing";

// Logger exports
export { Logger, logger, log } from "./logger";
export type { LoggerConfig, LogLevel } from "./logger";

// Dictionary exports
export {
	loadDictionary,
	lookupPhrase,
	lookupWord,
	isDictionaryLoaded,
	getDictionaryStats,
	getPatterns,
	clearDictionaryCache,
	addPhrase,
} from "./dictionary";

export type {
	WordMapping,
	PhraseMapping,
	DiscoveredPattern,
	DictionaryStats,
	TranslationDictionary,
} from "./dictionary";

// Dictionary builder exports
export {
	buildDictionary,
	rebuildAndReloadDictionary,
} from "./dictionary-builder";

export type {
	DictionaryBuildResult,
	DictionaryBuildOptions,
} from "./dictionary-builder";

// Text normalizer exports
export {
	normalizeText,
	normalizeTexts,
} from "./text-normalizer";

export type { NormalizerOptions } from "./text-normalizer";

// Schema exports for validation
export {
	TranslationOptionsSchema,
	TranslationResultSchema,
	JsonTranslationOptionsSchema,
	CacheEntrySchema,
	TextReplacementRuleSchema,
	TranslationErrorSchema,
	TranslationMetricsSchema,
	BatchTranslationRequestSchema,
	BatchTranslationResultSchema,
} from "./types";