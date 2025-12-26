/**
 * Manual Page Parser using Cheerio
 * Extracts structured data from manual.bandai-hobby.net pages
 */

import { load, type CheerioAPI } from "cheerio";

import type { ItemImage } from "./bandai-catalog-parser.js";

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

/** Brand reference */
export interface ManualBrand {
	/** Japanese brand name */
	ja: string;
	/** English brand name */
	en?: string;
}

/** Series reference */
export interface ManualSeries {
	/** Japanese series name */
	ja: string;
	/** English series name */
	en?: string;
}

/** Entity reference with ID and URL */
export interface EntityRef {
	id: string;
	url: string;
}

/** Parsed manual data */
export interface ManualData {
	id: string;
	type: "manual";
	name: LocalizedText;
	productNumber?: string;
	releaseDate?: ManualReleaseDate;
	/** Product image (same structure as item images) */
	image?: ItemImage;
	scale?: string;
	/** Brand extracted from page (ja text, ID can be mapped later) */
	brand?: ManualBrand;
	/** Series extracted from page (ja text, ID can be mapped later) */
	series?: ManualSeries;
	pdfs: ManualPdf[];
	sourceUrl: string;
	/** Linked product items (discovered via shared image or manual linking) */
	items?: EntityRef[];
	/** Linked P-Bandai US items (transitive through items) */
	pbandaiUs?: EntityRef[];
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
				image: this.extractImage($),
				scale: this.extractScale(name),
				brand: this.extractBrand($, name),
				series: this.extractSeries($),
				pdfs,
				sourceUrl,
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
	 * The manual site uses h2 for the product name (not h1)
	 */
	private extractName($: CheerioAPI): string | undefined {
		// Try h2 first (manual site uses h2 for product name)
		const h2 = $("h2").first().text().trim();
		if (h2) return h2;

		// Try h1 as fallback
		const h1 = $("h1").first().text().trim();
		if (h1) return h1;

		// Try page title, strip common suffixes
		const title = $("title").text().trim();
		if (title) {
			// Remove Japanese suffix: " - バンダイプラモデルWEB取説 | バンダイ ホビーサイト"
			// Also handle English suffix: "| BANDAI HOBBY SITE"
			return title
				.replace(/\s*-\s*バンダイプラモデルWEB取説.*$/i, "")
				.replace(/\s*\|\s*BANDAI HOBBY SITE.*$/i, "")
				.trim();
		}

		return undefined;
	}

	/**
	 * Extract product number (JAN code or product ID)
	 * The manual site shows "品番" followed by number (no colon separator)
	 */
	private extractProductNumber($: CheerioAPI): string | undefined {
		// Look for product number in structured data or metadata
		const productNum = $('meta[name="product-number"]').attr("content");
		if (productNum) return productNum;

		// Try to find in page content
		// Pattern: "品番" or "商品番号" followed by optional colon and digits
		// Manual site has no colon, just whitespace between label and number
		const bodyText = $("body").text();
		const pattern = /(?:商品番号|品番)[：:]?\s*(\d+)/i;
		const match = pattern.exec(bodyText);
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
	 * Extract product image
	 * The manual site has the product image in .bl_detail_img container
	 * or right after the h2 heading
	 */
	private extractImage($: CheerioAPI): ItemImage | undefined {
		// Primary: Look for image in .bl_detail_img container (current manual site structure)
		const detailImg = $(".bl_detail_img img").first();
		let src = detailImg.attr("src") ?? detailImg.attr("data-src");
		if (src && !src.includes("/common/") && !src.includes("ogp.jpg")) {
			const fullSrc = src.startsWith("http") ? src : `https://bandai-hobby.net${src}`;
			return { src: fullSrc };
		}

		// Try to find img immediately after the h2 heading (older manual site structure)
		const h2 = $("h2").first();
		if (h2.length > 0) {
			const nextImg = h2.next("img");
			src = nextImg.attr("src") ?? nextImg.attr("data-src");
			if (src && !src.includes("/common/") && !src.includes("ogp.jpg")) {
				const fullSrc = src.startsWith("http") ? src : `https://manual.bandai-hobby.net${src}`;
				return { src: fullSrc };
			}
		}

		// Look for main product image with class selectors
		const img = $(".product-image img, .main-image img, .p-mainimg img").first();
		src = img.attr("src") ?? img.attr("data-src");

		if (src) {
			const fullSrc = src.startsWith("http") ? src : `https://manual.bandai-hobby.net${src}`;
			return { src: fullSrc };
		}

		return undefined;
	}

	/**
	 * Extract scale from name (e.g., "1/144", "1/100")
	 */
	private extractScale(name: string): string | undefined {
		const match = /1\/(\d+)/.exec(name);
		return match?.[1] ? `1/${match[1]}` : undefined;
	}

	/**
	 * Extract brand from page content
	 * The manual site shows brand as plain text after "ブランド" label
	 */
	private extractBrand($: CheerioAPI, _name: string): ManualBrand | undefined {
		const bodyText = $("body").text();
		const textMatch = /ブランド\s*([^\n作品発売]+)/i.exec(bodyText);
		if (textMatch?.[1]) {
			const brandText = textMatch[1].trim();
			if (brandText) {
				return { ja: brandText };
			}
		}
		return undefined;
	}

	/**
	 * Extract series from page content
	 * The manual site shows series as plain text after "作品" label
	 */
	private extractSeries($: CheerioAPI): ManualSeries | undefined {
		const bodyText = $("body").text();
		const textMatch = /作品\s*([^\n発売品]+)/i.exec(bodyText);
		if (textMatch?.[1]) {
			const seriesText = textMatch[1].trim();
			if (seriesText) {
				return { ja: seriesText };
			}
		}
		return undefined;
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
