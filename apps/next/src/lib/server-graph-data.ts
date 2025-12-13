// Re-export from @hobby-ninja/data for type guards and utilities
export {
	isItem,
	isBrand,
	isCategory,
	isSeries,
	isManual,
	getNodeDisplayName,
	parseItem,
	parseBrand,
	parseCategory,
	parseSeries,
	parseManual,
	type Item,
	type Brand,
	type Category,
	type Series,
	type Manual,
	type Node,
} from "@hobby-ninja/data";

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
	getItemsBySeries,
	getItemsByBrand,
	getAllNodes,
	getNodeByIdAny,
	validateGraphData,
	graphData as staticGraphData,
	// Types
	type GradeData,
	type ScaleData,
	type GradesIndex,
	type EnrichedItem,
} from "./graph-data";