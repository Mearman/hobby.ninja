import { z } from "zod";

/**
 * Zod schemas for data validation
 * These schemas validate the structure of items, brands, series, etc.
 */

/**
 * Localized string with Japanese (required) and English (optional) translations
 */
export const LocalizedStringSchema = z.object({
	ja: z.string(),
	en: z.string().optional(),
});

export type LocalizedString = z.infer<typeof LocalizedStringSchema>;

// Price schema
export const PriceSchema = z.object({
	amount: z.number().min(0),
	currency: z.string(),
	taxIncluded: z.boolean().optional(),
	taxRate: z.number().min(0).max(100).optional(),
});

export type Price = z.infer<typeof PriceSchema>;

/**
 * Release date with Japanese format string and optional structured date components
 */
export const ReleaseDateSchema = z.object({
	ja: z.string(),
	year: z.number().nullable().optional(),
	month: z.number().nullable().optional(),
	day: z.number().nullable().optional(),
});

export type ReleaseDate = z.infer<typeof ReleaseDateSchema>;

/**
 * Image can be a simple URL string or an object with URL and metadata
 */
export const ImageSchema = z.union([
	z.string().url(),
	z.string().startsWith("/"), // Local relative paths like /images/items/xxx.jpg
	z.object({
		url: z.string(),
		alt: z.string().optional(),
		width: z.number().optional(),
		height: z.number().optional(),
	}),
]);

export type Image = z.infer<typeof ImageSchema>;

/**
 * Accessory can be a simple string or localized name
 */
export const AccessorySchema = z.union([
	z.string(),
	LocalizedStringSchema,
]);

export type Accessory = z.infer<typeof AccessorySchema>;

/**
 * Item node schema with array-based relationships (canonical format)
 * Uses brandIds[], seriesIds[], categoryIds[], relatedItemIds[], manualIds[] instead of edges
 */
export const ItemSchema = z.object({
	id: z.string(),
	type: z.literal("item"),
	name: z.union([z.string(), LocalizedStringSchema]),

	// Array-based relationships (NEW format)
	brandIds: z.array(z.string()).default([]),
	seriesIds: z.array(z.string()).default([]),
	categoryIds: z.array(z.string()).default([]),
	relatedItemIds: z.array(z.string()).default([]),
	manualIds: z.array(z.string()).default([]),

	// Product information
	scale: z.string().optional(),
	price: PriceSchema.optional(),
	releaseDate: ReleaseDateSchema.optional(),
	grade: z.string().optional(),

	// Content and metadata
	images: z.array(ImageSchema).optional(),
	description: z.array(LocalizedStringSchema).optional(),
	accessories: z.array(AccessorySchema).optional(),
	targetAge: z.number().optional(),
	tags: z.array(z.string()).optional(),
	specifications: z.record(z.string(), z.unknown()).optional(),

	// Source tracking
	sourceUrl: z.string().url().optional(),
	extractedAt: z.string().datetime().optional(),
	created: z.string().optional(),
	modified: z.string().optional(),
});

export type Item = z.infer<typeof ItemSchema>;

/**
 * Brand node schema with computed item relationships
 */
export const BrandSchema = z.object({
	id: z.string(),
	type: z.literal("brand"),
	name: z.union([z.string(), LocalizedStringSchema]),

	// Computed by build process
	itemIds: z.array(z.string()).default([]),

	// Brand metadata
	image: z.string().optional(),
	country: z.string().optional(),
	founded: z.union([z.string(), z.number()]).optional(),
	website: z.string().url().optional(),
	description: z.string().optional(),
	itemCount: z.number().optional(),

	// Source tracking
	sourceUrl: z.string().url().optional(),
	extractedAt: z.string().datetime().optional(),
	created: z.string().optional(),
	modified: z.string().optional(),
});

export type Brand = z.infer<typeof BrandSchema>;

/**
 * Series node schema with computed item relationships
 */
export const SeriesSchema = z.object({
	id: z.string(),
	type: z.literal("series"),
	name: z.union([z.string(), LocalizedStringSchema]),

	// Computed by build process
	itemIds: z.array(z.string()).default([]),

	// Series metadata
	image: z.string().optional(),
	description: z.string().optional(),
	franchise: z.string().optional(),
	itemCount: z.number().optional(),
	parentId: z.string().optional(),

	// Source tracking
	sourceUrl: z.string().url().optional(),
	extractedAt: z.string().datetime().optional(),
	created: z.string().optional(),
	modified: z.string().optional(),
});

export type Series = z.infer<typeof SeriesSchema>;

/**
 * Category node schema with computed item relationships
 */
export const CategorySchema = z.object({
	id: z.string(),
	type: z.literal("category"),
	name: z.union([z.string(), LocalizedStringSchema]),

	// Computed by build process
	itemIds: z.array(z.string()).default([]),

	// Category metadata
	description: z.string().optional(),
	itemCount: z.number().optional(),
	parentId: z.string().optional(),

	// Source tracking
	sourceUrl: z.string().url().optional(),
	extractedAt: z.string().datetime().optional(),
	created: z.string().optional(),
	modified: z.string().optional(),
});

