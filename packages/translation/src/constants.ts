import { resolveWorkspacePath } from "@hobby-ninja/utils/workspace";

import { TranslationErrorCode, TextReplacementRule, SupportedLanguage } from "./types";

// Supported languages for translation
export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, string> = {
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
};

// Text replacement patterns for Gunpla-specific content
export const GUNDAM_TEXT_REPLACEMENTS: TextReplacementRule[] = [
	// Remove tax and price-related text
	{
		pattern: "（税10%込）",
		replacement: "",
	},
	{
		pattern: "（税8%込）",
		replacement: "",
	},
	{
		pattern: "｜バンダイ ホビーサイト",
		replacement: "",
	},

	// Common Gundam/ Gunpla terms with their translations
	{
		pattern: /ガンダム/g,
		replacement: "Gundam",
	},
	{
		pattern: /ガンプラ/g,
		replacement: "Gunpla",
	},
	{
		pattern: /HG/g,
		replacement: "HG",
	},
	{
		pattern: /MG/g,
		replacement: "MG",
	},
	{
		pattern: /PG/g,
		replacement: "PG",
	},
	{
		pattern: /RG/g,
		replacement: "RG",
	},
	{
		pattern: /SD/g,
		replacement: "SD",
	},
	{
		pattern: /レビル/g,
		replacement: "Revil",
	},
	{
		pattern: /ジオン/g,
		replacement: "Zeon",
	},
	{
		pattern: /地球連邦/g,
		replacement: "Earth Federation",
	},

	// Common Japanese particles and markers
	{
		pattern: /です/g,
		replacement: "",
	},
	{
		pattern: /ます/g,
		replacement: "",
	},
	{
		pattern: /である/g,
		replacement: "",
	},
	{
		pattern: /でした/g,
		replacement: "",
	},
	{
		pattern: /ました/g,
		replacement: "",
	},

	// Model kit related terms
	{
		pattern: /スケール/g,
		replacement: "Scale",
	},
	{
		pattern: /モデル/g,
		replacement: "Model",
	},
	{
		pattern: /キット/g,
		replacement: "Kit",
	},
	{
		pattern: /プラモデル/g,
		replacement: "Plamo",
	},
	{
		pattern: /組み立て/g,
		replacement: "Assembly",
	},
	{
		pattern: /説明書/g,
		replacement: "Manual",
	},
	{
		pattern: /マニュアル/g,
		replacement: "Manual",
	},
	{
		pattern: /ランナー/g,
		replacement: "Runner",
	},
	{
		pattern: /シール/g,
		replacement: "Seal",
	},
	{
		pattern: /ステッカー/g,
		replacement: "Sticker",
	},
	{
		pattern: /マーキング/g,
		replacement: "Marking",
	},
	{
		pattern: /ウェポン/g,
		replacement: "Weapon",
	},
	{
		pattern: /アクセサリー/g,
		replacement: "Accessory",
	},

	// Common markers and punctuation
	{
		pattern: /【/g,
		replacement: "[",
	},
	{
		pattern: /】/g,
		replacement: "]",
	},
	{
		pattern: /「/g,
		replacement: '"',
	},
	{
		pattern: /」/g,
		replacement: '"',
	},
	{
		pattern: /…/g,
		replacement: "...",
	},
	{
		pattern: /※/g,
		replacement: "*",
	},

	// Release and date related terms
	{
		pattern: /発売/g,
		replacement: "Release",
	},
	{
		pattern: /予定/g,
		replacement: "Scheduled",
	},
	{
		pattern: /年/g,
		replacement: "",
	},
	{
		pattern: /月/g,
		replacement: "",
	},
	{
		pattern: /日/g,
		replacement: "",
	},

	// Common suffixes and prefixes to remove or clean up
	{
		pattern: /〜$/,
		replacement: "",
	},
	{
		pattern: /^〜/,
		replacement: "",
	},

	// Multiple spaces and newlines
	{
		pattern: /\s+/g,
		replacement: " ",
	},
	{
		pattern: /^\s+|\s+$/g,
		replacement: "",
	},
];

// Default translation options
export const DEFAULT_TRANSLATION_OPTIONS = {
	sourceLanguage: "auto",
	targetLanguage: "en",
	cacheEnabled: true,
	cacheTtl: 1000 * 60 * 60 * 24 * 7, // 1 week
	retryAttempts: 3,
	retryDelay: 1000,
	timeout: 10_000,
	batchSize: 10,
} as const;

// API endpoints
export const GOOGLE_TRANSLATE_API_URL = "https://translate.googleapis.com/translate_a/single";

// Rate limiting
export const RATE_LIMIT_DELAY = 1000; // 1 second between requests
export const MAX_BATCH_SIZE = 50;
export const MAX_TEXT_LENGTH = 5000; // Maximum text length per request

// Cache settings
export const DEFAULT_CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 1 week
export const MAX_CACHE_SIZE = 10_000; // Maximum number of entries in memory cache

// Shared translation storage paths (resolved to workspace root)
export const TRANSLATION_STORE_DIR = resolveWorkspacePath("data/translations");
export const TRANSLATION_DICTIONARY_PATH = resolveWorkspacePath("data/src/translations/dictionary.json");
export const TRANSLATION_CACHE_DIR = resolveWorkspacePath("data/translations/ja/en");
export const CANONICAL_PHRASES_PATH = resolveWorkspacePath("data/translations/canonical-phrases.json");

// Error messages
export const ERROR_MESSAGES = {
	[TranslationErrorCode.NETWORK_ERROR]: "Network error occurred while translating",
	[TranslationErrorCode.RATE_LIMIT_EXCEEDED]: "Rate limit exceeded, please try again later",
	[TranslationErrorCode.QUOTA_EXCEEDED]: "Translation quota exceeded",
	[TranslationErrorCode.INVALID_REQUEST]: "Invalid translation request",
	[TranslationErrorCode.SERVICE_UNAVAILABLE]: "Translation service is temporarily unavailable",
	[TranslationErrorCode.TIMEOUT]: "Translation request timed out",
	[TranslationErrorCode.PARSING_ERROR]: "Failed to parse translation response",
	[TranslationErrorCode.CACHE_ERROR]: "Cache operation failed",
	[TranslationErrorCode.UNKNOWN_ERROR]: "Unknown error occurred during translation",
} as const;