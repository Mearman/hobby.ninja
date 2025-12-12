"use client";

import { useState, useMemo, useCallback } from "react";
import { getNodeDisplayName, isItemNode, type ItemNode } from "@/lib/schemas";

export interface FilterState {
	search: string;
	brand: string;
	grade: string;
	scale: string;
	series: string;
	sortBy: string;
}

export interface FilterOptions {
	availableBrands?: string[];
	availableGrades?: string[];
	availableScales?: string[];
	availableSeries?: string[];
	defaultSort?: string;
}

export interface UseFilteredItemsReturn<T extends ItemNode> {
	filteredItems: T[];
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
	sortBy: "date-desc",
};

export function useFilteredItems<T extends ItemNode>(
	items: T[],
	options: FilterOptions = {}
): UseFilteredItemsReturn<T> {
	const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);

	// Calculate available filter options from items
	const availableOptions = useMemo(() => {
		const brands = new Set<string>();
		const grades = new Set<string>();
		const scales = new Set<string>();
		const series = new Set<string>();

		const validItems = items.filter((item): item is ItemNode => isItemNode(item));

		validItems.forEach(item => {
			if (item.brand) brands.add(item.brand);
			if (item.grade) grades.add(item.grade);
			if (item.scale) scales.add(item.scale);
			if (item.series) series.add(item.series);
		});

		return {
			brands: options.availableBrands ?? Array.from(brands).toSorted(),
			grades: options.availableGrades ?? Array.from(grades).toSorted(),
			scales: options.availableScales ?? Array.from(scales).toSorted(),
			series: options.availableSeries ?? Array.from(series).toSorted(),
		};
	}, [items, options.availableBrands, options.availableGrades, options.availableScales, options.availableSeries]);

	// Apply filters and sorting
	const filteredItems = useMemo(() => {
		// Items are already pre-filtered by category/series/brand on the server
		let filteredItems = items.filter((item): item is ItemNode => isItemNode(item));

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
		const sortBy = filterState.sortBy || options.defaultSort || "date-desc";
		switch (sortBy) {
			case "name-asc": {
				filteredItems = filteredItems.toSorted((a, b) => getNodeDisplayName(a).localeCompare(getNodeDisplayName(b)));
				break;
			}
			case "name-desc": {
				filteredItems = filteredItems.toSorted((a, b) => getNodeDisplayName(b).localeCompare(getNodeDisplayName(a)));
				break;
			}
			case "date-asc": {
				filteredItems = filteredItems.toSorted((a, b) => (a.created ?? "").localeCompare(b.created ?? ""));
				break;
			}
			case "date-desc": {
				filteredItems = filteredItems.toSorted((a, b) => (b.created ?? "").localeCompare(a.created ?? ""));
				break;
			}
			case "price-asc": {
				filteredItems = filteredItems.toSorted((a, b) => (a.price?.amount ?? 0) - (b.price?.amount ?? 0));
				break;
			}
			case "price-desc": {
				filteredItems = filteredItems.toSorted((a, b) => (b.price?.amount ?? 0) - (a.price?.amount ?? 0));
				break;
			}
			case "brand-asc": {
				filteredItems = filteredItems.toSorted((a, b) => (a.brand ?? "").localeCompare(b.brand ?? ""));
				break;
			}
			case "grade-asc": {
				filteredItems = filteredItems.toSorted((a, b) => (a.grade ?? "").localeCompare(b.grade ?? ""));
				break;
			}
			case "scale-asc": {
				filteredItems = filteredItems.toSorted((a, b) => (a.scale ?? "").localeCompare(b.scale ?? ""));
				break;
			}
			case "series-asc": {
				filteredItems = filteredItems.toSorted((a, b) => (a.series ?? "").localeCompare(b.series ?? ""));
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
		return Object.values(filterState).some(value =>
			value !== "" && value !== DEFAULT_FILTER_STATE.sortBy
		);
	}, [filterState]);

	// Count active filters
	const activeFilterCount = useMemo(() => {
		return Object.values(filterState).filter(value =>
			value !== "" && value !== DEFAULT_FILTER_STATE.sortBy
		).length;
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