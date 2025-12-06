import { promises as fs } from 'fs';
import * as path from 'path';
import {
	WaybackOptions,
	WaybackResult,
	WaybackSubmission,
	WaybackCheckpoint,
	UrlField,
	ManualJson,
} from '../types/wayback.js';

const CHECKPOINT_FILE = '.wayback-checkpoint.json';
const WAYBACK_SAVE_URL = 'https://web.archive.org/save';

export class WaybackCommand {
	private checkpoint: WaybackCheckpoint | null = null;
	private checkpointPath: string = '';

	async execute(options: WaybackOptions): Promise<WaybackResult> {
		const startTime = Date.now();
		this.checkpointPath = path.join(process.cwd(), CHECKPOINT_FILE);

		const result: WaybackResult = {
			totalUrls: 0,
			submitted: 0,
			successful: 0,
			failed: 0,
			skipped: 0,
			errors: [],
			duration: 0,
		};

		try {
			// Load checkpoint if resuming
			if (options.resume) {
				this.checkpoint = await this.loadCheckpoint();
				if (this.checkpoint) {
					console.log(`Resuming from checkpoint (${this.checkpoint.processedUrls.length} already processed)`);
				}
			}

			// Collect all URLs to submit
			const submissions = await this.collectUrls(options.dataDir, options.fields);
			result.totalUrls = submissions.length;

			console.log(`Found ${submissions.length} URLs to submit`);

			if (options.dryRun) {
				console.log('\nDry run - URLs that would be submitted:');
				for (const sub of submissions.slice(0, 20)) {
					console.log(`  [${sub.manualId}] ${sub.field}: ${sub.url}`);
				}
				if (submissions.length > 20) {
					console.log(`  ... and ${submissions.length - 20} more`);
				}
				result.duration = Date.now() - startTime;
				return result;
			}

			// Filter out already processed URLs if resuming
			const pendingSubmissions = this.checkpoint
				? submissions.filter((s) => !this.checkpoint!.processedUrls.includes(s.url))
				: submissions;

			console.log(`${pendingSubmissions.length} URLs pending submission`);

			// Initialize checkpoint if not resuming
			if (!this.checkpoint) {
				this.checkpoint = {
					processedUrls: [],
					failedSubmissions: [],
					successfulSubmissions: [],
					lastUpdated: Date.now(),
					totalUrls: submissions.length,
					fields: options.fields,
					dataDir: options.dataDir,
				};
			}

			// Process submissions
			for (let i = 0; i < pendingSubmissions.length; i++) {
				const submission = pendingSubmissions[i];
				if (!submission) continue;

				const progress = `[${i + 1}/${pendingSubmissions.length}]`;

				if (options.verbose) {
					console.log(`${progress} Submitting: ${submission.url}`);
				} else if ((i + 1) % 100 === 0 || i === 0) {
					console.log(`${progress} Progress: ${submission.manualId}/${submission.field}`);
				}

				const processedSubmission = await this.submitWithRetry(submission, options.retries, options.verbose);
				result.submitted++;

				if (processedSubmission.status === 'success') {
					result.successful++;
					this.checkpoint.successfulSubmissions.push(processedSubmission);
					if (options.verbose) {
						console.log(`  -> Archived: ${processedSubmission.archiveUrl}`);
					}
				} else if (processedSubmission.status === 'failed') {
					result.failed++;
					result.errors.push(`${submission.url}: ${processedSubmission.error || 'Unknown error'}`);
					this.checkpoint.failedSubmissions.push(processedSubmission);
					if (options.verbose) {
						console.log(`  -> Failed: ${processedSubmission.error || 'Unknown error'}`);
					}
				} else if (processedSubmission.status === 'skipped') {
					result.skipped++;
				}

				// Update checkpoint
				this.checkpoint.processedUrls.push(submission.url);
				this.checkpoint.lastUpdated = Date.now();

				// Save checkpoint periodically
				if ((i + 1) % 10 === 0) {
					await this.saveCheckpoint();
				}
			}

			// Final checkpoint save
			await this.saveCheckpoint();

			// Save results to output directory
			await this.saveResults(result, options.output);
		} catch (error) {
			result.errors.push(error instanceof Error ? error.message : 'Unknown error');
		}

		result.duration = Date.now() - startTime;
		return result;
	}

