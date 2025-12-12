import { z } from "zod";

// Base schemas for graph nodes and edges
export const BaseNodeSchema = z.object({
	id: z.string(),
	type: z.string(),
	name: z.union([
		z.string(),
		z.object({
			ja: z.string(),
			en: z.string().optional(),
		}),
	]),
	created: z.string().optional(),
	modified: z.string().optional(),
	sourceUrl: z.string().url().optional(),
	extractedAt: z.string().datetime().optional(),
	contents: z.array(z.unknown()).optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

export const BaseEdgeSchema = z.object({
	id: z.string(),
	source: z.string(),
	target: z.string(),
	type: z.string(),
	weight: z.number().optional(),
	created: z.string().optional(),
	modified: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

// Localized string schema
export const LocalizedNameSchema = z.object({
	ja: z.string(),
	en: z.string().optional(),
});

// Localized description schema (array of objects)
export const LocalizedDescriptionSchema = z.array(z.object({
	ja: z.string(),
	en: z.string(),
}));

// Localized text schema (string or object with ja/en)
export const LocalizedTextSchema = z.union([
	z.string(),
	LocalizedNameSchema,
]);

// Price schema
export const PriceSchema = z.object({
	amount: z.number(),
	currency: z.string(),
	taxIncluded: z.boolean().optional(),
	taxRate: z.number().optional(),
});

// Release date schema
export const ReleaseDateSchema = z.object({
	ja: z.string(),
	year: z.number().nullable().optional(),
	month: z.number().nullable().optional(),
	day: z.number().nullable().optional(),
});

// Accessory schema
export const AccessorySchema = z.union([
	z.string(),
	LocalizedNameSchema,
	LocalizedTextSchema,
]);

// Image schema
export const ImageSchema = z.union([
	z.string().url(),
	z.object({
		url: z.string().url(),
		alt: z.string().optional(),
		width: z.number().optional(),
		height: z.number().optional(),
	}),
]);

// Empty array schema helper
const EmptyArraySchema = z.array(z.unknown()).length(0);

// Edge schema for graph connections
export const EdgeSchema = z.object({
	type: z.string(),
	targetId: z.string(),
	targetType: z.string(),
	sourceId: z.string().optional(),
	weight: z.number().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

// Edges container schema
export const EdgesSchema = z.object({
	inbound: z.union([z.array(EdgeSchema), EmptyArraySchema]).optional(),
	outbound: z.union([z.array(EdgeSchema), EmptyArraySchema]).optional(),
});

// Manual schema
export const ManualSchema = z.union([
	z.string(),
	z.object({
		id: z.string(),
		url: z.string().url().optional(),
		pages: z.number().optional(),
		language: z.string().optional(),
		size: z.string().optional(),
	}),
]);

export type ItemManual = z.infer<typeof ManualSchema> extends string | infer T ? T : never;

// Item type discriminator (product vs blog/promo content)
export const ItemTypeSchema = z.enum(["product", "blog"]);

// Enhanced item schema with generic base
export const ItemNodeSchema = BaseNodeSchema.extend({
	type: z.literal("item"),
	itemType: ItemTypeSchema.optional(), // "product" or "blog" - undefined treated as "product" for backwards compatibility
	brand: z.string().optional(),
	category: z.string().optional(),
	series: z.string().optional(),
	grade: z.string().optional(),
	scale: z.string().optional(),
	price: PriceSchema.optional(),
	releaseDate: ReleaseDateSchema.optional(),
	description: z.union([LocalizedDescriptionSchema, EmptyArraySchema]).optional(),
	accessories: z.union([z.array(AccessorySchema), EmptyArraySchema]).optional(),
	images: z.union([z.array(ImageSchema), EmptyArraySchema]).optional(),
	manuals: z.union([z.array(z.union([ManualSchema, z.string()])), EmptyArraySchema]).optional(),
	targetAge: z.number().optional(),
	tags: z.union([z.array(z.string()), EmptyArraySchema]).optional(),
	specifications: z.record(z.string(), z.unknown()).optional(),
	edges: EdgesSchema.optional(),
});

// Brand node schema
export const BrandNodeSchema = BaseNodeSchema.extend({
	type: z.literal("brand"),
	country: z.string().optional(),
	founded: z.union([z.string(), z.number()]).optional(),
	website: z.string().url().optional(),
	description: z.string().optional(),
	itemCount: z.number().optional(),
	edges: EdgesSchema.optional(),
});

// Category node schema
export const CategoryNodeSchema = BaseNodeSchema.extend({
	type: z.literal("category"),
	description: z.string().optional(),
	itemCount: z.number().optional(),
	parentId: z.string().optional(),
	edges: EdgesSchema.optional(),
});

// Series node schema
export const SeriesNodeSchema = BaseNodeSchema.extend({
	type: z.literal("series"),
	description: z.string().optional(),
	franchise: z.string().optional(),
	itemCount: z.number().optional(),
	parentId: z.string().optional(),
	edges: EdgesSchema.optional(),
});

// Manual node schema
export const ManualNodeSchema = BaseNodeSchema.extend({
	type: z.literal("manual"),
	url: z.string().url().optional(),
	pages: z.number().optional(),
	language: z.string().optional(),
	size: z.string().optional(),
	itemId: z.string().optional(),
	itemName: z.union([z.string(), LocalizedNameSchema]).optional(),
});

// Union of all node types
export const GraphNodeSchema = z.discriminatedUnion("type", [
	ItemNodeSchema,
	BrandNodeSchema,
	CategoryNodeSchema,
	SeriesNodeSchema,
	ManualNodeSchema,
]);

// Union of all edge types
export const GraphEdgeSchema = z.discriminatedUnion("type", [
	BaseEdgeSchema.extend({ type: z.literal("brand_item") }),
	BaseEdgeSchema.extend({ type: z.literal("item_category") }),
	BaseEdgeSchema.extend({ type: z.literal("item_series") }),
	BaseEdgeSchema.extend({ type: z.literal("item_manual") }),
	BaseEdgeSchema.extend({ type: z.literal("series_franchise") }),
	BaseEdgeSchema.extend({ type: z.literal("category_parent") }),
]);

// Graph data schema
export const GraphDataSchema = z.object({
	nodes: z.array(GraphNodeSchema),
	edges: z.array(GraphEdgeSchema),
	metadata: z.object({
		version: z.string(),
		created: z.string(),
		modified: z.string(),
		itemCount: z.number(),
		brandCount: z.number(),
		categoryCount: z.number(),
		seriesCount: z.number(),
		manualCount: z.number(),
	}).optional(),
});

// Infer TypeScript types from Zod schemas
export type BaseNode = z.infer<typeof BaseNodeSchema>;
export type BaseEdge = z.infer<typeof BaseEdgeSchema>;
export type LocalizedName = z.infer<typeof LocalizedNameSchema>;
export type Price = z.infer<typeof PriceSchema>;
export type ReleaseDate = z.infer<typeof ReleaseDateSchema>;
export type Image = z.infer<typeof ImageSchema>;
export type Manual = z.infer<typeof ManualSchema>;
export type EdgesSchemaType = z.infer<typeof EdgesSchema>;

export type ItemNode = z.infer<typeof ItemNodeSchema>;
export type BrandNode = z.infer<typeof BrandNodeSchema>;
export type CategoryNode = z.infer<typeof CategoryNodeSchema>;
export type SeriesNode = z.infer<typeof SeriesNodeSchema>;
export type ManualNode = z.infer<typeof ManualNodeSchema>;

export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type GraphData = z.infer<typeof GraphDataSchema>;

// Type guards for runtime validation
export const isBaseNode = (data: unknown): data is BaseNode => {
	return BaseNodeSchema.safeParse(data).success;
};

export const isItemNode = (data: unknown): data is ItemNode => {
	return ItemNodeSchema.safeParse(data).success;
};

export const isBrandNode = (data: unknown): data is BrandNode => {
	return BrandNodeSchema.safeParse(data).success;
};

export const isCategoryNode = (data: unknown): data is CategoryNode => {
	return CategoryNodeSchema.safeParse(data).success;
};

export const isSeriesNode = (data: unknown): data is SeriesNode => {
	return SeriesNodeSchema.safeParse(data).success;
};

export const isManualNode = (data: unknown): data is ManualNode => {
	return ManualNodeSchema.safeParse(data).success;
};

export const isGraphNode = (data: unknown): data is GraphNode => {
	return GraphNodeSchema.safeParse(data).success;
};

export const isBaseEdge = (data: unknown): data is BaseEdge => {
	return BaseEdgeSchema.safeParse(data).success;
};

export const isGraphEdge = (data: unknown): data is GraphEdge => {
	return GraphEdgeSchema.safeParse(data).success;
};

export const isGraphData = (data: unknown): data is GraphData => {
	return GraphDataSchema.safeParse(data).success;
};

// Utility functions for safe data parsing
export const parseNode = (data: unknown): GraphNode | null => {
	const result = GraphNodeSchema.safeParse(data);
	return result.success ? result.data : null;
};

export const parseEdge = (data: unknown): GraphEdge | null => {
	const result = GraphEdgeSchema.safeParse(data);
	return result.success ? result.data : null;
};

export const parseGraphData = (data: unknown): GraphData | null => {
	const result = GraphDataSchema.safeParse(data);
	return result.success ? result.data : null;
};

// Type-specific getters with validation
export const getNodeDisplayName = (node: BaseNode): string => {
	if (typeof node.name === "string") return node.name;
	return node.name.en ?? node.name.ja;
};

export const getNodePrice = (node: ItemNode): string | null => {
	if (!node.price) return null;
	const { amount, currency } = node.price;
	return `${currency === "JPY" ? "¥" : currency}${amount.toLocaleString()}`;
};

export const getNodeReleaseYear = (node: ItemNode): number | null => {
	// First try the year field if it's a valid non-zero value
	if (node.releaseDate?.year && node.releaseDate.year > 0) {
		return node.releaseDate.year;
	}

	// Fall back to parsing the Japanese date string (e.g., "1985年06月")
	if (node.releaseDate?.ja) {
		const yearMatch = /(\d{4})年/.exec(node.releaseDate.ja);
		if (yearMatch?.[1]) {
			return Number.parseInt(yearMatch[1], 10);
		}
	}

	return null;
};

/**
 * Get formatted release date string from item node.
 * Tries structured year/month/day first, then falls back to parsing Japanese date string.
 * Output format: YYYY/MM/DD, YYYY/MM, or YYYY depending on available data.
 */
export const getNodeReleaseDate = (node: ItemNode): string | null => {
	const releaseDate = node.releaseDate;
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

export const getNodeImages = (node: ItemNode): string[] => {
	if (!node.images) return [];
	return node.images.map(img => {
		// Use Zod parsing to validate the image structure
		if (typeof img === "string") return img;

		const imageResult = ImageSchema.safeParse(img);
		if (!imageResult.success) {
			// Type guard for unknown to string
			return typeof img === "string" ? img : JSON.stringify(img);
		}

		// Handle the union type from ImageSchema
		const imageData = imageResult.data;
		if (typeof imageData === "string") return imageData;
		return imageData.url;
	});
};

export const getNodeDescription = (node: ItemNode): string => {
	if (!node.description) return "";

	// Use Zod parsing to validate the description structure
	const descResult = LocalizedDescriptionSchema.safeParse(node.description);
	if (!descResult.success) return "";

	// Get English description if available, fallback to Japanese
	const englishDesc = descResult.data.find(d => d.en)?.en;
	const japaneseDesc = descResult.data.find(d => d.ja)?.ja;

	return englishDesc ?? japaneseDesc ?? "";
};

export const getNodeAccessories = (node: ItemNode): string[] => {
	if (!node.accessories) return [];

	return node.accessories.map(acc => {
		// Use Zod parsing to validate the accessory structure
		if (typeof acc === "string") return acc;

		const accessoryResult = AccessorySchema.safeParse(acc);
		if (!accessoryResult.success) {
			// Type guard for unknown to string
			return typeof acc === "string" ? acc : JSON.stringify(acc);
		}

		const accessory = accessoryResult.data;
		if (typeof accessory === "string") return accessory;

		// Handle localized accessory name
		return accessory.en ?? accessory.ja;
	});
};

export const getNodeManuals = (node: ItemNode): Array<string | ItemManual> => {
	if (!node.manuals) return [];

	return node.manuals.map(manual => {
		// Use Zod parsing to validate the manual structure
		if (typeof manual === "string") return manual;

		const manualResult = ManualSchema.safeParse(manual);
		if (!manualResult.success) {
			// Type guard for unknown to string
			return typeof manual === "string" ? manual : JSON.stringify(manual);
		}

		const manualData = manualResult.data;
		if (typeof manualData === "string") return manualData;

		return manualData;
	});
};

export const getNodeEdges = (node: GraphNode): EdgesSchemaType => {
	// Only ItemNode should have edges according to our schema
	if (!isItemNode(node)) return { inbound: [], outbound: [] };

	// Use Zod parsing to validate edges structure
	const edgesResult = EdgesSchema.safeParse(node.edges);
	return edgesResult.success ? edgesResult.data : { inbound: [], outbound: [] };
};

/**
 * Check if an item is a product (has price) vs blog/promo content
 * Items without itemType field are treated as products for backwards compatibility
 */
export const isProduct = (item: ItemNode): boolean => {
	// If itemType is explicitly set, use it
	if (item.itemType !== undefined) {
		return item.itemType === "product";
	}
	// Backwards compatibility: items with price are products
	return item.price !== undefined;
};

/**
 * Filter an array of items to only include products (exclude blog/promo content)
 */
export const filterProducts = (items: ItemNode[]): ItemNode[] => {
	return items.filter((item) => isProduct(item));
};