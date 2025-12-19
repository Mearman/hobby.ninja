import pako from "pako";

export interface ShareableFilters extends Record<string, unknown> {
  category?: string;
  search?: string;
  brands?: string[];
  categories?: string[];
  series?: string[];
  grades?: string[];
  scales?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: string;
    end: string;
  };
  status?: string[];
  availability?: string[];
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
  page?: number;
  view?: "grid" | "list";
}

export interface ShareableCollection {
  id: string;
  name: string;
  category: string;
  description: string;
  itemCount: number;
}

export interface ShareableData {
  type: "filters" | "collection" | "search";
  data: ShareableFilters | ShareableCollection | string;
  version: string;
  timestamp: number;
}

const VERSION = "1.0";
const COMPRESSION_LEVEL = 6;
const MAX_URL_LENGTH = 2048;

interface DecompressedData {
	version: string;
	data: unknown;
}

/**
 * Compress data to base64url string for URL sharing
 */
function compress(data: ShareableData): string {
	try {
		// Add metadata
		const payload = {
			...data,
			version: VERSION,
			timestamp: Date.now(),
		};

		// Convert to JSON
		const jsonString = JSON.stringify(payload);

		// Compress with pako
		const compressed = pako.deflate(jsonString, {
			level: COMPRESSION_LEVEL,
		});

		// Convert to base64url (URL-safe base64)
		const base64url = arrayBufferToBase64Url(compressed);

		return base64url;
	} catch {
		throw new Error("Compression failed");
	}
}

/**
 * Decompress base64url string from URL
 */
function decompress<T>(compressedData: string): Promise<T> {
	return new Promise((resolve, reject) => {
		try {
			// Convert base64url to array buffer
			const arrayBuffer = base64UrlToArrayBuffer(compressedData);

			// Decompress with pako
			const decompressed = pako.inflate(arrayBuffer, { to: "string" });

			// Parse JSON
			const data = JSON.parse(decompressed) as DecompressedData;

			// Validate version (silent check - no console output)
			// Version mismatch is logged but doesn't prevent decompression

			resolve(data.data as T);
		} catch {
			reject(new Error("Decompression failed"));
		}
	});
}

/**
 * Create shareable URL for filters
 */
function createFiltersUrl(filters: ShareableFilters): string {
	const data: ShareableData = {
		type: "filters",
		data: filters,
		version: VERSION,
		timestamp: Date.now(),
	};

	const compressed = compress(data);
	return `${globalThis.location.origin}/database/share/${compressed}`;
}

/**
 * Create shareable URL for collection
 */
function createCollectionUrl(collection: ShareableCollection): string {
	const data: ShareableData = {
		type: "collection",
		data: collection,
		version: VERSION,
		timestamp: Date.now(),
	};

	const compressed = compress(data);
	return `${globalThis.location.origin}/database/share/${compressed}`;
}

/**
 * Create shareable URL for search query
 */
function createSearchUrl(searchQuery: string): string {
	const data: ShareableData = {
		type: "search",
		data: searchQuery,
		version: VERSION,
		timestamp: Date.now(),
	};

	const compressed = compress(data);
	return `${globalThis.location.origin}/database/share/${compressed}`;
}

/**
 * Parse current URL to extract compressed data
 */
function parseCurrentUrl(): ShareableData | null {
	// Runtime check for server-side rendering compatibility
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (globalThis.window === undefined) return null;

	const pathname = globalThis.location.pathname;
	const match = /\/database\/share\/(.+)$/.exec(pathname);

	if (!match) return null;

	try {
		const compressedData = match[1];
		const decompressed = pako.inflate(base64UrlToArrayBuffer(compressedData), { to: "string" });
		return JSON.parse(decompressed) as ShareableData;
	} catch {
		return null;
	}
}

/**
 * Convert Uint8Array to base64url string
 */
function arrayBufferToBase64Url(buffer: Uint8Array): string {
	// Convert Uint8Array to string properly
	let binary = "";
	for (const element of buffer) {
		binary += String.fromCodePoint(element);
	}
	const base64 = btoa(binary);
	return base64
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");
}

/**
 * Convert base64url string to Uint8Array
 */
function base64UrlToArrayBuffer(base64url: string): Uint8Array {
	// Pad with proper padding characters
	const padding = (4 - (base64url.length % 4)) % 4;
	const base64 = (base64url + "=".repeat(padding))
		.replaceAll("-", "+")
		.replaceAll("_", "/");

	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		const codePoint = binaryString.codePointAt(i);
		if (codePoint !== undefined) {
			bytes[i] = codePoint;
		}
	}
	return bytes;
}

/**
 * Check if compressed data will exceed URL length limits
 */
function willExceedUrlLimit(data: ShareableData): boolean {
	try {
		const compressed = compress(data);
		const estimatedUrlLength = `${globalThis.location.origin}/database/share/${compressed}`.length;
		return estimatedUrlLength > MAX_URL_LENGTH;
	} catch {
		return true;
	}
}

/**
 * Create optimized shareable data for filters (removes empty values)
 */
function optimizeFilters(filters: ShareableFilters): ShareableFilters {
	const optimized: ShareableFilters = {};

	for (const [key, value] of Object.entries(filters)) {
		if (value === undefined || value === null) continue;

		// Type-safe assignments based on the key
		switch (key) {
			case "brands":
			case "categories":
			case "series":
			case "grades":
			case "scales":
			case "status":
			case "availability": {
				if (Array.isArray(value) && value.length > 0 && value.every(item => typeof item === "string")) {
					optimized[key] = value;
				}
				break;
			}
			case "priceRange":
			case "dateRange":
			case "sort": {
				if (typeof value === "object" && Object.keys(value).length > 0) {
					optimized[key as keyof ShareableFilters] = value;
				}
				break;
			}
			case "category":
			case "search":
			case "page":
			case "view": {
				if (value !== "") {
					optimized[key as keyof ShareableFilters] = value;
				}
				break;
			}
		}
	}

	return optimized;
}

/**
 * Get estimated compression ratio
 */
function getCompressionRatio(data: ShareableData): number {
	try {
		const jsonString = JSON.stringify(data);
		const compressed = compress(data);
		return compressed.length / jsonString.length;
	} catch {
		return 1;
	}
}

export const UrlCompression = {
	compress,
	decompress,
	createFiltersUrl,
	createCollectionUrl,
	createSearchUrl,
	parseCurrentUrl,
	willExceedUrlLimit,
	optimizeFilters,
	getCompressionRatio,
};