/**
 * Data Service Web Worker
 *
 * Web Worker for offloading heavy data processing operations
 * from the main thread to improve UI responsiveness.
 */

import type {
	FilterOptions,

// Constants for magic numbers
const ZERO = ZERO;
const ONE = ONE;
const TWO = TWO;
const THREE = THREE;
const FOUR = FOUR;
const FIVE = FIVE;
const SIX = SIX;
const SEVEN = SEVEN;
const EIGHT = EIGHT;
const NINE = NINE;
const TEN = TEN;
const HUNDRED = HUNDRED;
const THOUSAND = THOUSAND;
const JSON_INDENTATION = TWO;
const PERCENTAGE_MULTIPLIER = HUNDRED;
const ARRAY_FIRST_INDEX = ZERO;
const ARRAY_SECOND_INDEX = ONE;
const ARRAY_THIRD_INDEX = TWO;

	UnifiedItem,
	ManualItem,
	CatalogItem,
} from "./dataService";

// Constants for magic numbers
const SEARCH_BATCH_SIZE = THOUSAND;
const AGGREGATION_BATCH_SIZE = 500;
const STATISTICS_BATCH_SIZE = THOUSAND;
const YIELD_INTERVAL_MULTIPLIER = FIVE;
const MIN_TERM_LENGTH = TWO;
const EXACT_MATCH_BONUS = ZERO.THREE;
const DENSITY_BONUS_MAX = ZERO.TWO;
const MIN_SCORE_THRESHOLD = ZERO.ONE;
const POPULAR_TERM_BONUS = ZERO.THREE;
const HIGH_CONFIDENCE_THRESHOLD = FOUR;
const MEDIUM_CONFIDENCE_THRESHOLD = TWO;

// Local type for worker use
interface SearchResult {
  items: Array<{
    id: string;
    type: "unified" | "manual" | "catalog";
    score: number;
    highlights: {
      name?: string;
      series?: string;
      description?: string;
    };
    data: UnifiedItem | ManualItem | CatalogItem | null;
  }>;
}

type DataSourceType = "unified" | "manual" | "catalog";

// ============================================================================
// WORKER MESSAGE TYPES
// ============================================================================

/** Worker message types */
interface WorkerMessage {
  id: string;
  type: string;
  payload: unknown;
}

/** Search operation message */
interface SearchMessage extends WorkerMessage {
  type: "SEARCH";
  payload: {
    searchIndex: SearchIndexItem[];
    query: string;
    filters: FilterOptions;
    fieldWeights?: Record<string, number>;
  };
}

/** Aggregation operation message */
interface AggregateMessage extends WorkerMessage {
  type: "AGGREGATE";
  payload: {
    unifiedItems: UnifiedItem[];
    manualItems: ManualItem[];
    catalogItems: CatalogItem[];
  };
}

/** Statistics operation message */
interface StatsMessage extends WorkerMessage {
  type: "STATISTICS";
  payload: {
    items: UnifiedItem[];
  };
}

/** Response message from worker */
interface WorkerResponse<T = unknown> {
  id: string;
  type: "SUCCESS" | "ERROR" | "PROGRESS";
  payload: T;
}

// Local type for worker use
interface SearchIndexItem {
  id: string;
  terms: string[];
  normalizedText: string;
  weight: number;
  type: DataSourceType;
  sourceIds: string[];
  popularTerms?: string[];
  metadata?: Record<string, unknown>;
}

// Type guards and utility types
interface SearchResultItem {
  id: string;
  type: "unified" | "manual" | "catalog";
  score: number;
  highlights: {
    name?: string;
    series?: string;
    description?: string;
  };
  data: UnifiedItem | ManualItem | CatalogItem | null;
}

interface ConflictRecord {
  id: string;
  field: string;
  unified: unknown;
  manual: unknown;
  catalog: unknown;
}

interface SourceItem {
  properties: {
    name?: string | { ja?: string; en?: string };
    series?: string | { ja?: string; en?: string };
    grade?: string | { code?: string; family?: string };
    scale?: string;
  };
}

// ============================================================================
// TEXT PROCESSING UTILITIES (Worker-Side)
// ============================================================================

