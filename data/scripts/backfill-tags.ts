/**
 * Backfill tags from HTML files into JSON item files
 *
 * This script:
 * 1. Finds all HTML files in data/src/items/
 * 2. Extracts tags from each HTML file
 * 3. Merges English tags from .en.html files
 * 4. Updates the corresponding JSON file with the tags
 *
 * Usage: npx tsx scripts/backfill-tags.ts [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { load } from "cheerio";

const ITEMS_DIR = join(import.meta.dirname, "../src/items");
const DRY_RUN = process.argv.includes("--dry-run");

interface TagRef {
	modifier: string;
	ja: string;
	en?: string;
}

/**
 * Fallback translations for known Japanese tags
 * Used when no English HTML page exists
 */
const TAG_TRANSLATIONS: Record<string, string> = {
	"ホビーオンライン": "HOBBY ONLINE SHOP",
	"ガンダムベース": "THE GUNDAM BASE",
	"イベント": "EVENT",
	"ガンダムベースグッズ": "GUNDAM BASE GOODS",
	"ガンプラくんグッズ": "GUNPLA-KUN GOODS",
	"特別商品": "SPECIAL PRODUCT",
	// These are already in English in the Japanese HTML
	"THE GUNDAM BASE LIMITED": "THE GUNDAM BASE LIMITED",
	"BANDAI HOBBY ONLINE SHOP LIMITED": "BANDAI HOBBY ONLINE SHOP LIMITED",
	"EVENTS": "EVENTS",
	"GUNDAM SIDE-F": "GUNDAM SIDE-F",
};

/**
 * Extract tags from HTML content
 */
function extractTagsFromHtml(html: string): Array<{ modifier: string; text: string }> {
	const $ = load(html);
	const tags: Array<{ modifier: string; text: string }> = [];

	$(".pg-products__tag").each((_, el) => {
		const $el = $(el);
		const text = $el.text().trim();
		if (!text) return;

		// Extract modifier from class (e.g., "pg-products__tag -gbase" -> "gbase")
		const classList = $el.attr("class") ?? "";
		const modifierMatch = classList.match(/\s-(\w+)/);
		const modifier = modifierMatch?.[1] ?? "other";

		tags.push({ modifier, text });
	});

	return tags;
}

/**
 * Merge Japanese and English tags by modifier
 * Falls back to translation map if no English HTML exists
 */
function mergeTags(
	jaTags: Array<{ modifier: string; text: string }>,
	enTags: Array<{ modifier: string; text: string }>
): TagRef[] {
	const merged: TagRef[] = [];
	const enTagMap = new Map(enTags.map(t => [t.modifier, t.text]));

	for (const jaTag of jaTags) {
		const tag: TagRef = {
			modifier: jaTag.modifier,
			ja: jaTag.text,
		};

		// Try to get English text from HTML first, then fall back to translation map
		const enText = enTagMap.get(jaTag.modifier) ?? TAG_TRANSLATIONS[jaTag.text];
		if (enText) {
			tag.en = enText;
		}

		merged.push(tag);
	}

	return merged;
}

async function main() {
	console.log(`Backfilling tags from HTML files${DRY_RUN ? " (DRY RUN)" : ""}...`);

	// Get all HTML files (excluding .en.html)
	const files = readdirSync(ITEMS_DIR).filter(
		f => f.endsWith(".html") && !f.endsWith(".en.html")
	);

	let updated = 0;
	let skipped = 0;
	let noTags = 0;

	for (const htmlFile of files) {
		const itemId = basename(htmlFile, ".html");
		const htmlPath = join(ITEMS_DIR, htmlFile);
		const enHtmlPath = join(ITEMS_DIR, `${itemId}.en.html`);
		const jsonPath = join(ITEMS_DIR, `${itemId}.json`);

		// Skip if no JSON file exists
		if (!existsSync(jsonPath)) {
			skipped++;
			continue;
		}

		// Read and parse HTML
		const htmlContent = readFileSync(htmlPath, "utf-8");
		const jaTags = extractTagsFromHtml(htmlContent);

		// Read English HTML if exists
		let enTags: Array<{ modifier: string; text: string }> = [];
		if (existsSync(enHtmlPath)) {
			const enHtmlContent = readFileSync(enHtmlPath, "utf-8");
			enTags = extractTagsFromHtml(enHtmlContent);
		}

		// Skip if no tags found
		if (jaTags.length === 0) {
			noTags++;
			continue;
		}

		// Merge tags
		const tags = mergeTags(jaTags, enTags);

		// Read JSON file
		const jsonContent = readFileSync(jsonPath, "utf-8");
		const item = JSON.parse(jsonContent);

		// Check if tags already exist and are the same
		if (JSON.stringify(item.tags) === JSON.stringify(tags)) {
			skipped++;
			continue;
		}

		// Update item with tags
		item.tags = tags;

		if (!DRY_RUN) {
			// Write back with same formatting
			writeFileSync(jsonPath, JSON.stringify(item, null, "\t") + "\n");
		}

		console.log(`${DRY_RUN ? "[DRY] " : ""}Updated ${itemId}: ${tags.map(t => t.ja).join(", ")}`);
		updated++;
	}

	console.log("\nSummary:");
	console.log(`  Updated: ${updated}`);
	console.log(`  Skipped: ${skipped}`);
	console.log(`  No tags: ${noTags}`);
	console.log(`  Total HTML files: ${files.length}`);
}

main().catch(console.error);
