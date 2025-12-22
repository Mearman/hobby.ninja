import { z } from "zod";

import {
	LANGUAGE_CODES,
	EXPORT_FORMATS,
	LOG_LEVELS,
	SCRAPER_TYPES,
	VALIDATION_LIMITS,
	RATE_LIMITING,
	RETRY_CONFIG,
} from "../constants/cli-constants.js";

const LanguageCodeSchema = z.enum(Object.values(LANGUAGE_CODES) as [string, ...string[]]);

const OutputFormatSchema = z.enum(Object.values(EXPORT_FORMATS) as [string, ...string[]]);

const LogLevelSchema = z.enum(Object.values(LOG_LEVELS) as [string, ...string[]]);

const ScraperTypeSchema = z.enum(Object.values(SCRAPER_TYPES) as [string, ...string[]]);

const RateLimitingSchema = z.object({
	enabled: z.boolean(),
	requestsPerSecond: z.number().min(VALIDATION_LIMITS.MIN_REQUESTS_PER_SECOND).max(VALIDATION_LIMITS.MAX_REQUESTS_PER_SECOND),
	burstSize: z.number().min(RATE_LIMITING.MIN_BURST_SIZE).max(RATE_LIMITING.MAX_BURST_SIZE),
});

const FiltersSchema = z.object({
	minPrice: z.number().optional(),
	maxPrice: z.number().optional(),
	categories: z.array(z.string()).optional(),
	excludeKeywords: z.array(z.string()).optional(),
	includeKeywords: z.array(z.string()).optional(),
}).refine(
	(data) => {
		if (data.minPrice !== undefined && data.maxPrice !== undefined) {
			return data.minPrice <= data.maxPrice;
		}
		return true;
	},
	{
		message: "minPrice must be less than or equal to maxPrice",
	},
);

const ExportSchema = z.object({
	includeImages: z.boolean(),
	includeSpecifications: z.boolean(),
	includeCategories: z.boolean(),
	prettyPrint: z.boolean(),
	compression: z.boolean(),
});

export const ScrapingConfigSchema = z.object({
	source: ScraperTypeSchema,
	language: z.union([LanguageCodeSchema, z.literal("all")]),

	output: z.string().min(1),
	format: OutputFormatSchema,

	concurrency: z.number().min(VALIDATION_LIMITS.MIN_CONCURRENCY).max(VALIDATION_LIMITS.MAX_CONCURRENCY),
	delayMs: z.number().min(VALIDATION_LIMITS.MIN_DELAY_MS).max(VALIDATION_LIMITS.MAX_DELAY_MS),
	timeout: z.number().min(VALIDATION_LIMITS.MIN_TIMEOUT_MS).max(VALIDATION_LIMITS.MAX_TIMEOUT_MS),
	retries: z.number().min(RETRY_CONFIG.MIN_RETRIES).max(RETRY_CONFIG.MAX_RETRIES),

	cache: z.boolean(),
	cacheExpiry: z.number().min(VALIDATION_LIMITS.MIN_CACHE_EXPIRY_HOURS).max(VALIDATION_LIMITS.MAX_CACHE_EXPIRY_HOURS), // 1 hour to 1 week

	resume: z.boolean(),
	checkpointsEnabled: z.boolean(),

	validate: z.boolean(),
	fixIssues: z.boolean(),

	verbose: z.boolean(),
	dryRun: z.boolean(),
	logLevel: LogLevelSchema,
	logToFile: z.boolean(),

	rateLimiting: RateLimitingSchema,
	filters: FiltersSchema,
	export: ExportSchema,
});

export type ValidatedConfig = z.infer<typeof ScrapingConfigSchema>;

export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}

export const ConfigValidator = {
	validate(config: unknown): { success: true; data: ValidatedConfig } | { success: false; errors: ValidationError[] } {
		const result = ScrapingConfigSchema.safeParse(config);

		if (result.success) {
			return { success: true, data: result.data };
		}

		const errors: ValidationError[] = result.error.issues.map((issue) => ({
			field: issue.path.join("."),
			message: issue.message,
			value: (issue as { received?: unknown }).received ?? issue.code,
		}));

		return { success: false, errors };
	},

	validatePartial(config: unknown): { success: true; data: Partial<ValidatedConfig> } | { success: false; errors: ValidationError[] } {
		const result = ScrapingConfigSchema.partial().safeParse(config);

		if (result.success) {
			return { success: true, data: result.data as Partial<ValidatedConfig> };
		}

		const errors: ValidationError[] = result.error.issues.map((issue) => ({
			field: issue.path.join("."),
			message: issue.message,
			value: (issue as { received?: unknown }).received ?? issue.code,
		}));

		return { success: false, errors };
	},
};