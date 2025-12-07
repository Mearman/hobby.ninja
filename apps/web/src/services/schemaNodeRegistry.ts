/**
 * Schema Node Registry
 * Central registry for schema definitions that data nodes reference
 * Provides runtime access to schema validation and metadata
 */

import { z } from 'zod';
import {
  ArbitraryGraph,
  ArbitraryGraphManager,
  SchemaNode,
  DataNode,
  SchemaNodeTypeEnum,
  DataNodeTypeEnum,
  GraphValue,
  validateArbitraryGraph
} from '../schemas/arbitrary-graph-schema';

export interface SchemaDefinition {
  id: string;
  type: SchemaNodeTypeEnum;
  name: string;
  description?: string;
  definition: any;
  jsonSchema?: Record<string, unknown>;
  zodSchema?: z.ZodSchema;
  metadata?: {
    version?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  data?: any;
}

/**
 * Central registry for managing schema nodes and providing validation services
 */
export class SchemaNodeRegistry {
  private schemas = new Map<string, SchemaDefinition>();
  private graphManager: ArbitraryGraphManager | null = null;

  constructor(graph?: ArbitraryGraph) {
    if (graph) {
      this.loadFromGraph(graph);
    }
  }

  /**
   * Load schema definitions from an arbitrary graph
   */
  loadFromGraph(graph: ArbitraryGraph): void {
    const validation = validateArbitraryGraph(graph);
    if (!validation.success) {
      throw new Error(`Invalid graph provided to registry: ${validation.error}`);
    }

    this.graphManager = new ArbitraryGraphManager(validation.data);
    this.populateRegistry();
  }

