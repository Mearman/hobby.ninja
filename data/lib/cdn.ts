/**
 * CDN Configuration for asset URLs
 *
 * Resolves image and manual paths to full CDN URLs.
 * Configurable via ASSET_CDN_URL environment variable.
 * Defaults to GitHub raw content URL.
 */

const DEFAULT_CDN_URL = 'https://raw.githubusercontent.com/Mearman/hobby.ninja/main';

/**
 * Get the CDN base URL from environment or use default
 */
export function getCdnBaseUrl(): string {
	// In Next.js server context, use NEXT_PUBLIC_ASSET_CDN_URL
	if (typeof process !== 'undefined' && process.env['NEXT_PUBLIC_ASSET_CDN_URL']) {
		return process.env['NEXT_PUBLIC_ASSET_CDN_URL'];
	}

	// In browser context, use window variable (set during build/deployment)
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (typeof window !== 'undefined') {
		const windowAsAny = window as unknown as Record<string, unknown>;
		const cdnUrl = windowAsAny['__ASSET_CDN_URL__'];
		if (cdnUrl) {
			return cdnUrl as string;
		}
	}

	return DEFAULT_CDN_URL;
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

export type { };
