/**
 * Main URL scanner for checking URLs and detecting static data availability
 */

import { FileManager } from "./file-manager.js";
import { StaticDataDetector } from "./static-data-detector.js";
import { ScanConfiguration, ScanResult, ProgressState, CheckOptions } from "./types.js";
import { URLChecker } from "./url-checker.js";

/**
 * Main URL scanner implementation that coordinates URL checking and static data detection
 */
export class URLScanner {
	private config: ScanConfiguration | null = null;
	private urlChecker: URLChecker;
	private staticDataDetector: StaticDataDetector;
	private progress: ProgressState;
	private progressFilePath: string | null = null;

	constructor() {
		this.urlChecker = new URLChecker();
		this.staticDataDetector = new StaticDataDetector();

		this.progress = {
			totalProcessed: 0,
			validStatic: 0,
			validDynamic: 0,
			invalid: 0,
			errors: 0,
			startTime: new Date().toISOString(),
			status: "idle",
			urls: {},
		};
	}

	/**
   * Initialize the scanner with configuration
   */
	async initialize(config: ScanConfiguration): Promise<void> {
		this.config = config;
		this.progress.status = "ready";

		// Setup output directory
		await FileManager.ensureDirectory(config.outputDirectory);

		// Setup progress file if specified
		if (config.progressFile) {
			this.progressFilePath = config.progressFile;
			await this.loadProgress();
		}

		// Initialize output files
		await FileManager.initializeOutput(config.outputDirectory);
	}

	/**
   * Scan a single URL
   */
	async scanUrl(url: string): Promise<ScanResult> {
		if (!this.config) {
			throw new Error("Scanner not initialized. Call initialize() first.");
		}

		try {
			// Create check options from scan configuration
			const checkOptions: CheckOptions = {
				timeoutMs: this.config.timeoutMs,
				userAgent: this.config.userAgent,
				followRedirects: this.config.followRedirects,
				maxRedirects: this.config.maxRedirects,
				retryAttempts: this.config.retryAttempts,
			};

			// Check URL validity - this includes static data detection
			const urlCheckResult = await this.urlChecker.checkURL(url, checkOptions);

			// Create scan result from URL check result
			const scanResult: ScanResult = {
				url,
				timestamp: new Date().toISOString(),
				isValid: urlCheckResult.validity === "valid",
				hasStaticData: urlCheckResult.hasStaticData,
				dataType: urlCheckResult.dataType,
				confidence: urlCheckResult.confidence,
				indicators: urlCheckResult.indicators,
				statusCode: urlCheckResult.statusCode,
				error: urlCheckResult.errorMessage,
				title: urlCheckResult.title,
				extractedData: urlCheckResult.extractedData,
			};

			// Update progress
			this.updateProgress(url, scanResult);

			// Write result to appropriate file
			await this.writeResultToFiles(scanResult);

			// Save progress if configured
			if (this.progressFilePath) {
				await this.saveProgress();
			}

			return scanResult;
		} catch (error) {
			const errorResult: ScanResult = {
				url,
				timestamp: new Date().toISOString(),
				isValid: false,
				hasStaticData: false,
				dataType: "none",
				confidence: 0,
				indicators: ["error"],
				error: error instanceof Error ? error.message : "Unknown error",
			};

			this.updateProgress(url, errorResult);
			await this.writeResultToFiles(errorResult);

			if (this.progressFilePath) {
				await this.saveProgress();
			}

			return errorResult;
		}
	}

