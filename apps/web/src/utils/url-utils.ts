import { FilterOptions } from "../services/dataService";

/**
 * URL utilities for sharing filters and search parameters
 */

// Constants for year validation
const MIN_VALID_YEAR = 1970;
const MAX_FUTURE_YEARS = 5;

// Helper function for base64 encoding in browser environment
const safeBtoa = (str: string): string => {
	if (typeof btoa !== "undefined") {
		return btoa(str);
	}
	// Fallback for Node.js environment
	return Buffer.from(str, "binary").toString("base64");
};

// Helper function for base64 decoding in browser environment
const safeAtob = (str: string): string => {
	if (typeof atob !== "undefined") {
		return atob(str);
	}
	// Fallback for Node.js environment
	return Buffer.from(str, "base64").toString("binary");
};

/**
 * Simple base64 compression for filter sharing
 * In a production app, you might want to use a proper compression library like pako
 */
export const compressFilters = (filters: FilterOptions): string => {
	try {
		const filterString = JSON.stringify(filters);
		return safeBtoa(encodeURIComponent(filterString));
	} catch (error) {
		 
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error("Failed to compress filters:", errorMessage);
		return "";
	}
};

export const decompressFilters = (compressed: string): FilterOptions | null => {
	try {
		const filterString = decodeURIComponent(safeAtob(compressed));
		return JSON.parse(filterString) as FilterOptions;
	} catch (error) {
		 
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error("Failed to decompress filters:", errorMessage);
		return null;
	}
};

/**
 * Build shareable URL with filters
 */
export const buildShareableUrl = (
	baseUrl: string,
	query = "",
	filters: FilterOptions = {},
): string => {
	const url = new URL(baseUrl);

	// Add query parameter
	if (query.trim()) {
		url.searchParams.set("q", query.trim());
	}

	// Add filters parameter
	if (Object.keys(filters).length > 0) {
		const compressedFilters = compressFilters(filters);
		if (compressedFilters) {
			url.searchParams.set("filters", compressedFilters);
		}
	}

	return url.toString();
};

/**
 * Parse filters from URL parameters
 */
export const parseFiltersFromUrl = (
	url: string,
): { query: string; filters: FilterOptions } => {
	try {
		const urlObj = new URL(url);
		const query = urlObj.searchParams.get("q") ?? "";
		const compressedFilters = urlObj.searchParams.get("filters");
		const filters = compressedFilters ? decompressFilters(compressedFilters) : {};

		return { query, filters: filters ?? {} };
	} catch (error) {
		 
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error("Failed to parse URL:", errorMessage);
		return { query: "", filters: {} };
	}
};

/**
 * Copy shareable URL to clipboard
 */
export const copyShareableUrl = async (
	query: string,
	filters: FilterOptions,
): Promise<boolean> => {
	try {
		const shareableUrl = buildShareableUrl(globalThis.location.href, query, filters);

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (navigator.clipboard) {
			await navigator.clipboard.writeText(shareableUrl);
			return true;
		} else {
			// Fallback for older browsers - suppress deprecation warning as this is intentional fallback
			const textArea = document.createElement("textarea");
			textArea.value = shareableUrl;
			document.body.append(textArea);
			textArea.select();
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			const success = document.execCommand("copy");
			textArea.remove();
			return success;
		}
	} catch (error) {
		 
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error("Failed to copy URL:", errorMessage);
		return false;
	}
};

/**
 * Get human-readable filter summary
 */
export const getFilterSummary = (filters: FilterOptions): string[] => {
	const summary: string[] = [];

	if (filters.grade?.length) {
		summary.push(`Grade: ${filters.grade.join(", ")}`);
	}

	if (filters.scale?.length) {
		summary.push(`Scale: ${filters.scale.join(", ")}`);
	}

	if (filters.series?.length) {
		summary.push(`Series: ${filters.series.join(", ")}`);
	}

	if (filters.releaseDateRange?.start || filters.releaseDateRange?.end) {
		const start = filters.releaseDateRange.start ?? "any";
		const end = filters.releaseDateRange.end ?? "present";
		summary.push(`Years: ${start}-${end}`);
	}

	if (filters.priceRange?.min || filters.priceRange?.max) {
		const min = filters.priceRange.min ?? 0;
		const max = filters.priceRange.max ?? "∞";
		summary.push(`Price: ¥${min}-${max}`);
	}

	if (filters.availability?.length) {
		summary.push(`Status: ${filters.availability.join(", ")}`);
	}

	if (filters.dataSource) {
		summary.push(`Source: ${filters.dataSource}`);
	}

	return summary;
};

/**
 * Validate filter options
 */
export const validateFilters = (filters: FilterOptions): boolean => {
	try {
		// Basic validation
		if (filters.priceRange) {
			const { min, max } = filters.priceRange;
			if (min !== undefined && max !== undefined && min > max) {
				return false;
			}
			if (min !== undefined && min < 0) {
				return false;
			}
			if (max !== undefined && max < 0) {
				return false;
			}
		}

		if (filters.releaseDateRange) {
			const { start, end } = filters.releaseDateRange;
			if (start !== undefined && end !== undefined && start > end) {
				return false;
			}
			const currentYear = new Date().getFullYear();
			if (start !== undefined && (start < MIN_VALID_YEAR || start > currentYear + MAX_FUTURE_YEARS)) {
				return false;
			}
			if (end !== undefined && (end < MIN_VALID_YEAR || end > currentYear + MAX_FUTURE_YEARS)) {
				return false;
			}
		}

		return true;
	} catch (error) {
		console.error("Filter validation failed:", error);
		return false;
	}
};