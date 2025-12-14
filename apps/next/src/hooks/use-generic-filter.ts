import { useCallback, useMemo, useState } from "react";

export interface GenericFilterState {
	search: string;
	sortField: string;
	sortDirection: "asc" | "desc";
}

export interface SortOption<T> {
	field: string;
	compare?: (a: T, b: T) => number;
	extract?: (item: T) => string | number;
}

export interface CustomFilter<T> {
	field: string;
	filterFn: (items: T[], values: string[] | number[]) => T[];
}

export interface UseGenericFilterOptions<T> {
	items: T[];
	initialFilters?: Partial<GenericFilterState>;
	searchFields?: Array<keyof T>;
	sortOptions?: Array<SortOption<T>>;
	customFilters?: Array<CustomFilter<T>>;
}

export function useGenericFilter<T>({
	items,
	initialFilters,
	searchFields = [],
	sortOptions = [],
}: UseGenericFilterOptions<T>) {
	const [filterState, setFilterState] = useState<GenericFilterState>({
		search: "",
		sortField: "name",
		sortDirection: "asc",
		...initialFilters,
	});

	// Generic search function
	const searchItems = useCallback(
		(itemsToSearch: T[], query: string) => {
			if (!query.trim()) return itemsToSearch;

			const lowerQuery = query.toLowerCase();
			return itemsToSearch.filter((item) => {
				return searchFields.some((field) => {
					const value = item[field];
					if (typeof value === "string") {
						return value.toLowerCase().includes(lowerQuery);
					}
					if (
						typeof value === "object" &&
						value !== null &&
						!Array.isArray(value)
					) {
						// Handle localized text objects like { ja: string, en?: string }
						const objValue = value as Record<string, unknown>;
						return Object.values(objValue).some(
							(v) => typeof v === "string" && v.toLowerCase().includes(lowerQuery),
						);
					}
					return false;
				});
			});
		},
		[searchFields],
	);

	// Generic sort function
	const sortItems = useCallback(
		(itemsToSort: T[], field: string, direction: "asc" | "desc") => {
			const sortOption = sortOptions.find((option) => option.field === field);

			if (sortOption?.extract) {
				const extractFn = sortOption.extract;
				return itemsToSort.toSorted((a, b) => {
					const aValue = extractFn(a);
					const bValue = extractFn(b);
					const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
					return direction === "desc" ? -comparison : comparison;
				});
			}

			if (sortOption?.compare) {
				const compareFn = sortOption.compare;
				return itemsToSort.toSorted((a, b) => {
					const comparison = compareFn(a, b);
					return direction === "desc" ? -comparison : comparison;
				});
			}

			// Default string comparison
			return itemsToSort.toSorted((a, b) => {
				const aRaw = a[field as keyof T];
				const bRaw = b[field as keyof T];
				const aValue = aRaw !== null && aRaw !== undefined ? String(aRaw) : "";
				const bValue = bRaw !== null && bRaw !== undefined ? String(bRaw) : "";
				const comparison = aValue.localeCompare(bValue);
				return direction === "desc" ? -comparison : comparison;
			});
		},
		[sortOptions],
	);

	// Apply all filters
	const filteredItems = useMemo(() => {
		let result = [...items];

		// Apply search filter
		result = searchItems(result, filterState.search);

		// Apply custom filters - Note: This would need to be extended for additional filter fields
		// For now, this handles the base GenericFilterState

		// Apply sorting
		result = sortItems(result, filterState.sortField, filterState.sortDirection);

		return result;
	}, [items, filterState, searchItems, sortItems]);

	const updateFilter = useCallback((updates: Partial<GenericFilterState>) => {
		setFilterState((prev) => ({ ...prev, ...updates }));
	}, []);

	const clearFilters = useCallback(() => {
		setFilterState({
			search: "",
			sortField: "name",
			sortDirection: "asc",
			...initialFilters,
		});
	}, [initialFilters]);

	const hasActiveFilters = useMemo(() => {
		return filterState.search.trim() !== "";
	}, [filterState.search]);

	return {
		filteredItems,
		filterState,
		updateFilter,
		clearFilters,
		hasActiveFilters,
	};
}
