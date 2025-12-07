/**
 * Client-Side Data Service
 *
 * A comprehensive client-side data service for managing hobby database collections.
 * Features memory-efficient caching, full-text search, multi-criteria filtering,
 * and intelligent data aggregation from multiple sources.
 */

// Temporary type definitions until @workspace/types is properly configured
interface LocalizedName {
  ja?: string;
  en?: string;
}

interface ReleaseDate {
  year: number;
  month?: number;
  day?: number;
  ja?: string;
  en?: string;
}

interface ManualItem {
  id: string;
  title: string;
  metadata: {
    language: "ja" | "en" | "mixed";
    encoding: string;
    extractedAt: string;
  };
  content: {
    blocks: Array<{
      type: string;
      content: {
        text?: string;
        ja?: string;
        src?: string;
        href?: string;
      };
    }>;
  };
  assets: {
    images: string[];
    links: string[];
  };
}

interface DatabaseCatalogItem {
  id: string;
  name: string;
  series?: string;
  grade?: string;
  scale?: string;
  productNumber?: string;
  releaseDate?: ReleaseDate;
  price?: {
    amount: number;
    currency: string;
  };
  images?: string[];
  description?: string;
  status?: "available" | "discontinued" | "preorder";
}

interface UnifiedItem {
  id: string;
  name: LocalizedName;
  series?: LocalizedName;
  grade?: string;
  scale?: string;
  productNumber?: string;
  releaseDate?: ReleaseDate;
  sources: {
    catalog?: {
      id: string;
      confidence: number;
      linkedAt: string;
    };
    manual?: {
      id: string;
      productNumber?: string;
      pdfUrl?: string;
      confidence: number;
      linkedAt: string;
    };
  };
  matchMethod: "exact" | "fuzzy" | "manual_override";
  matchStage?: number;
  createdAt: string;
  updatedAt: string;
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
    data: UnifiedItem | ManualItem | DatabaseCatalogItem;
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
  availability?: ("available" | "discontinued" | "preorder")[];
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

interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: FilterOptions;
  createdBy: string;
  isPublic: boolean;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

interface QueryOptions {
  debug?: boolean;
  timeout?: number;
  maxResults?: number;
  includeSimilar?: boolean;
  fieldWeights?: {
    name: number;
    series: number;
    description: number;
  };
}

interface DatabaseConfig {
  version: string;
  dataSources: {
    manual: {
      enabled: boolean;
      lastSync?: string;
      itemCount?: number;
    };
    catalog: {
      enabled: boolean;
      lastSync?: string;
      itemCount?: number;
    };
  };
  indexes: {
    search: {
      enabled: boolean;
      lastUpdated?: string;
      size?: number;
    };
    master: {
      enabled: boolean;
      lastUpdated?: string;
      size?: number;
    };
  };
  performance: {
    cacheSize?: number;
    queryTimeout?: number;
    maxConcurrentQueries?: number;
  };
}

interface MasterIndexItem {
  id: string;
  type: DataSourceType;
  name: string;
  series?: string;
  grade?: string;
  scale?: string;
  productNumber?: string;
  releaseYear?: number;
  lastModified: string;
  fileSize?: number;
  metadata?: Record<string, any>;
}

interface UnifiedIndexItem {
  id: string;
  name: LocalizedName;
  sourceCount: number;
  sourceTypes: DataSourceType[];
  matchConfidence?: number;
  lastUpdated: string;
  needsReview: boolean;
}

interface SearchIndexItem {
  id: string;
  terms: string[];
  normalizedText: string;
  weight: number;
  type: DataSourceType;
  sourceIds: string[];
  popularTerms?: string[];
  metadata?: Record<string, any>;
}

interface OperationConfig {
  id: string;
  name: string;
  description?: string;
  priority?: "low" | "normal" | "high" | "critical";
  estimatedDuration?: number;
  pausable?: boolean;
  cancellable?: boolean;
  progressInterval?: number;
  timeout?: number;
  retry?: {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
  };
  onProgress?: (progress: ProgressUpdate) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

interface ProgressUpdate {
  current: number;
  total: number;
  percentage: number;
  message?: string;
  eta?: number;
  rate?: number;
  metadata?: Record<string, any>;
}

import { progressTracker } from "./progressTracker";
import { workerManager } from "./worker-manager";

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

/** Default configuration values */
const DEFAULT_CONFIG = {
	/** Cache size in number of items */
	CACHE_SIZE: 1000,
	/** Search debounce delay in milliseconds */
	SEARCH_DEBOUNCE_MS: 300,
	/** Query timeout in milliseconds */
	QUERY_TIMEOUT_MS: 10_000,
	/** Pagination default limit */
	DEFAULT_PAGE_LIMIT: 50,
	/** Maximum pagination limit */
	MAX_PAGE_LIMIT: 200,
	/** LocalStorage key prefix */
	STORAGE_PREFIX: "hobby_db_",
	/** Index files base path */
	INDICES_PATH: "/data/indices/",
	/** Data files base path */
	DATA_PATH: "/data/",
};

/** Cache entry with TTL support */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

/** Search request with cancellation support */
interface SearchRequest {
  id: string;
  query: string;
  filters: FilterOptions;
  abortController: AbortController;
  resolve: (result: SearchResult) => void;
  reject: (error: Error) => void;
}

/** Data aggregation result with source metadata */
interface AggregationResult<T> {
  item: T;
  sources: DataSourceType[];
  confidence: number;
  conflicts: string[];
  lastUpdated: string;
}

// ============================================================================
// LRU CACHE IMPLEMENTATION
// ============================================================================

/**
 * Memory-efficient LRU (Least Recently Used) cache implementation
 * with TTL support and access statistics
 */
class LRUCache<T> {
	private cache = new Map<string, CacheEntry<T>>();
	private maxSize: number;
	private defaultTtl: number;

