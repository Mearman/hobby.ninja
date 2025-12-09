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

// Static data fallback for development when external JSON files aren't available
// In production with static export, this would be replaced with actual data
const staticData = {
	items: [
		// Sample item for demonstration - replace with actual data
		{
			id: "sample-item-1",
			name: "RX-78-2 Gundam",
			type: "item" as const,
			grade: "MG",
			scale: "1/100",
			brand: "Bandai",
			series: "Mobile Suit Gundam",
			category: "Gunpla"
		}
	],
	brands: [
		{
			id: "bandai",
			name: "Bandai",
			type: "brand" as const
		}
	],
	categories: [
		{
			id: "gunpla",
			name: "Gunpla",
			type: "category" as const
		}
	],
	series: [
		{
			id: "mobile-suit-gundam",
			name: "Mobile Suit Gundam",
			type: "series" as const
		}
	],
	manuals: []
};

// Process and validate data at build time
const items: ItemNode[] = [];
const brands: BrandNode[] = [];
const categories: CategoryNode[] = [];
const series: SeriesNode[] = [];
const manuals: ManualNode[] = [];

// Process items data
for (const itemData of staticData.items) {
	const result = ItemNodeSchema.safeParse(itemData);
	if (result.success && isItemNode(result.data)) {
		items.push(result.data);
	}
}

// Process brands data
for (const brandData of staticData.brands) {
	const result = BrandNodeSchema.safeParse(brandData);
	if (result.success && isBrandNode(result.data)) {
		brands.push(result.data);
	}
}

// Process categories data
for (const categoryData of staticData.categories) {
	const result = CategoryNodeSchema.safeParse(categoryData);
	if (result.success && isCategoryNode(result.data)) {
		categories.push(result.data);
	}
}

// Process series data
for (const seriesDataItem of staticData.series) {
	const result = SeriesNodeSchema.safeParse(seriesDataItem);
	if (result.success && isSeriesNode(result.data)) {
		series.push(result.data);
	}
}

// Process manuals data
for (const manualData of staticData.manuals) {
	const result = ManualNodeSchema.safeParse(manualData);
	if (result.success && isManualNode(result.data)) {
		manuals.push(result.data);
	}
}

console.log(`✅ Loaded static data: ${items.length} items, ${brands.length} brands, ${categories.length} categories, ${series.length} series, ${manuals.length} manuals`);

// Sort data by display name
const sortByName = <T extends BaseNode>(a: T, b: T): number => {
	const nameA = getNodeDisplayName(a);
	const nameB = getNodeDisplayName(b);
	return nameA.localeCompare(nameB);
};

// Export functions that return validated data (synchronous for static build)
export function getAllItems(): ItemNode[] {
	return [...items].sort(sortByName);
}

export function getAllBrands(): BrandNode[] {
	return [...brands].sort(sortByName);
}

export function getAllCategories(): CategoryNode[] {
	return [...categories].sort(sortByName);
}

export function getAllSeries(): SeriesNode[] {
	return [...series].sort(sortByName);
}

export function getAllManuals(): ManualNode[] {
	return [...manuals].sort(sortByName);
}

// Get specific node by ID with type safety
export function getItemById(id: string): ItemNode | null {
	return items.find(item => item.id === id) ?? null;
}

export function getBrandById(id: string): BrandNode | null {
	return brands.find(brand => brand.id === id) ?? null;
}

export function getCategoryById(id: string): CategoryNode | null {
	return categories.find(category => category.id === id) ?? null;
}

export function getSeriesById(id: string): SeriesNode | null {
	return series.find(s => s.id === id) ?? null;
}

export function getManualById(id: string): ManualNode | null {
	return manuals.find(manual => manual.id === id) ?? null;
}

// Get all nodes combined
export function getAllNodes(): GraphNode[] {
	return [...items, ...brands, ...categories, ...series, ...manuals];
}

// Get nodes by type
export async function getNodesByType<T extends GraphNode>(
	type: string,
	typeGuard: (data: unknown) => data is T,
): Promise<T[]> {
	const allNodes = await getAllNodes();
	return allNodes.filter((node): node is T => node.type === type && typeGuard(node));
}

// Get node by any type
export async function getNodeByIdAny(id: string): Promise<GraphNode | null> {
	return (
		items.find(item => item.id === id) ??
		brands.find(brand => brand.id === id) ??
		categories.find(category => category.id === id) ??
		series.find(s => s.id === id) ??
		manuals.find(manual => manual.id === id) ??
		null
	);
}

// Validate that required data is available
export async function validateGraphData(): Promise<boolean> {
	// For static export, validation is done at build time
	// Return true if data was successfully loaded and validated
	return items.length > 0 && brands.length > 0 && categories.length > 0 && series.length > 0;
}