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
 * Check if running in development mode
 */
function isDevelopment(): boolean {
	if (typeof process !== 'undefined' && process.env['NODE_ENV'] === 'development') {
		return true;
	}
	return false;
}

/**
 * Get the primary CDN base URL (R2 > Legacy > GitHub)
 * In development, returns empty string to serve assets locally
 */
export function getCdnBaseUrl(): string {
	if (isDevelopment()) {
		return '';
	}
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
 * @param assetPath - Relative path like "images/brands/gundam.jpg" or "manuals/0001/0001.pdf", or a full URL
 * @returns Full CDN URL, or the original URL if already absolute
 */
export function resolveCdnUrl(assetPath: string): string {
	if (!assetPath) return '';

	// Pass through full URLs (http://, https://, data:, etc.)
	if (assetPath.startsWith('http://') || assetPath.startsWith('https://') || assetPath.startsWith('data:')) {
		return assetPath;
	}

	// Remove leading slash if present
	const normalizedPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;

	const baseUrl = getCdnBaseUrl();

	// Assets are in the repo root now (assets/images/ and assets/manuals/)
	return `${baseUrl}/assets/${normalizedPath}`;
}

/**
 * Resolve an image URL
 * @param imagePath - Image path relative to assets/images/, or a full URL
 * @returns Full CDN URL for the image, or the original URL if already absolute
 */
export function resolveImageUrl(imagePath: string): string {
	if (!imagePath) return '';

	// Pass through full URLs (http://, https://, data:, etc.)
	if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
		return imagePath;
	}

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
 * CDN URL set with fallback support
 *
 * Fallback chain: external (original source) → primary (R2/local) → fallback (GitHub)
 * External is tried first as the authoritative source; CDN serves as backup.
 */
export interface CdnUrls {
	/** Primary CDN URL (R2 if configured, local in dev, otherwise GitHub) */
	primary: string;
	/** Fallback CDN URL (always GitHub raw) */
	fallback: string;
	/** External source URL (original URL from data, e.g., Bandai) - tried first if available */
	external?: string;
	/** Whether primary and fallback are different (fallback is useful) */
	hasFallback: boolean;
	/** Whether an external source is available (tried first) */
	hasExternal: boolean;
}

/**
 * Get both primary and fallback CDN URLs for an asset path
 * Used by components that need to implement fallback behavior
 *
 * @param assetPath - Relative path like "images/brands/gundam.jpg"
 * @param externalUrl - Optional external source URL as final fallback
 * @returns Object with primary, fallback, and optional external URLs
 */
export function getCdnUrls(assetPath: string, externalUrl?: string): CdnUrls {
	if (!assetPath) {
		return { primary: '', fallback: '', hasFallback: false, hasExternal: false };
	}

	const normalizedPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
	const primaryBase = getCdnBaseUrl();
	const fallbackBase = getFallbackCdnBaseUrl();

	const primary = `${primaryBase}/assets/${normalizedPath}`;
	const fallback = `${fallbackBase}/assets/${normalizedPath}`;

	return {
		primary,
		fallback,
		external: externalUrl,
		hasFallback: primary !== fallback,
		hasExternal: Boolean(externalUrl),
	};
}

/**
 * Get CDN URLs for an image path
 * @param imagePath - Image path relative to assets/images/
 * @param externalUrl - Optional external source URL as final fallback
 */
export function getImageCdnUrls(imagePath: string, externalUrl?: string): CdnUrls {
	if (!imagePath) {
		return { primary: '', fallback: '', hasFallback: false, hasExternal: false };
	}
	const normalizedPath = imagePath.startsWith('images/') ? imagePath : `images/${imagePath}`;
	return getCdnUrls(normalizedPath, externalUrl);
}

/**
 * Get CDN URLs for a manual/PDF path
 * @param manualPath - Manual path relative to assets/manuals/
 * @param externalUrl - Optional external source URL as final fallback
 */
export function getManualCdnUrls(manualPath: string, externalUrl?: string): CdnUrls {
	if (!manualPath) {
		return { primary: '', fallback: '', hasFallback: false, hasExternal: false };
	}
	const normalizedPath = manualPath.startsWith('manuals/') ? manualPath : `manuals/${manualPath}`;
	return getCdnUrls(normalizedPath, externalUrl);
}

/**
 * Get the next URL in the fallback chain
 * Chain order: external → primary → fallback
 *
 * @param urls - CdnUrls object
 * @param currentUrl - The URL that failed
 * @returns The next URL to try, or undefined if no more fallbacks
 */
export function getNextFallbackUrl(urls: CdnUrls, currentUrl: string): string | undefined {
	// external → primary
	if (urls.external && currentUrl === urls.external) {
		return urls.primary;
	}
	// primary → fallback
	if (currentUrl === urls.primary && urls.hasFallback) {
		return urls.fallback;
	}
	return undefined;
}

/**
 * Get the first URL to try in the fallback chain
 * Returns external if available, otherwise primary
 */
export function getInitialUrl(urls: CdnUrls): string {
	return urls.external ?? urls.primary;
}