export type Category = z.infer<typeof CategorySchema>;

/**
 * Manual node schema with relationships to brands and series
 */
export const ManualSchema = z.object({
	id: z.string(),
	type: z.literal("manual"),
	name: z.union([z.string(), LocalizedStringSchema]),

	// Relationships
	brandIds: z.array(z.string()).default([]),
	seriesIds: z.array(z.string()).default([]),

	// Manual metadata
	url: z.string().url().optional(),
	pages: z.number().optional(),
	language: z.string().optional(),
	size: z.string().optional(),
	itemId: z.string().optional(),
	itemName: z.union([z.string(), LocalizedStringSchema]).optional(),

	// Source tracking
	sourceUrl: z.string().url().optional(),
	extractedAt: z.string().datetime().optional(),
	created: z.string().optional(),
	modified: z.string().optional(),
});

export type Manual = z.infer<typeof ManualSchema>;

/**
 * Grade aggregation data with hierarchy and item counts
 */
export const GradeDataSchema = z.object({
	id: z.string(),
	type: z.literal("grade"),
	name: z.union([z.string(), LocalizedStringSchema]),
	parent: z.string().nullable(),
	children: z.array(z.string()).default([]),
	itemIds: z.array(z.string()).default([]),
	itemCount: z.number(),
});

export type GradeData = z.infer<typeof GradeDataSchema>;

/**
 * Scale aggregation data with item counts
 */
export const ScaleDataSchema = z.object({
	id: z.string(),
	type: z.literal("scale"),
	name: z.string(),
	itemIds: z.array(z.string()).default([]),
	itemCount: z.number(),
});

export type ScaleData = z.infer<typeof ScaleDataSchema>;

/**
 * Search index record for efficient searching
 */
export const SearchRecordSchema = z.object({
	id: z.string(),
	name: z.string(),
	nameJa: z.string().optional(),
	brand: z.string().optional(),
	series: z.string().optional(),
	category: z.string().optional(),
	tags: z.array(z.string()).optional(),
});

export type SearchRecord = z.infer<typeof SearchRecordSchema>;

// Homepage stats schema
export const HomepageStatsSchema = z.object({
	totalItems: z.number().min(0),
	totalBrands: z.number().min(0),
	totalCategories: z.number().min(0),
	totalSeries: z.number().min(0),
});

export type HomepageStats = z.infer<typeof HomepageStatsSchema>;

// Homepage data schema
export const HomepageDataSchema = z.object({
	stats: HomepageStatsSchema,
	featuredItems: z.array(ItemSchema),
	popularBrands: z.array(BrandSchema),
	categories: z.array(CategorySchema),
});

export type HomepageData = z.infer<typeof HomepageDataSchema>;

// ===========================
// Union Types
// ===========================

/**
 * Union type for all node types
 */
export type Node = Item | Brand | Series | Category | Manual;

// ===========================
// Type Guard Functions
// ===========================

export const isItem = (data: unknown): data is Item => {
	return ItemSchema.safeParse(data).success;
};

export const isBrand = (data: unknown): data is Brand => {
	return BrandSchema.safeParse(data).success;
};

export const isSeries = (data: unknown): data is Series => {
	return SeriesSchema.safeParse(data).success;
};

export const isCategory = (data: unknown): data is Category => {
	return CategorySchema.safeParse(data).success;
};

export const isManual = (data: unknown): data is Manual => {
	return ManualSchema.safeParse(data).success;
};

export const isGradeData = (data: unknown): data is GradeData => {
	return GradeDataSchema.safeParse(data).success;
};

export const isScaleData = (data: unknown): data is ScaleData => {
	return ScaleDataSchema.safeParse(data).success;
};

export const isHomepageData = (data: unknown): data is HomepageData => {
	return HomepageDataSchema.safeParse(data).success;
};

export const isSearchRecord = (data: unknown): data is SearchRecord => {
	return SearchRecordSchema.safeParse(data).success;
};

// ===========================
// Utility Functions
// ===========================

/**
 * Get display name from a node, preferring English translation if available
 */
export const getNodeDisplayName = (node: Node | GradeData | ScaleData): string => {
	if (typeof node.name === "string") return node.name;
	return node.name.en ?? node.name.ja;
};

/**
 * Get formatted price string from an item
 */
export const getNodePrice = (item: Item): string | null => {
	if (!item.price) return null;
	const { amount, currency } = item.price;
	const symbol = currency === "JPY" ? "¥" : currency;
	return `${symbol}${amount.toLocaleString()}`;
};

/**
 * Get release year from an item
 */
export const getNodeReleaseYear = (item: Item): number | null => {
	// First try the year field if it's a valid non-zero value
	if (item.releaseDate?.year && item.releaseDate.year > 0) {
		return item.releaseDate.year;
	}

	// Fall back to parsing the Japanese date string (e.g., "1985年06月")
	if (item.releaseDate?.ja) {
		const yearMatch = /(\d{4})年/.exec(item.releaseDate.ja);
		if (yearMatch?.[1]) {
			return Number.parseInt(yearMatch[1], 10);
		}
	}

	return null;
};

