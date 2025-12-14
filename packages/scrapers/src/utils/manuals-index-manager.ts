/**
 * Manuals Index Manager
 *
 * Manages centralized tracking of manual ID availability on
 * manual.bandai-hobby.net/menus/detail/{id}/
 *
 * Stored in data/src/manuals/index.json (version controlled)
 *
 * Features:
 * - Individual entries for valid manuals (with metadata)
 * - Compact invalid ranges for contiguous non-existent IDs
 * - Range merging for efficient storage
 */

import { promises as fs } from "node:fs";
import { dirname } from "node:path";

import type {
	ManualsIndex,
	ManualStatus,
	InvalidRange,
} from "@hobby-ninja/types/catalog";

/** Data to update for a manual status */
export interface ManualUpdateData {
	hasPage: boolean;
	name?: string;
	error?: string;
}

/**
 * Manages the manuals index file for tracking page availability
 */
export class ManualsIndexManager {
	private index: ManualsIndex;
	private dirty = false;

	constructor(private indexPath: string = "data/src/manuals/index.json") {
		this.index = this.createEmptyIndex();
	}

	/**
	 * Load index from disk or create new if doesn't exist
	 */
	async load(): Promise<void> {
		try {
			const data = await fs.readFile(this.indexPath, "utf8");
			this.index = JSON.parse(data) as ManualsIndex;
			this.dirty = false;
		} catch {
			// Index doesn't exist yet, start with empty
			this.index = this.createEmptyIndex();
			this.dirty = true;
		}
	}

	/**
	 * Create an empty index structure
	 */
	private createEmptyIndex(): ManualsIndex {
		return {
			version: "1.0.0",
			updatedAt: new Date().toISOString(),
			stats: {
				totalChecked: 0,
				withPage: 0,
				withoutPage: 0,
				errors: 0,
			},
			manuals: {},
			invalidRanges: [],
		};
	}

	/**
	 * Pad manual ID to 4 digits (e.g., 1 -> "0001")
	 */
	private padId(id: number | string): string {
		const numId = typeof id === "string" ? parseInt(id, 10) : id;
		return numId.toString().padStart(4, "0");
	}

	/**
	 * Update status for a manual ID
	 */
	updateManualStatus(id: number | string, data: ManualUpdateData): void {
		const paddedId = this.padId(id);

		const status: ManualStatus = {
			hasPage: data.hasPage,
			checkedAt: new Date().toISOString(),
		};

		if (data.name) {
			status.name = data.name;
		}

		if (data.error) {
			status.error = data.error;
		}

		this.index.manuals[paddedId] = status;
		this.dirty = true;
	}

	/**
	 * Get status for a specific manual
	 */
	getManualStatus(id: number | string): ManualStatus | undefined {
		return this.index.manuals[this.padId(id)];
	}

	/**
	 * Check if a manual ID is known to be invalid (in ranges)
	 */
	isKnownInvalid(id: number): boolean {
		return this.index.invalidRanges.some(
			(range) => id >= range.start && id <= range.end,
		);
	}

	/**
	 * Check if a manual has been checked (either in manuals map or invalid ranges)
	 */
	isChecked(id: number | string): boolean {
		const numId = typeof id === "string" ? parseInt(id, 10) : id;
		const paddedId = this.padId(numId);
		return (
			this.index.manuals[paddedId] !== undefined || this.isKnownInvalid(numId)
		);
	}

	/**
	 * Add a range of invalid IDs (compact storage)
	 */
	addInvalidRange(start: number, end: number): void {
		if (start > end) {
			[start, end] = [end, start];
		}

		this.index.invalidRanges.push({
			start,
			end,
			checkedAt: new Date().toISOString(),
		});

		// Merge overlapping/adjacent ranges
		this.mergeInvalidRanges();
		this.dirty = true;
	}

	/**
	 * Merge overlapping or adjacent invalid ranges
	 */
	private mergeInvalidRanges(): void {
		if (this.index.invalidRanges.length <= 1) {
			return;
		}

		// Sort by start
		const sorted = [...this.index.invalidRanges].sort(
			(a, b) => a.start - b.start,
		);

		const merged: InvalidRange[] = [sorted[0]];

		for (let i = 1; i < sorted.length; i++) {
			const current = sorted[i];
			const last = merged[merged.length - 1];

			// Check if ranges overlap or are adjacent
			if (current.start <= last.end + 1) {
				// Merge: extend the last range
				last.end = Math.max(last.end, current.end);
				// Use the more recent checkedAt
				if (current.checkedAt > last.checkedAt) {
					last.checkedAt = current.checkedAt;
				}
			} else {
				// No overlap, add as new range
				merged.push(current);
			}
		}

		this.index.invalidRanges = merged;
	}

