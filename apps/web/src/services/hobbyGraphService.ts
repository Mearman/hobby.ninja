/**
 * Graph-based hobby configuration service
 * Loads and manages the graph-based hobby configuration using HobbyGraphManager
 */

import {
	HobbyGraph,
	HobbyGraphManager,
	NodeTypeEnum,
	RelationshipTypeEnum,
	GraphNodeType,
	GraphRelationshipType,
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
  node: GraphNodeType;
  relationships: GraphRelationshipType[];
  connectedNodes: GraphNodeType[];
}

export class HobbyGraphService {
	private cache = new Map<string, HobbyType[]>();
	private graphCache: HobbyGraph | null = null;
	private manager: HobbyGraphManager | null = null;
	private lastFetch = 0;
	private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

	/**
   * Load and parse the hobby graph configuration
   */
	async loadHobbyGraph(): Promise<HobbyGraph> {
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

			this.graphCache = validationResult.data;
			this.manager = new HobbyGraphManager(validationResult.data);

			return validationResult.data;
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
    brands: GraphNodeType[];
    scales: GraphNodeType[];
    categories: GraphNodeType[];
    fields: GraphNodeType[];
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
				.map(brand => brand.properties.name as string)
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
				.map(scale => scale.properties.name as string)
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
	async searchGraph(query: string, nodeType?: NodeTypeEnum): Promise<GraphSearchResult[]> {
		try {
			const graph = await this.loadHobbyGraph();
			if (!this.manager) {
				throw new Error("Graph manager not initialized");
			}

			// Simple text search across node names and properties
			const allNodes = nodeType
				? this.manager.getNodesByType(nodeType)
				: graph.nodes;

			const matchingNodes = allNodes.filter(node => {
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
					.map(rel => graph.nodes.find(n => n.id === rel.fromNode || n.id === rel.toNode))
					.filter((n): n is GraphNodeType => n !== undefined && n.id !== node.id)
					.slice(0, 10); // Limit to prevent excessive results

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
	async getAllBrands(): Promise<GraphNodeType[]> {
		try {
			const graph = await this.loadHobbyGraph();
			return graph.nodes.filter(node => node.type === "brand");
		} catch (error) {
			console.error("Failed to get all brands:", error);
			return [];
		}
	}

	/**
   * Get all scales across all hobby types
   */
	async getAllScales(): Promise<GraphNodeType[]> {
		try {
			const graph = await this.loadHobbyGraph();
			return graph.nodes.filter(node => node.type === "scale");
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
					return { totalCollections: 1, totalItems: 5966, recentItems: 45 };
				}
				case "trading_cards": {
					return { totalCollections: 0, totalItems: 0, recentItems: 0 };
				}
				case "action_figures": {
					return { totalCollections: 0, totalItems: 0, recentItems: 0 };
				}
				case "miniatures": {
					return { totalCollections: 0, totalItems: 0, recentItems: 0 };
				}
				default: {
					return { totalCollections: 0, totalItems: 0, recentItems: 0 };
				}
			}
		} catch (error) {
			console.error(`Failed to get stats for hobby type ${hobbyTypeId}:`, error);
			return {
				totalCollections: 0,
				totalItems: 0,
				recentItems: 0,
			};
		}
	}

	// Private helper methods

	private async convertGraphToHobbyType(node: GraphNodeType, manager: HobbyGraphManager): Promise<HobbyType> {
		const properties = node.properties || {};

		// Get fields for this hobby type
		const fieldNodes = manager.getConnectedNodes(node.id, RelationshipTypeEnum.enum.HAS_FIELD);
		const fields = fieldNodes
			.filter(fieldNode => fieldNode.type === "field")
			.map(fieldNode => this.convertGraphNodeToField(fieldNode));

		return {
			id: node.id.replace("hobby_", ""),
			name: properties.name || "Unknown",
			description: properties.description || "",
			icon: properties.icon || "📦",
			color: properties.color || "gray",
			category: this.inferCategory(node.id),
			fields,
			settings: {
				allowCustomFields: true,
				allowImportExport: true,
				defaultSort: "name",
				defaultView: "grid",
			},
			isActive: properties.isActive !== false,
			createdAt: properties.createdAt || new Date().toISOString(),
			updatedAt: properties.updatedAt || new Date().toISOString(),
		};
	}

	private convertGraphNodeToField(fieldNode: GraphNodeType): FieldConfig {
		const properties = fieldNode.properties || {};

		return {
			id: fieldNode.id,
			name: properties.name || "Unknown",
			key: fieldNode.id,
			type: properties.fieldType || "text",
			required: properties.required || false,
			searchable: properties.searchable || false,
			filterable: properties.filterable || false,
			displayInList: properties.displayInList !== false,
			displayInDetail: properties.displayInDetail !== false,
			order: properties.order || 0,
			description: properties.description,
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
						order: 1,
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
		this.lastFetch = 0;
	}
}

// Export singleton instance
export const hobbyGraphService = new HobbyGraphService();