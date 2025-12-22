import { LanguageDetection } from "./language-detection.js";



export interface PriceInfo {
  amount: number;
  currency: string;
  originalText: string;
  includesTax?: boolean;
}

export interface SpecificationValue {
  value: string | number | boolean;
  unit?: string;
  originalText: string;
}

export interface ProductImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  type: "main" | "gallery" | "thumbnail" | "box";
}

export interface DataSourceInfo {
  domain: string;
  section: string;
  pageType: "listing" | "detail" | "variant";
  version?: string;
}

export interface ProductData {
  // Primary identification
  id: string;
  name: string;
  sku: string;
  price?: PriceInfo;
  description?: string;

  // Technical specifications
  specifications: Record<string, SpecificationValue>;

  // Language and source metadata
  detectedLanguage: LanguageDetection;
  source: DataSourceInfo;
  url: string;
  extractedAt: number;

  // Media and categorization
  images: ProductImage[];
  categories: string[];

  // Scraping metadata
  extraction: {
    method: "cheerio" | "playwright" | "hybrid";
    renderingType: "static" | "dynamic" | "hybrid";
    extractedAt: number;
    extractionDuration: number;
    requiresJavaScript: boolean;
  };

  // Quality indicators
  quality: {
    completeness: number;
    confidence: number;
    validationErrors: string[];
    lastValidated: number;
  };

  /** Manual ID for linked instruction manual (extracted from bandai-hobby item pages) */
  manualId?: string;
}

// Gundam-specific data interface for scraped data
export interface GundamData {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  price?: number;
  currency?: string;
  releaseDate?: string;
  sku?: string;
  description?: string;
  specifications?: Record<string, unknown>;
  images: Array<{ type: string; url: string; alt: string }>;
  language: LanguageDetection;
  url?: string;
  source: string;
  scrapedAt: string;
  /** Manual ID for linked instruction manual (extracted from bandai-hobby item pages) */
  manualId?: string;
}
export {LanguageDetection} from "./language-detection.js";