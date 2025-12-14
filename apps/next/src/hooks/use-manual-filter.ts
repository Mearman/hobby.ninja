"use client";

import { getNodeDisplayName, type Manual } from "@hobby-ninja/data";
import { useMemo, useState } from "react";

// Helper function to get item display name
const getItemDisplayName = (manual: Manual): string | null => {
	if (!manual.itemName) return null;
	if (typeof manual.itemName === "string") return manual.itemName;
	// Prefer en, fall back to ja if en is empty
	const en = manual.itemName.en;
	const ja = manual.itemName.ja;
	if (en && en.length > 0) return en;
	if (ja && ja.length > 0) return ja;
	return null;
};

export interface ManualFilterState {
	search: string;
}

export function useManualFilter(items: Manual[]) {
	const [filterState, setFilterState] = useState<ManualFilterState>({
		search: "",
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

		return filtered;
	}, [items, filterState]);

	const updateFilter = (updates: Partial<ManualFilterState>) => {
		setFilterState(prev => ({ ...prev, ...updates }));
	};

	const clearFilters = () => {
		setFilterState({
			search: "",
		});
	};

	const hasActiveFilters = filterState.search.trim() !== "";

	return {
		filteredItems,
		filterState,
		updateFilter,
		clearFilters,
		hasActiveFilters,
	};
}