import fs from "node:fs";
import path from "node:path";
import { ItemNodeSchema, BrandNodeSchema, CategoryNodeSchema, SeriesNodeSchema, ManualNodeSchema, isItemNode, isBrandNode, isCategoryNode, isSeriesNode, isManualNode } from "./schemas";
import type { ItemNode, BrandNode, CategoryNode, SeriesNode, ManualNode } from "./schemas";

// Data directory path
const DATA_ROOT = path.resolve(process.cwd(), "../../data/api/graph");

// Load and validate data from JSON files
export async function loadItemsFromFiles(): Promise<ItemNode[]> {
	return await loadDataTypeFromFiles("items", ItemNodeSchema, isItemNode);
}

export async function loadBrandsFromFiles(): Promise<BrandNode[]> {
	return await loadDataTypeFromFiles("brands", BrandNodeSchema, isBrandNode);
}

export async function loadCategoriesFromFiles(): Promise<CategoryNode[]> {
	return await loadDataTypeFromFiles("categories", CategoryNodeSchema, isCategoryNode);
}

export async function loadSeriesFromFiles(): Promise<SeriesNode[]> {
	return await loadDataTypeFromFiles("series", SeriesNodeSchema, isSeriesNode);
}

export async function loadManualsFromFiles(): Promise<ManualNode[]> {
	return await loadDataTypeFromFiles("manuals", ManualNodeSchema, isManualNode);
}

// Generic function to load and validate data
async function loadDataTypeFromFiles<T>(
	dataType: string,
	schema: any,
	typeGuard: (data: unknown) => data is T
): Promise<T[]> {
	const dataDir = path.join(DATA_ROOT, dataType);

	if (!fs.existsSync(dataDir)) {
		console.warn(`Data directory not found: ${dataDir}`);
		return [];
	}

	try {
		const files = await fs.promises.readdir(dataDir);
		const jsonFiles = files.filter(file => file.endsWith(".json"));
		const validatedData: T[] = [];

		for (const file of jsonFiles) {
			try {
				const filePath = path.join(dataDir, file);
				const fileContent = await fs.promises.readFile(filePath, "utf-8");
				const data = JSON.parse(fileContent);

				// Handle single object or array of objects
				const itemsToValidate = Array.isArray(data) ? data : [data];

				for (const item of itemsToValidate) {
					const result = schema.safeParse(item);
					if (result.success && typeGuard(result.data)) {
						validatedData.push(result.data);
					} else {
						console.warn(`Invalid ${dataType} data in ${file}:`, result.error);
					}
				}
			} catch (error) {
				console.warn(`Error reading file ${file}:`, error);
			}
		}

		return validatedData;
	} catch (error) {
		console.error(`Error loading ${dataType} data:`, error);
		return [];
	}
}

// Generate static params for dynamic routes
export async function generateItemParams(): Promise<Array<{ id: string }>> {
	const items = await loadItemsFromFiles();
	// Limit to first 100 for testing - remove slice for all items
	return items.slice(0, 100).map((item) => ({
		id: item.id,
	}));
}

export async function generateBrandParams(): Promise<Array<{ id: string }>> {
	const brands = await loadBrandsFromFiles();
	return brands.map((brand) => ({
		id: brand.id,
	}));
}

export async function generateCategoryParams(): Promise<Array<{ id: string }>> {
	const categories = await loadCategoriesFromFiles();
	return categories.map((category) => ({
		id: category.id,
	}));
}

export async function generateSeriesParams(): Promise<Array<{ id: string }>> {
	const series = await loadSeriesFromFiles();
	return series.map((seriesItem) => ({
		id: seriesItem.id,
	}));
}

export async function generateManualParams(): Promise<Array<{ id: string }>> {
	const manuals = await loadManualsFromFiles();
	return manuals.map((manual) => ({
		id: manual.id,
	}));
}