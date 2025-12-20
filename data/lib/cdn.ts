/**
 * CDN Configuration for asset URLs
 *
 * Resolves image and manual paths to full CDN URLs.
 * Supports primary CDN (R2) with fallback to GitHub raw content.
 *
 * Environment variables:
 * - NEXT_PUBLIC_R2_CDN_URL: Primary R2 CDN URL (optional)
 * - NEXT_PUBLIC_ASSET_CDN_URL: Legacy CDN URL (optional)
 *
 * Fallback chain: R2 → Custom CDN → GitHub Raw
 */

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/Mearman/hobby.ninja/main';

/**
 * Get the R2 CDN URL if configured
 */
function getR2CdnUrl(): string | undefined {
	if (typeof process !== 'undefined' && process.env['NEXT_PUBLIC_R2_CDN_URL']) {
		return process.env['NEXT_PUBLIC_R2_CDN_URL'];
	}

	if (typeof window !== 'undefined') {
		const windowAsAny = window as unknown as Record<string, unknown>;
		const r2Url = windowAsAny['__R2_CDN_URL__'];
		if (r2Url) {
			return r2Url as string;
		}
	}

	return undefined;
}

/**
 * Get the legacy CDN base URL from environment
 */
function getLegacyCdnUrl(): string | undefined {
	if (typeof process !== 'undefined' && process.env['NEXT_PUBLIC_ASSET_CDN_URL']) {
		return process.env['NEXT_PUBLIC_ASSET_CDN_URL'];
	}

	if (typeof window !== 'undefined') {
		const windowAsAny = window as unknown as Record<string, unknown>;
		const cdnUrl = windowAsAny['__ASSET_CDN_URL__'];
		if (cdnUrl) {
			return cdnUrl as string;
		}
	}

	return undefined;
}

/**
 * Get the primary CDN base URL (R2 > Legacy > GitHub)
 */
export function getCdnBaseUrl(): string {
	return getR2CdnUrl() ?? getLegacyCdnUrl() ?? GITHUB_RAW_URL;
}

/**
 * Get the fallback CDN base URL (always GitHub raw)
 */
export function getFallbackCdnBaseUrl(): string {
	return GITHUB_RAW_URL;
}

/**
 * Resolve a relative asset path to full CDN URL
 * @param assetPath - Relative path like "images/brands/gundam.jpg" or "manuals/0001/0001.pdf"
 * @returns Full CDN URL
 */
export function resolveCdnUrl(assetPath: string): string {
	if (!assetPath) return '';

	// Remove leading slash if present
	const normalizedPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;

	const baseUrl = getCdnBaseUrl();

	// Assets are in the repo root now (assets/images/ and assets/manuals/)
	return `${baseUrl}/assets/${normalizedPath}`;
}

/**
 * Resolve an image URL
 * @param imagePath - Image path relative to assets/images/
 * @returns Full CDN URL for the image
 */
export function resolveImageUrl(imagePath: string): string {
	if (!imagePath) return '';

	const normalizedPath = imagePath.startsWith('images/') ? imagePath : `images/${imagePath}`;
	return resolveCdnUrl(normalizedPath);
}

/**
 * Resolve a manual/PDF URL
 * @param manualPath - Manual path relative to assets/manuals/
 * @returns Full CDN URL for the manual
 */
export function resolveManualUrl(manualPath: string): string {
	if (!manualPath) return '';

	const normalizedPath = manualPath.startsWith('manuals/') ? manualPath : `manuals/${manualPath}`;
	return resolveCdnUrl(normalizedPath);
}

/**
 * CDN URL pair for fallback support
 */
export interface CdnUrls {
	/** Primary CDN URL (R2 if configured, otherwise GitHub) */
	primary: string;
	/** Fallback CDN URL (always GitHub raw) */
	fallback: string;
	/** Whether primary and fallback are different (fallback is useful) */
	hasFallback: boolean;
}

/**
 * Get both primary and fallback CDN URLs for an asset path
 * Used by components that need to implement fallback behavior
 *
 * @param assetPath - Relative path like "images/brands/gundam.jpg"
 * @returns Object with primary and fallback URLs
 */
export function getCdnUrls(assetPath: string): CdnUrls {
	if (!assetPath) {
		return { primary: '', fallback: '', hasFallback: false };
	}

	const normalizedPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
	const primaryBase = getCdnBaseUrl();
	const fallbackBase = getFallbackCdnBaseUrl();

	const primary = `${primaryBase}/assets/${normalizedPath}`;
	const fallback = `${fallbackBase}/assets/${normalizedPath}`;

	return {
		primary,
		fallback,
		hasFallback: primary !== fallback,
	};
}

/**
 * Get CDN URLs for an image path
 * @param imagePath - Image path relative to assets/images/
 */
export function getImageCdnUrls(imagePath: string): CdnUrls {
	if (!imagePath) {
		return { primary: '', fallback: '', hasFallback: false };
	}
	const normalizedPath = imagePath.startsWith('images/') ? imagePath : `images/${imagePath}`;
	return getCdnUrls(normalizedPath);
}

/**
 * Get CDN URLs for a manual/PDF path
 * @param manualPath - Manual path relative to assets/manuals/
 */
export function getManualCdnUrls(manualPath: string): CdnUrls {
	if (!manualPath) {
		return { primary: '', fallback: '', hasFallback: false };
	}
	const normalizedPath = manualPath.startsWith('manuals/') ? manualPath : `manuals/${manualPath}`;
	return getCdnUrls(normalizedPath);
}
