import fs from "node:fs";
import path from "node:path";

import type {
	ItemNode,
	BrandNode,
	CategoryNode,
	SeriesNode,
	ManualNode,
} from "./schemas";
import {
	ItemNodeSchema,
	BrandNodeSchema,
	CategoryNodeSchema,
	SeriesNodeSchema,
	ManualNodeSchema,
	isItemNode,
	isBrandNode,
	isCategoryNode,
	isSeriesNode,
	isManualNode,
} from "./schemas";

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
	schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: unknown } },
	typeGuard: (data: unknown) => data is T,
): Promise<T[]> {
	const dataDir = path.join(DATA_ROOT, dataType);

	if (!fs.existsSync(dataDir)) {
		console.warn(`Data directory not found: ${dataDir}`);
		return [];
	}

	try {
		const files = await fs.promises.readdir(dataDir);
		const jsonFiles = files.filter((file) => file.endsWith(".json"));
		const validatedData: T[] = [];

		for (const file of jsonFiles) {
			try {
				const filePath = path.join(dataDir, file);
				const fileContent = await fs.promises.readFile(filePath, "utf8");
				const data: unknown = JSON.parse(fileContent);

				// Handle single object or array of objects
				const itemsToValidate = Array.isArray(data) ? data : [data];

				for (const item of itemsToValidate) {
					const result = schema.safeParse(item);
					if (result.success && result.data && typeGuard(result.data)) {
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
	// Generate params for all items
	return items.map((item) => ({
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
	return series.map((seriesData) => ({
		id: seriesData.id,
	}));
}

export async function generateManualParams(): Promise<Array<{ id: string }>> {
	const manuals = await loadManualsFromFiles();
	return manuals.map((manual) => ({
		id: manual.id,
	}));
}