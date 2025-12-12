/**
 * Bandai Catalog HTML Parser using Cheerio
 * Extracts structured product data from Bandai Hobby catalog pages
 */

import type {
	CatalogItem,
	CatalogPrice,
	CatalogReleaseDate,
	CatalogBrand,
	CatalogSeries,
	CatalogCategory,
	CatalogRelatedProduct,
} from "@hobby-ninja/types/catalog";
import { load, type CheerioAPI } from "cheerio";

// Constants for repeated selectors
const LABEL_VALUE_SELECTOR = "dd.pg-products__labelTxt";
// Legacy format: description in instructionTxt paragraph
const DESCRIPTION_SELECTOR_LEGACY = ".pg-products__instructionTxt p";
// New format: description in article with PlaygroundEditorTheme paragraphs
const DESCRIPTION_SELECTOR_ARTICLE = ".pg-products__article";

export interface ParseResult {
	success: boolean;
	data?: CatalogItem;
	error?: string;
}

export class BandaiCatalogParser {
	parse(html: string, id: string, sourceUrl: string): ParseResult {
		try {
			const $ = load(html);

			const name = this.extractName($);
			if (!name) {
				return { success: false, error: "Could not extract product name" };
			}

			const price = this.extractPrice($);
			const item: CatalogItem = {
				id,
				itemType: price ? "product" : "blog",
				name: { ja: name },
				price,
				releaseDate: this.extractReleaseDate($),
				targetAge: this.extractTargetAge($),
				series: this.extractSeries($),
				brands: this.extractBrands($),
				categories: this.extractCategories($),
				scale: this.extractScale(name),
				description: this.extractDescription($),
				accessories: this.extractAccessories($),
				contents: this.extractContents($),
				images: this.extractImages($),
				relatedProducts: this.extractRelatedProducts($),
				sourceUrl,
				extractedAt: new Date().toISOString(),
			};

			return { success: true, data: item };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	private extractName($: CheerioAPI): string | undefined {
		return $("h1.p-heading__h1-product").first().text().trim() || undefined;
	}

	private extractPrice($: CheerioAPI): CatalogPrice | undefined {
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

	private extractReleaseDate($: CheerioAPI): CatalogReleaseDate | undefined {
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

	private extractSeries($: CheerioAPI): CatalogSeries | undefined {
		// Series is in breadcrumbs - look for links to /series/
		const seriesLink = $('ul.p-breadcrumb a[href*="/series/"]').first();
		if (seriesLink.length === 0) return undefined;

		return {
			ja: seriesLink.text().trim(),
			url: seriesLink.attr("href"),
		};
	}

	private extractBrands($: CheerioAPI): CatalogBrand[] {
		const brands: CatalogBrand[] = [];

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

	private extractCategories($: CheerioAPI): CatalogCategory[] {
		const categories: CatalogCategory[] = [];

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
	 * Gets the full product description text from either legacy or new format.
	 * Legacy: .pg-products__instructionTxt p
	 * New: .pg-products__article with PlaygroundEditorTheme paragraphs
	 */
	private getFullDescriptionText($: CheerioAPI): string {
		// Try legacy format first
		const legacyText = $(DESCRIPTION_SELECTOR_LEGACY).first().text().trim();
		if (legacyText) return legacyText;

		// Try new article format - extract text from all paragraph spans
		const articleEl = $(DESCRIPTION_SELECTOR_ARTICLE);
		if (articleEl.length === 0) return "";

		// Get text from each paragraph, preserving line breaks
		const lines: string[] = [];
		articleEl.find("p").each((_, el) => {
			const text = $(el).text().trim();
			if (text) lines.push(text);
		});

		return lines.join("\n");
	}

	private extractDescription($: CheerioAPI): Array<{ ja: string }> {
		const text = this.getFullDescriptionText($);

		if (!text) return [];

		// Clean up the description - remove accessories/contents sections
		const parts = text.split(/【付属品】|【商品内容】/);
		const firstPart = parts[0] ?? "";
		const cleanText = firstPart.trim();

		if (!cleanText) return [];

		// Split by newline and return as array of localized strings
		return cleanText
			.split("\n")
			.map(line => line.trim())
			.filter(line => line.length > 0)
			.map(line => ({ ja: line }));
	}

	private extractAccessories($: CheerioAPI): Array<{ ja: string }> {
		const accessories: Array<{ ja: string }> = [];
		const descText = this.getFullDescriptionText($);

		// Find text between 【付属品】 and 【商品内容】 or end
		const accessoriesMatch = /【付属品】([\s\S]*?)(?:【商品内容】|$)/.exec(descText);
		const accessoriesText = accessoriesMatch?.[1];
		if (accessoriesText) {
			// Split on newlines or ■, keep items intact
			const items = accessoriesText
				.split(/\n|■/)
				.map(s => s.replace(/^■/, "").trim())
				.filter(s => s.length > 0);

			for (const item of items) {
				accessories.push({ ja: item });
			}
		}

		return accessories;
	}

	private extractContents($: CheerioAPI): Array<{ ja: string }> {
		const contents: Array<{ ja: string }> = [];
		const descText = this.getFullDescriptionText($);

		// Find text after 【商品内容】
		const contentsMatch = /【商品内容】([\s\S]*?)$/.exec(descText);
		const contentsText = contentsMatch?.[1];
		if (contentsText) {
			// Split on newlines or ■, keep items intact
			const items = contentsText
				.split(/\n|■/)
				.map(s => s.replace(/^■/, "").trim())
				.filter(s => s.length > 0);

			for (const item of items) {
				contents.push({ ja: item });
			}
		}

		return contents;
	}

	private extractImages($: CheerioAPI): string[] {
		const images: string[] = [];
		const seen = new Set<string>();

		// Product images from the slider
		$('.pg-products__sliderMain .swiper-slide a[data-fancybox="images"] img').each((_, el) => {
			const src = $(el).attr("src");
			if (src && !seen.has(src) && !src.includes("common/")) {
				seen.add(src);
				images.push(src);
			}
		});

		// Also check thumbnail images
		$(".pg-products__sliderThumbnail .swiper-slide img").each((_, el) => {
			const src = $(el).attr("src");
			if (src && !seen.has(src) && !src.includes("common/")) {
				seen.add(src);
				images.push(src);
			}
		});

		return images;
	}

	private extractRelatedProducts($: CheerioAPI): CatalogRelatedProduct[] {
		const related: CatalogRelatedProduct[] = [];

		// Related products are in p-card__wrap following h2:contains("関連商品")
		// Find the section containing "関連商品" and then its card links
		$('h2.p-heading__h2:contains("関連商品")').next(".p-card__wrap").find('a[href*="/item/"]').each((_, el) => {
			const $el = $(el);
			const href = $el.attr("href") ?? "";

			// Extract ID from URL like "/item/01_5468/"
			const idMatch = /\/item\/([^/]+)\/?/.exec(href);
			if (!idMatch) return;

			const id = idMatch[1];
			if (!id) return;
			const name = $el.find(".p-card__tit").text().trim();
			const imageUrl = $el.find(".p-card__img img").attr("src");

			if (name) {
				related.push({
					id,
					name: { ja: name },
					url: href,
					imageUrl,
				});
			}
		});

		return related;
	}
}