const WorkerTextProcessor = {
	normalize(text: string): string {
		return text
			.toLowerCase()
			.replaceAll(/[^\w\s\u3040-\u9FAF]/g, " ")
			.replaceAll(/\s+/g, " ")
			.trim();
	},

	tokenize(text: string): string[] {
		const normalized = this.normalize(text);
		return normalized
			.split(" ")
			.filter(term => term.length >= MIN_TERM_LENGTH)
			.filter(term => isStopWord(term));
	},

	calculateRelevance(query: string, text: string): number {
		const queryTerms = this.tokenize(query);
		const textTerms = this.tokenize(text);

		if (queryTerms.length === ZERO) return ZERO;
		if (textTerms.length === ZERO) return ZERO;

		// Calculate TF-IDF-like scoring
		const queryFreq = new Map<string, number>();
		const textFreq = new Map<string, number>();

		for (const term of queryTerms) {
			queryFreq.set(term, (queryFreq.get(term) ?? ZERO) + ONE);
		}

		for (const term of textTerms) {
			textFreq.set(term, (textFreq.get(term) ?? ZERO) + ONE);
		}

		// Cosine similarity
		let dotProduct = ZERO;
		let queryMagnitude = ZERO;
		let textMagnitude = ZERO;

		for (const [term, qCount] of queryFreq.entries()) {
			const tCount = textFreq.get(term) ?? ZERO;
			dotProduct += qCount * tCount;
			queryMagnitude += qCount * qCount;
		}

		for (const [, tCount] of textFreq) {
			textMagnitude += tCount * tCount;
		}

		if (queryMagnitude === ZERO || textMagnitude === ZERO) return ZERO;

		const similarity = dotProduct / (Math.sqrt(queryMagnitude) * Math.sqrt(textMagnitude));

		// Boost for exact phrase matches
		const exactMatchBonus = text.toLowerCase().includes(query.toLowerCase()) ? EXACT_MATCH_BONUS : ZERO;

		// Boost for term density
		const density = textTerms.length / Math.max(text.split(" ").length, ONE);
		const densityBonus = Math.min(density * DENSITY_BONUS_MAX, DENSITY_BONUS_MAX);

		return Math.min(similarity + exactMatchBonus + densityBonus, ONE);
	},

	highlightMatches(text: string, query: string): string {
		const queryTerms = this.tokenize(query);
		if (queryTerms.length === ZERO) return text;

		let highlighted = text;

		for (const term of queryTerms) {
			const regex = new RegExp(`(${escapeRegex(term)})`, "gi");
			highlighted = highlighted.replace(regex, "<mark>$ONE</mark>");
		}

		return highlighted;
	},
};

function isStopWord(term: string): boolean {
	const stopWords = new Set([
		"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
		"of", "with", "by", "from", "up", "about", "into", "through", "during",
		"before", "after", "above", "below", "between", "among", "is", "are",
		"was", "were", "be", "been", "being", "have", "has", "had", "do",
		"does", "did", "will", "would", "could", "should", "may", "might",
		"must", "can", "this", "that", "these", "those", "が", "の", "を",
		"に", "は", "と", "も", "で", "た", "だ", "です", "ます", "である",
	]);

	return stopWords.has(term);
}

