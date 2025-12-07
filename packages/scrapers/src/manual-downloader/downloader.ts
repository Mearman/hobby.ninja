/**
 * Smart Manual Downloader - One Implementation That Handles Everything
 *
 * Combines optimization logic with fallback - no complexity, just works.
 */

import { promises as fs } from "node:fs";
import { join } from "node:path";

interface DownloaderOptions {
  startId?: number;
  endId?: number;
  url?: string;
  output?: string;
}

interface IndexEntry {
  id: number;
  isValid: boolean;
  lastChecked: string;
  hasFile: boolean;
}

interface InvalidRange {
  start: number;
  end: number;
  lastChecked: string;
}

interface CompactManualIndex {
  // Individual entries for valid IDs and files
  valid: Record<string, IndexEntry>;
  // Ranges of contiguous invalid IDs (2+ IDs)
  invalidRanges: InvalidRange[];
  // Single invalid IDs for tracking
  invalidSingles: number[];
  // Statistics
  totalChecked: number;
  lastUpdated: string;
}

export class Downloader {
	private adaptiveDelay = 100;
	private consecutiveErrors = 0;
	private consecutiveSuccesses = 0;
	private index: CompactManualIndex;
	private indexPath: string;
	private successCount = 0;
	private failCount = 0;
	private skippedCount = 0;

	constructor(outputDir = "data/bandai/manuals") {
		// Start fast
		this.indexPath = join(outputDir, "index.json");
		this.index = {
			valid: {},
			invalidRanges: [],
			invalidSingles: [],
			totalChecked: 0,
			lastUpdated: new Date().toISOString(),
		};
	}

	/**
   * Load the manual index from disk
   */
	private async loadIndex(): Promise<void> {
		try {
			const data = await fs.readFile(this.indexPath, "utf8");
			const parsed = JSON.parse(data);

			// Check if this is the old format (has direct id keys)
			if (this.isOldIndexFormat(parsed)) {
				this.index = this.migrateOldIndexToNewFormat(parsed);
				console.log(`🔄 Migrated old index format (${Object.keys(parsed).length} entries) to compact format`);
			} else {
				this.index = parsed;
			}
		} catch {
			// Index doesn't exist yet, start with empty
			this.index = {
				valid: {},
				invalidRanges: [],
				invalidSingles: [],
				totalChecked: 0,
				lastUpdated: new Date().toISOString(),
			};
		}
	}

	/**
   * Check if index is in old format
   */
	private isOldIndexFormat(data: any): boolean {
		// Old format has direct id keys and no 'valid'/'invalidRanges' structure
		return typeof data === "object" && !data.valid && !data.invalidRanges;
	}

	/**
   * Migrate old index format to new compact format
   */
	private migrateOldIndexToNewFormat(oldIndex: Record<string, IndexEntry>): CompactManualIndex {
		const newIndex: CompactManualIndex = {
			valid: {},
			invalidRanges: [],
			invalidSingles: [],
			totalChecked: 0,
			lastUpdated: new Date().toISOString(),
		};

		const sortedIds = Object.keys(oldIndex)
			.map(id => Number.parseInt(id, 10))
			.sort((a, b) => a - b);

		let currentInvalidRange: number[] | null = null;

		for (const id of sortedIds) {
			const entry = oldIndex[id.toString()];
			newIndex.totalChecked++;

			if (entry.isValid || entry.hasFile) {
				// If we were tracking an invalid range, close it
				if (currentInvalidRange) {
					newIndex.invalidRanges.push({
						start: currentInvalidRange[0],
						end: currentInvalidRange[1],
						lastChecked: new Date().toISOString(),
					});
					currentInvalidRange = null;
				}

				// Add to valid entries
				newIndex.valid[id.toString()] = entry;
			} else {
				// Invalid entry - try to merge with existing range or start new one
				if (currentInvalidRange && id === currentInvalidRange[1] + 1) {
					// Continue existing range
					currentInvalidRange[1] = id;
				} else {
					// Close existing range and start new one
					if (currentInvalidRange) {
						if (currentInvalidRange[1] > currentInvalidRange[0]) {
							// Multi-ID range - add to invalidRanges
							newIndex.invalidRanges.push({
								start: currentInvalidRange[0],
								end: currentInvalidRange[1],
								lastChecked: new Date().toISOString(),
							});
						} else {
							// Single ID - add to invalidSingles
							newIndex.invalidSingles.push(currentInvalidRange[0]);
						}
					}
					currentInvalidRange = [id, id];
				}
			}
		}

		// Close any remaining invalid range
		if (currentInvalidRange) {
			if (currentInvalidRange[1] > currentInvalidRange[0]) {
				// Multi-ID range - add to invalidRanges
				newIndex.invalidRanges.push({
					start: currentInvalidRange[0],
					end: currentInvalidRange[1],
					lastChecked: new Date().toISOString(),
				});
			} else {
				// Single ID - add to invalidSingles
				newIndex.invalidSingles.push(currentInvalidRange[0]);
			}
		}

		return newIndex;
	}

	/**
   * Save the manual index to disk
   */
	private async saveIndex(): Promise<void> {
		try {
			console.log(`   💾 Saving index with ${this.index.invalidSingles.length} singles and ${this.index.invalidRanges.length} ranges`);
			await fs.writeFile(this.indexPath, JSON.stringify(this.index, null, 2), "utf8");
			console.log(`   ✅ Index saved successfully`);
		} catch (error) {
			console.warn(`⚠️  Failed to save index: ${error}`);
		}
	}

	/**
   * Check if an ID has been previously verified
   */
	private isIdIndexed(id: number): IndexEntry | null {
		// Check valid entries first
		if (this.index.valid[id.toString()]) {
			return this.index.valid[id.toString()];
		}

		// Check if ID falls within any invalid range
		for (const range of this.index.invalidRanges) {
			if (id >= range.start && id <= range.end) {
				return {
					id,
					isValid: false,
					lastChecked: range.lastChecked,
					hasFile: false,
				};
			}
		}

		// Check if ID is in invalid singles
		if (this.index.invalidSingles.includes(id)) {
			return {
				id,
				isValid: false,
				lastChecked: this.index.lastUpdated,
				hasFile: false,
			};
		}

		return null;
	}

	/**
   * Record the result of checking an ID with range compression
   */
	private async recordIdCheck(id: number, isValid: boolean, hasFile = false): Promise<void> {
		this.index.totalChecked++;
		this.index.lastUpdated = new Date().toISOString();

		if (isValid || hasFile) {
			// Valid entry - store individually
			this.index.valid[id.toString()] = {
				id,
				isValid,
				lastChecked: new Date().toISOString(),
				hasFile,
			};

			// Remove from any invalid range if it exists there
			this.removeIdFromInvalidRanges(id);
		} else {
			// Invalid entry - add to singles or try to merge with ranges
			this.addInvalidId(id);
		}

		await this.saveIndex();
	}

	/**
   * Remove an ID from invalid tracking (when it becomes valid)
   */
	private removeIdFromInvalidRanges(id: number): void {
		// Remove from invalid singles
		const singlesIndex = this.index.invalidSingles.indexOf(id);
		if (singlesIndex !== -1) {
			this.index.invalidSingles.splice(singlesIndex, 1);
		}

		// Remove from invalid ranges
		const newRanges: InvalidRange[] = [];

		for (const range of this.index.invalidRanges) {
			if (id < range.start || id > range.end) {
				// Range doesn't contain this ID, keep it
				newRanges.push(range);
			} else {
				// Range contains this ID, need to split or shrink it
				if (id === range.start && id === range.end) {
					// Single ID range - remove it entirely
					continue;
				} else if (id === range.start) {
					// Remove from start
					newRanges.push({
						start: range.start + 1,
						end: range.end,
						lastChecked: range.lastChecked,
					});
				} else if (id === range.end) {
					// Remove from end
					newRanges.push({
						start: range.start,
						end: range.end - 1,
						lastChecked: range.lastChecked,
					});
				} else {
					// Split into two ranges
					newRanges.push({
						start: range.start,
						end: id - 1,
						lastChecked: range.lastChecked,
					}, {
						start: id + 1,
						end: range.end,
						lastChecked: range.lastChecked,
					});
				}
			}
		}

		this.index.invalidRanges = newRanges;
	}

