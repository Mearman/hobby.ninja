import { z } from "zod";
import tagsJson from "../dist/tags.json" with { type: "json" };
import { TagDataSchema, type TagData, type Item } from "./schemas.js";
import { items } from "./items.js";

/**
 * Validated tags data with helper functions
 *
 * Tags indicate distribution channels: Hobby Online, Event, Gundam Base, etc.
 * These are special release indicators that show where items were exclusively available.
 */

const TagsRecordSchema = z.record(z.string(), TagDataSchema);
export const tags = TagsRecordSchema.parse(tagsJson);

export const tagsList = Object.values(tags);

export function getTagIds(): string[] {
	return Object.keys(tags);
}

export function getTagById(id: string): TagData | undefined {
	return tags[id];
}

export function getTagCount(): number {
	return tagsList.length;
}

/**
 * Get tags sorted by item count (descending)
 */
export function getTagsByPopularity(): TagData[] {
	return [...tagsList].toSorted((a, b) => b.itemCount - a.itemCount);
}

/**
 * Get tags sorted alphabetically by name
 */
export function getTagsByName(): TagData[] {
	return [...tagsList].toSorted((a, b) => {
		const nameA = typeof a.name === "string" ? a.name : (a.name.en ?? a.name.ja);
		const nameB = typeof b.name === "string" ? b.name : (b.name.en ?? b.name.ja);
		return nameA.localeCompare(nameB);
	});
}

/**
 * Get all items for a given tag ID
 */
export function getItemsByTag(tagId: string): Item[] {
	const tag = tags[tagId];
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Runtime safety for invalid IDs
	if (!tag) return [];
	// All item IDs in tags.json are guaranteed to exist in items.json
	return tag.itemIds.map(id => items[id]);
}

/**
 * Get the display name for a tag (preferring English)
 */
export function getTagDisplayName(tag: TagData): string {
	if (typeof tag.name === "string") return tag.name;
	return tag.name.en ?? tag.name.ja;
}

export type { TagData } from "./schemas.js";
