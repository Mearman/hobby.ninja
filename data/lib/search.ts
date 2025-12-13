import { z } from "zod";
import Fuse, { type FuseResult, type IFuseOptions } from "fuse.js";
import searchJson from "../dist/search.json" with { type: "json" };
import { SearchRecordSchema, type SearchRecord } from "./schemas.js";

/**
 * Pre-built search functionality with Fuse.js
 *
 * This module provides a pre-indexed Fuse.js search instance for fast
 * fuzzy searching across items. The search index is built at build time
 * and loaded at runtime for optimal performance.
 */

const SearchDataSchema = z.object({
	records: z.array(SearchRecordSchema),
	fuseIndex: z.unknown(), // Fuse.js index - structure is internal to Fuse
});

const searchData = SearchDataSchema.parse(searchJson);
export const searchRecords = searchData.records;

const fuseOptions: IFuseOptions<SearchRecord> = {
	keys: ["name", "nameJa", "brand", "series"],
	threshold: 0.3,
	includeScore: true,
};

let fuseInstance: Fuse<SearchRecord> | null = null;

/**
 * Get the singleton Fuse.js search instance
 * The instance is lazily initialized on first access
 */
export function getSearchInstance(): Fuse<SearchRecord> {
	if (!fuseInstance) {
		// Cast fuseIndex since it comes from parsed JSON
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const index = Fuse.parseIndex<SearchRecord>(searchData.fuseIndex as any);
		fuseInstance = new Fuse(searchRecords, fuseOptions, index);
	}
	return fuseInstance;
}

/**
 * Search for items matching the query
 *
 * @param query - Search query string
 * @param limit - Maximum number of results to return (default: 20)
 * @returns Array of search results with items and scores
 */
export function search(
	query: string,
	limit = 20
): FuseResult<SearchRecord>[] {
	return getSearchInstance().search(query, { limit });
}

/**
 * Get total number of searchable records
 */
export function getSearchRecordCount(): number {
	return searchRecords.length;
}

/**
 * Get a search record by item ID
 */
export function getSearchRecordById(id: string): SearchRecord | undefined {
	return searchRecords.find(record => record.id === id);
}

/**
 * Search with custom Fuse.js options
 *
 * @param query - Search query string
 * @param options - Custom Fuse.js search options
 * @returns Array of search results
 */
export function searchWithOptions(
	query: string,
	options: { limit: number }
): FuseResult<SearchRecord>[] {
	return getSearchInstance().search(query, options);
}

export type { SearchRecord } from "./schemas.js";
