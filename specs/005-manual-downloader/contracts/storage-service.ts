/**
 * Storage Service Contract
 *
 * File system operations and organization for downloaded manual pages.
 * Handles file storage, retrieval, compression, and organization.
 *
 * @version 1.0.0
 * @since 2025-12-05
 */

import {
  ManualPage,
  FileStorageConfig,
  FileMetadata,
  DownloadSession
} from '../data-model';

/**
 * Storage service interface for file system operations
 */
export interface IStorageService {
  /** Service configuration */
  readonly config: StorageConfig;

  /**
   * Initialize storage service and create directory structure
   * @param config Storage configuration
   * @returns Promise resolving when initialization is complete
   */
  initialize(config: StorageConfig): Promise<void>;

  /**
   * Store a manual page with its content
   * @param manualPage Manual page data to store
   * @param options Storage options
   * @returns Promise resolving to stored file metadata
   */
  storeManualPage(manualPage: ManualPage, options?: StorageOptions): Promise<FileMetadata>;

  /**
   * Retrieve a stored manual page
   * @param id Manual page ID
   * @param options Retrieval options
   * @returns Promise resolving to manual page data or null if not found
   */
  retrieveManualPage(id: number, options?: RetrievalOptions): Promise<ManualPage | null>;

  /**
   * Check if a manual page exists in storage
   * @param id Manual page ID
   * @returns Promise resolving to true if page exists
   */
  pageExists(id: number): Promise<boolean>;

  /**
   * Get metadata for a stored manual page
   * @param id Manual page ID
   * @returns Promise resolving to file metadata or null if not found
   */
  getPageMetadata(id: number): Promise<FileMetadata | null>;

  /**
   * List all stored manual pages
   * @param filters Optional filters for listing
   * @returns Promise resolving to array of file metadata
   */
  listStoredPages(filters?: ListFilters): Promise<FileMetadata[]>;

  /**
   * Delete a stored manual page
   * @param id Manual page ID
   * @param options Deletion options
   * @returns Promise resolving to true if deletion was successful
   */
  deleteManualPage(id: number, options?: DeletionOptions): Promise<boolean>;

  /**
   * Get storage usage statistics
   * @returns Promise resolving to storage statistics
   */
  getStorageStats(): Promise<StorageStats>;

  /**
   * Verify storage integrity
   * @param options Verification options
   * @returns Promise resolving to verification results
   */
  verifyStorage(options?: VerificationOptions): Promise<VerificationResult>;

  /**
   * Clean up storage (remove old files, optimize structure)
   * @param options Cleanup options
   * @returns Promise resolving to cleanup results
   */
  cleanupStorage(options?: CleanupOptions): Promise<CleanupResult>;

  /**
   * Create backup of stored data
   * @param backupPath Path for backup
   * @param options Backup options
   * @returns Promise resolving to backup operation result
   */
  createBackup(backupPath: string, options?: BackupOptions): Promise<BackupResult>;

  /**
   * Restore data from backup
   * @param backupPath Path to backup
   * @param options Restore options
   * @returns Promise resolving to restore operation result
   */
  restoreFromBackup(backupPath: string, options?: RestoreOptions): Promise<RestoreResult>;

  /**
   * Optimize storage layout and organization
   * @param options Optimization options
   * @returns Promise resolving to optimization results
   */
  optimizeStorage(options?: OptimizationOptions): Promise<OptimizationResult>;
}

/**
 * Storage service configuration
 */
export interface StorageConfig {
  /** Base directory configuration */
  directories: {
    baseDirectory: string;
    temporaryDirectory: string;
    backupDirectory: string;
    metadataDirectory: string;
  };

  /** File organization settings */
  organization: {
    directoryTemplate: string;           // e.g., "{year}/{month}"
    filePattern: string;                 // e.g., "{id}.html"
    maxFilesPerDirectory: number;        // files per directory before splitting
    useDateSubdirectories: boolean;      // create date-based subdirs
    useHashSubdirectories: boolean;      // create hash-based subdirs
  };

