/**
 * Data Service Web Worker
 *
 * Web Worker for offloading heavy data processing operations
 * from the main thread to improve UI responsiveness.
 */

import type {
	SearchResult,
	FilterOptions,
	UnifiedItem,
	ManualItem,
	CatalogItem,
	DataSourceType,
} from "@workspace/types";

// ============================================================================
// WORKER MESSAGE TYPES
// ============================================================================

/** Worker message types */
interface WorkerMessage {
  id: string;
  type: string;
  payload: any;
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
interface WorkerResponse<T = any> {
  id: string;
  type: "SUCCESS" | "ERROR" | "PROGRESS";
  payload: T;
}

/** Progress message for long-running operations */
interface ProgressMessage {
  id: string;
  type: "PROGRESS";
  payload: {
    current: number;
    total: number;
    message?: string;
    percentage: number;
  };
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
  metadata?: Record<string, any>;
}

// ============================================================================
// TEXT PROCESSING UTILITIES (Worker-Side)
// ============================================================================

class WorkerTextProcessor {
	static normalize(text: string): string {
		return text
			.toLowerCase()
			.replaceAll(/[^\w\s\u3040-\u9FAF]/g, " ")
			.replaceAll(/\s+/g, " ")
			.trim();
	}

	static tokenize(text: string): string[] {
		const normalized = this.normalize(text);
		return normalized
			.split(" ")
			.filter(term => term.length >= 2)
			.filter(term => !this.isStopWord(term));
	}

	private static isStopWord(term: string): boolean {
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

	static calculateRelevance(query: string, text: string): number {
		const queryTerms = this.tokenize(query);
		const textTerms = this.tokenize(text);

		if (queryTerms.length === 0) return 0;
		if (textTerms.length === 0) return 0;

		// Calculate TF-IDF-like scoring
		const queryFreq = new Map<string, number>();
		const textFreq = new Map<string, number>();

		for (const term of queryTerms) {
			queryFreq.set(term, (queryFreq.get(term) || 0) + 1);
		}

		for (const term of textTerms) {
			textFreq.set(term, (textFreq.get(term) || 0) + 1);
		}

		// Cosine similarity
		let dotProduct = 0;
		let queryMagnitude = 0;
		let textMagnitude = 0;

		for (const [term, qCount] of queryFreq.entries()) {
			const tCount = textFreq.get(term) || 0;
			dotProduct += qCount * tCount;
			queryMagnitude += qCount * qCount;
		}

		for (const tCount of textFreq) {
			textMagnitude += tCount * tCount;
		}

		if (queryMagnitude === 0 || textMagnitude === 0) return 0;

		const similarity = dotProduct / (Math.sqrt(queryMagnitude) * Math.sqrt(textMagnitude));

		// Boost for exact phrase matches
		const exactMatchBonus = text.toLowerCase().includes(query.toLowerCase()) ? 0.3 : 0;

		// Boost for term density
		const density = textTerms.length / Math.max(text.split(" ").length, 1);
		const densityBonus = Math.min(density * 0.2, 0.2);

		return Math.min(similarity + exactMatchBonus + densityBonus, 1);
	}

	static highlightMatches(text: string, query: string): string {
		const queryTerms = this.tokenize(query);
		if (queryTerms.length === 0) return text;

		let highlighted = text;

		for (const term of queryTerms) {
			const regex = new RegExp(`(${this.escapeRegex(term)})`, "gi");
			highlighted = highlighted.replace(regex, "<mark>$1</mark>");
		}

		return highlighted;
	}

	private static escapeRegex(string: string): string {
		return string.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
	}
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
		const batchSize = 1000;
		const results: SearchResult["items"] = [];

		for (let i = 0; i < searchIndex.length; i += batchSize) {
			const batch = searchIndex.slice(i, i + batchSize);

			const batchResults = this.processBatch(batch, query, normalizedQuery, queryTerms, fieldWeights);
			results.push(...batchResults);

			// Yield control periodically
			if (i % (batchSize * 5) === 0) {
				await new Promise(resolve => setTimeout(resolve, 0));
			}
		}

		return results
			.filter((item: any) => item.score > 0.1)
			.sort((a: any, b: any) => b.score - a.score);
	}

