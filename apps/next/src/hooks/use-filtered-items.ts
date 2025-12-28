"use client";

import { getGradeFamilyIds, getGradeSortOrder, getNodeDisplayName, getNodeReleaseDateSortable, isItem, sortGradeIds, type Item } from "@hobby-ninja/data";
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
	scaleRange: [number, number] | null;
	series: string[];
	categories: string[];
	tags: string[];
	dateRange: [string, string] | null;
	showNoDate: boolean;
	sortField: string;
	sortDirection: "asc" | "desc";
}

export interface FilterOptions {
	availableBrands?: string[];
	availableGrades?: string[];
	availableScales?: string[];
	availableSeries?: string[];
	availableCategories?: string[];
	availableTags?: string[];
	defaultSort?: string;
}

export interface FilterCounts {
	brands: Record<string, number>;
	grades: Record<string, number>;
	scales: Record<string, number>;
	series: Record<string, number>;
	categories: Record<string, number>;
	tags: Record<string, number>;
	[key: string]: Record<string, number>;
}

export interface UseFilteredItemsReturn {
	filteredItems: Item[];
	filterState: FilterState;
	updateFilter: (updates: Partial<FilterState>) => void;
	updateSearch: (value: string) => void;
	toggleFilterValue: (field: keyof Pick<FilterState, "brands" | "grades" | "scales" | "series" | "categories" | "tags">, value: string) => void;
	toggleGradeFamily: (rootGradeId: string) => void;
	clearFilters: () => void;
	hasActiveFilters: boolean;
	activeFilterCount: number;
	availableOptions: {
		brands: string[];
		grades: string[];
		scales: string[];
		series: string[];
		categories: string[];
		tags: string[];
	};
	filterCounts: FilterCounts;
}