  /** Compression settings */
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'brotli' | 'lz4' | 'none';
    level: number;                       // compression level (0-9)
    threshold: number;                   // min file size for compression (bytes)
  };

  /** File retention policies */
  retention: {
    keepOriginals: boolean;
    maxAgeDays: number;
    maxTotalSize: number;                // bytes
    maxVersions: number;                 // keep N versions
  };

  /** Performance settings */
  performance: {
    enableCaching: boolean;
    cacheSize: number;                   // number of cached file handles
    bufferSize: number;                  // file I/O buffer size
    enableAsyncWrites: boolean;
    enableMemoryMapping: boolean;
  };

  /** Security settings */
  security: {
    enablePermissions: boolean;
    filePermissions: string;             // octal permissions
    directoryPermissions: string;        // octal permissions
    enableEncryption: boolean;
    encryptionKey?: string;
  };

  /** Validation settings */
  validation: {
    enableChecksums: boolean;
    checksumAlgorithm: 'sha256' | 'sha512' | 'md5';
    enableContentValidation: boolean;
    contentValidationRules: string[];    // regex patterns
  };
}

/**
 * Storage operation options
 */
export interface StorageOptions {
  /** Whether to overwrite existing files */
  overwrite?: boolean;

  /** Whether to create backup before overwriting */
  createBackup?: boolean;

  /** Custom file path (overrides default) */
  customPath?: string;

  /** Compression override */
  compression?: {
    enabled: boolean;
    algorithm?: 'gzip' | 'brotli' | 'lz4';
    level?: number;
  };

  /** Metadata to store with file */
  metadata?: Record<string, any>;

  /** Whether to verify after storage */
  verify?: boolean;
}

/**
 * Retrieval options
 */
export interface RetrievalOptions {
  /** Whether to return content or just metadata */
  includeContent?: boolean;

  /** Whether to decompress content */
  decompress?: boolean;

  /** Whether to validate checksum */
  validateChecksum?: boolean;

  /** Whether to cache result */
  cache?: boolean;

  /** Content transformation */
  transform?: ContentTransformation;
}

/**
 * Content transformation options
 */
export interface ContentTransformation {
  /** Text transformations */
  text?: {
    normalizeWhitespace?: boolean;
    removeComments?: boolean;
    minify?: boolean;
    prettify?: boolean;
  };

  /** HTML transformations */
  html?: {
    removeScripts?: boolean;
    removeStyles?: boolean;
    normalizeTags?: boolean;
    addMetadata?: boolean;
  };
}

/**
 * Listing filters
 */
export interface ListFilters {
  /** Date range filter */
  dateRange?: {
    from: string;    // ISO date
    to: string;      // ISO date
  };

  /** Size range filter */
  sizeRange?: {
    min: number;     // bytes
    max: number;     // bytes
  };

  /** ID range filter */
  idRange?: {
    min: number;
    max: number;
  };

  /** Status filter */
  status?: string[];

  /** Content type filter */
  contentType?: string[];

  /** Pagination */
  pagination?: {
    offset: number;
    limit: number;
  };

  /** Sort order */
  sort?: {
    field: 'id' | 'createdAt' | 'modifiedAt' | 'size';
    direction: 'asc' | 'desc';
  };
}

/**
 * Deletion options
 */
export interface DeletionOptions {
  /** Whether to move to recycle bin instead of permanent delete */
  moveToRecycleBin?: boolean;

  /** Whether to create backup before deletion */
  createBackup?: boolean;

  /** Whether to verify deletion */
  verifyDeletion?: boolean;

  /** Force deletion even if file is locked */
  force?: boolean;
}

/**
 * Verification options
 */
export interface VerificationOptions {
  /** What to verify */
  verifyItems: ('content' | 'checksum' | 'metadata' | 'structure')[];

  /** Sample size for large datasets (percentage) */
  sampleSize?: number;

  /** Whether to fix issues automatically */
  autoFix?: boolean;

  /** Maximum duration in seconds */
  maxDuration?: number;

  /** Progress reporting */
  reportProgress?: boolean;
}

/**
 * Cleanup options
 */
export interface CleanupOptions {
  /** What to clean up */
  cleanupItems: ('tempFiles' | 'oldFiles' | 'duplicates' | 'orphans' | 'emptyDirs')[];

  /** Age threshold for file cleanup (days) */
  ageThreshold?: number;

  /** Size threshold for file cleanup (bytes) */
  sizeThreshold?: number;

  /** Whether to create backup before cleanup */
  createBackup?: boolean;

