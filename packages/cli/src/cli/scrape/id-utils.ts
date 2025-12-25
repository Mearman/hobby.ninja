/**
 * Normalize manual ID to 4-digit zero-padded format for filenames
 * e.g., "106" -> "0106", "1234" -> "1234"
 */
export function padManualId(id: string): string {
	return id.replace(/^0+/, "").padStart(4, "0");
}

/**
 * Get canonical (unpadded) manual ID for URLs and data
 * e.g., "0106" -> "106", "1234" -> "1234"
 */
export function unpadManualId(id: string): string {
	return id.replace(/^0+/, "") || "0";
}

/**
 * Parse an item ID and return the numeric suffix
 * Accepts: "01_1234", "1234", "01_0001", "0001", "1"
 * All resolve to the numeric value (e.g., 1234 or 1)
 */
export function parseItemIdSuffix(id: string): number {
	// If contains underscore, extract suffix
	if (id.includes("_")) {
		const parts = id.split("_");
		if (parts.length !== 2 || !parts[1]) return 0;
		return Number.parseInt(parts[1], 10);
	}
	// Otherwise treat entire string as the numeric ID
	return Number.parseInt(id, 10);
}

/**
 * Format a numeric suffix into a padded item ID
 * e.g., 1234 -> "01_1234", 1 -> "01_0001"
 */
export function formatItemId(suffix: number): string {
	return `01_${suffix.toString().padStart(4, "0")}`;
}