	/**
   * Scan multiple URLs with concurrency control
   */
	async scanUrls(urls: string[]): Promise<ScanResult[]> {
		if (!this.config) {
			throw new Error("Scanner not initialized. Call initialize() first.");
		}

		this.progress.status = "running";
		this.progress.startTime = new Date().toISOString();
		this.progress.totalProcessed = 0;
		this.progress.urls = {};

		const results: ScanResult[] = [];
		const concurrency = this.config.concurrency || 3;
		const requestDelayMs = this.config.requestDelayMs || 100;

		// Process URLs in batches
		for (let i = 0; i < urls.length; i += concurrency) {
			const batch = urls.slice(i, i + concurrency);

			// Process batch concurrently
			const batchPromises = batch.map((url, index) =>
				this.scanUrl(url).then(result => {
					results.push(result);
					return result;
				}).catch(error => {
					const errorResult: ScanResult = {
						url,
						timestamp: new Date().toISOString(),
						isValid: false,
						hasStaticData: false,
						dataType: "none",
						confidence: 0,
						indicators: ["error"],
						error: error instanceof Error ? error.message : "Unknown error",
					};
					results.push(errorResult);
					return errorResult;
				}),
			);

			await Promise.all(batchPromises);

			// Add delay between batches to respect rate limiting
			if (i + concurrency < urls.length) {
				await new Promise(resolve => setTimeout(resolve, requestDelayMs));
			}
		}

		this.progress.status = "completed";
		this.progress.endTime = new Date().toISOString();

		if (this.progressFilePath) {
			await this.saveProgress();
		}

		return results;
	}

	/**
   * Check a single URL (alias for scanUrl)
   */
	async checkSingleUrl(url: string): Promise<ScanResult> {
		return this.scanUrl(url);
	}

	/**
   * Get current progress state
   */
	async getProgress(): Promise<ProgressState> {
		return { ...this.progress };
	}

	/**
   * Write scan result to JSON output file
   */
	async writeResultToFiles(result: ScanResult): Promise<void> {
		if (!this.config) {
			throw new Error("Scanner not initialized. Call initialize() first.");
		}

		await FileManager.appendResult(this.config.outputDirectory, result);
	}

	/**
   * Update progress state with scan result
   */
	private updateProgress(url: string, result: ScanResult): void {
		this.progress.urls[url] = result;
		this.progress.totalProcessed++;

		if (result.indicators.includes("error")) {
			this.progress.errors++;
		} else if (!result.isValid) {
			this.progress.invalid++;
		} else if (result.hasStaticData) {
			this.progress.validStatic++;
		} else {
			this.progress.validDynamic++;
		}
	}

	/**
   * Load progress state from file
   */
	private async loadProgress(): Promise<void> {
		if (!this.progressFilePath) return;

		try {
			const progressData = await FileManager.readProgress(this.progressFilePath);
			if (progressData) {
				this.progress = { ...this.progress, ...progressData };
				this.progress.status = "ready"; // Reset status when loading
			}
		} catch (error) {
			// If progress file doesn't exist or is corrupted, start with default progress
			console.warn("Could not load progress file:", error);
		}
	}

	/**
   * Save progress state to file
   */
	private async saveProgress(): Promise<void> {
		if (!this.progressFilePath) return;

		try {
			await FileManager.writeProgress(this.progressFilePath, this.progress);
		} catch (error) {
			console.error("Could not save progress file:", error);
		}
	}

	/**
   * Reset progress state
   */
	async resetProgress(): Promise<void> {
		this.progress = {
			totalProcessed: 0,
			validStatic: 0,
			validDynamic: 0,
			invalid: 0,
			errors: 0,
			startTime: new Date().toISOString(),
			status: "ready",
			urls: {},
		};

		if (this.progressFilePath) {
			await this.saveProgress();
		}
	}

	/**
   * Get scan statistics
   */
	getStatistics(): {
    totalProcessed: number;
    successRate: number;
    staticDataRate: number;
    averageConfidence: number;
    } {
		const total = this.progress.totalProcessed;
		const successful = this.progress.validStatic + this.progress.validDynamic;
		const staticDataUrls = this.progress.validStatic;

		const results = Object.values(this.progress.urls);
		const totalConfidence = results.reduce((sum, result) => sum + result.confidence, 0);
		const averageConfidence = total > 0 ? totalConfidence / total : 0;

		return {
			totalProcessed: total,
			successRate: total > 0 ? successful / total : 0,
			staticDataRate: successful > 0 ? staticDataUrls / successful : 0,
			averageConfidence: averageConfidence,
		};
	}
}