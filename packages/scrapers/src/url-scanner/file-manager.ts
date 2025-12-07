/**
 * File system utilities for URL scanner
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { ScanResult, ProgressState } from "./types.js";

export const FileManager = {
	/**
   * Ensure output directory exists
   */
	async ensureOutputDirectory(dirPath: string): Promise<void> {
		try {
			await fs.access(dirPath);
		} catch {
			await fs.mkdir(dirPath, { recursive: true });
		}
	},

	/**
   * Write data to file atomically
   */
	async writeFileAtomic(filePath: string, data: string): Promise<void> {
		const tempPath = `${filePath}.tmp.${Date.now()}`;

		try {
			// Write to temporary file first
			await fs.writeFile(tempPath, data, "utf8");

			// Ensure directory exists
			const dir = path.dirname(filePath);
			await this.ensureOutputDirectory(dir);

			// Atomic rename
			await fs.rename(tempPath, filePath);
		} catch (error) {
			// Clean up temp file if it exists
			try {
				await fs.unlink(tempPath);
			} catch {
				// Ignore cleanup errors
			}
			throw error;
		}
	},

	/**
   * Read file contents
   */
	async readFile(filePath: string): Promise<string> {
		try {
			return await fs.readFile(filePath, "utf8");
		} catch (error) {
			throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	},

	/**
   * Check if file exists
   */
	async fileExists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	},

	/**
   * Append data to file (for output files)
   */
	async appendFile(filePath: string, data: string): Promise<void> {
		const dir = path.dirname(filePath);
		await this.ensureOutputDirectory(dir);

		await fs.appendFile(filePath, data, "utf8");
	},

	/**
   * Create directory with all parent directories
   */
	async createDirectory(dirPath: string): Promise<void> {
		await fs.mkdir(dirPath, { recursive: true });
	},

	/**
   * Get file stats
   */
	async getFileStats(filePath: string): Promise<{
    size: number;
    mtime: Date;
    exists: boolean;
  }> {
		try {
			const stats = await fs.stat(filePath);
			return {
				size: stats.size,
				mtime: stats.mtime,
				exists: true,
			};
		} catch {
			return {
				size: 0,
				mtime: new Date(0),
				exists: false,
			};
		}
	},

	/**
   * Alias for ensureOutputDirectory
   */
	async ensureDirectory(dirPath: string): Promise<void> {
		return this.ensureOutputDirectory(dirPath);
	},

	/**
   * Initialize output structure
   */
	async initializeOutput(outputDirectory: string): Promise<void> {
		await this.ensureOutputDirectory(outputDirectory);

		// Create initial results structure
		const initialData = {
			scanInfo: {
				timestamp: new Date().toISOString(),
				version: "1.0.0",
				scannerType: "bandai-url-scanner",
			},
			results: [],
		};

		const resultsFile = path.join(outputDirectory, "scan-results.json");
		await this.writeJsonFile(resultsFile, initialData);
	},

	/**
   * Append scan result to JSON file
   */
	async appendResult(outputDirectory: string, result: ScanResult): Promise<void> {
		const resultsFile = path.join(outputDirectory, "scan-results.json");

		try {
			// Read existing results
			let data;
			if (await this.fileExists(resultsFile)) {
				const content = await this.readFile(resultsFile);
				data = JSON.parse(content);
			} else {
				// Create new structure if file doesn't exist
				data = {
					scanInfo: {
						timestamp: new Date().toISOString(),
						version: "1.0.0",
						scannerType: "bandai-url-scanner",
					},
					results: [],
				};
			}

			// Add new result
			data.results.push({
				url: result.url,
				timestamp: result.timestamp,
				status: result.isValid ? "valid" : "invalid",
				hasStaticData: result.hasStaticData,
				dataType: result.dataType,
				confidence: result.confidence,
				indicators: result.indicators,
				statusCode: result.statusCode,
				finalUrl: result.finalUrl,
				error: result.error,
				title: result.title,
			});

			// Write back to file
			await this.writeJsonFile(resultsFile, data);
		} catch (error) {
			throw new Error(`Failed to append result to JSON file: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	},

	/**
   * Write JSON data to file atomically
   */
	async writeJsonFile(filePath: string, data: any): Promise<void> {
		const content = JSON.stringify(data, null, 2);
		await this.writeFileAtomic(filePath, content);
	},

	/**
   * Read progress state from file
   */
	async readProgress(filePath: string): Promise<ProgressState | null> {
		try {
			if (!await this.fileExists(filePath)) {
				return null;
			}

			const content = await this.readFile(filePath);
			return JSON.parse(content) as ProgressState;
		} catch {
			return null;
		}
	},

	/**
   * Write progress state to file
   */
	async writeProgress(filePath: string, progress: ProgressState): Promise<void> {
		const content = JSON.stringify(progress, null, 2);
		await this.writeFileAtomic(filePath, content);
	},
};