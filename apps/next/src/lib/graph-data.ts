
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

// Skip Zod validation in development for faster loading
// Data is pre-validated during build, so dev mode can trust the JSON
const SKIP_VALIDATION = process.env.NODE_ENV === 'development';

// Parse and validate the imported data
function parseJSONData<T>(schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: unknown } }, data: unknown): T[] {
	if (!isGraphDataFile(data)) {
		console.error("Invalid data file format: expected {nodes: [], edges: {}}");
		return [];
	}

	// In dev mode, skip Zod validation for faster loading
	// The data is already validated during the build process
	if (SKIP_VALIDATION) {
		return data.nodes as T[];
	}

	// In production, validate each item (called once per item, not twice)
	const validItems: T[] = [];
	for (const item of data.nodes) {
		const result = schema.safeParse(item);
		if (result.success && result.data) {
			validItems.push(result.data);
		}
	}
	return validItems;
}

// Extract edges from data files
function parseEdges(data: unknown): Record<string, Record<string, never>> {
	if (!isGraphDataFile(data)) {
		console.error("Invalid data file format: expected {nodes: [], edges: {}}");
		return {};
	}
	return data.edges;
}

// Lazy-loaded data caches (initialized on first access, not on module import)
let _parsedItems: ItemNode[] | null = null;
let _parsedBrands: BrandNode[] | null = null;
let _parsedCategories: CategoryNode[] | null = null;
let _parsedSeries: SeriesNode[] | null = null;
let _parsedManuals: ManualNode[] | null = null;
let _parsedEdges: Record<string, Record<string, never>> | null = null;

// Lazy getters for parsed data
function getParsedItems(): ItemNode[] {
	if (_parsedItems === null) {
		_parsedItems = parseJSONData<ItemNode>(ItemNodeSchema, itemsData);
	}
	return _parsedItems;
}

function getParsedBrands(): BrandNode[] {
	if (_parsedBrands === null) {
		_parsedBrands = parseJSONData<BrandNode>(BrandNodeSchema, brandsData);
	}
	return _parsedBrands;
}

function getParsedCategories(): CategoryNode[] {
	if (_parsedCategories === null) {
		_parsedCategories = parseJSONData<CategoryNode>(CategoryNodeSchema, categoriesData);
	}
	return _parsedCategories;
}

function getParsedSeries(): SeriesNode[] {
	if (_parsedSeries === null) {
		_parsedSeries = parseJSONData<SeriesNode>(SeriesNodeSchema, seriesData);
	}
	return _parsedSeries;
}

function getParsedManuals(): ManualNode[] {
	if (_parsedManuals === null) {
		_parsedManuals = parseJSONData<ManualNode>(ManualNodeSchema, manualsData);
	}
	return _parsedManuals;
}

function getParsedEdges(): Record<string, Record<string, never>> {
	if (_parsedEdges === null) {
		_parsedEdges = parseEdges(itemsData);
	}
	return _parsedEdges;
}

// Lazy accessor for static data (creates object on first access)
function getStaticDataInternal() {
	return {
		items: getParsedItems(),
		brands: getParsedBrands(),
		categories: getParsedCategories(),
		series: getParsedSeries(),
		manuals: getParsedManuals(),
		edges: getParsedEdges(),
	};
}

export function getStaticData() {
	return getStaticDataInternal();
}

// Memoization caches for sorted/enriched results
let _allItemsCache: EnrichedItem[] | null = null;
let _allBrandsCache: BrandNode[] | null = null;
let _allCategoriesCache: CategoryNode[] | null = null;
let _allSeriesCache: SeriesNode[] | null = null;
let _allManualsCache: ManualNode[] | null = null;

// Sort data by display name
const sortByName = <T extends BaseNode>(a: T, b: T): number => {
	const nameA = getNodeDisplayName(a);
	const nameB = getNodeDisplayName(b);
	return nameA.localeCompare(nameB);
};

// Export synchronous functions that return pre-validated data with enriched properties
export function getAllItems(): EnrichedItem[] {
	if (_allItemsCache === null) {
		_allItemsCache = [...getParsedItems()].map(item => enrichItemWithRelationships(item)).sort(sortByName);
	}
	return _allItemsCache;
}

export function getAllBrands(): BrandNode[] {
	if (_allBrandsCache === null) {
		_allBrandsCache = [...getParsedBrands()].sort(sortByName);
	}
	return _allBrandsCache;
}