  /** Dry run mode (don't actually delete) */
  dryRun?: boolean;
}

/**
 * Backup options
 */
export interface BackupOptions {
  /** Backup type */
  type: 'full' | 'incremental' | 'differential';

  /** Compression for backup */
  compress: boolean;

  /** Include metadata in backup */
  includeMetadata: boolean;

  /** What to include in backup */
  include: {
    content: boolean;
    metadata: boolean;
    structure: boolean;
  };

  /** Exclude patterns */
  exclude: string[];

  /** Verify backup after creation */
  verifyBackup: boolean;
}

/**
 * Restore options
 */
export interface RestoreOptions {
  /** Whether to overwrite existing files */
  overwrite?: boolean;

  /** Whether to create backup before restore */
  createBackup?: boolean;

  /** Selective restore (specific IDs) */
  selectiveIds?: number[];

  /** Validation after restore */
  validateAfterRestore?: boolean;

  /** Dry run mode */
  dryRun?: boolean;
}

/**
 * Optimization options
 */
export interface OptimizationOptions {
  /** What to optimize */
  optimizeItems: ('structure' | 'compression' | 'indexing' | 'layout')[];

  /** Reorganize directory structure */
  reorganizeDirectories?: boolean;

  /** Recompress files with better settings */
  recompressFiles?: boolean;

  /** Rebuild indexes */
  rebuildIndexes?: boolean;

  /** Defragment storage */
  defragment?: boolean;

  /** Maximum duration in seconds */
  maxDuration?: number;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  /** File counts */
  files: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    bySize: {
      small: number;     // < 10KB
      medium: number;    // 10KB - 1MB
      large: number;     // > 1MB
    };
  };

  /** Storage sizes */
  sizes: {
    total: number;       // bytes
    used: number;        // bytes
    available: number;   // bytes
    compressed: number;  // bytes saved by compression
    average: number;     // average file size
  };

  /** Directory structure */
  directories: {
    total: number;
    maxDepth: number;
    averageFilesPerDir: number;
    emptyDirectories: number;
  };

  /** Performance metrics */
  performance: {
    averageReadTime: number;    // milliseconds
    averageWriteTime: number;   // milliseconds
    cacheHitRate: number;       // percentage
    compressionRatio: number;   // compressed/uncompressed
  };

  /** Health indicators */
  health: {
    fragmentation: number;      // percentage
    errors: number;
    warnings: number;
    lastVerification: string;
  };

  /** Last updated timestamp */
  lastUpdated: string;
}

/**
 * Verification result
 */
export interface VerificationResult {
  /** Verification summary */
  summary: {
    totalFiles: number;
    verifiedFiles: number;
    corruptedFiles: number;
    missingFiles: number;
    fixedFiles: number;
  };

  /** Detailed issues found */
  issues: VerificationIssue[];

  /** Performance metrics */
  performance: {
    duration: number;
    filesPerSecond: number;
    bytesVerified: number;
  };

  /** Overall health score (0-100) */
  healthScore: number;

  /** Recommendations */
  recommendations: string[];
}

/**
 * Verification issue
 */
export interface VerificationIssue {
  /** Issue severity */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Issue type */
  type: 'corruption' | 'missing' | 'invalid_metadata' | 'checksum_mismatch' | 'permission_error';

  /** Affected file ID */
  fileId: number;

  /** File path */
  filePath: string;

  /** Issue description */
  description: string;

  /** Whether issue was automatically fixed */
  autoFixed: boolean;

  /** Recommended action */
  recommendedAction: string;
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  /** Cleanup summary */
  summary: {
    filesDeleted: number;
    bytesFreed: number;
    directoriesRemoved: number;
    errorsEncountered: number;
  };

  /** Deleted items details */
  deletedItems: DeletedItem[];

  /** Performance metrics */
  performance: {
    duration: number;
    itemsPerSecond: number;
  };

  /** Space reclaimed by category */
  spaceReclaimed: {
    tempFiles: number;
    oldFiles: number;
    duplicates: number;
    orphans: number;
  };
}

/**
 * Deleted item information
 */
export interface DeletedItem {
  /** Item type */
  type: 'file' | 'directory';

  /** Item path */
  path: string;

  /** Item size in bytes */
  size: number;

