/**
 * Bandai Catalog HTML Parser using Cheerio
 * Extracts structured product data from Bandai Hobby catalog pages
 */

import * as cheerio from 'cheerio';
import type {
	CatalogItem,
	CatalogPrice,
	CatalogReleaseDate,
	CatalogBrand,
	CatalogSeries,
	CatalogCategory,
	CatalogRelatedProduct
} from '@unnamed-gunpla-app/types';

export interface ParseResult {
	success: boolean;
	data?: CatalogItem;
	error?: string;
}

export class BandaiCatalogParser {
	parse(html: string, id: string, sourceUrl: string): ParseResult {
		try {
			const $ = cheerio.load(html);

			const name = this.extractName($);
			if (!name) {
				return { success: false, error: 'Could not extract product name' };
			}

			const item: CatalogItem = {
				id,
				name: { ja: name },
				price: this.extractPrice($),
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
				extractedAt: new Date().toISOString()
			};

			return { success: true, data: item };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	private extractName($: cheerio.CheerioAPI): string | undefined {
		return $('h1.p-heading__h1-product').first().text().trim() || undefined;
	}

	private extractPrice($: cheerio.CheerioAPI): CatalogPrice | undefined {
		const priceLabel = $('dt.pg-products__label:contains("価格")');
		const priceText = priceLabel.next('dd.pg-products__labelTxt').text().trim();

		if (!priceText) return undefined;

		// Parse "1,650 円(税10%込)" format
		const amountMatch = priceText.match(/([0-9,]+)\s*円/);
		const taxMatch = priceText.match(/税(\d+)%込/);

		if (!amountMatch) return undefined;

		const amount = parseInt(amountMatch[1].replace(/,/g, ''), 10);
		const taxRate = taxMatch ? parseInt(taxMatch[1], 10) : 10;

		return {
			amount,
			currency: 'JPY',
			taxIncluded: true,
			taxRate
		};
	}

	private extractReleaseDate($: cheerio.CheerioAPI): CatalogReleaseDate | undefined {
		const dateLabel = $('dt.pg-products__label:contains("発売日")');
		const dateText = dateLabel.next('dd.pg-products__labelTxt').text().trim();

		if (!dateText) return undefined;

		// Parse "2017年05月20日 (土)" format
		const match = dateText.match(/(\d{4})年(\d{2})月(\d{2})日/);
		if (!match) {
			return { ja: dateText, year: 0, month: 0 };
		}

		return {
			ja: dateText,
			year: parseInt(match[1], 10),
			month: parseInt(match[2], 10),
			day: parseInt(match[3], 10)
		};
	}

	private extractTargetAge($: cheerio.CheerioAPI): number | undefined {
		const ageLabel = $('dt.pg-products__label:contains("対象年齢")');
		const ageText = ageLabel.next('dd.pg-products__labelTxt').text().trim();

		if (!ageText) return undefined;

		// Parse "8歳以上" format
		const match = ageText.match(/(\d+)歳/);
		return match ? parseInt(match[1], 10) : undefined;
	}

	private extractSeries($: cheerio.CheerioAPI): CatalogSeries | undefined {
		// Series is in breadcrumbs - look for links to /series/
		const seriesLink = $('ul.p-breadcrumb a[href*="/series/"]').first();
		if (seriesLink.length === 0) return undefined;

		return {
			ja: seriesLink.text().trim(),
			url: seriesLink.attr('href')
		};
	}

	private extractBrands($: cheerio.CheerioAPI): CatalogBrand[] {
		const brands: CatalogBrand[] = [];

		// Brands are in breadcrumbs - look for links to /brand/
		$('ul.p-breadcrumb a[href*="/brand/"]').each((_, el) => {
			const $el = $(el);
			brands.push({
				ja: $el.text().trim(),
				url: $el.attr('href')
			});
		});

		// Also check the card links section for brand logos
		$('.p-card__links a[href*="/brand/"] .p-card__flatTit').each((_, el) => {
			const text = $(el).text().trim();
			const url = $(el).closest('a').attr('href');
			if (text && !brands.some(b => b.ja === text)) {
				brands.push({ ja: text, url });
			}
		});

		return brands;
	}

	private extractCategories($: cheerio.CheerioAPI): CatalogCategory[] {
		const categories: CatalogCategory[] = [];

		// Categories are typically the second item in breadcrumbs (after TOP)
		// Look for gunpla, characterplastic, etc.
		$('ul.p-breadcrumb').first().find('a').each((i, el) => {
			if (i === 0) return; // Skip TOP link

			const $el = $(el);
			const href = $el.attr('href') || '';

			// Only include category-level links (not brand or series)
			if (!href.includes('/brand/') && !href.includes('/series/') && !href.includes('/item/')) {
				categories.push({
					ja: $el.text().trim(),
					url: href
				});
			}
		});

		return categories;
	}

	private extractScale(name: string): string | undefined {
		// Extract scale from product name like "HGUC 1/144 バーザム"
		const match = name.match(/1\/(\d+)/);
		return match ? `1/${match[1]}` : undefined;
	}

	private extractDescription($: cheerio.CheerioAPI): { ja: string } | undefined {
		const descriptionEl = $('.pg-products__instructionTxt p').first();
		const text = descriptionEl.text().trim();

		if (!text) return undefined;

		// Clean up the description - remove accessories/contents sections
		const cleanText = text
			.split(/【付属品】|【商品内容】/)[0]
			.trim();

		return cleanText ? { ja: cleanText } : undefined;
	}

	private extractAccessories($: cheerio.CheerioAPI): Array<{ ja: string }> {
		const accessories: Array<{ ja: string }> = [];
		const descText = $('.pg-products__instructionTxt p').text();

		// Find text between 【付属品】 and 【商品内容】 or end
		const accessoriesMatch = descText.match(/【付属品】([\s\S]*?)(?:【商品内容】|$)/);
		if (accessoriesMatch) {
			// Split on newlines or ■ at start of line, keep items intact
			const items = accessoriesMatch[1]
				.split(/\n■|^■/m)
				.map(s => s.replace(/^■/, '').trim())
				.filter(s => s.length > 0);

			items.forEach(item => accessories.push({ ja: item }));
		}

		return accessories;
	}

	private extractContents($: cheerio.CheerioAPI): Array<{ ja: string }> {
		const contents: Array<{ ja: string }> = [];
		const descText = $('.pg-products__instructionTxt p').text();

		// Find text after 【商品内容】
		const contentsMatch = descText.match(/【商品内容】([\s\S]*?)$/);
		if (contentsMatch) {
			// Split on newlines or ■ at start of line, keep items intact
			const items = contentsMatch[1]
				.split(/\n■|^■/m)
				.map(s => s.replace(/^■/, '').trim())
				.filter(s => s.length > 0);

			items.forEach(item => contents.push({ ja: item }));
		}

		return contents;
	}

	private extractImages($: cheerio.CheerioAPI): string[] {
		const images: string[] = [];
		const seen = new Set<string>();

		// Product images from the slider
		$('.pg-products__sliderMain .swiper-slide a[data-fancybox="images"] img').each((_, el) => {
			const src = $(el).attr('src');
			if (src && !seen.has(src) && !src.includes('common/')) {
				seen.add(src);
				images.push(src);
			}
		});

		// Also check thumbnail images
		$('.pg-products__sliderThumbnail .swiper-slide img').each((_, el) => {
			const src = $(el).attr('src');
			if (src && !seen.has(src) && !src.includes('common/')) {
				seen.add(src);
				images.push(src);
			}
		});

		return images;
	}

	private extractRelatedProducts($: cheerio.CheerioAPI): CatalogRelatedProduct[] {
		const related: CatalogRelatedProduct[] = [];

		// Related products are in p-card__wrap following h2:contains("関連商品")
		// Find the section containing "関連商品" and then its card links
		$('h2.p-heading__h2:contains("関連商品")').next('.p-card__wrap').find('a[href*="/item/"]').each((_, el) => {
			const $el = $(el);
			const href = $el.attr('href') || '';

			// Extract ID from URL like "/item/01_5468/"
			const idMatch = href.match(/\/item\/([^/]+)\/?/);
			if (!idMatch) return;

			const id = idMatch[1];
			const name = $el.find('.p-card__tit').text().trim();
			const imageUrl = $el.find('.p-card__img img').attr('src');

			if (name) {
				related.push({
					id,
					name: { ja: name },
					url: href,
					imageUrl
				});
			}
		});

		return related;
	}
}
