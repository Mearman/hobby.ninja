import { LanguageDetection } from "./language-detection.js";

export interface PageTypeProfile {
  urlPattern: string | RegExp;
  name: string;
  requiresPlaywright: boolean;
  extractionMethod: "cheerio" | "playwright" | "hybrid";

  selectors: Record<string, string>;

  waitForSelectors?: string[];
  timeout?: number;
  retryCount?: number;

  performance: {
    averageExtractionTime: number; // milliseconds
    successRate: number; // 0.0 - 1.0
    lastAnalyzed: number; // Unix timestamp
  };

  language: {
    defaultLanguage: "ja" | "en" | "mixed";
    detectionPatterns: string[];
  };

  metadata: {
    source: "bandai-hobby" | "bandai-manual" | "gundam-info";
    contentType: "product" | "manual" | "series" | "character" | "mecha";
    version: string;
    lastUpdated: number;
  };
}

export interface ProfileCache {
  profiles: Map<string, PageTypeProfile>;
  globalConfig: {
    enableAutoUpdate: boolean;
    updateInterval: number; // hours
    fallbackToPlaywright: boolean;
    performanceTracking: boolean;
  };

  statistics: {
    totalProfiles: number;
    staticOnlyProfiles: number;
    dynamicProfiles: number;
    lastUpdated: number;
  };
}

export interface ProfileGenerationResult {
  urlPattern: string;
  profile: PageTypeProfile;
  analysis: {
    sampleUrls: string[];
    languageDetection: LanguageDetection[];
    extractionSuccess: number;
    extractionFailures: number;
  };

  confidence: number; // 0.0 - 1.0
  recommendations: string[];
}

export interface CheckpointData {
  type: "scrape" | "index" | "process";
  source: string;
  timestamp: number;
  [key: string]: unknown; // Allow dynamic properties based on type
}

// Specific checkpoint data interfaces for type safety
export interface ScrapeCheckpointData extends CheckpointData {
  type: "scrape";
  remainingUrls: string[];
  completedUrls: string[];
  metadata: Record<string, unknown>;
  status: "in_progress" | "completed" | "failed";
  retries?: number;
  createdAt: number;
  lastUpdated: number;
}

export interface IndexCheckpointData extends CheckpointData {
  type: "index";
  processedFiles: string[];
  totalFiles: number;
  metadata: Record<string, unknown>;
}

export interface ProcessCheckpointData extends CheckpointData {
  type: "process";
  stage: string;
  progress: number;
  metadata: Record<string, unknown>;
}

// Union type for all checkpoint data types
export type CheckpointDataUnion = ScrapeCheckpointData | IndexCheckpointData | ProcessCheckpointData;

// Metadata interfaces for type safety
export interface ScrapeMetadata {
  domain?: string;
  userAgent?: string;
  profileId?: string;
  errors?: string[];
  warnings?: string[];
  startTime?: number;
  estimatedDuration?: number;
}

export interface IndexMetadata {
  sourceType?: string;
  batchSize?: number;
  lastProcessedFile?: string;
  errors?: string[];
}

export interface ProcessMetadata {
  stage?: string;
  inputFiles?: string[];
  outputFiles?: string[];
  parameters?: Record<string, string | number | boolean>;
  errors?: string[];
}

// Generic metadata type for checkpoint operations
export type CheckpointMetadata = Record<string, string | number | boolean | string[] | undefined>;