/**
 * Get formatted release date string from an item
 * Output format: YYYY/MM/DD, YYYY/MM, or YYYY depending on available data
 */
export const getNodeReleaseDate = (item: Item): string | null => {
	const releaseDate = item.releaseDate;
	if (!releaseDate) return null;

	// If we have valid year, format with month and day if available
	if (releaseDate.year && releaseDate.year > 0) {
		const month = releaseDate.month && releaseDate.month > 0
			? String(releaseDate.month).padStart(2, "0")
			: null;
		const day = releaseDate.day && releaseDate.day > 0
			? String(releaseDate.day).padStart(2, "0")
			: null;

		if (month && day) {
			return `${releaseDate.year}/${month}/${day}`;
		}
		if (month) {
			return `${releaseDate.year}/${month}`;
		}
		return String(releaseDate.year);
	}

	// Fall back to parsing the Japanese date string
	if (releaseDate.ja) {
		// Try full date format: "2017年05月20日"
		const fullMatch = /(\d{4})年(\d{2})月(\d{2})日/.exec(releaseDate.ja);
		if (fullMatch?.[1] && fullMatch[2] && fullMatch[3]) {
			return `${fullMatch[1]}/${fullMatch[2]}/${fullMatch[3]}`;
		}
		// Try year+month format: "1985年06月"
		const monthMatch = /(\d{4})年(\d{2})月/.exec(releaseDate.ja);
		if (monthMatch?.[1] && monthMatch[2]) {
			return `${monthMatch[1]}/${monthMatch[2]}`;
		}
		// Try just year
		const yearMatch = /(\d{4})年/.exec(releaseDate.ja);
		if (yearMatch?.[1]) {
			return yearMatch[1];
		}
	}

	return null;
};

/**
 * Get sortable release date string for comparison (YYYYMMDD format)
 * Returns empty string if no release date, so items without dates sort to end
 */
export const getNodeReleaseDateSortable = (item: Item): string => {
	const releaseDate = item.releaseDate;
	if (!releaseDate) return "";

	// If we have valid year, format as YYYYMMDD for proper sorting
	if (releaseDate.year && releaseDate.year > 0) {
		const month = releaseDate.month && releaseDate.month > 0
			? String(releaseDate.month).padStart(2, "0")
			: "00";
		const day = releaseDate.day && releaseDate.day > 0
			? String(releaseDate.day).padStart(2, "0")
			: "00";

		return `${releaseDate.year}${month}${day}`;
	}

	// Fall back to parsing the Japanese date string
	if (releaseDate.ja) {
		// Try full date format: "2017年05月20日"
		const fullMatch = /(\d{4})年(\d{2})月(\d{2})日/.exec(releaseDate.ja);
		if (fullMatch?.[1] && fullMatch[2] && fullMatch[3]) {
			return `${fullMatch[1]}${fullMatch[2]}${fullMatch[3]}`;
		}
		// Try year+month format: "1985年06月"
		const monthMatch = /(\d{4})年(\d{2})月/.exec(releaseDate.ja);
		if (monthMatch?.[1] && monthMatch[2]) {
			return `${monthMatch[1]}${monthMatch[2]}00`;
		}
		// Try just year
		const yearMatch = /(\d{4})年/.exec(releaseDate.ja);
		if (yearMatch?.[1]) {
			return `${yearMatch[1]}0000`;
		}
	}

	return "";
};

/**
 * Get array of image URLs from an item
 */
export const getNodeImages = (item: Item): string[] => {
	if (!item.images) return [];
	return item.images.map(img => {
		if (typeof img === "string") return img;
		return img.url;
	});
};

/**
 * Get description text from an item, preferring English if available
 */
export const getNodeDescription = (item: Item): string => {
	if (!item.description) return "";

	// Find English description first, fallback to Japanese
	const englishDesc = item.description.find(d => d.en)?.en;
	const japaneseDesc = item.description.find(d => d.ja)?.ja;

	return englishDesc ?? japaneseDesc ?? "";
};

/**
 * Get array of accessory names from an item, preferring English if available
 */
export const getNodeAccessories = (item: Item): string[] => {
	if (!item.accessories) return [];

	return item.accessories.map(acc => {
		if (typeof acc === "string") return acc;
		return acc.en ?? acc.ja;
	});
};

/**
 * Get array of manual IDs from an item
 */
export const getNodeManualIds = (item: Item): string[] => {
	return item.manualIds;
};

/**
 * Safe JSON parsing with Zod validation
 */
export const parseItem = (data: unknown): Item | null => {
	const result = ItemSchema.safeParse(data);
	return result.success ? result.data : null;
};

export const parseBrand = (data: unknown): Brand | null => {
	const result = BrandSchema.safeParse(data);
	return result.success ? result.data : null;
};

export const parseSeries = (data: unknown): Series | null => {
	const result = SeriesSchema.safeParse(data);
	return result.success ? result.data : null;
};

export const parseCategory = (data: unknown): Category | null => {
	const result = CategorySchema.safeParse(data);
	return result.success ? result.data : null;
};

export const parseManual = (data: unknown): Manual | null => {
	const result = ManualSchema.safeParse(data);
	return result.success ? result.data : null;
};