	/**
   * Add an invalid ID to singles or try to merge with ranges
   */
	private addInvalidId(id: number): void {
		console.log(`   🔍 Adding invalid ID ${id} to tracking`);

		// Try to merge with existing ranges first
		const merged = this.tryMergeWithRanges(id);

		if (merged) {
			console.log(`   📝 Merged ${id} into invalidRanges`);
		} else {
			// Add to singles (will be merged to ranges later if possible)
			if (this.index.invalidSingles.includes(id)) {
				console.log(`   ⚠️  ${id} already in invalidSingles`);
			} else {
				this.index.invalidSingles.push(id);
				console.log(`   📝 Added ${id} to invalidSingles (total: ${this.index.invalidSingles.length})`);
			}
		}

		// Try to merge singles into ranges
		this.mergeSinglesIntoRanges();
	}

	/**
   * Try to merge an ID with existing ranges
   */
	private tryMergeWithRanges(id: number): boolean {
		for (let i = 0; i < this.index.invalidRanges.length; i++) {
			const range = this.index.invalidRanges[i];

			if (id === range.start - 1) {
				// Extend range backwards
				this.index.invalidRanges[i] = {
					start: id,
					end: range.end,
					lastChecked: new Date().toISOString(),
				};
				return true;
			} else if (id === range.end + 1) {
				// Extend range forwards
				this.index.invalidRanges[i] = {
					start: range.start,
					end: id,
					lastChecked: new Date().toISOString(),
				};
				return true;
			}
		}
		return false;
	}

	/**
   * Merge adjacent singles into ranges
   */
	private mergeSinglesIntoRanges(): void {
		console.log(`   🔍 mergeSinglesIntoRanges called with ${this.index.invalidSingles.length} singles: [${this.index.invalidSingles.join(", ")}]`);
		if (this.index.invalidSingles.length === 0) return;

		// Sort singles for easier merging
		const sortedSingles = [...this.index.invalidSingles].sort((a, b) => a - b);
		console.log(`   🔍 Sorted singles: [${sortedSingles.join(", ")}]`);

		const newRanges: InvalidRange[] = [];
		const newSingles: number[] = [];
		let currentRange: number[] | null = null;

		for (const id of sortedSingles) {
			if (currentRange && id === currentRange[1] + 1) {
				// Continue current range
				currentRange[1] = id;
			} else {
				// Close current range and start new one
				if (currentRange) {
					if (currentRange[1] > currentRange[0]) {
						// Multi-ID range - add to ranges
						newRanges.push({
							start: currentRange[0],
							end: currentRange[1],
							lastChecked: new Date().toISOString(),
						});
					} else {
						// Single ID - keep in singles
						newSingles.push(currentRange[0]);
					}
				}
				currentRange = [id, id];
			}
		}

		// Close final range
		if (currentRange) {
			if (currentRange[1] > currentRange[0]) {
				// Multi-ID range - add to ranges
				newRanges.push({
					start: currentRange[0],
					end: currentRange[1],
					lastChecked: new Date().toISOString(),
				});
			} else {
				// Single ID - keep in singles
				newSingles.push(currentRange[0]);
			}
		}

		// Update the index with new values
		this.index.invalidSingles = newSingles;
		this.index.invalidRanges.push(...newRanges);
		console.log(`   🔍 After merge: ${newSingles.length} singles, ${newRanges.length} ranges`);
		this.mergeAdjacentInvalidRanges();
	}

  
	/**
   * Merge adjacent invalid ranges for maximum compression
   */
	private mergeAdjacentInvalidRanges(): void {
		if (this.index.invalidRanges.length <= 1) return;

		// Sort ranges by start
		this.index.invalidRanges.sort((a, b) => a.start - b.start);

		const merged: InvalidRange[] = [];
		let current = this.index.invalidRanges[0];

		for (let i = 1; i < this.index.invalidRanges.length; i++) {
			const next = this.index.invalidRanges[i];

			if (next.start === current.end + 1) {
				// Merge adjacent ranges
				current = {
					start: current.start,
					end: next.end,
					lastChecked: Math.max(
						new Date(current.lastChecked).getTime(),
						new Date(next.lastChecked).getTime(),
					).toString(),
				};
			} else {
				merged.push(current);
				current = next;
			}
		}

		merged.push(current);
		this.index.invalidRanges = merged;
	}

