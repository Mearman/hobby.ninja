/**
 * Services Index
 *
 * Centralized exports for all data service modules and utilities.
 */

export { DataService, dataService } from "./dataService";
export { WorkerManager, workerManager } from "./worker-manager";
export { ProgressTracker, progressTracker, createProgressTracker, executeWithProgress } from "./progressTracker";

// Re-export types from @workspace/types for convenience
export type {
	UnifiedItem,
	ManualItem,
	DatabaseCatalogItem,
	SearchResult,
	FilterOptions,
	DataSourceType,
	PaginationResult,
	DatabaseStats,
	FilterPreset,
	QueryOptions,
	SyncStatus,
	DatabaseConfig,
	MasterIndexItem,
	UnifiedIndexItem,
	SearchIndexItem,
	LocalizedName,
	ReleaseDate,
} from "@workspace/types";

export type {
	OperationConfig,
	OperationState,
	ProgressUpdate,
	OperationStatus,
	OperationPriority,
	ErrorClassification,
} from "./progressTracker";