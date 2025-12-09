export type LanguageCode = "ja" | "en" | "mixed" | "unknown";

export type LanguageDetectionMethod =
  | "html-lang-attribute"
  | "html-meta-content"
  | "http-headers"
  | "url-pattern"
  | "content-analysis"
  | "filename-pattern"
  | "manual-detection"
  | "hybrid"
  | "fallback";

export interface LanguageDetection {
  language: LanguageCode;
  confidence: number; // 0.0 - 1.0
  method: LanguageDetectionMethod;
  evidence: string[];
}

export interface LanguageDetectionConfig {
  primaryMethods: LanguageDetectionMethod[];
  fallbackMethods: LanguageDetectionMethod[];
  confidenceThreshold: number;
  enableJapanesePatternDetection: boolean;
  enableEnglishPatternDetection: boolean;
}

export interface LanguageAnalysisResult {
  detectedLanguage: LanguageCode;
  confidence: number;
  method: LanguageDetectionMethod;
  evidence: {
    htmlLang?: string;
    contentLanguage?: string;
    urlPattern?: string;
    japaneseRatio?: number;
    englishRatio?: number;
    japaneseCharacters?: string[];
    englishWords?: string[];
  };
}