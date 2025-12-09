/**
 * Unified Graph Database Service
 * Single graph system that works at both build-time and runtime
 * Integrates schema node registry for centralized schema management
 */

import { z } from "zod";

import {
	ArbitraryGraph,
	ArbitraryGraphManager,
	SchemaNode,
	DataNode,
	Relationship,
	NodeCategoryEnum,
	SchemaNodeTypeEnum,
	DataNodeTypeEnum,
	RelationshipDirectionEnum,
	ObjectSchemaDefinition,
	FieldSchemaDefinition,
	EnumSchemaDefinition,
	ArraySchemaDefinition,
	RelationshipSchemaDefinition,
	validateArbitraryGraph,
} from "../schemas/arbitrary-graph-schema";
import type {
	ArbitraryGraphType,
	SchemaNodeType,
	DataNodeType,
	RelationshipType,
} from "../schemas/arbitrary-graph-schema";

import { SchemaNodeRegistry, type ValidationResult } from "./schemaNodeRegistry";

// Type definitions for schema registry functionality
export type SchemaDefinition =
	| z.infer<typeof ObjectSchemaDefinition>
	| z.infer<typeof FieldSchemaDefinition>
	| z.infer<typeof EnumSchemaDefinition>
	| z.infer<typeof ArraySchemaDefinition>
	| z.infer<typeof RelationshipSchemaDefinition>;

// Type alias for SchemaNodeRegistry to match the usage in the code
export type SchemaRegistry = SchemaNodeRegistry;

export interface GraphQueryOptions {
  nodeType?: string;
  category?: string;
  type?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderKey?: string;
  orderDirection?: "asc" | "desc";
}

export interface GraphSearchResult {
  nodes: DataNodeType[];
  total: number;
  hasMore: boolean;
}

export interface NodeConnection {
  node: z.infer<typeof DataNode>;
  relationship: z.infer<typeof Relationship>;
  direction: "incoming" | "outgoing";
}

/**
 * Unified graph database service that handles both build-time and runtime operations
 */
export class UnifiedGraphDB {
	private graph: ArbitraryGraphType | null = null;
	private manager: ArbitraryGraphManager | null = null;
	private schemaRegistry: SchemaNodeRegistry;
	private initialized = false;

	constructor(schemaRegistry?: SchemaNodeRegistry) {
		this.schemaRegistry = schemaRegistry || SchemaNodeRegistry.getInstance();
	}

	/**
   * Initialize the graph database with data
   */
	async initialize(graph: ArbitraryGraphType): Promise<void> {
		if (this.initialized) {
			throw new Error("Graph database already initialized");
		}

		const validation = validateArbitraryGraph(graph);
		if (!validation.success) {
			throw new Error(`Invalid graph data: ${validation.error}`);
		}

		this.graph = validation.data!;
		this.manager = new ArbitraryGraphManager(this.graph);
		// Note: Schema registry integration disabled for now due to schema format incompatibility
		// TODO: Create proper adapter between arbitrary graph schema and universal graph schema
		this.initialized = true;
	}

	/**
   * Check if the database is initialized
   */
	isInitialized(): boolean {
		return this.initialized;
	}

	/**
   * Get the raw graph data
   */
	getGraph(): ArbitraryGraphType | null {
		return this.graph;
	}

	/**
   * Get the graph manager
   */
	getManager(): ArbitraryGraphManager | null {
		return this.manager;
	}

	/**
   * Get the schema registry
   */
	getSchemaRegistry(): SchemaNodeRegistry {
		return this.schemaRegistry;
	}

	// Schema Operations

