/**
 * Client-side graph utilities (browser safe)

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