	async download(options: DownloaderOptions = {}) {
		const startId = options.startId || 1;
		const endId = options.endId || 10_000;
		const baseUrl = options.url || "https://manual.bandai-hobby.net/menus/detail/";
		const outputDir = options.output || "data/bandai/manuals";

		// Update constructor if output directory is different
		this.indexPath = join(outputDir, "index.json");

		console.log(`🚀 Smart download from ID ${startId} to ${endId}`);
		console.log(`📁 Output: ${outputDir}`);
		console.log(`⚡ Adaptive speed: starts fast, slows on issues`);
		console.log(`📥 Downloads: Immediate as manuals are discovered`);

		await fs.mkdir(outputDir, { recursive: true });

		// Load existing index
		await this.loadIndex();

		// Ensure index properties are properly initialized
		if (!this.index.invalidRanges) this.index.invalidRanges = [];
		if (!this.index.invalidSingles) this.index.invalidSingles = [];

		const validEntries = Object.keys(this.index.valid).length;
		const invalidRanges = this.index.invalidRanges.length;
		const invalidSingles = this.index.invalidSingles.length;
		const totalInvalidIds = this.index.invalidRanges.reduce((sum, range) => sum + (range.end - range.start + 1), 0) + invalidSingles;
		const rangeIds = invalidRanges > 0 ? this.index.invalidRanges.reduce((sum, r) => sum + (r.end - r.start + 1), 0) : 0;
		console.log(`📊 Loaded compact index: ${validEntries} valid entries, ${invalidRanges} ranges (${rangeIds} IDs), ${invalidSingles} singles, ${this.index.totalChecked} total checked`);

		// Reset download tracking for this run
		this.successCount = 0;
		this.failCount = 0;
		this.skippedCount = 0;

		// Load existing files for tracking
		const existingFiles = new Set<number>();
		const existingFilesInRange = new Set<number>();

		try {
			const entries = await fs.readdir(outputDir, { withFileTypes: true });
			for (const entry of entries) {
				// Look for subdirectories that are numeric IDs
				if (entry.isDirectory()) {
					const id = Number.parseInt(entry.name, 10);
					if (!isNaN(id)) {
						// Check if the HTML file exists inside the subdirectory
						const htmlPath = join(outputDir, entry.name, `${id}.html`);
						try {
							await fs.access(htmlPath);
							existingFiles.add(id);

							// Only add to range set if within bounds
							if (id >= startId && id <= endId) {
								existingFilesInRange.add(id);
							}

							// Update index with existing file if not already present
							const existingEntry = this.isIdIndexed(id);
							if (!existingEntry) {
								// This file exists but isn't indexed yet - add it as valid
								await this.recordIdCheck(id, true, true);
							} else if (!existingEntry.hasFile) {
								// Entry exists but doesn't have file flag - update it
								await this.recordIdCheck(id, existingEntry.isValid, true);
							}
						} catch {
							// HTML file doesn't exist in subdirectory, skip
						}
					}
				}
			}
		} catch {
			// Directory might not exist yet
		}

		const indexedValidEntries = Object.keys(this.index.valid).length;
		console.log(`📊 Indexed ${indexedValidEntries + existingFiles.size} total entries (including ${existingFiles.size} existing files)`);
		console.log(`📁 Found ${existingFilesInRange.size} existing manuals in range ${startId}-${endId}`);

		try {
			if (existingFilesInRange.size > 0) {
				console.log(`🔍 Expanding around existing manuals...`);

				// Use only boundary points of contiguous ranges as expansion seeds
				const { boundaries: expansionSeeds, ranges } = this.getBoundarySeeds([...existingFiles]);

				console.log(`📥 Discovering and downloading new manuals...`);
				await this.expandAroundSamplesImmediate(baseUrl, startId, endId, ranges, existingFilesInRange, outputDir);
			} else {
				console.log(`📁 No existing files found, trying adaptive sampling...`);

				// Adaptive sampling phase
				const samples = this.adaptiveSampleRange(startId, endId);
				let foundValid = false;

				// Check if any samples are valid
				console.log(`🔍 Testing ${samples.length} sample points...`);
				for (const sample of samples) {
					if (await this.testUrlAndDownload(sample, baseUrl, outputDir, existingFilesInRange)) {
						foundValid = true;
						break;
					}
				}

				if (foundValid) {
					console.log(`✅ Valid manuals found - expanding from sample points...`);
					const sampleRanges = samples.map(id => ({start: id, end: id}));
					await this.expandAroundSamplesImmediate(baseUrl, startId, endId, sampleRanges, existingFilesInRange, outputDir);
				} else {
					// Fall back to linear scan if no valid samples found
					console.log(`🔄 No valid samples found, falling back to linear scan...`);
					await this.linearScanImmediate(baseUrl, startId, endId, outputDir, existingFilesInRange);
				}
			}

			// Systematic exploration of remaining unexplored territories
			console.log(`\n🗺️  Exploring unexplored territories...`);
			await this.exploreUnexploredTerritoriesImmediate(baseUrl, startId, endId, outputDir, existingFilesInRange);
		} catch (error) {
			console.error(`❌ CRITICAL ERROR during main discovery: ${error}`);
			throw error;
		}

		// Final coverage report
		console.log(`\n📊 Final Report:`);
		this.generateCoverageReport(startId, endId);

		console.log(`\n🎉 COMPLETE!`);
		console.log(`   • Downloaded: ${this.successCount}`);
		if (this.skippedCount > 0) {
			console.log(`   • Skipped (already exist): ${this.skippedCount}`);
		}
		console.log(`   • Failed: ${this.failCount}`);
		console.log(`   • Total HTTP requests: ${this.index.totalChecked}`);
		console.log(`   • Average delay: ${Math.round(this.getAverageDelay())}ms`);
		console.log(`📁 Files: ${outputDir}`);
	}

	/**
   * Generate detailed coverage report showing actual exploration vs target range
   */
	private generateCoverageReport(startId: number, endId: number): void {
		const totalRange = endId - startId + 1;

		// Count valid IDs within target range
		const validIdsInRange = Object.keys(this.index.valid)
			.map(id => Number.parseInt(id, 10))
			.filter(id => id >= startId && id <= endId);

		// Count invalid IDs within target range (both ranges and singles)
		const invalidRangesInRange = this.index.invalidRanges.filter(range =>
			range.start <= endId && range.end >= startId,
		);

		const invalidIdsInRanges = invalidRangesInRange.reduce((sum, range) => {
			const overlapStart = Math.max(range.start, startId);
			const overlapEnd = Math.min(range.end, endId);
			return sum + Math.max(0, overlapEnd - overlapStart + 1);
		}, 0);

		const invalidSinglesInRange = this.index.invalidSingles.filter(id =>
			id >= startId && id <= endId,
		);

		const totalExploredIds = validIdsInRange.length + invalidIdsInRanges + invalidSinglesInRange.length;
		const coveragePercentage = ((totalExploredIds / totalRange) * 100).toFixed(1);

		// Calculate density information
		const validDensity = validIdsInRange.length > 0 ?
			((validIdsInRange.length / totalExploredIds) * 100).toFixed(1) : "0.0";

		// Find gaps in coverage
		const gaps: Array<{start: number, end: number, size: number}> = [];
		let currentId = startId;

		while (currentId <= endId) {
			const isCovered = validIdsInRange.includes(currentId) ||
        invalidRangesInRange.some(range => currentId >= range.start && currentId <= range.end) ||
        invalidSinglesInRange.includes(currentId);

			if (!isCovered) {
				const gapStart = currentId;
				while (currentId <= endId && !validIdsInRange.includes(currentId) &&
          !invalidRangesInRange.some(range => currentId >= range.start && currentId <= range.end) &&
          !invalidSinglesInRange.includes(currentId)) {
					currentId++;
				}
				const gapEnd = currentId - 1;
				gaps.push({start: gapStart, end: gapEnd, size: gapEnd - gapStart + 1});
			}
			currentId++;
		}

		console.log(`\n📊 Coverage Report:`);
		console.log(`   Target range: ${startId.toLocaleString()}-${endId.toLocaleString()} (${totalRange.toLocaleString()} IDs)`);
		console.log(`   Explored IDs: ${totalExploredIds.toLocaleString()} (${coveragePercentage}%)`);
		console.log(`   Valid manuals: ${validIdsInRange.length.toLocaleString()} (${validDensity}% of explored)`);
		console.log(`   Invalid ranges: ${invalidRangesInRange.length} (${invalidIdsInRanges.toLocaleString()} IDs)`);
		console.log(`   Invalid singles: ${invalidSinglesInRange.toLocaleString()} IDs`);
		console.log(`   HTTP requests made: ${this.index.totalChecked.toLocaleString()}`);

		if (gaps.length > 0) {
			const totalGapSize = gaps.reduce((sum, gap) => sum + gap.size, 0);
			const largestGap = gaps.reduce((max, gap) => gap.size > max.size ? gap : max, gaps[0]);

			console.log(`   Unexplored gaps: ${gaps.length} (${totalGapSize.toLocaleString()} IDs)`);
			console.log(`   Largest gap: ${largestGap.start.toLocaleString()}-${largestGap.end.toLocaleString()} (${largestGap.size.toLocaleString()} IDs)`);

			if (gaps.length <= 5) {
				console.log(`   Gaps: ${gaps.map(gap => `${gap.start}-${gap.end}`).join(", ")}`);
			}
		} else {
			console.log(`   🎉 Complete coverage achieved! No gaps found.`);
		}

		// Efficiency metrics
		const efficiencyRate = ((validIdsInRange.length / this.index.totalChecked) * 100).toFixed(2);
		console.log(`   📈 Efficiency: ${efficiencyRate}% (${validIdsInRange.length} valid from ${this.index.totalChecked} requests)`);
	}

