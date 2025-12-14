"use client";

import type { Item } from "@hobby-ninja/data";

import type { FilterProps } from "./types";

import { ItemFilters } from "@/components/filtering/item-filters";
import type { FilterState } from "@/hooks/use-filtered-items";

/**
 * Wrapper component that adapts ItemFilters to work with the generic list abstraction.
 *
 * The generic list abstraction provides basic filter state management,
 * but ItemFilters needs additional methods like updateSearch and toggleFilterValue.
 * This wrapper component bridges the gap by providing those methods
 * derived from the onFilterChange callback.
 */
export function ItemFiltersWrapper({
	filterState,
	availableOptions,
	onFilterChange,
}: FilterProps<Item, FilterState>) {
	const currentFilterState = filterState;

	// Derive the specialized methods from the generic onFilterChange
	const handleUpdateFilter = (updates: Partial<FilterState>) => {
		onFilterChange(updates);
	};

	const handleUpdateSearch = (value: string) => {
		onFilterChange({ search: value });
	};

	const handleToggleFilterValue = (
		field: "brands" | "grades" | "scales" | "series" | "categories",
		value: string,
	) => {
		const currentValues = currentFilterState[field];
		const newValues = currentValues.includes(value)
			? currentValues.filter((v) => v !== value)
			: [...currentValues, value];
		onFilterChange({ [field]: newValues });
	};

	const handleClearFilters = () => {
		onFilterChange({
			search: "",
			brands: [],
			grades: [],
			scales: [],
			series: [],
			categories: [],
			sortField: "date",
			sortDirection: "desc",
		});
	};

	// Calculate active filters
	const hasActiveFilters = Boolean(
		currentFilterState.search ||
		currentFilterState.brands.length > 0 ||
		currentFilterState.grades.length > 0 ||
		currentFilterState.scales.length > 0 ||
		currentFilterState.series.length > 0 ||
		currentFilterState.categories.length > 0 ||
		currentFilterState.sortField !== "date" ||
		currentFilterState.sortDirection !== "desc",
	);

	const activeFilterCount =
		(currentFilterState.search ? 1 : 0) +
		currentFilterState.brands.length +
		currentFilterState.grades.length +
		currentFilterState.scales.length +
		currentFilterState.series.length +
		currentFilterState.categories.length +
		(currentFilterState.sortField === "date" ? 0 : 1) +
		(currentFilterState.sortDirection === "desc" ? 0 : 1);

	// Build available options in the expected format
	const formattedAvailableOptions = {
		brands: availableOptions.brands ?? [],
		grades: availableOptions.grades ?? [],
		scales: availableOptions.scales ?? [],
		series: availableOptions.series ?? [],
		categories: availableOptions.categories ?? [],
	};

	return (
		<ItemFilters
			filterState={currentFilterState}
			availableOptions={formattedAvailableOptions}
			onFilterChange={handleUpdateFilter}
			onSearchChange={handleUpdateSearch}
			onToggleFilterValue={handleToggleFilterValue}
			onClearFilters={handleClearFilters}
			hasActiveFilters={hasActiveFilters}
			activeFilterCount={activeFilterCount}
		/>
	);
}
