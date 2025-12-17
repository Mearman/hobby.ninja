"use client";

import { getGradeFamilyIds, type Item } from "@hobby-ninja/data";

import type { FilterProps } from "./types";

import { ItemFilters } from "@/components/filtering/item-filters";
import type { FilterState } from "@/hooks/use-filtered-items";

/**
 * Type guard to check if a value is a string array.
 */
const isStringArray = (value: unknown): value is string[] => {
	return Array.isArray(value) && value.every((item): item is string => typeof item === "string");
};

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
	items,
	filterCounts,
	hiddenFilters,
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

	const handleToggleGradeFamily = (rootGradeId: string) => {
		const familyIds = getGradeFamilyIds(rootGradeId);
		// Filter to only available grades
		const availableGrades = isStringArray(availableOptions.grades) ? availableOptions.grades : [];
		const availableFamilyIds = familyIds.filter(id => availableGrades.includes(id));

		const currentGrades = currentFilterState.grades;
		const selectedInFamily = availableFamilyIds.filter(id => currentGrades.includes(id));

		// If any in family are selected, deselect all; otherwise select all
		const newGrades = selectedInFamily.length > 0
			? currentGrades.filter(id => !availableFamilyIds.includes(id))
			: [...currentGrades, ...availableFamilyIds.filter(id => !currentGrades.includes(id))];

		onFilterChange({ grades: newGrades });
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

	// Build available options in the expected format using type guards
	const getBrandsArray = (): string[] => {
		return isStringArray(availableOptions.brands) ? availableOptions.brands : [];
	};
	const getGradesArray = (): string[] => {
		return isStringArray(availableOptions.grades) ? availableOptions.grades : [];
	};
	const getScalesArray = (): string[] => {
		return isStringArray(availableOptions.scales) ? availableOptions.scales : [];
	};
	const getSeriesArray = (): string[] => {
		return isStringArray(availableOptions.series) ? availableOptions.series : [];
	};
	const getCategoriesArray = (): string[] => {
		return isStringArray(availableOptions.categories) ? availableOptions.categories : [];
	};

	const formattedAvailableOptions = {
		brands: getBrandsArray(),
		grades: getGradesArray(),
		scales: getScalesArray(),
		series: getSeriesArray(),
		categories: getCategoriesArray(),
	};

	return (
		<ItemFilters
			filterState={currentFilterState}
			availableOptions={formattedAvailableOptions}
			filterCounts={filterCounts}
			onFilterChange={handleUpdateFilter}
			onSearchChange={handleUpdateSearch}
			onToggleFilterValue={handleToggleFilterValue}
			onToggleGradeFamily={handleToggleGradeFamily}
			onClearFilters={handleClearFilters}
			hasActiveFilters={hasActiveFilters}
			activeFilterCount={activeFilterCount}
			items={items}
			hiddenFilters={hiddenFilters}
		/>
	);
}