	/**
	 * Get IDs not yet checked (not in manuals map and not in invalid ranges)
	 */
	getUncheckedIds(startId: number, endId: number): number[] {
		const unchecked: number[] = [];
		for (let id = startId; id <= endId; id++) {
			if (!this.isChecked(id)) {
				unchecked.push(id);
			}
		}
		return unchecked;
	}

	/**
	 * Get all manual IDs that have pages
	 */
	getManualsWithPage(): string[] {
		return Object.entries(this.index.manuals)
			.filter(([, status]) => status.hasPage)
			.map(([id]) => id);
	}

	/**
	 * Get manuals with errors (for retry)
	 */
	getManualsWithErrors(): string[] {
		return Object.entries(this.index.manuals)
			.filter(([, status]) => status.error)
			.map(([id]) => id);
	}

	/**
	 * Calculate total count of invalid IDs from ranges
	 */
	private countInvalidRangeIds(): number {
		return this.index.invalidRanges.reduce(
			(total, range) => total + (range.end - range.start + 1),
			0,
		);
	}

	/**
	 * Recalculate stats and save to disk
	 */
	async save(): Promise<void> {
		if (!this.dirty) {
			return;
		}

		const manualEntries = Object.values(this.index.manuals);
		const withPage = manualEntries.filter((m) => m.hasPage).length;
		const withoutPageInManuals = manualEntries.filter(
			(m) => !m.hasPage && !m.error,
		).length;
		const errors = manualEntries.filter((m) => m.error).length;
		const invalidRangeCount = this.countInvalidRangeIds();

		this.index.stats = {
			totalChecked: manualEntries.length + invalidRangeCount,
			withPage,
			withoutPage: withoutPageInManuals + invalidRangeCount,
			errors,
		};
		this.index.updatedAt = new Date().toISOString();

		// Ensure directory exists
		const dir = dirname(this.indexPath);
		try {
			await fs.access(dir);
		} catch {
			await fs.mkdir(dir, { recursive: true });
		}

		// Write atomically
		const tempPath = `${this.indexPath}.tmp.${Date.now()}`;
		try {
			await fs.writeFile(
				tempPath,
				JSON.stringify(this.index, null, "\t"),
				"utf8",
			);
			await fs.rename(tempPath, this.indexPath);
			this.dirty = false;
		} catch (error) {
			// Clean up temp file
			try {
				await fs.unlink(tempPath);
			} catch {
				// Ignore cleanup errors
			}
			throw error;
		}
	}

	/**
	 * Get current stats
	 */
	getStats(): ManualsIndex["stats"] {
		const manualEntries = Object.values(this.index.manuals);
		const withPage = manualEntries.filter((m) => m.hasPage).length;
		const withoutPageInManuals = manualEntries.filter(
			(m) => !m.hasPage && !m.error,
		).length;
		const errors = manualEntries.filter((m) => m.error).length;
		const invalidRangeCount = this.countInvalidRangeIds();

		return {
			totalChecked: manualEntries.length + invalidRangeCount,
			withPage,
			withoutPage: withoutPageInManuals + invalidRangeCount,
			errors,
		};
	}

	/**
	 * Get invalid ranges
	 */
	getInvalidRanges(): InvalidRange[] {
		return [...this.index.invalidRanges];
	}

	/**
	 * Check if index has been modified since load
	 */
	isDirty(): boolean {
		return this.dirty;
	}

	/**
	 * Migrate from old raw index format
	 * @param rawIndex The old index from data/raw/bandai/manuals/index.json
	 */
	migrateFromRawIndex(rawIndex: {
		valid?: Record<string, { id: number; isValid: boolean; lastChecked: string; hasFile: boolean; productName?: string }>;
		invalidRanges?: Array<{ start: number; end: number; lastChecked: string }>;
		invalidSingles?: number[];
	}): void {
		// Migrate valid entries
		if (rawIndex.valid) {
			for (const [, entry] of Object.entries(rawIndex.valid)) {
				const paddedId = this.padId(entry.id);
				this.index.manuals[paddedId] = {
					hasPage: entry.isValid,
					checkedAt: entry.lastChecked,
					name: entry.productName,
				};
			}
		}

		// Migrate invalid ranges
		if (rawIndex.invalidRanges) {
			for (const range of rawIndex.invalidRanges) {
				this.index.invalidRanges.push({
					start: range.start,
					end: range.end,
					checkedAt: range.lastChecked,
				});
			}
		}

		// Migrate invalid singles as single-ID ranges
		if (rawIndex.invalidSingles) {
			const now = new Date().toISOString();
			for (const id of rawIndex.invalidSingles) {
				this.index.invalidRanges.push({
					start: id,
					end: id,
					checkedAt: now,
				});
			}
		}

		// Merge all ranges
		this.mergeInvalidRanges();
		this.dirty = true;
	}
}
