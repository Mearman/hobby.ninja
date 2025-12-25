/**
 * P-Bandai Item Page Parser using Cheerio
 * Extracts structured data from p-bandai.jp item pages
 *
 * Example URL: https://p-bandai.jp/item/item-1000148763/
 *
 * Data is extracted from multiple sources:
 * 1. JSON-LD Schema - structured product data
 * 2. Meta tags - GTIN/JAN code
 * 3. JavaScript dataLayer - series, brand, genre
 * 4. Spec table - dates, shop info
 * 5. Image gallery - product images
 *
 * Output paths:
 * - Data: data/src/pbandai/ja/items/{id}.json
 * - Assets: assets/pbandai/ja/items/{id}/
 */

import { load, type CheerioAPI } from "cheerio";

/** Localized text */
interface LocalizedText {
	ja: string;
	en?: string;
}

/** Parsed item data */
export interface PBandaiItemData {
	/** P-Bandai item ID (e.g., "1000148763") */
	id: string;
	type: "pbandai-item";
	/** Product name */
	name: LocalizedText;
	/** Internal product code */
	productCode?: string;
	/** JAN/EAN barcode */
	gtin?: string;
	/** Price in JPY */
	price?: number;
	/** Brand name */
	brand?: LocalizedText;
	/** Series name */
	series?: LocalizedText;
	/** Product genres (e.g., ["フィギュア", "プラモデル"]) */
	genres?: string[];
	/** Franchise (e.g., "ガンダムシリーズ") */
	franchise?: string;
	/** Availability status */
	availability?: "InStock" | "OutOfStock" | "Discontinued" | "PreOrder";
	/** Description */
	description?: string;
	/** Reservation end date */
	reservationEndDate?: string;
	/** Shipping date */
	shippingDate?: string;
	/** Shop name */
	shopName?: string;
	/** Product image URLs */
	images: string[];
	/** Original page URL */
	sourceUrl: string;
	/** Special page ID if discovered via special page */
	specialPageId?: string;
	/** Special page IDs linked from item page */
	linkedSpecialPageIds?: string[];
}

/** Parse result */
export interface PBandaiItemParseResult {
	success: boolean;
	data?: PBandaiItemData;
	error?: string;
}

/** JSON-LD Product schema */
interface JsonLdProduct {
	"@type": "Product";
	name?: string;
	image?: string;
	description?: string;
	brand?: {
		"@type": "Brand";
		name?: string;
	};
	offers?: {
		"@type": "Offer";
		price?: string | number;
		priceCurrency?: string;
		availability?: string;
	};
}

/** Type guard for JSON-LD Product objects */
function isJsonLdProduct(value: unknown): value is JsonLdProduct {
	return (
		typeof value === "object" &&
		value !== null &&
		"@type" in value &&
		(value as Record<string, unknown>)["@type"] === "Product"
	);
}