	/**
   * Get only boundary points of contiguous ranges as efficient seeds
   * Instead of using every existing file, only use the ends of continuous ranges
   */
	private getBoundarySeeds(sortedIds: number[]): { boundaries: number[], ranges: Array<{start: number, end: number}> } {
		if (sortedIds.length === 0) return { boundaries: [], ranges: [] };

		const boundaries: number[] = [];
		const ranges: Array<{start: number, end: number}> = [];
		sortedIds.sort((a, b) => a - b);

		let rangeStart = sortedIds[0];
		let prevId = sortedIds[0];

		for (let i = 1; i < sortedIds.length; i++) {
			const currentId = sortedIds[i];

			// Gap of more than 1 indicates end of contiguous range
			if (currentId > prevId + 1) {
				// Add boundaries of completed range
				boundaries.push(rangeStart, prevId);
				ranges.push({ start: rangeStart, end: prevId });
				rangeStart = currentId;
			}

			prevId = currentId;
		}

		// Add boundaries of final range
		boundaries.push(rangeStart, prevId);
		ranges.push({ start: rangeStart, end: prevId });

		// Remove redundant boundaries when ranges are adjacent
		const optimizedBoundaries = [];
		const sortedBoundaries = [...new Set(boundaries)].sort((a, b) => a - b);

		for (let i = 0; i < sortedBoundaries.length; i++) {
			const boundary = sortedBoundaries[i];
			const isRedundant = (i > 0 && sortedBoundaries[i - 1] + 1 === boundary) ||
                        (i < sortedBoundaries.length - 1 && sortedBoundaries[i + 1] - 1 === boundary);

			if (!isRedundant) {
				optimizedBoundaries.push(boundary);
			}
		}

		// Log the ranges being represented
		if (ranges.length > 0) {
			const rangeStrings = ranges.map(r => `${r.start}-${r.end}`);
			console.log(`   📊 Contiguous ranges detected: [${rangeStrings.join(", ")}]`);
			console.log(`   📍 Optimized boundaries: [${optimizedBoundaries.join(", ")}] (removed ${sortedBoundaries.length - optimizedBoundaries.length} redundant points)`);
		}

		return { boundaries: optimizedBoundaries, ranges };
	}

	/**
   * Sample range to find promising areas
   */
	private adaptiveSampleRange(startId: number, endId: number): number[] {
		const range = endId - startId + 1;
		const samples: number[] = [];

		// Adaptive sampling density based on range size
		let sampleCount: number;
		if (range <= 1000) {
			sampleCount = Math.min(range, 100); // Dense sampling for small ranges
		} else if (range <= 5000) {
			sampleCount = 250; // Medium sampling for medium ranges
		} else {
			sampleCount = 400; // Higher sampling for large ranges
		}

		const step = Math.ceil(range / sampleCount);

		// Regular spaced samples
		for (let i = startId; i <= endId; i += step) {
			samples.push(i);
		}

		// Add random samples to avoid systematic gaps and find isolated valid IDs
		const randomSamples = Math.floor(sampleCount * 0.25); // 25% random
		for (let i = 0; i < randomSamples; i++) {
			const randomId = startId + Math.floor(Math.random() * range);
			if (!samples.includes(randomId)) {
				samples.push(randomId);
			}
		}

		// Add boundary samples to ensure we test the edges
		samples.push(startId);
		if (endId !== startId) {
			samples.push(endId);
		}

		return samples.sort((a, b) => a - b);
	}

	/**
   * Systematic exploration of unexplored territories using adaptive sampling
   */
	private async exploreUnexploredTerritories(baseUrl: string, startId: number, endId: number, existingFiles: Set<number>): Promise<number[]> {
		const found: number[] = [];
		const chunkSize = 1000; // Process in manageable chunks

		console.log(`🗺️  Exploring unexplored territories in ${startId}-${endId}...`);

		for (let chunkStart = startId; chunkStart <= endId; chunkStart += chunkSize) {
			const chunkEnd = Math.min(chunkStart + chunkSize - 1, endId);

			// Skip if we already have significant coverage in this chunk
			const chunkValidIds = [...existingFiles].filter(id => id >= chunkStart && id <= chunkEnd);
			const chunkInvalidRanges = this.index.invalidRanges.filter(range =>
				range.start <= chunkEnd && range.end >= chunkStart,
			);

			// Count invalid singles that fall within this chunk
			const chunkInvalidSingles = this.index.invalidSingles.filter(id => id >= chunkStart && id <= chunkEnd);

			const coveredIds = chunkValidIds.length +
        chunkInvalidRanges.reduce((sum, range) => {
        	const overlapStart = Math.max(range.start, chunkStart);
        	const overlapEnd = Math.min(range.end, chunkEnd);
        	return sum + Math.max(0, overlapEnd - overlapStart + 1);
        }, 0) +
        chunkInvalidSingles.length;

			const chunkSizeActual = chunkEnd - chunkStart + 1;
			const coveragePercentage = (coveredIds / chunkSizeActual) * 100;

			// Debug: Show coverage breakdown for problematic chunks
			if (chunkStart >= 4000 && coveredIds > 0) {
				console.log(`   📊 Chunk ${chunkStart}-${chunkEnd} coverage breakdown:`);
				console.log(`      - Valid IDs: ${chunkValidIds.length}`);
				console.log(`      - Invalid ranges: ${chunkInvalidRanges.length} (${chunkInvalidRanges.reduce((sum, range) => {
					const overlapStart = Math.max(range.start, chunkStart);
					const overlapEnd = Math.min(range.end, chunkEnd);
					return sum + Math.max(0, overlapEnd - overlapStart + 1);
				}, 0)} IDs)`);
				console.log(`      - Invalid singles: ${chunkInvalidSingles.length}`);
				console.log(`      - Total covered: ${coveredIds}/${chunkSizeActual} (${coveragePercentage.toFixed(1)}%)`);
			}

			// If we have good coverage (>70%), skip this chunk
			if (coveragePercentage > 70) {
				console.log(`   ✅ Chunk ${chunkStart}-${chunkEnd} already explored (${coveragePercentage.toFixed(1)}% coverage)`);
				continue;
			}

			console.log(`   🔍 Exploring chunk ${chunkStart}-${chunkEnd} (${coveragePercentage.toFixed(1)}% coverage)...`);

			// Use adaptive sampling on this chunk
			const samples = this.adaptiveSampleRange(chunkStart, chunkEnd);
			let foundAny = false;

			for (const sample of samples) {
				if (existingFiles.has(sample) || this.isIdIndexed(sample)) {
					continue; // Skip already known IDs
				}

				if (await this.testUrl(baseUrl + sample + "/")) {
					foundAny = true;
					found.push(sample);
					console.log(`   ✅ Found valid ID in chunk: ${sample}`);
					break; // Found at least one valid ID in this chunk
				}
			}

			if (foundAny) {
				// Expand around the valid sample using binary search
				console.log(`   🔍 Expanding around found valid IDs in chunk ${chunkStart}-${chunkEnd}...`);
				const sampleRanges = samples.map(id => ({start: id, end: id}));
				const expansionResults = await this.expandAroundSamples(
					baseUrl,
					chunkStart,
					chunkEnd,
					sampleRanges,
					new Set<number>(),
				);

				for (const id of expansionResults) {
					if (!existingFiles.has(id) && !found.includes(id)) {
						found.push(id);
					}
				}

				if (expansionResults.length > 0) {
					console.log(`   📈 Expansion found ${expansionResults.length} additional valid IDs`);
				}
			} else {
				// No valid samples found in low-coverage chunk - force linear scan for complete coverage
				console.log(`   ⚠️  No valid samples found in low-coverage chunk - forcing linear scan...`);
				let linearScanFound = 0;

				for (let id = chunkStart; id <= chunkEnd; id++) {
					// Skip already known IDs
					if (existingFiles.has(id) || this.isIdIndexed(id)) {
						continue;
					}

					const isValid = await this.testUrl(baseUrl + id + "/");
					if (isValid) {
						found.push(id);
						linearScanFound++;
					}

					// Show progress every 100 IDs during linear scan
					if (id % 100 === 0) {
						console.log(`   🔍 Linear scan progress: ${id - chunkStart + 1}/${chunkSizeActual}, found: ${linearScanFound}`);
					}

					// Small delay to be reasonable
					await this.smartWait();
				}

				if (linearScanFound > 0) {
					console.log(`   ✅ Linear scan found ${linearScanFound} valid IDs in chunk ${chunkStart}-${chunkEnd}`);
				} else {
					console.log(`   ❌ Linear scan found no valid IDs in chunk ${chunkStart}-${chunkEnd}`);
				}
			}
		}

		return found;
	}

