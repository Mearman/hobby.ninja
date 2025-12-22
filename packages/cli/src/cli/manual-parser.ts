/**
 * Manual Page Parser using Cheerio
 * Extracts structured data from manual.bandai-hobby.net pages
 */

import { load, type CheerioAPI } from "cheerio";

/** Localized text */
interface LocalizedText {
	ja: string;
	en?: string;
}

/** PDF document reference */
export interface ManualPdf {
	url: string;
	name: LocalizedText;
	/** Local path after download */
	path?: string;
}

/** Release date with parsed components */
interface ManualReleaseDate {
	ja: string;
	year: number;
	month: number;
	day?: number;
}

/** Parsed manual data */
export interface ManualData {
	id: string;
	type: "manual";
	name: LocalizedText;
	productNumber?: string;
	releaseDate?: ManualReleaseDate;
	productImage?: string;
	thumbnailImage?: string;
	scale?: string;
	brandIds: string[];
	seriesIds: string[];
	pdfs: ManualPdf[];
	sourceUrl: string;
	extractedAt: string;
}

/** Parse result */
export interface ManualParseResult {
	success: boolean;
	data?: ManualData;
	error?: string;
}

export class ManualParser {
	/**
	 * Parse manual page HTML
	 * @param html Raw HTML content
	 * @param id Manual ID (e.g., "652")
	 * @param sourceUrl Full URL of the page
	 */
	parse(html: string, id: string, sourceUrl: string): ManualParseResult {
		try {
			const $ = load(html);

			const name = this.extractName($);
			if (!name) {
				return { success: false, error: "Could not extract manual name" };
			}

			const pdfs = this.extractPdfs(html);

			const manual: ManualData = {
				id,
				type: "manual",
				name: { ja: name },
				productNumber: this.extractProductNumber($),
				releaseDate: this.extractReleaseDate($),
				productImage: this.extractProductImage($),
				thumbnailImage: this.extractThumbnailImage($),
				scale: this.extractScale(name),
				brandIds: this.extractBrandIds($, name),
				seriesIds: this.extractSeriesIds($),
				pdfs,
				sourceUrl,
				extractedAt: new Date().toISOString(),
			};

			return { success: true, data: manual };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Extract manual/product name from page title
	 */
	private extractName($: CheerioAPI): string | undefined {
		// Try h1 first
		const h1 = $("h1").first().text().trim();
		if (h1) return h1;

		// Try page title, strip common suffixes
		const title = $("title").text().trim();
		if (title) {
			// Remove "| BANDAI HOBBY SITE" suffix
			return title.replace(/\s*\|\s*BANDAI HOBBY SITE.*$/i, "").trim();
		}

		return undefined;
	}

	/**
	 * Extract product number (JAN code or product ID)
	 */
	private extractProductNumber($: CheerioAPI): string | undefined {
		// Look for product number in structured data or metadata
		const productNum = $('meta[name="product-number"]').attr("content");
		if (productNum) return productNum;

		// Try to find in page content - pattern like "商品番号: 1114204"
		const bodyText = $("body").text();
		const match = /(?:商品番号|品番)[：:]\s*(\d+)/i.exec(bodyText);
		return match?.[1];
	}

	/**
	 * Extract release date
	 */
	private extractReleaseDate($: CheerioAPI): ManualReleaseDate | undefined {
		const bodyText = $("body").text();

		// Pattern: 発売日 2002年11月16日 or similar
		const dateMatch = /(?:発売日|発売)[：:]?\s*(\d{4})年(\d{1,2})月(\d{1,2})日/i.exec(bodyText);
		if (dateMatch?.[1] && dateMatch[2] && dateMatch[3]) {
			return {
				ja: `${dateMatch[1]}年${dateMatch[2]}月${dateMatch[3]}日`,
				year: Number.parseInt(dateMatch[1], 10),
				month: Number.parseInt(dateMatch[2], 10),
				day: Number.parseInt(dateMatch[3], 10),
			};
		}

		// Try year/month only
		const monthMatch = /(?:発売日|発売)[：:]?\s*(\d{4})年(\d{1,2})月/i.exec(bodyText);
		if (monthMatch?.[1] && monthMatch[2]) {
			return {
				ja: `${monthMatch[1]}年${monthMatch[2]}月`,
				year: Number.parseInt(monthMatch[1], 10),
				month: Number.parseInt(monthMatch[2], 10),
			};
		}

		return undefined;
	}

	/**
	 * Extract product image URL
	 */
	private extractProductImage($: CheerioAPI): string | undefined {
		// Look for main product image
		const img = $(".product-image img, .main-image img, .p-mainimg img").first();
		const src = img.attr("src") ?? img.attr("data-src");

		if (src) {
			return src.startsWith("http") ? src : `https://manual.bandai-hobby.net${src}`;
		}

		// Try OG image
		const ogImage = $('meta[property="og:image"]').attr("content");
		return ogImage;
	}

	/**
	 * Extract thumbnail image URL
	 */
	private extractThumbnailImage($: CheerioAPI): string | undefined {
		// Usually same as product image or a smaller version
		return this.extractProductImage($);
	}

	/**
	 * Extract scale from name (e.g., "1/144", "1/100")
	 */
	private extractScale(name: string): string | undefined {
		const match = /1\/(\d+)/.exec(name);
		return match?.[1] ? `1/${match[1]}` : undefined;
	}

	/**
	 * Extract brand IDs from name or page content
	 */
	private extractBrandIds($: CheerioAPI, name: string): string[] {
		const brands: string[] = [];
		const nameUpper = name.toUpperCase();

		// Check for common brand patterns in name
		const brandPatterns: Array<{ pattern: RegExp; id: string }> = [
			{ pattern: /\bHG\b|HIGH GRADE/i, id: "hg" },
			{ pattern: /\bMG\b|MASTER GRADE/i, id: "mg" },
			{ pattern: /\bPG\b|PERFECT GRADE/i, id: "pg" },
			{ pattern: /\bRG\b|REAL GRADE/i, id: "rg" },
			{ pattern: /\bSD\b|SUPER DEFORMED/i, id: "sd" },
			{ pattern: /\bRE\/100\b/i, id: "re100" },
			{ pattern: /\bHGUC\b/i, id: "hguc" },
			{ pattern: /\bHGCE\b/i, id: "hgce" },
			{ pattern: /\bHGAC\b/i, id: "hgac" },
			{ pattern: /\bHGFC\b/i, id: "hgfc" },
			{ pattern: /\bHGAW\b/i, id: "hgaw" },
			{ pattern: /\bHGIBO\b/i, id: "hgibo" },
			{ pattern: /\bHGBF\b/i, id: "hgbf" },
			{ pattern: /\bHGBD\b/i, id: "hgbd" },
			{ pattern: /\bFG\b|FIRST GRADE/i, id: "fg" },
			{ pattern: /\bEG\b|ENTRY GRADE/i, id: "eg" },
			{ pattern: /\bBB戦士\b/i, id: "bb" },
		];

		for (const { pattern, id } of brandPatterns) {
			if (pattern.test(nameUpper) || pattern.test(name)) {
				brands.push(id);
			}
		}

		// Also check breadcrumbs for brand links
		$('a[href*="/brand/"]').each((_, el) => {
			const href = $(el).attr("href") ?? "";
			const match = /\/brand\/([^/]+)\/?/.exec(href);
			if (match?.[1] && !brands.includes(match[1])) {
				brands.push(match[1]);
			}
		});

		return brands;
	}

	/**
	 * Extract series IDs from page content
	 */
	private extractSeriesIds($: CheerioAPI): string[] {
		const series: string[] = [];

		// Check breadcrumbs for series links
		$('a[href*="/series/"]').each((_, el) => {
			const href = $(el).attr("href") ?? "";
			const match = /\/series\/([^/]+)\/?/.exec(href);
			if (match?.[1] && !series.includes(match[1])) {
				series.push(match[1]);
			}
		});

		return series;
	}

	/**
	 * Extract PDFs from raw HTML content
	 * Parses the HTML to find PDF links and their labels
	 *
	 * Pattern in HTML:
	 * <a data-src="/viewer.php?file=/pdf/1585.pdf&v=...">
	 *   <span class="ico_manual">取扱説明書</span>
	 * </a>
	 */
	private extractPdfs(htmlContent: string): ManualPdf[] {
		const pdfs: ManualPdf[] = [];

		// Regex to match PDF links with their labels
		// Pattern 1: data-src="/viewer.php?file=/pdf/{filename}.pdf"
		const pdfLinkRegex =
			/data-src="\/viewer\.php\?file=\/pdf\/(\d+(?:_\d+)?\.pdf)[^"]*"[^>]*>[\s\S]*?<span class="ico_manual">([^<]+)<\/span>/g;

		let match: RegExpExecArray | null;
		while ((match = pdfLinkRegex.exec(htmlContent)) !== null) {
			const [, pdfFilename, labelText] = match;
			if (!pdfFilename) continue;

			const url = `https://manual.bandai-hobby.net/pdf/${pdfFilename}`;
			const label = labelText?.trim() ?? "取扱説明書";

			pdfs.push({
				url,
				name: { ja: label },
			});
		}

		// Pattern 2: Direct PDF links (href="/pdf/{filename}.pdf")
		if (pdfs.length === 0) {
			const directPdfRegex = /href="(\/pdf\/(\d+(?:_\d+)?\.pdf))"/g;
			while ((match = directPdfRegex.exec(htmlContent)) !== null) {
				const [, pdfPath] = match;
				if (!pdfPath) continue;

				const url = `https://manual.bandai-hobby.net${pdfPath}`;
				pdfs.push({
					url,
					name: { ja: "取扱説明書" },
				});
			}
		}

		return pdfs;
	}
}
