import { LanguageDetection } from './language-detection.js';

export interface PageTypeProfile {
  urlPattern: string | RegExp;
  name: string;
  requiresPlaywright: boolean;
  extractionMethod: 'cheerio' | 'playwright' | 'hybrid';

  selectors: {
    [key: string]: string;
  };

  waitForSelectors?: string[];
  timeout?: number;
  retryCount?: number;

  performance: {
    averageExtractionTime: number; // milliseconds
    successRate: number; // 0.0 - 1.0
    lastAnalyzed: number; // Unix timestamp
  };

  language: {
    defaultLanguage: 'ja' | 'en' | 'mixed';
    detectionPatterns: string[];
  };

  metadata: {
    source: 'bandai-hobby' | 'bandai-manual' | 'gundam-info';
    contentType: 'product' | 'manual' | 'series' | 'character' | 'mecha';
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