const DEFAULT_FILTER_STATE: FilterState = {
	search: "",
	brands: [],
	grades: [],
	scales: [],
	scaleRange: null,
	series: [],
	categories: [],
	tags: [],
	dateRange: null,
	showNoDate: false,
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
		const tags = new Set<string>();

		const validItems: Item[] = items.filter((item): item is Item => isItem(item));

		// Track if we have items with no data for each category
		let hasItemsWithNoBrand = false;
		let hasItemsWithNoSeries = false;
		let hasItemsWithNoGrade = false;
		let hasItemsWithNoScale = false;

		for (const item of validItems) {
			// Use array-based IDs from the data package
			for (const brand of item.brands) {
				brands.add(brand.id);
			}
			// Collect grades from object: both root keys and specific values
			for (const rootGrade of Object.keys(item.grades)) {
				grades.add(rootGrade);
			}
			for (const specificGrades of Object.values(item.grades)) {
				for (const specific of specificGrades) {
					grades.add(specific);
				}
			}
			for (const scale of item.scales) {
				scales.add(scale);
			}
			for (const s of item.series) {
				series.add(s.id);
			}
			for (const c of item.categories) {
				categories.add(c.id);
			}
			// Collect tag (distribution channel) - use normalized ID (lowercase, hyphenated)
			const itemTag = (item as Record<string, unknown>).tag as { ja: string; en?: string } | undefined;
			if (itemTag?.en) {
				const tagId = itemTag.en.toLowerCase().replaceAll(/\s+/g, "-");
				tags.add(tagId);
			}

			// Check for items with no data
			if ((item.brands).length === 0) hasItemsWithNoBrand = true;
			if ((item.series).length === 0) hasItemsWithNoSeries = true;
			if (Object.keys(item.grades).length === 0) hasItemsWithNoGrade = true;
			if (item.scales.length === 0) hasItemsWithNoScale = true;
		}

		// Add "Other" options if we have items with no data
		if (hasItemsWithNoBrand) brands.add("Other");
		if (hasItemsWithNoSeries) series.add("Other");
		if (hasItemsWithNoGrade) grades.add("Other");
		if (hasItemsWithNoScale) scales.add("Other");

		// Sort functions that place "Other" at the end
		const sortWithOtherLast = (a: string, b: string) => {
			if (a === "Other") return 1;
			if (b === "Other") return -1;
			return a.localeCompare(b);
		};

		const sortGradesWithOtherLast = (a: string, b: string) => {
			if (a === "Other") return 1;
			if (b === "Other") return -1;
			return sortGradeIds([a, b])[0] === a ? -1 : 1;
		};

		const sortScalesWithOtherLast = (a: string, b: string) => {
			if (a === "Other") return 1;
			if (b === "Other") return -1;
			const denomA = parseScaleDenominator(a);
			const denomB = parseScaleDenominator(b);
			return denomA - denomB;
		};

		return {
			brands: [...brands].toSorted(sortWithOtherLast),
			grades: sortGradeIds([...grades]).toSorted(sortGradesWithOtherLast),
			scales: sortScales([...scales]).toSorted(sortScalesWithOtherLast),
			series: [...series].toSorted(sortWithOtherLast),
			categories: [...categories].toSorted(sortWithOtherLast),
			tags: [...tags].toSorted((a, b) => a.localeCompare(b)),
		};
	}, [items]);

	// Calculate filter counts (items matching each filter option with current filters applied)
	const filterCounts = useMemo((): FilterCounts => {
		const validItems: Item[] = items.filter((item): item is Item => isItem(item));

		const brandCounts: Record<string, number> = {};
		const gradeCounts: Record<string, number> = {};
		const scaleCounts: Record<string, number> = {};
		const seriesCounts: Record<string, number> = {};
		const categoryCounts: Record<string, number> = {};
		const tagCounts: Record<string, number> = {};

		// Initialize counts with available options
		for (const brand of availableOptions.brands) { brandCounts[brand] = 0; }
		for (const grade of availableOptions.grades) { gradeCounts[grade] = 0; }
		for (const scale of availableOptions.scales) { scaleCounts[scale] = 0; }
		for (const series of availableOptions.series) { seriesCounts[series] = 0; }
		for (const category of availableOptions.categories) { categoryCounts[category] = 0; }
		for (const tag of availableOptions.tags) { tagCounts[tag] = 0; }

		// Helper function to apply global filters (search, date range, scale range)
		const applyGlobalFilters = (items: Item[]): Item[] => {
			let result = [...items];

			// Apply search filter
			if (filterState.search) {
				const query = filterState.search.toLowerCase();
				result = result.filter(item => {
					const name = getNodeDisplayName(item).toLowerCase();
					const brandIds = (item.brands).map(b => b.id).join(" ").toLowerCase();
					const seriesIds = (item.series).map(s => s.id).join(" ").toLowerCase();
					const gradesMatch =
						Object.keys(item.grades).some(g => g.toLowerCase().includes(query)) ||
						Object.values(item.grades).flat().some(g => g.toLowerCase().includes(query));
					const scalesMatch = item.scales.some(s => s.toLowerCase().includes(query));
					return (
						name.includes(query) ||
						brandIds.includes(query) ||
						seriesIds.includes(query) ||
						gradesMatch ||
						scalesMatch
					);
				});
			}

			// Apply scale range filter
			if (filterState.scaleRange) {
				const [minDenom, maxDenom] = filterState.scaleRange;
				result = result.filter(item => {
					if (item.scales.length === 0) return false;
					// Match if ANY of the item's scales falls within the range
					return item.scales.some(scale => {
						const denom = parseScaleDenominator(scale);
						return denom >= minDenom && denom <= maxDenom;
					});
				});
			}

			// Apply date range filter
			if (filterState.dateRange || filterState.showNoDate) {
				result = result.filter(item => {
					const itemDateStr = getNodeReleaseDateSortable(item);
					const hasNoDate = !itemDateStr;

					if (hasNoDate && filterState.showNoDate) {
						return true;
					}

					if (filterState.dateRange && !hasNoDate) {
						const [startDate, endDate] = filterState.dateRange;
						return itemDateStr >= startDate && itemDateStr <= endDate;
					}

					if (!filterState.dateRange && !hasNoDate) {
						return true;
					}

					return false;
				});
			}

			return result;
		};

		// Helper function to apply filters from the same type (within-type intersection)
		const applyFiltersWithinType = (items: Item[], filterType: "brands" | "grades" | "scales" | "series" | "categories" | "tags", selectedValues: string[]): Item[] => {
			if (selectedValues.length === 0) {
				return items;
			}

			return items.filter(item => {
				switch (filterType) {
					case "brands":
					{
						const hasOtherBrand = selectedValues.includes("Other");
						const hasNoBrands = (item.brands).length === 0;
						const hasMatchingBrand = (item.brands).some(b => selectedValues.includes(b.id));
						return hasOtherBrand ? (hasNoBrands || hasMatchingBrand) : hasMatchingBrand;
					}
					case "grades":
					{
						const hasOtherGrade = selectedValues.includes("Other");
						const hasNoGrades = Object.keys(item.grades).length === 0;
						const hasMatchingGrade = selectedValues.some(
							(selectedGrade) =>
								selectedGrade in item.grades ||
									Object.values(item.grades).flat().includes(selectedGrade),
						);
						return hasOtherGrade ? (hasNoGrades || hasMatchingGrade) : hasMatchingGrade;
					}
					case "scales":
					{
						const hasOtherScale = selectedValues.includes("Other");
						const hasNoScale = item.scales.length === 0;
						const hasMatchingScale = item.scales.some(s => selectedValues.includes(s));
						return hasOtherScale ? (hasNoScale || hasMatchingScale) : hasMatchingScale;
					}
					case "series":
					{
						const hasOtherSeries = selectedValues.includes("Other");
						const hasNoSeries = (item.series).length === 0;
						const hasMatchingSeries = (item.series).some(s => selectedValues.includes(s.id));
						return hasOtherSeries ? (hasNoSeries || hasMatchingSeries) : hasMatchingSeries;
					}
					case "categories": {
						return (item.categories).some(c => selectedValues.includes(c.id));
					}
					case "tags": {
						const itemTag = (item as Record<string, unknown>).tag as { ja: string; en?: string } | undefined;
						if (!itemTag?.en) return false;
						const tagId = itemTag.en.toLowerCase().replaceAll(/\s+/g, "-");
						return selectedValues.includes(tagId);
					}
					default: {
						return true;
					}
				}
			});
		};

		// Helper function to apply filters from DIFFERENT types only (ignoring same-type filters)
		// This creates the most intuitive behavior: brands don't affect other brands, but affect grades, etc.
		const applyFiltersFromDifferentTypes = (items: Item[], excludeFilterType: "brands" | "grades" | "scales" | "series" | "categories" | "tags"): Item[] => {
			let result = applyGlobalFilters(items);

			// Apply filters from different types only (cross-type intersection)
			if (excludeFilterType !== "brands" && filterState.brands.length > 0) {
				result = applyFiltersWithinType(result, "brands", filterState.brands);
			}

			if (excludeFilterType !== "grades" && filterState.grades.length > 0) {
				result = applyFiltersWithinType(result, "grades", filterState.grades);
			}

			if (excludeFilterType !== "scales" && filterState.scales.length > 0) {
				result = applyFiltersWithinType(result, "scales", filterState.scales);
			}

			if (excludeFilterType !== "series" && filterState.series.length > 0) {
				result = applyFiltersWithinType(result, "series", filterState.series);
			}

			if (excludeFilterType !== "categories" && filterState.categories.length > 0) {
				result = applyFiltersWithinType(result, "categories", filterState.categories);
			}

			if (excludeFilterType !== "tags" && filterState.tags.length > 0) {
				result = applyFiltersWithinType(result, "tags", filterState.tags);
			}

			return result;
		};

		// Count items for each filter option using intuitive logic (ignore same-type filters, apply cross-type filters)
		for (const brand of availableOptions.brands) {
			const itemsWithBrand = validItems.filter(item =>
				brand === "Other"
					? (item.brands).length === 0
					: (item.brands).some(b => b.id === brand),
			);
			// Apply filters from different types only (brands don't affect other brand counts)
			const visibleItemsWithBrand = applyFiltersFromDifferentTypes(itemsWithBrand, "brands");
			brandCounts[brand] = visibleItemsWithBrand.length;
		}

		for (const grade of availableOptions.grades) {
			const itemsWithGrade = validItems.filter(item =>
				grade === "Other"
					? Object.keys(item.grades).length === 0
					: grade in item.grades || Object.values(item.grades).flat().includes(grade),
			);
			// Apply filters from different types only (grades don't affect other grade counts)
			const visibleItemsWithGrade = applyFiltersFromDifferentTypes(itemsWithGrade, "grades");
			gradeCounts[grade] = visibleItemsWithGrade.length;
		}

		for (const scale of availableOptions.scales) {
			const itemsWithScale = validItems.filter(item =>
				scale === "Other"
					? item.scales.length === 0
					: item.scales.includes(scale),
			);
			// Apply filters from different types only (scales don't affect other scale counts)
			const visibleItemsWithScale = applyFiltersFromDifferentTypes(itemsWithScale, "scales");
			scaleCounts[scale] = visibleItemsWithScale.length;
		}

		for (const seriesOpt of availableOptions.series) {
			const itemsWithSeries = validItems.filter(item =>
				seriesOpt === "Other"
					? (item.series).length === 0
					: (item.series).some(s => s.id === seriesOpt),
			);
			// Apply filters from different types only (series don't affect other series counts)
			const visibleItemsWithSeries = applyFiltersFromDifferentTypes(itemsWithSeries, "series");
			seriesCounts[seriesOpt] = visibleItemsWithSeries.length;
		}

		for (const category of availableOptions.categories) {
			const itemsWithCategory = validItems.filter(item =>
				(item.categories).some(c => c.id === category),
			);
			// Apply filters from different types only (categories don't affect other category counts)
			const visibleItemsWithCategory = applyFiltersFromDifferentTypes(itemsWithCategory, "categories");
			categoryCounts[category] = visibleItemsWithCategory.length;
		}

		for (const tag of availableOptions.tags) {
			const itemsWithTag = validItems.filter(item => {
				const itemTag = (item as Record<string, unknown>).tag as { ja: string; en?: string } | undefined;
				if (!itemTag?.en) return false;
				const tagId = itemTag.en.toLowerCase().replaceAll(/\s+/g, "-");
				return tagId === tag;
			});
			// Apply filters from different types only (tags don't affect other tag counts)
			const visibleItemsWithTag = applyFiltersFromDifferentTypes(itemsWithTag, "tags");
			tagCounts[tag] = visibleItemsWithTag.length;
		}

		return {
			brands: brandCounts,
			grades: gradeCounts,
			scales: scaleCounts,
			series: seriesCounts,
			categories: categoryCounts,
			tags: tagCounts,
		};
	}, [items, filterState, availableOptions]);

	// Apply filters and sorting
	const filteredItems = useMemo((): Item[] => {
		// Items are already pre-filtered by category/series/brand on the server
		let result: Item[] = items.filter((item): item is Item => isItem(item));

		// Apply search filter
		if (filterState.search) {
			const query = filterState.search.toLowerCase();
			result = result.filter(item => {
				const name = getNodeDisplayName(item).toLowerCase();
				const brandIds = (item.brands).map(b => b.id).join(" ").toLowerCase();
				const seriesIds = (item.series).map(s => s.id).join(" ").toLowerCase();
				// Search in grades object (root keys + specific values)
				const gradesMatch =
					Object.keys(item.grades).some(g => g.toLowerCase().includes(query)) ||
					Object.values(item.grades).flat().some(g => g.toLowerCase().includes(query));
				const scalesMatch = item.scales.some(s => s.toLowerCase().includes(query));
				return (
					name.includes(query) ||
					brandIds.includes(query) ||
					seriesIds.includes(query) ||
					gradesMatch ||
					scalesMatch
				);
			});
		}

		// Apply brand filter
		if (filterState.brands.length > 0) {
			result = result.filter(item => {
				const hasOtherBrand = filterState.brands.includes("Other");
				const hasNoBrands = (item.brands).length === 0;
				const hasMatchingBrand = (item.brands).some(b => filterState.brands.includes(b.id));

				return hasOtherBrand ? (hasNoBrands || hasMatchingBrand) : hasMatchingBrand;
			});
		}
		// Grade filter: matches if any selected grade is a root key OR in any specific grades array
		if (filterState.grades.length > 0) {
			result = result.filter(item => {
				const hasOtherGrade = filterState.grades.includes("Other");
				const hasNoGrades = Object.keys(item.grades).length === 0;
				const hasMatchingGrade = filterState.grades.some(
					(selectedGrade) =>
						selectedGrade in item.grades ||
						Object.values(item.grades).flat().includes(selectedGrade),
				);

				return hasOtherGrade ? (hasNoGrades || hasMatchingGrade) : hasMatchingGrade;
			});
		}
		if (filterState.scales.length > 0) {
			result = result.filter(item => {
				const hasOtherScale = filterState.scales.includes("Other");
				const hasNoScale = item.scales.length === 0;
				const hasMatchingScale = item.scales.some(s => filterState.scales.includes(s));

				return hasOtherScale ? (hasNoScale || hasMatchingScale) : hasMatchingScale;
			});
		}

		// Apply scale range filter (if active)
		if (filterState.scaleRange) {
			const [minDenom, maxDenom] = filterState.scaleRange;
			result = result.filter(item => {
				if (item.scales.length === 0) return false;
				// Match if ANY of the item's scales falls within the range
				return item.scales.some(scale => {
					const denom = parseScaleDenominator(scale);
					return denom >= minDenom && denom <= maxDenom;
				});
			});
		}

		// Apply date filter (if active)
		if (filterState.dateRange || filterState.showNoDate) {
			result = result.filter(item => {
				const itemDateStr = getNodeReleaseDateSortable(item);
				const hasNoDate = !itemDateStr;

				// If no date filter is active, include items without dates
				if (hasNoDate && filterState.showNoDate) {
					return true;
				}

				// If date range filter is active, check if item with date falls within range
				if (filterState.dateRange && !hasNoDate) {
					const [startDate, endDate] = filterState.dateRange;
					return itemDateStr >= startDate && itemDateStr <= endDate;
				}

				// If date range is not active but we have a date, include it
				if (!filterState.dateRange && !hasNoDate) {
					return true;
				}

				// If neither condition is met, exclude the item
				return false;
			});
		}
		// Apply series filter
		if (filterState.series.length > 0) {
			result = result.filter(item => {
				const hasOtherSeries = filterState.series.includes("Other");
				const hasNoSeries = (item.series).length === 0;
				const hasMatchingSeries = (item.series).some(s => filterState.series.includes(s.id));

				return hasOtherSeries ? (hasNoSeries || hasMatchingSeries) : hasMatchingSeries;
			});
		}
		if (filterState.categories.length > 0) {
			result = result.filter(item =>
				(item.categories).some(c => filterState.categories.includes(c.id)),
			);
		}

		// Apply tags filter
		if (filterState.tags.length > 0) {
			result = result.filter(item => {
				const itemTag = (item as Record<string, unknown>).tag as { ja: string; en?: string } | undefined;
				if (!itemTag?.en) return false;
				const tagId = itemTag.en.toLowerCase().replaceAll(/\s+/g, "-");
				return filterState.tags.includes(tagId);
			});
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
					? result.toSorted((a, b) => (a.brands[0]?.id ?? "").localeCompare(b.brands[0]?.id ?? ""))
					: result.toSorted((a, b) => (b.brands[0]?.id ?? "").localeCompare(a.brands[0]?.id ?? ""));
				break;
			}
			case "grade": {
				// Get primary grade's sort order (lower = simpler grade)
				// Items without grades sort to end (sortOrder 999 is returned by getGradeSortOrder for unknown grades)
				const getPrimaryGradeSortOrder = (item: Item): number => {
					const rootGrades = Object.keys(item.grades);
					const primaryGrade = rootGrades[0] ?? "";
					return getGradeSortOrder(primaryGrade);
				};
				result = sortDirection === "asc"
					? result.toSorted((a, b) => getPrimaryGradeSortOrder(a) - getPrimaryGradeSortOrder(b))
					: result.toSorted((a, b) => getPrimaryGradeSortOrder(b) - getPrimaryGradeSortOrder(a));
				break;
			}
			case "scale": {
				// Sort by primary (first) scale; items without scales sort to end
				result = sortDirection === "asc"
					? result.toSorted((a, b) => (a.scales[0] ?? "zzz").localeCompare(b.scales[0] ?? "zzz"))
					: result.toSorted((a, b) => (b.scales[0] ?? "").localeCompare(a.scales[0] ?? ""));
				break;
			}
			case "series": {
				result = sortDirection === "asc"
					? result.toSorted((a, b) => (a.series[0]?.id ?? "").localeCompare(b.series[0]?.id ?? ""))
					: result.toSorted((a, b) => (b.series[0]?.id ?? "").localeCompare(a.series[0]?.id ?? ""));
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
		field: keyof Pick<FilterState, "brands" | "grades" | "scales" | "series" | "categories" | "tags">,
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

	// Toggle all grades in a family (root + children) with smart selection
	const toggleGradeFamily = useCallback((rootGradeId: string) => {
		const familyIds = getGradeFamilyIds(rootGradeId);
		// Filter to only available grades
		const availableFamilyIds = familyIds.filter(id => availableOptions.grades.includes(id));

		// IMPORTANT: Only include grades that actually have items (can be selected in the UI)
		const selectableFamilyIds = availableFamilyIds.filter(gradeId => {
			const totalCount = filterCounts.grades[gradeId] ?? 0;
			return totalCount > 0;
		});

		setFilterState(prev => {
			const currentGrades = prev.grades;
			// Check how many family grades are currently selected (only selectable ones)
			const selectedFamilyCount = selectableFamilyIds.filter(grade => currentGrades.includes(grade)).length;

			let newGrades: string[];
			if (selectedFamilyCount === 0) {
				// Initial click: select all SELECTABLE family members
				newGrades = [...currentGrades];
				for (const grade of selectableFamilyIds) {
					if (!newGrades.includes(grade)) {
						newGrades.push(grade);
					}
				}
			} else {
				// Subsequent click: deselect all family members
				newGrades = currentGrades.filter(grade => !selectableFamilyIds.includes(grade));
			}

			return { ...prev, grades: newGrades };
		});
	}, [availableOptions.grades, filterCounts]);

	// Clear all filters
	const clearFilters = useCallback(() => {
		setFilterState(DEFAULT_FILTER_STATE);
	}, []);

	// Check if any filters are active
	const hasActiveFilters = useMemo(() => {
		const { sortField, sortDirection, search, scaleRange, dateRange, showNoDate, ...arrayFilters } = filterState;
		const defaultSortField = DEFAULT_FILTER_STATE.sortField;
		const defaultSortDirection = DEFAULT_FILTER_STATE.sortDirection;

		const hasSearch = search !== "";
		const hasArrayFilters = Object.values(arrayFilters).some(arr => arr.length > 0);
		const hasNonDefaultSort = sortField !== defaultSortField || sortDirection !== defaultSortDirection;
		const hasNonDefaultScaleRange = scaleRange !== null;
		const hasDateRange = dateRange !== null;
		const hasNoDateFilter = showNoDate;

		return hasSearch || hasArrayFilters || hasNonDefaultSort || hasNonDefaultScaleRange || hasDateRange || hasNoDateFilter;
	}, [filterState]);

	// Count active filters
	const activeFilterCount = useMemo(() => {
		const { sortField, sortDirection, search, scaleRange, dateRange, showNoDate, ...arrayFilters } = filterState;
		const defaultSortField = DEFAULT_FILTER_STATE.sortField;
		const defaultSortDirection = DEFAULT_FILTER_STATE.sortDirection;

		const searchCount = search === "" ? 0 : 1;
		// Count total number of selected filter values across all arrays
		const arrayFilterCount = Object.values(arrayFilters).reduce((sum, arr) => sum + arr.length, 0);
		const sortCount = (sortField === defaultSortField ? 0 : 1) + (sortDirection === defaultSortDirection ? 0 : 1);
		const scaleRangeCount = scaleRange === null ? 0 : 1;
		const dateRangeCount = dateRange === null ? 0 : 1;
		const noDateCount = showNoDate ? 1 : 0;

		return searchCount + arrayFilterCount + sortCount + scaleRangeCount + dateRangeCount + noDateCount;
	}, [filterState]);

	return {
		filteredItems,
		filterState,
		updateFilter,
		updateSearch,
		toggleFilterValue,
		toggleGradeFamily,
		clearFilters,
		hasActiveFilters,
		activeFilterCount,
		availableOptions,
		filterCounts,
	};
}
