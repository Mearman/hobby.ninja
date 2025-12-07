/**
 * Graph Routes Generator
 *
 * Generates static routes for all graph nodes (brands, categories, items, manuals, series)
 * for TanStack Router SSG functionality.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export interface GraphNode {
  id: string;
  type: "brand" | "category" | "item" | "manual" | "series";
  name: {
    ja: string;
    en?: string;
  };
  data: Record<string, any>;
}

export interface GraphRoute {
  path: string;
  nodeType: string;
  nodeId: string;
}

/**
 * Scans the graph data directory and generates routes for all nodes
 */
export async function generateGraphRoutes(): Promise<string[]> {
	const graphDataPath = join(process.cwd(), "apps", "web", "public", "api", "graph");
	const routes: string[] = [];

	try {
		// Get all node types
		const nodeTypes = ["brands", "categories", "items", "manuals", "series"];

		for (const nodeType of nodeTypes) {
			const typePath = join(graphDataPath, nodeType);
			const files = await readdir(typePath);

			// Filter JSON files and convert to routes
			const jsonFiles = files.filter(file => file.endsWith(".json"));

			for (const file of jsonFiles) {
				const nodeId = file.replace(".json", "");
				// Convert plural to singular for URL paths
				const singularType = nodeType.slice(0, -1);
				routes.push(`/${singularType}/${nodeId}`);
			}
		}

		console.log(`Generated ${routes.length} routes from ${nodeTypes.length} node types`);
		return routes;
	} catch (error) {
		console.error("Error generating graph routes:", error);
		throw error;
	}
}

/**
 * Loads a specific graph node by type and ID
 */
export async function loadGraphNode(nodeType: string, nodeId: string): Promise<GraphNode | null> {
	const graphDataPath = join(process.cwd(), "apps", "web", "public", "api", "graph");

	try {
		// Convert singular back to plural for file path
		const pluralType = `${nodeType}s`;
		const filePath = join(graphDataPath, pluralType, `${nodeId}.json`);

		const fileContent = await readFile(filePath, "utf-8");
		const nodeData = JSON.parse(fileContent);

		return {
			id: nodeId,
			type: nodeType as GraphNode["type"],
			name: nodeData.name || { ja: nodeId },
			data: nodeData,
		};
	} catch (error) {
		console.error(`Error loading graph node ${nodeType}/${nodeId}:`, error);
		return null;
	}
}

/**
 * Gets related nodes for a given graph node
 */
export async function getRelatedNodes(node: GraphNode): Promise<GraphNode[]> {
	const relatedNodes: GraphNode[] = [];

	try {
		// Extract relationships from node data
		const edges = node.data.edges || [];

		for (const edge of edges) {
			if (edge.node?.type && edge.node.id) {
				const relatedNode = await loadGraphNode(edge.node.type, edge.node.id);
				if (relatedNode) {
					relatedNodes.push(relatedNode);
				}
			}
		}

		return relatedNodes;
	} catch (error) {
		console.error(`Error getting related nodes for ${node.type}/${node.id}:`, error);
		return [];
	}
}

/**
 * Validates that all generated routes have corresponding data files
 */
export async function validateRoutes(routes: string[]): Promise<{ valid: string[]; invalid: string[] }> {
	const valid: string[] = [];
	const invalid: string[] = [];

	for (const route of routes) {
		const [, nodeType, nodeId] = route.split("/");
		const node = await loadGraphNode(nodeType, nodeId);

		if (node) {
			valid.push(route);
		} else {
			invalid.push(route);
		}
	}

	console.log(`Route validation: ${valid.length} valid, ${invalid.length} invalid`);
	return { valid, invalid };
}

/**
 * Batch load nodes for performance optimization
 */
export async function batchLoadNodes(nodePairs: Array<{ type: string; id: string }>): Promise<GraphNode[]> {
	const nodes: GraphNode[] = [];

	// Load in batches to manage memory
	const batchSize = 50;

	for (let i = 0; i < nodePairs.length; i += batchSize) {
		const batch = nodePairs.slice(i, i + batchSize);
		const batchPromises = batch.map(({ type, id }) => loadGraphNode(type, id));
		const batchResults = await Promise.allSettled(batchPromises);

		for (const result of batchResults) {
			if (result.status === "fulfilled" && result.value) {
				nodes.push(result.value);
			}
		}

		// Allow garbage collection between batches
		if (globalThis.gc) {
			globalThis.gc();
		}
	}

	return nodes;
}