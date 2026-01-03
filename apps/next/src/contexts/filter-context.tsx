"use client";

import type { Brand, Category, GradeData, Item, ScaleData, Series } from "@hobby-ninja/data";
import { getGradeFamilyIds, getGradesHierarchy } from "@hobby-ninja/data";
import { debounce } from "lodash-es";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { YearData } from "@/components/homepage-client";
import { incrementFilterUsage, type FilterType } from "@/lib/collection-storage";
import { TIMING } from "@/lib/constants";
import { itemHasGlobalSite, itemHasManual } from "@/lib/relationship-utils";

// ============================================================================
// Types
// ============================================================================

/** Array-based filter types (multi-select) */
export type ArrayFilterType = "categories" | "series" | "brands" | "grades" | "scales" | "years";

/** Filter state for all filter types */
export interface FilterState {
	categories: string[];
	series: string[];
	brands: string[];
	grades: string[];
	scales: string[];
	years: string[];
	/** Filter to only show items that have manuals */
	hasManual: boolean;
	/** Filter to only show items that have global site links */
	hasGlobalSite: boolean;
}

/** ID used for "Other" filter option (items without values) */
export const OTHER_FILTER_ID = "__other__";

/** Entity data passed from server for filter operations */
export interface FilterEntityData {
	categories: Category[];
	series: Series[];
	brands: Brand[];
	grades: GradeData[];
	scales: ScaleData[];
	years: YearData[];
	items: Item[];
}

/** Filter preset definition */
export interface FilterPreset {
	id: string;
	label: string;
	filters: Partial<FilterState>;
}

// ============================================================================
// Context
// ============================================================================

interface FilterContextValue {
	// Whether entity data is available (filters are usable)
	isReady: boolean;

	// Current filter state
	filters: FilterState;

	// Filter toggle operations
	toggleFilter: (type: ArrayFilterType, id: string) => void;
	setFilters: (filters: FilterState) => void;

	// Clear operations
	clearFilters: () => void;
	clearFilterType: (type: ArrayFilterType) => void;

	// Select all operations
	selectAllInType: (type: ArrayFilterType) => void;

	// Boolean filter toggles
	toggleHasManual: () => void;
	toggleHasGlobalSite: () => void;

	// Grade family operations (for hierarchical grade selection)
	toggleGradeFamily: (rootId: string) => void;
	expandedFamilies: Set<string>;
	setExpandedFamilies: React.Dispatch<React.SetStateAction<Set<string>>>;

	// Computed values
	hasActiveFilters: boolean;
	selectedCount: number;
	filteredItemCount: number;

	// Entity data for filter options (may be empty if not ready)
	entityData: FilterEntityData;

	// "Other" counts (items without category/series/etc.)
	otherCounts: Record<ArrayFilterType, number>;

	// Presets
	presets: FilterPreset[];
	applyPreset: (preset: FilterPreset) => void;
	isPresetActive: (preset: FilterPreset) => boolean;

