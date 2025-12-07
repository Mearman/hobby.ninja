/**
 * Universal Graph Entity Schema System
 *
 * Base graph entity types that extend to nodes and edges,
 * which then extend to specific data types (manual, catalog, unified)
 *
 * Uses Zod 4's built-in JSON schema generation
 */

import { z } from "zod";

// ===== BASE GRAPH ENTITY TYPES =====

// ===== BASE GRAPH ENTITY TYPES =====

// Core value types for graph properties
const GraphValue: any = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(GraphValue),
    z.record(z.string(), GraphValue),
    z.date(),
    z.null(),
  ])
);

// Base entity schema with common properties for all graph objects
const BaseEntitySchema = z.object({
  $schema: z.string().url().optional(), // URL to the schema definition
  $id: z.string(), // Internal path-based identifier (e.g. /graph/...)
  id: z.string().optional(), // External business ID
  category: z.enum(["schema", "data", "container", "relationship"]),
  $type: z.string(), // usage: $type instead of type

  properties: z.record(z.string(), GraphValue).optional(),

  metadata: z.object({
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
    version: z.string().optional(),
    source: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
  }).optional(),
});

// ===== NODE AND EDGE SCHEMAS =====

// Inline relationship definition (embedded in nodes)
const InlineRelationshipSchema = z.object({
  $type: z.string(),
  node: z.string(), // Target node reference
  $direction: z.enum(["directed", "undirected", "bidirectional"]).default("directed").optional(),
  properties: z.record(z.string(), GraphValue).optional(),
});

// Base node schema extending entity
const BaseNodeSchema = BaseEntitySchema.extend({
  category: z.enum(["schema", "data", "container"]),
  name: z.union([
    z.string(),
    z.object({ ja: z.string(), en: z.string() }) // Multilingual support
  ]).optional(),
  $edges: z.array(InlineRelationshipSchema).optional(),
  standaloneEdges: z.array(z.string()).optional(), // References to external edge files
});

// Base edge/relationship schema (standalone file)
const BaseEdgeSchema = BaseEntitySchema.extend({
  category: z.literal("relationship"),
  $direction: z.enum(["directed", "undirected", "bidirectional"]).default("directed"),
  fromNode: z.string(),
  toNode: z.string(),
});

// ===== SCHEMA NODE DEFINITIONS =====

// Schema node types
const SchemaNodeTypeEnum = z.enum([
  "graph_entity_schema",     // Base graph entity definition
  "node_schema",            // Node structure definition
  "edge_schema",            // Edge structure definition
  "unified_item_schema",    // Unified product definition
  "manual_item_schema",     // Manual item definition
  "catalog_item_schema",    // Catalog item definition
]);

// Schema definitions for different types
const GraphEntitySchemaDefinition = z.object({
  extends: z.string().optional(), // Parent schema ID
  properties: z.record(z.string(), z.string()), // Property name -> type mapping
  required: z.array(z.string()).optional(),
  additionalProperties: z.boolean().default(true),
});

const NodeSchemaDefinition = GraphEntitySchemaDefinition.extend({
  nodeCategory: z.string().optional(), // Category of node (data, metadata, etc.)
});

const EdgeSchemaDefinition = GraphEntitySchemaDefinition.extend({
  fromNodeType: z.string().optional(), // Expected source node type
  toNodeType: z.string().optional(),   // Expected target node type
});

const UnifiedItemSchemaDefinition = GraphEntitySchemaDefinition.extend({
  dataSources: z.array(z.string()).optional(), // Expected data sources
});

const ManualItemSchemaDefinition = GraphEntitySchemaDefinition.extend({
  requiredFields: z.array(z.string()).optional(), // Required manual fields
});

const CatalogItemSchemaDefinition = GraphEntitySchemaDefinition.extend({
  priceFields: z.array(z.string()).optional(), // Price-related fields
});

