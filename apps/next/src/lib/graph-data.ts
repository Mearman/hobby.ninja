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

// Static data imports for build-time embedding
// This replaces runtime fetching with build-time imports
import itemsData from '../data/items.json';
import brandsData from '../data/brands.json';
import categoriesData from '../data/categories.json';
import seriesData from '../data/series.json';
import manualsData from '../data/manuals.json';

// Type guard for the new JSON structure
function isGraphDataFile(data: unknown): data is { nodes: unknown[]; edges: Record<string, Record<string, never>> } {
	return (
		typeof data === 'object' && data !== null &&
		'nodes' in data && Array.isArray((data as any).nodes) &&
		'edges' in data && typeof (data as any).edges === 'object'
	);
}

// Parse and validate the imported data
function parseJSONData<T>(schema: any, data: unknown): T[] {
	if (!isGraphDataFile(data)) {
		console.error('Invalid data file format: expected {nodes: [], edges: {}}');
		return [];
	}

	return data.nodes.filter(item => {
		const result = schema.safeParse(item);
		return result.success;
	}).map(item => {
		const result = schema.safeParse(item);
		return result.success ? result.data : null;
	}).filter((item): item is T => item !== null);
}

// Pre-validated data loaded at build time
const parsedItems = parseJSONData<ItemNode>(ItemNodeSchema, itemsData);
const parsedBrands = parseJSONData<BrandNode>(BrandNodeSchema, brandsData);
const parsedCategories = parseJSONData<CategoryNode>(CategoryNodeSchema, categoriesData);
const parsedSeries = parseJSONData<SeriesNode>(SeriesNodeSchema, seriesData);
const parsedManuals = parseJSONData<ManualNode>(ManualNodeSchema, manualsData);

// Cache for loaded data (synchronous since data is pre-built)
const staticData = {
	items: parsedItems,
	brands: parsedBrands,
	categories: parsedCategories,
	series: parsedSeries,
	manuals: parsedManuals,
};

console.log('Loaded static graph data:', {
	items: staticData.items.length,
	brands: staticData.brands.length,
	categories: staticData.categories.length,
	series: staticData.series.length,
});

// Sort data by display name
const sortByName = <T extends BaseNode>(a: T, b: T): number => {
	const nameA = getNodeDisplayName(a);
	const nameB = getNodeDisplayName(b);
	return nameA.localeCompare(nameB);
};

// Export synchronous functions that return pre-validated data
export function getAllItems(): ItemNode[] {
	return [...staticData.items].sort(sortByName);
}

export function getAllBrands(): BrandNode[] {
	return [...staticData.brands].sort(sortByName);
}

export function getAllCategories(): CategoryNode[] {
	return [...staticData.categories].sort(sortByName);
}

export function getAllSeries(): SeriesNode[] {
	return [...staticData.series].sort(sortByName);
}

export function getAllManuals(): ManualNode[] {
	return [...staticData.manuals].sort(sortByName);
}

// Get specific node by ID with type safety (synchronous)
export function getItemById(id: string): ItemNode | null {
	return staticData.items.find(item => item.id === id) ?? null;
}

export function getBrandById(id: string): BrandNode | null {
	return staticData.brands.find(brand => brand.id === id) ?? null;
}

export function getCategoryById(id: string): CategoryNode | null {
	return staticData.categories.find(category => category.id === id) ?? null;
}

export function getSeriesById(id: string): SeriesNode | null {
	return staticData.series.find(s => s.id === id) ?? null;
}

export function getManualById(id: string): ManualNode | null {
	return staticData.manuals.find(manual => manual.id === id) ?? null;
}

// Get all nodes combined
export function getAllNodes(): GraphNode[] {
	return [...staticData.items, ...staticData.brands, ...staticData.categories, ...staticData.series, ...staticData.manuals];
}

// Get nodes by type
export function getNodesByType<T extends GraphNode>(
	type: string,
	typeGuard: (data: unknown) => data is T,
): T[] {
	const allNodes = getAllNodes();
	return allNodes.filter((node): node is T => node.type === type && typeGuard(node));
}

// Get node by any type
export function getNodeByIdAny(id: string): GraphNode | null {
	return (
		staticData.items.find(item => item.id === id) ??
		staticData.brands.find(brand => brand.id === id) ??
		staticData.categories.find(category => category.id === id) ??
		staticData.series.find(s => s.id === id) ??
		staticData.manuals.find(manual => manual.id === id) ??
		null
	);
}

// Validate that required data is available (synchronous)
export function validateGraphData(): boolean {
	// Return true if data was successfully loaded and validated
	return staticData.items.length > 0 && staticData.brands.length > 0 && staticData.categories.length > 0 && staticData.series.length > 0;
}

// Export the static data for direct access in other modules
export { staticData as graphData };