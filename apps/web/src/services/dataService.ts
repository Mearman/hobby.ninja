/**
 * Client-Side Data Service for hobby.ninja Database
 *
 * Type-safe data service using Zod schemas for validation
 * Works with the actual data structure in apps/web/public/data/bandai/
 * with three main data sources:
 * - unified/ - Merged catalog and manual data
 * - items/ - Catalog items only
 * - manuals/ - Manual data only
 */

import {
	validateUnifiedItem,
	validateManualItem,
	validateCatalogItem,
	UnifiedItemNodeType,
	ManualItemNodeType,
	CatalogItemNodeType,
	BaseEntitySchemaType,
	
} from "../schemas/universal-graph-schema.js";

// Export types for the Zod-validated data structures
export type UnifiedItem = UnifiedItemNodeType;
export type ManualItem = ManualItemNodeType;
export type CatalogItem = CatalogItemNodeType;
export type GraphEntity = BaseEntitySchemaType;

interface IndexEntry {
  filename: string;
  relativePath: string;
  size: number;
  lastModified: number;
  type: "file" | "directory";
  id?: string;
  metadata?: Record<string, unknown>;
}

interface DataIndex {
  type: "catalog" | "manuals" | "unified";
  generated: string;
  totalFiles: number;
  totalSize: number;
  files: IndexEntry[];
}

// Matching the new hierarchical index structure from Vite plugin
interface HierarchicalIndex {
  generated: string;
  version: string;
  type: "master" | "directory";
  path: string;
  entries: IndexEntry[];
  children: string[]; // Paths to child indexes
  summary: {
    totalFiles: number;
    totalDirectories: number;
    totalSize: number;
  };
}

// Legacy interface for backward compatibility
interface MasterIndex {
  generated: string;
  version: string;
  sources: {
    unified: DataIndex;
    items: DataIndex;
    manuals: DataIndex;
  };
  summary: {
    totalFiles: number;
    totalSize: number;
  };
}

interface ReleaseDate {
  year: number;
  month?: number;
  day?: number;
}

// Types are now imported from universal-graph-schema.ts
// No need for legacy interface definitions

interface SearchResult {
  items: Array<{
    id: string;
    type: "unified" | "manual" | "catalog";
    score: number;
    highlights: {
      name?: string;
      series?: string;
      description?: string;
    };
    data: UnifiedItem | ManualItem | CatalogItem;
  }>;
  total: number;
  queryTime: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface FilterOptions {
  query?: string;
  series?: string[];
  grade?: string[];
  scale?: string[];
  releaseDateRange?: {
    start?: number;
    end?: number;
  };
  availability?: Array<"available" | "discontinued" | "preorder">;
  priceRange?: {
    min?: number;
    max?: number;
  };
  sort?: {
    field: "name" | "releaseDate" | "price" | "relevance";
    direction: "asc" | "desc";
  };
  dataSource?: "unified" | "manual" | "catalog";
}

type DataSourceType = "unified" | "manual" | "catalog";

interface PaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: FilterOptions;
  isPublic?: boolean;
  useCount?: number;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

interface DatabaseStats {
  generatedAt: string;
  totalItems: {
    unified: number;
    manual: number;
    catalog: number;
  };
  sourceCoverage: {
    withManual: number;
    withCatalog: number;
    withBoth: number;
    singleSource: number;
  };
  quality: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    needsReview: number;
  };
  dateRange: {
    earliestYear?: number;
    latestYear?: number;
  };
}

// Configuration
const DEFAULT_CONFIG = {
	/** Cache size in number of items */
	CACHE_SIZE: 100,
	/** Search debounce delay in milliseconds */
	SEARCH_DEBOUNCE_MS: 300,
	/** Query timeout in milliseconds */
	QUERY_TIMEOUT_MS: 10_000,
	/** Pagination default limit */
	DEFAULT_PAGE_LIMIT: 50,
	/** Maximum pagination limit */
	MAX_PAGE_LIMIT: 100,
	/** Data files base path */
	DATA_PATH: "/data/",
};

// Simple cache implementation
class SimpleCache<T = unknown> {
	private cache = new Map<string, { data: T; timestamp: number }>();
	private maxSize: number;
	private ttl: number;

