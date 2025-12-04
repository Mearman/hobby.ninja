import { TranslationCache, defaultCache } from "./cache";
import { GOOGLE_TRANSLATE_API_URL, RATE_LIMIT_DELAY, MAX_TEXT_LENGTH, GUNDAM_TEXT_REPLACEMENTS, DEFAULT_TRANSLATION_OPTIONS } from "./constants";
import {
	TranslationServiceError,
	CircuitBreaker,
	ErrorHandler,
	retryWithBackoff,
} from "./errors";
import {
	TranslationOptions,
	TranslationResult,
	SupportedLanguage,
	BatchTranslationRequest,
	BatchTranslationResult,
	TranslationErrorCode,
} from "./types";
import { TranslationStore, type StoreConfiguration } from "./store/translation-store";

// Browser globals
declare const fetch: typeof globalThis.fetch;
declare const setTimeout: typeof globalThis.setTimeout;
declare const clearTimeout: typeof globalThis.clearTimeout;



/**
 * Main translation service with optional persistent storage integration
 */
export class TranslationService {
	private cache: TranslationCache;
	private circuitBreaker: CircuitBreaker;
	private errorHandler: ErrorHandler;
	private lastRequestTime = 0;
	private translationStore?: TranslationStore;

	/**
	 * Create a new TranslationService instance
	 *
	 * @param options - Partial translation options to override defaults
	 * @param cache - Optional cache instance (defaults to in-memory cache)
	 * @param translationStore - Optional persistent translation store for caching translations
	 */
	constructor(
    private options: Partial<TranslationOptions> = {},
    cache?: TranslationCache,
    translationStore?: TranslationStore,
	) {
		this.cache = cache || defaultCache;
		this.circuitBreaker = new CircuitBreaker();
		this.errorHandler = new ErrorHandler();
		this.translationStore = translationStore;
	}

	/**
   * Translate a single text with optional persistent storage caching
   */
	async translateText(
		text: string,
		targetLanguage: SupportedLanguage = "en",
		sourceLanguage?: string,
	): Promise<TranslationResult> {
		const startTime = Date.now();
		const finalOptions: Required<TranslationOptions> = {
			...DEFAULT_TRANSLATION_OPTIONS,
			...this.options,
			targetLanguage,
			sourceLanguage: sourceLanguage ?? "auto",
		};

		try {
			// Validate input
			this.validateInput(text, finalOptions);

			// Check persistent store first (if available)
			if (this.translationStore && this.translationStore.isReady()) {
				try {
					const storeEntry = await this.translationStore.getByText(
						text,
						finalOptions.sourceLanguage as SupportedLanguage,
						finalOptions.targetLanguage as SupportedLanguage
					);

					if (storeEntry) {
						return {
							original: text,
							translated: storeEntry.translatedText,
							sourceLanguage: storeEntry.sourceLanguage,
							targetLanguage: storeEntry.targetLanguage,
							cached: true,
							processingTime: Date.now() - startTime,
						};
					}
				} catch (storeError) {
					// Log store error but continue with translation
					console.warn('TranslationStore lookup failed, falling back to API:', storeError);
				}
			}

			// Check in-memory cache next
			if (finalOptions.cacheEnabled) {
				const cached = this.getCachedTranslation(text, finalOptions);
				if (cached) {
					return {
						...cached,
						cached: true,
						processingTime: Date.now() - startTime,
					};
				}
			}

			// Apply text replacements
			const processedText = this.applyTextReplacements(text);

			// Translate with circuit breaker protection
			const translation = await this.circuitBreaker.execute(() =>
				this.fetchTranslation(processedText, finalOptions),
			);

			const result: TranslationResult = {
				original: text,
				translated: translation,
				sourceLanguage: finalOptions.sourceLanguage,
				targetLanguage: finalOptions.targetLanguage,
				cached: false,
				processingTime: Date.now() - startTime,
			};

			// Cache the result in persistent store (if available)
			if (this.translationStore && this.translationStore.isReady()) {
				try {
					await this.translationStore.set(
						text,
						translation,
						finalOptions.sourceLanguage as SupportedLanguage,
						finalOptions.targetLanguage as SupportedLanguage,
						{
							apiProvider: 'google-translate',
							ttl: finalOptions.cacheTtl,
						}
					);
				} catch (storeError) {
					// Log store error but don't fail the translation
					console.warn('Failed to store translation in TranslationStore:', storeError);
				}
			}

			// Cache the result in in-memory cache
			if (finalOptions.cacheEnabled) {
				this.setCachedTranslation(text, finalOptions, translation);
			}

			return result;
		} catch (error) {
			this.errorHandler.handleError(error, "translateText");
			throw error;
		}
	}

