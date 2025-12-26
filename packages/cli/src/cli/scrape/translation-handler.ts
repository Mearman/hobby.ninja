/**
 * Translation handler for scraping operations
 * Consolidates dictionary lookup and translation service fallback logic
 */

import { TranslationService, lookupPhrase, addPhraseSync } from "@hobby-ninja/translation";

import type { Item } from "../bandai-catalog-parser.js";
import type { GlobalSiteData } from "../global-site-lookup.js";
import type { ManualData } from "../manual-parser.js";

/**
 * Translate text with dictionary lookup fallback to translation service
 * @param text - The Japanese text to translate
 * @param translator - Translation service instance for fallback
 * @returns Translated English text, or null if translation fails or returns same as input
 */
export async function translateWithFallback(
	text: string,
	translator: TranslationService,
): Promise<string | null> {
	// Check dictionary first
	const cached = lookupPhrase(text);
	if (cached) {
		return cached.en;
	}

	// Fall back to translation service
	const result = await translator.translateText(text, "en", "ja");
	if (result.translated && result.translated !== text) {
		return result.translated;
	}

	return null;
}

/**
 * Store canonical translations from global site in dictionary
 * @param item - Item with Japanese text
 * @param globalData - Global site data with English translations
 * @returns true if any translations were added to dictionary
 */
export function storeCanonicalTranslations(
	item: Item,
	globalData: GlobalSiteData,
): boolean {
	let translationsAdded = false;

	// Store product name translation
	if (globalData.name && item.name.ja) {
		addPhraseSync(item.name.ja, globalData.name, "product-name");
		translationsAdded = true;
	}

	// Store brand translation
	if (globalData.brand && item.brands[0]?.ja) {
		addPhraseSync(item.brands[0].ja, globalData.brand, "brand");
		translationsAdded = true;
	}

	// Store series translation
	if (globalData.series && item.series[0]?.ja) {
		addPhraseSync(item.series[0].ja, globalData.series, "series");
		translationsAdded = true;
	}

	return translationsAdded;
}

/**
 * Fallback translation for items without global site page
 * Checks dictionary first (for canonical translations from other items),
 * then falls back to TranslationService (Google Translate)
 * @param item - Item to translate
 * @param translator - Translation service instance
 * @returns Updated item with translations
 */
export async function translateItemFallback(
	item: Item,
	translator: TranslationService,
): Promise<Item> {
	// Translate name
	if (item.name.ja && !item.name.en) {
		const translated = await translateWithFallback(item.name.ja, translator);
		if (translated) {
			item.name.en = translated;
		}
	}

	// Translate description bullets
	if (item.description?.ja && !item.description.en) {
		const translatedBullets: string[] = [];
		for (const bullet of item.description.ja) {
			const translated = await translateWithFallback(bullet, translator);
			if (translated) {
				translatedBullets.push(translated);
			} else {
				// If translation fails, use original
				translatedBullets.push(bullet);
			}
		}
		item.description.en = translatedBullets;
	}

	// Translate brands
	for (const brand of item.brands) {
		if (brand.ja && !brand.en) {
			const translated = await translateWithFallback(brand.ja, translator);
			if (translated) {
				brand.en = translated;
			}
		}
	}

	// Translate series
	for (const series of item.series) {
		if (series.ja && !series.en) {
			const translated = await translateWithFallback(series.ja, translator);
			if (translated) {
				series.en = translated;
			}
		}
	}

	// Translate accessories (name and unit)
	if (item.accessories) {
		for (const accessory of item.accessories) {
			if (accessory.name.ja && !accessory.name.en) {
				const translated = await translateWithFallback(accessory.name.ja, translator);
				if (translated) {
					accessory.name.en = translated;
				}
			}
			if (accessory.unit?.ja && !accessory.unit.en) {
				const translated = await translateWithFallback(accessory.unit.ja, translator);
				if (translated) {
					accessory.unit.en = translated;
				}
			}
		}
	}

	// Translate contents (name and unit)
	if (item.contents) {
		for (const content of item.contents) {
			if (content.name.ja && !content.name.en) {
				const translated = await translateWithFallback(content.name.ja, translator);
				if (translated) {
					content.name.en = translated;
				}
			}
			if (content.unit?.ja && !content.unit.en) {
				const translated = await translateWithFallback(content.unit.ja, translator);
				if (translated) {
					content.unit.en = translated;
				}
			}
		}
	}

	return item;
}

/**
 * Fallback translation for manuals without English
 * Checks dictionary first, then uses translation service
 * @param manual - Manual to translate (modified in place)
 * @param translator - Translation service instance
 */
export async function translateManualFallback(
	manual: ManualData,
	translator: TranslationService,
): Promise<void> {
	// Translate name
	if (manual.name.ja && !manual.name.en) {
		const translated = await translateWithFallback(manual.name.ja, translator);
		if (translated) {
			manual.name.en = translated;
		}
	}

	// Translate PDF names
	for (const pdf of manual.pdfs) {
		if (pdf.name.ja && !pdf.name.en) {
			const translated = await translateWithFallback(pdf.name.ja, translator);
			if (translated) {
				pdf.name.en = translated;
			}
		}
	}

	// Translate brand if present
	if (manual.brand?.ja && !manual.brand.en) {
		const translated = await translateWithFallback(manual.brand.ja, translator);
		if (translated) {
			manual.brand.en = translated;
		}
	}

	// Translate series if present
	if (manual.series?.ja && !manual.series.en) {
		const translated = await translateWithFallback(manual.series.ja, translator);
		if (translated) {
			manual.series.en = translated;
		}
	}
}
