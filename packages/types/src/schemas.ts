import { z } from "zod";

/**
 * Zod schemas for runtime type safety and validation
 * These schemas provide runtime validation for all data structures
 */

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
	.max(999_999, { message: "Price seems unreasonably high" });

// Rating validation (1-10 scale)
export const RatingSchema = z.number()
	.min(1, { message: "Rating must be at least 1" })
	.max(10, { message: "Rating cannot exceed 10" });

// URL validation
export const URLSchema = z.url({ message: "Invalid URL format" });

// User data schemas for IndexedDB storage
export const UserSettingsSchema = z.object({
	id: z.string(),
	theme: z.enum(["light", "dark", "auto"]).default("auto"),
	language: z.string().min(2).max(10).default("en"),
	itemsPerPage: z.number().min(10).max(100).default(20),
	showDiscontinued: z.boolean().default(false),
	defaultSort: z.enum(["name", "release_date", "grade", "price"]).default("name"),
	notifications: z.boolean().default(true),
}).extend(TimestampSchema.shape);

export const CollectionEntrySchema = z.object({
	id: IdSchema,
	sku: BandaiSKUSchema,
	quantity: z.number().min(1).default(1),
	condition: z.enum(["new", "used", "damaged", "box_only"]).default("new"),
	purchaseDate: z.iso.datetime().optional(),
	purchasePrice: PriceSchema.optional(),
	notes: z.string().max(1000).optional(),
	addedAt: z.iso.datetime(),
	updatedAt: z.iso.datetime().optional(),
}).extend(TimestampSchema.shape);

export const WishlistEntrySchema = z.object({
	id: IdSchema,
	sku: BandaiSKUSchema,
	priority: z.enum(["low", "medium", "high"]).default("medium"),
	targetPrice: PriceSchema.optional(),
	notes: z.string().max(1000).optional(),
	addedAt: z.iso.datetime(),
	updatedAt: z.iso.datetime().optional(),
}).extend(TimestampSchema.shape);

export const BuildLogSchema = z.object({
	id: IdSchema,
	sku: BandaiSKUSchema,
	title: z.string().min(1).max(200),
	content: z.string().min(1).max(10_000),
	status: z.enum(["planning", "in_progress", "completed", "on_hold"]).default("planning"),
	progress: z.number().min(0).max(100).default(0),
	startDate: z.iso.datetime().optional(),
	completionDate: z.iso.datetime().optional(),
	images: z.array(URLSchema).default([]),
	tags: z.array(z.string().max(50)).default([]),
	addedAt: z.iso.datetime(),
	updatedAt: z.iso.datetime().optional(),
}).extend(TimestampSchema.shape);

// CLI configuration schemas
export const CLISchema = z.object({
	mode: z.enum(["development", "ci"]).default("development"),
	verbose: z.boolean().default(false),
	cacheDir: z.string().default(".cache"),
	outputDir: z.string().default("apps/webapp/public/data"),
	concurrency: z.number().min(1).max(10).default(3),
	retryAttempts: z.number().min(0).max(5).default(3),
	retryDelay: z.number().min(100).max(10_000).default(1000),
});

// API response schemas
export const APIResponseSchema = z.object({
	success: z.boolean(),
	data: z.unknown(),
	error: z.string().optional(),
	timestamp: z.iso.datetime(),
});

// Security and monitoring schemas
export const SecurityEventSchema = z.object({
	id: IdSchema,
	type: z.enum(["xss_attempt", "injection_attempt", "suspicious_activity", "rate_limit"]),
	severity: z.enum(["low", "medium", "high", "critical"]),
	message: z.string().min(1).max(1000),
	details: z.record(z.string(), z.unknown()).optional(),
	timestamp: z.iso.datetime(),
	resolved: z.boolean().default(false),
});

export const PerformanceMetricsSchema = z.object({
	timestamp: z.iso.datetime(),
	lcp: z.number().min(0), // Largest Contentful Paint
	fid: z.number().min(0), // First Input Delay
	cls: z.number().min(0), // Cumulative Layout Shift
	fcp: z.number().min(0), // First Contentful Paint
	ttfb: z.number().min(0), // Time to First Byte
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