  /**
   * Get all schema definitions
   */
  getAllSchemas(): SchemaDefinition[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Get schema definition by ID
   */
  getSchema(id: string): SchemaDefinition | null {
    return this.schemas.get(id) || null;
  }

  /**
   * Get schemas by type
   */
  getSchemasByType(type: SchemaNodeTypeEnum): SchemaDefinition[] {
    return Array.from(this.schemas.values()).filter(schema => schema.type === type);
  }

  /**
   * Register a new schema definition
   */
  registerSchema(definition: SchemaDefinition): void {
    // Generate JSON schema from definition instead of creating Zod schema
    if (!definition.jsonSchema) {
      definition.jsonSchema = {
        type: 'object',
        properties: this.extractPropertiesFromDefinition(definition.definition),
      };
    }

    // Skip Zod schema generation to avoid Zod 4.x issues
    // Will create schemas on-demand when needed
    definition.zodSchema = undefined;

    this.schemas.set(definition.id, definition);
  }

  /**
   * Validate data against a schema
   */
  validateData(schemaId: string, data: unknown): ValidationResult {
    const schema = this.getSchema(schemaId);
    if (!schema) {
      return {
        valid: false,
        errors: [`Schema not found: ${schemaId}`]
      };
    }

    // Simple validation based on schema definition without Zod
    try {
      const result = this.validateAgainstDefinition(schema.definition, data);
      return result;
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Validate a data node against its referenced schema
   */
  validateDataNode(dataNode: DataNode): ValidationResult {
    return this.validateData(dataNode.schemaId, dataNode.properties);
  }

  /**
   * Get schema for a specific data node type
   */
  getSchemaForDataNode(dataNodeType: DataNodeTypeEnum): SchemaDefinition | null {
    // Look for object schemas that are commonly used for data nodes
    const objectSchemas = this.getSchemasByType('object_schema');

    for (const schema of objectSchemas) {
      // Check if the schema name suggests it's for this data node type
      if (schema.name.toLowerCase().includes(dataNodeType.toLowerCase())) {
        return schema;
      }
    }

    // Fallback to first object schema
    return objectSchemas[0] || null;
  }

  /**
   * Create a new schema definition from raw definition
   */
  createSchema(
    id: string,
    type: SchemaNodeTypeEnum,
    name: string,
    definition: any,
    description?: string
  ): SchemaDefinition {
    const schema: SchemaDefinition = {
      id,
      type,
      name,
      description,
      definition,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    };

    this.registerSchema(schema);
    return schema;
  }

  /**
   * Update an existing schema definition
   */
  updateSchema(id: string, updates: Partial<SchemaDefinition>): SchemaDefinition | null {
    const existing = this.getSchema(id);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...updates,
      id, // Ensure ID cannot be changed
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        updatedAt: new Date().toISOString(),
      }
    };

    this.registerSchema(updated);
    return updated;
  }

  /**
   * Remove a schema definition
   */
  removeSchema(id: string): boolean {
    // Check if any data nodes reference this schema
    if (this.graphManager) {
      const dataNodes = this.graphManager.getDataNodes();
      const inUse = dataNodes.some(node => node.schemaId === id);

      if (inUse) {
        throw new Error(`Cannot remove schema ${id}: still referenced by data nodes`);
      }
    }

    return this.schemas.delete(id);
  }

  /**
   * Get registry statistics
   */
  getStatistics() {
    const schemas = this.getAllSchemas();
    const byType = schemas.reduce((acc, schema) => {
      acc[schema.type] = (acc[schema.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSchemas: schemas.length,
      byType,
      withZodSchemas: schemas.filter(s => s.zodSchema).length,
      withJsonSchemas: schemas.filter(s => s.jsonSchema).length,
    };
  }

  /**
   * Export registry to JSON-serializable format
   */
  export(): Record<string, SchemaDefinition> {
    const exported: Record<string, SchemaDefinition> = {};
    for (const [id, schema] of this.schemas) {
      // Don't export Zod schemas as they're not JSON-serializable
      exported[id] = {
        ...schema,
        zodSchema: undefined,
      };
    }
    return exported;
  }

  /**
   * Import registry from JSON format
   */
  import(data: Record<string, SchemaDefinition>): void {
    for (const schema of Object.values(data)) {
      this.registerSchema(schema);
    }
  }

  // Private methods

  private validateAgainstDefinition(definition: any, data: unknown): ValidationResult {
    const errors: string[] = [];

    if (!definition || typeof definition !== 'object') {
      return { valid: false, errors: ['Invalid schema definition'] };
    }

    // Handle object schema validation
    if (definition.type === 'object') {
      if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Expected object'] };
      }

      const obj = data as Record<string, any>;
      const props = definition.properties || {};

      // Check required properties
      if (definition.required && Array.isArray(definition.required)) {
        for (const requiredProp of definition.required) {
          if (!(requiredProp in obj)) {
            errors.push(`Missing required property: ${requiredProp}`);
          }
        }
      }

      // Validate property types (basic validation)
      for (const [key, propDef] of Object.entries(props)) {
        if (key in obj) {
          const value = obj[key];
          const expectedType = (propDef as any).type;

          if (expectedType === 'string' && typeof value !== 'string') {
            errors.push(`${key}: Expected string, got ${typeof value}`);
          } else if (expectedType === 'number' && typeof value !== 'number') {
            errors.push(`${key}: Expected number, got ${typeof value}`);
          } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
            errors.push(`${key}: Expected boolean, got ${typeof value}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      data: errors.length === 0 ? data : undefined
    };
  }

  private populateRegistry(): void {
    if (!this.graphManager) return;

    const schemaNodes = this.graphManager.getSchemaNodes();
    for (const schemaNode of schemaNodes) {
      const definition: SchemaDefinition = {
        id: schemaNode.id,
        type: schemaNode.type,
        name: schemaNode.name,
        description: schemaNode.description,
        definition: schemaNode.definition,
        metadata: schemaNode.metadata,
      };

      this.registerSchema(definition);
    }
  }

  private createZodSchema(definition: SchemaDefinition): z.ZodSchema {
    switch (definition.type) {
      case 'object_schema':
        return this.createObjectSchema(definition.definition);
      case 'field_schema':
        return this.createFieldSchema(definition.definition);
      case 'enum_schema':
        return this.createEnumSchema(definition.definition);
      case 'array_schema':
        return this.createArraySchema(definition.definition);
      case 'relationship_schema':
        return this.createRelationshipSchema(definition.definition);
      default:
        return z.any();
    }
  }

  private createObjectSchema(def: any): z.ZodSchema {
    const properties: Record<string, z.ZodSchema> = {};

    for (const [key, type] of Object.entries(def.properties || {})) {
      properties[key] = this.createZodSchemaForType(type as string);
    }

    const schema = z.object(properties);

    if (def.required && Array.isArray(def.required)) {
      return schema.partial().required(def.required as any);
    }

    return schema;
  }

  private createFieldSchema(def: any): z.ZodSchema {
    switch (def.fieldType) {
      case 'string':
        return z.string();
      case 'number':
        return z.number();
      case 'boolean':
        return z.boolean();
      case 'date':
        return z.date();
      case 'array':
        return z.array(z.any());
      case 'object':
        return z.record(z.any());
      case 'enum':
        return z.enum(def.values || []);
      default:
        return z.any();
    }
  }

  private createEnumSchema(def: any): z.ZodSchema {
    const values = def.values || [];
    if (values.length > 0 && typeof values[0] === 'string') {
      return z.enum(values as [string, ...string[]]);
    }
    return z.any();
  }

  private createArraySchema(def: any): z.ZodSchema {
    const itemsSchema = def.itemsSchema ?
      this.createZodSchemaForType(def.itemsSchema) :
      z.any();

    let schema = z.array(itemsSchema);

    if (def.minItems !== undefined) {
      schema = schema.min(def.minItems);
    }
    if (def.maxItems !== undefined) {
      schema = schema.max(def.maxItems);
    }

    return schema;
  }

  private createRelationshipSchema(def: any): z.ZodSchema {
    return z.object({
      fromNode: z.string(),
      toNode: z.string(),
      direction: z.enum(['directed', 'undirected', 'bidirectional']).default('directed'),
      properties: z.record(z.any()).optional(),
    });
  }

  private createZodSchemaForType(type: string): z.ZodSchema {
    switch (type) {
      case 'string':
        return z.string();
      case 'number':
        return z.number();
      case 'boolean':
        return z.boolean();
      case 'date':
        return z.date();
      case 'array':
        return z.array(z.any());
      case 'object':
        return z.record(z.any());
      default:
        return z.any();
    }
  }

  private extractPropertiesFromDefinition(def: any): Record<string, any> {
    if (def.properties) {
      return def.properties;
    }

    if (def.fieldType) {
      return { type: def.fieldType };
    }

    if (def.values) {
      return { type: 'enum', enum: def.values };
    }

    return {};
  }
}

// Global registry instance
export const schemaRegistry = new SchemaNodeRegistry();