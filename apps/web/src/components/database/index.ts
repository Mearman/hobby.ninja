// Core database components
export { SearchAndFilter } from "./SearchAndFilter";
export type { SearchAndFilterProps } from "./SearchAndFilter";

export { AdvancedFilters } from "./advanced-filters";
export type { AdvancedFiltersProps } from "./advanced-filters";

// Display components
export { ItemCard } from "./ItemCard";
export type { ItemCardProps } from "./ItemCard";

export { ItemGrid } from "./ItemGrid";
export type { ItemGridProps } from "./ItemGrid";

export { ItemDetail } from "./ItemDetail";
export type { ItemDetailProps } from "./ItemDetail";

// Feature components
export { ListSharing } from "./ListSharing";
export type { ListSharingProps } from "./ListSharing";

export { RelatedItems } from "./RelatedItems";
export type { RelatedItemsProps } from "./RelatedItems";

// Test and demo components (development only)
export { DatabaseDemo } from "./DatabaseDemo";
export type { DatabaseDemoProps } from "./DatabaseDemo";

export { ComponentTest } from "./ComponentTest";
export type { ComponentTestProps } from "./ComponentTest";

// Re-export commonly used types from services
export type {
	DatabaseStats,
	FilterOptions,
	FilterPreset,
	SearchResult,
	DataSourceType,
	PaginationResult,
	UnifiedItem,
	ManualItem,
	DatabaseCatalogItem,
	LocalizedName,
	ReleaseDate,
} from "../../services/dataService";

// Component groups for organized imports
export const SearchComponents = {
	SearchAndFilter,
	AdvancedFilters,
} as const;

export const DisplayComponents = {
	ItemCard,
	ItemGrid,
	ItemDetail,
} as const;

export const FeatureComponents = {
	ListSharing,
	RelatedItems,
} as const;

export const TestComponents = {
	DatabaseDemo,
	ComponentTest,
} as const;

// All components export for convenience
export const DatabaseComponents = {
	...SearchComponents,
	...DisplayComponents,
	...FeatureComponents,
	...TestComponents,
} as const;