// Schema node - defines structure for other nodes
const SchemaNode = BaseNodeSchema.extend({
  category: z.literal("schema"),
  $type: SchemaNodeTypeEnum,
  name: z.string(),
  description: z.string().optional(),
  definition: z.union([
    GraphEntitySchemaDefinition,
    NodeSchemaDefinition,
    EdgeSchemaDefinition,
    UnifiedItemSchemaDefinition,
    ManualItemSchemaDefinition,
    CatalogItemSchemaDefinition,
  ]),
});

// ===== DATA NODE SCHEMAS =====

// Data node types
const DataNodeTypeEnum = z.enum([
  "unified_item",    // Unified product data
  "manual_item",     // Manual-only data
  "catalog_item",    // Catalog-only data
  "hobby_type",      // Hobby type configuration
  "brand",           // Brand information
  "series",          // Series information
]);

// Multilingual text structure
const MultilingualText = z.object({
  ja: z.string(),
  en: z.string(),
});

// Date structure
const DateInfo = z.object({
  ja: z.string().optional(),
  year: z.number(),
  month: z.number(),
  day: z.number(),
});

// Price information
const PriceInfo = z.object({
  amount: z.number(),
  currency: z.string(),
  taxIncluded: z.boolean().optional(),
  taxRate: z.number().optional(),
});

// Source references for unified items
const UnifiedSources = z.object({
  catalog: z.object({
    id: z.string(),
    confidence: z.number().min(0).max(1),
    linkedAt: z.string().datetime(),
  }).optional(),
  manual: z.object({
    id: z.string(),
    productNumber: z.string().optional(),
    pdfUrl: z.string().url(),
    confidence: z.number().min(0).max(1),
    linkedAt: z.string().datetime(),
  }).optional(),
});

// Unified item schema (catalog + manual data)
const UnifiedItemNode = BaseNodeSchema.extend({
  $type: z.literal(DataNodeTypeEnum.enum.unified_item),
  schemaId: z.string().startsWith("unified_item_schema_"),
  properties: z.object({
    name: MultilingualText,
    series: MultilingualText.optional(),
    grade: z.string(),
    scale: z.string(),
    releaseDate: DateInfo,
    sources: UnifiedSources,
    matchMethod: z.enum(["exact", "fuzzy", "partial"]),
    matchStage: z.number().optional(),
  }),
});

// Manual item schema (manual-only data)
const ManualItemNode = BaseNodeSchema.extend({
  $type: z.literal(DataNodeTypeEnum.enum.manual_item),
  schemaId: z.string().startsWith("manual_item_schema_"),
  properties: z.object({
    name: MultilingualText,
    productNumber: z.string(),
    releaseDate: DateInfo,
    series: MultilingualText,
    grade: z.object({
      code: z.string(),
      family: z.string(),
    }),
    scale: z.string(),
    pdfUrl: z.string().url(),
    productImage: z.string().url().optional(),
    thumbnailImage: z.string().url().optional(),
  }),
});

// Catalog item schema (catalog-only data)
const CatalogItemNode = BaseNodeSchema.extend({
  $type: z.literal(DataNodeTypeEnum.enum.catalog_item),
  schemaId: z.string().startsWith("catalog_item_schema_"),
  properties: z.object({
    name: MultilingualText,
    price: PriceInfo.optional(),
    releaseDate: DateInfo.extend({
      ja: z.string().optional(),
    }),
    targetAge: z.number().optional(),
    series: MultilingualText.extend({
      url: z.string().url().optional(),
    }),
    brands: z.array(z.record(z.string(), z.unknown())).optional(),
    categories: z.array(z.record(z.string(), z.unknown())).optional(),
    scale: z.string(),
    description: z.array(z.record(z.string(), z.unknown())).optional(),
    accessories: z.array(z.record(z.string(), z.unknown())).optional(),
    contents: z.array(z.record(z.string(), z.unknown())).optional(),
    images: z.array(z.string().url()).optional(),
    relatedProducts: z.array(z.record(z.string(), z.unknown())).optional(),
  }),
});

