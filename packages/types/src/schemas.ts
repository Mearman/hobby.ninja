import { z } from "zod";

/**
 * Zod schemas for runtime type safety and validation
 * These schemas provide runtime validation for all data structures
 */

// Constants for validation to avoid magic numbers
const MAX_PRICE = 999_999;
const MAX_RATING = 10;
const MIN_RATING = 1;
const MIN_ITEMS_PER_PAGE = 10;
const MAX_ITEMS_PER_PAGE = 100;
const MIN_STRING_LENGTH = 2;
const MAX_STRING_LENGTH = 10;
const MAX_NOTES_LENGTH = 1000;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_PROGRESS = 100;
const MAX_TAG_LENGTH = 50;
const DEFAULT_CONCURRENCY = 3;
const MAX_CONCURRENCY = 10;
const DEFAULT_RETRY_ATTEMPTS = 3;
const MAX_RETRY_ATTEMPTS = 5;
const DEFAULT_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 10_000;
const MIN_PERFORMANCE_METRIC = 0;

// Additional constants for commonly used values
const DEFAULT_ITEMS_PER_PAGE = 20;
const DEFAULT_QUANTITY = 1;
const MIN_QUANTITY = 1;
const DEFAULT_PROGRESS = 0;
const MIN_PROGRESS = 0;
const MIN_STRING_CONTENT_LENGTH = 1;
const MIN_CONCURRENCY = 1;
const MIN_RETRY_ATTEMPTS = 0;
const MIN_RETRY_DELAY = 100;

// Base schema patterns
export const TimestampSchema = z.object({
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime().optional(),
});

export const IdSchema = z.uuid();

// Bandai SKU pattern (e.g., "HG-1/144-RX-78-2", "MG-1/100-MSN-04")
export const BandaiSKUSchema = z.string()
	.regex(/^(HG|MG|PG|RG|SD|RE|EG|Mega Size)-\d\/\d+-[A-Z0-9-]+$/, {
		message: "Invalid Bandai SKU format. Expected format: HG-1/144-RX-78-2",
	});

// Grade levels
export const GradeSchema = z.enum(["HG", "MG", "PG", "RG", "SD", "RE", "EG", "Mega Size"]);

// Scale formats
export const ScaleSchema = z.enum(["1/144", "1/100", "1/60", "1/48", "1/72", "ND", "Other"]);

// Release status
export const ReleaseStatusSchema = z.enum(["released", "upcoming", "discontinued", "announced"]);

// Price range validation
export const PriceSchema = z.number()
	.min(0, { message: "Price cannot be negative" })
	.max(MAX_PRICE, { message: "Price seems unreasonably high" });

// Rating validation (1-10 scale)
export const RatingSchema = z.number()
	.min(MIN_RATING, { message: "Rating must be at least 1" })
	.max(MAX_RATING, { message: "Rating cannot exceed 10" });

// URL validation
export const URLSchema = z.url({ message: "Invalid URL format" });

// User data schemas for IndexedDB storage
export const UserSettingsSchema = z.object({
	id: z.string(),
	theme: z.enum(["light", "dark", "auto"]).default("auto"),
	language: z.string().min(MIN_STRING_LENGTH).max(MAX_STRING_LENGTH).default("en"),
	itemsPerPage: z.number().min(MIN_ITEMS_PER_PAGE).max(MAX_ITEMS_PER_PAGE).default(DEFAULT_ITEMS_PER_PAGE),
	showDiscontinued: z.boolean().default(false),
	defaultSort: z.enum(["name", "release_date", "grade", "price"]).default("name"),
	notifications: z.boolean().default(true),
}).extend(TimestampSchema.shape);

export const CollectionEntrySchema = z.object({
	id: IdSchema,
	sku: BandaiSKUSchema,
	quantity: z.number().min(MIN_QUANTITY).default(DEFAULT_QUANTITY),
	condition: z.enum(["new", "used", "damaged", "box_only"]).default("new"),
	purchaseDate: z.iso.datetime().optional(),
	purchasePrice: PriceSchema.optional(),
	notes: z.string().max(MAX_NOTES_LENGTH).optional(),
	addedAt: z.iso.datetime(),
	updatedAt: z.iso.datetime().optional(),
}).extend(TimestampSchema.shape);

export const WishlistEntrySchema = z.object({
	id: IdSchema,
	sku: BandaiSKUSchema,
	priority: z.enum(["low", "medium", "high"]).default("medium"),
	targetPrice: PriceSchema.optional(),
	notes: z.string().max(MAX_NOTES_LENGTH).optional(),
	addedAt: z.iso.datetime(),
	updatedAt: z.iso.datetime().optional(),
}).extend(TimestampSchema.shape);