	// Registration for entity data (called by homepage)
	registerEntityData: (data: FilterEntityData) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

/** Empty entity data for when filters aren't initialized */
const EMPTY_ENTITY_DATA: FilterEntityData = {
	categories: [],
	series: [],
	brands: [],
	grades: [],
	scales: [],
	years: [],
	items: [],
};

// ============================================================================
// Empty filter state
// ============================================================================

const EMPTY_FILTERS: FilterState = {
	categories: [],
	series: [],
	brands: [],
	grades: [],
	scales: [],
	years: [],
	hasManual: false,
	hasGlobalSite: false,
};

// ============================================================================
// Default presets
// ============================================================================

const DEFAULT_PRESETS: FilterPreset[] = [
	{ id: "hg", label: "HG", filters: { grades: ["hg"] } },
	{ id: "mg", label: "MG", filters: { grades: ["mg"] } },
	{ id: "rg", label: "RG", filters: { grades: ["rg"] } },
	{ id: "pg", label: "PG", filters: { grades: ["pg"] } },
	{ id: "2024", label: "2024", filters: { years: ["2024"] } },
	{ id: "2025", label: "2025", filters: { years: ["2025"] } },
];

// ============================================================================
// URL Sync Helpers
// ============================================================================

/** URL param keys for filter state */
const URL_PARAM_KEYS: Array<keyof FilterState> = [
	"categories", "series", "brands", "grades", "scales", "years",
	"hasManual", "hasGlobalSite",
];

/** Parse filter state from URL search params */
function parseFiltersFromUrl(searchParams: URLSearchParams): Partial<FilterState> {
	const parsed: Partial<FilterState> = {};

	for (const key of URL_PARAM_KEYS) {
		const value = searchParams.get(key);
		if (!value) continue;

		// Boolean filters vs array filters
		const isBooleanKey = key === "hasManual" || key === "hasGlobalSite";
		(parsed as Record<string, boolean | string[]>)[key] = isBooleanKey
			? value === "true"
			: value.split(",").filter(Boolean);
	}

	return parsed;
}

/** Serialize filter state to URL search params */
function serializeFiltersToUrl(filters: FilterState): URLSearchParams {
	const params = new URLSearchParams();

	// Only add non-empty array filters
	const arrayKeys: ArrayFilterType[] = ["categories", "series", "brands", "grades", "scales", "years"];
	for (const key of arrayKeys) {
		const values = filters[key];
		if (values.length > 0) {
			params.set(key, values.join(","));
		}
	}

	// Add boolean filters only if true
	if (filters.hasManual) params.set("hasManual", "true");
	if (filters.hasGlobalSite) params.set("hasGlobalSite", "true");

	return params;
}

// ============================================================================
// Provider
// ============================================================================

interface FilterProviderProps {
	children: ReactNode;
	/** Entity data - if not provided, must be registered via registerEntityData */
	entityData?: FilterEntityData;
}

export function FilterProvider({ children, entityData: initialEntityData }: FilterProviderProps) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const isInitializedRef = useRef(false);
	const skipUrlSyncRef = useRef(false);

	// Entity data state - can be set via props or registration
	const [registeredEntityData, setRegisteredEntityData] = useState<FilterEntityData | null>(
		initialEntityData ?? null,
	);

	// Use registered data, falling back to empty
	const entityData = registeredEntityData ?? EMPTY_ENTITY_DATA;
	const isReady = registeredEntityData !== null;

	// Register entity data (called by homepage when it mounts)
	const registerEntityData = useCallback((data: FilterEntityData) => {
		setRegisteredEntityData(data);
	}, []);

	// Initialize filters from URL params (lazy initializer runs once)
	const [filters, setFiltersState] = useState<FilterState>(() => {
		const urlFilters = parseFiltersFromUrl(searchParams);
		return { ...EMPTY_FILTERS, ...urlFilters };
	});
	const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

	// Get grade hierarchy for family operations
	const gradeHierarchy = useMemo(() => getGradesHierarchy(), []);

	// P-Bandai child brand IDs - filtered from display
	const PBANDAI_CHILD_IDS = useMemo(() =>
		new Set(["pb_gunpla", "pb_hg", "pb_mg", "pb_rg", "pb_pg", "pb_bb", "pb_others", "pb_charapla"]),
	[]);

	// Filter out P-Bandai child brands
	const displayBrands = useMemo(
		() => entityData.brands.filter((b) => !PBANDAI_CHILD_IDS.has(b.id)),
		[entityData.brands, PBANDAI_CHILD_IDS],
	);

	// Count items without categories/series/brands/grades/scales/years
	const otherCounts = useMemo(() => ({
		categories: entityData.items.filter((item) => item.categories.length === 0).length,
		series: entityData.items.filter((item) => item.series.length === 0).length,
		brands: entityData.items.filter((item) => item.brands.length === 0).length,
		grades: entityData.items.filter((item) => Object.keys(item.grades).length === 0).length,
		scales: entityData.items.filter((item) => item.scales.length === 0).length,
		years: entityData.items.filter((item) => !item.releaseDate?.year || item.releaseDate.year <= 0).length,
	}), [entityData.items]);

	// Toggle a single filter value
	const toggleFilter = useCallback((type: ArrayFilterType, id: string) => {
		setFiltersState((prev) => {
			const current = prev[type];
			const isSelected = current.includes(id);

			// Track usage when filter is turned ON (not when turned off)
			if (!isSelected) {
				// Fire and forget - don't await
				incrementFilterUsage(type as FilterType, id).catch(() => {
					// Silently ignore storage errors
				});
			}

			return {
				...prev,
				[type]: isSelected
					? current.filter((i) => i !== id)
					: [...current, id],
			};
		});
	}, []);

