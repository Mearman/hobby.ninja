import {
	BaseNode,
	GraphNode,
	ItemNode,
	BrandNode,
	CategoryNode,
	SeriesNode,
	ManualNode,
	isItemNode,
	isBrandNode,
	isCategoryNode,
	isSeriesNode,
	isManualNode,
	parseNode,
	getNodeDisplayName,
	ItemNodeSchema,
	BrandNodeSchema,
	CategoryNodeSchema,
	SeriesNodeSchema,
	ManualNodeSchema,
} from "./schemas";

// Re-export from the main graph-data module
// Since we're now using static imports for both server and client,
// server-graph-data just re-exports the same functions
export {
	getAllItems,
	getAllBrands,
	getAllCategories,
	getAllSeries,
	getAllManuals,
	getItemById,
	getBrandById,
	getCategoryById,
	getSeriesById,
	getManualById,
	getItemsByCategory,
	getAllNodes,
	getNodesByType,
	getNodeByIdAny,
	validateGraphData,
	graphData as staticGraphData,
} from "./graph-data";

// Re-export types for compatibility
export type {
	ItemNode,
	BrandNode,
	CategoryNode,
	SeriesNode,
	ManualNode,
	GraphNode,
	BaseNode,
} from "./schemas";