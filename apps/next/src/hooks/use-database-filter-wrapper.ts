"use client";

import { isItem, type Item, type Manual } from "@hobby-ninja/data";
import { useMemo } from "react";

import { useDatabaseFilter } from "./use-database-filter";

/**
 * Wrapper hook that adapts useDatabaseFilter to work with the generic list abstraction.
 * The generic abstraction passes a single combined array, but useDatabaseFilter expects
 * separate items and manuals arrays for efficiency.
 */
export function useDatabaseFilterWrapper(combinedData: Array<Item | Manual>) {
	// Split combined array into items and manuals
	const { items, manuals } = useMemo(() => {
		const items: Item[] = [];
		const manuals: Manual[] = [];

		for (const entry of combinedData) {
			if (isItem(entry)) {
				items.push(entry);
			} else {
				manuals.push(entry);
			}
		}

		return { items, manuals };
	}, [combinedData]);

	// Delegate to the real hook
	return useDatabaseFilter(items, manuals);
}