	constructor(maxSize: number = DEFAULT_CONFIG.CACHE_SIZE, defaultTtl: number = 5 * 60 * 1000) {
		this.maxSize = maxSize;
		this.defaultTtl = defaultTtl;
	}

	/**
   * Get an item from cache
   */
	get(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) {
			return null;
		}

		// Check TTL
		if (Date.now() - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			return null;
		}

		// Update access statistics
		entry.accessCount++;
		entry.lastAccessed = Date.now();

		// Move to end (most recently used)
		this.cache.delete(key);
		this.cache.set(key, entry);

		return entry.data;
	}

	/**
   * Set an item in cache
   */
	set(key: string, data: T, ttl?: number): void {
		// Evict oldest if at capacity
		if (this.cache.size >= this.maxSize) {
			const oldestKey = this.cache.keys().next().value;
			this.cache.delete(oldestKey);
		}

		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl: ttl || this.defaultTtl,
			accessCount: 1,
			lastAccessed: Date.now(),
		});
	}

	/**
   * Check if key exists and is valid
   */
	has(key: string): boolean {
		const entry = this.cache.get(key);
		if (!entry) {
			return false;
		}

		if (Date.now() - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	/**
   * Delete an item from cache
   */
	delete(key: string): boolean {
		return this.cache.delete(key);
	}

	/**
   * Clear all cache entries
   */
	clear(): void {
		this.cache.clear();
	}

	/**
   * Get cache statistics
   */
	getStats() {
		const now = Date.now();
		const entries = [...this.cache.values()];

		return {
			size: this.cache.size,
			maxSize: this.maxSize,
			hitRate: entries.reduce((sum, e) => sum + e.accessCount, 0) / Math.max(this.cache.size, 1),
			memoryUsage: entries.reduce((sum, e) => sum + JSON.stringify(e.data).length, 0),
			oldestEntry: Math.min(...entries.map(e => e.timestamp)),
			newestEntry: Math.max(...entries.map(e => e.timestamp)),
		};
	}
}

// ============================================================================
// LOCAL STORAGE MANAGER
// ============================================================================

/**
 * LocalStorage manager with error handling and compression support
 */
class StorageManager {
	private prefix: string;

	constructor(prefix: string = DEFAULT_CONFIG.STORAGE_PREFIX) {
		this.prefix = prefix;
	}

	/**
   * Store data in localStorage with error handling
   */
	setItem<T>(key: string, data: T, ttl?: number): boolean {
		try {
			const storageKey = this.prefix + key;
			const payload = {
				data,
				timestamp: Date.now(),
				ttl: ttl || 24 * 60 * 60 * 1000, // 24 hours default
			};

			localStorage.setItem(storageKey, JSON.stringify(payload));
			return true;
		} catch (error) {
			console.warn("Failed to store data in localStorage:", error);

			// Try to clear old entries and retry
			this.cleanup();
			try {
				localStorage.setItem(this.prefix + key, JSON.stringify(payload));
				return true;
			} catch (retryError) {
				console.error("Retry failed for localStorage storage:", retryError);
				return false;
			}
		}
	}

	/**
   * Retrieve data from localStorage with TTL validation
   */
	getItem<T>(key: string): T | null {
		try {
			const storageKey = this.prefix + key;
			const item = localStorage.getItem(storageKey);

			if (!item) {
				return null;
			}

			const payload = JSON.parse(item);

			// Check TTL
			if (Date.now() - payload.timestamp > payload.ttl) {
				localStorage.removeItem(storageKey);
				return null;
			}

			return payload.data as T;
		} catch (error) {
			console.warn("Failed to retrieve data from localStorage:", error);
			return null;
		}
	}

	/**
   * Remove an item from localStorage
   */
	removeItem(key: string): boolean {
		try {
			localStorage.removeItem(this.prefix + key);
			return true;
		} catch (error) {
			console.warn("Failed to remove item from localStorage:", error);
			return false;
		}
	}

	/**
   * Clean up expired items from localStorage
   */
	cleanup(): void {
		try {
			const keys = Object.keys(localStorage);
			const now = Date.now();

			for (const key of keys) {
				if (key.startsWith(this.prefix)) {
					try {
						const item = localStorage.getItem(key);
						if (item) {
							const payload = JSON.parse(item);
							if (now - payload.timestamp > payload.ttl) {
								localStorage.removeItem(key);
							}
						}
					} catch {
						// Remove corrupted items
						localStorage.removeItem(key);
					}
				}
			}
		} catch (error) {
			console.warn("Failed to cleanup localStorage:", error);
		}
	}

	/**
   * Get storage usage statistics
   */
	getUsageStats() {
		try {
			const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
			let totalSize = 0;
			let validItems = 0;

			for (const key of keys) {
				const item = localStorage.getItem(key);
				if (item) {
					totalSize += item.length;
					try {
						const payload = JSON.parse(item);
						if (Date.now() - payload.timestamp <= payload.ttl) {
							validItems++;
						}
					} catch {
						// Invalid JSON
					}
				}
			}

			return {
				totalKeys: keys.length,
				validItems,
				totalSize: totalSize, // bytes
				totalSizeKB: Math.round(totalSize / 1024),
				estimatedSpace: Math.round(5 * 1024 * 1024 - totalSize), // Assume 5MB quota
			};
		} catch (error) {
			console.warn("Failed to get storage usage stats:", error);
			return null;
		}
	}
}

// ============================================================================
// TEXT PROCESSING & SEARCH UTILITIES
// ============================================================================

/**
 * Text processing utilities for search functionality
 */
class TextProcessor {
	/**
   * Normalize text for searching (lowercase, remove punctuation, etc.)
   */
	static normalize(text: string): string {
		return text
			.toLowerCase()
			.replaceAll(/[^\w\s\u3040-\u9FAF]/g, " ") // Keep Japanese characters
			.replaceAll(/\s+/g, " ")
			.trim();
	}

	/**
   * Tokenize text into searchable terms
   */
	static tokenize(text: string): string[] {
		const normalized = this.normalize(text);

		// Split on whitespace and filter out short terms
		return normalized
			.split(" ")
			.filter(term => term.length >= 2)
			.filter(term => !this.isStopWord(term));
	}

	/**
   * Check if a term is a stop word
   */
	private static isStopWord(term: string): boolean {
		const stopWords = new Set([
			"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
			"of", "with", "by", "from", "up", "about", "into", "through", "during",
			"before", "after", "above", "below", "between", "among", "is", "are",
			"was", "were", "be", "been", "being", "have", "has", "had", "do",
			"does", "did", "will", "would", "could", "should", "may", "might",
			"must", "can", "this", "that", "these", "those",
		]);

		return stopWords.has(term);
	}

	/**
   * Calculate relevance score between query and text
   */
	static calculateRelevance(query: string, text: string): number {
		const queryTerms = this.tokenize(query);
		const textTerms = this.tokenize(text);

		if (queryTerms.length === 0) return 0;
		if (textTerms.length === 0) return 0;

		// Calculate term frequency
		const queryFreq = new Map<string, number>();
		const textFreq = new Map<string, number>();

		for (const term of queryTerms) {
			queryFreq.set(term, (queryFreq.get(term) || 0) + 1);
		}

		for (const term of textTerms) {
			textFreq.set(term, (textFreq.get(term) || 0) + 1);
		}

		// Calculate cosine similarity
		let dotProduct = 0;
		let queryMagnitude = 0;
		let textMagnitude = 0;

		for (const [term, qCount] of queryFreq.entries()) {
			const tCount = textFreq.get(term) || 0;
			dotProduct += qCount * tCount;
			queryMagnitude += qCount * qCount;
		}

		for (const tCount of textFreq) {
			textMagnitude += tCount * tCount;
		}

		if (queryMagnitude === 0 || textMagnitude === 0) return 0;

		return dotProduct / (Math.sqrt(queryMagnitude) * Math.sqrt(textMagnitude));
	}

	/**
   * Highlight matching terms in text
   */
	static highlightMatches(text: string, query: string): string {
		const queryTerms = this.tokenize(query);
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
	private static escapeRegex(string: string): string {
		return string.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
	}
}

// ============================================================================
// MAIN DATA SERVICE CLASS
// ============================================================================

/**
 * Main data service class for client-side hobby database management
 */
export class DataService {
	private cache: LRUCache<any>;
	private storage: StorageManager;
	private searchRequests: Map<string, SearchRequest> = new Map();
	private isInitialized = false;
	private config: DatabaseConfig | null = null;

	constructor() {
		this.cache = new LRUCache();
		this.storage = new StorageManager();
	}

	/**
   * Initialize the data service
   */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		try {
			// Load configuration
			this.config = await this.loadConfig();

			// Clean up old storage entries
			this.storage.cleanup();

			this.isInitialized = true;
		} catch (error) {
			console.error("Failed to initialize data service:", error);
			throw error;
		}
	}

	/**
   * Search items across all data sources with progress tracking
   */
	async searchItems(
		query: string,
		filters: FilterOptions = {},
		options: QueryOptions & {
      useWorker?: boolean;
      onProgress?: (progress: { current: number; total: number; message?: string; percentage: number }) => void;
    } = {},
	): Promise<SearchResult> {
		const operationConfig: OperationConfig = {
			id: `search_${this.generateRequestId()}`,
			name: "Search Items",
			description: `Searching for: ${query || "all items"}`,
			priority: "normal",
			timeout: options.timeout || DEFAULT_CONFIG.QUERY_TIMEOUT_MS,
			onProgress: options.onProgress,
			retry: {
				maxAttempts: 2,
				backoffMs: 500,
				maxBackoffMs: 2000,
			},
		};

		return progressTracker.startOperation(operationConfig.id, async ({ updateProgress, checkCancelled }) => {
			updateProgress({ current: 0, total: 100, message: "Loading indices..." });

			// Load indices in parallel
			const [searchIndex, unifiedIndex, masterIndex] = await Promise.all([
				this.loadSearchIndex(),
				this.loadUnifiedIndex(),
				this.loadMasterIndex(),
			]);

			if (checkCancelled()) {
				throw new Error("Search cancelled");
			}

			updateProgress({ current: 30, total: 100, message: "Performing search..." });

			let searchResults: SearchResult["items"];

			// Use Web Worker if enabled and available
			if (options.useWorker && workerManager) {
				try {
					searchResults = await workerManager.performSearch(
						searchIndex.items,
						query,
						filters,
						{
							fieldWeights: options.fieldWeights,
							onProgress: (progress) => {
								const adjustedProgress = 30 + (progress.percentage * 0.4); // 30-70%
								updateProgress({
									current: adjustedProgress,
									total: 100,
									message: `Searching in worker: ${progress.current}/${progress.total}`,
								});
							},
						},
					);
				} catch (workerError) {
					console.warn("Worker search failed, falling back to main thread:", workerError);
					// Fall back to main thread search
					searchResults = await this.performSearchMainThread(searchIndex, query, filters, updateProgress);
				}
			} else {
				searchResults = await this.performSearchMainThread(searchIndex, query, filters, updateProgress);
			}

			if (checkCancelled()) {
				throw new Error("Search cancelled");
			}

			updateProgress({ current: 70, total: 100, message: "Applying filters..." });

			// Apply filters and sorting
			const filteredResults = this.applyFilters(searchResults, filters);
			const sortedResults = this.applySorting(filteredResults, filters.sort);

			updateProgress({ current: 90, total: 100, message: "Finalizing results..." });

			// Get pagination info
			const page = 1;
			const limit = DEFAULT_CONFIG.DEFAULT_PAGE_LIMIT;

			const result: SearchResult = {
				items: sortedResults.slice(0, limit),
				total: sortedResults.length,
				queryTime: Date.now() - (operationConfig as any).startTime,
				pagination: {
					page,
					limit,
					total: sortedResults.length,
					totalPages: Math.ceil(sortedResults.length / limit),
				},
			};

			updateProgress({ current: 100, total: 100, message: "Search completed" });

			return result;
		});
	}

	/**
   * Perform search on main thread (fallback)
   */
	private async performSearchMainThread(
		searchIndex: { items: SearchIndexItem[] },
		query: string,
		filters: FilterOptions,
		updateProgress: (progress: { current: number; total: number; message?: string }) => void,
	): Promise<SearchResult["items"]> {
		return new Promise((resolve) => {
			const normalizedQuery = TextProcessor.normalize(query);
			const queryTerms = TextProcessor.tokenize(query);

			const results = searchIndex.items
				.map(item => {
					let score = 0;

					if (queryTerms.length > 0) {
						score = TextProcessor.calculateRelevance(normalizedQuery, item.normalizedText);

						// Boost exact matches
						if (item.normalizedText === normalizedQuery) {
							score += 1;
						}

						// Boost popular terms
						if (item.popularTerms) {
							const popularMatches = queryTerms.filter(term => item.popularTerms!.includes(term));
							score += popularMatches.length * 0.3;
						}
					} else {
						// No query, use weight from index
						score = item.weight;
					}

					return {
						id: item.id,
						type: item.type,
						score,
						highlights: {
							name: query ? TextProcessor.highlightMatches(item.normalizedText, query) : undefined,
						},
						data: null,
					};
				})
				.filter(item => item.score > 0.1)
				.sort((a, b) => b.score - a.score);

			resolve(results);
		});
	}

	/**
   * Get an item by ID from preferred data source
   */
	async getItemById(id: string, preferSource?: DataSourceType): Promise<UnifiedItem | ManualItem | DatabaseCatalogItem | null> {
		const cacheKey = `item_${id}_${preferSource || "any"}`;

		// Check cache first
		let item = this.cache.get(cacheKey);
		if (item) {
			return item;
		}

		// Check localStorage
		item = this.storage.getItem(cacheKey);
		if (item) {
			this.cache.set(cacheKey, item);
			return item;
		}

		try {
			// Load from appropriate data source
			if (preferSource) {
				item = await this.loadItemFromSource(id, preferSource);
			} else {
				// Try unified data first, then individual sources
				item = await this.loadItemFromSource(id, "unified") ||
               await this.loadItemFromSource(id, "manual") ||
               await this.loadItemFromSource(id, "catalog");
			}

			if (item) {
				this.cache.set(cacheKey, item);
				this.storage.setItem(cacheKey, item);
			}

			return item;
		} catch (error) {
			console.error(`Failed to load item ${id}:`, error);
			return null;
		}
	}

	/**
   * Get paginated items from data source
   */
	async getItemsByPage(
		page: number = 1,
		limit: number = DEFAULT_CONFIG.DEFAULT_PAGE_LIMIT,
		source?: DataSourceType,
	): Promise<PaginationResult<UnifiedItem | ManualItem | DatabaseCatalogItem>> {
		const cacheKey = `page_${page}_${limit}_${source || "all"}`;

		// Check cache
		let result = this.cache.get(cacheKey);
		if (result) {
			return result;
		}

		try {
			// Load master index
			const masterIndex = await this.loadMasterIndex();

			// Filter by source if specified
			let filteredItems = masterIndex.items;
			if (source) {
				filteredItems = masterIndex.items.filter(item => item.type === source);
			}

			// Sort by last modified (newest first)
			filteredItems.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

			// Calculate pagination
			const total = filteredItems.length;
			const totalPages = Math.ceil(total / limit);
			const startIndex = (page - 1) * limit;
			const endIndex = startIndex + limit;
			const pageItems = filteredItems.slice(startIndex, endIndex);

			// Load full item data for page
			const items = await Promise.all(
				pageItems.map(indexItem => this.getItemById(indexItem.id, indexItem.type)),
			);

			// Filter out null results
			const validItems = items.filter((item): item is UnifiedItem | ManualItem | DatabaseCatalogItem => item !== null);

			result = {
				items: validItems,
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
   * Get all unified items
   */
	async getUnifiedItems(): Promise<UnifiedItem[]> {
		const cacheKey = "unified_items_all";

		let items = this.cache.get(cacheKey);
		if (items) {
			return items;
		}

		try {
			// Load unified items from master index since we don't have a single file
			const masterIndex = await this.loadMasterIndex();
			const unifiedItemIds = masterIndex.items
				.filter(item => item.type === "unified")
				.map(item => item.id);

			// Load a sample of unified items for now
			const sampleSize = Math.min(100, unifiedItemIds.length);
			const sampleIds = unifiedItemIds.slice(0, sampleSize);

			items = await Promise.all(
				sampleIds.map(id => this.getItemById(id, "unified")),
			).then(results => results.filter(item => item !== null));

			this.cache.set(cacheKey, items);
			return items;
		} catch (error) {
			console.error("Failed to load unified items:", error);
			throw error;
		}
	}

	/**
   * Get manual-only items
   */
	async getManualsOnly(): Promise<ManualItem[]> {
		const cacheKey = "manual_items_all";

		let items = this.cache.get(cacheKey);
		if (items) {
			return items;
		}

		try {
			const response = await fetch(`${DEFAULT_CONFIG.DATA_PATH}bandai/manuals.json`);
			if (!response.ok) {
				throw new Error(`Failed to load manual items: ${response.statusText}`);
			}

			items = await response.json();
			this.cache.set(cacheKey, items);
			return items;
		} catch (error) {
			console.error("Failed to load manual items:", error);
			throw error;
		}
	}

	/**
   * Get catalog-only items
   */
	async getCatalogOnly(): Promise<DatabaseCatalogItem[]> {
		const cacheKey = "catalog_items_all";

		let items = this.cache.get(cacheKey);
		if (items) {
			return items;
		}

		try {
			const response = await fetch(`${DEFAULT_CONFIG.DATA_PATH}bandai/catalog.json`);
			if (!response.ok) {
				throw new Error(`Failed to load catalog items: ${response.statusText}`);
			}

			items = await response.json();
			this.cache.set(cacheKey, items);
			return items;
		} catch (error) {
			console.error("Failed to load catalog items:", error);
			throw error;
		}
	}

	/**
   * Get available filter options for a field
   */
	async getFilterOptions(field: string): Promise<string[]> {
		const cacheKey = `filter_options_${field}`;

		let options = this.cache.get(cacheKey);
		if (options) {
			return options;
		}

		try {
			// Load search index for field extraction
			const searchIndex = await this.loadSearchIndex();

			// Extract unique values for the field
			const uniqueValues = new Set<string>();

			for (const item of searchIndex.items) {
				switch (field) {
					case "grade": {
						if (item.metadata?.grade) {
							uniqueValues.add(item.metadata.grade);
						}
						break;
					}
					case "scale": {
						if (item.metadata?.scale) {
							uniqueValues.add(item.metadata.scale);
						}
						break;
					}
					case "series": {
						if (item.metadata?.series) {
							uniqueValues.add(item.metadata.series);
						}
						break;
					}
					default: {
						// Extract from normalized text
						for (const term of item.terms) {
							if (term.toLowerCase().includes(field.toLowerCase())) {
								uniqueValues.add(term);
							}
						}
					}
				}
			}

			options = [...uniqueValues].sort();
			this.cache.set(cacheKey, options);
			return options;
		} catch (error) {
			console.error(`Failed to get filter options for ${field}:`, error);
			return [];
		}
	}

	/**
   * Get database statistics
   */
	async getStatistics(): Promise<DatabaseStats> {
		const cacheKey = "database_stats";

		let stats = this.cache.get(cacheKey);
		if (stats) {
			return stats;
		}

		try {
			const [unifiedItems, manualItems, catalogItems] = await Promise.all([
				this.getUnifiedItems(),
				this.getManualsOnly(),
				this.getCatalogOnly(),
			]);

			stats = {
				generatedAt: new Date().toISOString(),
				totalItems: {
					unified: unifiedItems.length,
					manual: manualItems.length,
					catalog: catalogItems.length,
				},
				sourceCoverage: {
					withManual: unifiedItems.filter(item => item.sources.manual).length,
					withCatalog: unifiedItems.filter(item => item.sources.catalog).length,
					withBoth: unifiedItems.filter(item => item.sources.manual && item.sources.catalog).length,
					singleSource: unifiedItems.filter(item =>
						(item.sources.manual ? 1 : 0) + (item.sources.catalog ? 1 : 0) === 1,
					).length,
				},
				quality: {
					highConfidence: unifiedItems.filter(item => item.matchStage && item.matchStage >= 4).length,
					mediumConfidence: unifiedItems.filter(item => item.matchStage && item.matchStage >= 2 && item.matchStage < 4).length,
					lowConfidence: unifiedItems.filter(item => item.matchStage && item.matchStage < 2).length,
					needsReview: unifiedItems.filter(item => item.matchMethod === "manual_override").length,
				},
				dateRange: {
					earliestYear: Math.min(
						...unifiedItems
							.map(item => item.releaseDate?.year)
							.filter(year => year !== undefined) as number[],
					),
					latestYear: Math.max(
						...unifiedItems
							.map(item => item.releaseDate?.year)
							.filter(year => year !== undefined) as number[],
					),
				},
			};

			this.cache.set(cacheKey, stats);
			return stats;
		} catch (error) {
			console.error("Failed to get database statistics:", error);
			throw error;
		}
	}

	/**
   * Get service cache statistics
   */
	getCacheStats() {
		return {
			memory: this.cache.getStats(),
			storage: this.storage.getUsageStats(),
			activeSearches: this.searchRequests.size,
		};
	}

	/**
   * Get comprehensive service statistics including workers and progress
   */
	getServiceStats() {
		return {
			cache: this.cache.getStats(),
			storage: this.storage.getUsageStats(),
			activeSearches: this.searchRequests.size,
			workers: workerManager ? workerManager.getStats() : null,
			progress: progressTracker.getGlobalStats(),
			isInitialized: this.isInitialized,
		};
	}

	/**
   * Preload common data for better performance
   */
	async preloadData(options: {
    indices?: boolean;
    sampleData?: number;
    useWorker?: boolean;
    onProgress?: (progress: { current: number; total: number; message?: string }) => void;
  } = {}): Promise<void> {
		const operationConfig: OperationConfig = {
			id: `preload_${this.generateRequestId()}`,
			name: "Preload Data",
			description: "Preloading common data for better performance",
			priority: "low",
			pausable: true,
			cancellable: true,
			onProgress: options.onProgress,
		};

		return progressTracker.startOperation(operationConfig.id, async ({ updateProgress, checkPaused, checkCancelled }) => {
			updateProgress({ current: 0, total: 100, message: "Starting preload..." });

			const steps = [];
			let currentStep = 0;

			if (options.indices !== false) {
				steps.push("Loading indices");
			}
			if (options.sampleData && options.sampleData > 0) {
				steps.push("Loading sample data");
			}

			const totalSteps = steps.length;

			// Load indices
			if (options.indices !== false) {
				if (checkPaused()) await this.waitForResume();
				if (checkCancelled()) throw new Error("Preload cancelled");

				updateProgress({
					current: (currentStep / totalSteps) * 100,
					total: 100,
					message: "Loading indices...",
				});

				await Promise.all([
					this.loadMasterIndex(),
					this.loadUnifiedIndex(),
					this.loadSearchIndex(),
				]);

				currentStep++;
			}

			// Load sample data
			if (options.sampleData && options.sampleData > 0) {
				if (checkPaused()) await this.waitForResume();
				if (checkCancelled()) throw new Error("Preload cancelled");

				updateProgress({
					current: (currentStep / totalSteps) * 100,
					total: 100,
					message: `Loading ${options.sampleData} sample items...`,
				});

				await this.getItemsByPage(1, options.sampleData);

				currentStep++;
			}

			updateProgress({ current: 100, total: 100, message: "Preload completed" });
		});
	}

	/**
   * Export data for backup or analysis
   */
	async exportData(options: {
    sources?: DataSourceType[];
    format?: "json" | "csv";
    includeStats?: boolean;
    onProgress?: (progress: { current: number; total: number; message?: string }) => void;
  } = {}): Promise<Blob> {
		const operationConfig: OperationConfig = {
			id: `export_${this.generateRequestId()}`,
			name: "Export Data",
			description: "Exporting data for backup or analysis",
			priority: "normal",
			onProgress: options.onProgress,
		};

		return progressTracker.startOperation(operationConfig.id, async ({ updateProgress }) => {
			updateProgress({ current: 0, total: 100, message: "Starting export..." });

			const sources = options.sources || ["unified", "manual", "catalog"];
			const allData: any[] = [];

			for (let i = 0; i < sources.length; i++) {
				const source = sources[i];

				updateProgress({
					current: (i / sources.length) * 80,
					total: 100,
					message: `Exporting ${source} data...`,
				});

				switch (source) {
					case "unified": {
						allData.push(...await this.getUnifiedItems());
						break;
					}
					case "manual": {
						allData.push(...await this.getManualsOnly());
						break;
					}
					case "catalog": {
						allData.push(...await this.getCatalogOnly());
						break;
					}
				}
			}

			updateProgress({ current: 80, total: 100, message: "Formatting export..." });

			let exportData: any;
			let mimeType: string;

			if (options.format === "csv") {
				// Simple CSV export
				exportData = this.convertToCSV(allData);
				mimeType = "text/csv";
			} else {
				// JSON export with optional stats
				exportData = {
					exportedAt: new Date().toISOString(),
					sources,
					itemCount: allData.length,
					...(options.includeStats && { statistics: await this.getStatistics() }),
					data: allData,
				};
				mimeType = "application/json";
			}

			updateProgress({ current: 100, total: 100, message: "Export completed" });

			return new Blob([JSON.stringify(exportData, null, 2)], { type: mimeType });
		});
	}

	/**
   * Clear all caches
   */
	clearCache(): void {
		this.cache.clear();
		this.storage.cleanup();
	}

	/**
   * Get or create filter presets
   */
	async getFilterPresets(): Promise<FilterPreset[]> {
		const cacheKey = "filter_presets";

		let presets = this.cache.get<FilterPreset[]>(cacheKey);
		if (presets) {
			return presets;
		}

		// Load from localStorage
		presets = this.storage.getItem<FilterPreset[]>(cacheKey) || this.getDefaultPresets();

		this.cache.set(cacheKey, presets);
		return presets;
	}

	/**
   * Save filter preset
   */
	async saveFilterPreset(preset: FilterPreset): Promise<void> {
		const presets = await this.getFilterPresets();
		const existingIndex = presets.findIndex(p => p.id === preset.id);

		if (existingIndex === -1) {
			presets.push(preset);
		} else {
			presets[existingIndex] = preset;
		}

		const cacheKey = "filter_presets";
		this.cache.set(cacheKey, presets);
		this.storage.setItem(cacheKey, presets);
	}

	/**
   * Delete filter preset
   */
	async deleteFilterPreset(id: string): Promise<void> {
		const presets = await this.getFilterPresets();
		const filteredPresets = presets.filter(p => p.id !== id);

		const cacheKey = "filter_presets";
		this.cache.set(cacheKey, filteredPresets);
		this.storage.setItem(cacheKey, filteredPresets);
	}

	// ============================================================================
	// PRIVATE HELPER METHODS
	// ============================================================================

	/**
   * Wait for operation to resume
   */
	private async waitForResume(): Promise<void> {
		return new Promise(resolve => {
			const checkInterval = setInterval(() => {
				// In a real implementation, this would check the operation state
				// For now, just resolve immediately
				clearInterval(checkInterval);
				resolve();
			}, 100);
		});
	}

	/**
   * Convert data to CSV format
   */
	private convertToCSV(data: any[]): string {
		if (data.length === 0) return "";

		const headers = Object.keys(data[0]);
		const csvRows = [headers.join(",")];

		for (const item of data) {
			const values = headers.map(header => {
				const value = item[header];
				return typeof value === "string" && value.includes(",")
					? `"${value.replaceAll('"', '""')}"`
					: value;
			});
			csvRows.push(values.join(","));
		}

		return csvRows.join("\n");
	}

	/**
   * Get default filter presets
   */
	private getDefaultPresets(): FilterPreset[] {
		return [
			{
				id: "recent_releases",
				name: "Recent Releases",
				description: "Items from the last 2 years",
				filters: {
					releaseDateRange: {
						start: new Date().getFullYear() - 2,
						end: new Date().getFullYear(),
					},
				},
				createdBy: "system",
				isPublic: true,
				useCount: 0,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				id: "high_grade",
				name: "High Grade Models",
				description: "HG (High Grade) model kits",
				filters: {
					grade: ["HG", "High Grade"],
				},
				createdBy: "system",
				isPublic: true,
				useCount: 0,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				id: "master_grade",
				name: "Master Grade Models",
				description: "MG (Master Grade) model kits",
				filters: {
					grade: ["MG", "Master Grade"],
				},
				createdBy: "system",
				isPublic: true,
				useCount: 0,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		];
	}

	// ============================================================================
	// PRIVATE HELPER METHODS
	// ============================================================================

	/**
   * Generate unique request ID
   */
	private generateRequestId(): string {
		return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
	}

	/**
   * Cancel pending searches for a query
   */
	private cancelPendingSearches(query: string): void {
		for (const [id, request] of this.searchRequests.entries()) {
			if (request.query === query && !request.abortController.signal.aborted) {
				request.abortController.abort();
				request.reject(new Error("Search cancelled by newer request"));
			}
		}
	}

	/**
   * Debounced search implementation
   */
	private debouncedSearch(request: SearchRequest): void {
		setTimeout(async () => {
			if (request.abortController.signal.aborted) {
				return;
			}

			try {
				const result = await this.executeSearch(request.query, request.filters, request.abortController.signal);
				request.resolve(result);
			} catch (error) {
				if (error.name !== "AbortError") {
					request.reject(error as Error);
				}
			}
		}, DEFAULT_CONFIG.SEARCH_DEBOUNCE_MS);
	}

	/**
   * Execute search with all data sources
   */
	private async executeSearch(query: string, filters: FilterOptions, signal: AbortSignal): Promise<SearchResult> {
		const startTime = Date.now();

		try {
			// Load indices in parallel
			const [searchIndex, unifiedIndex, masterIndex] = await Promise.all([
				this.loadSearchIndex(),
				this.loadUnifiedIndex(),
				this.loadMasterIndex(),
			]);

			// Check for abort
			if (signal.aborted) {
				throw new Error("Search aborted");
			}

			// Perform search across all sources
			const searchResults = await this.performSearch(searchIndex, query, filters);

			// Apply filters and sorting
			const filteredResults = this.applyFilters(searchResults, filters);
			const sortedResults = this.applySorting(filteredResults, filters.sort);

			// Get pagination info from filters
			const page = filters.query ? 1 : 1; // Default to first page
			const limit = filters.sort?.field === "relevance" ? 50 : DEFAULT_CONFIG.DEFAULT_PAGE_LIMIT;

			const result: SearchResult = {
				items: sortedResults.slice(0, limit),
				total: sortedResults.length,
				queryTime: Date.now() - startTime,
				pagination: {
					page,
					limit,
					total: sortedResults.length,
					totalPages: Math.ceil(sortedResults.length / limit),
				},
			};

			return result;
		} catch (error) {
			if (signal.aborted) {
				throw new Error("Search aborted");
			}
			throw error;
		}
	}

	/**
   * Load database configuration
   */
	private async loadConfig(): Promise<DatabaseConfig> {
		const cacheKey = "database_config";

		let config = this.cache.get(cacheKey);
		if (config) {
			return config;
		}

		try {
			const response = await fetch(`${DEFAULT_CONFIG.INDICES_PATH}config.json`);
			if (!response.ok) {
				// Return default config if not found
				return this.getDefaultConfig();
			}

			config = await response.json();
			this.cache.set(cacheKey, config);
			return config;
		} catch (error) {
			console.warn("Failed to load config, using defaults:", error);
			return this.getDefaultConfig();
		}
	}

	/**
   * Get default database configuration
   */
	private getDefaultConfig(): DatabaseConfig {
		return {
			version: "1.0.0",
			dataSources: {
				manual: { enabled: true },
				catalog: { enabled: true },
			},
			indexes: {
				search: { enabled: true },
				master: { enabled: true },
			},
			performance: {
				cacheSize: 50,
				queryTimeout: 10,
				maxConcurrentQueries: 5,
			},
		};
	}

	/**
   * Load master index
   */
	private async loadMasterIndex(): Promise<{ items: MasterIndexItem[] }> {
		const cacheKey = "master_index";

		let index = this.cache.get(cacheKey);
		if (index) {
			return index;
		}

		try {
			const response = await fetch(`${DEFAULT_CONFIG.INDICES_PATH}master-index.json`);
			if (!response.ok) {
				throw new Error(`Failed to load master index: ${response.statusText}`);
			}

			index = await response.json();
			this.cache.set(cacheKey, index, 10 * 60 * 1000); // 10 minutes TTL
			return index;
		} catch (error) {
			console.error("Failed to load master index:", error);
			throw error;
		}
	}

	/**
   * Load unified index
   */
	private async loadUnifiedIndex(): Promise<{ items: UnifiedIndexItem[] }> {
		const cacheKey = "unified_index";

		let index = this.cache.get(cacheKey);
		if (index) {
			return index;
		}

		try {
			const response = await fetch(`${DEFAULT_CONFIG.INDICES_PATH}unified-index.json`);
			if (!response.ok) {
				throw new Error(`Failed to load unified index: ${response.statusText}`);
			}

			index = await response.json();
			this.cache.set(cacheKey, index, 10 * 60 * 1000); // 10 minutes TTL
			return index;
		} catch (error) {
			console.error("Failed to load unified index:", error);
			throw error;
		}
	}

	/**
   * Load search index
   */
	private async loadSearchIndex(): Promise<{ items: SearchIndexItem[] }> {
		const cacheKey = "search_index";

		let index = this.cache.get(cacheKey);
		if (index) {
			return index;
		}

		try {
			const response = await fetch(`${DEFAULT_CONFIG.INDICES_PATH}search-index.json`);
			if (!response.ok) {
				throw new Error(`Failed to load search index: ${response.statusText}`);
			}

			index = await response.json();
			this.cache.set(cacheKey, index, 10 * 60 * 1000); // 10 minutes TTL
			return index;
		} catch (error) {
			console.error("Failed to load search index:", error);
			throw error;
		}
	}

	/**
   * Load item from specific data source
   */
	private async loadItemFromSource(id: string, source: DataSourceType): Promise<any> {
		let filePath: string;

		switch (source) {
			case "unified": {
				filePath = `${DEFAULT_CONFIG.DATA_PATH}bandai/unified/${id}.json`;
				break;
			}
			case "manual": {
				filePath = `${DEFAULT_CONFIG.DATA_PATH}bandai/manuals/${id}.json`;
				break;
			}
			case "catalog": {
				filePath = `${DEFAULT_CONFIG.DATA_PATH}bandai/items/${id}.json`;
				break;
			}
			default: {
				throw new Error(`Unknown data source: ${source}`);
			}
		}

		const response = await fetch(filePath);
		if (!response.ok) {
			return null;
		}

		return response.json();
	}

	/**
   * Perform search on search index
   */
	private async performSearch(searchIndex: { items: SearchIndexItem[] }, query: string, filters: FilterOptions): Promise<SearchResult["items"]> {
		const normalizedQuery = TextProcessor.normalize(query);
		const queryTerms = TextProcessor.tokenize(query);

		// Score and match items
		const results = searchIndex.items
			.map(item => {
				let score = 0;

				// Calculate relevance score
				if (queryTerms.length > 0) {
					score = TextProcessor.calculateRelevance(normalizedQuery, item.normalizedText);

					// Boost exact matches
					if (item.normalizedText === normalizedQuery) {
						score += 1;
					}

					// Boost popular terms
					if (item.popularTerms) {
						for (const term of queryTerms) {
							if (item.popularTerms!.includes(term)) {
								score += 0.5;
							}
						}
					}
				} else {
					// No query, use weight from index
					score = item.weight;
				}

				// Apply field weights if specified
				if (filters.query && item.metadata && // Boost name matches
          item.metadata.name && item.metadata.name.toLowerCase().includes(query.toLowerCase())) {
					score *= 1.5;
				}

				return {
					id: item.id,
					type: item.type,
					score,
					highlights: {
						name: query ? TextProcessor.highlightMatches(item.normalizedText, query) : undefined,
					},
					data: null, // Will be loaded later if needed
				};
			})
			.filter(item => item.score > 0.1) // Filter out very low scores
			.sort((a, b) => b.score - a.score);

		return results;
	}

	/**
   * Apply filters to search results
   */
	private applyFilters(results: SearchResult["items"], filters: FilterOptions): SearchResult["items"] {
		return results.filter(result => {
			// Apply series filter
			if (filters.series && filters.series.length > 0) {
				// This would need actual item data, simplified for now
			}

			// Apply grade filter
			if (filters.grade && filters.grade.length > 0) {
				// This would need actual item data, simplified for now
			}

			// Apply scale filter
			if (filters.scale && filters.scale.length > 0) {
				// This would need actual item data, simplified for now
			}

			// Apply release date range filter
			if (filters.releaseDateRange) {
				// This would need actual item data, simplified for now
			}

			return true;
		});
	}

	/**
   * Apply sorting to results
   */
	private applySorting(results: SearchResult["items"], sort?: FilterOptions["sort"]): SearchResult["items"] {
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
					comparison = (a.data?.name?.en || a.data?.name || "").localeCompare(b.data?.name?.en || b.data?.name || "");
					break;
				}
				case "releaseDate": {
					// This would need actual item data
					comparison = 0;
					break;
				}
				case "price": {
					// This would need actual item data
					comparison = 0;
					break;
				}
			}

			return sort.direction === "desc" ? -comparison : comparison;
		});
	}
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

// Export important types for component usage
export type {
	LocalizedName,
	ReleaseDate,
	ManualItem,
	DatabaseCatalogItem,
	UnifiedItem,
	SearchResult,
	FilterOptions,
	FilterPreset,
	DataSourceType,
	PaginationResult,
	DatabaseStats,
	QueryOptions,
	DatabaseConfig,
};

/** Global data service instance */
export const dataService = new DataService();