/**
 * Global Site (English) Lookup Utility
 * Fetches English translations from global.bandai-hobby.net
 *
 * This utility is designed to be used with BandaiCatalogParser to merge
 * English translations into the Item structure.
 */

import { load, type CheerioAPI } from "cheerio";
import type { BrowserContext } from "playwright";

/** Base URL for the global English site */
const GLOBAL_BASE_URL = "https://global.bandai-hobby.net/en-us";

/**
 * Data extracted from global.bandai-hobby.net English site
 */
export interface GlobalSiteData {
	/** English product name */
	name?: string;
	/** Description bullet points (from PRODUCTS INFO section) */
	description?: string[];
	/** English release date text */
	releaseDate?: string;
	/** Brand name in English (e.g., "REAL GRADE") */
	brand?: string;
	/** Series name in English (e.g., "Mobile Suit Gundam") */
	series?: string;
	/** Whether the page exists */
	hasPage: boolean;
	/** Full URL of the global page (set when hasPage is true) */
	url?: string;
	/** Raw HTML content (for saving/debugging) */
	html?: string;
	/** Error message if lookup failed (not for 404s) */
	error?: string;
}

export class GlobalSiteLookup {
	private browserContext: BrowserContext | null = null;

	/**
	 * Set the browser context for Playwright-based fetching
	 * Required for bypassing CloudFront blocking
	 */
	setBrowserContext(context: BrowserContext): void {
		this.browserContext = context;
	}

	/**
	 * Look up canonical English translation from global.bandai-hobby.net
	 * @param itemId The item ID (e.g., "01_5261" or "01_0001")
	 * @returns GlobalSiteData with translation info or hasPage: false
	 */
	async lookup(itemId: string): Promise<GlobalSiteData> {
		// Convert itemId to URL format (remove leading zeros: "01_0001" -> "01_1")
		const [category = "", numStr] = itemId.split("_");
		const urlId = `${category}_${Number.parseInt(numStr ?? "0", 10)}`;
		const url = `${GLOBAL_BASE_URL}/item/${urlId}/`;

		try {
			const html = await this.fetchPage(url);
			if (!html) {
				return { hasPage: false };
			}

			const $ = load(html);

			// Check if page has actual content (not error page)
			const hasContent = $("main h1").length > 0;
			if (!hasContent) {
				return { hasPage: false };
			}

			// Check for generic error title
			const title = $("title").text().trim();
			if (title.includes("404") || title.includes("Not Found") || title.includes("ERROR")) {
				return { hasPage: false };
			}

			return {
				name: this.extractName($),
				description: this.extractDescriptionBullets($),
				releaseDate: this.extractReleaseDate($),
				brand: this.extractBrand($),
				series: this.extractSeries($),
				hasPage: true,
				url,
				html,
			};
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : "Unknown error";
			// Connection errors, timeouts, etc.
			return {
				hasPage: false,
				error: errorMsg,
			};
		}
	}

	/**
	 * Fetch page HTML using Playwright (required for CloudFront)
	 */
	private async fetchPage(url: string): Promise<string | null> {
		if (!this.browserContext) {
			throw new Error("Browser context not set. Call setBrowserContext() first.");
		}

		const page = await this.browserContext.newPage();
		try {
			const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

			// Check for error responses
			if (!response?.ok()) {
				return null;
			}

			return await page.content();
		} finally {
			await page.close();
		}
	}

	/**
	 * Extract product name from global site H1
	 */
	private extractName($: CheerioAPI): string | undefined {
		const name = $("main h1").first().text().trim();
		return name || undefined;
	}

	/**
	 * Extract release date from global site
	 * Looks for "Launch date" text pattern
	 */
	private extractReleaseDate($: CheerioAPI): string | undefined {
		const mainText = $("main").text();
		const match = /Launch date\s*([\w\s,()]+?)(?=Age|$)/i.exec(mainText);
		return match?.[1]?.trim();
	}