	constructor(maxSize: number = DEFAULT_CONFIG.CACHE_SIZE, ttl: number = 5 * 60 * 1000) {
		this.maxSize = maxSize;
		this.ttl = ttl;
	}

	get(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		// Check TTL
		if (Date.now() - entry.timestamp > this.ttl) {
			this.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	set(key: string, data: T): void {
		// Evict oldest if at capacity
		if (this.cache.size >= this.maxSize) {
			const oldestKey = this.cache.keys().next().value;
			if (oldestKey) {
				this.cache.delete(oldestKey);
			}
		}

		this.cache.set(key, { data, timestamp: Date.now() });
	}

	clear(): void {
		this.cache.clear();
	}
}

// Text processing utilities
const TextProcessor = {
	normalize(text: string): string {
		return text
			.toLowerCase()
			.replaceAll(/[^\w\s\u3040-\u9FAF]/g, " ") // Keep Japanese characters
			.replaceAll(/\s+/g, " ")
			.trim();
	},

	tokenize(text: string): string[] {
		const normalized = this.normalize(text);
		return normalized
			.split(" ")
			.filter(term => term.length >= 2);
	},

	calculateRelevance(query: string, text: string): number {
		const queryTerms = this.tokenize(query);
		const textTerms = this.tokenize(text);

		if (queryTerms.length === 0) return 0;
		if (textTerms.length === 0) return 0;

		const querySet = new Set(queryTerms);
		const textSet = new Set(textTerms);

		const intersection = [...querySet].filter(term => textSet.has(term));
		const union = [...new Set([...querySet, ...textSet])];

		return intersection.length / union.length;
	},
};

// Main data service class
export class DataService {
	private cache: SimpleCache;
	private isInitialized = false;
	private dataIndex: HierarchicalIndex | null = null;
	private bandaiIndex: HierarchicalIndex | null = null;
	private subIndexes = new Map<string, HierarchicalIndex>();
	private dataFiles: {
    unified: string[];
    manuals: string[];
    items: string[];
  } | null = null;

	constructor() {
		this.cache = new SimpleCache();
	}

	/**
   * Initialize the data service by scanning available data files
   */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		try {
			// For now, we'll work with sample data since we can't scan directories directly from browser
			// In a real implementation, you'd have a manifest file or generate indices at build time
			this.dataFiles = {
				unified: await this.loadFileList("unified"),
				manuals: await this.loadFileList("manuals"),
				items: await this.loadFileList("items"),
			};

			this.isInitialized = true;
			console.log("Data service initialized with", {
				unified: this.dataFiles.unified.length,
				manuals: this.dataFiles.manuals.length,
				items: this.dataFiles.items.length,
			});
		} catch (error) {
			console.error("Failed to initialize data service:", error);
			throw error;
		}
	}

	/**
   * Load a list of files from a directory (simplified implementation)
   */
	private async loadFileList(type: string): Promise<string[]> {
		// For now, return a sample of available files
		// In production, you'd have a manifest file or generate this at build time
		const sampleSize = 100; // Load first 100 files as a sample
		const files: string[] = [];

		for (let i = 1; i <= sampleSize; i++) {
			const paddedNumber = i.toString().padStart(5, "0");
			switch (type) {
				case "unified": {
					files.push(`up_${paddedNumber}.json`);
			
					break;
				}
				case "manuals": {
					files.push(`${i}.json`);
			
					break;
				}
				case "items": {
					files.push(`01_${paddedNumber}.json`);
			
					break;
				}
			// No default
			}
		}

		return files;
	}

	/**
   * Search items across all data sources
   */
	async searchItems(
		query: string,
		filters: FilterOptions = {},
		options: {
      page?: number;
      limit?: number;
      sortBy?: string;
    } = {},
	): Promise<SearchResult> {
		await this.initialize();

		const startTime = Date.now();
		const normalizedQuery = TextProcessor.normalize(query);

		let allItems: SearchResult["items"] = [];

		// Search unified data
		if (!filters.dataSource || filters.dataSource === "unified") {
			const unifiedItems = await this.searchUnifiedItems(normalizedQuery);
			allItems.push(...unifiedItems);
		}

		// Search manuals
		if (!filters.dataSource || filters.dataSource === "manual") {
			const manualItems = await this.searchManualItems(normalizedQuery);
			allItems.push(...manualItems);
		}

		// Search catalog items
		if (!filters.dataSource || filters.dataSource === "catalog") {
			const catalogItems = await this.searchCatalogItems(normalizedQuery);
			allItems.push(...catalogItems);
		}

		// Apply sorting
		if (filters.sort) {
			allItems = this.applySorting(allItems, filters.sort);
		} else {
			// Sort by relevance by default
			allItems.sort((a, b) => b.score - a.score);
		}

		// Apply pagination
		const page = 1;
		const limit = DEFAULT_CONFIG.DEFAULT_PAGE_LIMIT;
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedItems = allItems.slice(startIndex, endIndex);

		return {
			items: paginatedItems,
			total: allItems.length,
			queryTime: Date.now() - startTime,
			pagination: {
				page,
				limit,
				totalPages: Math.ceil(allItems.length / limit),
			},
		};
	}

	/**
   * Search unified items
   */
	private async searchUnifiedItems(query: string): Promise<SearchResult["items"]> {
		const cacheKey = `search_unified_${query}`;
		let results = this.cache.get(cacheKey) as SearchResult["items"] | undefined;

		if (results) {
			return results;
		}

		try {
			// Load sample unified items
			const sampleSize = 20;
			const sampleIds = this.dataFiles!.unified.slice(0, sampleSize);

			const items: SearchResult["items"] = [];

			for (const filename of sampleIds) {
				try {
					const item = await this.loadUnifiedItem(filename);
					if (item) {
						const score = this.calculateItemScore(query, item);
						if (score > 0.1) {
							items.push({
								id: item.id,
								type: "unified",
								score,
								highlights: {
									name: this.highlightText(item.properties?.name?.en || item.properties?.name?.ja || "", query),
								},
								data: item,
							});
						}
					}
				} catch (error) {
					console.warn(`Failed to load unified item ${filename}:`, error);
				}
			}

			results = items;
			this.cache.set(cacheKey, results);
			return results;
		} catch (error) {
			console.error("Failed to search unified items:", error);
			return [];
		}
	}

	/**
   * Search manual items
   */
	private async searchManualItems(query: string): Promise<SearchResult["items"]> {
		const cacheKey = `search_manuals_${query}`;
		let results = this.cache.get(cacheKey) as SearchResult["items"] | undefined;

		if (results) {
			return results;
		}

		try {
			// Load sample manual items
			const sampleSize = 10;
			const sampleIds = this.dataFiles!.manuals.slice(0, sampleSize);

			const items: SearchResult["items"] = [];

			for (const filename of sampleIds) {
				try {
					const item = await this.loadManualItem(filename);
					if (item) {
						const score = this.calculateItemScore(query, item);
						if (score > 0.1) {
							items.push({
								id: item.id,
								type: "manual",
								score,
								highlights: {
									name: this.highlightText(item.properties?.name?.en || item.properties?.name?.ja || "", query),
								},
								data: item,
							});
						}
					}
				} catch (error) {
					console.warn(`Failed to load manual item ${filename}:`, error);
				}
			}

			results = items;
			this.cache.set(cacheKey, results);
			return results;
		} catch (error) {
			console.error("Failed to search manual items:", error);
			return [];
		}
	}

	/**
   * Search catalog items
   */
	private async searchCatalogItems(query: string): Promise<SearchResult["items"]> {
		const cacheKey = `search_catalog_${query}`;
		let results = this.cache.get(cacheKey) as SearchResult["items"] | undefined;

		if (results) {
			return results;
		}

		try {
			// Load sample catalog items
			const sampleSize = 10;
			const sampleIds = this.dataFiles!.items.slice(0, sampleSize);

			const items: SearchResult["items"] = [];

			for (const filename of sampleIds) {
				try {
					const item = await this.loadCatalogItem(filename);
					if (item) {
						const score = this.calculateItemScore(query, item);
						if (score > 0.1) {
							items.push({
								id: item.id,
								type: "catalog",
								score,
								highlights: {
									name: this.highlightText(item.properties?.name?.en || item.properties?.name?.ja || "", query),
								},
								data: item,
							});
						}
					}
				} catch (error) {
					console.warn(`Failed to load catalog item ${filename}:`, error);
				}
			}

			results = items;
			this.cache.set(cacheKey, results);
			return results;
		} catch (error) {
			console.error("Failed to search catalog items:", error);
			return [];
		}
	}

	/**
   * Get items by page
   */
	async getItemsByPage(
		page = 1,
		limit: number = DEFAULT_CONFIG.DEFAULT_PAGE_LIMIT,
		source?: DataSourceType,
	): Promise<PaginationResult<UnifiedItem | ManualItem | CatalogItem>> {
		await this.initialize();

		const cacheKey = `page_${page}_${limit}_${source || "all"}`;
		let result = this.cache.get(cacheKey) as PaginationResult<UnifiedItem | ManualItem | CatalogItem> | undefined;

		if (result) {
			return result;
		}

		try {
			const items: any[] = [];

			if (!source || source === "unified") {
				const unifiedItems = await this.getUnifiedItems();
				items.push(...unifiedItems);
			}
			if (!source || source === "manual") {
				const manualItems = await this.getManualItems();
				items.push(...manualItems);
			}
			if (!source || source === "catalog") {
				const catalogItems = await this.getCatalogItems();
				items.push(...catalogItems);
			}

			const total = items.length;
			const totalPages = Math.ceil(total / limit);
			const startIndex = (page - 1) * limit;
			const endIndex = startIndex + limit;
			const pageItems = items.slice(startIndex, endIndex);

			result = {
				items: pageItems,
				pagination: {
					page,
					limit,
					total,
					totalPages,
					hasNext: page < totalPages,
					hasPrev: page > 1,
				},
			};

			this.cache.set(cacheKey, result);
			return result;
		} catch (error) {
			console.error("Failed to get paginated items:", error);
			throw error;
		}
	}

	/**
   * Get unified items
   */
	async getUnifiedItems(): Promise<UnifiedItem[]> {
		const cacheKey = "unified_items";
		let items = this.cache.get(cacheKey) as UnifiedItem[] | undefined;

		if (items) {
			return items;
		}

		try {
			// Load all unified items, not just a sample
			const sampleIds = this.dataFiles!.unified;

			items = [];
			for (const filename of sampleIds) {
				try {
					const item = await this.loadUnifiedItem(filename);
					if (item) {
						items.push(item);
					}
				} catch (error) {
					console.warn(`Failed to load unified item ${filename}:`, error);
				}
			}

			this.cache.set(cacheKey, items);
			return items;
		} catch (error) {
			console.error("Failed to load unified items:", error);
			return [];
		}
	}

	/**
   * Get manual items
   */
	async getManualItems(): Promise<ManualItem[]> {
		const cacheKey = "manual_items";
		const items = this.cache.get(cacheKey);

		if (items && Array.isArray(items)) {
			return items as ManualItem[];
		}

		try {
			const sampleSize = 20;
			const sampleIds = this.dataFiles!.manuals.slice(0, sampleSize);

			const items: ManualItem[] = [];
			for (const filename of sampleIds) {
				try {
					const item = await this.loadManualItem(filename);
					if (item) {
						items.push(item);
					}
				} catch (error) {
					console.warn(`Failed to load manual item ${filename}:`, error);
				}
			}

			this.cache.set(cacheKey, items);
			return items;
		} catch (error) {
			console.error("Failed to load manual items:", error);
			return [];
		}
	}

	/**
   * Get catalog items
   */
	async getCatalogItems(): Promise<CatalogItem[]> {
		const cacheKey = "catalog_items";
		const items = this.cache.get(cacheKey);

		if (items && Array.isArray(items)) {
			return items as CatalogItem[];
		}

		try {
			const sampleSize = 20;
			const sampleIds = this.dataFiles!.items.slice(0, sampleSize);

			const items: CatalogItem[] = [];
			for (const filename of sampleIds) {
				try {
					const item = await this.loadCatalogItem(filename);
					if (item) {
						items.push(item);
					}
				} catch (error) {
					console.warn(`Failed to load catalog item ${filename}:`, error);
				}
			}

			this.cache.set(cacheKey, items);
			return items;
		} catch (error) {
			console.error("Failed to load catalog items:", error);
			return [];
		}
	}

	/**
   * Get item by ID and type
   */
	async getItemById(id: string, type: "unified" | "manual" | "catalog"): Promise<UnifiedItem | ManualItem | CatalogItem | null> {
		try {
			switch (type) {
				case "unified": {
					const items = await this.getUnifiedItems();
					return items.find(item => item.id === id) || null;
				}
				case "manual": {
					const items = await this.getManualItems();
					return items.find(item => item.id === id) || null;
				}
				case "catalog": {
					const items = await this.getCatalogItems();
					return items.find(item => item.id === id) || null;
				}
				default: {
					return null;
				}
			}
		} catch (error) {
			console.error(`Failed to get ${type} item by ID ${id}:`, error);
			return null;
		}
	}

	/**
   * Get database statistics using generated hierarchical indices
   */
	async getStatistics(): Promise<DatabaseStats> {
		const cacheKey = "database_stats";
		let stats = this.cache.get(cacheKey);

		if (stats && typeof stats === "object") {
			return stats as DatabaseStats;
		}

		try {
			// Load hierarchical master index for statistics
			const masterIndexResponse = await fetch("/data/index.json");
			if (!masterIndexResponse.ok) {
				throw new Error("Failed to load master index");
			}

			const masterIndex: HierarchicalIndex = await masterIndexResponse.json();

			// Find bandai directory for detailed stats
			const bandaiDirEntry = masterIndex.entries.find(entry =>
				entry.type === "directory" && entry.relativePath === "bandai",
			);

			let unifiedCount = 0;
			let manualCount = 0;
			let catalogCount = 0;
			let withManual = 0;
			let withCatalog = 0;
			let withBoth = 0;

			if (bandaiDirEntry) {
				// Load bandai index for detailed information
				const bandaiIndexResponse = await fetch("/data/bandai/index.json");
				if (bandaiIndexResponse.ok) {
					const bandaiIndex: HierarchicalIndex = await bandaiIndexResponse.json();

					// Count items by source type from metadata
					for (const entry of bandaiIndex.entries) {
						if (entry.type === "file" && entry.metadata?.["sourceType"]) {
							switch (entry.metadata?.["sourceType"]) {
								case "unified": {
									unifiedCount++;
									if (entry.metadata["productId"]) {
										// Could load actual unified item to check sources
										// For now, assume all unified items have both sources
										withBoth++;
									}
									break;
								}
								case "manual": {
									manualCount++;
									withManual++;
									break;
								}
								case "catalog": {
									catalogCount++;
									withCatalog++;
									break;
								}
							}
						}
					}
				}
			}

			// Fallback to master index totals if bandai data isn't available
			const totalUnified = masterIndex.entries.filter(e =>
				e.type === "file" && e.filename.endsWith(".json") && e.filename.startsWith("up_"),
			).length;

			const totalManual = masterIndex.entries.filter(e =>
				e.type === "file" && e.filename.endsWith(".json") && /^\d+/.test(e.filename),
			).length;

			const totalCatalog = masterIndex.entries.filter(e =>
				e.type === "file" && e.filename.endsWith(".json") && e.filename.startsWith("01_"),
			).length;

			stats = {
				generatedAt: masterIndex.generated,
				totalItems: {
					unified: unifiedCount || totalUnified,
					manual: manualCount || totalManual,
					catalog: catalogCount || totalCatalog,
				},
				sourceCoverage: {
					withManual: withManual || manualCount,
					withCatalog: withCatalog || catalogCount,
					withBoth: withBoth || 0, // Approximate for now
					singleSource: (withManual + withCatalog) - (withBoth * 2) || 0,
				},
				quality: {
					highConfidence: 0, // Could be calculated from actual data
					mediumConfidence: 0,
					lowConfidence: 0,
					needsReview: 0,
				},
				dateRange: {
					// Would need to sample actual data for this
					earliestYear: 2000,
					latestYear: 2025,
				},
			};

			this.cache.set(cacheKey, stats);
			return stats as DatabaseStats;
		} catch (error) {
			console.error("Failed to get database statistics:", error);
			// Return default stats
			return {
				generatedAt: new Date().toISOString(),
				totalItems: { unified: 0, manual: 0, catalog: 0 },
				sourceCoverage: { withManual: 0, withCatalog: 0, withBoth: 0, singleSource: 0 },
				quality: { highConfidence: 0, mediumConfidence: 0, lowConfidence: 0, needsReview: 0 },
				dateRange: {},
			};
		}
	}

	/**
   * Load a unified item by filename with Zod validation
   */
	private async loadUnifiedItem(filename: string): Promise<UnifiedItem | null> {
		try {
			const response = await fetch(`${DEFAULT_CONFIG.DATA_PATH}bandai/unified/${filename}`);
			if (!response.ok) {
				return null;
			}

			const rawData = await response.json();

			// Transform raw data to match our Zod schema structure
			const transformedData = {
				id: rawData.id,
				category: "node" as const,
				type: "unified_item" as const,
				schemaId: "unified_item_schema_default",
				properties: {
					name: rawData.name,
					series: rawData.series,
					grade: rawData.grade,
					scale: rawData.scale,
					releaseDate: rawData.releaseDate,
					sources: rawData.sources,
					matchMethod: rawData.matchMethod,
					matchStage: rawData.matchStage,
				},
				metadata: {
					createdAt: rawData.createdAt,
					updatedAt: rawData.updatedAt,
				},
			};

			// Validate with Zod and return the validated data
			const validation = validateUnifiedItem(transformedData);
			if (!validation.success) {
				console.warn(`Unified item validation failed for ${filename}:`, validation.error);
				return null;
			}

			return validation.data;
		} catch (error) {
			console.error(`Failed to load unified item ${filename}:`, error);
			return null;
		}
	}

	/**
   * Load a manual item by filename with Zod validation
   */
	private async loadManualItem(filename: string): Promise<ManualItem | null> {
		try {
			const response = await fetch(`${DEFAULT_CONFIG.DATA_PATH}bandai/manuals/${filename}`);
			if (!response.ok) {
				return null;
			}

			const rawData = await response.json();

			// Transform raw data to match our Zod schema structure
			const transformedData = {
				id: rawData.id,
				category: "node" as const,
				type: "manual_item" as const,
				schemaId: "manual_item_schema_default",
				properties: {
					name: rawData.name,
					productNumber: rawData.productNumber,
					releaseDate: rawData.releaseDate,
					series: rawData.series,
					grade: rawData.grade,
					scale: rawData.scale,
					pdfUrl: rawData.pdfUrl,
					productImage: rawData.productImage,
					thumbnailImage: rawData.thumbnailImage,
				},
				metadata: {
					createdAt: rawData.extractedAt,
					updatedAt: rawData.extractedAt,
					source: "bandai_manual",
				},
			};

			// Validate with Zod and return the validated data
			const validation = validateManualItem(transformedData);
			if (!validation.success) {
				console.warn(`Manual item validation failed for ${filename}:`, validation.error);
				return null;
			}

			return validation.data;
		} catch (error) {
			console.error(`Failed to load manual item ${filename}:`, error);
			return null;
		}
	}

	/**
   * Load a catalog item by filename with Zod validation
   */
	private async loadCatalogItem(filename: string): Promise<CatalogItem | null> {
		try {
			const response = await fetch(`${DEFAULT_CONFIG.DATA_PATH}bandai/items/${filename}`);
			if (!response.ok) {
				return null;
			}

			const rawData = await response.json();

			// Transform raw data to match our Zod schema structure
			const transformedData = {
				id: rawData.id,
				category: "node" as const,
				type: "catalog_item" as const,
				schemaId: "catalog_item_schema_default",
				properties: {
					name: rawData.name,
					price: rawData.price,
					releaseDate: rawData.releaseDate,
					targetAge: rawData.targetAge,
					series: rawData.series,
					brands: rawData.brands,
					categories: rawData.categories,
					scale: rawData.scale,
					description: rawData.description,
					accessories: rawData.accessories,
					contents: rawData.contents,
					images: rawData.images,
					relatedProducts: rawData.relatedProducts,
				},
				metadata: {
					createdAt: rawData.extractedAt,
					updatedAt: rawData.extractedAt,
					source: "bandai_catalog",
					sourceUrl: rawData.sourceUrl,
				},
			};

			// Validate with Zod and return the validated data
			const validation = validateCatalogItem(transformedData);
			if (!validation.success) {
				console.warn(`Catalog item validation failed for ${filename}:`, validation.error);
				return null;
			}

			return validation.data;
		} catch (error) {
			console.error(`Failed to load catalog item ${filename}:`, error);
			return null;
		}
	}

	/**
   * Calculate relevance score for an item
   */
	private calculateItemScore(query: string, item: UnifiedItem | ManualItem | CatalogItem): number {
		if (!query) return 1;

		let score = 0;
		const normalizedQuery = TextProcessor.normalize(query);

		// Check name fields - use the new graph structure where data is in properties
		const nameFields = [
			item.properties?.name?.en,
			item.properties?.name?.ja,
			item.properties?.series?.en,
			item.properties?.series?.ja,
			item.properties?.grade,
			item.properties?.scale,
			item.properties?.productNumber, // For manual items
		].filter(Boolean);

		for (const field of nameFields) {
			score += TextProcessor.calculateRelevance(normalizedQuery, field);
		}

		// Boost exact matches
		if (nameFields.some(field => TextProcessor.normalize(field) === normalizedQuery)) {
			score += 1;
		}

		return Math.min(score, 2); // Cap at 2.0
	}

	/**
   * Highlight matching text
   */
	private highlightText(text: string, query: string): string {
		if (!query || !text) return text;

		const queryTerms = TextProcessor.tokenize(query);
		if (queryTerms.length === 0) return text;

		let highlighted = text;
		for (const term of queryTerms) {
			const regex = new RegExp(`(${this.escapeRegex(term)})`, "gi");
			highlighted = highlighted.replace(regex, "<mark>$1</mark>");
		}

		return highlighted;
	}

	/**
   * Escape regex special characters
   */
	private escapeRegex(string: string): string {
		return string.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
	}

	/**
   * Apply sorting to results
   */
	private applySorting(results: SearchResult["items"], sort: FilterOptions["sort"]): SearchResult["items"] {
		return results.sort((a, b) => {
			let comparison = 0;

			switch (sort.field) {
				case "relevance": {
					comparison = b.score - a.score;
					break;
				}
				case "name": {
					const aName = a.data?.properties?.name?.en || a.data?.properties?.name?.ja || "";
					const bName = b.data?.properties?.name?.en || b.data?.properties?.name?.ja || "";
					comparison = aName.localeCompare(bName);
					break;
				}
				case "releaseDate": {
					const aYear = a.data?.properties?.releaseDate?.year || 0;
					const bYear = b.data?.properties?.releaseDate?.year || 0;
					comparison = aYear - bYear;
					break;
				}
				case "price": {
					const aPrice = a.data?.price?.amount || 0;
					const bPrice = b.data?.price?.amount || 0;
					comparison = aPrice - bPrice;
					break;
				}
			}

			return sort.direction === "desc" ? -comparison : comparison;
		});
	}

	/**
   * Get search suggestions for autocomplete
   */
	async getSearchSuggestions(query: string): Promise<string[]> {
		if (!query || query.length < 2) {
			return [];
		}

		await this.initialize();

		// For now, return a simple list of common terms
		// In a real implementation, this would use the actual data
		const commonTerms = [
			"Gundam",
			"RX-78",
			"Strike",
			"Freedom",
			"Wing",
			" Unicorn",
			"Zaku",
			"NG",
			"MG",
			"PG",
			"HG",
		];

		return commonTerms.filter(term =>
			term.toLowerCase().includes(query.toLowerCase()),
		).slice(0, 5);
	}

	/**
   * Get filter options for a specific field
   */
	async getFilterOptions(field: "grade" | "scale" | "series"): Promise<string[]> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const items = await this.getUnifiedItems();
		const options = new Set<string>();

		for (const item of items) {
			const properties = item.properties;

			switch (field) {
				case "grade": {
					if (properties?.grade) {
						options.add(properties.grade);
					}
					break;
				}
				case "scale": {
					if (properties?.scale) {
						options.add(properties.scale);
					}
					break;
				}
				case "series": {
					if (properties?.series) {
						const seriesName = properties.series.en || properties.series.ja;
						if (seriesName) {
							options.add(seriesName);
						}
					}
					break;
				}
			}
		}

		return [...options].sort();
	}

	/**
   * Clear cache
   */
	clearCache(): void {
		this.cache.clear();
	}
}

// Export types
export type {
	
	ReleaseDate,
	ManualItem,
	CatalogItem,
	UnifiedItem,
	SearchResult,
	FilterOptions,
	FilterPreset,
	DataSourceType,
	PaginationResult,
	DatabaseStats,
};

/** Global data service instance */
export const dataService = new DataService();
export {type MultilingualText} from "../schemas/universal-graph-schema.js";