/**
 * P-Bandai Special/Campaign Page Parser using Cheerio
 * Extracts structured data from p-bandai.jp special pages
 *
 * Example URL: https://p-bandai.jp/hobby/special-1000011243
 *
 * Output paths:
 * - Data: data/src/pbandai/ja/specials/{id}.json
 * - Assets: assets/pbandai/ja/specials/{id}/
 */

import { load, type CheerioAPI } from "cheerio";

/** Parsed special page data */
export interface PBandaiSpecialData {
	/** Special page ID (e.g., "1000011243") */
	id: string;
	type: "pbandai-special";
	/** Japanese title */
	title: string;
	/** Linked P-Bandai item IDs */
	itemIds: string[];
	/** Promotional banner/content image URLs */
	images: string[];
	/** Original page URL */
	sourceUrl: string;
}

/** Parse result */
export interface PBandaiSpecialParseResult {
	success: boolean;
	data?: PBandaiSpecialData;
	error?: string;
}

export class PBandaiSpecialParser {
	/**
	 * Parse special page HTML
	 * @param html Raw HTML content
	 * @param id Special page ID (e.g., "1000011243")
	 * @param sourceUrl Full URL of the page
	 */
	parse(html: string, id: string, sourceUrl: string): PBandaiSpecialParseResult {
		try {
			const $ = load(html);

			const title = this.extractTitle($);
			if (!title) {
				return { success: false, error: "Could not extract special page title" };
			}

			const itemIds = this.extractItemIds($);
			const images = this.extractImages($);

			const data: PBandaiSpecialData = {
				id,
				type: "pbandai-special",
				title,
				itemIds,
				images,
				sourceUrl,
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
	 * Extract special page ID from URL
	 * @param url URL like "https://p-bandai.jp/hobby/special-1000011243"
	 */
	static extractIdFromUrl(url: string): string | null {
		const match = /special-(\d+)/.exec(url);
		return match ? match[1] : null;
	}

	/**
	 * Get the data file path for a P-Bandai special page
	 * @param id Special page ID (e.g., "1000011243")
	 * @param lang Language code (default: "ja")
	 */
	static getDataPath(id: string, lang = "ja"): string {
		return `data/src/pbandai/${lang}/specials/${id}.json`;
	}

	/**
	 * Get the assets directory path for a P-Bandai special page
	 * @param id Special page ID (e.g., "1000011243")
	 * @param lang Language code (default: "ja")
	 */
	static getAssetsDir(id: string, lang = "ja"): string {
		return `assets/pbandai/${lang}/specials/${id}`;
	}

	/**
	 * Build the P-Bandai special page URL
	 * @param id Special page ID (e.g., "1000011243")
	 */
	static buildUrl(id: string): string {
		return `https://p-bandai.jp/hobby/special-${id}`;
	}

	/**
	 * Extract title from page
	 * Looks for h2.subTitle element
	 */
	private extractTitle($: CheerioAPI): string | null {
		// Primary: h2.subTitle
		const subTitle = $("h2.subTitle").first().text().trim();
		if (subTitle) {
			return subTitle;
		}

		// Fallback: og:title meta tag
		const ogTitle = $('meta[property="og:title"]').attr("content");
		if (ogTitle) {
			// Remove suffix like "| プレミアムバンダイ"
			return ogTitle.split("|")[0].trim();
		}

		// Fallback: page title
		const pageTitle = $("title").text().trim();
		if (pageTitle) {
			// Remove common suffixes
			return pageTitle.split("｜")[0].trim();
		}

		return null;
	}

	/**
	 * Extract linked item IDs from image maps and links
	 * Looks for hrefs matching /item/item-{id}/
	 */
	private extractItemIds($: CheerioAPI): string[] {
		const itemIds = new Set<string>();

		// Extract from <area> tags in image maps
		$("area[href*='/item/item-']").each((_, el) => {
			const href = $(el).attr("href");
			const id = this.extractItemIdFromHref(href);
			if (id) {
				itemIds.add(id);
			}
		});

		// Extract from regular <a> links
		$("a[href*='/item/item-']").each((_, el) => {
			const href = $(el).attr("href");
			const id = this.extractItemIdFromHref(href);
			if (id) {
				itemIds.add(id);
			}
		});

		return [...itemIds];
	}

	/**
	 * Extract item ID from href
	 * @param href URL like "/item/item-1000148763/" or full URL
	 */
	private extractItemIdFromHref(href: string | undefined): string | null {
		if (!href) return null;
		const match = /item-(\d+)/.exec(href);
		return match ? match[1] : null;
	}

	/**
	 * Extract promotional/content images from the special page
	 * Looks for images in .maincontents area on bandai-a.akamaihd.net CDN
	 */
	private extractImages($: CheerioAPI): string[] {
		const images: string[] = [];
		const seen = new Set<string>();

		// Look for images in the main content area
		$(".maincontents img, .kaihatsu img").each((_, el) => {
			let src = $(el).attr("src");
			if (!src) return;

			// Normalize protocol-relative URLs
			if (src.startsWith("//")) {
				src = `https:${src}`;
			}

			// Only include images from Bandai CDN (promotional content)
			if (src.includes("bandai-a.akamaihd.net") && !seen.has(src)) {
				// Skip tiny placeholder/spacer images
				const width = Number.parseInt($(el).attr("width") ?? "0", 10);
				const height = Number.parseInt($(el).attr("height") ?? "0", 10);
				if (width > 100 || height > 100 || (!width && !height)) {
					seen.add(src);
					images.push(src);
				}
			}
		});

		return images;
	}
}
