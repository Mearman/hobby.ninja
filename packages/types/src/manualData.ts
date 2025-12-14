// Bandai Manual Data Types

export interface LocalizedText {
  ja: string;
  en?: string;
}

/** Localized text arrays - for content that may differ between languages (not 1:1 translations) */
export interface LocalizedTextArray {
  ja: string[];
  en?: string[];
}

export interface ProductInfo {
  name: string;
  series?: string;
  grade?: string;
  scale?: string;
}

export interface PublicationInfo {
  date?: string;
  version?: string;
  language: "ja" | "en" | "mixed";
}

export interface BandaiInfo {
  categoryId?: string;
  productId?: string;
  manualId?: string;
}

export interface ManualMetadata {
  title: LocalizedText;
  product: ProductInfo;
  publication: PublicationInfo;
  bandai?: BandaiInfo;
}

export type BlockType =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "image"
  | "warning"
  | "note"
  | "instruction"
  | "specification";

export interface BlockMetadata {
  className?: string;
  pageNumber?: number;
  footnote?: string;
}

export type SpecificationData = Record<string, string | number | boolean | string[] | undefined>;

export interface BlockData {
  text?: string;
  items?: string[];
  rows?: string[][];
  image?: ImageReference;
  specifications?: SpecificationData;
}

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string | BlockData;
  metadata?: BlockMetadata;
}

export interface ContentSection {
  id: string;
  level: number;
  title: LocalizedText;
  blocks: ContentBlock[];
  subsections: ContentSection[];
  pageNumber?: number;
}

export interface ContentStatistics {
  totalSections: number;
  totalBlocks: number;
  wordCount: number;
  japaneseCharacterCount: number;
  imageCount: number;
}

export interface ManualContent {
  sections: ContentSection[];
  blocks: ContentBlock[];
  statistics: ContentStatistics;
}

export interface Position {
  x: number;
  y: number;
}

export interface DiagramLabel {
  text: string;
  position: Position;
  target?: string;
}

export interface DiagramAnnotation {
  id: string;
  text: string;
  position: Position;
  target?: string;
}

export interface ImageReference {
  id: string;
  src: string;
  alt: LocalizedText;
  type: "illustration" | "photo" | "diagram" | "symbol";
  size?: {
    width?: number;
    height?: number;
  };
  pageNumber?: number;
}

export interface DiagramReference extends ImageReference {
  type: "diagram";
  labels: DiagramLabel[];
  annotations: DiagramAnnotation[];
}

export interface ThumbnailReference {
  id: string;
  src: string;
  width?: number;
  height?: number;
}

export interface ManualAssets {
  images: ImageReference[];
  diagrams: DiagramReference[];
  thumbnails: ThumbnailReference[];
}

export interface OutlineEntry {
  id: string;
  level: number;
  title: string;
  sectionId: string;
  pageNumber?: number;
  children: OutlineEntry[];
}

export interface NavigationItem {
  id: string;
  type: "page" | "section" | "chapter" | "appendix";
  title: string;
  target: string;
  order: number;
}

export interface DocumentStructure {
  outline: OutlineEntry[];
  navigation: NavigationItem[];
  pageCount?: number;
}

export interface SourceInfo {
  url?: string;
  htmlPath: string;
  htmlSize: number;
}

export interface ManualDocument {
  id: string;
  metadata: ManualMetadata;
  content: ManualContent;
  assets: ManualAssets;
  structure: DocumentStructure;
  extractedAt: string;
  source: SourceInfo;
}

export interface ProcessingOptions {
  concurrency?: number;
  memoryThreshold?: number;
  batchSize?: number;
  retries?: number;
  progressInterval?: number;
  enableGC?: boolean;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
}

export interface ProcessingProgress {
  processed: number;
  total: number;
  percentage: number;
  errors: number;
  rate: string;
  eta: string;
  memory: MemoryUsage;
}

export interface ProcessingResult {
  id: string;
  success: boolean;
  data?: ManualDocument;
  errors?: string[];
  processingTime: number;
}

export interface BatchProcessingResult {
  total: number;
  successful: number;
  failed: number;
  errors: {
    file: string;
    error: string;
  }[];
  totalTime: number;
  averageRate: number;
}