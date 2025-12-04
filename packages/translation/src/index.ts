// Main exports
export {
	TranslationService,
	defaultTranslator,
	translateText,
	translateBatch,
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
} from "./constants";

export { ERROR_MESSAGES } from "./constants";

// Logger exports
export { Logger, logger, log } from "./logger";
export type { LoggerConfig, LogLevel } from "./logger";

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