/**
 * Graph-based hobby configuration service
 * Loads and manages the graph-based hobby configuration using HobbyGraphManager
 */

import {
	HobbyGraph,

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

	HobbyGraphType,
	HobbyGraphManager,
	NodeTypeEnum,
	RelationshipType,
	GraphNodeType,
	GraphNodeTypeType,
	GraphRelationshipType,
	GraphRelationshipTypeType,
	validateHobbyGraph,
} from "../schemas/hobby-schema";

export interface HobbyType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  fields: FieldConfig[];
  settings: {
    allowCustomFields: boolean;
    allowImportExport: boolean;
    defaultSort: string;
    defaultView: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FieldConfig {
  id: string;
  name: string;
  key: string;
  type: "text" | "select" | "multiselect" | "number" | "currency" | "date" | "boolean" | "url" | "textarea";
  required?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  displayInList?: boolean;
  displayInDetail?: boolean;
  order?: number;
  options?: Array<{ label: string; value: string }>;
  description?: string;
}

export interface HobbyTypeStats {
  totalCollections: number;
  totalItems: number;
  recentItems: number;
}

export interface GraphSearchResult {
  node: GraphNodeTypeType;
  relationships: GraphRelationshipTypeType[];
  connectedNodes: GraphNodeTypeType[];
}

// Constants
const CACHE_DURATION_MINUTES = FIVE;
const CACHE_DURATION_MS = CACHE_DURATION_MINUTES * 60 * THOUSAND;
const MAX_SEARCH_RESULTS = TEN;

export class HobbyGraphService {
	private cache = new Map<string, HobbyType[]>();
	private graphCache: HobbyGraphType | null = null;
	private manager: HobbyGraphManager | null = null;
	private lastFetch = ZERO;
	private readonly CACHE_DURATION = CACHE_DURATION_MS;

	/**
   * Load and parse the hobby graph configuration
   */
	async loadHobbyGraph(): Promise<HobbyGraphType> {
		if (this.graphCache) {
			return this.graphCache;
		}

		try {
			const response = await fetch("/data/config/hobby-graph.json");
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const graphData = await response.json();

			// Validate the graph data
			const validationResult = validateHobbyGraph(graphData);
			if (!validationResult.success) {
				throw new Error(`Invalid graph data: ${validationResult.error}`);
			}

			// Extract validated data from the validation result
			const validatedGraphData = (validationResult as { data?: HobbyGraphType }).data || graphData;
			this.graphCache = validatedGraphData;
			this.manager = new HobbyGraphManager(validatedGraphData);

			return validatedGraphData;
		} catch (error) {
			console.error("Failed to load hobby graph:", error);
			throw error;
		}
	}

	/**
   * Get all hobby types from the graph
   */
	async getHobbyTypes(): Promise<HobbyType[]> {
		const now = Date.now();

		// Return cached data if still valid
		if (this.cache.has("all") && now - this.lastFetch < this.CACHE_DURATION) {
			return this.cache.get("all")!;
		}

		try {
			const graph = await this.loadHobbyGraph();
			if (!this.manager) {
				throw new Error("Graph manager not initialized");
			}

			// Get hobby type nodes
			const hobbyTypeNodes = this.manager.getNodesByType(NodeTypeEnum.enum.hobby_type);

			// Convert to HobbyType format
			const hobbyTypes = await Promise.all(
				hobbyTypeNodes.map(node => this.convertGraphToHobbyType(node, this.manager!)),
			);

			// Sort by name
			hobbyTypes.sort((a, b) => a.name.localeCompare(b.name));

			// Cache the result
			this.cache.set("all", hobbyTypes);
			this.lastFetch = now;

			return hobbyTypes;
		} catch (error) {
			console.error("Failed to load hobby types:", error);
			return this.getFallbackHobbyTypes();
		}
	}

	/**
   * Get hobby type by ID
   */
	async getHobbyType(id: string): Promise<HobbyType | null> {
		const hobbyTypes = await this.getHobbyTypes();
		return hobbyTypes.find(ht => ht.id === id) || null;
	}

	/**
   * Get detailed information about a hobby type including all relationships
   */
	async getHobbyTypeWithDetails(id: string): Promise<{
    hobbyType: HobbyType;
    brands: GraphNodeTypeType[];
    scales: GraphNodeTypeType[];
    categories: GraphNodeTypeType[];
    fields: GraphNodeTypeType[];
  } | null> {
		try {
			const graph = await this.loadHobbyGraph();
			if (!this.manager) {
				throw new Error("Graph manager not initialized");
			}

			const hobbyNodeId = `hobby_${id}`;
			const details = this.manager.getHobbyTypeWithDetails(hobbyNodeId);

			if (!details) {
				return null;
			}

			const hobbyType = await this.convertGraphToHobbyType(details.node, this.manager);

			return {
				hobbyType,
				brands: details.brands,
				scales: details.scales,
				categories: details.categories,
				fields: details.fields,
			};
		} catch (error) {
			console.error(`Failed to get hobby type details for ${id}:`, error);
			return null;
		}
	}

	/**
   * Get brands for a specific hobby type
   */
	async getHobbyTypeBrands(hobbyTypeId: string): Promise<string[]> {
		try {
			const details = await this.getHobbyTypeWithDetails(hobbyTypeId);
			if (!details) {
				return [];
			}

			return details.brands
				.map(brand => brand.properties?.["name"] as string)
				.filter(Boolean);
		} catch (error) {
			console.error(`Failed to get brands for hobby type ${hobbyTypeId}:`, error);
			return [];
		}
	}

	/**
   * Get scales for a specific hobby type
   */
	async getHobbyTypeScales(hobbyTypeId: string): Promise<string[]> {
		try {
			const details = await this.getHobbyTypeWithDetails(hobbyTypeId);
			if (!details) {
				return [];
			}

			return details.scales
				.map(scale => scale.properties?.["name"] as string)
				.filter(Boolean);
		} catch (error) {
			console.error(`Failed to get scales for hobby type ${hobbyTypeId}:`, error);
			return [];
		}
	}

	/**
   * Get field configurations for a specific hobby type
   */
	async getHobbyTypeFields(hobbyTypeId: string): Promise<FieldConfig[]> {
		try {
			const details = await this.getHobbyTypeWithDetails(hobbyTypeId);
			if (!details) {
				return [];
			}

			return details.fields
				.filter(field => field.type === "field")
				.map(field => this.convertGraphNodeToField(field));
		} catch (error) {
			console.error(`Failed to get fields for hobby type ${hobbyTypeId}:`, error);
			return [];
		}
	}

	/**
   * Search the graph for nodes and relationships
   */
	async searchGraph(query: string, nodeType?: typeof NodeTypeEnum): Promise<GraphSearchResult[]> {
		try {
			const graph = await this.loadHobbyGraph();
			if (!this.manager) {
				throw new Error("Graph manager not initialized");
			}

			// Simple text search across node names and properties
			const allNodes = nodeType
				? this.manager.getNodesByType(nodeType as keyof typeof NodeTypeEnum)
				: graph.nodes;

			const matchingNodes = allNodes.filter((node: GraphNodeTypeType) => {
				const name = node.properties?.name as string || "";
				const description = node.properties?.description as string || "";

				return name.toLowerCase().includes(query.toLowerCase()) ||
               description.toLowerCase().includes(query.toLowerCase());
			});

			// Get relationships and connected nodes for each match
			const results: GraphSearchResult[] = [];
			for (const node of matchingNodes) {
				const relationships = [
					...this.manager.getRelationshipsFrom(node.id),
					...this.manager.getRelationshipsTo(node.id),
				];

				const connectedNodes = relationships
					.map(rel => graph.nodes.find((n: GraphNodeTypeType) => n.id === rel.fromNode || n.id === rel.toNode))
					.filter((n): n is GraphNodeTypeType => n !== undefined && n.id !== node.id)
					.slice(ARRAY_FIRST_INDEX, MAX_SEARCH_RESULTS); // Limit to prevent excessive results

				results.push({
					node,
					relationships,
					connectedNodes,
				});
			}

			return results;
		} catch (error) {
			console.error("Failed to search graph:", error);
			return [];
		}
	}

	/**
   * Get all brands across all hobby types
   */
	async getAllBrands(): Promise<GraphNodeTypeType[]> {
		try {
			const graph = await this.loadHobbyGraph();
			return graph.nodes.filter((node: GraphNodeTypeType) => node.type === "brand");
		} catch (error) {
			console.error("Failed to get all brands:", error);
			return [];
		}
	}

	/**
   * Get all scales across all hobby types
   */
	async getAllScales(): Promise<GraphNodeTypeType[]> {
		try {
			const graph = await this.loadHobbyGraph();
			return graph.nodes.filter((node: GraphNodeTypeType) => node.type === "scale");
		} catch (error) {
			console.error("Failed to get all scales:", error);
			return [];
		}
	}

	/**
   * Validate the graph integrity
   */
	async validateGraph(): Promise<{ valid: boolean; errors: string[] }> {
		try {
			const graph = await this.loadHobbyGraph();
			if (!this.manager) {
				throw new Error("Graph manager not initialized");
			}

			return this.manager.validateRelationships();
		} catch (error) {
			console.error("Failed to validate graph:", error);
			return { valid: false, errors: [error instanceof Error ? error.message : "Unknown error"] };
		}
	}

	/**
   * Get statistics for a hobby type (for compatibility with existing code)
   */
	async getHobbyTypeStats(hobbyTypeId: string): Promise<HobbyTypeStats> {
		try {
			// For now, return placeholder data
			// In future, this could make API calls to actual data endpoints
			switch (hobbyTypeId) {
				case "model_kits": {
					return { totalCollections: ONE, totalItems: 5966, recentItems: 45 };
				}
				case "trading_cards": {
					return { totalCollections: ZERO, totalItems: ZERO, recentItems: ZERO };
				}
				case "action_figures": {
					return { totalCollections: ZERO, totalItems: ZERO, recentItems: ZERO };
				}
				case "miniatures": {
					return { totalCollections: ZERO, totalItems: ZERO, recentItems: ZERO };
				}
				default: {
					return { totalCollections: ZERO, totalItems: ZERO, recentItems: ZERO };
				}
			}
		} catch (error) {
			console.error(`Failed to get stats for hobby type ${hobbyTypeId}:`, error);
			return {
				totalCollections: ZERO,
				totalItems: ZERO,
				recentItems: ZERO,
			};
		}
	}

	// Private helper methods

	private async convertGraphToHobbyType(node: GraphNodeTypeType, manager: HobbyGraphManager): Promise<HobbyType> {
		const properties = node.properties || {};

		// Get fields for this hobby type
		const fieldNodes = manager.getConnectedNodes(node.id, RelationshipType.enum.HAS_FIELD);
		const fields = fieldNodes
			.filter(fieldNode => fieldNode.type === "field")
			.map(fieldNode => this.convertGraphNodeToField(fieldNode));

		// Safely extract properties with proper type casting
		const name = typeof properties["name"] === "string" ? properties["name"] : "Unknown";
		const description = typeof properties["description"] === "string" ? properties["description"] : "";
		const icon = typeof properties["icon"] === "string" ? properties["icon"] : "📦";
		const color = typeof properties["color"] === "string" ? properties["color"] : "gray";
		const isActive = typeof properties["isActive"] === "boolean" ? properties["isActive"] : true;
		const createdAt = typeof properties["createdAt"] === "string" ? properties["createdAt"] : new Date().toISOString();
		const updatedAt = typeof properties["updatedAt"] === "string" ? properties["updatedAt"] : new Date().toISOString();

		return {
			id: node.id.replace("hobby_", ""),
			name,
			description,
			icon,
			color,
			category: this.inferCategory(node.id),
			fields,
			settings: {
				allowCustomFields: true,
				allowImportExport: true,
				defaultSort: "name",
				defaultView: "grid",
			},
			isActive,
			createdAt,
			updatedAt,
		};
	}

	private convertGraphNodeToField(fieldNode: GraphNodeTypeType): FieldConfig {
		const properties = fieldNode.properties || {};

		// Safely extract properties with proper type casting
		const name = typeof properties["name"] === "string" ? properties["name"] : "Unknown";
		const fieldType = typeof properties["fieldType"] === "string" ? properties["fieldType"] : "text";
		const required = typeof properties["required"] === "boolean" ? properties["required"] : false;
		const searchable = typeof properties["searchable"] === "boolean" ? properties["searchable"] : false;
		const filterable = typeof properties["filterable"] === "boolean" ? properties["filterable"] : false;
		const displayInList = typeof properties["displayInList"] === "boolean" ? properties["displayInList"] : true;
		const displayInDetail = typeof properties["displayInDetail"] === "boolean" ? properties["displayInDetail"] : true;
		const order = typeof properties["order"] === "number" ? properties["order"] : ZERO;
		const description = typeof properties["description"] === "string" ? properties["description"] : undefined;

		return {
			id: fieldNode.id,
			name,
			key: fieldNode.id,
			type: fieldType as FieldConfig["type"],
			required,
			searchable,
			filterable,
			displayInList,
			displayInDetail,
			order,
			description,
		};
	}

	private inferCategory(hobbyNodeId: string): string {
		if (hobbyNodeId.includes("model_kits")) {
			return "modeling";
		}
		if (hobbyNodeId.includes("cards")) {
			return "cards";
		}
		if (hobbyNodeId.includes("figure") || hobbyNodeId.includes("miniature")) {
			return "figures";
		}
		return "other";
	}

	private getFallbackHobbyTypes(): HobbyType[] {
		// Return minimal fallback hobby types if everything fails
		return [
			{
				id: "other",
				name: "Other",
				icon: "📦",
				description: "Custom hobby collections",
				category: "other",
				color: "gray",
				fields: [
					{
						id: "name",
						name: "Name",
						key: "name",
						type: "text",
						required: true,
						searchable: true,
						filterable: false,
						displayInList: true,
						displayInDetail: true,
						order: ONE,
					},
				],
				settings: {
					allowCustomFields: true,
					allowImportExport: true,
					defaultSort: "name",
					defaultView: "grid",
				},
				isActive: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		];
	}

	/**
   * Clear all caches
   */
	clearCache(): void {
		this.cache.clear();
		this.graphCache = null;
		this.manager = null;
		this.lastFetch = ZERO;
	}
}

// Export singleton instance
export const hobbyGraphService = new HobbyGraphService();