/**
 * Cache management utilities for HTML file caching
 *
 * Provides functions to check cache validity, read cached HTML, and write HTML to cache.
 * Uses file modification time to determine cache age and validity.
 */

import { promises as fs } from "node:fs";

import { MS_PER_SECOND, SECONDS_PER_MINUTE, MINUTES_PER_HOUR, HOURS_PER_DAY } from "./types.js";

export interface CacheCheckResult {
	isValid: boolean;
	ageMinutes: number;
	ageHours: number;
}

/**
 * Calculate max age in milliseconds from days
 */
export function calculateMaxAgeMs(maxAgeDays: number): number {
	return maxAgeDays * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
}

/**
 * Check if a cached file is still valid based on max age
 *
 * @param filePath - Path to the cached file
 * @param maxAgeDays - Maximum age in days (0 = always valid)
 * @returns Cache check result with validity and age, or null if file doesn't exist
 */
export async function checkCacheValidity(
	filePath: string,
	maxAgeDays: number,
): Promise<CacheCheckResult | null> {
	try {
		const stat = await fs.stat(filePath);
		const ageMs = Date.now() - stat.mtimeMs;
		const maxAgeMs = calculateMaxAgeMs(maxAgeDays);

		const ageMinutes = Math.round(ageMs / MS_PER_SECOND / SECONDS_PER_MINUTE);
		const ageHours = Math.round(ageMs / MS_PER_SECOND / SECONDS_PER_MINUTE / MINUTES_PER_HOUR);

		const isValid = maxAgeMs === 0 || ageMs < maxAgeMs;

		return {
			isValid,
			ageMinutes,
			ageHours,
		};
	} catch {
		// File doesn't exist or can't be accessed
		return null;
	}
}

/**
 * Read cached HTML if valid
 *
 * @param filePath - Path to the cached HTML file
 * @param maxAgeDays - Maximum age in days (0 = always valid)
 * @returns HTML content and age if cache is valid, null otherwise
 */
export async function readCachedHtml(
	filePath: string,
	maxAgeDays: number,
): Promise<{ html: string; ageMinutes: number } | null> {
	const cacheCheck = await checkCacheValidity(filePath, maxAgeDays);

	if (!cacheCheck) {
		// File doesn't exist
		return null;
	}

	if (!cacheCheck.isValid) {
		// Cache exists but is too old
		return null;
	}

	try {
		const html = await fs.readFile(filePath, "utf8");
		return {
			html,
			ageMinutes: cacheCheck.ageMinutes,
		};
	} catch {
		// File existed during stat but failed to read
		return null;
	}
}

/**
 * Write HTML to cache file
 *
 * @param filePath - Path where the HTML should be cached
 * @param html - HTML content to write
 */
export async function writeCachedHtml(filePath: string, html: string): Promise<void> {
	await fs.writeFile(filePath, html, "utf8");
}
