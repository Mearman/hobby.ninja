/**
 * Client-side graph utilities (browser safe)
 *
 * These provide the same interface as the SSG utilities but work in the browser
 */

export interface GraphNode {
  id: string;
  type: string;
  name: {
    en?: string;
    ja?: string;
  };
  data: Record<string, unknown>;
  properties: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface GraphNodeDetails {
  data: Record<string, unknown>;
  relatedNodes: GraphNode[];
  breadcrumbs: Array<{ id: string; name: string; type: string }>;
}

/**
 * Client-side function to get graph node details
 * In a real implementation, this would fetch from IndexedDB or an API
 */
export async function getGraphNodeDetails(nodeType: string, nodeId: string): Promise<GraphNodeDetails | null> {
	try {
		// For now, return a placeholder implementation
		// In production, this would query IndexedDB or make API calls
		return {
			data: {
				id: nodeId,
				type: nodeType,
				name: { en: nodeId, ja: nodeId },
				properties: {},
			},
			relatedNodes: [],
			breadcrumbs: [
				{ id: nodeType, name: nodeType, type: nodeType },
				{ id: nodeId, name: nodeId, type: nodeType },
			],
		};
	} catch (error) {
		console.error(`Failed to load graph node details for ${nodeType}/${nodeId}:`, error);
		return null;
	}
}

/**
 * Generate static paths for known node types
 * This is a subset of the full SSG functionality for client-side use
 */
export function getStaticNodeTypes(): string[] {
	return ["brands", "categories", "items", "manuals", "series"];
}

/**
 * Check if a route corresponds to a static graph node
 */
export function isStaticGraphNodeRoute(path: string): boolean {
	const nodeTypes = getStaticNodeTypes();
	return nodeTypes.some(type => path.startsWith(`/${type}/`));
}