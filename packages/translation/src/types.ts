import { z } from "zod";

// Supported languages for translation
export const SUPPORTED_LANGUAGES = {
	en: "English",
	ja: "Japanese",
	zh: "Chinese",
	zh_cn: "Chinese (Simplified)",
	zh_tw: "Chinese (Traditional)",
	ko: "Korean",
	es: "Spanish",
	fr: "French",
	de: "German",
	it: "Italian",
	pt: "Portuguese",
	ru: "Russian",
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Translation options
export const TranslationOptionsSchema = z.object({
	sourceLanguage: z.string().optional(),
	targetLanguage: z.string(),
	cacheEnabled: z.boolean().default(true),
	cacheTtl: z.number().default(1000 * 60 * 60 * 24 * 7), // 1 week
	retryAttempts: z.number().min(0).max(5).default(3),
	retryDelay: z.number().default(1000), // 1 second
	timeout: z.number().default(10_000), // 10 seconds
	batchSize: z.number().min(1).max(100).default(10),
});

export type TranslationOptions = z.infer<typeof TranslationOptionsSchema>;

// Translation result
export const TranslationResultSchema = z.object({
	original: z.string(),
	translated: z.string(),
	sourceLanguage: z.string(),
	targetLanguage: z.string(),
	cached: z.boolean().default(false),
	processingTime: z.number(),
});

export type TranslationResult = z.infer<typeof TranslationResultSchema>;

// JSON translation options
export const JsonTranslationOptionsSchema = TranslationOptionsSchema.extend({
	translateKeys: z.boolean().default(false),
	ignoredKeys: z.array(z.string()).default([
		"id",
		"url",
		"image",
		"images",
		"pdf",
		"scale",
		"language",
		"partNumber",
		"link",
		"price",
		"currency",
		"date",
		"createdAt",
		"updatedAt",
	]),
	ignoredPatterns: z.array(z.instanceof(RegExp)).default([]),
	preserveNumbers: z.boolean().default(true),
	preserveBooleans: z.boolean().default(true),
});

export type JsonTranslationOptions = z.infer<typeof JsonTranslationOptionsSchema>;

// Cache entry
export const CacheEntrySchema = z.object({
	key: z.string(),
	value: z.string(),
	sourceLanguage: z.string(),
	targetLanguage: z.string(),
	timestamp: z.number(),
	ttl: z.number(),
});

export type CacheEntry = z.infer<typeof CacheEntrySchema>;

// Text replacement rule
export const TextReplacementRuleSchema = z.object({
	pattern: z.union([z.string(), z.instanceof(RegExp)]),
	replacement: z.string(),
	flags: z.string().optional(),
});

export type TextReplacementRule = z.infer<typeof TextReplacementRuleSchema>;

// Translation error types
export enum TranslationErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  INVALID_REQUEST = "INVALID_REQUEST",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  TIMEOUT = "TIMEOUT",
  PARSING_ERROR = "PARSING_ERROR",
  CACHE_ERROR = "CACHE_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

// Translation error
export const TranslationErrorSchema = z.object({
	code: z.nativeEnum(TranslationErrorCode),
	message: z.string(),
	originalError: z.any().optional(),
	requestInfo: z.object({
		text: z.string(),
		sourceLanguage: z.string().optional(),
		targetLanguage: z.string(),
	}).optional(),
});

export type TranslationError = z.infer<typeof TranslationErrorSchema>;

// Translation metrics
export const TranslationMetricsSchema = z.object({
	totalTranslations: z.number().default(0),
	cacheHits: z.number().default(0),
	cacheMisses: z.number().default(0),
	errors: z.number().default(0),
	averageProcessingTime: z.number().default(0),
	lastResetTime: z.number().default(() => Date.now()),
});

export type TranslationMetrics = z.infer<typeof TranslationMetricsSchema>;

// Batch translation request
export const BatchTranslationRequestSchema = z.object({
	texts: z.array(z.string()),
	options: TranslationOptionsSchema,
});

export type BatchTranslationRequest = z.infer<typeof BatchTranslationRequestSchema>;

// Batch translation result
export const BatchTranslationResultSchema = z.object({
	results: z.array(TranslationResultSchema),
	totalCount: z.number(),
	successCount: z.number(),
	errorCount: z.number(),
	processingTime: z.number(),
});

export type BatchTranslationResult = z.infer<typeof BatchTranslationResultSchema>;