	/**
   * Intelligent range discovery with immediate downloading
   */
	private async expandAroundSamplesImmediate(baseUrl: string, startId: number, endId: number, ranges: Array<{start: number, end: number}>, existingFilesInRange: Set<number>, outputDir: string): Promise<void> {
		const found: number[] = [];
		const checked = new Set<number>();

		// Identify gaps between existing ranges where we should search
		const gapSeeds = this.getGapBasedSeeds(ranges, startId, endId);

		if (gapSeeds.length === 0) {
			console.log(`   ✅ No gaps found - all ranges already covered`);

			// Even if no gaps found, we should still explore boundaries around the outermost ranges
			// in case there are manuals outside the existing coverage
			if (ranges.length > 0) {
				console.log(`   🔍 Exploring boundaries around existing coverage...`);

				// Check before the first range
				const firstRange = ranges[0];
				if (firstRange.start > startId) {
					console.log(`   🔍 Exploring before first range (${firstRange.start})...`);
					await this.linearScanImmediate(baseUrl, startId, Math.min(firstRange.start - 1, endId), outputDir, existingFilesInRange);
				}

				// Check after the last range
				const lastRange = ranges.at(-1);
				if (lastRange.end < endId) {
					console.log(`   🔍 Exploring after last range (${lastRange.end})...`);
					await this.linearScanImmediate(baseUrl, Math.max(lastRange.end + 1, startId), endId, outputDir, existingFilesInRange);
				}
			}

			return;
		}

		console.log(`   🔍 Binary search discovery from ${gapSeeds.length} gap-based seed points...`);

		for (let i = 0; i < gapSeeds.length; i++) {
			const { seed, gapStart, gapEnd } = gapSeeds[i];

			console.log(`   🔍 Gap Seed ${i + 1}/${gapSeeds.length}: ID ${seed} (gap: ${gapStart}-${gapEnd})`);

			// Binary search for range boundaries within the gap bounds
			const range = await this.findValidRangeImmediate(baseUrl, seed, gapStart, gapEnd, existingFilesInRange, checked, outputDir);

			for (const id of range) {
				if (!existingFilesInRange.has(id)) {
					found.push(id);
				}
			}
		}

		// Save index after gap analysis to persist invalid ID tracking
		await this.saveIndex();

		console.log(`\n   ✅ Binary search complete: discovered ${found.length} new manuals`);
	}

	/**
   * Intelligent range discovery using binary search from gaps between existing ranges
   */
	private async expandAroundSamples(baseUrl: string, startId: number, endId: number, ranges: Array<{start: number, end: number}>, existingFilesInRange: Set<number>): Promise<number[]> {
		const found: number[] = [];
		const checked = new Set<number>(); // Track checked IDs to avoid duplicates

		// Identify gaps between existing ranges where we should search
		const gapSeeds = this.getGapBasedSeeds(ranges, startId, endId);

		if (gapSeeds.length === 0) {
			console.log(`   ✅ No gaps found - all ranges already covered`);
			return found;
		}

		console.log(`   🔍 Binary search discovery from ${gapSeeds.length} gap-based seed points...`);

		for (let i = 0; i < gapSeeds.length; i++) {
			const { seed, gapStart, gapEnd } = gapSeeds[i];

			console.log(`   🔍 Gap Seed ${i + 1}/${gapSeeds.length}: ID ${seed} (gap: ${gapStart}-${gapEnd})`);

			// Binary search for range boundaries within the gap bounds
			const range = await this.findValidRange(baseUrl, seed, gapStart, gapEnd, existingFilesInRange, checked);

			for (const id of range) {
				if (!existingFilesInRange.has(id)) {
					found.push(id);
					console.log(`   ✅ Found new manual: ${id}`);
				}
			}
		}

		// Save index after gap analysis to persist invalid ID tracking
		await this.saveIndex();

		console.log(`\n   ✅ Binary search complete: discovered ${found.length} new manuals`);
		return found.sort((a, b) => a - b);
	}

	/**
   * Generate seed points with gap bounds for more targeted searching
   */
	private getGapBasedSeeds(ranges: Array<{start: number, end: number}>, startId: number, endId: number): Array<{seed: number, gapStart: number, gapEnd: number}> {
		const gapSeeds: Array<{seed: number, gapStart: number, gapEnd: number}> = [];

		// Sort ranges by start ID
		const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);

		// Find gaps between existing ranges
		for (let i = 0; i < sortedRanges.length - 1; i++) {
			const currentRange = sortedRanges[i];
			const nextRange = sortedRanges[i + 1];

			// If there's a gap between this range and the next
			if (nextRange.start > currentRange.end + 1) {
				const gapStart = currentRange.end + 1;
				const gapEnd = nextRange.start - 1;

				// Check if this gap overlaps with our target range
				if (gapEnd >= startId && gapStart <= endId) {
					// Clamp gap to target range bounds
					const actualGapStart = Math.max(gapStart, startId);
					const actualGapEnd = Math.min(gapEnd, endId);

					if (actualGapEnd >= actualGapStart) {
						// Add a seed point in the middle of the gap with bounds
						const gapMiddle = Math.floor((actualGapStart + actualGapEnd) / 2);
						gapSeeds.push({ seed: gapMiddle, gapStart: actualGapStart, gapEnd: actualGapEnd });
					}
				}
			}
		}

		// Check gap before first range
		if (sortedRanges.length > 0) {
			const firstRange = sortedRanges[0];
			if (firstRange.start > startId) {
				const gapStart = startId;
				const gapEnd = firstRange.start - 1;
				const gapMiddle = Math.floor((gapStart + gapEnd) / 2);
				gapSeeds.push({ seed: gapMiddle, gapStart, gapEnd });
			}
		}

		// Check gap after last range
		if (sortedRanges.length > 0) {
			const lastRange = sortedRanges.at(-1);
			if (lastRange.end < endId) {
				const gapStart = lastRange.end + 1;
				const gapEnd = endId;
				const gapMiddle = Math.floor((gapStart + gapEnd) / 2);
				gapSeeds.push({ seed: gapMiddle, gapStart, gapEnd });
			}
		} else {
			// No ranges at all - seed the middle of the entire target range
			const gapMiddle = Math.floor((startId + endId) / 2);
			gapSeeds.push({ seed: gapMiddle, gapStart: startId, gapEnd: endId });
		}

