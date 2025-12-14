import type { Item , Manual } from "@hobby-ninja/data";

import { ItemCard } from "./item-card";
import { ItemFiltersWrapper } from "./item-filters-wrapper";
import { ManualCard } from "./manual-card";
import { ManualFilters } from "./manual-filters";
import { ManualFiltersEnhanced } from "./manual-filters-enhanced";
import type { ListPageConfig } from "./types";

import { useFilteredItems, type FilterState } from "@/hooks/use-filtered-items";
import { useManualFilter } from "@/hooks/use-manual-filter";
import { useManualFilterEnhanced } from "@/hooks/use-manual-filter-enhanced";


// Item configuration - used for main items page and brand/category/grade/scale/series pages
export const itemConfig: ListPageConfig<Item, FilterState> = {
	entityType: "items",
	filters: {
		component: ItemFiltersWrapper,
		hook: useFilteredItems,
		fields: ["brands", "grades", "scales", "series", "categories"],
		sortOptions: ["name", "date", "price", "brand", "grade", "scale", "series"],
	},
	views: {
		enabled: ["grid", "list", "table"],
		default: "grid",
	},
	card: ItemCard,
	infiniteScroll: true,
	futureReleases: true,
	itemIdField: "id",
	nameField: "name",
};

// Manual configuration - used for manuals page
export const manualConfig: ListPageConfig<Manual> = {
	entityType: "manuals",
	filters: {
		component: ManualFilters,
		hook: useManualFilter,
		fields: [],
		sortOptions: ["name", "date"],
	},
	views: {
		enabled: ["grid", "list"],
		default: "grid",
	},
	card: ManualCard,
	infiniteScroll: true,
	futureReleases: false,
	itemIdField: "id",
	nameField: "name",
};

// Enhanced manual configuration with date range filtering
export const manualConfigEnhanced: ListPageConfig<Manual> = {
	entityType: "manuals",
	filters: {
		component: ManualFiltersEnhanced,
		hook: useManualFilterEnhanced,
		fields: ["dateRange"],
		sortOptions: ["name", "date", "pages", "language"],
	},
	views: {
		enabled: ["grid", "list"],
		default: "grid",
	},
	card: ManualCard,
	infiniteScroll: true,
	futureReleases: false,
	itemIdField: "id",
	nameField: "name",
};

// Database configuration - hybrid items and manuals
export const databaseConfig: ListPageConfig<Item | Manual> = {
	entityType: "database",
	filters: {
		component: () => null, // Will be implemented as DatabaseFilters component
		hook: (items: Array<Item | Manual>) => ({
			filteredItems: items,
			filterState: {},
			// Placeholder no-op implementations until DatabaseFilters is implemented
			updateFilter: () => { /* no-op placeholder */ },
			clearFilters: () => { /* no-op placeholder */ },
			hasActiveFilters: false,
		}),
		fields: ["search", "type", "brands", "categories", "grades", "scales", "series", "languages"],
		sortOptions: ["name", "date", "brand"],
	},
	views: {
		enabled: ["grid", "list", "table"],
		default: "grid",
	},
	card: () => null, // Will be implemented as DatabaseEntryCard component
	infiniteScroll: true,
	futureReleases: false,
	itemIdField: "id",
	nameField: "name",
};