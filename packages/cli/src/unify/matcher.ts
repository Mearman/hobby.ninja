/**
 * Multi-stage matching engine for unifying catalog items and manuals.
 *
 * Implements 5 matching stages with decreasing confidence:
 * 1. Exact normalized name match (0.95)
 * 2. Fuzzy name + series match (0.90)
 * 3. Fuzzy name + scale + date proximity (0.80)
 * 4. Series + scale + grade + date window (0.60)
 * 5. Fuzzy name only - review queue (0.50)
 */

import type {
	MatchCandidate,
	UnifiedReleaseDate,
	ReviewQueueItem,
} from "@speckit/types";

import {
	normalizeProductName,
	extractCoreName,
	productNameSimilarity,
	seriesMatch,
	scaleMatch,
	gradeMatch,
	normalizeGrade,
} from "./normalizer";

import { datesWithinDays, dateDifferenceInDays } from "../utils/date-proximity";

/** Simplified catalog item for matching */
export interface CatalogMatchItem {
	id: string;
	name: string;
	series?: string;
	scale?: string;
	grade?: string; // Extracted from brands
	releaseDate?: UnifiedReleaseDate;
}

/** Simplified manual item for matching */
export interface ManualMatchItem {
	id: string;
	name: string;
	productNumber?: string;
	series?: string;
	scale?: string;
	grade?: string;
	releaseDate?: UnifiedReleaseDate;
}

/**
 * Try to match a single catalog item against all unmatched manuals.
 * Returns the best match candidate if found, otherwise undefined.
 */
export function findBestMatch(
	catalog: CatalogMatchItem,
	manuals: ManualMatchItem[],
	usedManualIds: Set<string>
): MatchCandidate | undefined {
	const candidates: MatchCandidate[] = [];

	for (const manual of manuals) {
		// Skip already matched manuals
		if (usedManualIds.has(manual.id)) continue;

		const candidate = evaluateMatch(catalog, manual);
		if (candidate) {
			candidates.push(candidate);
		}
	}

	if (candidates.length === 0) return undefined;

	// Sort by confidence (highest first), then by stage (lower is better)
	candidates.sort((a, b) => {
		if (b.confidence !== a.confidence) return b.confidence - a.confidence;
		return a.stage - b.stage;
	});

	return candidates[0];
}

/**
 * Evaluate a potential match between catalog item and manual.
 * Returns a MatchCandidate if any stage matches, otherwise undefined.
 */
