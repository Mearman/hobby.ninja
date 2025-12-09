/**
 * Date proximity utilities for comparing release dates.
 * Handles partial dates (year only, year+month, full date).
 */

import type { UnifiedReleaseDate } from "@hobby-ninja/types/unified";

/**
 * Convert a partial date to a comparable timestamp.
 * For partial dates, uses the middle of the period:
 * - Year only: July 1
 * - Year + month: 15th of month
 * - Full date: exact date
 */
export function dateToTimestamp(date: UnifiedReleaseDate): number {
	const year = date.year;
	const month = date.month ?? 7; // Default to July for year-only
	const day = date.day ?? 15; // Default to 15th for month-only

	return new Date(year, month - 1, day).getTime();
}

/**
 * Calculate the difference in days between two dates.
 * Handles partial dates by estimating to middle of period.
 */
export function dateDifferenceInDays(
	date1: UnifiedReleaseDate,
	date2: UnifiedReleaseDate,
): number {
	const ts1 = dateToTimestamp(date1);
	const ts2 = dateToTimestamp(date2);

	const diffMs = Math.abs(ts1 - ts2);
	return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if two dates are within a given number of days of each other.
 */
export function datesWithinDays(
	date1?: UnifiedReleaseDate,
	date2?: UnifiedReleaseDate,
	maxDays = 90,
): boolean {
	if (!date1 || !date2) return false;
	if (!date1.year || !date2.year) return false;

	return dateDifferenceInDays(date1, date2) <= maxDays;
}

/**
 * Calculate a confidence score based on date proximity.
 * Returns 1.0 for exact match, decreasing as dates diverge.
 *
 * @param date1 First date
 * @param date2 Second date
 * @param halfLife Days at which confidence is 0.5 (default: 60)
 */
export function dateProximityScore(
	date1?: UnifiedReleaseDate,
	date2?: UnifiedReleaseDate,
	halfLife = 60,
): number {
	if (!date1 || !date2) return 0.5; // Unknown = neutral
	if (!date1.year || !date2.year) return 0.5;

	const days = dateDifferenceInDays(date1, date2);

	// Exponential decay: score = 2^(-days/halfLife)
	return Math.pow(2, -days / halfLife);
}

/**
 * Parse a Japanese date string to UnifiedReleaseDate.
 * Handles formats like "2017年05月20日 (土)" or "2002年11月16日"
 */
export function parseJapaneseDate(
	dateStr: string,
): UnifiedReleaseDate | undefined {
	// Match year, month, day pattern
	const match = /(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(dateStr);
	if (match?.[1] && match[2] && match[3]) {
		return {
			year: Number.parseInt(match[1], 10),
			month: Number.parseInt(match[2], 10),
			day: Number.parseInt(match[3], 10),
		};
	}

	// Match year and month only
	const yearMonthMatch = /(\d{4})年(\d{1,2})月/.exec(dateStr);
	if (yearMonthMatch?.[1] && yearMonthMatch[2]) {
		return {
			year: Number.parseInt(yearMonthMatch[1], 10),
			month: Number.parseInt(yearMonthMatch[2], 10),
		};
	}

	// Match year only
	const yearMatch = /(\d{4})年/.exec(dateStr);
	if (yearMatch?.[1]) {
		return {
			year: Number.parseInt(yearMatch[1], 10),
		};
	}

	return undefined;
}

/**
 * Format a UnifiedReleaseDate for display.
 */
export function formatDate(date: UnifiedReleaseDate): string {
	const parts = [date.year.toString()];

	if (date.month) {
		parts.push(date.month.toString().padStart(2, "0"));
		if (date.day) {
			parts.push(date.day.toString().padStart(2, "0"));
		}
	}

	return parts.join("-");
}
