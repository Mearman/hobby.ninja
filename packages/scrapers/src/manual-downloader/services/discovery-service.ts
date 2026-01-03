/**
 * Discovery service for intelligent ID range detection
 *
 * Implements algorithms for discovering valid manual page IDs
 * when the range is unknown and may contain gaps.
 */

import { DiscoveryResult, GapPattern, IdValidationResult, RangeExpansionResult } from "../types/types";

import { ErrorFactory } from "./errors";
import { HttpClient } from "./http-client";

/** Custom validation rule function */
type ValidationRule = (id: number, response: unknown) => boolean;

export interface DiscoveryOptions {
  startId?: number;
  maxRange?: number;
  strategy?: "linear" | "exponential" | "adaptive" | "hybrid";
  detectGaps?: boolean;
  minConfidence?: number;
  timeLimit?: number;
  stopOnFirstRange?: boolean;
  customValidation?: ValidationRule[];
}

export interface GapDetectionOptions {
  strategy?: "sequential" | "sampling" | "adaptive" | "statistical";
  sampleSize?: number;
  minGapSize?: number;
  confidenceThreshold?: number;
  validateBoundaries?: boolean;
  timeLimit?: number;
}

export interface ValidationOptions {
  parallel?: boolean;
  concurrency?: number;
  cache?: boolean;
  timeout?: number;
  customRules?: ValidationRule[];
}

export interface ExpansionOptions {
  direction: "both" | "up" | "down";
  maxSteps?: number;
  stepStrategy: "linear" | "exponential" | "fibonacci";
  baseStepSize?: number;
  validateIntermediate?: boolean;
  confidenceThreshold?: number;
}

/**
 * Discovery service implementation
 */
export class DiscoveryService {
	private httpClient: HttpClient;
	private cache = new Map<string, IdValidationResult>();
	private startTime = 0;

	constructor(httpClient: HttpClient) {
		this.httpClient = httpClient;
	}

