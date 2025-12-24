/**
 * Bandai Catalog HTML Parser using Cheerio
 * Extracts structured product data from Bandai Hobby catalog pages
 * Outputs normalized Item format with ID references
 */

import { load, type CheerioAPI } from "cheerio";

import { parseCountedItems } from "./count-parser";

// Constants for repeated selectors
const LABEL_VALUE_SELECTOR = "dd.pg-products__labelTxt";
// Legacy format: description in instructionTxt paragraph
const DESCRIPTION_SELECTOR_LEGACY = ".pg-products__instructionTxt p";
// New format: description in article with PlaygroundEditorTheme paragraphs
const DESCRIPTION_SELECTOR_ARTICLE = ".pg-products__article";

// ============================================================================
// Types
// ============================================================================

/** Price information */
export interface ItemPrice {
	amount: number;
	currency: "JPY";
	taxIncluded: boolean;
	taxRate: number;
}

/** Release date with Japanese format and parsed components */
export interface ItemReleaseDate {
	ja: string;
	year: number;
	month: number;
	day?: number;
}

/** Localized text array (bilingual) */
export interface LocalizedTextArray {
	ja: string[];
	en?: string[];
}

/** Parsed accessory/content item with localized name and count */
export interface ParsedAccessoryItem {
	name: { ja: string; en?: string };
	count?: number;
	unit?: { ja: string; en?: string };
}

/** Image with source URL and optional local path */
export interface ItemImage {
	/** Original source URL from Bandai (stripped for ephemeral CDN URLs) */
	src?: string;
	/** Local path after download (e.g., /images/items/01_1000/153_1937.jpg) */
	path?: string;
	/** MD5 hash of image file contents for deduplication */
	hash?: string;
}

/** Images grouped by type */
export interface ItemImages {
	/** Product gallery images */
	product: ItemImage[];
	/** Instruction/manual images */
	instructions: ItemImage[];
}

/** Related item with ID, URL, and name */
export interface RelatedItem {
	id: string;
	url: string;
	ja: string;
	en?: string;
}

/** Brand reference with ID, URL, and localized name */
export interface BrandRef {
	id: string;
	url: string;
	ja: string;
	en?: string;
}

/** Series reference with ID, URL, and localized name */
export interface SeriesRef {
	id: string;
	url: string;
	ja: string;
	en?: string;
}

/** Category reference with ID, URL, and localized name */
export interface CategoryRef {
	id: string;
	url: string;
	ja: string;
	en?: string;
}

/** Manual reference with ID and URL */
export interface ManualRef {
	id: string;
	url: string;
}

/** Global site URLs (checked for existence during scrape) */
export interface GlobalSiteUrls {
	/** English (USA) site URL if page exists */
	enUs?: string;
}

/** Normalized item matching data/lib/schemas.ts ItemSchema */
export interface Item {
	id: string;
	type: "item";
	name: { ja: string; en?: string };
	brands: BrandRef[];
	series: SeriesRef[];
	categories: CategoryRef[];
	relatedItems: RelatedItem[];
	manual?: ManualRef;
	scale?: string;
	price?: ItemPrice;
	releaseDate?: ItemReleaseDate;
	targetAge?: number;
	description?: LocalizedTextArray;
	accessories?: ParsedAccessoryItem[];
	contents?: ParsedAccessoryItem[];
	images?: ItemImages;
	globalSiteUrls?: GlobalSiteUrls;
	sourceUrl?: string;
	// Note: extractedAt and pageScrapedAt are stored in index.json, not individual item files
}

/** Entity data for upserting to data/src/{type}s/ */
export interface EntityData {
	id: string;
	type: "brand" | "series" | "category";
	name: { ja: string };
	url: string;
}

/** Parse result with item and entities to upsert */
export interface ParseResult {
	success: boolean;
	data?: Item;
	entities?: EntityData[];
	error?: string;
}

/** Check if URL is an instruction image */
function isInstructionImage(src: string): boolean {
	return /_inst_\d+\./.test(src) || /instruction/i.test(src);
}