export class PBandaiItemParser {
	/**
	 * Parse item page HTML
	 * @param html Raw HTML content
	 * @param id Item ID (e.g., "1000148763")
	 * @param sourceUrl Full URL of the page
	 */
	parse(html: string, id: string, sourceUrl: string): PBandaiItemParseResult {
		try {
			const $ = load(html);

			// Extract from JSON-LD first (most structured)
			const jsonLd = this.extractJsonLd($);

			// Extract name - required field
			const name = this.extractName($, jsonLd);
			if (!name) {
				return { success: false, error: "Could not extract item name" };
			}

			// Extract dataLayer info
			const dataLayer = this.extractDataLayer(html);

			// Build item data
			const data: PBandaiItemData = {
				id,
				type: "pbandai-item",
				name: { ja: name },
				productCode: dataLayer?.productCode,
				gtin: this.extractGtin($),
				price: this.extractPrice(jsonLd, dataLayer),
				brand: this.extractBrand(jsonLd, dataLayer),
				series: this.extractSeries(dataLayer),
				genres: this.extractGenres(dataLayer),
				franchise: dataLayer?.franchise,
				availability: this.extractAvailability(jsonLd),
				description: jsonLd?.description,
				...this.extractSpecTable($),
				images: this.extractImages($, html, id),
				sourceUrl,
				linkedSpecialPageIds: this.extractLinkedSpecialPages($),
			};

			return { success: true, data };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Extract item ID from URL
	 * @param url URL like "https://p-bandai.jp/item/item-1000148763/"
	 */
	static extractIdFromUrl(url: string): string | null {
		const match = /item-(\d+)/.exec(url);
		return match ? match[1] : null;
	}

	/**
	 * Get the data file path for a P-Bandai item
	 * @param id Item ID (e.g., "1000148763")
	 * @param lang Language code (default: "ja")
	 */
	static getDataPath(id: string, lang = "ja"): string {
		return `data/src/pbandai/${lang}/items/${id}.json`;
	}

	/**
	 * Get the assets directory path for a P-Bandai item
	 * @param id Item ID (e.g., "1000148763")
	 * @param lang Language code (default: "ja")
	 */
	static getAssetsDir(id: string, lang = "ja"): string {
		return `assets/pbandai/${lang}/items/${id}`;
	}

	/**
	 * Build the P-Bandai item page URL
	 * @param id Item ID (e.g., "1000148763")
	 */
	static buildUrl(id: string): string {
		return `https://p-bandai.jp/item/item-${id}/`;
	}

	/**
	 * Extract JSON-LD Product data from script tags
	 */
	private extractJsonLd($: CheerioAPI): JsonLdProduct | null {
		let product: JsonLdProduct | null = null;

		$('script[type="application/ld+json"]').each((_, el) => {
			try {
				const content = $(el).html();
				if (!content) return;

				const parsed = JSON.parse(content) as unknown;

				// Handle array format
				if (Array.isArray(parsed)) {
					for (const item of parsed) {
						if (isJsonLdProduct(item)) {
							product = item;
							break;
						}
					}
				}
				// Handle single object
				else if (isJsonLdProduct(parsed)) {
					product = parsed;
				}
			} catch {
				// Skip invalid JSON
			}
		});

		return product;
	}

	/**
	 * Extract dataLayer information from inline script
	 */
	private extractDataLayer(html: string): {
		productCode?: string;
		series?: string;
		franchise?: string;
		genre?: string;
		brand?: string;
		price?: number;
	} | null {
		// Look for dataLayer.push with view_item event
		const match = /dataLayer\.push\(\{[\s\S]*?event:\s*['"]view_item['"][\s\S]*?\}\);/.exec(html);
		if (!match) return null;

		const result: {
			productCode?: string;
			series?: string;
			franchise?: string;
			genre?: string;
			brand?: string;
			price?: number;
		} = {};

		// Extract individual fields
		const productCodeMatch = /item_product_code:\s*['"]([^'"]+)['"]/.exec(match[0]);
		if (productCodeMatch) result.productCode = productCodeMatch[1];

		const seriesMatch = /item_series:\s*['"]([^'"]+)['"]/.exec(match[0]);
		if (seriesMatch) result.series = seriesMatch[1];

		const franchiseMatch = /item_franchise:\s*['"]([^'"]+)['"]/.exec(match[0]);
		if (franchiseMatch) result.franchise = franchiseMatch[1];

		const genreMatch = /item_genre:\s*['"]([^'"]+)['"]/.exec(match[0]);
		if (genreMatch) result.genre = genreMatch[1];

		const brandMatch = /item_brand:\s*['"]([^'"]+)['"]/.exec(match[0]);
		if (brandMatch) result.brand = brandMatch[1];

		const priceMatch = /price:\s*['"]?(\d+)['"]?/.exec(match[0]);
		if (priceMatch) result.price = Number.parseInt(priceMatch[1], 10);

		return result;
	}

	/**
	 * Extract product name
	 */
	private extractName($: CheerioAPI, jsonLd: JsonLdProduct | null): string | null {
		// Primary: JSON-LD name (clean it up)
		if (jsonLd?.name) {
			// Remove batch info like【４次：２０２０年１０月発送】
			return jsonLd.name.replaceAll(/【[^】]+】/g, "").trim();
		}

		// Fallback: og:title
		const ogTitle = $('meta[property="og:title"]').attr("content");
		if (ogTitle) {
			return ogTitle.split("|")[0].replaceAll(/【[^】]+】/g, "").trim();
		}

		return null;
	}

	/**
	 * Extract GTIN/JAN code from meta tag
	 */
	private extractGtin($: CheerioAPI): string | undefined {
		const gtin = $('meta[name="gtin_code"]').attr("content");
		return gtin ?? undefined;
	}

	/**
	 * Extract price
	 */
	private extractPrice(
		jsonLd: JsonLdProduct | null,
		dataLayer: { price?: number } | null,
	): number | undefined {
		// Prefer JSON-LD
		if (jsonLd?.offers?.price) {
			const price =
				typeof jsonLd.offers.price === "string"
					? Number.parseInt(jsonLd.offers.price, 10)
					: jsonLd.offers.price;
			if (!Number.isNaN(price)) return price;
		}

		// Fallback to dataLayer
		return dataLayer?.price;
	}

	/**
	 * Extract brand
	 */
	private extractBrand(
		jsonLd: JsonLdProduct | null,
		dataLayer: { brand?: string } | null,
	): LocalizedText | undefined {
		// JSON-LD brand (may contain multiple comma-separated)
		if (jsonLd?.brand?.name) {
			return { ja: jsonLd.brand.name };
		}

		// dataLayer brand
		if (dataLayer?.brand) {
			return { ja: dataLayer.brand };
		}

		return undefined;
	}

	/**
	 * Extract series from dataLayer
	 */
	private extractSeries(dataLayer: { series?: string } | null): LocalizedText | undefined {
		if (!dataLayer?.series) return undefined;

		// Series may be comma-separated like "ガンダムシリーズ,機動戦士ガンダム００ [ダブルオー]"
		// Return the most specific (last) one
		const parts = dataLayer.series.split(",");
		const series = parts.at(-1).trim();

		return { ja: series };
	}

	/**
	 * Extract genres from dataLayer
	 */
	private extractGenres(dataLayer: { genre?: string } | null): string[] | undefined {
		if (!dataLayer?.genre) return undefined;

		// Genre is comma-separated like "フィギュア,プラモデル"
		return dataLayer.genre.split(",").map((g) => g.trim());
	}

	/**
	 * Extract availability status
	 */
	private extractAvailability(
		jsonLd: JsonLdProduct | null,
	): PBandaiItemData["availability"] | undefined {
		const availability = jsonLd?.offers?.availability;
		if (!availability) return undefined;

		if (availability.includes("InStock")) return "InStock";
		if (availability.includes("OutOfStock")) return "OutOfStock";
		if (availability.includes("Discontinued")) return "Discontinued";
		if (availability.includes("PreOrder")) return "PreOrder";

		return undefined;
	}

	/**
	 * Extract spec table data
	 */
	private extractSpecTable($: CheerioAPI): {
		reservationEndDate?: string;
		shippingDate?: string;
		shopName?: string;
	} {
		const result: {
			reservationEndDate?: string;
			shippingDate?: string;
			shopName?: string;
		} = {};

		$(".pb24-item-main__spec tr").each((_, row) => {
			const th = $(row).find("th").text().trim();
			const td = $(row).find("td").text().trim();

			if (th === "予約受付終了" && td) {
				result.reservationEndDate = td;
			} else if (th === "発送日" && td) {
				result.shippingDate = td;
			} else if (th === "ショップ名" && td) {
				result.shopName = td;
			}
		});

		return result;
	}

	/**
	 * Extract product images
	 */
	private extractImages($: CheerioAPI, html: string, id: string): string[] {
		const images: string[] = [];
		const seen = new Set<string>();

		// Method 1: Extract from inline JavaScript (model_image1, model_image2, etc.)
		const imageRegex = /model_image\d+["']?\s*:\s*["']([^"']+)["']/g;
		let match;
		while ((match = imageRegex.exec(html)) !== null) {
			const url = match[1];
			if (!seen.has(url) && url.includes("img/model")) {
				seen.add(url);
				images.push(url);
			}
		}

		// Method 2: If no images found, try extracting from 0000000000_img pattern
		if (images.length === 0) {
			const altRegex = /0000000000_img\d*["']?\s*:\s*["']([^"']+)["']/g;
			while ((match = altRegex.exec(html)) !== null) {
				const url = match[1];
				if (!seen.has(url) && url.includes("img/model")) {
					seen.add(url);
					images.push(url);
				}
			}
		}

		// Method 3: Fallback to og:image if no gallery images found
		if (images.length === 0) {
			const ogImage = $('meta[property="og:image"]').attr("content");
			if (ogImage?.includes("img/model")) {
				images.push(ogImage);
			}
		}

		// Method 4: Construct default image URL if nothing found
		if (images.length === 0) {
			images.push(`https://bandai-a.akamaihd.net/bc/img/model/b/${id}_1.jpg`);
		}

		return images;
	}

	/**
	 * Extract linked special page IDs from item page
	 * Looks for links to /hobby/special-{id}/ or similar patterns
	 */
	private extractLinkedSpecialPages($: CheerioAPI): string[] | undefined {
		const specialIds = new Set<string>();

		// Look for links to special pages
		$('a[href*="/special-"]').each((_, el) => {
			const href = $(el).attr("href");
			if (href) {
				const match = /special-(\d+)/.exec(href);
				if (match) {
					specialIds.add(match[1]);
				}
			}
		});

		return specialIds.size > 0 ? [...specialIds] : undefined;
	}
}