	async discoverRange(baseUrl: string, options: DiscoveryOptions = {}): Promise<DiscoveryResult> {
		this.startTime = Date.now();
		const DEFAULT_START_ID = 652;
		const {
			startId = DEFAULT_START_ID,
			strategy = "adaptive",
			detectGaps = true,
			minConfidence = 0.8,
			stopOnFirstRange = false,
		} = options;

		try {
			// Step 1: Expand range from starting point
			const expansion = await this.expandRange(baseUrl, startId, {
				direction: "both",
				stepStrategy: "linear",
				confidenceThreshold: minConfidence,
			});

			// Step 2: Detect gaps if requested
			let gaps: GapPattern[] = [];
			if (detectGaps && expansion.rangeSize > 1) {
				gaps = await this.detectGaps(baseUrl, expansion.minId, expansion.maxId, {
					strategy: "adaptive",
					validateBoundaries: true,
				});
			}

			// Step 3: Validate overall results
			const isValid = expansion.quality.confidence >= minConfidence;
			if (!isValid && !stopOnFirstRange) {
				throw new Error(`Discovery confidence ${expansion.quality.confidence} below threshold ${minConfidence}`);
			}

			// Step 4: Return comprehensive results
			return {
				minId: expansion.minId,
				maxId: expansion.maxId,
				validIds: expansion.minId === expansion.maxId ? [expansion.minId] :
					Array.from({ length: expansion.maxId - expansion.minId + 1 }, (_, i) => expansion.minId + i)
						.filter(id => !gaps.some(gap => id >= gap.startId && id <= gap.endId)),
				gaps,
				confidence: expansion.quality.confidence,
				discoveryDuration: expansion.performance.duration,
				idsTested: expansion.performance.requestsMade,
				strategy,
			};

		} catch (error) {
			throw ErrorFactory.network("DISCOVERY_FAILED",
				`Range discovery failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	async detectGaps(baseUrl: string, minId: number, maxId: number, options: GapDetectionOptions): Promise<GapPattern[]> {
		const {
			strategy = "adaptive",
			sampleSize = 10,
			minGapSize = 1,
			confidenceThreshold = 0.7,
		} = options;

		try {
			const gaps: GapPattern[] = [];
			let currentGapStart: number | null = null;

			// Strategy: Sample throughout the range to detect patterns
			if (strategy === "adaptive" || strategy === "sampling") {
				const samplePoints = this.generateSamplePoints(minId, maxId, sampleSize);

				for (const point of samplePoints) {
					const validation = await this.validateSingleId(baseUrl, point);

					if (validation.isValid) {
						if (currentGapStart !== null) {
							const gapSize = point - currentGapStart - 1;
							if (gapSize >= minGapSize) {
								gaps.push({
									startId: currentGapStart,
									endId: point - 1,
									gapSize,
									confidence: this.calculateGapConfidence(gapSize, currentGapStart, point - 1),
									type: this.classifyGapType(gapSize),
									recommendedAction: this.getGapRecommendation(gapSize, validation.confidence),
								});
							}
							currentGapStart = null;
						}
					} else {
						currentGapStart ??= point;
					}
				}

				// Handle gap ending at maxId
				if (currentGapStart !== null) {
					const gapSize = maxId - currentGapStart + 1;
					if (gapSize >= minGapSize) {
						gaps.push({
							startId: currentGapStart,
							endId: maxId,
							gapSize,
							confidence: this.calculateGapConfidence(gapSize, currentGapStart, maxId),
							type: this.classifyGapType(gapSize),
							recommendedAction: "investigate",
						});
					}
				}
			}

			return gaps.filter(gap => gap.confidence >= confidenceThreshold);

		} catch (error) {
			throw ErrorFactory.network("GAP_DETECTION_FAILED",
				`Gap detection failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	async validateIds(baseUrl: string, ids: number[], options: ValidationOptions = {}): Promise<{
    results: IdValidationResult[];
    summary: { total: number; valid: number; invalid: number; errors: number; cached: number };
    performance: { duration: number; averageResponseTime: number; requestsPerSecond: number; cacheHitRate: number };
  }> {
		const {
			parallel = true,
			concurrency = 5,
			cache = true,
		} = options;

		const startTime = Date.now();
		const results: IdValidationResult[] = [];

		try {
			if (parallel) {
				// Parallel validation with concurrency limit
				const chunks = this.chunkArray(ids, concurrency);

				for (const chunk of chunks) {
					const chunkResults = await Promise.allSettled(
						chunk.map(id => this.validateSingleId(baseUrl, id, cache)),
					);

					for (const [index, result] of chunkResults.entries()) {
						if (result.status === "fulfilled") {
							results.push(result.value);
						} else {
							const errorReason = result.reason as Error | undefined;
							results.push({
								id: chunk[index],
								isValid: false,
								statusCode: 0,
								finalUrl: `${baseUrl}${chunk[index]}/`,
								contentLength: 0,
								responseTime: 0,
								fromCache: false,
								error: errorReason?.message ?? "Unknown error",
								confidence: 0,
							});
						}
					}
				}
			} else {
				// Sequential validation
				for (const id of ids) {
					const result = await this.validateSingleId(baseUrl, id, cache);
					results.push(result);
				}
			}

			const duration = Date.now() - startTime;
			const validCount = results.filter(r => r.isValid).length;
			const cachedCount = results.filter(r => r.fromCache).length;
			const errorCount = results.filter(r => r.error).length;

			return {
				results,
				summary: {
					total: results.length,
					valid: validCount,
					invalid: results.length - validCount,
					errors: errorCount,
					cached: cachedCount,
				},
				performance: {
					duration,
					averageResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length,
					requestsPerSecond: (results.length / duration) * 1000,
					cacheHitRate: (cachedCount / results.length) * 100,
				},
			};

		} catch (error) {
			throw ErrorFactory.network("VALIDATION_FAILED",
				`ID validation failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	async expandRange(baseUrl: string, startId: number, options: ExpansionOptions): Promise<RangeExpansionResult> {
		const DEFAULT_MAX_STEPS = 50;
		const {
			direction,
			maxSteps = DEFAULT_MAX_STEPS,
			stepStrategy,
			baseStepSize = 1,
		} = options;

		const startTime = Date.now();
		let minId = startId;
		let maxId = startId;
		let upwardSteps = 0;
		let downwardSteps = 0;
		let upwardConsecutiveFailures = 0;
		let downwardConsecutiveFailures = 0;
		const maxFailures = 20;

		try {
			// Expand upward
			if (direction === "both" || direction === "up") {
				let currentId = startId + baseStepSize;

				while (upwardSteps < maxSteps && upwardConsecutiveFailures < maxFailures) {
					const validation = await this.validateSingleId(baseUrl, currentId);

					if (validation.isValid) {
						maxId = currentId;
						upwardConsecutiveFailures = 0;
					} else {
						upwardConsecutiveFailures++;
					}

					currentId += this.getNextStepSize(stepStrategy, upwardSteps + 1, baseStepSize);
					upwardSteps++;
				}
			}

			// Expand downward
			if (direction === "both" || direction === "down") {
				let currentId = startId - baseStepSize;

				while (downwardSteps < maxSteps && downwardConsecutiveFailures < maxFailures && currentId > 0) {
					const validation = await this.validateSingleId(baseUrl, currentId);

					if (validation.isValid) {
						minId = currentId;
						downwardConsecutiveFailures = 0;
					} else {
						downwardConsecutiveFailures++;
					}

					currentId -= this.getNextStepSize(stepStrategy, downwardSteps + 1, baseStepSize);
					downwardSteps++;
				}
			}

			const duration = Date.now() - startTime;
			const rangeSize = maxId - minId + 1;
			const confidence = this.calculateRangeConfidence(upwardSteps + downwardSteps, upwardConsecutiveFailures + downwardConsecutiveFailures);

			return {
				minId,
				maxId,
				rangeSize,
				expansion: {
					upwardSteps,
					downwardSteps,
					totalSteps: upwardSteps + downwardSteps,
					consecutiveFailures: {
						upward: upwardConsecutiveFailures,
						downward: downwardConsecutiveFailures,
					},
				},
				quality: {
					confidence,
					coverage: this.calculateCoverage(minId, maxId),
					gapDensity: this.estimateGapDensity(upwardSteps, downwardSteps, rangeSize),
				},
				performance: {
					duration,
					requestsMade: upwardSteps + downwardSteps + 1,
					averageResponseTime: duration / (upwardSteps + downwardSteps + 1),
					successRate: (upwardSteps + downwardSteps - upwardConsecutiveFailures - downwardConsecutiveFailures) / (upwardSteps + downwardSteps + 1),
				},
			};

		} catch (error) {
			throw ErrorFactory.network("RANGE_EXPANSION_FAILED",
				`Range expansion failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	// Private helper methods
	private async validateSingleId(baseUrl: string, id: number, useCache = true): Promise<IdValidationResult> {
		const url = `${baseUrl}${id}/`;
		const cacheKey = `validate:${url}`;

		// Check cache first
		if (useCache) {
			const cached = this.cache.get(cacheKey);
			if (cached) {
				return { ...cached, fromCache: true };
			}
		}

		const startTime = Date.now();
		let result: IdValidationResult;

		try {
			const response = await this.httpClient.validateUrl(url, { timeout: 10_000 });
			const duration = Date.now() - startTime;

			result = {
				id,
				isValid: response.isValid,
				statusCode: response.statusCode,
				finalUrl: response.finalUrl,
				contentLength: response.contentLength,
				responseTime: duration,
				fromCache: false,
				confidence: this.calculateValidationConfidence(response),
			};

			// Cache the result
			if (useCache && this.cache.size < 1000) {
				this.cache.set(cacheKey, { ...result, fromCache: true });
			}

			return result;

		} catch (error) {
			const duration = Date.now() - startTime;
			result = {
				id,
				isValid: false,
				statusCode: 0,
				finalUrl: url,
				contentLength: 0,
				responseTime: duration,
				fromCache: false,
				error: error instanceof Error ? error.message : String(error),
				confidence: 0,
			};
			return result;
		}
	}

	private generateSamplePoints(minId: number, maxId: number, sampleSize: number): number[] {
		if (maxId - minId <= sampleSize) {
			return Array.from({ length: maxId - minId + 1 }, (_, i) => minId + i);
		}

		const points: number[] = [minId, maxId];
		const step = Math.floor((maxId - minId) / (sampleSize - 1));

		for (let i = 1; i < sampleSize - 1; i++) {
			points.push(minId + (i * step));
		}

		return points.toSorted((a, b) => a - b);
	}

	private calculateGapConfidence(gapSize: number, _startId: number, _endId: number): number {
		if (gapSize <= 5) return 0.9;
		if (gapSize <= 20) return 0.7;
		if (gapSize <= 50) return 0.4;
		return 0.1;
	}

	private classifyGapType(gapSize: number): "small-gap" | "medium-gap" | "large-gap" | "range-boundary" {
		if (gapSize <= 5) return "small-gap";
		if (gapSize <= 20) return "medium-gap";
		if (gapSize <= 50) return "large-gap";
		return "range-boundary";
	}

	private getGapRecommendation(gapSize: number, confidence: number): string {
		if (gapSize <= 3 && confidence > 0.8) return "skip";
		if (gapSize <= 10) return "investigate";
		return "deep-scan";
	}

	private chunkArray<T>(array: T[], size: number): T[][] {
		const chunks: T[][] = [];
		for (let i = 0; i < array.length; i += size) {
			chunks.push(array.slice(i, i + size));
		}
		return chunks;
	}

	private getNextStepSize(strategy: string, step: number, baseSize: number): number {
		switch (strategy) {
			case "exponential": {
				return baseSize * Math.pow(2, step - 1);
			}
			case "fibonacci": {
				return this.fibonacci(step) * baseSize;
			}
			case "adaptive": {
				return step <= 5 ? baseSize : baseSize * 2;
			}
			default: {
				// includes "linear" strategy
				return baseSize;
			}
		}
	}

	private fibonacci(n: number): number {
		if (n <= 1) return n;
		let a = 0, b = 1;
		for (let i = 2; i < n; i++) {
			[a, b] = [b, a + b];
		}
		return b;
	}

	private calculateRangeConfidence(steps: number, failures: number): number {
		if (steps === 0) return 0;
		const successRate = (steps - failures) / steps;
		return Math.max(0, Math.min(1, successRate * (1 - failures / (steps * 2))));
	}

	private calculateCoverage(minId: number, maxId: number): number {
		// Simple heuristic: larger ranges have lower confidence without validation
		const rangeSize = maxId - minId + 1;
		if (rangeSize <= 10) return 0.95;
		if (rangeSize <= 100) return 0.8;
		if (rangeSize <= 1000) return 0.6;
		return 0.4;
	}

	private estimateGapDensity(upwardSteps: number, downwardSteps: number, rangeSize: number): number {
		const totalSteps = upwardSteps + downwardSteps;
		if (rangeSize <= 1 || totalSteps === 0) return 0;
		return (totalSteps / rangeSize) * 100; // gaps per 100 IDs
	}

	private calculateValidationConfidence(response: { isValid: boolean; contentLength: number; statusCode: number }): number {
		if (response.isValid) {
			// High confidence for successful responses with content
			return response.contentLength > 1000 ? 0.95 : 0.8;
		}

		// Low confidence for failures, but not zero
		return response.statusCode === 404 ? 0.9 : 0.5;
	}

	getDiscoveryStats(): { totalOperations: number; cacheSize: number; lastUpdated: string } {
		return {
			totalOperations: this.cache.size,
			cacheSize: this.cache.size,
			lastUpdated: new Date().toISOString(),
		};
	}

	resetStats(): void {
		this.cache.clear();
		this.startTime = Date.now();
	}
}