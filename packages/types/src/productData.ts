// Product Data Types
// Import LanguageDetection from the languageDetection file
import type { LanguageDetection } from "./languageDetection";

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

// Gundam-specific data interface for scraped data
export interface ProductSpecification {
  [key: string]: string | number | boolean | undefined;
}

export interface GundamProductImage {
  type: string;
  url: string;
  alt: string;
}

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
  specifications?: ProductSpecification;
  images: GundamProductImage[];
  language: LanguageDetection;
  url?: string;
  source: string;
  scrapedAt: string;
}