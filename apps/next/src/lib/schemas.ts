import { z } from 'zod';

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
  LocalizedNameSchema
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
  year: z.number(),
  month: z.number(),
  day: z.number(),
});

// Accessory schema
export const AccessorySchema = z.union([
  z.string(),
  LocalizedNameSchema,
  LocalizedTextSchema
]);

// Image schema
export const ImageSchema = z.union([
  z.string().url(),
  z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })
]);

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
  inbound: z.array(EdgeSchema).optional(),
  outbound: z.array(EdgeSchema).optional(),
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
  })
]);

// Enhanced item schema with generic base
export const ItemNodeSchema = BaseNodeSchema.extend({
  type: z.literal('item'),
  brand: z.string().optional(),
  category: z.string().optional(),
  series: z.string().optional(),
  grade: z.string().optional(),
  scale: z.string().optional(),
  price: PriceSchema.optional(),
  releaseDate: ReleaseDateSchema.optional(),
  description: LocalizedDescriptionSchema.optional(),
  accessories: z.array(AccessorySchema).optional(),
  images: z.array(ImageSchema).optional(),
  manuals: z.array(z.union([ManualSchema, z.string()])).optional(),
  targetAge: z.number().optional(),
  tags: z.array(z.string()).optional(),
  specifications: z.record(z.string(), z.unknown()).optional(),
  edges: EdgesSchema.optional(),
});

// Brand node schema
export const BrandNodeSchema = BaseNodeSchema.extend({
  type: z.literal('brand'),
  country: z.string().optional(),
  founded: z.union([z.string(), z.number()]).optional(),
  website: z.string().url().optional(),
  description: z.string().optional(),
  itemCount: z.number().optional(),
  edges: EdgesSchema.optional(),
});

// Category node schema
export const CategoryNodeSchema = BaseNodeSchema.extend({
  type: z.literal('category'),
  description: z.string().optional(),
  itemCount: z.number().optional(),
  parentId: z.string().optional(),
});

// Series node schema
export const SeriesNodeSchema = BaseNodeSchema.extend({
  type: z.literal('series'),
  description: z.string().optional(),
  franchise: z.string().optional(),
  itemCount: z.number().optional(),
  parentId: z.string().optional(),
});

// Manual node schema
export const ManualNodeSchema = BaseNodeSchema.extend({
  type: z.literal('manual'),
  url: z.string().url().optional(),
  pages: z.number().optional(),
  language: z.string().optional(),
  size: z.string().optional(),
  itemId: z.string().optional(),
  itemName: z.union([z.string(), LocalizedNameSchema]).optional(),
});

// Union of all node types
export const GraphNodeSchema = z.discriminatedUnion('type', [
  ItemNodeSchema,
  BrandNodeSchema,
  CategoryNodeSchema,
  SeriesNodeSchema,
  ManualNodeSchema,
]);

// Union of all edge types
export const GraphEdgeSchema = z.discriminatedUnion('type', [
  BaseEdgeSchema.extend({ type: z.literal('brand_item') }),
  BaseEdgeSchema.extend({ type: z.literal('item_category') }),
  BaseEdgeSchema.extend({ type: z.literal('item_series') }),
  BaseEdgeSchema.extend({ type: z.literal('item_manual') }),
  BaseEdgeSchema.extend({ type: z.literal('series_franchise') }),
  BaseEdgeSchema.extend({ type: z.literal('category_parent') }),
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
  if (typeof node.name === 'string') return node.name;
  return node.name?.en || node.name?.ja || node.id;
};

export const getNodePrice = (node: ItemNode): string | null => {
  if (!node.price) return null;
  const { amount, currency } = node.price;
  return `${currency === 'JPY' ? '¥' : currency}${amount.toLocaleString()}`;
};

export const getNodeReleaseYear = (node: ItemNode): number | null => {
  return node.releaseDate?.year || null;
};

export const getNodeImages = (node: ItemNode): string[] => {
  if (!node.images) return [];
  return node.images.map(img =>
    typeof img === 'string' ? img : img.url || String(img)
  );
};

export const getNodeDescription = (node: ItemNode): string => {
  if (!node.description || !Array.isArray(node.description)) return '';

  // Get English description if available, fallback to Japanese
  const englishDesc = node.description.find(d => d.en)?.en;
  const japaneseDesc = node.description.find(d => d.ja)?.ja;

  return englishDesc || japaneseDesc || '';
};

export const getNodeAccessories = (node: ItemNode): string[] => {
  if (!node.accessories || !Array.isArray(node.accessories)) return [];

  return node.accessories.map(acc => {
    if (typeof acc === 'string') return acc;
    if (typeof acc === 'object' && acc !== null) {
      return (acc as any).en || (acc as any).ja || JSON.stringify(acc);
    }
    return String(acc);
  });
};

export const getNodeEdges = (node: GraphNode): any => {
  return (node as any).edges || { inbound: [], outbound: [] };
};