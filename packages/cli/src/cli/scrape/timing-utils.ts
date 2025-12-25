/**
 * Timing utilities for profiling scrape operations
 *
 * Provides functions for measuring execution time of operations and formatting timing results.
 */

import {
	HOURS_PER_DAY,
	MINUTES_PER_HOUR,
	MS_PER_SECOND,
	SECONDS_PER_MINUTE,
	type StepTiming,
} from "./types.js";

/**
 * Calculate max age in milliseconds from days
 *
 * @param maxAgeDays - Number of days
 * @returns Age in milliseconds
 *
 * @example
 * const maxAgeMs = calculateMaxAgeMs(7); // 7 days in milliseconds
 */
export function calculateMaxAgeMs(maxAgeDays: number): number {
	return maxAgeDays * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
}

/**
 * Create a timing helper function that records execution time
 *
 * Returns a function that executes the given function and records its timing.
 * Handles both synchronous and asynchronous functions.
 *
 * @param timings - Array to store timing results
 * @returns Timing helper function
 *
 * @example
 * const timings: StepTiming[] = [];
 * const time = createTimer(timings);
 *
 * // Synchronous operation
 * const result = time('parse', () => parseData(html));
 *
 * // Asynchronous operation
 * const data = await time('fetch', async () => fetchData(url));
 */
export function createTimer(timings: StepTiming[]): <T>(name: string, fn: () => T) => T {
	return <T>(name: string, fn: () => T): T => {
		const start = performance.now();
		const result = fn();
		if (result instanceof Promise) {
			const timedPromise = result.then((r: Awaited<T>) => {
				timings.push({ name, durationMs: performance.now() - start });
				return r;
			});
			return timedPromise as T;
		}
		timings.push({ name, durationMs: performance.now() - start });
		return result;
	};
}

/**
 * Print timing summary to console
 *
 * Only prints if profile option is enabled and timings exist.
 * Format: ⏱ Timings: name=Xms, name=Yms (total=Zms)
 *
 * @param timings - Array of timing measurements
 * @param options - Options including profile flag
 *
 * @example
 * printTimings(timings, { profile: true });
 * // Output: ⏱ Timings: fetch=150ms, parse=45ms, save=30ms (total=225ms)
 */
export function printTimings(timings: StepTiming[], options: { profile?: boolean }): void {
	if (!options.profile || timings.length === 0) return;

	const total = timings.reduce((sum, t) => sum + t.durationMs, 0);
	console.log(
		`  ⏱ Timings: ${timings.map((t) => `${t.name}=${t.durationMs.toFixed(0)}ms`).join(", ")} (total=${total.toFixed(0)}ms)`,
	);
}

/**
 * Format age in milliseconds to minutes and hours
 *
 * @param ageMs - Age in milliseconds
 * @returns Object with age in minutes and hours (rounded)
 *
 * @example
 * const age = formatAge(3_600_000); // 1 hour
 * console.log(age); // { minutes: 60, hours: 1 }
 */
export function formatAge(ageMs: number): { minutes: number; hours: number } {
	const ageMinutes = Math.round(ageMs / MS_PER_SECOND / SECONDS_PER_MINUTE);
	const ageHours = Math.round(ageMs / MS_PER_SECOND / SECONDS_PER_MINUTE / MINUTES_PER_HOUR);

	return {
		minutes: ageMinutes,
		hours: ageHours,
	};
}