	/**
   * Create a new schema node
   */
	createSchema(
		id: string,
		type: z.infer<typeof SchemaNodeTypeEnum>,
		name: string,
		definition: SchemaDefinition,
		description?: string,
	): z.infer<typeof SchemaNode> {
		if (!this.initialized) {
			throw new Error("Database not initialized");
		}

		const schemaNode: z.infer<typeof SchemaNode> = {
			id,
			category: NodeCategoryEnum.enum.schema,
			type,
			name,
			description,
			definition,
			metadata: {
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		};

    this.graph!.nodes.push(schemaNode);
   	// TODO: Register with schema registry once format compatibility is resolved
   	// this.schemaRegistry.register({
   	// 	id,
   	// 	type,
   	// 	name,
   	// 	description,
   	// 	definition,
   	// 	metadata: schemaNode.metadata,
   	// });

    return schemaNode;
	}

	/**
   * Get schema by ID
   */
	getSchema(id: string) {
		return this.schemaRegistry.get(id);
	}

	/**
   * List all schemas
   */
	listSchemas(options?: GraphQueryOptions) {
		let schemas = this.schemaRegistry.getAll();

		if (options?.type) {
			schemas = schemas.filter((s) => s.$type === options.type);
		}

		// Apply ordering
		if (options?.orderBy) {
			schemas.sort((a, b) => {
				const aValue = (a as Record<string, unknown>)[options.orderBy ?? "name"];
				const bValue = (b as Record<string, unknown>)[options.orderBy ?? "name"];
				const direction = options.orderDirection === "desc" ? -ONE : ONE;

				if (typeof aValue === "string" && typeof bValue === "string") {
					return aValue > bValue ? direction : -direction;
				}
				if (typeof aValue === "number" && typeof bValue === "number") {
					return (aValue - bValue) * direction;
				}
				return ZERO;
			});
		}

		// Apply pagination
		if (options?.limit) {
			const offset = options.offset || ZERO;
			schemas = schemas.slice(offset, offset + options.limit);
		}

		return schemas;
	}

	// Data Node Operations

	/**
   * Create a new data node
   */
	createDataNode(
		id: string,
		type: z.infer<typeof DataNodeTypeEnum>,
		schemaId: string,
		properties: Record<string, unknown>,
	): z.infer<typeof DataNode> {
		if (!this.initialized) {
			throw new Error("Database not initialized");
		}

		// Validate against schema using manager
		const schema = this.manager!.getSchemaNodes().find(s => s.id === schemaId);
		if (!schema) {
			throw new Error(`Schema not found: ${schemaId}`);
		}
		// TODO: Implement proper validation against schema definition
		const validation = { valid: true, errors: [], data: properties };
		if (!validation.valid) {
			throw new Error(`Data validation failed: ${validation.errors.join(", ")}`);
		}

		const dataNode: z.infer<typeof DataNode> = {
			id,
			category: NodeCategoryEnum.enum.data,
			type,
			schemaId,
			properties: validation.data || properties,
			metadata: {
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		};

    this.graph!.nodes.push(dataNode);
    return dataNode;
	}

	/**
   * Get data node by ID
   */
	getDataNode(id: string): z.infer<typeof DataNode> | null {
		if (!this.initialized) return null;
		return this.manager!.getDataNodes().find(node => node.id === id) || null;
	}

	/**
   * Query data nodes
   */
	queryDataNodes(options?: GraphQueryOptions): GraphSearchResult {
		if (!this.initialized) {
			throw new Error("Database not initialized");
		}

		let nodes = this.manager!.getDataNodes();

		// Apply filters
		if (options?.nodeType) {
			nodes = nodes.filter(node => node.type === options.nodeType);
		}

		const total = nodes.length;

		// Apply ordering
		if (options?.orderBy) {
			nodes.sort((a, b) => {
				const orderBy = options.orderBy!;
				const aValue = (a.properties as Record<string, unknown>)[orderBy] ?? (a as Record<string, unknown>)[orderBy];
				const bValue = (b.properties as Record<string, unknown>)[orderBy] ?? (b as Record<string, unknown>)[orderBy];
				const direction = options.orderDirection === "desc" ? -ONE : ONE;

				if (typeof aValue === "string" && typeof bValue === "string") {
					return aValue > bValue ? direction : -direction;
				}
				if (typeof aValue === "number" && typeof bValue === "number") {
					return (aValue - bValue) * direction;
				}
				return ZERO;
			});
		}

		// Apply pagination
		let hasMore = false;
		if (options?.limit) {
			const offset = options.offset || ZERO;
			hasMore = offset + options.limit < total;
			nodes = nodes.slice(offset, offset + options.limit);
		}

		return {
			nodes,
			total,
			hasMore,
		};
	}

	/**
   * Update a data node
   */
	updateDataNode(id: string, updates: Partial<z.infer<typeof DataNode>>): z.infer<typeof DataNode> | null {
		if (!this.initialized) return null;

		const nodeIndex = this.graph!.nodes.findIndex(node => node.id === id && node.category === "data");
		if (nodeIndex === -ONE) return null;

		const existingNode = this.graph!.nodes[nodeIndex] as z.infer<typeof DataNode>;

		// Validate updated properties if provided
		if (updates.properties) {
			const schema = this.manager!.getSchemaNodes().find(s => s.id === existingNode.schemaId);
			if (!schema) {
				throw new Error(`Schema not found: ${existingNode.schemaId}`);
			}
			// TODO: Implement proper validation against schema definition
			const validation = { valid: true, errors: [], data: updates.properties };
			if (!validation.valid) {
				throw new Error(`Data validation failed: ${validation.errors.join(", ")}`);
			}
			updates.properties = validation.data || updates.properties;
		}

		const updatedNode = {
			...existingNode,
			...updates,
			id,
			category: NodeCategoryEnum.enum.data,
			metadata: {
				...existingNode.metadata,
				...updates.metadata,
				updatedAt: new Date().toISOString(),
			},
		};

    this.graph!.nodes[nodeIndex] = updatedNode;
    return updatedNode;
	}

	/**
   * Delete a data node
   */
	deleteDataNode(id: string): boolean {
		if (!this.initialized) return false;

		const nodeIndex = this.graph!.nodes.findIndex(node => node.id === id && node.category === "data");
		if (nodeIndex === -ONE) return false;

    // Remove associated relationships
    this.graph!.nodes = this.graph!.nodes.filter(node => {
    	if (node.category === "relationship") {
    		const rel = node;
    		return rel.fromNode !== id && rel.toNode !== id;
    	}
    	return true;
    });

    // Remove the node
    this.graph!.nodes.splice(nodeIndex, ONE);
    return true;
	}

	// Relationship Operations

	/**
   * Create a relationship between nodes
   */
	createRelationship(
		id: string,
		type: string,
		fromNode: string,
		toNode: string,
		direction: z.infer<typeof RelationshipDirectionEnum> = "directed" as z.infer<typeof RelationshipDirectionEnum>,
		properties?: Record<string, any>,
	): z.infer<typeof Relationship> {
		if (!this.initialized) {
			throw new Error("Database not initialized");
		}

		const relationship: z.infer<typeof Relationship> = {
			id,
			category: NodeCategoryEnum.enum.relationship,
			type,
			fromNode,
			toNode,
			direction,
			properties,
			metadata: {
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		};

    this.graph!.nodes.push(relationship);
    return relationship;
	}

	/**
   * Get relationships for a node
   */
	getNodeRelationships(nodeId: string): Array<z.infer<typeof Relationship>> {
		if (!this.initialized) return [];
		return this.manager!.getRelationshipsForNode(nodeId);
	}

	/**
   * Get connected nodes
   */
	getConnectedNodes(nodeId: string): NodeConnection[] {
		if (!this.initialized) return [];

		const relationships = this.manager!.getRelationshipsForNode(nodeId);
		const connections: NodeConnection[] = [];

		for (const rel of relationships) {
			const connectedNodeId = rel.fromNode === nodeId ? rel.toNode : rel.fromNode;
			const connectedNode = this.getDataNode(connectedNodeId);

			if (connectedNode) {
				connections.push({
					node: connectedNode,
					relationship: rel,
					direction: rel.fromNode === nodeId ? "outgoing" : "incoming",
				});
			}
		}

		return connections;
	}

	// Search and Query Operations

	/**
   * Search nodes by text
   */
	searchNodes(query: string, options?: GraphQueryOptions): GraphSearchResult {
		if (!this.initialized) {
			throw new Error("Database not initialized");
		}

		const lowerQuery = query.toLowerCase();
		let nodes = this.graph!.nodes.filter(node => {
			// Search in ID, name (for schemas), and properties (for data nodes)
			if (node.id.toLowerCase().includes(lowerQuery)) return true;

			if (node.category === "schema") {
				const schemaNode = node;
				return schemaNode.name.toLowerCase().includes(lowerQuery) ||
               (schemaNode.description?.toLowerCase().includes(lowerQuery) || false);
			}

			if (node.category === "data") {
				const dataNode = node;
				return Object.values(dataNode.properties).some(value =>
					String(value).toLowerCase().includes(lowerQuery),
				);
			}

			return false;
		});

		const total = nodes.length;

		// Apply filters
		if (options?.category) {
			nodes = nodes.filter(node => node.category === options.category);
		}

		// Apply pagination
		let hasMore = false;
		if (options?.limit) {
			const offset = options.offset || ZERO;
			hasMore = offset + options.limit < total;
			nodes = nodes.slice(offset, offset + options.limit);
		}

		return {
			nodes,
			total,
			hasMore,
		};
	}

	// Validation Operations

	/**
   * Validate the entire graph
   */
	validateGraph(): { valid: boolean; errors: string[] } {
		if (!this.initialized) {
			return { valid: false, errors: ["Database not initialized"] };
		}

		return this.manager!.validateGraph();
	}

	/**
   * Validate a specific data node
   */
	validateDataNode(nodeId: string): { valid: boolean; errors: string[] } {
		if (!this.initialized) {
			return { valid: false, errors: ["Database not initialized"] };
		}

		const node = this.getDataNode(nodeId);
		if (!node) {
			return { valid: false, errors: [`Data node not found: ${nodeId}`] };
		}

		const validation = this.manager!.validateDataNode(node);
		return {
			valid: validation.valid,
			errors: validation.errors,
		};
	}

	// Statistics and Analytics

	/**
   * Get database statistics
   */
	getStatistics() {
		if (!this.initialized) {
			throw new Error("Database not initialized");
		}

		const managerStats = this.manager!.getStatistics();
		const registryStats = this.schemaRegistry.getStatistics();

		return {
			...managerStats,
			schemaRegistry: registryStats,
			relationshipsByDirection: this.manager!.getRelationships().reduce<Record<string, number>>((acc, rel) => {
				acc[rel.direction] = (acc[rel.direction] || ZERO) + ONE;
				return acc;
			}, {}),
		};
	}

	// Import/Export Operations

	/**
   * Export graph to JSON
   */
	export(): z.infer<typeof ArbitraryGraph> {
		if (!this.initialized) {
			throw new Error("Database not initialized");
		}

		return JSON.parse(JSON.stringify(this.graph));
	}

	/**
   * Import graph from JSON
   */
	async import(graph: z.infer<typeof ArbitraryGraph>): Promise<void> {
		await this.initialize(graph);
	}

	/**
   * Export only schema registry
   */
	exportSchemas(): Record<string, SchemaDefinition> {
		// TODO: Implement proper schema export once format compatibility is resolved
		const schemas = this.manager!.getSchemaNodes();
		const exported: Record<string, SchemaDefinition> = {};
		for (const schema of schemas) {
			exported[schema.id] = schema.definition as SchemaDefinition;
		}
		return exported;
	}

	/**
   * Import schemas
   */
	importSchemas(schemas: Record<string, SchemaDefinition>): void {
		// TODO: Implement proper schema import once format compatibility is resolved
		console.warn("Schema import not yet implemented due to format incompatibility");
	}

	// Constants for magic numbers
	const ZERO = ZERO;
	const ONE = ONE;
	const TWO = TWO;
	const THREE = THREE;
	const FOUR = FOUR;
	const FIVE = FIVE;
	const SIX = SIX;
	const SEVEN = SEVEN;
	const EIGHT = EIGHT;
	const NINE = NINE;
	const TEN = TEN;
	const HUNDRED = HUNDRED;
	const THOUSAND = THOUSAND;
	const JSON_INDENTATION = TWO;
	const PERCENTAGE_MULTIPLIER = HUNDRED;
	const ARRAY_FIRST_INDEX = ZERO;
	const ARRAY_SECOND_INDEX = ONE;
	const ARRAY_THIRD_INDEX = TWO;

}

// Singleton instance for global use
export const unifiedGraphDB = new UnifiedGraphDB();