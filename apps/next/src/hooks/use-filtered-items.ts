"use client";

import { useState, useMemo, useCallback } from "react";
import { getNodeDisplayName, isItemNode, type ItemNode } from "@/lib/schemas";

export interface FilterState {
	search: string;
	brand: string;
	grade: string;
	scale: string;
	series: string;
	sortField: string;
	sortDirection: "asc" | "desc";
}

export interface FilterOptions {
	availableBrands?: string[];
	availableGrades?: string[];
	availableScales?: string[];
	availableSeries?: string[];
	defaultSort?: string;
}

export interface UseFilteredItemsReturn {
	filteredItems: ItemNode[];
	filterState: FilterState;
	updateFilter: (updates: Partial<FilterState>) => void;
	updateSearch: (value: string) => void;
	clearFilters: () => void;
	hasActiveFilters: boolean;
	activeFilterCount: number;
	availableOptions: {
		brands: string[];
	grades: string[];
		scales: string[];
	series: string[];
	};
}

const DEFAULT_FILTER_STATE: FilterState = {
	search: "",
	brand: "",
	grade: "",
	scale: "",
	series: "",
	sortField: "date",
	sortDirection: "desc",
};

export function useFilteredItems(
	items: ItemNode[],
	options: FilterOptions = {}
): UseFilteredItemsReturn<ItemNode> {
	const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);

	// Calculate available filter options from items
	const availableOptions = useMemo(() => {
		const brands = new Set<string>();
		const grades = new Set<string>();
		const scales = new Set<string>();
		const series = new Set<string>();

		const validItems = items.filter(item => isItemNode(item));

		validItems.forEach(item => {
			if (item.brand) brands.add(item.brand);
			if (item.grade) grades.add(item.grade);
			if (item.scale) scales.add(item.scale);
			if (item.series) series.add(item.series);
		});

		return {
			brands: options.availableBrands ?? [...Array.from(brands)].sort(),
			grades: options.availableGrades ?? [...Array.from(grades)].sort(),
			scales: options.availableScales ?? [...Array.from(scales)].sort(),
			series: options.availableSeries ?? [...Array.from(series)].sort(),
		};
	}, [items, options.availableBrands, options.availableGrades, options.availableScales, options.availableSeries]);

	// Apply filters and sorting
	const filteredItems = useMemo(() => {
		// Items are already pre-filtered by category/series/brand on the server
		let filteredItems = items.filter(item => isItemNode(item));

		// Apply search filter
		if (filterState.search) {
			const query = filterState.search.toLowerCase();
			filteredItems = filteredItems.filter(item => {
				const name = getNodeDisplayName(item).toLowerCase();
				const brand = item.brand?.toLowerCase() ?? "";
				const series = item.series?.toLowerCase() ?? "";
				const grade = item.grade?.toLowerCase() ?? "";
				const scale = item.scale?.toLowerCase() ?? "";
				return (
					name.includes(query) ||
					brand.includes(query) ||
					series.includes(query) ||
					grade.includes(query) ||
					scale.includes(query)
				);
			});
		}

		// Apply filters
		if (filterState.brand) {
			filteredItems = filteredItems.filter(item => item.brand === filterState.brand);
		}
		if (filterState.grade) {
			filteredItems = filteredItems.filter(item => item.grade === filterState.grade);
		}
		if (filterState.scale) {
			filteredItems = filteredItems.filter(item => item.scale === filterState.scale);
		}
		if (filterState.series) {
			filteredItems = filteredItems.filter(item => item.series === filterState.series);
		}

		// Apply sorting
		const sortField = filterState.sortField || "date";
		const sortDirection = filterState.sortDirection || "desc";

		switch (sortField) {
			case "name": {
				if (sortDirection === "asc") {
					filteredItems = [...filteredItems].sort((a, b) => getNodeDisplayName(a).localeCompare(getNodeDisplayName(b)));
				} else {
					filteredItems = [...filteredItems].sort((a, b) => getNodeDisplayName(b).localeCompare(getNodeDisplayName(a)));
				}
				break;
			}
			case "date": {
				if (sortDirection === "asc") {
					filteredItems = [...filteredItems].sort((a, b) => (a.created ?? "").localeCompare(b.created ?? ""));
				} else {
					filteredItems = [...filteredItems].sort((a, b) => (b.created ?? "").localeCompare(a.created ?? ""));
				}
				break;
			}
			case "price": {
				if (sortDirection === "asc") {
					filteredItems = [...filteredItems].sort((a, b) => (a.price?.amount ?? 0) - (b.price?.amount ?? 0));
				} else {
					filteredItems = [...filteredItems].sort((a, b) => (b.price?.amount ?? 0) - (a.price?.amount ?? 0));
				}
				break;
			}
			case "brand": {
				if (sortDirection === "asc") {
					filteredItems = [...filteredItems].sort((a, b) => (a.brand ?? "").localeCompare(b.brand ?? ""));
				} else {
					filteredItems = [...filteredItems].sort((a, b) => (b.brand ?? "").localeCompare(a.brand ?? ""));
				}
				break;
			}
			case "grade": {
				if (sortDirection === "asc") {
					filteredItems = [...filteredItems].sort((a, b) => (a.grade ?? "").localeCompare(b.grade ?? ""));
				} else {
					filteredItems = [...filteredItems].sort((a, b) => (b.grade ?? "").localeCompare(a.grade ?? ""));
				}
				break;
			}
			case "scale": {
				if (sortDirection === "asc") {
					filteredItems = [...filteredItems].sort((a, b) => (a.scale ?? "").localeCompare(b.scale ?? ""));
				} else {
					filteredItems = [...filteredItems].sort((a, b) => (b.scale ?? "").localeCompare(a.scale ?? ""));
				}
				break;
			}
			case "series": {
				if (sortDirection === "asc") {
					filteredItems = [...filteredItems].sort((a, b) => (a.series ?? "").localeCompare(b.series ?? ""));
				} else {
					filteredItems = [...filteredItems].sort((a, b) => (b.series ?? "").localeCompare(a.series ?? ""));
				}
				break;
			}
			default: {
				// Default: keep original order
				break;
			}
		}

		return filteredItems;
	}, [items, filterState, options.defaultSort]);

	// Update filter state
	const updateFilter = useCallback((updates: Partial<FilterState>) => {
		setFilterState(prev => ({ ...prev, ...updates }));
	}, []);

	const updateSearch = useCallback((value: string) => {
		updateFilter({ search: value });
	}, [updateFilter]);

	// Clear all filters
	const clearFilters = useCallback(() => {
		setFilterState(DEFAULT_FILTER_STATE);
	}, []);

	// Check if any filters are active
	const hasActiveFilters = useMemo(() => {
		const { sortField, sortDirection, ...searchFilters } = filterState;
		const defaultSortField = DEFAULT_FILTER_STATE.sortField;
		const defaultSortDirection = DEFAULT_FILTER_STATE.sortDirection;

		const hasSearchFilters = Object.values(searchFilters).some(value => value !== "");
		const hasNonDefaultSort = sortField !== defaultSortField || sortDirection !== defaultSortDirection;

		return hasSearchFilters || hasNonDefaultSort;
	}, [filterState]);

	// Count active filters
	const activeFilterCount = useMemo(() => {
		const { sortField, sortDirection, ...searchFilters } = filterState;
		const defaultSortField = DEFAULT_FILTER_STATE.sortField;
		const defaultSortDirection = DEFAULT_FILTER_STATE.sortDirection;

		const searchFilterCount = Object.values(searchFilters).filter(value => value !== "").length;
		const sortFieldCount = sortField !== defaultSortField ? 1 : 0;
		const sortDirectionCount = sortDirection !== defaultSortDirection ? 1 : 0;

		return searchFilterCount + sortFieldCount + sortDirectionCount;
	}, [filterState]);

	return {
		filteredItems,
		filterState,
		updateFilter,
		updateSearch,
		clearFilters,
		hasActiveFilters,
		activeFilterCount,
		availableOptions,
	};
}