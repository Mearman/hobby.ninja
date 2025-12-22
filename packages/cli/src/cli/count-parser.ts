/**
 * Parses accessory/contents strings to extract name, count, and unit.
 *
 * Handles formats like:
 * - "ビーム・ライフルｘ1" (fullwidth x)
 * - "Beam rifle x1" (ASCII x)
 * - "シール×1" (multiplication sign)
 * - "Hand parts × 1 set" (with unit)
 * - "成形品ｘ8" (contents format)
 */

export interface ParsedCountItem {
	name: string;
	count?: number;
	unit?: string;
}

/** Known units in Japanese and English */
const JAPANESE_UNITS = ["式", "セット", "組", "枚", "本", "個"];
const ENGLISH_UNITS = ["set", "sets", "piece", "pieces", "sheet", "sheets"];

/**
 * Parse a single accessory/content string into structured data.
 *
 * @param text - Raw string like "ビーム・ライフルｘ1" or "Hand parts × 1 set"
 * @returns Parsed object with name, optional count, and optional unit
 */
export function parseCountedItem(text: string): ParsedCountItem {
	const trimmed = text.trim();

	// Regex to match: name + separator + count + optional unit
	// Separators: ｘ (fullwidth), × (multiplication), x (ASCII)
	// Count: digits
	// Unit: optional text after count
	const countPattern = /^(.+?)\s*[ｘ×x]\s*(\d+)\s*(.*)$/i;
	const match = countPattern.exec(trimmed);

	if (match) {
		const rawName = match[1];
		const countStr = match[2];
		const rawUnit = match[3];

		if (rawName && countStr) {
			const name = rawName.trim();
			const count = Number.parseInt(countStr, 10);
			const unit = parseUnit(rawUnit?.trim() ?? "");

			return {
				name,
				count,
				...(unit && { unit }),
			};
		}
	}

	// No count pattern found - return just the name
	return { name: trimmed };
}

/**
 * Normalize unit string, returning undefined if empty or unknown.
 */
function parseUnit(rawUnit: string): string | undefined {
	if (!rawUnit) return undefined;

	const lower = rawUnit.toLowerCase();

	// Check English units
	for (const unit of ENGLISH_UNITS) {
		if (lower === unit || lower.startsWith(unit)) {
			// Normalize to singular
			if (unit === "sets") return "set";
			if (unit === "pieces") return "piece";
			if (unit === "sheets") return "sheet";
			return unit;
		}
	}

	// Check Japanese units
	for (const unit of JAPANESE_UNITS) {
		if (rawUnit === unit || rawUnit.startsWith(unit)) {
			return unit;
		}
	}

	// Return as-is if it looks like a unit (short, no spaces)
	if (rawUnit.length <= 10 && !rawUnit.includes(" ")) {
		return rawUnit;
	}

	return undefined;
}

/**
 * Parse an array of accessory/content strings.
 */
export function parseCountedItems(items: string[]): ParsedCountItem[] {
	return items.map((item) => parseCountedItem(item));
}

/**
 * Merge Japanese and English parsed items by position.
 * Returns unified items with localized names.
 */
export function mergeLocalizedItems(
	jaItems: ParsedCountItem[],
	enItems: ParsedCountItem[],
): Array<{
	name: { ja: string; en?: string };
	count?: number;
	unit?: string;
}> {
	const result: Array<{
		name: { ja: string; en?: string };
		count?: number;
		unit?: string;
	}> = [];

	// Match by position
	const maxLen = Math.max(jaItems.length, enItems.length);

	for (let i = 0; i < maxLen; i++) {
		const ja = jaItems[i];
		const en = enItems[i];

		if (ja && en) {
			// Both exist - merge
			result.push({
				name: { ja: ja.name, en: en.name },
				// Prefer JA count/unit as authoritative
				count: ja.count ?? en.count,
				unit: ja.unit ?? en.unit,
			});
		} else if (ja) {
			// Only JA
			result.push({
				name: { ja: ja.name },
				count: ja.count,
				unit: ja.unit,
			});
		} else if (en) {
			// Only EN (shouldn't normally happen)
			result.push({
				name: { ja: en.name, en: en.name },
				count: en.count,
				unit: en.unit,
			});
		}
	}

	return result;
}