  /** Deletion reason */
  reason: string;

  /** Deletion timestamp */
  deletedAt: string;
}

/**
 * Backup result
 */
export interface BackupResult {
  /** Backup summary */
  summary: {
    backupType: string;
    filesIncluded: number;
    totalSize: number;
    compressedSize: number;
    duration: number;
  };

  /** Backup file information */
  backupFile: {
    path: string;
    size: number;
    checksum: string;
    createdAt: string;
  };

  /** Verification results */
  verification: {
    checksumValid: boolean;
    filesVerified: number;
    issuesFound: number;
  };

  /** Backup statistics */
  statistics: {
    compressionRatio: number;
    filesPerSecond: number;
    bytesPerSecond: number;
  };
}

/**
 * Restore result
 */
export interface RestoreResult {
  /** Restore summary */
  summary: {
    filesRestored: number;
    filesSkipped: number;
    filesFailed: number;
    totalSize: number;
    duration: number;
  };

  /** Restored files details */
  restoredFiles: RestoredFile[];

  /** Validation results */
  validation: {
    filesValidated: number;
    validationPassed: number;
    validationFailed: number;
  };

  /** Restore statistics */
  statistics: {
    filesPerSecond: number;
    bytesPerSecond: number;
    successRate: number;
  };
}

/**
 * Restored file information
 */
export interface RestoredFile {
  /** File ID */
  id: number;

  /** File path */
  path: string;

  /** File size */
  size: number;

  /** Restore status */
  status: 'success' | 'skipped' | 'failed';

  /** Status message */
  message?: string;

  /** Restore timestamp */
  restoredAt: string;
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  /** Optimization summary */
  summary: {
    filesOptimized: number;
    directoriesReorganized: number;
    spaceSaved: number;
    duration: number;
  };

  /** Optimization details by category */
  optimizations: {
    structure: StructureOptimization;
    compression: CompressionOptimization;
    indexing: IndexingOptimization;
    layout: LayoutOptimization;
  };

  /** Performance improvements */
  improvements: {
    readSpeed: number;    // percentage improvement
    writeSpeed: number;   // percentage improvement
    storageEfficiency: number; // percentage improvement
  };

  /** Recommendations for further optimization */
  recommendations: string[];
}

/**
 * Structure optimization details
 */
export interface StructureOptimization {
  directoriesReorganized: number;
  filesMoved: number;
  maxDepthReduced: number;
  averageFilesPerDirectoryImproved: number;
}

/**
 * Compression optimization details
 */
export interface CompressionOptimization {
  filesRecompressed: number;
  spaceSaved: number;
  compressionRatioImproved: number;
  averageCompressionTime: number;
}

/**
 * Indexing optimization details
 */
export interface IndexingOptimization {
  indexesRebuilt: number;
  indexSizeReduced: number;
  lookupSpeedImproved: number;
  indexingDuration: number;
}

/**
 * Layout optimization details
 */
export interface LayoutOptimization {
  filesReorganized: number;
  accessPatternsOptimized: number;
  localityImproved: number;
  fragmentationReduced: number;
}

/**
 * Storage service factory
 */
export interface IStorageServiceFactory {
  /**
   * Create storage service with configuration
   * @param config Storage configuration
   * @returns Configured storage service
   */
  create(config: StorageConfig): IStorageService;

  /**
   * Create storage service with defaults
   * @returns Storage service with default configuration
   */
  createWithDefaults(baseDirectory: string): IStorageService;

  /**
   * Create storage service for testing
   * @param mockFileSystem Mock file system for testing
   * @param config Optional configuration overrides
   * @returns Storage service with mocked dependencies
   */
  createForTesting(mockFileSystem: IFileSystem, config?: Partial<StorageConfig>): IStorageService;
}

/**
 * File system interface for testing
 */
export interface IFileSystem {
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, data: Buffer): Promise<void>;
  deleteFile(path: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  listDirectory(path: string): Promise<string[]>;
  getStats(path: string): Promise<FileStats>;
  copyFile(source: string, destination: string): Promise<void>;
  moveFile(source: string, destination: string): Promise<void>;
}

/**
 * File system statistics
 */
export interface FileStats {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  created: Date;
  modified: Date;
  accessed: Date;
  permissions: string;
}