		return gapSeeds;
	}

	/**
   * Find contiguous range of valid manuals using binary search with immediate downloading
   */
	private async findValidRangeImmediate(baseUrl: string, seedId: number, minId: number, maxId: number, existingFiles: Set<number>, checked: Set<number>, outputDir: string): Promise<number[]> {
		// Binary search to find the lower bound
		let lowerBound = minId;
		let upperBound = Math.min(seedId, maxId);
		let checksMade = 0;

		// Find start of range (search downwards from seed)
		while (lowerBound <= upperBound) {
			const mid = Math.floor((lowerBound + upperBound) / 2);
			if (mid <= 0 || existingFiles.has(mid) || checked.has(mid)) {
				lowerBound = mid + 1;
				continue;
			}

			checked.add(mid);
			checksMade++;
			if (await this.testUrlAndDownload(mid, baseUrl, outputDir, existingFiles)) {
				upperBound = mid - 1;
			} else {
				lowerBound = mid + 1;
			}
		}
		const rangeStart = lowerBound;

		// Find end of range (search upwards from seed)
		lowerBound = Math.max(seedId, minId);
		upperBound = maxId;

		while (lowerBound <= upperBound) {
			const mid = Math.floor((lowerBound + upperBound) / 2);
			if (mid > maxId || existingFiles.has(mid) || checked.has(mid)) {
				upperBound = mid - 1;
				continue;
			}

			checked.add(mid);
			checksMade++;
			if (await this.testUrlAndDownload(mid, baseUrl, outputDir, existingFiles)) {
				lowerBound = mid + 1;
			} else {
				upperBound = mid - 1;
			}
		}
		const rangeEnd = upperBound;

		// Binary search only gives us potential boundaries - verify each ID individually
		const finalStart = Math.max(rangeStart, minId);
		const finalEnd = Math.min(rangeEnd, maxId);
		const rangeSize = finalEnd - finalStart + 1;

		// Verify each ID in the potential range to prevent fake ranges
		const range: number[] = [];
		let verificationChecks = 0;

		console.log(`   🔍 Binary search suggests range ${finalStart}-${finalEnd}, verifying each ID individually...`);

		// Special case: empty range detected by binary search
		if (finalStart > finalEnd) {
			console.log(`   🔍 Empty range detected (${finalStart}-${finalEnd}), all IDs in this range are invalid`);

			// Track all invalid IDs in the detected empty gap
			const invalidIdsInGap: number[] = [];
			for (let id = finalEnd + 1; id <= finalStart - 1; id++) {
				if (!existingFiles.has(id)) {
					invalidIdsInGap.push(id);
				}
			}

			// Add invalid IDs to tracking
			if (invalidIdsInGap.length > 0) {
				for (const invalidId of invalidIdsInGap) {
					this.addInvalidId(invalidId);
				}
				console.log(`   📍 Tracking ${invalidIdsInGap.length} invalid IDs in empty range`);
			}
		} else {
			// Normal case: verify each ID in the range
			for (let id = finalStart; id <= finalEnd; id++) {
				if (!existingFiles.has(id)) {
					verificationChecks++;
					if (await this.testUrlAndDownload(id, baseUrl, outputDir, existingFiles)) {
						range.push(id);
					}
				}
			}
		}

		// Track invalid IDs from normal verification case
		if (finalStart <= finalEnd) {
			const invalidIdsInGap: number[] = [];
			for (let id = finalStart; id <= finalEnd; id++) {
				if (!existingFiles.has(id) && !range.includes(id)) {
					invalidIdsInGap.push(id);
				}
			}

			// Add invalid IDs to tracking (batch operation for efficiency)
			if (invalidIdsInGap.length > 0) {
				for (const invalidId of invalidIdsInGap) {
					this.addInvalidId(invalidId);
				}
				console.log(`   📍 Tracking ${invalidIdsInGap.length} invalid IDs in range ${finalStart}-${finalEnd}`);
			}
		}

		const totalChecks = checksMade + verificationChecks;
		console.log(`   ✅ Gap analysis complete: ${checksMade} binary search + ${verificationChecks} verification checks, found ${range.length} valid manuals`);

		if (range.length > 0) {
			console.log(`   📍 Found range ${range[0]}-${range.at(-1)} (${range.length} manuals)`);
		}

		return range;
	}

	/**
   * Linear scan with immediate downloading
   */
	private async linearScanImmediate(baseUrl: string, startId: number, endId: number, outputDir: string, existingFiles: Set<number>): Promise<void> {
		console.log(`🔄 Linear scanning ${startId}-${endId}...`);

		for (let id = startId; id <= endId; id++) {
			try {
				await this.testUrlAndDownload(id, baseUrl, outputDir, existingFiles);
			} catch (error) {
				console.log(`   ❌ Error testing ID ${id}: ${error}`);
				this.failCount++;
			}

			// Show progress every 50 IDs
			if (id % 50 === 0) {
				const progress = id - startId + 1;
				const total = endId - startId + 1;
				process.stdout.write(`\r🔍 Linear scan: ${progress}/${total} ✓${this.successCount} ✗${this.failCount} ⏭${this.skippedCount}`);
			}
		}

		console.log(`\n✅ Linear scan complete`);
	}

	/**
   * Systematic exploration of unexplored territories with immediate downloading
   */
	private async exploreUnexploredTerritoriesImmediate(baseUrl: string, startId: number, endId: number, outputDir: string, existingFiles: Set<number>): Promise<void> {
		const chunkSize = 1000;

		for (let chunkStart = startId; chunkStart <= endId; chunkStart += chunkSize) {
			const chunkEnd = Math.min(chunkStart + chunkSize - 1, endId);

			// Skip if we already have significant coverage in this chunk
			const chunkValidIds = [...existingFiles].filter(id => id >= chunkStart && id <= chunkEnd);
			const chunkInvalidRanges = this.index.invalidRanges.filter(range =>
				range.start <= chunkEnd && range.end >= chunkStart,
			);

			// Count invalid singles that fall within this chunk
			const chunkInvalidSingles = this.index.invalidSingles.filter(id => id >= chunkStart && id <= chunkEnd);

			const coveredIds = chunkValidIds.length +
        chunkInvalidRanges.reduce((sum, range) => {
        	const overlapStart = Math.max(range.start, chunkStart);
        	const overlapEnd = Math.min(range.end, chunkEnd);
        	return sum + Math.max(0, overlapEnd - overlapStart + 1);
        }, 0) +
        chunkInvalidSingles.length;

			const chunkSizeActual = chunkEnd - chunkStart + 1;
			const coveragePercentage = (coveredIds / chunkSizeActual) * 100;

			// If we have good coverage (>70%), skip this chunk
			if (coveragePercentage > 70) {
				console.log(`   ✅ Chunk ${chunkStart}-${chunkEnd} already explored (${coveragePercentage.toFixed(1)}% coverage)`);
				continue;
			}

			console.log(`   🔍 Exploring chunk ${chunkStart}-${chunkEnd} (${coveragePercentage.toFixed(1)}% coverage)...`);

			// Use adaptive sampling on this chunk
			const samples = this.adaptiveSampleRange(chunkStart, chunkEnd);
			let foundAny = false;

			for (const sample of samples) {
				if (existingFiles.has(sample) || this.isIdIndexed(sample)) {
					continue;
				}

				if (await this.testUrlAndDownload(sample, baseUrl, outputDir, existingFiles)) {
					foundAny = true;
					console.log(`   ✅ Found valid manual in chunk: ${sample}`);
					break;
				}
			}

			if (foundAny) {
				// Expand around the valid sample using binary search
				console.log(`   🔍 Expanding around found valid manuals in chunk ${chunkStart}-${chunkEnd}...`);
				const sampleRanges = samples.map(id => ({start: id, end: id}));
				await this.expandAroundSamplesImmediate(baseUrl, chunkStart, chunkEnd, sampleRanges, existingFiles, outputDir);
			}
		}
	}

	/**
   * Find contiguous range of valid manuals using binary search
   */
	private async findValidRange(baseUrl: string, seedId: number, minId: number, maxId: number, existingFiles: Set<number>, checked: Set<number>): Promise<number[]> {
		// Binary search to find the lower bound
		let lowerBound = minId;
		let upperBound = Math.min(seedId, maxId);
		let checksMade = 0;

		// Find start of range (search downwards from seed)
		while (lowerBound <= upperBound) {
			const mid = Math.floor((lowerBound + upperBound) / 2);
			if (mid <= 0 || existingFiles.has(mid) || checked.has(mid)) {
				lowerBound = mid + 1;
				continue;
			}

			checked.add(mid);
			checksMade++;
			if (await this.testUrl(baseUrl + mid + "/")) {
				upperBound = mid - 1;
			} else {
				lowerBound = mid + 1;
			}
		}
		const rangeStart = lowerBound;

		// Find end of range (search upwards from seed)
		lowerBound = Math.max(seedId, minId);
		upperBound = maxId;

		while (lowerBound <= upperBound) {
			const mid = Math.floor((lowerBound + upperBound) / 2);
			if (mid > maxId || existingFiles.has(mid) || checked.has(mid)) {
				upperBound = mid - 1;
				continue;
			}

			checked.add(mid);
			checksMade++;
			if (await this.testUrl(baseUrl + mid + "/")) {
				lowerBound = mid + 1;
			} else {
				upperBound = mid - 1;
			}
		}
		const rangeEnd = upperBound;

		// Binary search only gives us potential boundaries - verify each ID individually
		const finalStart = Math.max(rangeStart, minId);
		const finalEnd = Math.min(rangeEnd, maxId);
		const rangeSize = finalEnd - finalStart + 1;

		// Verify each ID in the potential range to prevent fake ranges
		const range: number[] = [];
		let verificationChecks = 0;

		console.log(`   🔍 Binary search suggests range ${finalStart}-${finalEnd}, verifying each ID individually...`);

		// Special case: empty range detected by binary search
		if (finalStart > finalEnd) {
			console.log(`   🔍 Empty range detected (${finalStart}-${finalEnd}), all IDs in this range are invalid`);

			// Track all invalid IDs in the detected empty gap
			const invalidIdsInGap: number[] = [];
			for (let id = finalEnd + 1; id <= finalStart - 1; id++) {
				if (!existingFiles.has(id)) {
					invalidIdsInGap.push(id);
				}
			}

			// Add invalid IDs to tracking
			if (invalidIdsInGap.length > 0) {
				for (const invalidId of invalidIdsInGap) {
					this.addInvalidId(invalidId);
				}
				console.log(`   📍 Tracking ${invalidIdsInGap.length} invalid IDs in empty range`);
			}
		} else {
			// Normal case: verify each ID in the range
			for (let id = finalStart; id <= finalEnd; id++) {
				if (!existingFiles.has(id)) {
					verificationChecks++;
					if (await this.testUrl(baseUrl + id + "/")) {
						range.push(id);
					}
				}
			}
		}

		// Track invalid IDs from normal verification case
		if (finalStart <= finalEnd) {
			const invalidIdsInGap: number[] = [];
			for (let id = finalStart; id <= finalEnd; id++) {
				if (!existingFiles.has(id) && !range.includes(id)) {
					invalidIdsInGap.push(id);
				}
			}

			// Add invalid IDs to tracking (batch operation for efficiency)
			if (invalidIdsInGap.length > 0) {
				for (const invalidId of invalidIdsInGap) {
					this.addInvalidId(invalidId);
				}
				console.log(`   📍 Tracking ${invalidIdsInGap.length} invalid IDs in range ${finalStart}-${finalEnd}`);
			}
		}

		const totalChecks = checksMade + verificationChecks;
		console.log(`   ✅ Gap analysis complete: ${checksMade} binary search + ${verificationChecks} verification checks, found ${range.length} valid manuals`);

		if (range.length > 0) {
			console.log(`   📍 Found range ${range[0]}-${range.at(-1)} (${range.length} manuals)`);
		}

		return range;
	}

	/**
   * Test if URL contains valid manual content with index integration
   */
	private async testUrl(url: string): Promise<boolean> {
		// Extract ID from URL
		const idMatch = /\/(\d+)\/?$/.exec(url);
		if (!idMatch) {
			return false;
		}

		const id = Number.parseInt(idMatch[1], 10);

		// Check if we already have this ID in the index
		const indexedEntry = this.isIdIndexed(id);
		if (indexedEntry) {
			// Return cached result if we have it
			return indexedEntry.isValid;
		}

		// Need to check this URL - perform the actual validation
		let isValid = false;
		try {
			// Configure fetch to NOT follow redirects automatically
			const fetchOptions = {
				method: "HEAD", // Fast check first
				headers: {
					"User-Agent": "Mozilla/5.0 (compatible; ManualDownloader/1.0)",
				},
				redirect: "manual" as RequestRedirect, // Don't follow redirects automatically
			};

			const response = await fetch(url, fetchOptions);

			// Check for HTTP-level redirects (302, 301, etc.) - these are invalid
			if (response.status >= 300 && response.status < 400) {
				isValid = false;
			} else if (response.ok) {
				isValid = true;
			} else {
				// If HEAD fails, try GET (some servers don't support HEAD)
				const getResponse = await fetch(url, {
					headers: {
						"User-Agent": "Mozilla/5.0 (compatible; ManualDownloader/1.0)",
						"Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
					},
					redirect: "manual" as RequestRedirect, // Don't follow redirects automatically
				});

				// Check for HTTP-level redirects in GET request
				if (getResponse.status >= 300 && getResponse.status < 400) {
					isValid = false;
				} else if (getResponse.ok) {
					const data = await getResponse.text();

					// Basic HTML and content validation
					if (data.length > 1000 && (data.includes("<html") || data.includes("<!DOCTYPE"))) {

						// REJECT: Generic pages with default title (INVALID)
						// Generic pages have: content=" バンダイプラモデルWEB取説 | バンダイ ホビーサイト"
						const genericTitlePattern = /content="\s*バンダイプラモデルWEB取説\s*\|\s*バンダイ ホビーサイト/;
						if (genericTitlePattern.test(data)) {
							isValid = false;
						}
						// REJECT: Pages that are error pages or content-level redirects
						else if (this.isErrorPage(data)) {
							isValid = false;
						}
						// ACCEPT: All other valid HTML pages (inclusive approach)
						// Include any content that's not generic, error, or redirect
						else {
							isValid = true;
						}
					}
				}
			}

			// Record the result in the index
			await this.recordIdCheck(id, isValid);
			return isValid;

		} catch {
			// Record failed checks as invalid
			await this.recordIdCheck(id, false);
			return false;
		}
	}

  
	/**
   * Download manual immediately when discovered
   */
	private async downloadManual(id: number, url: string, outputDir: string): Promise<boolean> {
		try {
			// Adaptive wait before download
			await this.smartWait();

			// Download the manual
			const response = await fetch(url, {
				method: "GET",
				headers: {
					"User-Agent": "Mozilla/5.0 (compatible; ManualDownloader/1.0)",
					"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				},
			});

			if (response.ok) {
				const data = await response.text();

				if (data.length > 1000 && (data.includes("<html") || data.includes("<!DOCTYPE"))) {
					// Create subdirectory for this manual
					const idDir = join(outputDir, id.toString());
					await fs.mkdir(idDir, { recursive: true });

					// Save HTML file inside subdirectory
					const filePath = join(idDir, `${id}.html`);
					await fs.writeFile(filePath, data, "utf8");

					console.log(`\n✅ Downloaded: ${id}/${id}.html (${data.length.toLocaleString()} bytes)`);

					this.consecutiveSuccesses++;
					this.consecutiveErrors = 0;
					this.optimizeDelay(true);

					return true;
				}
			}

			this.consecutiveErrors++;
			this.consecutiveSuccesses = 0;
			this.optimizeDelay(false);
			return false;

		} catch {
			this.consecutiveErrors++;
			this.consecutiveSuccesses = 0;
			this.optimizeDelay(false);
			return false;
		}
	}

	/**
   * Test URL and download immediately if valid
   */
	private async testUrlAndDownload(id: number, baseUrl: string, outputDir: string, existingFiles: Set<number>): Promise<boolean> {
		const url = `${baseUrl}${id}/`;

		// Check if file already exists
		if (existingFiles.has(id)) {
			console.log(`⏭ Skipped: ${id}/${id}.html (already exists)`);
			this.skippedCount++;
			return true;
		}

		// Check if we already have this ID in the index
		const indexedEntry = this.isIdIndexed(id);
		if (indexedEntry) {
			// If indexed as valid and has file, skip
			if (indexedEntry.hasFile) {
				console.log(`⏭ Skipped: ${id}/${id}.html (indexed as existing)`);
				this.skippedCount++;
				return true;
			}
			// If indexed as valid but no file, download it
			if (indexedEntry.isValid && !indexedEntry.hasFile) {
				const downloaded = await this.downloadManual(id, url, outputDir);
				if (downloaded) {
					this.successCount++;
					await this.recordIdCheck(id, true, true);
				} else {
					this.failCount++;
				}
				return downloaded;
			}
			// If indexed as invalid, skip
			return false;
		}

		// Need to check this URL - perform validation and download
		let isValid = false;
		try {
			// Configure fetch to NOT follow redirects automatically
			const fetchOptions = {
				method: "HEAD",
				headers: {
					"User-Agent": "Mozilla/5.0 (compatible; ManualDownloader/1.0)",
				},
				redirect: "manual" as RequestRedirect,
			};

			const response = await fetch(url, fetchOptions);

			// Check for HTTP-level redirects (302, 301, etc.) - these are invalid
			if (response.status >= 300 && response.status < 400) {
				isValid = false;
			} else if (response.ok) {
				isValid = true;
			} else {
				// If HEAD fails, try GET (some servers don't support HEAD)
				const getResponse = await fetch(url, {
					headers: {
						"User-Agent": "Mozilla/5.0 (compatible; ManualDownloader/1.0)",
						"Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
					},
					redirect: "manual" as RequestRedirect,
				});

				// Check for HTTP-level redirects in GET request
				if (getResponse.status >= 300 && getResponse.status < 400) {
					isValid = false;
				} else if (getResponse.ok) {
					const data = await getResponse.text();

					// Basic HTML and content validation
					if (data.length > 1000 && (data.includes("<html") || data.includes("<!DOCTYPE"))) {
						// REJECT: Generic pages with default title (INVALID)
						const genericTitlePattern = /content="\s*バンダイプラモデルWEB取説\s*\|\s*バンダイ ホビーサイト/;
						if (genericTitlePattern.test(data)) {
							isValid = false;
						} else if (this.isErrorPage(data)) {
							isValid = false;
						} else {
							isValid = true;
						}
					}
				}
			}

			// Record the result in the index
			await this.recordIdCheck(id, isValid, false);

			// If valid, download immediately
			if (isValid) {
				process.stdout.write(`\r📥 Found valid: ${id}/${id}.html, downloading...`);

				const downloaded = await this.downloadManual(id, url, outputDir);
				if (downloaded) {
					this.successCount++;
					await this.recordIdCheck(id, true, true);
				} else {
					this.failCount++;
				}
				return downloaded;
			} else {
				return false;
			}

		} catch {
			// Record failed checks as invalid
			await this.recordIdCheck(id, false);
			return false;
		}
	}

	/**
   * Check if page is an error page or redirect
   */
	private isErrorPage(data: string): boolean {
		const errorPatterns = [
			// HTTP error codes in content
			/(404|500|403|401)\s*(Not Found|Internal Server Error|Forbidden|Unauthorized)/i,
			// Japanese error messages
			/ページが見つかりません|エラーが発生しました|アクセスできません/,
			// Redirect indicators (JavaScript and meta refresh)
			/location\.replace|window\.location|meta.*http-equiv="refresh"/i,
			// Maintenance pages
			/メンテナンス中|under maintenance|一時的に利用できません/,
			// Redirect to main site detection
			/manual\.bandai-hobby\.net\/[\/]?$/i,
			// Generic redirect patterns
			/top\.html|index\.html|\/$/i,
		];

		for (const pattern of errorPatterns) {
			if (pattern.test(data)) {
				return true;
			}
		}

		return false;
	}

	/**
   * Smart adaptive waiting
   */
	private async smartWait(): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, this.adaptiveDelay));
	}

	/**
   * Optimize delay based on success/failure patterns
   */
	private optimizeDelay(success: boolean): void {
		if (success) {
			// On success, gradually reduce delay
			if (this.consecutiveSuccesses >= 3 && this.adaptiveDelay > 50) {
				this.adaptiveDelay = Math.max(50, this.adaptiveDelay * 0.9);
			}
		} else {
			// On error, increase delay
			if (this.consecutiveErrors >= 2) {
				this.adaptiveDelay = Math.min(8000, this.adaptiveDelay * 1.5);
			}
		}
	}

	/**
   * Get current average delay
   */
	private getAverageDelay(): number {
		return this.adaptiveDelay;
	}

	/**
   * Pad existing files with zeros when hitting a new power of 10
   */
	private async padExistingFiles(outputDir: string, oldPadding: number, newPadding: number): Promise<void> {
		try {
			const files = await fs.readdir(outputDir);

			for (const file of files) {
				if (file.endsWith(".html")) {
					const idStr = file.replace(".html", "");

					if (idStr.length === oldPadding && /^\d+$/.test(idStr)) {
						const paddedId = idStr.padStart(newPadding, "0");
						const oldPath = join(outputDir, file);
						const newPath = join(outputDir, `${paddedId}.html`);

						await fs.rename(oldPath, newPath);
					}
				}
			}
		} catch (error) {
			console.log(`⚠️ Error padding files: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}

// CLI usage
if (require.main === module) {
	const downloader = new Downloader();
	const args = process.argv.slice(2);
	const options: DownloaderOptions = {};

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case "--start":
			case "-s": {
				options.startId = Number.parseInt(args[++i]);
				break;
			}
			case "--end":
			case "-e": {
				options.endId = Number.parseInt(args[++i]);
				break;
			}
			case "--url":
			case "-u": {
				options.url = args[++i];
				break;
			}
			case "--output":
			case "-o": {
				options.output = args[++i];
				break;
			}
			case "--help":
			case "-h": {
				console.log(`
Smart Manual Downloader - Intelligent Bandai Manual Discovery and Download

USAGE:
  downloader [OPTIONS]

OPTIONS:
  -s, --start <id>      Start from this ID (default: 1)
  -e, --end <id>        End at this ID (default: 10000)
  -u, --url <url>       Base URL for manual pages
  -o, --output <dir>    Output directory (default: ./data/bandai/manuals)
  -h, --help            Show this help

EXAMPLES:
  downloader --start 650 --end 700
  downloader --end 100 --output ./manuals
  downloader --start 1 --end 10000 --url https://example.com/detail/

FEATURES:
  • Immediate downloading: files are downloaded as soon as they're discovered
  • Gap-based discovery: only searches between existing manual ranges
  • Binary search expansion: finds new ranges efficiently from gap seed points
  • Adaptive speed: starts fast, slows on issues automatically
  • Zero-padding: files sort correctly (099.html, 100.html, 101.html)
  • Real-time progress: see current ID and success/failure counts
  • Self-optimizing: learns optimal delays based on server response

INTELLIGENCE:
  • Downloads immediately during discovery (no separate download phase)
  • Eliminates redundant HTTP requests by combining validation and download
  • Analyzes existing files to identify contiguous ranges
  • Places search seeds only in gaps between known ranges
  • Falls back to linear scan only when no existing files found
  • Much faster than brute force by focusing on unknown territories
        `);
				process.exit(0);
			}
		}
	}

	downloader.download(options).catch(console.error);
}

