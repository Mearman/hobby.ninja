/**
 * Client-Side Data Service for hobby.ninja Database
 *
 * Type-safe data service using Zod schemas for validation
 * Works with the actual data structure in apps/web/public/api/graph/
 * with main data sources:
 * - items/ - Graph node items (catalog data)
 * - manuals/ - Manual data with relationships
 * - series/ - Series information
 * - brands/ - Brand information
 * - categories/ - Category information
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

// Graph API types
interface GraphItem {
	id: string;
	type: "item";
	name: {
		ja: string;
		en: string;
	};
	price?: {
		amount: number;
		currency: string;
		taxIncluded: boolean;
		taxRate: number;
	};
	releaseDate?: {
		ja: string;
		year: number;
		month?: number;
		day?: number;
	};
	targetAge?: number;
	scale?: string;
	description?: Array<{
		ja: string;
		en: string;
	}>;
	accessories?: Array<{
		ja: string;
		en: string;
	}>;
	contents?: Array<{
		ja: string;
		en: string;
	}>;
	images?: string[];
	sourceUrl?: string;
	extractedAt?: string;
	edges?: {
		inbound: Array<{
			type: string;
			targetId: string;
			targetType: string;
		}>;
		outbound: Array<{
			type: string;
			targetId: string;
			targetType: string;
		}>;
	};
}

interface GraphManual {
	id: string;
	type: "manual";
	name: {
		ja: string;
		en: string;
	};
	productNumber?: string;
	releaseDate?: {
		ja: string;
		year: number;
		month?: number;
		day?: number;
	};
	series?: {
		ja: string;
		en: string;
	};
	grade?: {
		code: string;
		family: string;
	};
	scale?: string;
	pdfUrl?: string;
	productImage?: string;
	thumbnailImage?: string;
	extractedAt?: string;
	edges?: {
		inbound: Array<{
			type: string;
			targetId: string;
			targetType: string;
		}>;
		outbound: Array<{
			type: string;
			targetId: string;
			targetType: string;
		}>;
	};
}

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
    field: "name" | "releaseDate" | "price" | "relevance" | "grade";
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

// Type for item properties that can contain different structures
interface ItemProperties {
  name?: { en: string; ja: string };
  series?: { en: string; ja: string } | string;
  grade?: string | { code: string; family: string };
  scale?: string;
  price?: { amount: number; currency: string };
  releaseDate?: { year: number };
  [key: string]: unknown;
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
	DATA_PATH: "/api/graph/",
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
	private dataFiles: {
		items: string[];
		manuals: string[];
		series: string[];
		brands: string[];
		categories: string[];
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
			// Load file lists from the graph API structure
			this.dataFiles = {
				items: await this.loadFileList("items"),
				manuals: await this.loadFileList("manuals"),
				series: await this.loadFileList("series"),
				brands: await this.loadFileList("brands"),
				categories: await this.loadFileList("categories"),
			};

			this.isInitialized = true;
			console.log("Data service initialized with", {
				items: this.dataFiles.items.length,
				manuals: this.dataFiles.manuals.length,
				series: this.dataFiles.series.length,
				brands: this.dataFiles.brands.length,
				categories: this.dataFiles.categories.length,
			});
		} catch (error) {
			console.error("Failed to initialize data service:", error);
			throw error;
		}
	}

	/**
   * Load a list of files from a directory in the graph API structure
   */
	private async loadFileList(type: string): Promise<string[]> {
		try {
			// For now, return a sample based on known patterns
			const files: string[] = [];

			if (type === "items") {
				// Items follow the pattern 01_XXXX.json
				const sampleSize = 100;
				for (let i = 1000; i < 1000 + sampleSize; i++) {
					files.push(`01_${i}.json`);
				}
			}

			if (type === "manuals") {
				// Manuals follow numeric pattern
				const sampleSize = 100;
				for (let i = 1; i <= sampleSize; i++) {
					files.push(`${i}.json`);
				}
			}

			return files;
		} catch (error) {
			console.warn(`Failed to load file list for ${type}:`, error);
			return [];
		}
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

		// Search items (catalog data)
		if (!filters.dataSource || filters.dataSource === "catalog" || filters.dataSource === "unified") {
			const catalogItems = await this.searchGraphItems(normalizedQuery, "items");
			allItems.push(...catalogItems);
		}

		// Search manuals
		if (!filters.dataSource || filters.dataSource === "manual") {
			const manualItems = await this.searchGraphItems(normalizedQuery, "manuals");
			allItems.push(...manualItems);
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
   * Search items from the graph API
   */
	private async searchGraphItems(query: string, sourceType: "items" | "manuals"): Promise<SearchResult["items"]> {
		const cacheKey = `search_${sourceType}_${query}`;
		let results = this.cache.get(cacheKey) as SearchResult["items"] | undefined;

		if (results) {
			return results;
		}

		try {
			const sampleSize = 50;
			const sampleIds = this.dataFiles![sourceType].slice(0, sampleSize);

			const items: SearchResult["items"] = [];

			for (const filename of sampleIds) {
				try {
					const graphItem = sourceType === "items"
						? await this.loadGraphItem(filename, "items")
						: await this.loadGraphItem(filename, "manuals");

					if (graphItem) {
						const score = this.calculateGraphItemScore(query, graphItem);
						if (score > 0.1) {
							// Convert graph item to UnifiedItem or ManualItem format
							const convertedItem = sourceType === "items"
								? this.convertGraphItemToUnified(graphItem as GraphItem)
								: this.convertGraphToManualItem(graphItem as GraphManual);

							if (convertedItem) {
								items.push({
									id: graphItem.id,
									type: sourceType === "items" ? "catalog" : "manual",
									score,
									highlights: {
										name: this.highlightText(graphItem.name?.en || graphItem.name?.ja || "", query),
									},
									data: convertedItem,
								});
							}
						}
					}
				} catch (error) {
					console.warn(`Failed to load ${sourceType} item ${filename}:`, error);
				}
			}

			results = items;
			this.cache.set(cacheKey, results);
			return results;
		} catch (error) {
			console.error(`Failed to search ${sourceType} items:`, error);
			return [];
		}
	}

	/**
   * Load an item from the graph API
   */
	private async loadGraphItem(filename: string, sourceType: "items" | "manuals"): Promise<GraphItem | GraphManual | null> {
		try {
			const response = await fetch(`${DEFAULT_CONFIG.DATA_PATH}${sourceType}/${filename}`);
			if (!response.ok) {
				return null;
			}

			return await response.json();
		} catch (error) {
			console.error(`Failed to load graph item ${filename}:`, error);
			return null;
		}
	}

	/**
   * Convert a graph item to UnifiedItem format
   */
	private convertGraphItemToUnified(graphItem: GraphItem): UnifiedItem | null {
		try {
			return {
				$id: graphItem.id,
				id: graphItem.id,
				category: "data" as const,
				$type: "unified_item" as const,
				schemaId: "unified_item_schema_default",
				properties: {
					name: graphItem.name,
					grade: this.extractGradeFromEdges(graphItem.edges) || graphItem.scale || "",
					scale: graphItem.scale || "",
					releaseDate: graphItem.releaseDate ? {
						year: graphItem.releaseDate.year,
						month: graphItem.releaseDate.month || 1,
						day: graphItem.releaseDate.day || 1,
						ja: graphItem.releaseDate.ja
					} : {
						year: 0,
						month: 1,
						day: 1
					},
					sources: {}, // Required but empty for graph items
					matchMethod: "exact" as const,
					confidence: 1,
					price: graphItem.price,
					targetAge: graphItem.targetAge,
					description: graphItem.description,
					accessories: graphItem.accessories,
					contents: graphItem.contents,
					images: graphItem.images,
					// Extract series from edges
					series: this.extractSeriesFromEdges(graphItem.edges),
				},
				metadata: {
					createdAt: graphItem.extractedAt,
					updatedAt: graphItem.extractedAt,
				},
			} as UnifiedItem;
		} catch (error) {
			console.error("Failed to convert graph item to unified item:", error);
			return null;
		}
	}

	/**
   * Convert a graph manual to ManualItem format
   */
	private convertGraphToManualItem(graphManual: GraphManual): ManualItem | null {
		try {
			return {
				$id: graphManual.id,
				id: graphManual.id,
				category: "data" as const,
				$type: "manual_item" as const,
				schemaId: "manual_item_schema_default",
				properties: {
					name: graphManual.name,
					productNumber: graphManual.productNumber,
					releaseDate: graphManual.releaseDate ? {
						year: graphManual.releaseDate.year,
						month: graphManual.releaseDate.month,
						day: graphManual.releaseDate.day,
						ja: graphManual.releaseDate.ja
					} : undefined,
					series: graphManual.series,
					grade: graphManual.grade,
					scale: graphManual.scale,
					pdfUrl: graphManual.pdfUrl,
					productImage: graphManual.productImage,
					thumbnailImage: graphManual.thumbnailImage,
				},
				metadata: {
					createdAt: graphManual.extractedAt,
					updatedAt: graphManual.extractedAt,
					source: "graph_manual",
				},
			} as ManualItem;
		} catch (error) {
			console.error("Failed to convert graph manual to manual item:", error);
			return null;
		}
	}

	/**
   * Extract series information from graph edges
   */
	private extractSeriesFromEdges(edges?: GraphItem["edges"]): { en: string; ja: string } | undefined {
		// Implementation would traverse edges to find series information
		return undefined;
	}

	/**
   * Extract grade information from graph edges
   */
	private extractGradeFromEdges(edges?: GraphItem["edges"]): string | undefined {
		// Implementation would traverse edges to find grade information
		return undefined;
	}

	/**
   * Calculate relevance score for a graph item
   */
	private calculateGraphItemScore(query: string, item: GraphItem | GraphManual): number {
		if (!query) return 1;

		let score = 0;
		const normalizedQuery = TextProcessor.normalize(query);

		// Check name fields
		const nameFields = [
			item.name.en,
			item.name.ja,
		];

		const filteredFields = nameFields.filter((field): field is string => Boolean(field));

		for (const field of filteredFields) {
			score += TextProcessor.calculateRelevance(normalizedQuery, field);
		}

		// Boost exact matches
		if (filteredFields.some(field => TextProcessor.normalize(field) === normalizedQuery)) {
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
		if (!sort) {
			return results;
		}

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
					// Only catalog items have price, use 0 for others
					const aPrice = a.data.$type === "unified_item"
						? (a.data.properties as ItemProperties)?.price?.amount || 0
						: 0;
					const bPrice = b.data.$type === "unified_item"
						? (b.data.properties as ItemProperties)?.price?.amount || 0
						: 0;
					comparison = aPrice - bPrice;
					break;
				}
			}

			return sort.direction === "desc" ? -comparison : comparison;
		});
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
			const items: (UnifiedItem | ManualItem | CatalogItem)[] = [];

			if (!source || source === "unified" || source === "catalog") {
				const catalogItems = await this.getCatalogItems();
				items.push(...catalogItems);
			}
			if (!source || source === "manual") {
				const manualItems = await this.getManualItems();
				items.push(...manualItems);
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
   * Get unified items (converted from graph items)
   */
	async getUnifiedItems(): Promise<UnifiedItem[]> {
		const cacheKey = "unified_items";
		let items = this.cache.get(cacheKey) as UnifiedItem[] | undefined;

		if (items) {
			return items;
		}

		try {
			const sampleSize = 50;
			const sampleIds = this.dataFiles!.items.slice(0, sampleSize);

			items = [];
			for (const filename of sampleIds) {
				try {
					const graphItem = await this.loadGraphItem(filename, "items");
					if (graphItem && graphItem.type === "item") {
						const convertedItem = this.convertGraphItemToUnified(graphItem);
						if (convertedItem) {
							items.push(convertedItem);
						}
					}
				} catch (error) {
					console.warn(`Failed to load graph item ${filename}:`, error);
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
			const sampleSize = 50;
			const sampleIds = this.dataFiles!.manuals.slice(0, sampleSize);

			const items: ManualItem[] = [];
			for (const filename of sampleIds) {
				try {
					const graphManual = await this.loadGraphItem(filename, "manuals");
					if (graphManual && graphManual.type === "manual") {
						const convertedItem = this.convertGraphToManualItem(graphManual);
						if (convertedItem) {
							items.push(convertedItem);
						}
					}
				} catch (error) {
					console.warn(`Failed to load graph manual ${filename}:`, error);
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
   * Get catalog items (alias for unified items from graph API)
   */
	async getCatalogItems(): Promise<UnifiedItem[]> {
		return this.getUnifiedItems();
	}

	/**
   * Get item by ID and type
   */
	async getItemById(id: string, type: "unified" | "manual" | "catalog"): Promise<UnifiedItem | ManualItem | CatalogItem | null> {
		try {
			switch (type) {
				case "unified":
				case "catalog": {
					const items = await this.getUnifiedItems();
					return items.find(item => item.id === id) || null;
				}
				case "manual": {
					const items = await this.getManualItems();
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
   * Get database statistics
   */
	async getStatistics(): Promise<DatabaseStats> {
		const cacheKey = "database_stats";
		let stats = this.cache.get(cacheKey);

		if (stats && typeof stats === "object") {
			return stats as DatabaseStats;
		}

		try {
			// Simple stats based on file counts
			const itemCount = this.dataFiles?.items.length || 0;
			const manualCount = this.dataFiles?.manuals.length || 0;

			stats = {
				generatedAt: new Date().toISOString(),
				totalItems: {
					unified: itemCount, // Items from graph API serve as unified
					manual: manualCount,
					catalog: itemCount,
				},
				sourceCoverage: {
					withManual: manualCount,
					withCatalog: itemCount,
					withBoth: Math.min(itemCount, manualCount), // Approximate
					singleSource: Math.abs(itemCount - manualCount),
				},
				quality: {
					highConfidence: itemCount + manualCount,
					mediumConfidence: 0,
					lowConfidence: 0,
					needsReview: 0,
				},
				dateRange: {
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
   * Get search suggestions for autocomplete
   */
	async getSearchSuggestions(query: string): Promise<string[]> {
		if (!query || query.length < 2) {
			return [];
		}

		await this.initialize();

		// Return common terms
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
					const grade = properties?.grade;
					if (grade && typeof grade === "string") {
						options.add(grade);
					} else if (grade && typeof grade === "object" && grade !== null && "code" in grade) {
						options.add((grade as { code: string }).code);
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
					const series = properties?.series;
					if (series) {
						if (typeof series === "object" && series.en) {
							options.add(series.en);
						} else if (typeof series === "object" && series.ja) {
							options.add(series.ja);
						} else if (typeof series === "string") {
							options.add(series);
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