	/**
   * Translate multiple texts in batch
   */
	async translateBatch(
		request: BatchTranslationRequest,
	): Promise<BatchTranslationResult> {
		const startTime = Date.now();
		const finalOptions: Required<TranslationOptions> = {
			...DEFAULT_TRANSLATION_OPTIONS,
			...this.options,
			...request.options,
		};

		const results: TranslationResult[] = [];
		let successCount = 0;
		let errorCount = 0;

		// Process in batches to avoid rate limiting
		const batches = this.chunkArray(request.texts, finalOptions.batchSize);

		for (const batch of batches) {
			const batchPromises = batch.map(async (text) => {
				try {
					const result = await this.translateText(
						text,
            finalOptions.targetLanguage as SupportedLanguage,
            finalOptions.sourceLanguage,
					);
					successCount++;
					return result;
				} catch (error) {
					errorCount++;
					this.errorHandler.handleError(error, "translateBatch");
					// Return error result instead of throwing
					return {
						original: text,
						translated: text, // Return original on error
						sourceLanguage: finalOptions.sourceLanguage || "auto",
						targetLanguage: finalOptions.targetLanguage,
						cached: false,
						processingTime: 0,
					};
				}
			});

			const batchResults = await Promise.all(batchPromises);
			results.push(...batchResults);

			// Rate limiting delay between batches
			if (batches.length > 1 && batches.indexOf(batch) < batches.length - 1) {
				await this.delay(RATE_LIMIT_DELAY);
			}
		}

		return {
			results,
			totalCount: request.texts.length,
			successCount,
			errorCount,
			processingTime: Date.now() - startTime,
		};
	}

	/**
   * Fetch translation from Google Translate API
   */
	private async fetchTranslation(
		text: string,
		options: Required<TranslationOptions>,
	): Promise<string> {
		// Rate limiting
		await this.enforceRateLimit();

		const url = this.buildApiUrl(text, options);

		return retryWithBackoff(
			async () => {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), options.timeout);

				try {
					const response = await fetch(url, {
						method: "GET",
						signal: controller.signal,
						headers: {
							"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
							"Accept": "application/json",
						},
					});

					clearTimeout(timeoutId);

					if (!response.ok) {
						throw TranslationServiceError.fromHttpResponse(
							response.status,
							response.statusText,
							{
								text,
								sourceLanguage: options.sourceLanguage,
								targetLanguage: options.targetLanguage,
							},
						);
					}

					const data = await response.json();
					const translation = this.parseTranslationResponse(data);

					if (!translation) {
						throw TranslationServiceError.fromParsingError(
							new Error("Empty translation result"),
							{
								text,
								sourceLanguage: options.sourceLanguage,
								targetLanguage: options.targetLanguage,
							},
						);
					}

					return translation;
				} catch (error: unknown) {
					clearTimeout(timeoutId);

					if (error instanceof Error && error.name === "AbortError") {
						throw TranslationServiceError.fromTimeout(options.timeout, {
							text,
							sourceLanguage: options.sourceLanguage,
							targetLanguage: options.targetLanguage,
						});
					}

					if (error instanceof TranslationServiceError) {
						throw error;
					}

					throw TranslationServiceError.fromNetworkError(error, {
						text,
						sourceLanguage: options.sourceLanguage,
						targetLanguage: options.targetLanguage,
					});
				}
			},
			options.retryAttempts,
			options.retryDelay,
		);
	}

	/**
   * Build Google Translate API URL
   */
	private buildApiUrl(text: string, options: Required<TranslationOptions>): string {
		const params = new URLSearchParams({
			client: "gtx",
			sl: options.sourceLanguage,
			tl: options.targetLanguage,
			dt: "t",
			q: text,
		});

		return `${GOOGLE_TRANSLATE_API_URL}?${params.toString()}`;
	}

	/**
   * Parse translation response from Google Translate API
   */
	private parseTranslationResponse(data: unknown): string | null {
		try {
			// Google Translate API response format: [ [[trans, src], ...], ... ]
			if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
				const translations = data[0].map((item: unknown): string | null => {
					if (Array.isArray(item) && item.length > 0 && typeof item[0] === "string") {
						return item[0];
					}
					return null;
				}).filter((item): item is string => item !== null);

				return translations.join("");
			}
			return null;
		} catch (error) {
			throw TranslationServiceError.fromParsingError(error);
		}
	}

	/**
   * Validate input parameters
   */
	private validateInput(text: string, options: Required<TranslationOptions>): void {
		if (!text || typeof text !== "string") {
			throw new TranslationServiceError(
				TranslationErrorCode.INVALID_REQUEST,
				"Text must be a non-empty string",
			);
		}

		if (text.length > MAX_TEXT_LENGTH) {
			throw new TranslationServiceError(
				TranslationErrorCode.INVALID_REQUEST,
				`Text length exceeds maximum of ${MAX_TEXT_LENGTH} characters`,
			);
		}

		if (!options.targetLanguage) {
			throw new TranslationServiceError(
				TranslationErrorCode.INVALID_REQUEST,
				"Target language is required",
			);
		}
	}

	/**
   * Apply text replacements for better translation quality
   */
	private applyTextReplacements(text: string): string {
		let processedText = text;

		for (const rule of GUNDAM_TEXT_REPLACEMENTS) {
			if (typeof rule.pattern === "string") {
				processedText = processedText.replaceAll(
					new RegExp(this.escapeRegExp(rule.pattern), "g"),
					rule.replacement,
				);
			} else if (rule.pattern instanceof RegExp) {
				processedText = processedText.replace(rule.pattern, rule.replacement);
			}
		}

		return processedText.trim();
	}

	/**
   * Get cached translation
   */
	private getCachedTranslation(
		text: string,
		options: Required<TranslationOptions>,
	): TranslationResult | null {
		const cached = this.cache.get(
			text,
			options.sourceLanguage,
			options.targetLanguage,
		);

		if (cached) {
			return {
				original: text,
				translated: cached,
				sourceLanguage: options.sourceLanguage,
				targetLanguage: options.targetLanguage,
				cached: true,
				processingTime: 0,
			};
		}

		return null;
	}

	/**
   * Set cached translation
   */
	private setCachedTranslation(
		text: string,
		options: Required<TranslationOptions>,
		translation: string,
	): void {
		this.cache.set(
			text,
			options.sourceLanguage,
			options.targetLanguage,
			translation,
			options.cacheTtl,
		);
	}

	/**
   * Enforce rate limiting
   */
	private async enforceRateLimit(): Promise<void> {
		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequestTime;

		if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
			const delay = RATE_LIMIT_DELAY - timeSinceLastRequest;
			await this.delay(delay);
		}

		this.lastRequestTime = Date.now();
	}

	/**
   * Utility function to escape regex special characters
   */
	private escapeRegExp(string: string): string {
		return string.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
	}

	/**
   * Utility function to chunk array
   */
	private chunkArray<T>(array: T[], chunkSize: number): T[][] {
		const chunks: T[][] = [];
		for (let i = 0; i < array.length; i += chunkSize) {
			chunks.push(array.slice(i, i + chunkSize));
		}
		return chunks;
	}

	/**
   * Utility function to create delay
   */
	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
   * Get cache statistics
   */
	getCacheStats(): ReturnType<TranslationCache["getStats"]> {
		return this.cache.getStats();
	}

	/**
   * Get circuit breaker status
   */
	getCircuitBreakerStatus(): ReturnType<CircuitBreaker["getState"]> {
		return this.circuitBreaker.getState();
	}

	/**
   * Get error statistics
   */
	getErrorStats(): ReturnType<ErrorHandler["getErrorStats"]> {
		return this.errorHandler.getErrorStats();
	}

	/**
   * Clear cache
   */
	clearCache(): void {
		this.cache.clear();
	}

	/**
   * Reset circuit breaker
   */
	resetCircuitBreaker(): void {
		this.circuitBreaker.reset();
	}

	/**
   * Reset error statistics
   */
	resetErrorStats(): void {
		this.errorHandler.resetErrorCounts();
	}

	/**
   * Set or update the TranslationStore instance
   *
   * @param translationStore - TranslationStore instance to use for persistent caching
   */
	setTranslationStore(translationStore?: TranslationStore): void {
		this.translationStore = translationStore;
	}

	/**
   * Get the current TranslationStore instance
   *
   * @returns Current TranslationStore instance or undefined if not set
   */
	getTranslationStore(): TranslationStore | undefined {
		return this.translationStore;
	}

	/**
   * Check if TranslationStore is available and ready
   *
   * @returns true if TranslationStore is available and ready for operations
   */
	hasTranslationStore(): boolean {
		return this.translationStore?.isReady() ?? false;
	}
}

