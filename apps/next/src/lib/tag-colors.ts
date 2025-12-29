/**
 * Tag colors based on official brand colors from Bandai
 *
 * Sources:
 * - online: P-Bandai Mexican Red (#9e2222)
 * - gbase: THE GUNDAM BASE Orient Blue (#01598b)
 * - event: P-Bandai Gold/Tacha (#d3ba66)
 * - sidef: GUNDAM SIDE-F Orange (#e67300)
 * - other: Neutral gray (#616364)
 */

export const TAG_COLORS: Record<string, string> = {
	online: "#9e2222",
	gbase: "#01598b",
	event: "#d3ba66",
	sidef: "#e67300",
	other: "#616364",
};

export function getTagColor(modifier: string): string {
	return TAG_COLORS[modifier] ?? TAG_COLORS.other;
}