	/**
	 * Extract description bullets from PRODUCTS INFO section
	 * These are the detailed feature descriptions prefixed with a bullet marker (■)
	 * Filters out remarks/boilerplate text
	 *
	 * The global site typically has bullets in a <p> tag separated by <br> tags:
	 * <p>■ First bullet <br>■ Second bullet <br>...</p>
	 */
	private extractDescriptionBullets($: CheerioAPI): string[] {
		const bullets: string[] = [];

		// Try to find the instruction text div directly (most reliable)
		const instructionDiv = $(".pg-products__instructionTxt");
		if (instructionDiv.length > 0) {
			// Get HTML and replace <br> tags with newlines for proper splitting
			const html = instructionDiv.html() ?? "";
			const textWithNewlines = html
				.replaceAll(/<br\s*\/?>/gi, "\n")
				.replaceAll(/<[^>]+>/g, ""); // Strip remaining HTML tags

			// Split by newlines, normalize bullets, filter remarks
			const lines = textWithNewlines.split("\n");
			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed && !this.isRemarkText(trimmed)) {
					// Normalize ■ to • if present
					const normalized = trimmed.replace(/^■\s*/, "• ");
					bullets.push(normalized);
				}
			}
		}

		// Fallback: Find PRODUCTS INFO heading and get content after it
		if (bullets.length === 0) {
			$("main").find("h2, h3").each((_, heading) => {
				const headingText = $(heading).text();
				if (headingText.includes("PRODUCTS INFO") || headingText.includes("PRODUCT INFO")) {
					let node = $(heading).next();
					while (node.length > 0 && !node.is("h2, h3")) {
						const html = node.html() ?? "";
						const textWithNewlines = html
							.replaceAll(/<br\s*\/?>/gi, "\n")
							.replaceAll(/<[^>]+>/g, "");

						const lines = textWithNewlines.split("\n");
						for (const line of lines) {
							const trimmed = line.trim();
							if (trimmed && !this.isRemarkText(trimmed)) {
								const normalized = trimmed.replace(/^■\s*/, "• ");
								bullets.push(normalized);
							}
						}
						node = node.next();
					}
				}
			});
		}

		return bullets;
	}

	/**
	 * Check if text is a remark/boilerplate that should be excluded
	 */
	private isRemarkText(text: string): boolean {
		// Remarks start with asterisk
		if (text.startsWith("*")) return true;

		// Brand names (these are already extracted separately)
		const brandPatterns = [
			/^(HG|MG|PG|RG|SD|RE\/100|EG|FG)\s*\[/i,
			/^HIGH GRADE$/i,
			/^MASTER GRADE$/i,
			/^PERFECT GRADE$/i,
			/^REAL GRADE$/i,
			/^ENTRY GRADE$/i,
			/^FIRST GRADE$/i,
		];
		for (const pattern of brandPatterns) {
			if (pattern.test(text)) return true;
		}

		// Series names (these are already extracted separately)
		const seriesPatterns = [
			/^GUNDAM BUILD/i,
			/^MOBILE SUIT GUNDAM/i,
			/^GUNDAM SEED/i,
			/^GUNDAM 00$/i,
			/^IRON-BLOODED ORPHANS/i,
		];
		for (const pattern of seriesPatterns) {
			if (pattern.test(text)) return true;
		}

		// Generic boilerplate
		const boilerplatePatterns = [
			/photos.*differ from.*actual/i,
			/products.*on the market.*no longer/i,
			/information.*web page.*subject to change/i,
			/PLACE PRE-ORDER/i,
			/out of stock/i,
			/PREMIUM BANDAI/i,
			/HOBBY ONLINE SHOP/i,
			/GUNDAM BASE ONLINE/i,
			/refer to the product page/i,
		];
		for (const pattern of boilerplatePatterns) {
			if (pattern.test(text)) return true;
		}

		return false;
	}

	/**
	 * Extract brand from global site (e.g., "REAL GRADE")
	 */
	private extractBrand($: CheerioAPI): string | undefined {
		const brandLink = $("a[href*='/brand/']").first();
		if (brandLink.length === 0) return undefined;
		const text = brandLink.text().trim();
		return text.length > 0 ? text : undefined;
	}

	/**
	 * Extract series from global site (e.g., "Mobile Suit Gundam")
	 */
	private extractSeries($: CheerioAPI): string | undefined {
		const seriesLink = $("a[href*='/series/']").first();
		if (seriesLink.length === 0) return undefined;
		const text = seriesLink.text().trim();
		return text.length > 0 ? text : undefined;
	}
}