// Hobby type node
const HobbyTypeNode = BaseNodeSchema.extend({
  $type: z.literal(DataNodeTypeEnum.enum.hobby_type),
  schemaId: z.string().startsWith("node_schema_"),
  properties: z.object({
    name: z.string(),
    description: z.string(),
    icon: z.string().optional(),
    color: z.string().optional(),
    isActive: z.boolean().default(true),
  }),
});

// Brand node
const BrandNode = BaseNodeSchema.extend({
  $type: z.literal(DataNodeTypeEnum.enum.brand),
  schemaId: z.string().startsWith("node_schema_"),
  properties: z.object({
    name: z.string(),
    website: z.string().url().optional(),
    founded: z.number().optional(),
    country: z.string().optional(),
  }),
});

// Series node
const SeriesNode = BaseNodeSchema.extend({
  $type: z.literal(DataNodeTypeEnum.enum.series),
  schemaId: z.string().startsWith("node_schema_"),
  properties: z.object({
    name: MultilingualText,
    url: z.string().url().optional(),
  }),
});

// ===== EDGE/RELATIONSHIP SCHEMAS =====

// Relationship types
const RelationshipTypeEnum = z.enum([
  "HAS_CATALOG_DATA",
  "HAS_MANUAL_DATA",
  "MERGED_WITH",
  "HAS_BRAND",
  "HAS_SERIES",
  "HAS_GRADE",
  "BELONGS_TO_SERIES",
  "RELEASED_IN",
  "SIMILAR_TO",
  "RELATED_TO",
]);

// Unified relationship schemas
const HasCatalogDataEdge = BaseEdgeSchema.extend({
  $type: z.literal(RelationshipTypeEnum.enum.HAS_CATALOG_DATA),
  schemaId: z.string().startsWith("edge_schema_"),
  properties: z.object({
    confidence: z.number().min(0).max(1),
    linkedAt: z.string().datetime(),
  }),
});

const HasManualDataEdge = BaseEdgeSchema.extend({
  $type: z.literal(RelationshipTypeEnum.enum.HAS_MANUAL_DATA),
  schemaId: z.string().startsWith("edge_schema_"),
  properties: z.object({
    confidence: z.number().min(0).max(1),
    linkedAt: z.string().datetime(),
  }),
});

const MergedWithEdge = BaseEdgeSchema.extend({
  $type: z.literal(RelationshipTypeEnum.enum.MERGED_WITH),
  schemaId: z.string().startsWith("edge_schema_"),
  properties: z.object({
    matchMethod: z.enum(["exact", "fuzzy", "partial"]),
    matchStage: z.number(),
    confidence: z.number().min(0).max(1),
  }),
});

// General relationship schemas
const HasBrandEdge = BaseEdgeSchema.extend({
  $type: z.literal(RelationshipTypeEnum.enum.HAS_BRAND),
  schemaId: z.string().startsWith("edge_schema_"),
});

const HasSeriesEdge = BaseEdgeSchema.extend({
  $type: z.literal(RelationshipTypeEnum.enum.HAS_SERIES),
  schemaId: z.string().startsWith("edge_schema_"),
});

const BelongsToSeriesEdge = BaseEdgeSchema.extend({
  $type: z.literal(RelationshipTypeEnum.enum.BELONGS_TO_SERIES),
  schemaId: z.string().startsWith("edge_schema_"),
});

// ===== COMPLETE GRAPH SCHEMA =====

const UniversalGraphSchema = z.object({
  nodes: z.array(z.union([
    SchemaNode,
    UnifiedItemNode,
    ManualItemNode,
    CatalogItemNode,
    HobbyTypeNode,
    BrandNode,
    SeriesNode,
  ])),
  edges: z.array(z.union([
    HasCatalogDataEdge,
    HasManualDataEdge,
    MergedWithEdge,
    HasBrandEdge,
    HasSeriesEdge,
    BelongsToSeriesEdge,
  ])),
  schemas: z.record(z.string(), z.object({
    jsonSchema: z.record(z.string(), z.unknown()), // Generated by Zod
    zodSchema: z.string(), // String representation for runtime use
  })).optional(),
  metadata: z.object({
    version: z.string().default("1.0.0"),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    description: z.string().optional(),
    totalNodes: z.number(),
    totalEdges: z.number(),
  }),
});

