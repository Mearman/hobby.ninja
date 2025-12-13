import { z } from "zod";
import categoriesJson from "../dist/categories.json" with { type: "json" };
import { CategorySchema } from "./schemas.js";
import type { Category } from "./schemas.js";

const CategoriesRecordSchema = z.record(z.string(), CategorySchema);
export const categories = CategoriesRecordSchema.parse(categoriesJson);

export const categoriesList = Object.values(categories);

export function getCategoryIds(): string[] {
	return Object.keys(categories);
}

export function getCategoryById(id: string): Category | undefined {
	return categories[id];
}

export function getCategoryCount(): number {
	return categoriesList.length;
}

export type { Category } from "./schemas.js";