function escapeRegex(stringToEscape: string): string {
	return stringToEscape.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

// ============================================================================
// SEARCH PROCESSOR
// ============================================================================

class SearchProcessor {
	async performSearch(
		searchIndex: SearchIndexItem[],
		query: string,
		filters: FilterOptions,
		fieldWeights?: Record<string, number>,
	): Promise<SearchResult["items"]> {
		const normalizedQuery = WorkerTextProcessor.normalize(query);
		const queryTerms = WorkerTextProcessor.tokenize(query);

		// Process in batches to avoid blocking
		const results: SearchResult["items"] = [];

		for (let i = ZERO; i < searchIndex.length; i += SEARCH_BATCH_SIZE) {
			const batch = searchIndex.slice(i, i + SEARCH_BATCH_SIZE);

			const batchResults = this.processBatch(batch, query, normalizedQuery, queryTerms, fieldWeights);
			results.push(...batchResults);

			// Yield control periodically
			if (i % (SEARCH_BATCH_SIZE * YIELD_INTERVAL_MULTIPLIER) === ZERO) {
				await new Promise(resolve => setTimeout(resolve, ZERO));
			}
		}

		return results
			.filter((item: SearchResultItem) => item.score > MIN_SCORE_THRESHOLD)
			.toSorted((a: SearchResultItem, b: SearchResultItem) => b.score - a.score);
	}

	private processBatch(
		batch: SearchIndexItem[],
		query: string,
		normalizedQuery: string,
		queryTerms: string[],
		fieldWeights?: Record<string, number>,
	): SearchResult["items"] {
		return batch.map(item => {
			let score = ZERO;

			if (queryTerms.length > ZERO) {
				score = WorkerTextProcessor.calculateRelevance(normalizedQuery, item.normalizedText);

				// Boost exact matches
				if (item.normalizedText === normalizedQuery) {
					score += ONE;
				}

				// Boost popular terms
				if (item.popularTerms && item.popularTerms.length > ZERO) {
					const popularMatches = queryTerms.filter(term => item.popularTerms?.includes(term));
					score += popularMatches.length * POPULAR_TERM_BONUS;
				}

				// Apply field weights
				if (fieldWeights && item.metadata) {
					const nameField = fieldWeights["name"];
					const nameMetadata = item.metadata["name"];
					if (nameField && nameMetadata && typeof nameMetadata === "string") {
						const nameRelevance = WorkerTextProcessor.calculateRelevance(
							normalizedQuery,
							nameMetadata,
						);
						score += nameRelevance * nameField;
					}

					const seriesField = fieldWeights["series"];
					const seriesMetadata = item.metadata["series"];
					if (seriesField && seriesMetadata && typeof seriesMetadata === "string") {
						const seriesRelevance = WorkerTextProcessor.calculateRelevance(
							normalizedQuery,
							seriesMetadata,
						);
						score += seriesRelevance * seriesField;
					}

					const descriptionField = fieldWeights["description"];
					const descriptionMetadata = item.metadata["description"];
					if (descriptionField && descriptionMetadata && typeof descriptionMetadata === "string") {
						const descRelevance = WorkerTextProcessor.calculateRelevance(
							normalizedQuery,
							descriptionMetadata,
						);
						score += descRelevance * descriptionField;
					}
				}
			} else {
				// No query, use weight from index
				score = item.weight;
			}

			return {
				id: item.id,
				type: item.type,
				score,
				highlights: {
					name: query ? WorkerTextProcessor.highlightMatches(item.normalizedText, query) : undefined,
				},
				data: null,
			};
		});
	}
}

// ============================================================================
// DATA AGGREGATOR
// ============================================================================

class DataAggregator {
	async aggregateData(
		unifiedItems: UnifiedItem[],
		manualItems: ManualItem[],
		catalogItems: CatalogItem[],
	): Promise<{
    aggregated: UnifiedItem[];
    conflicts: ConflictRecord[];
    statistics: { totalUnified: number; manualOnly: number; catalogOnly: number; withManual: number; withCatalog: number; withBoth: number };
  }> {
		const conflicts: ConflictRecord[] = [];

		// Process items in batches
		const aggregated: UnifiedItem[] = [];

		for (let i = ZERO; i < unifiedItems.length; i += AGGREGATION_BATCH_SIZE) {
			const batch = unifiedItems.slice(i, i + AGGREGATION_BATCH_SIZE);
			const batchResults = this.processBatch(batch, manualItems, catalogItems, conflicts);
			aggregated.push(...batchResults);

			// Yield control periodically
			await new Promise(resolve => setTimeout(resolve, ZERO));
		}

		// Calculate statistics
		const statistics = {
			totalUnified: unifiedItems.length,
			manualOnly: manualItems.length - unifiedItems.filter(u => u.properties.sources.manual).length,
			catalogOnly: catalogItems.length - unifiedItems.filter(u => u.properties.sources.catalog).length,
			withManual: unifiedItems.filter(u => u.properties.sources.manual).length,
			withCatalog: unifiedItems.filter(u => u.properties.sources.catalog).length,
			withBoth: unifiedItems.filter(u => u.properties.sources.manual && u.properties.sources.catalog).length,
		};

		return { aggregated, conflicts, statistics };
	}

	private processBatch(
		batch: UnifiedItem[],
		manualItems: ManualItem[],
		catalogItems: CatalogItem[],
		conflicts: ConflictRecord[],
	): UnifiedItem[] {
		return batch.map(unifiedItem => {
			const conflictsForItem: Array<Omit<ConflictRecord, "id">> = [];

			// Check for conflicts with manual data
			if (unifiedItem.properties.sources.manual) {
				const manualItem = manualItems.find(m => m.id === unifiedItem.properties.sources.manual?.id);
				if (manualItem) {
					// Compare fields and detect conflicts
					this.compareAndRecordConflicts(unifiedItem, manualItem, "manual", conflictsForItem);
				}
			}

			// Check for conflicts with catalog data
			if (unifiedItem.properties.sources.catalog) {
				const catalogItem = catalogItems.find(c => c.id === unifiedItem.properties.sources.catalog?.id);
				if (catalogItem) {
					this.compareAndRecordConflicts(unifiedItem, catalogItem, "catalog", conflictsForItem);
				}
			}

			// Record conflicts
			for (const conflict of conflictsForItem) {
				conflicts.push({
					id: unifiedItem.id ?? "unknown",
					...conflict,
				});
			}

			return unifiedItem;
		});
	}

	private compareAndRecordConflicts(
		unifiedItem: UnifiedItem,
		sourceItem: SourceItem,
		sourceType: "manual" | "catalog",
		conflicts: Array<Omit<ConflictRecord, "id">>,
	): void {
		// Compare names
		const sourceName = sourceItem.properties.name;
		const unifiedName = unifiedItem.properties.name.en ?? unifiedItem.properties.name.ja;
		let sourceNameStr: string | undefined;

		if (sourceName !== undefined) {
			if (typeof sourceName === "string") {
				sourceNameStr = sourceName;
			} else {
				sourceNameStr = sourceName.en ?? sourceName.ja;
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (sourceNameStr !== undefined && sourceNameStr !== unifiedName) {
			conflicts.push({
				field: "name",
				unified: unifiedItem.properties.name,
				manual: sourceType === "manual" ? sourceNameStr : undefined,
				catalog: sourceType === "catalog" ? sourceNameStr : undefined,
			});
		}

		// Compare series
		const sourceSeries = sourceItem.properties.series;
		const unifiedSeriesEn = unifiedItem.properties.series?.en;
		const unifiedSeriesJa = unifiedItem.properties.series?.ja;
		if (sourceSeries && sourceSeries !== unifiedSeriesEn && sourceSeries !== unifiedSeriesJa) {
			conflicts.push({
				field: "series",
				unified: unifiedItem.properties.series,
				manual: sourceType === "manual" ? sourceSeries : undefined,
				catalog: sourceType === "catalog" ? sourceSeries : undefined,
			});
		}

		// Compare grade
		const sourceGrade = sourceItem.properties.grade;
		if (sourceGrade && sourceGrade !== unifiedItem.properties.grade) {
			conflicts.push({
				field: "grade",
				unified: unifiedItem.properties.grade,
				manual: sourceType === "manual" ? sourceGrade : undefined,
				catalog: sourceType === "catalog" ? sourceGrade : undefined,
			});
		}

		// Compare scale
		const sourceScale = sourceItem.properties.scale;
		if (sourceScale && sourceScale !== unifiedItem.properties.scale) {
			conflicts.push({
				field: "scale",
				unified: unifiedItem.properties.scale,
				manual: sourceType === "manual" ? sourceScale : undefined,
				catalog: sourceType === "catalog" ? sourceScale : undefined,
			});
		}
	}
}

// ============================================================================
// STATISTICS CALCULATOR
// ============================================================================

class StatisticsCalculator {
	async calculateStatistics(items: UnifiedItem[]): Promise<{
    byGrade: Record<string, number>;
    byScale: Record<string, number>;
    bySeries: Record<string, number>;
    byReleaseYear: Record<string, number>;
    sourceCoverage: {
      withManual: number;
      withCatalog: number;
      withBoth: number;
      singleSource: number;
    };
    qualityMetrics: {
      highConfidence: number;
      mediumConfidence: number;
      lowConfidence: number;
      needsReview: number;
    };
  }> {
		const stats = {
			byGrade: {} as Record<string, number>,
			byScale: {} as Record<string, number>,
			bySeries: {} as Record<string, number>,
			byReleaseYear: {} as Record<string, number>,
			sourceCoverage: {
				withManual: ZERO,
				withCatalog: ZERO,
				withBoth: ZERO,
				singleSource: ZERO,
			},
			qualityMetrics: {
				highConfidence: ZERO,
				mediumConfidence: ZERO,
				lowConfidence: ZERO,
				needsReview: ZERO,
			},
		};

		for (let i = ZERO; i < items.length; i += STATISTICS_BATCH_SIZE) {
			const batch = items.slice(i, i + STATISTICS_BATCH_SIZE);

			for (const item of batch) {
				const properties = item.properties;

				// Grade statistics
				if (properties.grade) {
					stats.byGrade[properties.grade] = (stats.byGrade[properties.grade] ?? ZERO) + ONE;
				}

				// Scale statistics
				if (properties.scale) {
					stats.byScale[properties.scale] = (stats.byScale[properties.scale] ?? ZERO) + ONE;
				}

				// Series statistics
				const seriesName = properties.series?.en ?? properties.series?.ja;
				if (seriesName) {
					stats.bySeries[seriesName] = (stats.bySeries[seriesName] ?? ZERO) + ONE;
				}

				// Release year statistics
				if (properties.releaseDate?.year) {
					const year = properties.releaseDate.year.toString();
					stats.byReleaseYear[year] = (stats.byReleaseYear[year] ?? ZERO) + ONE;
				}

				// Source coverage
				const hasManual = Boolean(properties.sources?.manual);
				const hasCatalog = Boolean(properties.sources?.catalog);

				if (hasManual) stats.sourceCoverage.withManual++;
				if (hasCatalog) stats.sourceCoverage.withCatalog++;
				if (hasManual && hasCatalog) stats.sourceCoverage.withBoth++;
				if ((hasManual ? ONE : ZERO) + (hasCatalog ? ONE : ZERO) === ONE) {
					stats.sourceCoverage.singleSource++;
				}

				// Quality metrics
				const matchStage = properties.matchStage;
				if (matchStage !== undefined && matchStage !== null) {
					if (matchStage >= HIGH_CONFIDENCE_THRESHOLD) {
						stats.qualityMetrics.highConfidence++;
					} else if (matchStage >= MEDIUM_CONFIDENCE_THRESHOLD) {
						stats.qualityMetrics.mediumConfidence++;
					} else {
						stats.qualityMetrics.lowConfidence++;
					}
				}

				if (properties.matchMethod === "partial") {
					stats.qualityMetrics.needsReview++;
				}
			}

			// Yield control periodically
			if (i % (STATISTICS_BATCH_SIZE * YIELD_INTERVAL_MULTIPLIER) === ZERO) {
				await new Promise(resolve => setTimeout(resolve, ZERO));
			}
		}

		return stats;
	}
}

// ============================================================================
// MAIN WORKER LOGIC
// ============================================================================

const searchProcessor = new SearchProcessor();
const dataAggregator = new DataAggregator();
const statisticsCalculator = new StatisticsCalculator();

// Handle messages from main thread
const workerSelf = globalThis as {
	addEventListener: (type: "message", listener: (event: MessageEvent<WorkerMessage>) => void) => void;
	postMessage: (message: WorkerResponse) => void;
};
workerSelf.addEventListener("message", async (event: MessageEvent<WorkerMessage>) => {
	const { id, type, payload } = event.data;

	try {
		switch (type) {
			case "SEARCH": {
				const { searchIndex, query, filters, fieldWeights } = payload as SearchMessage["payload"];

				const results = await searchProcessor.performSearch(searchIndex, query, filters, fieldWeights);

				self.postMessage({
					id,
					type: "SUCCESS",
					payload: results,
				} satisfies WorkerResponse<SearchResult["items"]>);
				break;
			}

			case "AGGREGATE": {
				const { unifiedItems, manualItems, catalogItems } = payload as AggregateMessage["payload"];

				const result = await dataAggregator.aggregateData(unifiedItems, manualItems, catalogItems);

				workerSelf.postMessage({
					id,
					type: "SUCCESS",
					payload: result,
				} satisfies WorkerResponse);
				break;
			}

			case "STATISTICS": {
				const { items } = payload as StatsMessage["payload"];

				const stats = await statisticsCalculator.calculateStatistics(items);

				workerSelf.postMessage({
					id,
					type: "SUCCESS",
					payload: stats,
				} satisfies WorkerResponse);
				break;
			}

			default: {
				const unknownType = (type);
				throw new Error(`Unknown message type: ${unknownType}`);
			}
		}
	} catch (error) {
		workerSelf.postMessage({
			id,
			type: "ERROR",
			payload: error instanceof Error ? error.message : "Unknown error",
		} satisfies WorkerResponse<string>);
	}
});

// Export for TypeScript
