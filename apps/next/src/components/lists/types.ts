import type { Item , Manual } from "@hobby-ninja/data";
import type { ReactNode } from "react";

export type ViewMode = "grid" | "list" | "table";

export interface FilterConfig<T, TFilterState = Record<string, unknown>, TAvailableOptions = Record<string, unknown>> {
	component: React.ComponentType<FilterProps<T, TFilterState, TAvailableOptions>>;
	hook: (items: T[], initialFilters?: Partial<TFilterState>) => FilterResult<T, TFilterState, TAvailableOptions>;
	fields: string[];
	sortOptions: string[];
}

export interface ViewConfig {
	enabled: ViewMode[];
	default: ViewMode;
}

export interface ListPageConfig<T, TFilterState = Record<string, unknown>, TAvailableOptions = Record<string, unknown>> {
	entityType: "items" | "manuals" | "database";
	filters: FilterConfig<T, TFilterState, TAvailableOptions>;
	views: ViewConfig;
	card: React.ComponentType<{ item: T; viewMode: ViewMode }>;
	infiniteScroll: boolean;
	futureReleases?: boolean;
	itemIdField: keyof T;
	nameField: keyof T;
}

export interface FilterProps<T, TFilterState = Record<string, unknown>, TAvailableOptions = Record<string, unknown>> {
	filterState: TFilterState;
	availableOptions: TAvailableOptions;
	onFilterChange: (updates: Partial<TFilterState>) => void;
	items?: T[];
	filterCounts?: TAvailableOptions;
	hiddenFilters?: string[];
}

export interface FilterResult<T, TFilterState = Record<string, unknown>, TAvailableOptions = Record<string, unknown>> {
	filteredItems: T[];
	filterState: TFilterState;
	updateFilter: (updates: Partial<TFilterState>) => void;
	clearFilters: () => void;
	hasActiveFilters: boolean;
	availableOptions: TAvailableOptions;
	filterCounts?: TAvailableOptions;
}

export interface GenericListPageProps<T, TFilterState = Record<string, unknown>, TAvailableOptions = Record<string, unknown>> {
	items: T[];
	totalItems: number;
	config: ListPageConfig<T, TFilterState, TAvailableOptions>;

	// Optional page-specific content
	headerContent?: ReactNode;
	subtitle?: string;
	breadcrumbs?: ReactNode;
	stats?: ReactNode;
	pageTitle: string;
	hiddenFilters?: string[];
}

// Type guards for entity identification
export function isItem(entry: unknown): entry is Item {
	return typeof entry === "object" && entry !== null && "type" in entry && entry.type === "item" && "brands" in entry && "categories" in entry;
}

export function isManual(entry: unknown): entry is Manual {
	return typeof entry === "object" && entry !== null && "type" in entry && entry.type === "manual" && "language" in entry && "pdfs" in entry;
}

export type DatabaseEntry = Item | Manual;