	// Set filters directly
	const setFilters = useCallback((newFilters: FilterState) => {
		setFiltersState(newFilters);
	}, []);

	// Clear all filters
	const clearFilters = useCallback(() => {
		setFiltersState(EMPTY_FILTERS);
		setExpandedFamilies(new Set());
	}, []);

	// Clear a specific filter type
	const clearFilterType = useCallback((type: ArrayFilterType) => {
		setFiltersState((prev) => ({ ...prev, [type]: [] }));
		if (type === "grades") {
			setExpandedFamilies(new Set());
		}
	}, []);

	// Select all items in a filter type
	const selectAllInType = useCallback((type: ArrayFilterType) => {
		setFiltersState((prev) => {
			let allIds: string[];
			switch (type) {
				case "categories": {
					allIds = entityData.categories.map((c) => c.id);
					break;
				}
				case "series": {
					allIds = entityData.series.map((s) => s.id);
					break;
				}
				case "brands": {
					allIds = displayBrands.map((b) => b.id);
					break;
				}
				case "grades": {
					allIds = entityData.grades.map((g) => g.id);
					// Expand all grade families when selecting all
					setExpandedFamilies(new Set(
						gradeHierarchy
							.filter((entry) => entry.children.length > 0)
							.map((entry) => entry.root.id),
					));
					break;
				}
				case "scales": {
					allIds = entityData.scales.map((s) => s.id);
					break;
				}
				case "years": {
					allIds = entityData.years.map((y) => y.id);
					break;
				}
			}
			// Include OTHER_FILTER_ID if there are items in "other" category
			const hasOther = otherCounts[type] > 0;
			return { ...prev, [type]: hasOther ? [...allIds, OTHER_FILTER_ID] : allIds };
		});
	}, [entityData, displayBrands, gradeHierarchy, otherCounts]);

	// Toggle boolean filters
	const toggleHasManual = useCallback(() => {
		setFiltersState((prev) => ({ ...prev, hasManual: !prev.hasManual }));
	}, []);

	const toggleHasGlobalSite = useCallback(() => {
		setFiltersState((prev) => ({ ...prev, hasGlobalSite: !prev.hasGlobalSite }));
	}, []);

	// Toggle all grades in a family (select/deselect entire family)
	const toggleGradeFamily = useCallback((rootId: string) => {
		const familyIds = getGradeFamilyIds(rootId);
		setFiltersState((prev) => {
			const currentGrades = prev.grades;
			const anySelected = familyIds.some((id) => currentGrades.includes(id));

			if (anySelected) {
				// Deselect all family grades and collapse - don't track usage
				setExpandedFamilies((prevExp) => {
					const next = new Set(prevExp);
					next.delete(rootId);
					return next;
				});
				return {
					...prev,
					grades: currentGrades.filter((id) => !familyIds.includes(id)),
				};
			} else {
				// Select all family grades and expand - track usage for new grades
				setExpandedFamilies((prevExp) => {
					const next = new Set(prevExp);
					next.add(rootId);
					return next;
				});
				const newGrades = [...currentGrades];
				for (const id of familyIds) {
					if (!newGrades.includes(id)) {
						newGrades.push(id);
						// Track usage for each grade being added
						incrementFilterUsage("grades", id).catch(() => {
							// Silently ignore storage errors
						});
					}
				}
				return { ...prev, grades: newGrades };
			}
		});
	}, []);

	// Computed: has any active filters
	const hasActiveFilters = useMemo(() => (
		filters.categories.length > 0 ||
		filters.series.length > 0 ||
		filters.brands.length > 0 ||
		filters.grades.length > 0 ||
		filters.scales.length > 0 ||
		filters.years.length > 0 ||
		filters.hasManual ||
		filters.hasGlobalSite
	), [filters]);

	// Computed: total selected count
	const selectedCount = useMemo(() => (
		filters.categories.length +
		filters.series.length +
		filters.brands.length +
		filters.grades.length +
		filters.scales.length +
		filters.years.length +
		(filters.hasManual ? 1 : 0) +
		(filters.hasGlobalSite ? 1 : 0)
	), [filters]);

