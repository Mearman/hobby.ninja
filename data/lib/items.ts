import { z } from "zod";
import itemsJson from "../dist/items.json" with { type: "json" };
import { ItemSchema, type Item } from "./schemas.js";

/**
 * Validated items data with helper functions
 *
 * This module imports items from the generated dist/ folder and validates
 * them with Zod schemas at import time. All items are guaranteed to match
 * the ItemSchema structure.
 */

// Parse and validate at import time
const ItemsRecordSchema = z.record(z.string(), ItemSchema);
export const items = ItemsRecordSchema.parse(itemsJson);

// Derived exports
export const itemsList = Object.values(items);

// Helper functions
export function getItemIds(): string[] {
	return Object.keys(items);
}

export function getItemById(id: string): Item | undefined {
	return items[id];
}

export function getItemCount(): number {
	return itemsList.length;
}

// Re-export the type
export type { Item };