export function evaluateMatch(
	catalog: CatalogMatchItem,
	manual: ManualMatchItem
): MatchCandidate | undefined {
	const normalizedCatalogName = normalizeProductName(catalog.name);
	const normalizedManualName = normalizeProductName(manual.name);

	// Stage 1: Exact normalized name match
	if (normalizedCatalogName === normalizedManualName) {
		return createCandidate(catalog, manual, 0.95, 1, {
			name: {
				catalogValue: catalog.name,
				manualValue: manual.name,
				similarity: 1.0,
			},
		});
	}

	// Calculate name similarity for fuzzy stages
	const nameSimilarity = productNameSimilarity(catalog.name, manual.name);

	// Stage 2: Fuzzy name (>= 0.85) + series match
	if (nameSimilarity >= 0.85 && seriesMatch(catalog.series, manual.series)) {
		return createCandidate(catalog, manual, 0.9, 2, {
			name: {
				catalogValue: catalog.name,
				manualValue: manual.name,
				similarity: nameSimilarity,
			},
			series: { matches: true },
		});
	}

	// Stage 2.5: Very high name similarity (>= 0.98) + scale + grade family match
	// This catches cases where HGBF/HGUC catalog items match ＨＧ manual entries
	if (
		nameSimilarity >= 0.98 &&
		scaleMatch(catalog.scale, manual.scale) &&
		gradeMatch(catalog.grade, manual.grade)
	) {
		return createCandidate(catalog, manual, 0.88, 2, {
			name: {
				catalogValue: catalog.name,
				manualValue: manual.name,
				similarity: nameSimilarity,
			},
			scale: { matches: true },
			grade: { matches: true },
		});
	}

	// Stage 3: Fuzzy name (>= 0.80) + scale + date proximity (90 days)
	if (
		nameSimilarity >= 0.8 &&
		scaleMatch(catalog.scale, manual.scale) &&
		datesWithinDays(catalog.releaseDate, manual.releaseDate, 90)
	) {
		const dateDiff = catalog.releaseDate && manual.releaseDate
			? dateDifferenceInDays(catalog.releaseDate, manual.releaseDate)
			: undefined;

		return createCandidate(catalog, manual, 0.8, 3, {
			name: {
				catalogValue: catalog.name,
				manualValue: manual.name,
				similarity: nameSimilarity,
			},
			scale: { matches: true },
			dateDiff: dateDiff !== undefined ? { days: dateDiff } : undefined,
		});
	}

	// Stage 4: Series + scale + grade + date window (30 days)
	if (
		seriesMatch(catalog.series, manual.series) &&
		scaleMatch(catalog.scale, manual.scale) &&
		gradeMatch(catalog.grade, manual.grade) &&
		datesWithinDays(catalog.releaseDate, manual.releaseDate, 30)
	) {
		const dateDiff = catalog.releaseDate && manual.releaseDate
			? dateDifferenceInDays(catalog.releaseDate, manual.releaseDate)
			: undefined;

		return createCandidate(catalog, manual, 0.6, 4, {
			name: {
				catalogValue: catalog.name,
				manualValue: manual.name,
				similarity: nameSimilarity,
			},
			series: { matches: true },
			scale: { matches: true },
			grade: { matches: true },
			dateDiff: dateDiff !== undefined ? { days: dateDiff } : undefined,
		});
	}

	// Stage 5: Fuzzy name only (>= 0.90) - for review queue
	if (nameSimilarity >= 0.9) {
		return createCandidate(catalog, manual, 0.5, 5, {
			name: {
				catalogValue: catalog.name,
				manualValue: manual.name,
				similarity: nameSimilarity,
			},
		});
	}

	return undefined;
}

/**
 * Create a match candidate with the given parameters.
 */
function createCandidate(
	catalog: CatalogMatchItem,
	manual: ManualMatchItem,
	confidence: number,
	stage: number,
	matchedFields: ReviewQueueItem["matchedFields"]
): MatchCandidate {
	return {
		catalogId: catalog.id,
		manualId: manual.id,
		confidence,
		stage,
		matchedFields,
	};
}

/**
 * Match all catalog items against all manuals.
 * Returns matched pairs and sets of unmatched IDs.
 */
export function matchAll(
	catalogItems: CatalogMatchItem[],
	manuals: ManualMatchItem[]
): {
	matches: MatchCandidate[];
	unmatchedCatalogIds: Set<string>;
	unmatchedManualIds: Set<string>;
} {
	const matches: MatchCandidate[] = [];
	const usedManualIds = new Set<string>();
	const matchedCatalogIds = new Set<string>();

	// Process catalog items
	for (const catalog of catalogItems) {
		const match = findBestMatch(catalog, manuals, usedManualIds);
		if (match) {
			matches.push(match);
			usedManualIds.add(match.manualId);
			matchedCatalogIds.add(catalog.id);
		}
	}

	// Find unmatched items
	const unmatchedCatalogIds = new Set<string>();
	for (const catalog of catalogItems) {
		if (!matchedCatalogIds.has(catalog.id)) {
			unmatchedCatalogIds.add(catalog.id);
		}
	}

	const unmatchedManualIds = new Set<string>();
	for (const manual of manuals) {
		if (!usedManualIds.has(manual.id)) {
			unmatchedManualIds.add(manual.id);
		}
	}

	return { matches, unmatchedCatalogIds, unmatchedManualIds };
}
