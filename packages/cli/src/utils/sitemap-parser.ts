/**
 * Minimal sitemap XML parsing utilities for Bandai sitemap integration.
 * Sitemaps are simple, well-structured XML - no need for heavy parsing libraries.
 */

export interface SitemapEntry {
	loc: string;
	lastmod?: string;
}

/**
 * Parse sitemap XML and extract URL entries.
 * Works for both urlset (final sitemap) and sitemapindex (index of sitemaps).
 */
export function parseSitemapEntries(xml: string): SitemapEntry[] {
	const entries: SitemapEntry[] = [];

	// Match <url> or <sitemap> blocks containing <loc> elements
	const blockPattern = /<(?:url|sitemap)>([\s\S]*?)<\/(?:url|sitemap)>/g;
	const blocks = xml.matchAll(blockPattern);

	for (const blockMatch of blocks) {
		const block = blockMatch[1];

		// Extract loc (required)
		const locMatches = block.match(/<loc>([^<]+)<\/loc>/);
		if (!locMatches?.[1]) continue;

		// Extract lastmod (optional)
		const lastmodMatches = block.match(/<lastmod>([^<]+)<\/lastmod>/);

		entries.push({
			loc: locMatches[1].trim(),
			lastmod: lastmodMatches?.[1]?.trim(),
		});
	}

	return entries;
}

/**
 * Check if the sitemap XML is an index (contains sitemap references)
 * vs a urlset (contains actual URLs).
 */
export function isSitemapIndex(xml: string): boolean {
	return xml.includes("<sitemapindex") || xml.includes("<sitemap>");
}

/**
 * Extract nested sitemap URLs from a sitemap index.
 */
export function extractNestedSitemapUrls(xml: string): string[] {
	return parseSitemapEntries(xml).map((entry) => entry.loc);
}

/**
 * Extract item ID from a Bandai item URL.
 * URL pattern: https://bandai-hobby.net/item/{id}/
 * Returns null if URL doesn't match the pattern.
 */
export function extractItemIdFromUrl(url: string): string | null {
	// Match /item/{id}/ pattern where id is like 01_1234 or just numbers
	const matches = /\/item\/([^/]+)\/?$/.exec(url);
	if (!matches?.[1]) return null;

	const id = matches[1];

	// Validate it looks like an item ID (prefix_number format)
	// Examples: 01_1, 01_1000, 02_500
	if (!/^\d+_\d+$/.test(id)) {
		return null;
	}

	return id;
}

/**
 * Filter sitemap entries to only item URLs and extract their IDs.
 */
export function extractItemIdsFromSitemap(xml: string): string[] {
	const entries = parseSitemapEntries(xml);
	const itemIds: string[] = [];

	for (const entry of entries) {
		const itemId = extractItemIdFromUrl(entry.loc);
		if (itemId) {
			itemIds.push(itemId);
		}
	}

	return itemIds;
}
