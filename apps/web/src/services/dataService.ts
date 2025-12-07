/**
 * Client-Side Data Service for hobby.ninja Database
 *
 * A simplified data service that works with the actual data structure
 * in apps/web/public/data/bandai/ with three main data sources:
 * - unified/ - Merged catalog and manual data
 * - items/ - Catalog items only
 * - manuals/ - Manual data only
 */

// Type definitions based on actual data structure
interface LocalizedName {
  ja?: string;
  en?: string;
}

interface IndexEntry {
  filename: string;
  size: number;
  lastModified: number;
  id?: string;
  productNumber?: string;
}

interface DataIndex {
  type: 'catalog' | 'manuals' | 'unified';
  generated: string;
  totalFiles: number;
  totalSize: number;
  files: IndexEntry[];
}

interface MasterIndex {
  generated: string;
  version: string;
  sources: {
    unified: DataIndex;
    catalog: DataIndex;
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

interface CatalogItem {
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
  DATA_PATH: "/data/bandai/",
};

// Simple cache implementation
class SimpleCache<T> {
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
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Text processing utilities
class TextProcessor {
  static normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u3040-\u9FAF]/g, " ") // Keep Japanese characters
      .replace(/\s+/g, " ")
      .trim();
  }

  static tokenize(text: string): string[] {
    const normalized = this.normalize(text);
    return normalized
      .split(" ")
      .filter(term => term.length >= 2);
  }

  static calculateRelevance(query: string, text: string): number {
    const queryTerms = this.tokenize(query);
    const textTerms = this.tokenize(text);

    if (queryTerms.length === 0) return 0;
    if (textTerms.length === 0) return 0;

    const querySet = new Set(queryTerms);
    const textSet = new Set(textTerms);

    const intersection = [...querySet].filter(term => textSet.has(term));
    const union = [...new Set([...querySet, ...textSet])];

    return intersection.length / union.length;
  }
}

