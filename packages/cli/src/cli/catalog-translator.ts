/**
 * CatalogTranslator - Reusable translation module for Bandai catalog items
 *
 * Translates all text fields from Japanese to English:
 * - name, series (LocalizedText)
 * - brands, categories (arrays with ja/en)
 * - description, accessories, contents (LocalizedText arrays)
 * - relatedProducts[].name (LocalizedText)
 *
 * Uses TranslationService with persistent store for caching.
 * Skips fields that already have .en values.
 */

import {
	TranslationService,
	createServerTranslationStore,
	loadDictionary,
	rebuildAndReloadDictionary,
	normalizeText,
	TRANSLATION_STORE_DIR,
} from "@hobby-ninja/translation";
import type { TranslationStore } from "@hobby-ninja/translation";
import type {
	CatalogBrand,
	CatalogCategory,
} from "@hobby-ninja/types/catalog";

import type { Item } from "./bandai-catalog-parser";

export interface CatalogTranslatorOptions {
	/** Directory for persistent translation cache (default: data/translations) */
	storeDir?: string;
	/** Enable verbose logging */
	verbose?: boolean;
	/** Rebuild dictionary after translation completes */
	rebuildDictionary?: boolean;
}

export interface TranslateItemResult {
	/** Whether any fields were translated */
	translated: boolean;
	/** Number of fields that were translated */
	fieldsTranslated: number;
	/** Error message if translation failed */
	error?: string;
}

interface CacheStats {
	hits: number;
	misses: number;
}

/** Maximum characters to show in error log preview */
const ERROR_LOG_PREVIEW_LENGTH = 50;

/**
 * Translates Bandai catalog items from Japanese to English
 */
export class CatalogTranslator {
	private translator?: TranslationService;
	private store?: TranslationStore;
	private storeDir: string;
	private verbose: boolean;
	private rebuildDictionary: boolean;
	private initialized = false;
	private cacheStats: CacheStats = { hits: 0, misses: 0 };

	constructor(options: CatalogTranslatorOptions = {}) {
		this.storeDir = options.storeDir ?? TRANSLATION_STORE_DIR;
		this.verbose = options.verbose ?? false;
		this.rebuildDictionary = options.rebuildDictionary ?? true;
	}

	/**
	 * Initialize the translation service with persistent store and dictionary
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		if (this.verbose) {
			console.log(`[CatalogTranslator] Initializing with store at: ${this.storeDir}`);
		}

		// Load dictionary for fast O(1) lookups of known phrases
		try {
			const dictionary = await loadDictionary();
			if (this.verbose) {
				console.log(`[CatalogTranslator] Dictionary loaded: ${dictionary.stats.uniquePhrases} phrases, ${dictionary.stats.uniqueWords} words`);
			}
		} catch {
			if (this.verbose) {
				console.log("[CatalogTranslator] Dictionary not found, will use API/store only");
			}
		}

		this.store = await createServerTranslationStore(this.storeDir, {
			maxEntries: 10_000,
		});

		this.translator = new TranslationService({}, undefined, this.store);
		this.initialized = true;

		if (this.verbose) {
			console.log("[CatalogTranslator] Translation service ready");
		}
	}

	/**
	 * Translate all text fields in a catalog item
	 * Skips fields that already have .en values
	 */
	async translateItem(item: Item): Promise<TranslateItemResult> {
		if (!this.initialized || !this.translator) {
			return {
				translated: false,
				fieldsTranslated: 0,
				error: "CatalogTranslator not initialized. Call initialize() first.",
			};
		}

		let fieldsTranslated = 0;

		try {
			// Translate name (LocalizedText)
			if (item.name.ja && !item.name.en) {
				const result = await this.translateText(item.name.ja);
				if (result) {
					item.name.en = result;
					fieldsTranslated++;
				}
			}

			// Translate series array
			for (const series of item.series) {
				if (series.ja && !series.en) {
					const result = await this.translateText(series.ja);
					if (result) {
						series.en = result;
						fieldsTranslated++;
					}
				}
			}

			// Skip translating releaseDate (should remain in Japanese format)

			// Translate brands array
			fieldsTranslated += await this.translateBrands(item.brands);

			// Translate categories array
			fieldsTranslated += await this.translateCategories(item.categories);

			// Translate description (object with ja/en arrays)
			if (item.description?.ja && !item.description.en) {
				item.description.en = await this.translateTextArray(item.description.ja);
				fieldsTranslated++;
			}

			// Translate accessories (ParsedAccessoryItem[] format)
			for (const accessory of item.accessories ?? []) {
				if (accessory.name.ja && !accessory.name.en) {
					const result = await this.translateText(accessory.name.ja);
					if (result) {
						accessory.name.en = result;
						fieldsTranslated++;
					}
				}
			}

			// Translate contents (ParsedAccessoryItem[] format)
			for (const content of item.contents ?? []) {
				if (content.name.ja && !content.name.en) {
					const result = await this.translateText(content.name.ja);
					if (result) {
						content.name.en = result;
						fieldsTranslated++;
					}
				}
			}

			// Translate relatedItems names
			for (const related of item.relatedItems) {
				if (related.ja && !related.en) {
					const result = await this.translateText(related.ja);
					if (result) {
						related.en = result;
						fieldsTranslated++;
					}
				}
			}

			return {
				translated: fieldsTranslated > 0,
				fieldsTranslated,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				translated: fieldsTranslated > 0,
				fieldsTranslated,
				error: message,
			};
		}
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): CacheStats {
		if (this.translator) {
			const translatorStats = this.translator.getCacheStats();
			return {
				hits: translatorStats.hits,
				misses: translatorStats.misses,
			};
		}
		return this.cacheStats;
	}

