"use client";

import { getNodeDisplayName, type Manual } from "@hobby-ninja/data";
import { useMemo, useState } from "react";

import { isDateInRange } from "@/components/filters/date-range-filter";
import {
	createDateFromReleaseDate,
	getYear,
	adaptSchemaReleaseDate,
} from "@/types/dates";

// Helper function to get item display name
const getItemDisplayName = (manual: Manual): string | null => {
	if (!manual.itemName) return null;
	if (typeof manual.itemName === "string") return manual.itemName;
	const en = manual.itemName.en;
	const ja = manual.itemName.ja;
	if (en && en.length > 0) return en;
	if (ja && ja.length > 0) return ja;
	return null;
};

export interface ManualFilterState {
	search: string;
	dateRange: {
		start: Date | null;
		end: Date | null;
	};
	sortField: "name" | "date" | "pages" | "language";
	sortDirection: "asc" | "desc";
}

export function useManualFilterEnhanced(items: Manual[]) {
	const [filterState, setFilterState] = useState<ManualFilterState>({
		search: "",
		dateRange: {
			start: null,
			end: new Date(), // Default to today
		},
		sortField: "name",
		sortDirection: "asc",
	});

	// Filter items based on current filter state
	const filteredItems = useMemo(() => {
		let filtered = items;

		// Search filter
		if (filterState.search.trim()) {
			const query = filterState.search.toLowerCase();
			filtered = filtered.filter((item) => {
				const name = getNodeDisplayName(item).toLowerCase();
				const itemName = getItemDisplayName(item)?.toLowerCase() ?? "";
				return name.includes(query) || itemName.includes(query);
			});
		}

		// Date range filter using type-safe ReleaseDate helpers
		filtered = filtered.filter((item) => {
			if (!item.releaseDate) return true; // Include items with no release date

			// Adapt from schema type (nullable fields) to discriminated union
			// Returns undefined if date doesn't have valid numeric structure
			const safeReleaseDate = adaptSchemaReleaseDate(item.releaseDate);

			// Skip items without valid numeric date data
			if (!safeReleaseDate) return true;

			// Use the type-safe helper to create a Date object from ReleaseDate
			// The discriminated union guarantees valid date hierarchy (year/month/day)
			const itemDate = createDateFromReleaseDate(safeReleaseDate);
			return isDateInRange(itemDate, filterState.dateRange);
		});

		// Sort items
		return filtered.toSorted((a, b) => {
			let aValue: string | number;
			let bValue: string | number;

			switch (filterState.sortField) {
				case "name": {
					aValue = getNodeDisplayName(a).toLowerCase();
					bValue = getNodeDisplayName(b).toLowerCase();
					break;
				}
				case "date": {
					// Adapt schema types to discriminated union before extracting year
					const aDate = a.releaseDate
						? adaptSchemaReleaseDate(a.releaseDate)
						: undefined;
					const bDate = b.releaseDate
						? adaptSchemaReleaseDate(b.releaseDate)
						: undefined;
					aValue = aDate ? getYear(aDate).toString() : "";
					bValue = bDate ? getYear(bDate).toString() : "";
					break;
				}
				case "pages": {
					aValue = a.pages ?? 0;
					bValue = b.pages ?? 0;
					break;
				}
				case "language": {
					aValue = a.language ?? "";
					bValue = b.language ?? "";
					break;
				}
				default: {
					aValue = getNodeDisplayName(a).toLowerCase();
					bValue = getNodeDisplayName(b).toLowerCase();
				}
			}

			let comparison = 0;
			comparison = typeof aValue === "number" && typeof bValue === "number" ? aValue - bValue : String(aValue).localeCompare(String(bValue));

			return filterState.sortDirection === "desc" ? -comparison : comparison;
		});
	}, [items, filterState]);

	const updateFilter = (updates: Partial<ManualFilterState>) => {
		setFilterState((prev) => ({ ...prev, ...updates }));
	};

	const clearFilters = () => {
		setFilterState({
			search: "",
			dateRange: {
				start: null,
				end: new Date(),
			},
			sortField: "name",
			sortDirection: "asc",
		});
	};

	const hasActiveFilters =
		filterState.search.trim() !== "" ||
		filterState.dateRange.start !== null ||
		filterState.dateRange.end !== null;

	return {
		filteredItems,
		filterState,
		updateFilter,
		clearFilters,
		hasActiveFilters,
	};
}
