/**
 * Database System Types
 *
 * Comprehensive type definitions for the unified hobby database system.
 * These types cover all data sources, search functionality, and service operations.
 */

// ============================================================================
// BASE TYPES
// ============================================================================

/**
 * Localized text supporting Japanese and English
 */
export interface LocalizedName {
  /** Japanese text (required) */
  ja?: string;
  /** English text (optional) */
  en?: string;
}

/**
 * Release date with partial date support and localization
 */
export interface ReleaseDate {
  /** Year (required) */
  year: number;
  /** Month (optional) */
  month?: number;
  /** Day (optional) */
  day?: number;
  /** Japanese date string (optional) */
  ja?: string;
  /** English date string (optional) */
  en?: string;
}

/**
 * Source information with confidence tracking for database items
 */
export interface DatabaseSourceInfo {
  /** Source URL or identifier */
  url?: string;
  /** File system path */
  htmlPath: string;
  /** File size in bytes */
  htmlSize: number;
  /** Data extraction timestamp */
  extractedAt: string;
}

// ============================================================================
// DATA SOURCE TYPES
// ============================================================================

/**
 * Unified item representing merged data from multiple sources
 */
export interface UnifiedItem {
  /** Unique identifier */
  id: string;
  /** Localized name */
  name: LocalizedName;
  /** Localized series name */
  series?: LocalizedName;
  /** Product grade (HG, MG, PG, etc.) */
  grade?: string;
  /** Scale (1/144, 1/100, etc.) */
  scale?: string;
  /** Product number/model kit number */
  productNumber?: string;
  /** Release date information */
  releaseDate?: ReleaseDate;
  /** Source links and metadata */
  sources: {
    /** Catalog source information */
    catalog?: {
      id: string;
      confidence: number;
      linkedAt: string;
    };
    /** Manual source information */
    manual?: {
      id: string;
      productNumber?: string;
      pdfUrl?: string;
      confidence: number;
      linkedAt: string;
    };
  };
  /** Method used for matching data sources */
  matchMethod: "exact" | "fuzzy" | "manual_override";
  /** Matching stage (1-5 indicating strategy) */
  matchStage?: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Manual item extracted from Bandai HTML pages
 */
export interface ManualItem {
  /** Manual ID (e.g., "0001") */
  id: string;
  /** Extracted title */
  title: string;
  /** Metadata from HTML extraction */
  metadata: {
    /** Page language */
    language: "ja" | "en" | "mixed";
    /** Text encoding */
    encoding: string;
    /** Extraction timestamp */
    extractedAt: string;
  };
  /** Parsed content blocks */
  content: {
    /** Array of content blocks with type and content */
    blocks: Array<{
      /** Block type (body, header, text, img, etc.) */
      type: string;
      /** Content with text and optional Japanese text */
      content: {
        /** Primary text content */
        text?: string;
        /** Japanese text content */
        ja?: string;
        /** Image source URL */
        src?: string;
        /** Link href */
        href?: string;
      };
    }>;
  };
  /** Asset references */
  assets: {
    /** Image URLs */
    images: string[];
    /** Link URLs */
    links: string[];
  };
}

/**
 * Generic catalog item from product listings
 * Note: Structure inferred based on common catalog patterns
 */
export interface DatabaseCatalogItem {
  /** Unique catalog identifier */
  id: string;
  /** Product name */
  name: string;
  /** Series affiliation */
  series?: string;
  /** Grade (HG, MG, etc.) */
  grade?: string;
  /** Scale */
  scale?: string;
  /** Product number */
  productNumber?: string;
  /** Release information */
  releaseDate?: ReleaseDate;
  /** Price information */
  price?: {
    amount: number;
    currency: string;
  };
  /** Product images */
  images?: string[];
  /** Description */
  description?: string;
  /** Availability status */
  status?: "available" | "discontinued" | "preorder";
}

// ============================================================================
// SEARCH & FILTER TYPES
// ============================================================================

/**
 * Unified search result from all data sources
 */
export interface SearchResult {
  /** Result items */
  items: Array<{
    /** Item identifier */
    id: string;
    /** Item type */
    type: "unified" | "manual" | "catalog";
    /** Relevance score */
    score: number;
    /** Match highlights */
    highlights: {
      /** Highlighted name */
      name?: string;
      /** Highlighted series */
      series?: string;
      /** Highlighted description */
      description?: string;
    };
    /** Source data */
    data: UnifiedItem | ManualItem | DatabaseCatalogItem;
  }>;
  /** Total result count */
  total: number;
  /** Query execution time in milliseconds */
  queryTime: number;
  /** Pagination information */
  pagination: {
    /** Current page number */
    page: number;
    /** Items per page */
    limit: number;
    /** Total pages */
    totalPages: number;
  };
}

/**
 * Comprehensive filtering options
 */
export interface FilterOptions {
  /** Text search query */
  query?: string;
  /** Filter by series */
  series?: string[];
  /** Filter by grade */
  grade?: string[];
  /** Filter by scale */
  scale?: string[];
  /** Release date range */
  releaseDateRange?: {
    /** Start year */
    start?: number;
    /** End year */
    end?: number;
  };
  /** Filter by availability */
  availability?: ("available" | "discontinued" | "preorder")[];
  /** Filter by price range */
  priceRange?: {
    /** Minimum price */
    min?: number;
    /** Maximum price */
    max?: number;
  };
  /** Sort options */
  sort?: {
    /** Field to sort by */
    field: "name" | "releaseDate" | "price" | "relevance";
    /** Sort direction */
    direction: "asc" | "desc";
  };
}

/**
 * Hobby type configuration
 */
export interface HobbyType {
  /** Unique hobby identifier */
  id: string;
  /** Localized hobby name */
  name: LocalizedName;
  /** Hobby description */
  description?: LocalizedName;
  /** Default data sources */
  defaultSources: string[];
  /** Specific filters for this hobby */
  hobbyFilters?: Record<string, any>;
  /** Icon identifier */
  icon?: string;
  /** Color theme */
  color?: string;
}

/**
 * Data source type enumeration
 */
export type DataSourceType = "unified" | "manual" | "catalog";

// ============================================================================
// INDEX TYPES
// ============================================================================

/**
 * Item in master-index.json (complete inventory)
 */
export interface MasterIndexItem {
  /** Item identifier */
  id: string;
  /** Data source type */
  type: DataSourceType;
  /** Item name */
  name: string;
  /** Series */
  series?: string;
  /** Grade */
  grade?: string;
  /** Scale */
  scale?: string;
  /** Product number */
  productNumber?: string;
  /** Release year */
  releaseYear?: number;
  /** Last modified timestamp */
  lastModified: string;
  /** File size */
  fileSize?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Item in unified-index.json (merged data)
 */
export interface UnifiedIndexItem {
  /** Unified item identifier */
  id: string;
  /** Localized name */
  name: LocalizedName;
  /** Source count */
  sourceCount: number;
  /** Source types */
  sourceTypes: DataSourceType[];
  /** Match confidence */
  matchConfidence?: number;
  /** Last updated timestamp */
  lastUpdated: string;
  /** Is this item flagged for review? */
  needsReview: boolean;
}

/**
 * Item in search-index.json (search optimization)
 */
export interface SearchIndexItem {
  /** Search identifier */
  id: string;
  /** Tokenized search terms */
  terms: string[];
  /** Normalized text for searching */
  normalizedText: string;
  /** Item weight for ranking */
  weight: number;
  /** Item type */
  type: DataSourceType;
  /** Cross-references to source IDs */
  sourceIds: string[];
  /** Popular search terms that match this item */
  popularTerms?: string[];
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

/**
 * Database statistics
 */
export interface DatabaseStats {
  /** Statistics generation timestamp */
  generatedAt: string;
  /** Total items by type */
  totalItems: {
    unified: number;
    manual: number;
    catalog: number;
  };
  /** Source coverage */
  sourceCoverage: {
    /** Items with manual data */
    withManual: number;
    /** Items with catalog data */
    withCatalog: number;
    /** Items with both sources */
    withBoth: number;
    /** Items with single source */
    singleSource: number;
  };
  /** Data quality metrics */
  quality: {
    /** High confidence matches */
    highConfidence: number;
    /** Medium confidence matches */
    mediumConfidence: number;
    /** Low confidence matches */
    lowConfidence: number;
    /** Items needing review */
    needsReview: number;
  };
  /** Date range coverage */
  dateRange: {
    /** Earliest release year */
    earliestYear?: number;
    /** Latest release year */
    latestYear?: number;
  };
}

/**
 * Paginated response wrapper
 */
export interface PaginationResult<T> {
  /** Result items */
  items: T[];
  /** Pagination information */
  pagination: {
    /** Current page (1-based) */
    page: number;
    /** Items per page */
    limit: number;
    /** Total items available */
    total: number;
    /** Total pages */
    totalPages: number;
    /** Has next page? */
    hasNext: boolean;
    /** Has previous page? */
    hasPrev: boolean;
  };
}

/**
 * Saved filter configuration
 */
export interface FilterPreset {
  /** Preset identifier */
  id: string;
  /** Preset name */
  name: string;
  /** Preset description */
  description?: string;
  /** Filter configuration */
  filters: FilterOptions;
  /** Creator user ID */
  createdBy: string;
  /** Is this preset public? */
  isPublic: boolean;
  /** Usage count */
  useCount: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * Database query options
 */
export interface QueryOptions {
  /** Include debug information? */
  debug?: boolean;
  /** Query timeout in milliseconds */
  timeout?: number;
  /** Maximum results to return */
  maxResults?: number;
  /** Include similar items? */
  includeSimilar?: boolean;
  /** Search field weights */
  fieldWeights?: {
    name: number;
    series: number;
    description: number;
  };
}

/**
 * Data synchronization status
 */
export interface SyncStatus {
  /** Sync operation ID */
  id: string;
  /** Sync type */
  type: "full" | "incremental" | "manual";
  /** Current status */
  status: "pending" | "running" | "completed" | "failed";
  /** Progress percentage */
  progress: number;
  /** Started timestamp */
  startedAt: string;
  /** Estimated completion timestamp */
  estimatedAt?: string;
  /** Items processed */
  processed: number;
  /** Total items to process */
  total: number;
  /** Error messages */
  errors: string[];
  /** Warning messages */
  warnings: string[];
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  /** Database version */
  version: string;
  /** Available data sources */
  dataSources: {
    /** Manual data source */
    manual: {
      enabled: boolean;
      lastSync?: string;
      itemCount?: number;
    };
    /** Catalog data source */
    catalog: {
      enabled: boolean;
      lastSync?: string;
      itemCount?: number;
    };
  };
  /** Index configuration */
  indexes: {
    /** Search index settings */
    search: {
      enabled: boolean;
      lastUpdated?: string;
      size?: number;
    };
    /** Master index settings */
    master: {
      enabled: boolean;
      lastUpdated?: string;
      size?: number;
    };
  };
  /** Performance settings */
  performance: {
    /** Cache size in MB */
    cacheSize?: number;
    /** Query timeout in seconds */
    queryTimeout?: number;
    /** Maximum concurrent queries */
    maxConcurrentQueries?: number;
  };
}

// ============================================================================
// EXTENSIBILITY TYPES
// ============================================================================

/**
 * Custom field definition for extensibility
 */
export interface CustomFieldDefinition {
  /** Field identifier */
  id: string;
  /** Field name */
  name: string;
  /** Field type */
  type: "string" | "number" | "boolean" | "date" | "array" | "object";
  /** Is this field required? */
  required: boolean;
  /** Default value */
  defaultValue?: any;
  /** Validation rules */
  validation?: {
    /** Minimum value (for numbers) */
    min?: number;
    /** Maximum value (for numbers) */
    max?: number;
    /** Allowed values (for enums) */
    allowedValues?: any[];
    /** Regular expression pattern */
    pattern?: string;
  };
  /** Field description */
  description?: string;
}

/**
 * Plugin interface for extending database functionality
 */
export interface DatabasePlugin {
  /** Plugin identifier */
  id: string;
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description?: string;
  /** Custom field definitions */
  customFields?: CustomFieldDefinition[];
  /** Custom data processors */
  processors?: {
    /** Pre-processing hook */
    beforeSave?: (data: any) => Promise<any>;
    /** Post-processing hook */
    afterLoad?: (data: any) => Promise<any>;
  };
  /** Custom search handlers */
  searchHandlers?: {
    /** Custom search implementation */
    search?: (query: string, options: QueryOptions) => Promise<SearchResult>;
  };
}