	/**
	 * Check if translator is initialized
	 */
	isInitialized(): boolean {
		return this.initialized;
	}

	/**
	 * Finalize translation run - rebuilds dictionary if enabled
	 * Call this after all translations are complete
	 */
	async finalize(): Promise<void> {
		if (!this.rebuildDictionary) {
			return;
		}

		if (this.verbose) {
			console.log("[CatalogTranslator] Rebuilding dictionary from cache...");
		}

		const result = await rebuildAndReloadDictionary({ verbose: this.verbose });

		if (result.success && result.dictionary) {
			if (this.verbose) {
				console.log(`[CatalogTranslator] Dictionary rebuilt: ${result.dictionary.stats.uniquePhrases} phrases`);
			}
		} else if (result.error) {
			console.error(`[CatalogTranslator] Failed to rebuild dictionary: ${result.error}`);
		}
	}

	// Private helper methods

	private async translateText(text: string): Promise<string | undefined> {
		if (!this.translator || !text.trim()) {
			return undefined;
		}

		try {
			// Normalize input (Japanese) before translation
			const normalizedInput = normalizeText(text);
			const result = await this.translator.translateText(normalizedInput, "en", "ja");
			// Normalize output (English) after translation
			return normalizeText(result.translated);
		} catch (error) {
			if (this.verbose) {
				console.error(`[CatalogTranslator] Failed to translate: "${text.slice(0, ERROR_LOG_PREVIEW_LENGTH)}..."`, error);
			}
			return undefined;
		}
	}

	private async translateBrands(brands: CatalogBrand[]): Promise<number> {
		let count = 0;
		for (const brand of brands) {
			if (brand.ja && !brand.en) {
				const result = await this.translateText(brand.ja);
				if (result) {
					brand.en = result;
					count++;
				}
			}
		}
		return count;
	}

	private async translateCategories(categories: CatalogCategory[]): Promise<number> {
		let count = 0;
		for (const category of categories) {
			if (category.ja && !category.en) {
				const result = await this.translateText(category.ja);
				if (result) {
					category.en = result;
					count++;
				}
			}
		}
		return count;
	}

	private async translateTextArray(texts: string[]): Promise<string[]> {
		const results: string[] = [];
		for (const text of texts) {
			if (text.trim()) {
				const result = await this.translateText(text);
				if (result) {
					results.push(result);
				} else {
					results.push(text); // fallback to original
				}
			} else {
				results.push(text); // keep empty or whitespace-only strings
			}
		}
		return results;
	}

}