// Main data service class
export class DataService {
  private cache: SimpleCache<any>;
  private isInitialized = false;
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
        unified: await this.loadFileList('unified'),
        manuals: await this.loadFileList('manuals'),
        items: await this.loadFileList('items'),
      };

      this.isInitialized = true;
      console.log('Data service initialized with', {
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
      const paddedNumber = i.toString().padStart(5, '0');
      if (type === 'unified') {
        files.push(`up_${paddedNumber}.json`);
      } else if (type === 'manuals') {
        files.push(`${i}.json`);
      } else if (type === 'items') {
        files.push(`01_${paddedNumber}.json`);
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
  ): Promise<SearchResult> {
    await this.initialize();

    const startTime = Date.now();
    const normalizedQuery = TextProcessor.normalize(query);

    let allItems: SearchResult["items"] = [];

    // Search unified data
    if (!filters.dataSource || filters.dataSource === 'unified') {
      const unifiedItems = await this.searchUnifiedItems(normalizedQuery);
      allItems.push(...unifiedItems);
    }

    // Search manuals
    if (!filters.dataSource || filters.dataSource === 'manual') {
      const manualItems = await this.searchManualItems(normalizedQuery);
      allItems.push(...manualItems);
    }

    // Search catalog items
    if (!filters.dataSource || filters.dataSource === 'catalog') {
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
    let results = this.cache.get(cacheKey);

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
                type: 'unified',
                score,
                highlights: {
                  name: this.highlightText(item.name.en || item.name.ja || '', query),
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
    let results = this.cache.get(cacheKey);

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
                type: 'manual',
                score,
                highlights: {
                  name: this.highlightText(item.title, query),
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
    let results = this.cache.get(cacheKey);

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
                type: 'catalog',
                score,
                highlights: {
                  name: this.highlightText(item.name, query),
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
    let result = this.cache.get(cacheKey);

    if (result) {
      return result;
    }

    try {
      let items: any[] = [];

      if (!source || source === 'unified') {
        const unifiedItems = await this.getUnifiedItems();
        items.push(...unifiedItems);
      }
      if (!source || source === 'manual') {
        const manualItems = await this.getManualItems();
        items.push(...manualItems);
      }
      if (!source || source === 'catalog') {
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
    let items = this.cache.get<UnifiedItem[]>(cacheKey);

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
    let items = this.cache.get<ManualItem[]>(cacheKey);

    if (items) {
      return items;
    }

    try {
      const sampleSize = 20;
      const sampleIds = this.dataFiles!.manuals.slice(0, sampleSize);

      items = [];
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
    let items = this.cache.get<CatalogItem[]>(cacheKey);

    if (items) {
      return items;
    }

    try {
      const sampleSize = 20;
      const sampleIds = this.dataFiles!.items.slice(0, sampleSize);

      items = [];
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
   * Get database statistics
   */
  async getStatistics(): Promise<DatabaseStats> {
    const cacheKey = "database_stats";
    let stats = this.cache.get<DatabaseStats>(cacheKey);

    if (stats) {
      return stats;
    }

    try {
      const [unifiedItems, manualItems, catalogItems] = await Promise.all([
        this.getUnifiedItems(),
        this.getManualItems(),
        this.getCatalogItems(),
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
              .filter(year => year !== undefined && year > 0),
          ),
          latestYear: Math.max(
            ...unifiedItems
              .map(item => item.releaseDate?.year)
              .filter(year => year !== undefined && year > 0),
          ),
        },
      };

      this.cache.set(cacheKey, stats);
      return stats;
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
   * Load a unified item by filename
   */
  private async loadUnifiedItem(filename: string): Promise<UnifiedItem | null> {
    try {
      const response = await fetch(`${DEFAULT_CONFIG.DATA_PATH}unified/${filename}`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    } catch (error) {
      console.error(`Failed to load unified item ${filename}:`, error);
      return null;
    }
  }

  /**
   * Load a manual item by filename
   */
  private async loadManualItem(filename: string): Promise<ManualItem | null> {
    try {
      const response = await fetch(`${DEFAULT_CONFIG.DATA_PATH}manuals/${filename}`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    } catch (error) {
      console.error(`Failed to load manual item ${filename}:`, error);
      return null;
    }
  }

  /**
   * Load a catalog item by filename
   */
  private async loadCatalogItem(filename: string): Promise<CatalogItem | null> {
    try {
      const response = await fetch(`${DEFAULT_CONFIG.DATA_PATH}items/${filename}`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    } catch (error) {
      console.error(`Failed to load catalog item ${filename}:`, error);
      return null;
    }
  }

  /**
   * Calculate relevance score for an item
   */
  private calculateItemScore(query: string, item: any): number {
    if (!query) return 1.0;

    let score = 0;
    const normalizedQuery = TextProcessor.normalize(query);

    // Check name fields
    const nameFields = [
      item.name?.en,
      item.name?.ja,
      item.title, // For manual items
      item.series?.en,
      item.series?.ja,
    ].filter(Boolean);

    for (const field of nameFields) {
      score += TextProcessor.calculateRelevance(normalizedQuery, field);
    }

    // Boost exact matches
    if (nameFields.some(field => TextProcessor.normalize(field) === normalizedQuery)) {
      score += 1;
    }

    return Math.min(score, 2.0); // Cap at 2.0
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
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
          const aName = a.data?.name?.en || a.data?.name || a.data?.title || "";
          const bName = b.data?.name?.en || b.data?.name || b.data?.title || "";
          comparison = aName.localeCompare(bName);
          break;
        }
        case "releaseDate": {
          const aYear = a.data?.releaseDate?.year || 0;
          const bYear = b.data?.releaseDate?.year || 0;
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
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export types
export type {
  LocalizedName,
  ReleaseDate,
  ManualItem,
  CatalogItem,
  UnifiedItem,
  SearchResult,
  FilterOptions,
  DataSourceType,
  PaginationResult,
  DatabaseStats,
};

/** Global data service instance */
export const dataService = new DataService();