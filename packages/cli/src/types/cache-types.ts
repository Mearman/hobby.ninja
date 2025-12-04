export type CompressionMethod = 'none' | 'gzip' | 'deflate' | 'brotli';

export type CachePriority = 'low' | 'medium' | 'high';

export interface PageCache {
  url: string;
  cacheKey: string;
  source: 'bandai-hobby' | 'bandai-manual' | 'gundam-info';
  rawHtml: string;
  compressedHtml?: Buffer;

  renderingStrategy: {
    type: 'static' | 'dynamic' | 'hybrid' | 'unknown';
    staticContentAvailable: boolean;
    dynamicContentCaptured: boolean;
    jsDependencies: string[];
    detectionInfo?: any; // RenderingDetection
    playwrightUsed: boolean;
    cheerioUsed: boolean;
  };

  cachedAt: number;
  lastAccessed: number;
  expiresAt: number;
  size: number;
  hits: number;

  contentType: string;
  encoding: string;
  language: 'ja' | 'en' | 'mixed' | 'unknown';

  integrity: {
    checksum: string;
    validationStatus: 'valid' | 'corrupted' | 'partial';
    lastValidated: number;
  };
}

export interface CacheConfig {
  maxStorageSize: number; // bytes
  defaultTTL: number; // milliseconds
  compressionMethod: CompressionMethod;
  compressionLevel: number; // 1-9
  enableIntegrityCheck: boolean;
  cleanupPolicy: 'lru' | 'lfu' | 'ttl-only';
}

export interface CacheStats {
  totalFiles: number;
  totalSize: number;
  compressionRatio: number;
  hitRate: number;
  averageAccessTime: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface CacheEntryMetadata {
  url: string;
  size: number;
  compressedSize: number;
  accessCount: number;
  lastAccessed: number;
  expiresAt: number;
  priority: CachePriority;
}