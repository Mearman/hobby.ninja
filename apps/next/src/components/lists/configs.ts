import type { Item , Manual } from "@hobby-ninja/data";

import { DatabaseCard } from "./database-card";
import { DatabaseFilters, type DatabaseAvailableOptions } from "./database-filters";
import { ItemCard } from "./item-card";
import { ItemFiltersWrapper } from "./item-filters-wrapper";
import { ManualCard } from "./manual-card";
import { ManualFilters } from "./manual-filters";
import { ManualFiltersEnhanced } from "./manual-filters-enhanced";
import type { ListPageConfig } from "./types";

import type { DatabaseFilterState } from "@/hooks/use-database-filter";
import { useDatabaseFilterWrapper } from "@/hooks/use-database-filter-wrapper";
import { useFilteredItems, type FilterState } from "@/hooks/use-filtered-items";
import { useManualFilter, type ManualFilterState } from "@/hooks/use-manual-filter";
import { useManualFilterEnhanced, type ManualFilterState as ManualFilterStateEnhanced } from "@/hooks/use-manual-filter-enhanced";


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
export const manualConfig: ListPageConfig<Manual, ManualFilterState> = {
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
export const manualConfigEnhanced: ListPageConfig<Manual, ManualFilterStateEnhanced> = {
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
export const databaseConfig: ListPageConfig<Item | Manual, DatabaseFilterState, DatabaseAvailableOptions> = {
	entityType: "database",
	filters: {
		component: DatabaseFilters,
		hook: useDatabaseFilterWrapper,
		fields: ["search", "type", "brands", "categories", "grades", "scales", "series", "languages"],
		sortOptions: ["name", "date", "brand"],
	},
	views: {
		enabled: ["grid", "list", "table"],
		default: "grid",
	},
	card: DatabaseCard,
	infiniteScroll: true,
	futureReleases: false,
	itemIdField: "id",
	nameField: "name",
};