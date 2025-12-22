/**
 * Helper to update the manuals index (data/src/manuals/index.json)
 * when the scraper discovers valid/invalid manual IDs.
 *
 * Simpler than ItemsIndexUpdater - no global site tracking, no individual files.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { resolveWorkspacePath } from "@hobby-ninja/utils/workspace";

const MANUALS_INDEX_PATH = resolveWorkspacePath("data/src/manuals/index.json");

// Helper function to get current ISO timestamp
const getCurrentTimestamp = (): string => getCurrentTimestamp();

interface ManualIndexEntry {
	hasPage: boolean;
	checkedAt: string;
	name?: string;
	error?: string;
}

interface ManualsIndex {
	version: string;
	updatedAt: string;
	stats: {
		totalChecked: number;
		withPage: number;
		withoutPage: number;
		errors: number;
	};
	manuals: Record<string, ManualIndexEntry>;
}

let manualsIndex: ManualsIndex | null = null;
let isDirty = false;

function createEmptyIndex(): ManualsIndex {
	return {
		version: "1.0.0",
		updatedAt: getCurrentTimestamp(),
		stats: {
			totalChecked: 0,
			withPage: 0,
			withoutPage: 0,
			errors: 0,
		},
		manuals: {},
	};
}

function calculateStats(manuals: Record<string, ManualIndexEntry>): ManualsIndex["stats"] {
	const entries = Object.values(manuals);
	return {
		totalChecked: entries.length,
		withPage: entries.filter((e) => e.hasPage).length,
		withoutPage: entries.filter((e) => !e.hasPage && !e.error).length,
		errors: entries.filter((e) => e.error).length,
	};
}

/**
 * Utility class for updating the manuals index during scraping
 */
export const ManualsIndexUpdater = {
	/**
	 * Load the manuals index from disk
	 */
	load(): void {
		if (manualsIndex) return;

		try {
			manualsIndex = existsSync(MANUALS_INDEX_PATH)
				? JSON.parse(readFileSync(MANUALS_INDEX_PATH, "utf8")) as ManualsIndex
				: createEmptyIndex();
		} catch {
			manualsIndex = createEmptyIndex();
		}
		isDirty = false;
	},

	/**
	 * Record a valid manual
	 */
	recordValid(manualId: string, name?: string): void {
		if (!manualsIndex) this.load();
		if (!manualsIndex) return;

		const entry = manualsIndex.manuals[manualId];
		if (!entry) {
			manualsIndex.manuals[manualId] = {
				hasPage: true,
				checkedAt: getCurrentTimestamp(),
				name,
			};
			isDirty = true;
		}
	},

	/**
	 * Record an invalid (404) manual
	 */
	recordInvalid(manualId: string, error?: string): void {
		if (!manualsIndex) this.load();
		if (!manualsIndex) return;

		const entry = manualsIndex.manuals[manualId];
		if (!entry) {
			manualsIndex.manuals[manualId] = {
				hasPage: false,
				checkedAt: getCurrentTimestamp(),
				error,
			};
			isDirty = true;
		}
	},

	/**
	 * Update checkedAt timestamp for a manual (mark as recently checked)
	 */
	recordChecked(manualId: string, name?: string): void {
		if (!manualsIndex) this.load();
		if (!manualsIndex) return;

		const entry = manualsIndex.manuals[manualId];
		if (entry) {
			entry.checkedAt = getCurrentTimestamp();
			if (name) entry.name = name;
			isDirty = true;
		} else {
			// New entry - assume valid if being checked
			manualsIndex.manuals[manualId] = {
				hasPage: true,
				checkedAt: getCurrentTimestamp(),
				name,
			};
			isDirty = true;
		}
	},

	/**
	 * Save the manuals index to disk if changed
	 */
	save(): void {
		if (!manualsIndex || !isDirty) return;

		try {
			manualsIndex.stats = calculateStats(manualsIndex.manuals);
			manualsIndex.updatedAt = getCurrentTimestamp();
			writeFileSync(MANUALS_INDEX_PATH, JSON.stringify(manualsIndex, null, "\t"));
			isDirty = false;
		} catch (error) {
			console.warn(`⚠️  Failed to save manuals index: ${error instanceof Error ? error.message : String(error)}`);
		}
	},

	/**
	 * Get current stats
	 */
	getStats(): ManualsIndex["stats"] | null {
		if (!manualsIndex) this.load();
		return manualsIndex?.stats ?? null;
	},

	/**
	 * Check if a manual ID is already indexed
	 */
	isIndexed(manualId: string): { indexed: boolean; hasPage?: boolean; name?: string } {
		if (!manualsIndex) this.load();
		if (!manualsIndex) return { indexed: false };

		const entry = manualsIndex.manuals[manualId];
		if (!entry) {
			return { indexed: false };
		}

		return {
			indexed: true,
			hasPage: entry.hasPage,
			name: entry.name,
		};
	},

	/**
	 * Check if a manual was recently checked (within specified hours)
	 */
	wasRecentlyChecked(manualId: string, maxAgeHours = 168): boolean { // Default 7 days (168 hours)
		if (!manualsIndex) this.load();
		if (!manualsIndex) return false;

		const entry = manualsIndex.manuals[manualId];
		if (!entry?.checkedAt) return false;

		const checkTime = new Date(entry.checkedAt).getTime();
		const maxAge = maxAgeHours * 60 * 60 * 1000;
		const now = Date.now();

		return (now - checkTime) <= maxAge;
	},

	/**
	 * Get IDs not yet checked
	 */
	getUncheckedIds(ids: string[]): string[] {
		if (!manualsIndex) this.load();
		if (!manualsIndex) return ids;

		return ids.filter((id) => !manualsIndex?.manuals[id]);
	},

	/**
	 * Get IDs that need re-checking (not checked or checked too long ago)
	 */
	getStaleIds(ids: string[], maxAgeHours = 168): string[] {
		if (!manualsIndex) this.load();
		if (!manualsIndex) return ids;

		return ids.filter((id) => !this.wasRecentlyChecked(id, maxAgeHours));
	},

	/**
	 * Get all manual IDs that have pages
	 */
	getIdsWithPages(): string[] {
		if (!manualsIndex) this.load();
		if (!manualsIndex) return [];

		return Object.entries(manualsIndex.manuals)
			.filter(([_, entry]) => entry.hasPage)
			.map(([id]) => id);
	},

	/**
	 * Get stats for display
	 */
	getDisplayStats(): { valid: number; invalid: number; totalChecked: number } {
		if (!manualsIndex) this.load();
		if (!manualsIndex) return { valid: 0, invalid: 0, totalChecked: 0 };

		const entries = Object.values(manualsIndex.manuals);

		return {
			valid: entries.filter((e) => e.hasPage).length,
			invalid: entries.filter((e) => !e.hasPage).length,
			totalChecked: entries.length,
		};
	},
};
