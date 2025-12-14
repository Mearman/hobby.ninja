"use client";

import { getNodeDisplayName, getNodeReleaseDateSortable, isItem, type Item } from "@hobby-ninja/data";
import { useState, useMemo, useCallback } from "react";

/**
 * Parse scale string (e.g., "1/144") to get the denominator as a number.
 * Returns Infinity for invalid scales so they sort to the end.
 */
function parseScaleDenominator(scale: string): number {
	const match = /1\/(\d+)/.exec(scale);
	if (match?.[1]) {
		return Number.parseInt(match[1], 10);
	}
	return Number.POSITIVE_INFINITY;
}

/**
 * Sort scales from largest to smallest (1/60 before 1/144).
 * Larger scale = smaller denominator.
 */
function sortScales(scales: string[]): string[] {
	return [...scales].toSorted((a, b) => {
		const denomA = parseScaleDenominator(a);
		const denomB = parseScaleDenominator(b);
		return denomA - denomB; // Smaller denominator = larger scale, comes first
	});
}


export interface FilterState {
	search: string;
	brands: string[];
	grades: string[];
	scales: string[];
	series: string[];
	categories: string[];
	sortField: string;
	sortDirection: "asc" | "desc";
}

export interface FilterOptions {
	availableBrands?: string[];
	availableGrades?: string[];
	availableScales?: string[];
	availableSeries?: string[];
	availableCategories?: string[];
	defaultSort?: string;
}

export interface UseFilteredItemsReturn {
	filteredItems: Item[];
	filterState: FilterState;
	updateFilter: (updates: Partial<FilterState>) => void;
	updateSearch: (value: string) => void;
	toggleFilterValue: (field: keyof Pick<FilterState, "brands" | "grades" | "scales" | "series" | "categories">, value: string) => void;
	clearFilters: () => void;
	hasActiveFilters: boolean;
	activeFilterCount: number;
	availableOptions: {
		brands: string[];
		grades: string[];
		scales: string[];
		series: string[];
		categories: string[];
	};
}

const DEFAULT_FILTER_STATE: FilterState = {
	search: "",
	brands: [],
	grades: [],
	scales: [],
	series: [],
	categories: [],
	sortField: "date",
	sortDirection: "desc",
};