export function getAllCategories(): CategoryNode[] {
	if (_allCategoriesCache === null) {
		_allCategoriesCache = [...getParsedCategories()].sort(sortByName);
	}
	return _allCategoriesCache;
}

export function getAllSeries(): SeriesNode[] {
	if (_allSeriesCache === null) {
		_allSeriesCache = [...getParsedSeries()].sort(sortByName);
	}
	return _allSeriesCache;
}

export function getAllManuals(): ManualNode[] {
	if (_allManualsCache === null) {
		_allManualsCache = [...getParsedManuals()].sort(sortByName);
	}
	return _allManualsCache;
}

// Get all unique grades from items
export function getAllGrades(): ItemNode[] {
	const grades = new Set<string>();
	const gradeNodes: ItemNode[] = [];

	getParsedItems().forEach(item => {
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

	getParsedItems().forEach(item => {
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
	const item = getParsedItems().find(item => item.id === id);
	return item ? enrichItemWithRelationships(item) : null;
}

export function getBrandById(id: string): BrandNode | null {
	return getParsedBrands().find(brand => brand.id === id) ?? null;
}

export function getCategoryById(id: string): CategoryNode | null {
	return getParsedCategories().find(category => category.id === id) ?? null;
}

export function getSeriesById(id: string): SeriesNode | null {
	return getParsedSeries().find(series => series.id === id) ?? null;
}

export function getManualById(id: string): ManualNode | null {
	return getParsedManuals().find(m => m.id === id) ?? null;
}

// Helper function to resolve related nodes from edges
function resolveRelatedNodes(itemId: string, relationshipType: string, targetType: string): string[] {
	const edgePrefix = `item:${itemId}:${relationshipType}:${targetType}:`;
	const relatedIds: string[] = [];

	for (const edgeKey of Object.keys(getParsedEdges())) {
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
			const brand = getParsedBrands().find(b => b.id === nodeId);
			return brand ? getNodeDisplayName(brand) : '';
		case 'series':
			const series = getParsedSeries().find(s => s.id === nodeId);
			return series ? getNodeDisplayName(series) : '';
		case 'category':
			const category = getParsedCategories().find(c => c.id === nodeId);
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
	for (const edgeKey of Object.keys(getParsedEdges())) {
		if (edgeKey.startsWith(categoryEdgePrefix) && edgeKey.endsWith(categoryEdgeSuffix)) {
			const itemId = edgeKey.split(":")[1]; // Extract item ID from "item:ITEM_ID:BELONGS_TO_CATEGORY:category:CATEGORY_ID"
			itemIds.push(itemId);
		}
	}

	// Return the items that match the found IDs, enriched with relationship data
	return getParsedItems()
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
	for (const edgeKey of Object.keys(getParsedEdges())) {
		if (edgeKey.startsWith(seriesEdgePrefix) && edgeKey.endsWith(seriesEdgeSuffix)) {
			const itemId = edgeKey.split(":")[1]; // Extract item ID from "item:ITEM_ID:BELONGS_TO_SERIES:series:SERIES_ID"
			itemIds.push(itemId);
		}
	}

	// Return the items that match the found IDs, enriched with relationship data
	return getParsedItems()
		.filter(item => itemIds.includes(item.id))
		.map(item => enrichItemWithRelationships(item))
		.sort(sortByName);
}

// Get all nodes combined
export function getAllNodes(): GraphNode[] {
	return [...getParsedItems(), ...getParsedBrands(), ...getParsedCategories(), ...getParsedSeries(), ...getParsedManuals()];
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
		getParsedItems().find(item => item.id === id) ??
		getParsedBrands().find(brand => brand.id === id) ??
		getParsedCategories().find(category => category.id === id) ??
		getParsedSeries().find(s => s.id === id) ??
		getParsedManuals().find(manual => manual.id === id) ??
		null
	);
}

// Validate that required data is available (synchronous)
export function validateGraphData(): boolean {
	// Return true if data was successfully loaded and validated
	return getParsedItems().length > 0 && getParsedBrands().length > 0 && getParsedCategories().length > 0 && getParsedSeries().length > 0;
}

// Export graphData as a getter that returns lazy-loaded data
export const graphData = {
	get items() { return getParsedItems(); },
	get brands() { return getParsedBrands(); },
	get categories() { return getParsedCategories(); },
	get series() { return getParsedSeries(); },
	get manuals() { return getParsedManuals(); },
	get edges() { return getParsedEdges(); },
};
