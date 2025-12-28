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
/** Tag with modifier and English text */
export interface GlobalSiteTag {
	modifier: string;
	en: string;
}

export interface GlobalSiteData {
	/** English product name */
	name?: string;
	/** Description bullet points (from PRODUCTS INFO section, excluding accessories) */
	description?: string[];
	/** Accessory items extracted from [Accessories] section */
	accessories?: string[];
	/** English release date text */
	releaseDate?: string;
	/** Brand name in English (e.g., "REAL GRADE") */
	brand?: string;
	/** Series name in English (e.g., "Mobile Suit Gundam") */
	series?: string;
	/** Distribution channel tags with English text */
	tags?: GlobalSiteTag[];
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
			const { html, error: fetchError } = await this.fetchPage(url);
			if (!html) {
				return { hasPage: false, error: fetchError };
			}

			return this.parseFromHtml(html, url);
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
	 * Parse English translation data from already-fetched HTML
	 * Used for cached HTML to avoid network requests
	 * @param html The HTML content to parse
	 * @param url Optional URL for the result (for reference)
	 * @returns GlobalSiteData with translation info or hasPage: false
	 */
	parseFromHtml(html: string, url?: string): GlobalSiteData {
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

		// Extract description and accessories (split by [Accessories] marker)
		const { description, accessories } = this.extractDescriptionBullets($);

		// Extract tags (distribution channel indicators)
		const tags = this.extractTags($);

		return {
			name: this.extractName($),
			description: description.length > 0 ? description : undefined,
			accessories: accessories.length > 0 ? accessories : undefined,
			releaseDate: this.extractReleaseDate($),
			brand: this.extractBrand($),
			series: this.extractSeries($),
			tags: tags.length > 0 ? tags : undefined,
			hasPage: true,
			url,
			html,
		};
	}

	/**
	 * Fetch page HTML using Playwright (required for CloudFront)
	 * Returns { html, error } to preserve error information
	 */
	private async fetchPage(url: string): Promise<{ html: string | null; error?: string }> {
		if (!this.browserContext) {
			throw new Error("Browser context not set. Call setBrowserContext() first.");
		}

		const page = await this.browserContext.newPage();
		try {
			const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

			// Check for error responses
			if (!response?.ok()) {
				const status = response?.status() ?? "unknown";
				return { html: null, error: `HTTP ${status}` };
			}

			return { html: await page.content() };
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
	private extractDescriptionBullets($: CheerioAPI): { description: string[]; accessories: string[] } {
		const allBullets: string[] = [];

		// Try legacy format: instruction text div with <br> separated bullets
		const instructionDiv = $(".pg-products__instructionTxt");
		if (instructionDiv.length > 0) {
			const html = instructionDiv.html() ?? "";
			const textWithNewlines = html
				.replaceAll(/<br\s*\/?>/gi, "\n")
				.replaceAll(/<[^>]+>/g, ""); // Strip remaining HTML tags

			const lines = textWithNewlines.split("\n");
			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed && !this.isRemarkText(trimmed)) {
					const normalized = trimmed.replace(/^■\s*/, "• ");
					allBullets.push(normalized);
				}
			}
		}

		// Try new format: article div with PlaygroundEditorTheme paragraphs
		// Handle both separate <p> tags and <br>-separated bullets within a <p>
		if (allBullets.length === 0) {
			const articleDiv = $(".pg-products__article");
			if (articleDiv.length > 0) {
				articleDiv.find("p").each((_, el) => {
					// Get HTML and convert <br> to newlines to preserve bullet separation
					const html = $(el).html() ?? "";
					const textWithNewlines = html
						.replaceAll(/<br\s*\/?>/gi, "\n")
						.replaceAll(/<[^>]+>/g, ""); // Strip remaining HTML tags

					const lines = textWithNewlines.split("\n");
					for (const line of lines) {
						const trimmed = line.trim();
						if (trimmed && !this.isRemarkText(trimmed)) {
							const normalized = trimmed.replace(/^■\s*/, "• ");
							allBullets.push(normalized);
						}
					}
				});
			}
		}

		// Fallback: Find PRODUCTS INFO heading and get content after it
		if (allBullets.length === 0) {
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
								allBullets.push(normalized);
							}
						}
						node = node.next();
					}
				}
			});
		}

		// Split into description and accessories based on [Accessories] marker
		return this.splitDescriptionAndAccessories(allBullets);
	}

	/**
	 * Split bullets into description and accessories sections
	 * Looks for [Accessories] marker to separate them
	 */
	private splitDescriptionAndAccessories(bullets: string[]): { description: string[]; accessories: string[] } {
		const description: string[] = [];
		const accessories: string[] = [];
		let inAccessoriesSection = false;

		for (const bullet of bullets) {
			const bulletLower = bullet.toLowerCase();

			// Check for accessories marker
			if (bulletLower.includes("[accessories]")) {
				inAccessoriesSection = true;
				// If there's text after the marker on the same line, add it to accessories
				const markerIndex = bulletLower.indexOf("[accessories]");
				const afterMarker = bullet.slice(markerIndex + "[accessories]".length).trim();
				if (afterMarker) {
					// Strip bullet prefix - accessories are parsed separately for name/count
					accessories.push(afterMarker.replace(/^[•■]\s*/, ""));
				}
				continue;
			}

			if (inAccessoriesSection) {
				// Strip bullet prefix - accessories are parsed separately for name/count
				accessories.push(bullet.replace(/^[•■]\s*/, ""));
			} else {
				description.push(bullet);
			}
		}

		return { description, accessories };
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

	/**
	 * Extract distribution channel tags from global site
	 * Tags are in elements like: <div class="pg-products__tag -gbase">THE GUNDAM BASE LIMITED</div>
	 */
	private extractTags($: CheerioAPI): GlobalSiteTag[] {
		const tags: GlobalSiteTag[] = [];

		$(".pg-products__tag").each((_, el) => {
			const $el = $(el);
			const text = $el.text().trim();
			if (!text) return;

			// Extract modifier from class (e.g., "pg-products__tag -gbase" -> "gbase")
			const classList = $el.attr("class") ?? "";
			const modifierMatch = /\s-(\w+)/.exec(classList);
			const modifier = modifierMatch?.[1] ?? "other";

			tags.push({
				modifier,
				en: text,
			});
		});

		return tags;
	}
}