export function useFilteredItems(
	items: Item[],
	_initialFilters?: Partial<FilterState>,
): UseFilteredItemsReturn {
	const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);

	// Calculate available filter options from items
	const availableOptions = useMemo(() => {
		const brands = new Set<string>();
		const grades = new Set<string>();
		const scales = new Set<string>();
		const series = new Set<string>();
		const categories = new Set<string>();

		const validItems: Item[] = items.filter((item): item is Item => isItem(item));

		for (const item of validItems) {
			// Use array-based IDs from the data package
			for (const brandId of item.brandIds) {
				brands.add(brandId);
			}
			if (item.grade) grades.add(item.grade);
			if (item.scale) scales.add(item.scale);
			for (const seriesId of item.seriesIds) {
				series.add(seriesId);
			}
			for (const categoryId of item.categoryIds) {
				categories.add(categoryId);
			}
		}

		return {
			brands: [...brands].toSorted(),
			grades: [...grades].toSorted(),
			scales: sortScales([...scales]),
			series: [...series].toSorted(),
			categories: [...categories].toSorted(),
		};
	}, [items]);

	// Apply filters and sorting
	const filteredItems = useMemo((): Item[] => {
		// Items are already pre-filtered by category/series/brand on the server
		let result: Item[] = items.filter((item): item is Item => isItem(item));

		// Apply search filter
		if (filterState.search) {
			const query = filterState.search.toLowerCase();
			result = result.filter(item => {
				const name = getNodeDisplayName(item).toLowerCase();
				const brandIds = item.brandIds.join(" ").toLowerCase();
				const seriesIds = item.seriesIds.join(" ").toLowerCase();
				const grade = item.grade?.toLowerCase() ?? "";
				const scale = item.scale?.toLowerCase() ?? "";
				return (
					name.includes(query) ||
					brandIds.includes(query) ||
					seriesIds.includes(query) ||
					grade.includes(query) ||
					scale.includes(query)
				);
			});
		}

		// Apply array-based filters (show all if array is empty)
		if (filterState.brands.length > 0) {
			result = result.filter(item =>
				item.brandIds.some(brandId => filterState.brands.includes(brandId)),
			);
		}
		if (filterState.grades.length > 0) {
			result = result.filter(item => item.grade != null && filterState.grades.includes(item.grade));
		}
		if (filterState.scales.length > 0) {
			result = result.filter(item => item.scale != null && filterState.scales.includes(item.scale));
		}
		if (filterState.series.length > 0) {
			result = result.filter(item =>
				item.seriesIds.some(seriesId => filterState.series.includes(seriesId)),
			);
		}
		if (filterState.categories.length > 0) {
			result = result.filter(item =>
				item.categoryIds.some(categoryId => filterState.categories.includes(categoryId)),
			);
		}

		// Apply sorting
		const sortField = filterState.sortField;
		const sortDirection = filterState.sortDirection;

		switch (sortField) {
			case "name": {
				result = sortDirection === "asc"
					? result.toSorted((a, b) => getNodeDisplayName(a).localeCompare(getNodeDisplayName(b)))
					: result.toSorted((a, b) => getNodeDisplayName(b).localeCompare(getNodeDisplayName(a)));
				break;
			}
			case "date": {
				result = sortDirection === "asc"
					? result.toSorted((a, b) => getNodeReleaseDateSortable(a).localeCompare(getNodeReleaseDateSortable(b)))
					: result.toSorted((a, b) => getNodeReleaseDateSortable(b).localeCompare(getNodeReleaseDateSortable(a)));
				break;
			}
			case "price": {
				result = sortDirection === "asc"
					? result.toSorted((a, b) => (a.price?.amount ?? 0) - (b.price?.amount ?? 0))
					: result.toSorted((a, b) => (b.price?.amount ?? 0) - (a.price?.amount ?? 0));
				break;
			}
			case "brand": {
				result = sortDirection === "asc"
					? result.toSorted((a, b) => (a.brandIds[0] ?? "").localeCompare(b.brandIds[0] ?? ""))
					: result.toSorted((a, b) => (b.brandIds[0] ?? "").localeCompare(a.brandIds[0] ?? ""));
				break;
			}
			case "grade": {
				result = sortDirection === "asc"
					? result.toSorted((a, b) => (a.grade ?? "").localeCompare(b.grade ?? ""))
					: result.toSorted((a, b) => (b.grade ?? "").localeCompare(a.grade ?? ""));
				break;
			}
			case "scale": {
				result = sortDirection === "asc"
					? result.toSorted((a, b) => (a.scale ?? "").localeCompare(b.scale ?? ""))
					: result.toSorted((a, b) => (b.scale ?? "").localeCompare(a.scale ?? ""));
				break;
			}
			case "series": {
				result = sortDirection === "asc"
					? result.toSorted((a, b) => (a.seriesIds[0] ?? "").localeCompare(b.seriesIds[0] ?? ""))
					: result.toSorted((a, b) => (b.seriesIds[0] ?? "").localeCompare(a.seriesIds[0] ?? ""));
				break;
			}
			default: {
				// Default: keep original order
				break;
			}
		}

		return result;
	}, [items, filterState]);

	// Update filter state
	const updateFilter = useCallback((updates: Partial<FilterState>) => {
		setFilterState(prev => ({ ...prev, ...updates }));
	}, []);

	const updateSearch = useCallback((value: string) => {
		updateFilter({ search: value });
	}, [updateFilter]);

	// Toggle a single value in an array filter field
	const toggleFilterValue = useCallback((
		field: keyof Pick<FilterState, "brands" | "grades" | "scales" | "series" | "categories">,
		value: string,
	) => {
		setFilterState(prev => {
			const currentValues = prev[field];
			const newValues = currentValues.includes(value)
				? currentValues.filter(v => v !== value)
				: [...currentValues, value];
			return { ...prev, [field]: newValues };
		});
	}, []);

	// Clear all filters
	const clearFilters = useCallback(() => {
		setFilterState(DEFAULT_FILTER_STATE);
	}, []);

	// Check if any filters are active
	const hasActiveFilters = useMemo(() => {
		const { sortField, sortDirection, search, ...arrayFilters } = filterState;
		const defaultSortField = DEFAULT_FILTER_STATE.sortField;
		const defaultSortDirection = DEFAULT_FILTER_STATE.sortDirection;

		const hasSearch = search !== "";
		const hasArrayFilters = Object.values(arrayFilters).some(arr => arr.length > 0);
		const hasNonDefaultSort = sortField !== defaultSortField || sortDirection !== defaultSortDirection;

		return hasSearch || hasArrayFilters || hasNonDefaultSort;
	}, [filterState]);

	// Count active filters
	const activeFilterCount = useMemo(() => {
		const { sortField, sortDirection, search, ...arrayFilters } = filterState;
		const defaultSortField = DEFAULT_FILTER_STATE.sortField;
		const defaultSortDirection = DEFAULT_FILTER_STATE.sortDirection;

		const searchCount = search === "" ? 0 : 1;
		// Count total number of selected filter values across all arrays
		const arrayFilterCount = Object.values(arrayFilters).reduce((sum, arr) => sum + arr.length, 0);
		const sortCount = (sortField === defaultSortField ? 0 : 1) + (sortDirection === defaultSortDirection ? 0 : 1);

		return searchCount + arrayFilterCount + sortCount;
	}, [filterState]);

	return {
		filteredItems,
		filterState,
		updateFilter,
		updateSearch,
		toggleFilterValue,
		clearFilters,
		hasActiveFilters,
		activeFilterCount,
		availableOptions,
	};
}