export const BuildLogSchema = z.object({
	id: IdSchema,
	sku: BandaiSKUSchema,
	title: z.string().min(MIN_STRING_CONTENT_LENGTH).max(MAX_TITLE_LENGTH),
	content: z.string().min(MIN_STRING_CONTENT_LENGTH).max(MAX_DESCRIPTION_LENGTH),
	status: z.enum(["planning", "in_progress", "completed", "on_hold"]).default("planning"),
	progress: z.number().min(MIN_PROGRESS).max(MAX_PROGRESS).default(DEFAULT_PROGRESS),
	startDate: z.iso.datetime().optional(),
	completionDate: z.iso.datetime().optional(),
	images: z.array(URLSchema).default([]),
	tags: z.array(z.string().max(MAX_TAG_LENGTH)).default([]),
	addedAt: z.iso.datetime(),
	updatedAt: z.iso.datetime().optional(),
}).extend(TimestampSchema.shape);

// CLI configuration schemas
export const CLISchema = z.object({
	mode: z.enum(["development", "ci"]).default("development"),
	verbose: z.boolean().default(false),
	cacheDir: z.string().default(".cache"),
	outputDir: z.string().default("apps/webapp/public/data"),
	concurrency: z.number().min(MIN_CONCURRENCY).max(MAX_CONCURRENCY).default(DEFAULT_CONCURRENCY),
	retryAttempts: z.number().min(MIN_RETRY_ATTEMPTS).max(MAX_RETRY_ATTEMPTS).default(DEFAULT_RETRY_ATTEMPTS),
	retryDelay: z.number().min(MIN_RETRY_DELAY).max(MAX_RETRY_DELAY).default(DEFAULT_RETRY_DELAY),
});

// Security event details interface for specific security event information
export interface SecurityEventDetails {
	[key: string]: string | number | boolean | undefined;
	ipAddress?: string;
	userAgent?: string;
	requestUrl?: string;
	requestMethod?: string;
	attemptedPayload?: string;
	blockReason?: string;
	userId?: string;
	sessionId?: string;
	severity?: number;
	category?: string;
}

// Generic API response type that can work with any data type
export interface APIResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
	timestamp: string;
}

// API response schemas
export const APIResponseSchema = z.object({
	success: z.boolean(),
	data: z.unknown(), // Generic data - actual typing handled by APIResponse<T>
	error: z.string().optional(),
	timestamp: z.iso.datetime(),
});

// Security and monitoring schemas
export const SecurityEventSchema = z.object({
	id: IdSchema,
	type: z.enum(["xss_attempt", "injection_attempt", "suspicious_activity", "rate_limit"]),
	severity: z.enum(["low", "medium", "high", "critical"]),
	message: z.string().min(MIN_STRING_LENGTH).max(MAX_NOTES_LENGTH),
	details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
	timestamp: z.iso.datetime(),
	resolved: z.boolean().default(false),
});

export const PerformanceMetricsSchema = z.object({
	timestamp: z.iso.datetime(),
	lcp: z.number().min(MIN_PERFORMANCE_METRIC), // Largest Contentful Paint
	fid: z.number().min(MIN_PERFORMANCE_METRIC), // First Input Delay
	cls: z.number().min(MIN_PERFORMANCE_METRIC), // Cumulative Layout Shift
	fcp: z.number().min(MIN_PERFORMANCE_METRIC), // First Contentful Paint
	ttfb: z.number().min(MIN_PERFORMANCE_METRIC), // Time to First Byte
});

// Export all schemas for easy importing
export const Schemas = {
	Timestamp: TimestampSchema,
	Id: IdSchema,
	BandaiSKU: BandaiSKUSchema,
	Grade: GradeSchema,
	Scale: ScaleSchema,
	ReleaseStatus: ReleaseStatusSchema,
	Price: PriceSchema,
	Rating: RatingSchema,
	URL: URLSchema,
	UserSettings: UserSettingsSchema,
	CollectionEntry: CollectionEntrySchema,
	WishlistEntry: WishlistEntrySchema,
	BuildLog: BuildLogSchema,
	CLI: CLISchema,
	APIResponse: APIResponseSchema,
	SecurityEvent: SecurityEventSchema,
	PerformanceMetrics: PerformanceMetricsSchema,
} as const;

// Type inference helpers
export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type CollectionEntry = z.infer<typeof CollectionEntrySchema>;
export type WishlistEntry = z.infer<typeof WishlistEntrySchema>;
export type BuildLog = z.infer<typeof BuildLogSchema>;
export type CLIConfig = z.infer<typeof CLISchema>;
export type SecurityEvent = z.infer<typeof SecurityEventSchema>;
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;