	// Computed: filtered item count
	const filteredItemCount = useMemo(() => {
		if (!hasActiveFilters) return entityData.items.length;

		// Simple count - filtering logic matches ExploreSection
		return entityData.items.filter((item) => {
			// Category filter
			if (filters.categories.length > 0) {
				const itemCategoryIds = new Set(item.categories.map((c) => c.id));
				const hasOther = filters.categories.includes(OTHER_FILTER_ID);
				const hasNoCategories = item.categories.length === 0;
				const matchesCategory = filters.categories.some((id) => id !== OTHER_FILTER_ID && itemCategoryIds.has(id));
				if (!matchesCategory && !(hasOther && hasNoCategories)) {
					return false;
				}
			}

			// Series filter
			if (filters.series.length > 0) {
				const itemSeriesIds = new Set(item.series.map((s) => s.id));
				const hasOther = filters.series.includes(OTHER_FILTER_ID);
				const hasNoSeries = item.series.length === 0;
				const matchesSeries = filters.series.some((id) => id !== OTHER_FILTER_ID && itemSeriesIds.has(id));
				if (!matchesSeries && !(hasOther && hasNoSeries)) {
					return false;
				}
			}

			// Brand filter
			if (filters.brands.length > 0) {
				const itemBrandIds = new Set(item.brands.map((b) => b.id));
				const hasOther = filters.brands.includes(OTHER_FILTER_ID);
				const hasNoBrands = item.brands.length === 0;
				const matchesBrand = filters.brands.some((id) => id !== OTHER_FILTER_ID && itemBrandIds.has(id));
				if (!matchesBrand && !(hasOther && hasNoBrands)) {
					return false;
				}
			}

			// Grade filter
			if (filters.grades.length > 0) {
				const itemGradeIds = Object.keys(item.grades);
				const hasOther = filters.grades.includes(OTHER_FILTER_ID);
				const hasNoGrades = itemGradeIds.length === 0;
				const matchesGrade = filters.grades.some((id) => id !== OTHER_FILTER_ID && itemGradeIds.includes(id));
				if (!matchesGrade && !(hasOther && hasNoGrades)) {
					return false;
				}
			}

			// Scale filter
			if (filters.scales.length > 0) {
				const hasOther = filters.scales.includes(OTHER_FILTER_ID);
				const hasNoScales = item.scales.length === 0;
				const matchesScale = filters.scales.some((id) => id !== OTHER_FILTER_ID && item.scales.includes(id));
				if (!matchesScale && !(hasOther && hasNoScales)) {
					return false;
				}
			}

			// Year filter
			if (filters.years.length > 0) {
				const itemYear = item.releaseDate?.year;
				const hasOther = filters.years.includes(OTHER_FILTER_ID);
				const hasNoYear = !itemYear || itemYear <= 0;
				const matchesYear = filters.years.some((id) => id !== OTHER_FILTER_ID && String(itemYear) === id);
				if (!matchesYear && !(hasOther && hasNoYear)) {
					return false;
				}
			}

			// hasManual filter
			if (filters.hasManual && !itemHasManual(item)) {
				return false;
			}

			// hasGlobalSite filter
			if (filters.hasGlobalSite && !itemHasGlobalSite(item)) {
				return false;
			}

			return true;
		}).length;
	}, [filters, hasActiveFilters, entityData.items]);

	// Apply a preset
	const applyPreset = useCallback((preset: FilterPreset) => {
		setFiltersState((prev) => {
			// Check if preset is already active - if so, clear those filters
			const presetFilters = preset.filters;
			let isActive = true;

			for (const [key, value] of Object.entries(presetFilters)) {
				const currentValue = prev[key as keyof FilterState];
				if (Array.isArray(value) && Array.isArray(currentValue)) {
					if (!value.every((v) => currentValue.includes(v))) {
						isActive = false;
						break;
					}
				} else if (currentValue !== value) {
					isActive = false;
					break;
				}
			}

			if (isActive) {
				// Remove preset filters - don't track usage for removal
				const newFilters: FilterState = { ...prev };
				for (const [key, value] of Object.entries(presetFilters)) {
					if (Array.isArray(value) && key in newFilters) {
						const typedKey = key as ArrayFilterType;
						newFilters[typedKey] = prev[typedKey].filter((id) => !value.includes(id));
					} else if (typeof value === "boolean") {
						if (key === "hasManual") newFilters.hasManual = false;
						if (key === "hasGlobalSite") newFilters.hasGlobalSite = false;
					}
				}
				return newFilters;
			} else {
				// Apply preset filters (additive) - track usage for new filters
				const newFilters: FilterState = { ...prev };
				for (const [key, value] of Object.entries(presetFilters)) {
					if (Array.isArray(value) && key in newFilters) {
						const typedKey = key as ArrayFilterType;
						const current = newFilters[typedKey];
						// Track usage for filters being added
						for (const filterId of value) {
							if (!current.includes(filterId)) {
								incrementFilterUsage(typedKey as FilterType, filterId).catch(() => {
									// Silently ignore storage errors
								});
							}
						}
						newFilters[typedKey] = [...new Set([...current, ...value])];
					} else if (typeof value === "boolean") {
						if (key === "hasManual") newFilters.hasManual = value;
						if (key === "hasGlobalSite") newFilters.hasGlobalSite = value;
					}
				}
				return newFilters;
			}
		});
	}, []);

