/**
 * Arbitrary Graph Database Schema
 * Supports schema-referenced nodes for maximum flexibility
 * Unified system for build-time and runtime operations
 */

import { z } from "zod";

// Core value types that can be stored in graph properties
// Workaround for Zod 4.x _zod property regression using wrapper function
const createGraphValue = () => {
  const GraphValue: z.ZodType<any> = z.lazy(() =>
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
  return GraphValue;
};

export const GraphValue = createGraphValue();

// Node type categories
export const NodeCategoryEnum = z.enum([
  "schema",      // Defines structure/typing for other nodes
  "data",        // Contains actual data instances
  "metadata",    // System metadata and configuration
  "relationship", // Describes relationship types
]);

// Schema node types (define structure)
export const SchemaNodeTypeEnum = z.enum([
  "object_schema",   // Object structure definition
  "field_schema",    // Field type definition
  "enum_schema",     // Enum values definition
  "array_schema",    // Array structure definition
  "relationship_schema", // Relationship structure definition
]);

// Data node types (contain instances)
export const DataNodeTypeEnum = z.enum([
  "hobby_type",     // Hobby type instance
  "brand",          // Brand instance
  "scale",          // Scale instance
  "category",       // Category instance
  "item",           // Catalog item instance
  "collection",     // User collection instance
  "field_instance", // Field value instance
]);

// Relationship direction
export const RelationshipDirectionEnum = z.enum([
  "directed",       // A → B
  "undirected",     // A ↔ B
  "bidirectional",  // A → B and B → A
]);

// Schema definition types
const ObjectSchemaDefinition = z.object({
  properties: z.record(z.string(), GraphValue),
  required: z.array(z.string()).optional(),
  additionalProperties: z.boolean().default(true),
});

const FieldSchemaDefinition = z.object({
  fieldType: z.enum(["string", "number", "boolean", "date", "array", "object", "enum"]),
  constraints: z.record(z.string(), GraphValue).optional(),
  validation: z.record(z.string(), GraphValue).optional(),
});

const EnumSchemaDefinition = z.object({
  values: z.array(GraphValue),
  default: GraphValue.optional(),
});

const ArraySchemaDefinition = z.object({
  itemsSchema: z.string(), // Reference to schema node ID
  minItems: z.number().optional(),
  maxItems: z.number().optional(),
});

const RelationshipSchemaDefinition = z.object({
  fromNodeType: z.string(), // Reference to schema node ID
  toNodeType: z.string(),   // Reference to schema node ID
  direction: RelationshipDirectionEnum.default("directed"),
  properties: z.record(z.string(), GraphValue).optional(),
});

// Schema node - defines structure for data nodes
export const SchemaNode = z.object({
  id: z.string(),
  category: z.literal(NodeCategoryEnum.enum.schema),
  type: SchemaNodeTypeEnum,
  name: z.string(),
  description: z.string().optional(),

  // Schema definition varies by type
  definition: z.union([
    ObjectSchemaDefinition,
    FieldSchemaDefinition,
    EnumSchemaDefinition,
    ArraySchemaDefinition,
    RelationshipSchemaDefinition,
  ]),

  metadata: z.object({
    version: z.string().optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  }).optional(),
});

// Data node - contains actual data
export const DataNode = z.object({
  id: z.string(),
  category: z.literal(NodeCategoryEnum.enum.data),
  type: DataNodeTypeEnum,
  schemaId: z.string(), // Reference to schema node ID

  // Data content follows schema definition
  properties: z.record(z.string(), GraphValue),

  // Runtime metadata
  metadata: z.object({
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    version: z.string().optional(),
    source: z.string().optional(), // Data source origin
    confidence: z.number().min(0).max(1).optional(),
  }),
});

// Relationship between nodes
export const Relationship = z.object({
  id: z.string(),
  category: z.literal(NodeCategoryEnum.enum.relationship),
  type: z.string(), // Reference to relationship schema ID
  fromNode: z.string(), // Node ID
  toNode: z.string(),   // Node ID
  direction: RelationshipDirectionEnum.default("directed"),

  properties: z.record(z.string(), GraphValue).optional(),

  metadata: z.object({
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    strength: z.number().min(0).max(1).optional(), // Edge weight
    confidence: z.number().min(0).max(1).optional(),
  }).optional(),
});

// Complete graph database
export const ArbitraryGraph = z.object({
  nodes: z.array(z.union([SchemaNode, DataNode, Relationship])),
  schemas: z.record(z.string(), z.object({
    jsonSchema: z.record(z.string(), z.unknown()),
    zodSchema: z.string(), // String representation for runtime use
  })).optional(),

  metadata: z.object({
    version: z.string().default("1.0.0"),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    description: z.string().optional(),
    totalNodes: z.number(),
    totalRelationships: z.number(),
  }),
});

// Type guards
export function isSchemaNode(node: unknown): node is z.infer<typeof SchemaNode> {
  return SchemaNode.safeParse(node).success;
}

export function isDataNode(node: unknown): node is z.infer<typeof DataNode> {
  return DataNode.safeParse(node).success;
}

export function isRelationship(node: unknown): node is z.infer<typeof Relationship> {
  return Relationship.safeParse(node).success;
}

// Type helpers
type SchemaNodeUnion = z.output<typeof SchemaNode>;
type DataNodeUnion = z.output<typeof DataNode>;
type RelationshipUnion = z.output<typeof Relationship>;

// Unified Graph Manager
export class ArbitraryGraphManager {
  constructor(private graph: ArbitraryGraphType) {}

  // Get nodes by category
  getSchemaNodes(): SchemaNodeUnion[] {
    return this.graph.nodes.filter(isSchemaNode) as SchemaNodeUnion[];
  }

  getDataNodes(): DataNodeUnion[] {
    return this.graph.nodes.filter(isDataNode) as DataNodeUnion[];
  }

  getRelationships(): RelationshipUnion[] {
    return this.graph.nodes.filter(isRelationship) as RelationshipUnion[];
  }

  // Get nodes by type
  getSchemaNodesByType(type: z.infer<typeof SchemaNodeTypeEnum>): SchemaNodeUnion[] {
    return this.getSchemaNodes().filter((node: SchemaNodeUnion) => node.type === type);
  }

  getDataNodesByType(type: z.infer<typeof DataNodeTypeEnum>): DataNodeUnion[] {
    return this.getDataNodes().filter((node: DataNodeUnion) => node.type === type);
  }

  // Get schema for a data node
  getSchemaForDataNode(dataNode: DataNodeUnion): SchemaNodeUnion | null {
    const schemaNode = this.getSchemaNodes().find(schema => schema.id === dataNode.schemaId);
    return schemaNode || null;
  }

  // Validate data node against its schema
  validateDataNode(dataNode: DataNodeUnion): { valid: boolean; errors: string[] } {
    const schema = this.getSchemaForDataNode(dataNode);
    if (!schema) {
      return { valid: false, errors: [`Schema not found for data node ${dataNode.id}`] };
    }

    const errors: string[] = [];

    // Basic validation based on schema type
    if (schema.type === 'object_schema') {
      const objectSchema = schema.definition as z.infer<typeof ObjectSchemaDefinition>;
      for (const [key, value] of Object.entries(dataNode.properties)) {
        if (objectSchema.required?.includes(key) && (value === null || value === undefined)) {
          errors.push(`Required property '${key}' is missing or null`);
        }
      }
    }
    // Add more schema type validations as needed

    return { valid: errors.length === 0, errors };
  }

  // Get relationships for a node
  getRelationshipsForNode(nodeId: string): RelationshipUnion[] {
    return this.getRelationships().filter(
      rel => rel.fromNode === nodeId || rel.toNode === nodeId
    );
  }

  // Get connected nodes
  getConnectedNodes(nodeId: string): DataNodeUnion[] {
    const relationships = this.getRelationshipsForNode(nodeId);
    const connectedIds = relationships.map(rel =>
      rel.fromNode === nodeId ? rel.toNode : rel.fromNode
    );

    return this.getDataNodes().filter(node => connectedIds.includes(node.id));
  }

  // Validate the entire graph
  validateGraph(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const allNodeIds = new Set(this.graph.nodes.map(node => node.id));

    // Validate relationships reference existing nodes
    for (const relationship of this.getRelationships()) {
      if (!allNodeIds.has(relationship.fromNode)) {
        errors.push(`Relationship ${relationship.id} references non-existent fromNode: ${relationship.fromNode}`);
      }
      if (!allNodeIds.has(relationship.toNode)) {
        errors.push(`Relationship ${relationship.id} references non-existent toNode: ${relationship.toNode}`);
      }
    }

    // Validate data nodes reference existing schemas
    const schemaIds = new Set(this.getSchemaNodes().map(schema => schema.id));
    for (const dataNode of this.getDataNodes()) {
      if (!schemaIds.has(dataNode.schemaId)) {
        errors.push(`Data node ${dataNode.id} references non-existent schema: ${dataNode.schemaId}`);
      }

      // Validate data against schema
      const validation = this.validateDataNode(dataNode);
      if (!validation.valid) {
        errors.push(`Data node ${dataNode.id} validation failed: ${validation.errors.join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Get graph statistics
  getStatistics() {
    const schemaNodes = this.getSchemaNodes();
    const dataNodes = this.getDataNodes();
    const relationships = this.getRelationships();

    return {
      totalNodes: this.graph.nodes.length,
      schemaNodes: {
        total: schemaNodes.length,
        byType: schemaNodes.reduce((acc, node) => {
          acc[node.type] = (acc[node.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      dataNodes: {
        total: dataNodes.length,
        byType: dataNodes.reduce((acc, node) => {
          acc[node.type] = (acc[node.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      relationships: {
        total: relationships.length,
        byType: relationships.reduce((acc, rel) => {
          acc[rel.type] = (acc[rel.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  }
}

// Export types
export type ArbitraryGraphType = z.infer<typeof ArbitraryGraph>;
export type SchemaNodeType = z.infer<typeof SchemaNode>;
export type DataNodeType = z.infer<typeof DataNode>;
export type RelationshipType = z.infer<typeof Relationship>;
export type GraphValueType = z.infer<typeof GraphValue>;

// Validation helper using proper Zod parsing
export const validateArbitraryGraph = (data: unknown) => {
  const result = ArbitraryGraph.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: `Invalid graph structure: ${result.error.issues.map(i => i.message).join(', ')}`
    };
  }
  return { success: true, data: result.data };
};