export class BandaiCatalogParser {
	parse(html: string, id: string, sourceUrl: string): ParseResult {
		try {
			const $ = load(html);

			const name = this.extractName($);
			if (!name) {
				return { success: false, error: "Could not extract product name" };
			}

			// Extract raw entity data (with URLs)
			const brandsRaw = this.extractBrandsRaw($);
			const seriesRaw = this.extractSeriesRaw($);
			const categoriesRaw = this.extractCategoriesRaw($);
			const relatedRaw = this.extractRelatedProductsRaw($);
			const manualId = this.extractManualId($);

			// Build ref objects with id, url, ja
			const brands: BrandRef[] = brandsRaw
				.map(b => {
					const brandId = this.extractIdFromUrl(b.url, "brand");
					return brandId && b.url ? { id: brandId, url: b.url, ja: b.ja } : null;
				})
				.filter((b): b is BrandRef => b !== null);

			const series: SeriesRef[] = seriesRaw?.url
				? [{
					id: this.extractIdFromUrl(seriesRaw.url, "series"),
					url: seriesRaw.url,
					ja: seriesRaw.ja,
				}].filter(s => s.id)
				: [];

			const categories: CategoryRef[] = categoriesRaw
				.map(c => {
					const catId = this.extractIdFromUrl(c.url, "category");
					return catId && c.url ? { id: catId, url: c.url, ja: c.ja } : null;
				})
				.filter((c): c is CategoryRef => c !== null);

			const manual: ManualRef | undefined = manualId
				? { id: manualId, url: `https://manual.bandai-hobby.net/menus/detail/${manualId}` }
				: undefined;

			// Build normalized item
			const item: Item = {
				id,
				type: "item",
				name: { ja: name },
				brands,
				series,
				categories,
				relatedItems: relatedRaw,
				manual,
				scale: this.extractScale(name),
				price: this.extractPrice($),
				releaseDate: this.extractReleaseDate($),
				targetAge: this.extractTargetAge($),
				description: this.extractDescriptionNormalized($),
				accessories: this.extractAccessoriesNormalized($),
				contents: this.extractContentsNormalized($),
				images: this.extractImages($),
				sourceUrl,
				// Note: timing fields (extractedAt, pageScrapedAt) are stored in index.json
			};

			// Build entities for upsert
			const entities: EntityData[] = [];
			for (const brand of brandsRaw) {
				const brandId = this.extractIdFromUrl(brand.url, "brand");
				if (brandId && brand.url) {
					entities.push({ id: brandId, type: "brand", name: { ja: brand.ja }, url: brand.url });
				}
			}
			if (seriesRaw?.url) {
				const seriesId = this.extractIdFromUrl(seriesRaw.url, "series");
				if (seriesId) {
					entities.push({ id: seriesId, type: "series", name: { ja: seriesRaw.ja }, url: seriesRaw.url });
				}
			}
			for (const cat of categoriesRaw) {
				const catId = this.extractIdFromUrl(cat.url, "category");
				if (catId && cat.url) {
					entities.push({ id: catId, type: "category", name: { ja: cat.ja }, url: cat.url });
				}
			}

			return { success: true, data: item, entities };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Extract ID from Bandai URL
	 * Examples: /brand/hg/ -> "hg", /series/z-gundam/ -> "z-gundam"
	 */
	private extractIdFromUrl(url: string | undefined, type: "brand" | "series" | "category"): string {
		if (!url) return "";

		// Handle different URL patterns
		if (type === "brand") {
			const match = /\/brand\/([^/]+)\/?/.exec(url);
			return match?.[1] ?? "";
		}
		if (type === "series") {
			const match = /\/series\/([^/]+)\/?/.exec(url);
			return match?.[1] ?? "";
		}
		// Categories: /gunpla/, /characterplastic/, etc.
		const match = /\/([^/]+)\/?$/.exec(url);
		return match?.[1] ?? "";
	}

	private extractName($: CheerioAPI): string | undefined {
		return $("h1.p-heading__h1-product").first().text().trim() || undefined;
	}

	private extractPrice($: CheerioAPI): ItemPrice | undefined {
		const priceLabel = $('dt.pg-products__label:contains("価格")');
		const priceText = priceLabel.next(LABEL_VALUE_SELECTOR).text().trim();

		if (!priceText) return undefined;

		// Parse "1,650 円(税10%込)" format
		const amountMatch = /([0-9,]+)\s*円/.exec(priceText);
		const taxMatch = /税(\d+)%込/.exec(priceText);

		const amountStr = amountMatch?.[1];
		if (!amountStr) return undefined;

		const amount = Number.parseInt(amountStr.replaceAll(",", ""), 10);
		const taxStr = taxMatch?.[1];
		const taxRate = taxStr ? Number.parseInt(taxStr, 10) : 10;

		return {
			amount,
			currency: "JPY",
			taxIncluded: true,
			taxRate,
		};
	}

	private extractReleaseDate($: CheerioAPI): ItemReleaseDate | undefined {
		const dateLabel = $('dt.pg-products__label:contains("発売日")');
		const dateText = dateLabel.next(LABEL_VALUE_SELECTOR).text().trim();

		if (!dateText) return undefined;

		// Try full date format first: "2017年05月20日 (土)"
		const fullMatch = /(\d{4})年(\d{2})月(\d{2})日/.exec(dateText);
		if (fullMatch?.[1] && fullMatch[2] && fullMatch[3]) {
			return {
				ja: dateText,
				year: Number.parseInt(fullMatch[1], 10),
				month: Number.parseInt(fullMatch[2], 10),
				day: Number.parseInt(fullMatch[3], 10),
			};
		}

		// Try year+month format: "1985年06月" (for older items or future releases without specific day)
		const monthMatch = /(\d{4})年(\d{2})月/.exec(dateText);
		if (monthMatch?.[1] && monthMatch[2]) {
			return {
				ja: dateText,
				year: Number.parseInt(monthMatch[1], 10),
				month: Number.parseInt(monthMatch[2], 10),
			};
		}

		// Fallback for unparseable dates - preserve raw text
		return { ja: dateText, year: 0, month: 0 };
	}

	private extractTargetAge($: CheerioAPI): number | undefined {
		const ageLabel = $('dt.pg-products__label:contains("対象年齢")');
		const ageText = ageLabel.next(LABEL_VALUE_SELECTOR).text().trim();

		if (!ageText) return undefined;

		// Parse "8歳以上" format
		const match = /(\d+)歳/.exec(ageText);
		const ageStr = match?.[1];
		return ageStr ? Number.parseInt(ageStr, 10) : undefined;
	}

	private extractSeriesRaw($: CheerioAPI): { ja: string; url?: string } | undefined {
		// Series is in breadcrumbs - look for links to /series/
		const seriesLink = $('ul.p-breadcrumb a[href*="/series/"]').first();
		if (seriesLink.length === 0) return undefined;

		return {
			ja: seriesLink.text().trim(),
			url: seriesLink.attr("href"),
		};
	}

	private extractBrandsRaw($: CheerioAPI): Array<{ ja: string; url?: string }> {
		const brands: Array<{ ja: string; url?: string }> = [];

		// Brands are in breadcrumbs - look for links to /brand/
		$('ul.p-breadcrumb a[href*="/brand/"]').each((_, el) => {
			const $el = $(el);
			brands.push({
				ja: $el.text().trim(),
				url: $el.attr("href"),
			});
		});

		// Also check the card links section for brand logos
		$('.p-card__links a[href*="/brand/"] .p-card__flatTit').each((_, el) => {
			const text = $(el).text().trim();
			const url = $(el).closest("a").attr("href");
			if (text && !brands.some(b => b.ja === text)) {
				brands.push({ ja: text, url });
			}
		});

		return brands;
	}

	private extractCategoriesRaw($: CheerioAPI): Array<{ ja: string; url?: string }> {
		const categories: Array<{ ja: string; url?: string }> = [];

		// Categories are typically the second item in breadcrumbs (after TOP)
		// Look for gunpla, characterplastic, etc.
		$("ul.p-breadcrumb").first().find("a").each((i, el) => {
			if (i === 0) return; // Skip TOP link

			const $el = $(el);
			const href = $el.attr("href") ?? "";

			// Only include category-level links (not brand or series)
			if (!href.includes("/brand/") && !href.includes("/series/") && !href.includes("/item/")) {
				categories.push({
					ja: $el.text().trim(),
					url: href,
				});
			}
		});

		return categories;
	}

	private extractScale(name: string): string | undefined {
		// Extract scale from product name like "HGUC 1/144 バーザム"
		const match = /1\/(\d+)/.exec(name);
		const scaleNum = match?.[1];
		return scaleNum ? `1/${scaleNum}` : undefined;
	}

	/**
	 * Checks if text appears to be only Premium Bandai disclaimers.
	 * Disclaimers typically start with "プレミアムバンダイ" and contain only boilerplate text.
	 */
	private isOnlyDisclaimers(text: string): boolean {
		if (!text) return true;
		const lines = text.split("\n").filter(l => l.trim().length > 0);
		// If very few lines and starts with Premium Bandai text, it's just disclaimers
		if (lines.length <= 5) {
			const firstLine = lines[0]?.trim() ?? "";
			if (firstLine.includes("プレミアムバンダイ") || firstLine.includes("Premium Bandai")) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Gets the full product description text from either legacy or new format.
	 * Legacy: .pg-products__instructionTxt p (excluding attentiontxt disclaimers)
	 * New: .pg-products__article with PlaygroundEditorTheme paragraphs
	 *
	 * Priority: Returns the format with substantial content (not just disclaimers).
	 * If article has real content, use it. If article has only disclaimers, use legacy.
	 */
	private getFullDescriptionText($: CheerioAPI): string {
		// Get article text
		let articleText = "";
		const articleEl = $(DESCRIPTION_SELECTOR_ARTICLE);
		if (articleEl.length > 0) {
			const lines: string[] = [];
			articleEl.find("p").each((_, el) => {
				const text = $(el).text().trim();
				if (text) lines.push(text);
			});
			articleText = lines.join("\n");
		}

		// Get legacy text
		const legacyParagraphs = $(DESCRIPTION_SELECTOR_LEGACY).not(".pg-products__attentiontxt");
		const legacyText = legacyParagraphs.first().text().trim();

		// Decision logic:
		// 1. If article has substantial content (not just disclaimers), use it
		// 2. If article has only disclaimers but legacy has content, use legacy
		// 3. If both are empty or disclaimers, return whatever we have

		const articleIsDisclaimers = this.isOnlyDisclaimers(articleText);
		const legacyHasContent = legacyText.length > 0;

		if (articleText && !articleIsDisclaimers) {
			return articleText;
		}

		if (legacyHasContent) {
			return legacyText;
		}

		// Fallback: return article text even if it's just disclaimers
		return articleText;
	}

	/** Returns normalized description: { ja: string[] } */
	private extractDescriptionNormalized($: CheerioAPI): LocalizedTextArray | undefined {
		const text = this.getFullDescriptionText($);

		if (!text) return undefined;

		// Clean up the description - remove accessories/contents sections
		const parts = text.split(/【付属品】|【商品内容】/);
		const firstPart = parts[0] ?? "";
		const cleanText = firstPart.trim();

		if (!cleanText) return undefined;

		// Split by newline, normalize bullet markers (■ → • ), and return as normalized structure
		const lines = cleanText
			.split("\n")
			.map(line => line.trim().replace(/^■\s*/, "• "))
			.filter(line => line.length > 0);

		return lines.length > 0 ? { ja: lines } : undefined;
	}

	/** Extract raw accessory strings from HTML */
	private extractAccessoryStrings($: CheerioAPI): string[] {
		const descText = this.getFullDescriptionText($);
		const items: string[] = [];

		// Try formal section format: 【付属品】
		const accessoriesMatch = /【付属品】([\s\S]*?)(?:【商品内容】|$)/.exec(descText);
		const accessoriesText = accessoriesMatch?.[1];
		if (accessoriesText) {
			// Split on newlines or ■, keep items intact
			const extracted = accessoriesText
				.split(/\n|■/)
				.map(s => s.replace(/^■/, "").trim())
				.filter(s => s.length > 0);
			items.push(...extracted);
		}

		// Also try inline format: "付属武装：" (common in newer article format)
		if (items.length === 0) {
			const inlineMatch = /付属武装[：:]\s*(.+)/.exec(descText);
			if (inlineMatch?.[1]) {
				// Split on common separators: / or ／ or 、
				const extracted = inlineMatch[1]
					.split(/[/／、]/)
					.map(s => s.trim())
					.filter(s => s.length > 0);
				items.push(...extracted);
			}
		}

		return items;
	}

	/** Returns parsed accessories with counts extracted */
	private extractAccessoriesNormalized($: CheerioAPI): ParsedAccessoryItem[] | undefined {
		const rawStrings = this.extractAccessoryStrings($);
		if (rawStrings.length === 0) return undefined;

		// Parse each string to extract name, count, and unit
		const parsed = parseCountedItems(rawStrings);

		// Convert to ParsedAccessoryItem format (JA only at this stage)
		return parsed.map(item => ({
			name: { ja: item.name },
			...(item.count !== undefined && { count: item.count }),
			...(item.unit && { unit: { ja: item.unit } }),
		}));
	}

	/** Extract raw content strings from HTML */
	private extractContentStrings($: CheerioAPI): string[] {
		const descText = this.getFullDescriptionText($);
		const items: string[] = [];

		// Find text after 【商品内容】
		const contentsMatch = /【商品内容】([\s\S]*?)$/.exec(descText);
		const contentsText = contentsMatch?.[1];
		if (contentsText) {
			// Split on newlines or ■, keep items intact
			const extracted = contentsText
				.split(/\n|■/)
				.map(s => s.replace(/^■/, "").trim())
				.filter(s => s.length > 0);
			items.push(...extracted);
		}

		return items;
	}

	/** Returns parsed contents with counts extracted */
	private extractContentsNormalized($: CheerioAPI): ParsedAccessoryItem[] | undefined {
		const rawStrings = this.extractContentStrings($);
		if (rawStrings.length === 0) return undefined;

		// Parse each string to extract name, count, and unit
		const parsed = parseCountedItems(rawStrings);

		// Convert to ParsedAccessoryItem format (JA only at this stage)
		return parsed.map(item => ({
			name: { ja: item.name },
			...(item.count !== undefined && { count: item.count }),
			...(item.unit && { unit: { ja: item.unit } }),
		}));
	}

	private extractImages($: CheerioAPI): ItemImages {
		const product: ItemImage[] = [];
		const instructions: ItemImage[] = [];
		const seen = new Set<string>();

		// Product images from the slider
		$('.pg-products__sliderMain .swiper-slide a[data-fancybox="images"] img').each((_, el) => {
			const src = $(el).attr("src");
			if (src && !seen.has(src) && !src.includes("common/")) {
				seen.add(src);
				if (isInstructionImage(src)) {
					instructions.push({ src });
				} else {
					product.push({ src });
				}
			}
		});

		// Also check thumbnail images
		$(".pg-products__sliderThumbnail .swiper-slide img").each((_, el) => {
			const src = $(el).attr("src");
			if (src && !seen.has(src) && !src.includes("common/")) {
				seen.add(src);
				if (isInstructionImage(src)) {
					instructions.push({ src });
				} else {
					product.push({ src });
				}
			}
		});

		return { product, instructions };
	}

	/** Extract related products with ID, URL, and name */
	private extractRelatedProductsRaw($: CheerioAPI): RelatedItem[] {
		const related: RelatedItem[] = [];
		const seen = new Set<string>();

		// Related products are in p-card__wrap following h2:contains("関連商品")
		// Find the section containing "関連商品" and then its card links
		$('h2.p-heading__h2:contains("関連商品")').next(".p-card__wrap").find('a[href*="/item/"]').each((_, el) => {
			const $el = $(el);
			const href = $el.attr("href") ?? "";

			// Extract ID from URL like "/item/01_5468/"
			const idMatch = /\/item\/([^/]+)\/?/.exec(href);
			if (!idMatch) return;

			const id = idMatch[1];
			if (id && !seen.has(id)) {
				seen.add(id);
				// Build full URL
				const url = href.startsWith("http")
					? href
					: `https://bandai-hobby.net${href.startsWith("/") ? "" : "/"}${href}`;
				// Extract product name from card title or img alt
				const ja = $el.find(".p-card__tit").text().trim() || ($el.find("img").attr("alt") ?? "");
				related.push({ id, url, ja });
			}
		});

		return related;
	}

	/**
	 * Extract manual ID from links to manual.bandai-hobby.net/menus/detail/{id}
	 * These are direct 1:1 links between items and their assembly manuals.
	 * Returns canonical unpadded ID (e.g., "106" not "0106")
	 */
	private extractManualId($: CheerioAPI): string | undefined {
		// Pattern: manual.bandai-hobby.net/menus/detail/{id}
		const manualPattern = /manual\.bandai-hobby\.net\/menus\/detail\/(\d+)/;

		let manualId: string | undefined;

		$("a[href]").each((_, el) => {
			if (manualId) return; // 1:1 relationship - stop after first match

			const href = $(el).attr("href");
			if (href) {
				const match = manualPattern.exec(href);
				if (match?.[1]) {
					// Return canonical unpadded format (strip leading zeros)
					manualId = match[1].replace(/^0+/, "") || "0";
				}
			}
		});

		return manualId;
	}
}