	private async collectUrls(dataDir: string, fields: UrlField[]): Promise<WaybackSubmission[]> {
		const submissions: WaybackSubmission[] = [];
		const absoluteDataDir = path.resolve(dataDir);

		// Read all subdirectories
		const entries = await fs.readdir(absoluteDataDir, { withFileTypes: true });
		const dirs = entries
			.filter((e) => e.isDirectory())
			.map((e) => e.name)
			.sort();

		// Pre-load all manuals to avoid repeated file reads
		const manuals: Map<string, ManualJson> = new Map();
		for (const dir of dirs) {
			const jsonPath = path.join(absoluteDataDir, dir, `${dir}.json`);
			try {
				const content = await fs.readFile(jsonPath, 'utf-8');
				manuals.set(dir, JSON.parse(content));
			} catch {
				// Skip unreadable files
			}
		}

		// Collect URLs grouped by field type (sourceUrl first, then pdfUrl, etc.)
		for (const field of fields) {
			for (const dir of dirs) {
				const manual = manuals.get(dir);
				if (!manual) continue;

				const url = manual[field];
				if (url && typeof url === 'string' && url.startsWith('http')) {
					submissions.push({
						url,
						field,
						manualId: manual.id,
						status: 'pending',
						retryCount: 0,
					});
				}
			}
		}

		return submissions;
	}

	private async submitWithRetry(
		submission: WaybackSubmission,
		maxRetries: number,
		verbose: boolean
	): Promise<WaybackSubmission> {
		let lastError = '';

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const result = await this.submitUrl(submission.url);

				if (result.success) {
					const successSubmission: WaybackSubmission = {
						url: submission.url,
						field: submission.field,
						manualId: submission.manualId,
						status: 'success',
						retryCount: attempt,
					};
					if (result.archiveUrl) {
						successSubmission.archiveUrl = result.archiveUrl;
					}
					return successSubmission;
				} else {
					lastError = result.error || 'Unknown error';

					// Don't retry on permanent errors
					if (result.permanent) {
						break;
					}

					// Exponential backoff for retryable errors
					if (attempt < maxRetries) {
						const delay = Math.pow(2, attempt) * 1000;
						if (verbose) {
							console.log(`  Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
						}
						await this.sleep(delay);
					}
				}
			} catch (error) {
				lastError = error instanceof Error ? error.message : 'Network error';

				if (attempt < maxRetries) {
					const delay = Math.pow(2, attempt) * 1000;
					if (verbose) {
						console.log(`  Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
					}
					await this.sleep(delay);
				}
			}
		}

		return {
			...submission,
			status: 'failed',
			error: lastError,
			retryCount: maxRetries,
		};
	}

	private async submitUrl(url: string): Promise<{ success: boolean; archiveUrl?: string; error?: string; permanent?: boolean }> {
		const response = await fetch(WAYBACK_SAVE_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': 'GunplaCollectionManager/1.0 (gunpla-archive-preservation)',
			},
			body: new URLSearchParams({ url }),
		});

		if (response.ok) {
			// The Wayback Machine returns the archived URL in various ways
			// Check for redirect or parse response
			const location = response.headers.get('location');
			if (location) {
				return { success: true, archiveUrl: location };
			}

			// Try to parse content-location or construct URL
			const contentLocation = response.headers.get('content-location');
			if (contentLocation) {
				return { success: true, archiveUrl: `https://web.archive.org${contentLocation}` };
			}

			// Construct expected archive URL
			const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
			return { success: true, archiveUrl: `https://web.archive.org/web/${timestamp}/${url}` };
		}

		// Handle error responses
		if (response.status === 429) {
			return { success: false, error: 'Rate limited (429)', permanent: false };
		}

		if (response.status === 403) {
			return { success: false, error: 'Forbidden (403) - URL may be blocked', permanent: true };
		}

		if (response.status === 404) {
			return { success: false, error: 'Original URL not found (404)', permanent: true };
		}

		if (response.status >= 500) {
			return { success: false, error: `Server error (${response.status})`, permanent: false };
		}

		return { success: false, error: `HTTP ${response.status}`, permanent: true };
	}

	private async loadCheckpoint(): Promise<WaybackCheckpoint | null> {
		try {
			const content = await fs.readFile(this.checkpointPath, 'utf-8');
			return JSON.parse(content);
		} catch {
			return null;
		}
	}

	private async saveCheckpoint(): Promise<void> {
		if (!this.checkpoint) return;

		const tempPath = `${this.checkpointPath}.tmp`;
		await fs.writeFile(tempPath, JSON.stringify(this.checkpoint, null, 2), 'utf-8');
		await fs.rename(tempPath, this.checkpointPath);
	}

	private async saveResults(result: WaybackResult, outputDir: string): Promise<void> {
		const absoluteOutputDir = path.resolve(outputDir);
		await fs.mkdir(absoluteOutputDir, { recursive: true });

		const resultsPath = path.join(absoluteOutputDir, 'wayback-results.json');
		await fs.writeFile(resultsPath, JSON.stringify(result, null, 2), 'utf-8');

		if (this.checkpoint) {
			const checkpointCopyPath = path.join(absoluteOutputDir, 'wayback-checkpoint.json');
			await fs.writeFile(checkpointCopyPath, JSON.stringify(this.checkpoint, null, 2), 'utf-8');
		}

		console.log(`Results saved to ${resultsPath}`);
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