	private processBatch(
		batch: SearchIndexItem[],
		query: string,
		normalizedQuery: string,
		queryTerms: string[],
		fieldWeights?: Record<string, number>,
	): SearchResult["items"] {
		return batch.map(item => {
			let score = 0;

			if (queryTerms.length > 0) {
				score = WorkerTextProcessor.calculateRelevance(normalizedQuery, item.normalizedText);

				// Boost exact matches
				if (item.normalizedText === normalizedQuery) {
					score += 1;
				}

				// Boost popular terms
				if (item.popularTerms) {
					const popularMatches = queryTerms.filter(term => item.popularTerms!.includes(term));
					score += popularMatches.length * 0.3;
				}

				// Apply field weights
				if (fieldWeights && item.metadata) {
					if (fieldWeights["name"] && item.metadata["name"]) {
						const nameRelevance = WorkerTextProcessor.calculateRelevance(
							normalizedQuery,
							item.metadata["name"],
						);
						score += nameRelevance * fieldWeights["name"];
					}

					if (fieldWeights["series"] && item.metadata["series"]) {
						const seriesRelevance = WorkerTextProcessor.calculateRelevance(
							normalizedQuery,
							item.metadata["series"],
						);
						score += seriesRelevance * fieldWeights["series"];
					}

					if (fieldWeights.description && item.metadata.description) {
						const descRelevance = WorkerTextProcessor.calculateRelevance(
							normalizedQuery,
							item.metadata.description,
						);
						score += descRelevance * fieldWeights.description;
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
    conflicts: Array<{ id: string; field: string; unified: unknown; manual: unknown; catalog: unknown }>;
    statistics: { totalUnified; manualOnly; catalogOnly; withManual; withCatalog; withBoth };
  }> {
		const conflicts: Array<{ id: string; field: string; unified: unknown; manual: unknown; catalog: unknown }> = [];
		const processedIds = new Set<string>();

		// Process items in batches
		const batchSize = 500;
		const aggregated: UnifiedItem[] = [];

		for (let i = 0; i < unifiedItems.length; i += batchSize) {
			const batch = unifiedItems.slice(i, i + batchSize);
			const batchResults = await this.processBatch(batch, manualItems, catalogItems, conflicts);
			aggregated.push(...batchResults);

			// Yield control periodically
			await new Promise(resolve => setTimeout(resolve, 0));
		}

		// Calculate statistics
		const statistics = {
			totalUnified: unifiedItems.length,
			manualOnly: manualItems.length - unifiedItems.filter(u => u.sources.manual).length,
			catalogOnly: catalogItems.length - unifiedItems.filter(u => u.sources.catalog).length,
			withManual: unifiedItems.filter(u => u.sources.manual).length,
			withCatalog: unifiedItems.filter(u => u.sources.catalog).length,
			withBoth: unifiedItems.filter(u => u.sources.manual && u.sources.catalog).length,
		};

		return { aggregated, conflicts, statistics };
	}

	private async processBatch(
		batch: UnifiedItem[],
		manualItems: ManualItem[],
		catalogItems: CatalogItem[],
		conflicts: Array<{ id: string; field: string; unified: any; manual: any; catalog: any }>,
	): Promise<UnifiedItem[]> {
		return batch.map(unifiedItem => {
			const conflictsForItem: Array<{ field: string; unified: any; manual: any; catalog: any }> = [];

			// Check for conflicts with manual data
			if (unifiedItem.sources.manual) {
				const manualItem = manualItems.find(m => m.id === unifiedItem.sources.manual?.id);
				if (manualItem) {
					// Compare fields and detect conflicts
					this.compareAndRecordConflicts(unifiedItem, manualItem, "manual", conflictsForItem);
				}
			}

			// Check for conflicts with catalog data
			if (unifiedItem.sources.catalog) {
				const catalogItem = catalogItems.find(c => c.id === unifiedItem.sources.catalog?.id);
				if (catalogItem) {
					this.compareAndRecordConflicts(unifiedItem, catalogItem, "catalog", conflictsForItem);
				}
			}

			// Record conflicts
			for (const conflict of conflictsForItem) {
				conflicts.push({
					id: unifiedItem.id,
					...conflict,
				});
			}

			return unifiedItem;
		});
	}

	private compareAndRecordConflicts(
		unifiedItem: UnifiedItem,
		sourceItem: any,
		sourceType: "manual" | "catalog",
		conflicts: Array<{ field: string; unified: any; manual: any; catalog: any }>,
	): void {
		// Compare names
		if (sourceItem.name && sourceItem.name !== (unifiedItem.name.en || unifiedItem.name.ja)) {
			conflicts.push({
				field: "name",
				unified: unifiedItem.name,
				manual: sourceType === "manual" ? sourceItem.name : undefined,
				catalog: sourceType === "catalog" ? sourceItem.name : undefined,
			});
		}

		// Compare series
		if (sourceItem.series && sourceItem.series !== unifiedItem.series?.en && sourceItem.series !== unifiedItem.series?.ja) {
			conflicts.push({
				field: "series",
				unified: unifiedItem.series,
				manual: sourceType === "manual" ? sourceItem.series : undefined,
				catalog: sourceType === "catalog" ? sourceItem.series : undefined,
			});
		}

		// Compare grade
		if (sourceItem.grade && sourceItem.grade !== unifiedItem.grade) {
			conflicts.push({
				field: "grade",
				unified: unifiedItem.grade,
				manual: sourceType === "manual" ? sourceItem.grade : undefined,
				catalog: sourceType === "catalog" ? sourceItem.grade : undefined,
			});
		}

		// Compare scale
		if (sourceItem.scale && sourceItem.scale !== unifiedItem.scale) {
			conflicts.push({
				field: "scale",
				unified: unifiedItem.scale,
				manual: sourceType === "manual" ? sourceItem.scale : undefined,
				catalog: sourceType === "catalog" ? sourceItem.scale : undefined,
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
				withManual: 0,
				withCatalog: 0,
				withBoth: 0,
				singleSource: 0,
			},
			qualityMetrics: {
				highConfidence: 0,
				mediumConfidence: 0,
				lowConfidence: 0,
				needsReview: 0,
			},
		};

		// Process items in batches
		const batchSize = 1000;

		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);

			for (const item of batch) {
				// Grade statistics
				if (item.grade) {
					stats.byGrade[item.grade] = (stats.byGrade[item.grade] || 0) + 1;
				}

				// Scale statistics
				if (item.scale) {
					stats.byScale[item.scale] = (stats.byScale[item.scale] || 0) + 1;
				}

				// Series statistics
				const seriesName = item.series?.en || item.series?.ja;
				if (seriesName) {
					stats.bySeries[seriesName] = (stats.bySeries[seriesName] || 0) + 1;
				}

				// Release year statistics
				if (item.releaseDate?.year) {
					const year = item.releaseDate.year.toString();
					stats.byReleaseYear[year] = (stats.byReleaseYear[year] || 0) + 1;
				}

				// Source coverage
				const hasManual = Boolean(item.sources.manual);
				const hasCatalog = Boolean(item.sources.catalog);

				if (hasManual) stats.sourceCoverage.withManual++;
				if (hasCatalog) stats.sourceCoverage.withCatalog++;
				if (hasManual && hasCatalog) stats.sourceCoverage.withBoth++;
				if ((hasManual ? 1 : 0) + (hasCatalog ? 1 : 0) === 1) {
					stats.sourceCoverage.singleSource++;
				}

				// Quality metrics
				if (item.matchStage && item.matchStage >= 4) {
					stats.qualityMetrics.highConfidence++;
				} else if (item.matchStage && item.matchStage >= 2) {
					stats.qualityMetrics.mediumConfidence++;
				} else if (item.matchStage && item.matchStage < 2) {
					stats.qualityMetrics.lowConfidence++;
				}

				if (item.matchMethod === "manual_override") {
					stats.qualityMetrics.needsReview++;
				}
			}

			// Yield control periodically
			if (i % (batchSize * 5) === 0) {
				await new Promise(resolve => setTimeout(resolve, 0));
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
self.addEventListener("message", async (event: MessageEvent<WorkerMessage>) => {
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
				} as WorkerResponse);
				break;
			}

			case "AGGREGATE": {
				const { unifiedItems, manualItems, catalogItems } = payload as AggregateMessage["payload"];

				const result = await dataAggregator.aggregateData(unifiedItems, manualItems, catalogItems);

				self.postMessage({
					id,
					type: "SUCCESS",
					payload: result,
				} as WorkerResponse);
				break;
			}

			case "STATISTICS": {
				const { items } = payload as StatsMessage["payload"];

				const stats = await statisticsCalculator.calculateStatistics(items);

				self.postMessage({
					id,
					type: "SUCCESS",
					payload: stats,
				} as WorkerResponse);
				break;
			}

			default: {
				throw new Error(`Unknown message type: ${type}`);
			}
		}
	} catch (error) {
		self.postMessage({
			id,
			type: "ERROR",
			payload: error instanceof Error ? error.message : "Unknown error",
		} as WorkerResponse);
	}
});

// Export for TypeScript
