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

/**
 * Localized text arrays - for content that may differ between languages (not 1:1 translations)
 */
export const LocalizedTextArraySchema = z.object({
	ja: z.array(z.string()),
	en: z.array(z.string()).optional(),
});

export type LocalizedTextArray = z.infer<typeof LocalizedTextArraySchema>;

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
 * Manual PDF with URL and localized name
 */
export const ManualPdfSchema = z.object({
	url: z.string().url(),
	name: LocalizedStringSchema,
});

export type ManualPdf = z.infer<typeof ManualPdfSchema>;

/**
 * Source image reference with src URL and local path
 * At least one of src or path must be present
 */
export const SourceImageSchema = z.object({
	src: z.string().optional(),
	path: z.string().optional(),
});

export type SourceImage = z.infer<typeof SourceImageSchema>;

/**
 * Images object containing categorized arrays of images
 */
export const ImagesSchema = z.object({
	product: z.array(SourceImageSchema).default([]),
	instructions: z.array(SourceImageSchema).default([]),
});

export type Images = z.infer<typeof ImagesSchema>;

/**
 * Legacy image schema - kept for backward compatibility
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
 * Accessory item with localized name and count
 */
export const AccessoryItemSchema = z.object({
	name: LocalizedStringSchema,
	count: z.number().optional(),
});

export type AccessoryItem = z.infer<typeof AccessoryItemSchema>;

/**
 * Accessories array
 */
export const AccessoriesSchema = z.array(AccessoryItemSchema);

export type Accessories = z.infer<typeof AccessoriesSchema>;

/**
 * Legacy accessory schema - kept for backward compatibility
 * Accessory can be a simple string or localized name
 */
export const AccessorySchema = z.union([
	z.string(),
	LocalizedStringSchema,
]);

export type Accessory = z.infer<typeof AccessorySchema>;

/**
 * Reference to a brand with id, url, and localized name
 */
export const BrandRefSchema = z.object({
	id: z.string(),
	url: z.string().optional(),
	ja: z.string().optional(),
	en: z.string().optional(),
});

export type BrandRef = z.infer<typeof BrandRefSchema>;

/**
 * Reference to a series with id, url, and localized name
 */
export const SeriesRefSchema = z.object({
	id: z.string(),
	url: z.string().optional(),
	ja: z.string().optional(),
	en: z.string().optional(),
});

export type SeriesRef = z.infer<typeof SeriesRefSchema>;

/**
 * Reference to a category with id, url, and localized name
 */
export const CategoryRefSchema = z.object({
	id: z.string(),
	url: z.string().optional(),
	ja: z.string().optional(),
	en: z.string().optional(),
});

export type CategoryRef = z.infer<typeof CategoryRefSchema>;

/**
 * Reference to a related item with id, url, and localized name
 */
export const RelatedItemRefSchema = z.object({
	id: z.string(),
	url: z.string().optional(),
	ja: z.string().optional(),
	en: z.string().optional(),
});

export type RelatedItemRef = z.infer<typeof RelatedItemRefSchema>;

/**
 * Reference to a manual with id and url
 */
export const ManualRefSchema = z.object({
	id: z.string(),
	url: z.string().optional(),
});

export type ManualRef = z.infer<typeof ManualRefSchema>;

/**
 * Item node schema with object-based relationships (source format)
 * Uses brands[], series[], categories[], relatedItems[] and manual object
 */
export const ItemSchema = z.object({
	id: z.string(),
	type: z.literal("item"),
	name: z.union([z.string(), LocalizedStringSchema]),

	// Object-based relationships (source format)
	brands: z.array(BrandRefSchema).default([]),
	series: z.array(SeriesRefSchema).default([]),
	categories: z.array(CategoryRefSchema).default([]),
	relatedItems: z.array(RelatedItemRefSchema).default([]),
	// 1:1 relationship - each item has at most one manual
	manual: ManualRefSchema.optional(),

	// Product information
	scale: z.string().optional(),
	price: PriceSchema.optional(),
	releaseDate: ReleaseDateSchema.optional(),
	// Grades - keyed by root grade, value is array of specific grades
	// e.g., { "hg": ["hg-uc", "hg-ce"], "mg": [] }
	// Empty array means matched root directly, non-empty means matched specific variants
	grades: z.record(z.string(), z.array(z.string())).default({}),

	// Content and metadata
	// images can be new format (object with product/instructions) or old format (array of strings)
	images: z.union([ImagesSchema, z.array(z.string())]).optional(),
	displayImage: z.string().optional(), // Computed: first image or manual.productImage fallback
	description: LocalizedTextArraySchema.optional(),
	// accessories can be new format (array of objects) or old format (LocalizedTextArray)
	accessories: z.union([AccessoriesSchema, LocalizedTextArraySchema]).optional(),
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

	// Grade relationship
	gradeId: z.string().optional(),
	grade: z.boolean().optional(),
	isGrade: z.boolean().optional(),

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
	image: z.string().optional(),
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

	// Relationships (legacy format - single objects, not arrays)
	brandIds: z.array(z.string()).default([]),
	seriesIds: z.array(z.string()).default([]),

	// Manual metadata
	url: z.string().url().optional(),
	pdfs: z.array(ManualPdfSchema).default([]),
	pages: z.number().optional(),
	language: z.string().optional(),
	size: z.string().optional(),
	scale: z.string().optional(),
	productNumber: z.string().optional(),
	productImage: z.string().url().optional(),
	thumbnailImage: z.string().url().optional(),
	releaseDate: ReleaseDateSchema.optional(),
	itemId: z.string().optional(),
	itemName: z.union([z.string(), LocalizedStringSchema]).optional(),

	// Source tracking
	sourceUrl: z.string().url().optional(),
	extractedAt: z.string().datetime().optional(),
	created: z.string().optional(),
	modified: z.string().optional(),
});