	// Check if a preset is currently active
	const isPresetActive = useCallback((preset: FilterPreset): boolean => {
		for (const [key, value] of Object.entries(preset.filters)) {
			const currentValue = filters[key as keyof FilterState];
			if (Array.isArray(value) && Array.isArray(currentValue)) {
				if (!value.every((v) => currentValue.includes(v))) {
					return false;
				}
			} else if (currentValue !== value) {
				return false;
			}
		}
		return true;
	}, [filters]);

	// Debounced URL update function (pure - no ref access)
	const debouncedUpdateUrl = useMemo(
		() =>
			debounce((newFilters: FilterState, currentPathname: string, routerRef: ReturnType<typeof useRouter>) => {
				try {
					const params = serializeFiltersToUrl(newFilters);
					const queryString = params.toString();
					const newUrl = queryString ? `${currentPathname}?${queryString}` : currentPathname;
					routerRef.replace(newUrl, { scroll: false });
				} catch {
					// Error updating URL
				}
			}, TIMING.DEBOUNCE_LONG),
		[],
	);

	// Sync filters to URL
	useEffect(() => {
		// Skip initial sync since we initialized from URL
		if (!isInitializedRef.current) {
			isInitializedRef.current = true;
			return;
		}

		// Skip if this change came from URL (back/forward button)
		if (skipUrlSyncRef.current) {
			skipUrlSyncRef.current = false;
			return;
		}

		debouncedUpdateUrl(filters, pathname, router);

		return () => {
			debouncedUpdateUrl.cancel();
		};
	}, [filters, pathname, router, debouncedUpdateUrl]);

	// Handle URL changes from external navigation (back/forward buttons)
	useEffect(() => {
		const urlFilters = parseFiltersFromUrl(searchParams);
		const newFilters = { ...EMPTY_FILTERS, ...urlFilters };

		// Check if URL filters differ from current state
		const hasChanges = URL_PARAM_KEYS.some((key) => {
			const urlValue = newFilters[key];
			const currentValue = filters[key];

			if (Array.isArray(urlValue) && Array.isArray(currentValue)) {
				return urlValue.length !== currentValue.length ||
					!urlValue.every((v) => currentValue.includes(v));
			}
			return urlValue !== currentValue;
		});

		if (hasChanges && isInitializedRef.current) {
			skipUrlSyncRef.current = true;
			// eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync from URL for back/forward navigation
			setFiltersState(newFilters);
		}
	}, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally only react to URL changes

	const value: FilterContextValue = {
		isReady,
		filters,
		toggleFilter,
		setFilters,
		clearFilters,
		clearFilterType,
		selectAllInType,
		toggleHasManual,
		toggleHasGlobalSite,
		toggleGradeFamily,
		expandedFamilies,
		setExpandedFamilies,
		hasActiveFilters,
		selectedCount,
		filteredItemCount,
		entityData,
		otherCounts,
		presets: DEFAULT_PRESETS,
		applyPreset,
		isPresetActive,
		registerEntityData,
	};

	return (
		<FilterContext.Provider value={value}>
			{children}
		</FilterContext.Provider>
	);
}

// ============================================================================
// Hooks
// ============================================================================

export function useFilters(): FilterContextValue {
	const context = useContext(FilterContext);
	if (!context) {
		throw new Error("useFilters must be used within a FilterProvider");
	}
	return context;
}

/** Optional hook that returns null if not in provider */
export function useFiltersOptional(): FilterContextValue | null {
	return useContext(FilterContext);
}
