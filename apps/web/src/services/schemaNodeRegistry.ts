
import { z } from "zod";

import {
	SchemaNode,
	SchemaNodeType,
	UniversalGraphSchema,
	UniversalGraphType,
} from "../schemas/universal-graph-schema";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  data?: any;
}

/**
 * Central registry for managing schema nodes and providing validation services
 * Version 2: Supports Universal Graph Schema-as-Node architecture
 */
export class SchemaNodeRegistry {
	private static instance: SchemaNodeRegistry;
	private schemas = new Map<string, SchemaNodeType>();

	private constructor() { }

	public static getInstance(): SchemaNodeRegistry {
		if (!SchemaNodeRegistry.instance) {
			SchemaNodeRegistry.instance = new SchemaNodeRegistry();
		}
		return SchemaNodeRegistry.instance;
	}

	/**
   * Load all schema nodes from a Universal Graph
   */
	public loadFromGraph(graph: UniversalGraphType): void {
		const schemas = graph.nodes.filter(node => node.category === "schema") as SchemaNodeType[];
		for (const schema of schemas) {
			this.register(schema);
		}
		console.log(`[SchemaNodeRegistry] Loaded ${schemas.length} schemas from graph.`);
	}

	/**
   * Register a new schema node definition
   */
	public register(schema: SchemaNodeType): void {
		// Basic validation that it is a schema node
		if (schema.category !== "schema") {
			throw new Error(`Invalid category for schema registration: ${schema.category}`);
		}
		this.schemas.set(schema.$id, schema);
	}

	/**
   * Get schema definition by ID
   */
	public get(id: string): SchemaNodeType | undefined {
		return this.schemas.get(id);
	}

	/**
   * Get all registered schemas
   */
	public getAll(): SchemaNodeType[] {
		return [...this.schemas.values()];
	}

	/**
   * Get schemas by strict type (e.g. node_schema, unified_item_schema)
   */
	public getByType(type: string): SchemaNodeType[] {
		return [...this.schemas.values()].filter(s => s.$type === type); // Mapped to $type in v2
	}

	/**
   * Validate data against a registered schema ID
   * This parses the "definition" property of the Schema Node to apply validation rules
   */
	public validate(schemaId: string, data: unknown): ValidationResult {
		const schemaNode = this.get(schemaId);
		if (!schemaNode) {
			return { valid: false, errors: [`Schema definition not found: ${schemaId}`] };
		}

		return this.validateAgainstDefinition(schemaNode.definition, data);
	}

	/**
   * Internal validator logic handling the Schema Node definition structure
   */
	private validateAgainstDefinition(definition: any, data: unknown): ValidationResult {
		const errors: string[] = [];

		// definitions in v2 are mostly GraphEntitySchemaDefinition (properties object)
		// structure: { properties: Record<string, string>, required: string[], ... }

		// 1. Check object type
		if (typeof data !== "object" || data === null) {
			return { valid: false, errors: ["Data is not an object"] };
		}
		const dataObj = data as Record<string, any>;

		// 2. Validate Properties
		if (definition.properties) {
			for (const [key, typeDef] of Object.entries(definition.properties)) {
				// Check if property is present
				if (key in dataObj) {
					// TODO: Type checking based on typeDef (which is currently a string map in v1 schema?)
					// In universal-graph-schema, definition.properties is Record<string, string> currently.
					// We need to support the "GraphValue" or complex type definitions.
					// For phase 1, we relax strict type checking or implement basic primitive checks.
				}
			}
		}

		// 3. Validate Required Fields
		if (definition.required && Array.isArray(definition.required)) {
			for (const reqField of definition.required) {
				if (!(reqField in dataObj) || dataObj[reqField] === undefined) {
					errors.push(`Missing required field: ${reqField}`);
				}
			}
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
   * Export all schemas as a record
   */
	public export(): Record<string, any> {
		const exported: Record<string, any> = {};
		for (const [id, schema] of this.schemas.entries()) {
			exported[id] = schema;
		}
		return exported;
	}

	/**
   * Import schemas from a record
   */
	public import(schemas: Record<string, any>): void {
		for (const [id, schema] of Object.entries(schemas)) {
			// Validate that it looks like a schema node before registering
			if (schema && typeof schema === "object" && schema.category === "schema") {
				this.register(schema);
			}
		}
	}

	/**
   * Validate data node against its schema
   */
	public validateDataNode(node: any): ValidationResult {
		if (!node.schemaId) {
			return { valid: false, errors: ["Data node missing schemaId"] };
		}
		return this.validate(node.schemaId, node.properties);
	}

	/**
   * Get registry statistics
   */
	public getStatistics() {
		const schemas = this.getAll();
		return {
			totalSchemas: schemas.length,
			byType: schemas.reduce<Record<string, number>>((acc, schema) => {
				const type = schema.$type || "unknown";
				acc[type] = (acc[type] || 0) + 1;
				return acc;
			}, {}),
		};
	}

	public clear(): void {
		this.schemas.clear();
	}
}

// Global instance
export const schemaRegistry = SchemaNodeRegistry.getInstance();