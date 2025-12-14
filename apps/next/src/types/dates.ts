/**
 * Type-safe discriminated union types for release dates
 * This ensures that if date components exist, they follow proper hierarchy:
 * - Year only
 * - Year and Month
 * - Year, Month, and Day
 *
 * No Japanese string parsing needed - dates must have valid numeric structure
 */

// Year only - most granular level
export interface YearOnlyDate {
	year: number;
	month?: never;
	day?: never;
}

// Year and month - intermediate level
export interface YearMonthDate {
	year: number;
	month: number;
	day?: never;
}

// Complete date - most specific level
export interface YearMonthDayDate {
	year: number;
	month: number;
	day: number;
}

// Discriminated union type for ReleaseDate
export type ReleaseDate = YearOnlyDate | YearMonthDate | YearMonthDayDate;

// Type guards to check which type of date we have
export function isYearOnlyDate(date: ReleaseDate): date is YearOnlyDate {
	return "year" in date && !("month" in date);
}

export function isYearMonthDate(date: ReleaseDate): date is YearMonthDate {
	return "year" in date && "month" in date && !("day" in date);
}

export function isYearMonthDayDate(date: ReleaseDate): date is YearMonthDayDate {
	return "year" in date && "month" in date && "day" in date;
}

// Helper functions to extract date components safely
export function getYear(date: ReleaseDate): number {
	return date.year;
}

export function getMonth(date: ReleaseDate): number | undefined {
	if (isYearMonthDate(date) || isYearMonthDayDate(date)) {
		return date.month;
	}
	return undefined;
}

export function getDay(date: ReleaseDate): number | undefined {
	if (isYearMonthDayDate(date)) {
		return date.day;
	}
	return undefined;
}

// Create a Date object from ReleaseDate
export function createDateFromReleaseDate(date: ReleaseDate): Date {
	const { year } = date;
	const month = getMonth(date) ?? 1; // Default to January
	const day = getDay(date) ?? 1;     // Default to 1st

	return new Date(year, month - 1, day); // JS months are 0-indexed
}

// Create formatted string representations
export function formatReleaseDate(date: ReleaseDate): string {
	const { year } = date;
	const month = getMonth(date);
	const day = getDay(date);

	if (day && month) {
		return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	}
	if (month) {
		return `${year}-${String(month).padStart(2, "0")}`;
	}
	return String(year);
}

/**
 * Adapter function to convert from schema ReleaseDate (with nullable fields)
 * to our discriminated union ReleaseDate
 *
 * Returns undefined if the schema date doesn't have valid numeric data.
 * This enforces that dates must have proper year/month/day structure.
 */
export function adaptSchemaReleaseDate(schemaDate: {
	ja: string;
	year?: number | null;
	month?: number | null;
	day?: number | null;
}): ReleaseDate | undefined {
	const { year, month, day } = schemaDate;

	// Filter out null/undefined values and ensure proper hierarchy
	const validYear = year ?? undefined;
	const validMonth = month ?? undefined;
	const validDay = day ?? undefined;

	// Build discriminated union based on available valid values
	// Only return a date if we have at least a year
	if (validYear !== undefined && validMonth !== undefined && validDay !== undefined) {
		return {
			year: validYear,
			month: validMonth,
			day: validDay,
		};
	}

	if (validYear !== undefined && validMonth !== undefined) {
		return {
			year: validYear,
			month: validMonth,
		};
	}

	if (validYear !== undefined) {
		return {
			year: validYear,
		};
	}

	// No valid numeric date data available
	return undefined;
}
