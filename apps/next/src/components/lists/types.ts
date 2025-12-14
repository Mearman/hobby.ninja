import type { Item , Manual } from "@hobby-ninja/data";
import type { ReactNode } from "react";

export type ViewMode = "grid" | "list" | "table";

export interface FilterConfig<T, TFilterState = Record<string, unknown>> {
	component: React.ComponentType<FilterProps<T, TFilterState>>;
	hook: (items: T[], initialFilters?: Partial<TFilterState>) => FilterResult<T, TFilterState>;
	fields: string[];
	sortOptions: string[];
}

export interface ViewConfig {
	enabled: ViewMode[];
	default: ViewMode;
}

export interface ListPageConfig<T, TFilterState = Record<string, unknown>> {
	entityType: "items" | "manuals" | "database";
	filters: FilterConfig<T, TFilterState>;
	views: ViewConfig;
	card: React.ComponentType<{ item: T; viewMode: ViewMode }>;
	infiniteScroll: boolean;
	futureReleases?: boolean;
	itemIdField: keyof T;
	nameField: keyof T;
}

export interface FilterProps<T, TFilterState = Record<string, unknown>> {
	filterState: TFilterState;
	availableOptions: Record<string, unknown>;
	onFilterChange: (updates: Partial<TFilterState>) => void;
	items?: T[];
}

export interface FilterResult<T, TFilterState = Record<string, unknown>> {
	filteredItems: T[];
	filterState: TFilterState;
	updateFilter: (updates: Partial<TFilterState>) => void;
	clearFilters: () => void;
	hasActiveFilters: boolean;
}

export interface GenericListPageProps<T, TFilterState = Record<string, unknown>> {
	items: T[];
	totalItems: number;
	config: ListPageConfig<T, TFilterState>;

	// Optional page-specific content
	headerContent?: ReactNode;
	subtitle?: string;
	breadcrumbs?: ReactNode;
	stats?: ReactNode;
	pageTitle: string;
}

// Type guards for entity identification
export function isItem(entry: unknown): entry is Item {
	return typeof entry === "object" && entry !== null && "type" in entry && entry.type === "item" && "brandIds" in entry && "categoryIds" in entry;
}

export function isManual(entry: unknown): entry is Manual {
	return typeof entry === "object" && entry !== null && "type" in entry && entry.type === "manual" && "language" in entry && "pdfs" in entry;
}

export type DatabaseEntry = Item | Manual;