export type Manual = z.infer<typeof ManualSchema>;

/** Default sort order for grades - high value to sort unknown grades to end */
const DEFAULT_GRADE_SORT_ORDER = 999;

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
	sortOrder: z.number().default(DEFAULT_GRADE_SORT_ORDER),
	image: z.string().optional(),
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
 * Tag aggregation data with item counts
 * Tags are distribution channel indicators: Hobby Online, Event, Gundam Base, etc.
 */
export const TagDataSchema = z.object({
	id: z.string(),
	type: z.literal("tag"),
	name: z.union([z.string(), LocalizedStringSchema]),
	itemIds: z.array(z.string()).default([]),
	itemCount: z.number(),
});

export type TagData = z.infer<typeof TagDataSchema>;

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

export const isTagData = (data: unknown): data is TagData => {
	return TagDataSchema.safeParse(data).success;
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
export const getNodeDisplayName = (node: Node | GradeData | ScaleData | TagData): string => {
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
 * Get primary grade from an item (first root grade key)
 * Returns the first root grade or null if no grades
 */
export const getNodePrimaryGrade = (item: Item): string | null => {
	const rootGrades = Object.keys(item.grades);
	return rootGrades[0] ?? null;
};

/**
 * Get all grades from an item (root + specific) as a flat array
 */
export const getNodeAllGrades = (item: Item): string[] => {
	const allGrades: string[] = [];
	for (const [rootGrade, specificGrades] of Object.entries(item.grades)) {
		allGrades.push(rootGrade, ...specificGrades);
	}
	return allGrades;
};

/**
 * Check if item has a specific grade (root or specific)
 */
export const itemHasGrade = (item: Item, gradeId: string): boolean => {
	return gradeId in item.grades || Object.values(item.grades).flat().includes(gradeId);
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
 * Returns product images first, then instructions
 * Handles both new format (object with product/instructions) and old format (array of strings)
 */
export const getNodeImages = (item: Item): string[] => {
	if (!item.images) return [];

	// Handle old format (array of strings)
	if (Array.isArray(item.images)) {
		return item.images;
	}

	// Handle new format (object with product/instructions)
	const result: string[] = [];

	// Add product images (using local path if available, else src)
	for (const img of item.images.product) {
		const url = img.path ?? img.src;
		if (url) result.push(url);
	}

	// Add instruction images
	for (const img of item.images.instructions) {
		const url = img.path ?? img.src;
		if (url) result.push(url);
	}

	return result;
};

/**
 * Get description array from an item, preferring English if available
 */
export const getNodeDescription = (item: Item): string[] => {
	if (!item.description) return [];

	// Return English array if available, otherwise Japanese
	return item.description.en ?? item.description.ja;
};

/**
 * Get array of accessory names from an item, preferring English if available
 * Handles both new format (array of objects) and old format (LocalizedTextArray)
 */
export const getNodeAccessories = (item: Item): string[] => {
	if (!item.accessories) return [];

	// Handle old format (LocalizedTextArray with ja/en arrays)
	if ("ja" in item.accessories) {
		return item.accessories.en ?? item.accessories.ja;
	}

	// Handle new format (array of AccessoryItem objects)
	return item.accessories.map(acc => {
		const name = acc.name.en ?? acc.name.ja;
		return acc.count && acc.count > 1 ? `${name} x${acc.count}` : name;
	});
};

/**
 * Get manual ID from an item (1:1 relationship)
 */
export const getNodeManualId = (item: Item): string | undefined => {
	return item.manual?.id;
};

/**
 * Get brand IDs from an item
 */
export const getItemBrandIds = (item: Item): string[] => {
	return item.brands.map((b) => b.id);
};

/**
 * Get series IDs from an item
 */
export const getItemSeriesIds = (item: Item): string[] => {
	return item.series.map((s) => s.id);
};

/**
 * Get category IDs from an item
 */
export const getItemCategoryIds = (item: Item): string[] => {
	return item.categories.map((c) => c.id);
};

/**
 * Get related item IDs from an item
 */
export const getItemRelatedIds = (item: Item): string[] => {
	return item.relatedItems.map((r) => r.id);
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

/**
 * Check if an item has a release date in the future.
 * Uses the sortable date format (YYYYMMDD) for comparison.
 * Items without release dates are NOT considered future releases.
 */
export const isFutureRelease = (item: Item): boolean => {
	const releaseDate = item.releaseDate;
	if (!releaseDate) return false;

	// Get today's date as YYYYMMDD
	const now = new Date();
	const todayStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

	// Get item's release date as YYYYMMDD
	const itemDateStr = getNodeReleaseDateSortable(item);
	if (!itemDateStr) return false;

	// Compare as strings (works because format is YYYYMMDD)
	return itemDateStr > todayStr;
};

/**
 * Filter an array of items to exclude future releases
 */
export const filterFutureReleases = (items: Item[]): Item[] => {
	return items.filter((item) => !isFutureRelease(item));
};
