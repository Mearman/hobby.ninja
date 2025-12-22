/**
 * Type definitions for data export functionality
 */

import type { LanguageDetection } from "../types/product-data.js";

export interface ExportOptions {
  format: "json" | "csv" | "excel" | "ndjson";
  outputPath: string;
  includeImages?: boolean;
  includeSpecifications?: boolean;
  includeCategories?: boolean;
  prettyPrint?: boolean;
  compression?: boolean;
  encoding?: "utf8" | "shift-jis";
  language?: "ja" | "en" | "all";
  filters?: ExportFilters;
}

export interface ExportFilters {
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  language?: Array<LanguageDetection["language"]>;
  searchText?: string;
}

export interface ExportResult {
  success: boolean;
  filePath: string;
  format: string;
  recordCount: number;
  fileSize: number;
  compressed?: boolean;
  duration: number;
  errors?: string[];
}

export interface ExportProgress {
  current: number;
  total: number;
  stage: string;
  message?: string;
}

export type ProgressCallback = (progress: ExportProgress) => void;

export interface ExporterConfig {
  batchSize: number;
  maxMemoryUsage: number;
  tempDir: string;
}

// Excel specific types
export interface ExcelWorksheet {
  name: string;
  data: Array<Record<string, unknown>>;
  columns: ExcelColumn[];
}

export interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
  style?: ExcelStyle;
}

export interface ExcelStyle {
  font?: {
    bold?: boolean;
    size?: number;
    color?: string;
  };
  fill?: {
    fgColor?: string;
  };
  alignment?: {
    horizontal?: "left" | "center" | "right";
    vertical?: "top" | "middle" | "bottom";
  };
}

// CSV specific types
export interface CSVOptions {
  delimiter: string;
  quoteChar: string;
  escapeChar: string;
  headers: boolean;
  lineBreaker: string;
}

// Export data transformation types
export interface TransformedData {
  id: string;
  name: string;
  nameJa?: string;
  nameEn?: string;
  brand: string;
  series?: string;
  category?: string;
  price?: number;
  currency?: string;
  releaseDate?: string;
  scale?: string;
  grade?: string;
  description?: string;
  specifications?: Record<string, unknown>;
  images: ImageInfo[];
  language: LanguageDetection;
  url?: string;
  source: string;
  scrapedAt: string;
}

export interface ImageInfo {
  type: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  size?: number;
}

// Export validation types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
  value: unknown;
}