// Profile Management Types
// Import types from other files
import type { LanguageDetection } from "./languageDetection";


export interface PageTypeProfile {
  urlPattern: string | RegExp;
  name: string;
  requiresPlaywright: boolean;
  extractionMethod: "cheerio" | "playwright" | "hybrid";
  confidence: number;
  lastUpdated: string;
  sampleUrls: string[];
  renderingType?: "static" | "dynamic" | "hybrid";
  performanceScore?: number;
  selectors?: Record<string, string>;
  waitForSelectors?: string[];
  timeout?: number;
  retryCount?: number;
  metadata?: {
    lastUpdated: number;
    rawHtml?: string;
    source?: string;
    contentType?: string;
    version?: string;
  };
  performance?: {
    estimatedLoadTime: number;
    averageJsExecutionTime: number;
    averageExtractionTime?: number;
    successRate?: number;
    memoryUsage: number;
    domComplexity: number;
    lastAnalyzed?: number;
  };
  recommendations?: string[];
  languageDetections?: LanguageDetection[];
  language?: {
    defaultLanguage: string;
    detectionPatterns: string[];
  };
}

export interface ProfileCache {
  profiles: Map<string, PageTypeProfile>;
  version: string;
  lastUpdated: string;
  statistics?: {
    totalProfiles: number;
    playwrightProfiles: number;
    cheerioProfiles: number;
    staticOnlyProfiles?: number;
    dynamicProfiles?: number;
    lastUpdated: number;
  };
}

export interface ProfileGenerationResult {
  success: boolean;
  profile?: PageTypeProfile;
  error?: string;
  urlPattern?: string;
  analysis?: {
    sampleUrls: string[];
    languageDetection: LanguageDetection[];
    extractionSuccess?: number;
    extractionFailures?: number;
  };
  recommendations?: string[];
  requiresPlaywright: boolean;
  confidence: number;
  sampleUrls: string[];
}

export interface CacheManager {
  get(key: string): unknown | null;
  set(key: string, value: unknown, ttl?: number): void;
  clear(): void;
  delete(key: string): boolean;
  getByUrl?(url: string): Promise<unknown | null>;
  setByUrl?(url: string, value: unknown, type: string): Promise<void>;
}

// Rendering detection types
export interface RenderingDetection {
  renderingType: "static" | "dynamic" | "hybrid";
  confidence: number;
  requiresPlaywright: boolean;
  requiresJavaScript?: boolean;
  recommendation: "cheerio" | "playwright" | "hybrid";
  evidence: string[];
  detectionMethod?: string;
  initialContentLength?: number;
  finalContentLength?: number;
  jsExecutionTime?: number;
  detectedAt?: number;
  indicators?: string[];
}

export interface ProgressiveEnhancementResult {
  hasProgressiveEnhancement: boolean;
  hasDynamicContent: boolean;
  renderingType: "static" | "dynamic" | "hybrid";
  confidence: number;
  requiresPlaywright: boolean;
  recommendation: "static-only" | "dynamic-required" | "hybrid-approach" | "cheerio" | "playwright" | "hybrid";
  evidence: string[];
  requiresJavaScript?: boolean;
  jsExecutionTime?: number;
  staticAnalysis?: {
    frameworkIndicators: string[];
    complexity: number;
    sufficient?: boolean;
    contentLength?: number;
    missingFields?: string[];
  };
  dynamicAnalysis?: {
    required?: boolean;
    additionalContent?: number;
    waitForSelectors?: string[];
    eventListeners?: number;
    lazyLoadedElements?: number;
    frameworkDetected?: string;
  };
  indicators?: {
    hasDynamicContent?: boolean;
    hasLazyLoading?: boolean;
    hasEventListeners?: boolean;
    usesModernFrameworks?: boolean;
  };
}

export type RenderingType = "static" | "dynamic" | "hybrid";