/**
 * Default translation service instance
 */
export const defaultTranslator = new TranslationService();

/**
 * Create a TranslationService with persistent storage support
 *
 * @param options - Optional translation service options
 * @param storeConfig - Optional store configuration for persistent caching
 * @returns Promise resolving to configured TranslationService
 *
 * @example
 * ```typescript
 * // Service with default persistent store
 * const service = await createTranslationServiceWithStore();
 *
 * // Service with custom store configuration
 * const service = await createTranslationServiceWithStore(
 *   { cacheEnabled: true },
 *   { storagePath: './my-translations', maxEntries: 5000 }
 * );
 * ```
 */
export async function createTranslationServiceWithStore(
	options?: Partial<TranslationOptions>,
	storeConfig?: Partial<StoreConfiguration>,
): Promise<TranslationService> {
	let store: TranslationStore | undefined;

	if (storeConfig) {
		// Import dynamically to avoid circular dependencies
		const { createTranslationStore } = await import('./store/translation-store-factory');
		store = await createTranslationStore(storeConfig);
	}

	return new TranslationService(options, undefined, store);
}

/**
 * Convenience function for single text translation
 */
export async function translateText(
	text: string,
	targetLanguage: SupportedLanguage = "en",
	sourceLanguage?: string,
): Promise<TranslationResult> {
	return defaultTranslator.translateText(text, targetLanguage, sourceLanguage);
}

/**
 * Convenience function for batch translation
 */
export async function translateBatch(
	texts: string[],
	targetLanguage: SupportedLanguage = "en",
	sourceLanguage?: string,
): Promise<BatchTranslationResult> {
	return defaultTranslator.translateBatch({
		texts,
		options: {
			...DEFAULT_TRANSLATION_OPTIONS,
			targetLanguage,
			sourceLanguage,
		},
	});
}