// ===== JSON SCHEMA GENERATION HELPERS =====

/**
 * Generate JSON schemas from Zod schemas using Zod 4's built-in functionality
 */
class SchemaGeneratorImpl {
  // Generate schema for a specific data type
  static generateUnifiedItemSchema() {
    return UnifiedItemNode;
  }

  static generateManualItemSchema() {
    return ManualItemNode;
  }

  static generateCatalogItemSchema() {
    return CatalogItemNode;
  }

  static generateSchemaNodeSchema() {
    return SchemaNode;
  }

  // Generate all schemas
  static generateAllSchemas() {
    return {
      graph_entity: BaseEntitySchema,
      node: BaseNodeSchema,
      edge: BaseEdgeSchema,
      schema_node: SchemaNode,
      unified_item: UnifiedItemNode,
      manual_item: ManualItemNode,
      catalog_item: CatalogItemNode,
      hobby_type: HobbyTypeNode,
      brand: BrandNode,
      series: SeriesNode,
      has_catalog_data: HasCatalogDataEdge,
      has_manual_data: HasManualDataEdge,
      merged_with: MergedWithEdge,
      universal_graph: UniversalGraphSchema,
    };
  }
}

// ===== TYPE INFERENCE AND EXPORTS =====

export type UniversalGraphType = z.infer<typeof UniversalGraphSchema>;
export type BaseEntitySchemaType = z.infer<typeof BaseEntitySchema>;
export type BaseNodeSchemaType = z.infer<typeof BaseNodeSchema>;
export type BaseEdgeSchemaType = z.infer<typeof BaseEdgeSchema>;
export type SchemaNodeType = z.infer<typeof SchemaNode>;
export type UnifiedItemNodeType = z.infer<typeof UnifiedItemNode>;
export type ManualItemNodeType = z.infer<typeof ManualItemNode>;
export type CatalogItemNodeType = z.infer<typeof CatalogItemNode>;
export type HobbyTypeNodeType = z.infer<typeof HobbyTypeNode>;
export type BrandNodeType = z.infer<typeof BrandNode>;
export type SeriesNodeType = z.infer<typeof SeriesNode>;
export type GraphValueType = z.infer<typeof GraphValue>;

// ===== SCHEMA EXPORTS =====

export {
  GraphValue,
  BaseEntitySchema,
  BaseNodeSchema,
  BaseEdgeSchema,
  SchemaNode,
  UnifiedItemNode,
  ManualItemNode,
  CatalogItemNode,
  HobbyTypeNode,
  BrandNode,
  SeriesNode,
  HasCatalogDataEdge,
  HasManualDataEdge,
  MergedWithEdge,
  HasBrandEdge,
  HasSeriesEdge,
  BelongsToSeriesEdge,
  UniversalGraphSchema,
  MultilingualText,
  DateInfo,
  PriceInfo,
  UnifiedSources,
};

// Export the SchemaGenerator instance with the correct name
export const SchemaGenerator = SchemaGeneratorImpl;

// ===== VALIDATION HELPERS =====

export const validateUniversalGraph = (data: unknown) => {
  const result = UniversalGraphSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: `Invalid graph structure: ${result.error.issues.map(i => i.message).join(', ')}`
    };
  }
  return { success: true, data: result.data };
};

export const validateUnifiedItem = (data: unknown) => {
  const result = UnifiedItemNode.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: `Invalid unified item: ${result.error.issues.map(i => i.message).join(', ')}`
    };
  }
  return { success: true, data: result.data };
};

export const validateManualItem = (data: unknown) => {
  const result = ManualItemNode.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: `Invalid manual item: ${result.error.issues.map(i => i.message).join(', ')}`
    };
  }
  return { success: true, data: result.data };
};

export const validateCatalogItem = (data: unknown) => {
  const result = CatalogItemNode.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: `Invalid catalog item: ${result.error.issues.map(i => i.message).join(', ')}`
    };
  }
  return { success: true, data: result.data };
};