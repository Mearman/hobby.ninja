// Unified Product Database Types
// Aggregates data from multiple sources (catalog, manuals, etc.) per SKU

import type { LocalizedText } from "./manualData";

/** Source link for catalog data */
export interface CatalogSourceLink {
	id: string; // e.g., "01_1000"
	confidence: number; // 0.0-1.0
	linkedAt: string; // ISO timestamp
}

/** Source link for manual data */
export interface ManualSourceLink {
	id: string; // e.g., "0001"
	productNumber?: string; // e.g., "1114204"
	pdfUrl?: string;
	confidence: number; // 0.0-1.0
	linkedAt: string; // ISO timestamp
}

/** Extensible sources container */
export interface UnifiedSources {
	catalog?: CatalogSourceLink;
	manual?: ManualSourceLink;
	// Future: reviews?, priceHistory?, thirdParty?
}

/** Unified release date with partial date support */
export interface UnifiedReleaseDate {
	year: number;
	month?: number;
	day?: number;
}

/** Core unified product record */
export interface UnifiedProduct {
	// Canonical identifier (generated, stable)
	id: string; // e.g., "up_00001"

	// Merged product info (best data from all sources)
	name: LocalizedText;
	series?: LocalizedText;
	grade?: string;
	scale?: string;
	releaseDate?: UnifiedReleaseDate;

	// Source links - extensible for future sources
	sources: UnifiedSources;

	// Matching metadata
	matchMethod: "exact" | "fuzzy" | "manual_override";
	matchStage?: number; // 1-5 indicating which strategy matched
	createdAt: string;
	updatedAt: string;
}

/** Index for fast lookups between source IDs and unified IDs */
export interface UnifiedIndex {
	generatedAt: string;

	// Source ID → Unified ID
	byCatalogId: Record<string, string>; // "01_1000" → "up_00001"
	byManualId: Record<string, string>; // "0001" → "up_00001"
	byProductNumber: Record<string, string>; // "1114204" → "up_00001"

	// Stats
	totalUnified: number;
	sourceCounts: {
		catalog: number;
		manual: number;
	};
}

/** Reason why an item couldn't be matched */
export type OrphanReason = "no_match" | "below_threshold" | "ambiguous";

/** Catalog item that couldn't be matched */
export interface CatalogOrphan {
	id: string;
	name: LocalizedText;
	series?: string;
	scale?: string;
	releaseDate?: UnifiedReleaseDate;
	reason: OrphanReason;
}

/** Manual that couldn't be matched */
export interface ManualOrphan {
	id: string;
	name: LocalizedText;
	productNumber?: string;
	series?: string;
	scale?: string;
	releaseDate?: UnifiedReleaseDate;
	reason: OrphanReason;
}

/** Container for all orphaned items */
export interface OrphanItems {
	generatedAt: string;
	catalog: CatalogOrphan[];
	manual: ManualOrphan[];
}

/** Low-confidence match pending human review */
export interface ReviewQueueItem {
	suggestedUnifiedId: string;
	catalogId: string;
	manualId: string;
	confidence: number;
	matchStage: number;
	matchedFields: {
		name?: { catalogValue: string; manualValue: string; similarity: number };
		series?: { matches: boolean };
		scale?: { matches: boolean };
		grade?: { matches: boolean };
		dateDiff?: { days: number };
	};
	action: "confirm" | "reject" | "pending";
}

/** Review queue for low-confidence matches */
export interface ReviewQueue {
	generatedAt: string;
	items: ReviewQueueItem[];
}

/** Summary statistics for unification */
export interface UnifyStats {
	generatedAt: string;
	totals: {
		catalogItems: number;
		manuals: number;
	};
	results: {
		unified: number;
		reviewQueue: number;
		orphanedCatalog: number;
		orphanedManuals: number;
	};
	byStage: Record<number, number>; // stage → count
	byConfidence: {
		high: number; // >= 0.80
		medium: number; // 0.70-0.79
		low: number; // 0.50-0.69 (review queue)
	};
	processingTime: number; // milliseconds
}

/** Result from a single matching attempt */
export interface MatchCandidate {
	catalogId: string;
	manualId: string;
	confidence: number;
	stage: number;
	matchedFields: ReviewQueueItem["matchedFields"];
}

/** Thresholds for matching decisions */
export interface MatchingThresholds {
	/** Minimum confidence to auto-accept match (default: 0.70) */
	autoAccept: number;
	/** Below this goes to orphans, above goes to review (default: 0.50) */
	reviewCutoff: number;
}

/** Options for the unification process */
export interface UnifyOptions {
	thresholds: MatchingThresholds;
	dryRun: boolean;
	outputDir: string;
}
