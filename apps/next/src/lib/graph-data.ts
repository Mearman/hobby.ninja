
// Static data imports for build-time embedding
// This replaces runtime fetching with build-time imports
import brandsData from "../data/brands.json";
import categoriesData from "../data/categories.json";
import itemsData from "../data/items.json";
import manualsData from "../data/manuals.json";
import seriesData from "../data/series.json";

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

// Type guard for the new JSON structure
function isGraphDataFile(data: unknown): data is { nodes: unknown[]; edges: Record<string, Record<string, never>> } {
	return (
		typeof data === "object" && data !== null &&
		"nodes" in data && Array.isArray((data as Record<string, unknown>).nodes) &&
		"edges" in data && typeof (data as Record<string, unknown>).edges === "object"
	);
}

// Parse and validate the imported data
function parseJSONData<T>(schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: unknown } }, data: unknown): T[] {
	if (!isGraphDataFile(data)) {
		console.error("Invalid data file format: expected {nodes: [], edges: {}}");
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

// Extract edges from data files
function parseEdges(data: unknown): Record<string, Record<string, never>> {
	if (!isGraphDataFile(data)) {
		console.error("Invalid data file format: expected {nodes: [], edges: {}}");
		return {};
	}
	return data.edges;
}

// Pre-validated data loaded at build time
const parsedItems = parseJSONData<ItemNode>(ItemNodeSchema, itemsData);
const parsedBrands = parseJSONData<BrandNode>(BrandNodeSchema, brandsData);
const parsedCategories = parseJSONData<CategoryNode>(CategoryNodeSchema, categoriesData);
const parsedSeries = parseJSONData<SeriesNode>(SeriesNodeSchema, seriesData);
const parsedManuals = parseJSONData<ManualNode>(ManualNodeSchema, manualsData);

// Parse edges from items data (where category relationships are stored)
const parsedEdges = parseEdges(itemsData);

// Cache for loaded data (synchronous since data is pre-built)
const staticData = {
	items: parsedItems,
	brands: parsedBrands,
	categories: parsedCategories,
	series: parsedSeries,
	manuals: parsedManuals,
	edges: parsedEdges,
};

console.log("Loaded static graph data:", {
	items: staticData.items.length,
	brands: staticData.brands.length,
	categories: staticData.categories.length,
	series: staticData.series.length,
	edges: Object.keys(staticData.edges).length,
});

export function getStaticData() {
	return staticData;
}

// Sort data by display name
const sortByName = <T extends BaseNode>(a: T, b: T): number => {
	const nameA = getNodeDisplayName(a);
	const nameB = getNodeDisplayName(b);
	return nameA.localeCompare(nameB);
};

// Export synchronous functions that return pre-validated data with enriched properties
export function getAllItems(): EnrichedItem[] {
	return [...staticData.items].map(item => enrichItemWithRelationships(item)).sort(sortByName);
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

// Get all unique grades from items
export function getAllGrades(): ItemNode[] {
	const grades = new Set<string>();
	const gradeNodes: ItemNode[] = [];

	staticData.items.forEach(item => {
		if (item.grade && !grades.has(item.grade)) {
			grades.add(item.grade);
			// Create a grade node for consistency
			gradeNodes.push({
				id: `grade-${item.grade.toLowerCase().replace(/\s+/g, '-')}`,
				type: 'grade',
				name: item.grade,
				grade: item.grade,
			} as any);
		}
	});

	return gradeNodes.sort((a, b) => (a.grade ?? '').localeCompare(b.grade ?? ''));
}

// Get all unique scales from items
export function getAllScales(): ItemNode[] {
	const scales = new Set<string>();
	const scaleNodes: ItemNode[] = [];

	staticData.items.forEach(item => {
		if (item.scale && !scales.has(item.scale)) {
			scales.add(item.scale);
			// Create a scale node for consistency
			scaleNodes.push({
				id: `scale-${item.scale.toLowerCase().replace(/\s+/g, '-').replace(/[\/:]/g, '-')}`,
				type: 'scale',
				name: item.scale,
				scale: item.scale,
			} as any);
		}
	});

	return scaleNodes.sort((a, b) => {
		// Sort scales numerically when possible (e.g., 1/144, 1/100, etc.)
		const aNum = (a.scale ?? '').match(/1\/(\d+)/);
		const bNum = (b.scale ?? '').match(/1\/(\d+)/);

		if (aNum && bNum) {
			return Number.parseInt(aNum[1], 10) - Number.parseInt(bNum[1], 10);
		}

		return (a.scale ?? '').localeCompare(b.scale ?? '');
	});
}

// Get specific node by ID with type safety (synchronous)
export function getItemById(id: string): EnrichedItem | null {
	const item = staticData.items.find(item => item.id === id);
	return item ? enrichItemWithRelationships(item) : null;
}

export function getBrandById(id: string): BrandNode | null {
	return staticData.brands.find(brand => brand.id === id) ?? null;
}

export function getCategoryById(id: string): CategoryNode | null {
	return staticData.categories.find(category => category.id === id) ?? null;
}

export function getSeriesById(id: string): SeriesNode | null {
	return staticData.series.find(series => series.id === id) ?? null;
}

export function getManualById(id: string): ManualNode | null {
	return staticData.manuals.find(m => m.id === id) ?? null;
}

// Helper function to resolve related nodes from edges
function resolveRelatedNodes(itemId: string, relationshipType: string, targetType: string): string[] {
	const edgePrefix = `item:${itemId}:${relationshipType}:${targetType}:`;
	const relatedIds: string[] = [];

	for (const edgeKey of Object.keys(staticData.edges)) {
		if (edgeKey.startsWith(edgePrefix)) {
			const relatedId = edgeKey.replace(edgePrefix, '');
			relatedIds.push(relatedId);
		}
	}

	return relatedIds;
}

// Helper function to get node name by ID and type
function getNodeNameById(nodeId: string, nodeType: string): string {
	switch (nodeType) {
		case 'brand':
			const brand = staticData.brands.find(b => b.id === nodeId);
			return brand ? getNodeDisplayName(brand) : '';
		case 'series':
			const series = staticData.series.find(s => s.id === nodeId);
			return series ? getNodeDisplayName(series) : '';
		case 'category':
			const category = staticData.categories.find(c => c.id === nodeId);
			return category ? getNodeDisplayName(category) : '';
		default:
			return '';
	}
}

// Extract scale from item name
function extractScaleFromName(itemName: string): string {
	// Look for patterns like "1/144", "1/100", "1/60", etc.
	const scaleMatch = itemName.match(/1\/\d+/);
	if (scaleMatch) {
		return scaleMatch[0];
	}

	// Look for other common scale indicators
	const otherScaleMatch = itemName.match(/(\d+(?:\/\d+)?)(?:mm|MM)/);
	if (otherScaleMatch) {
		return otherScaleMatch[1];
	}

	// Look for Non Scale
	if (itemName.toLowerCase().includes('non scale') || itemName.toLowerCase().includes('ノンスケール')) {
		return 'Non Scale';
	}

	return '';
}

// Extract grade from item name or brand
function extractGradeFromItem(item: ItemNode): string {
	const itemName = getNodeDisplayName(item).toLowerCase();

	// Check for grade indicators in name
	const gradePatterns = [
		/\b(?:pg|perfect grade)\b/,
		/\b(?:mg|master grade)\b/,
		/\b(?:rg|real grade)\b/,
		/\b(?:hg|high grade)\b/,
		/\b(?:hguc|high grade universal century)\b/,
		/\b(?:sd|super deformed)\b/,
		/\b(?:eg|entry grade)\b/,
		/\b(?:re|revive)\b/,
		/\b(?:mb|metal build)\b/,
		/\b(?:fix|full action)\b/
	];

	for (const pattern of gradePatterns) {
		const match = itemName.match(pattern);
		if (match) {
			return match[0].toUpperCase();
		}
	}

	// Check brand for grade information
	const brandIds = resolveRelatedNodes(item.id, 'BELONGS_TO_BRAND', 'brand');
	for (const brandId of brandIds) {
		const brandName = getNodeNameById(brandId, 'brand').toLowerCase();
		if (brandName.includes('pg') || brandName.includes('perfect grade')) {
			return 'PG';
		}
		if (brandName.includes('mg') || brandName.includes('master grade')) {
			return 'MG';
		}
		if (brandName.includes('rg') || brandName.includes('real grade')) {
			return 'RG';
		}
		if (brandName.includes('hg') || brandName.includes('high grade')) {
			return 'HG';
		}
		if (brandName.includes('sd') || brandName.includes('super deformed')) {
			return 'SD';
		}
		if (brandName.includes('eg') || brandName.includes('entry grade')) {
			return 'EG';
		}
	}

	return '';
}

// Type for enriched item with relationship data
export type EnrichedItem = ItemNode & {
	series?: string;
	seriesId?: string;
	grade?: string;
	scale?: string;
	brand?: string;
	brandId?: string;
	categoryId?: string;
	category?: string;
};

// Enrich item with resolved properties
function enrichItemWithRelationships(item: ItemNode): EnrichedItem {
	const enrichedItem: EnrichedItem = { ...item };

	// Resolve series
	const seriesIds = resolveRelatedNodes(item.id, 'BELONGS_TO_SERIES', 'series');
	if (seriesIds.length > 0) {
		enrichedItem.seriesId = seriesIds[0];
		enrichedItem.series = getNodeNameById(seriesIds[0], 'series');
	}

	// Resolve brand
	const brandIds = resolveRelatedNodes(item.id, 'BELONGS_TO_BRAND', 'brand');
	if (brandIds.length > 0) {
		enrichedItem.brandId = brandIds[0];
		enrichedItem.brand = getNodeNameById(brandIds[0], 'brand');
	}

	// Resolve category
	const categoryIds = resolveRelatedNodes(item.id, 'BELONGS_TO_CATEGORY', 'category');
	if (categoryIds.length > 0) {
		enrichedItem.categoryId = categoryIds[0];
		enrichedItem.category = getNodeNameById(categoryIds[0], 'category');
	}

	// Extract scale from name or use existing scale
	if (item.scale) {
		enrichedItem.scale = item.scale;
	} else {
		const itemName = getNodeDisplayName(item);
		const scale = extractScaleFromName(itemName);
		if (scale) {
			enrichedItem.scale = scale;
		}
	}

	// Extract grade
	const grade = extractGradeFromItem(item);
	if (grade) {
		enrichedItem.grade = grade;
	}

	return enrichedItem;
}

// Get items by category using edges and enrich them with relationship data
export function getItemsByCategory(categoryId: string): EnrichedItem[] {
	const categoryEdgePrefix = `item:`;
	const categoryEdgeSuffix = `:BELONGS_TO_CATEGORY:category:${categoryId}`;

	const itemIds: string[] = [];

	// Find all edges that connect items to this category
	for (const edgeKey of Object.keys(staticData.edges)) {
		if (edgeKey.startsWith(categoryEdgePrefix) && edgeKey.endsWith(categoryEdgeSuffix)) {
			const itemId = edgeKey.split(":")[1]; // Extract item ID from "item:ITEM_ID:BELONGS_TO_CATEGORY:category:CATEGORY_ID"
			itemIds.push(itemId);
		}
	}

	// Return the items that match the found IDs, enriched with relationship data
	return staticData.items
		.filter(item => itemIds.includes(item.id))
		.map(item => enrichItemWithRelationships(item))
		.sort(sortByName);
}

// Get items by series using edges and enrich them with relationship data
export function getItemsBySeries(seriesId: string): EnrichedItem[] {
	const seriesEdgePrefix = `item:`;
	const seriesEdgeSuffix = `:BELONGS_TO_SERIES:series:${seriesId}`;

	const itemIds: string[] = [];

	// Find all edges that connect items to this series
	for (const edgeKey of Object.keys(staticData.edges)) {
		if (edgeKey.startsWith(seriesEdgePrefix) && edgeKey.endsWith(seriesEdgeSuffix)) {
			const itemId = edgeKey.split(":")[1]; // Extract item ID from "item:ITEM_ID:BELONGS_TO_SERIES:series:SERIES_ID"
			itemIds.push(itemId);
		}
	}

	// Return the items that match the found IDs, enriched with relationship data
	return staticData.items
		.filter(item => itemIds.includes(item.id))
		.map(item => enrichItemWithRelationships(item))
		.sort(sortByName);
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