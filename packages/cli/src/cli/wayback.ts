import { promises as fs } from 'fs';
import * as path from 'path';
import {
	WaybackOptions,
	WaybackResult,
	WaybackSubmission,
	WaybackCheckpoint,
	UrlField,
	ManualJson,
	CatalogItemJson,
	ArchiveAgeCheck,
	WaybackAvailableResponse,
} from '../types/wayback.js';
import { WaybackProgressRenderer } from './ui/WaybackProgress.js';

// Default fields for each source type
const MANUAL_FIELDS: UrlField[] = ['sourceUrl', 'pdfUrl', 'productImage', 'supplementaryPdfUrl'];
const CATALOG_FIELDS: UrlField[] = ['sourceUrl', 'images'];

const CHECKPOINT_FILE = '.wayback-checkpoint.json';
const ARCHIVE_CACHE_FILE = '.wayback-archive-cache.json';
const WAYBACK_SAVE_URL = 'https://web.archive.org/save';
const WAYBACK_AVAILABLE_URL = 'https://archive.org/wayback/available';

/**
 * Cache entry for archive status
 * Stores whether a URL has been archived and when we last checked
 */
interface ArchiveCacheEntry {
	/** When we last checked this URL */
	checkedAt: number;
	/** The archive status result */
	result: 'not_archived' | 'too_new' | 'needs_update';
	/** Archive info if available */
	archive?: {
		timestamp: string;
		age: number;
		url: string;
	};
}

/**
 * On-disk cache for archive availability checks
 * Keyed by URL
 */
interface ArchiveCache {
	version: number;
	entries: Record<string, ArchiveCacheEntry>;
}

export class WaybackCommand {
	private checkpoint: WaybackCheckpoint | null = null;
	private checkpointPath: string = '';
	private minAgeMs: number = 0;
	private maxAgeMs: number = 0;
	private archiveCache: ArchiveCache | null = null;
	private archiveCachePath: string = '';
	/** How long to consider a cache entry valid (default: 24 hours) */
	private cacheTtlMs: number = 24 * 60 * 60 * 1000;
	/** Track if cache is dirty and needs saving */
	private archiveCacheDirty: boolean = false;
	/** Track cache hits/misses for UI display */
	private cacheHits: number = 0;
	private cacheMisses: number = 0;
	/** Internet Archive API keys */
	private accessKey?: string;
	private secretKey?: string;
	/** Callback for when auth fallback is triggered */
	private onAuthFallback?: (url: string, authError: string) => void;

	constructor() {
		// Constructor - no debug output needed
	}

	async execute(options: WaybackOptions): Promise<WaybackResult> {
		const startTime = Date.now();
		this.checkpointPath = path.join(process.cwd(), CHECKPOINT_FILE);
		this.archiveCachePath = path.join(process.cwd(), ARCHIVE_CACHE_FILE);

		// Store API keys
		this.accessKey = options.accessKey;
		this.secretKey = options.secretKey;

		// Parse age thresholds
		this.minAgeMs = this.parseDuration(options.minArchiveAge);
		this.maxAgeMs = this.parseDuration(options.maxArchiveAge);

		// Load archive cache
		this.archiveCache = await this.loadArchiveCache();
		const cacheSize = Object.keys(this.archiveCache.entries).length;
		if (cacheSize > 0) {
			console.log(`Loaded archive cache (${cacheSize} entries)`);
		}

		const result: WaybackResult = {
			totalUrls: 0,
			submitted: 0,
			successful: 0,
			failed: 0,
			skipped: 0,
			errors: [],
			duration: 0,
			ageStats: {
				tooNew: 0,
				needsUpdate: 0,
				notArchived: 0,
			},
		};

		try {
			// Load checkpoint if resuming
			if (options.resume) {
				this.checkpoint = await this.loadCheckpoint();
				if (this.checkpoint) {
					console.log(`Resuming from checkpoint (${this.checkpoint.processedUrls.length} already processed)`);
				}
			}

			// Collect all URLs to submit from configured sources
			const submissions: WaybackSubmission[] = [];

			if (options.source === 'all' || options.source === 'manuals') {
				const manualSubmissions = await this.collectManualUrls(options.manualsDir, MANUAL_FIELDS);
				submissions.push(...manualSubmissions);
				console.log(`Found ${manualSubmissions.length} URLs from manuals`);
			}

			if (options.source === 'all' || options.source === 'catalog') {
				const catalogSubmissions = await this.collectCatalogUrls(options.catalogDir, CATALOG_FIELDS);
				submissions.push(...catalogSubmissions);
				console.log(`Found ${catalogSubmissions.length} URLs from catalog`);
			}

			result.totalUrls = submissions.length;

			console.log(`Found ${submissions.length} URLs to submit`);

			if (options.dryRun) {
				console.log('\nDry run - URLs that would be submitted:');
				console.log(`Age thresholds: min=${this.formatDuration(this.minAgeMs)}, max=${this.formatDuration(this.maxAgeMs)}`);

				for (const sub of submissions.slice(0, 20)) {
					console.log(`  [${sub.sourceType}:${sub.itemId}] ${sub.field}: ${sub.url}`);
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

			console.log(`${pendingSubmissions.length} URLs pending submission\n`);

			// Initialize checkpoint if not resuming
			if (!this.checkpoint) {
				this.checkpoint = {
					processedUrls: [],
					failedSubmissions: [],
					successfulSubmissions: [],
					lastUpdated: Date.now(),
					totalUrls: submissions.length,
					fields: options.fields,
					source: options.source,
					manualsDir: options.manualsDir,
					catalogDir: options.catalogDir,
				};
			}

			// Initialize Ink progress renderer
			const progressRenderer = new WaybackProgressRenderer(pendingSubmissions.length);
			progressRenderer.start();

			// Set up auth fallback callback to log to UI
			this.onAuthFallback = (url, authError) => {
				progressRenderer.log({
					url,
					status: 'auth_fallback',
					message: authError,
				});
			};

			// Convert to queue for dynamic requeuing of failed submissions
			const queue: WaybackSubmission[] = [...pendingSubmissions];
			const maxRequeues = 3; // Max times to requeue a URL after failures
			let processedCount = 0;
			let totalToProcess = queue.length; // Track original total for progress

			// Process submissions using queue
			while (queue.length > 0) {
				const submission = queue.shift()!;

				// Update progress UI with current item
				progressRenderer.update({
					processed: processedCount,
					total: totalToProcess,
					currentItem: {
						sourceType: submission.sourceType,
						itemId: submission.itemId,
						field: submission.field,
					},
					cacheStats: {
						hits: this.cacheHits,
						misses: this.cacheMisses,
						size: Object.keys(this.archiveCache?.entries || {}).length,
					},
				});

				const processedSubmission = await this.submitWithAgeCheck(
					submission,
					options.retries,
					options.verbose,
					(attempt, error, delayMs) => {
						// Show retry in progress log
						progressRenderer.log({
							url: submission.url,
							status: 'retrying',
							message: error,
							retryCount: attempt,
							retryDelayMs: delayMs,
						});
						progressRenderer.update({
							processed: processedCount,
							total: totalToProcess,
							cacheStats: {
								hits: this.cacheHits,
								misses: this.cacheMisses,
								size: Object.keys(this.archiveCache?.entries || {}).length,
							},
						});
					}
				);
				result.submitted++;

				// Update age statistics
				if (processedSubmission.ageCheckResult === 'too_new') {
					result.ageStats.tooNew++;
				} else if (processedSubmission.ageCheckResult === 'needs_update') {
					result.ageStats.needsUpdate++;
				} else if (processedSubmission.ageCheckResult === 'not_archived') {
					result.ageStats.notArchived++;
				}

				if (processedSubmission.status === 'success') {
					result.successful++;
					this.checkpoint.successfulSubmissions.push(processedSubmission);
					processedCount++;

					// Log success
					progressRenderer.log({
						url: submission.url,
						status: 'success',
						retryCount: processedSubmission.retryCount,
					});
				} else if (processedSubmission.status === 'failed') {
					// Check if we should requeue this submission
					const currentRequeueCount = submission.requeueCount || 0;

					if (currentRequeueCount < maxRequeues) {
						// Requeue: push to back of queue with incremented requeueCount
						const requeuedSubmission: WaybackSubmission = {
							...submission,
							requeueCount: currentRequeueCount + 1,
							retryCount: 0, // Reset retry count for next attempt
							status: 'pending',
						};
						queue.push(requeuedSubmission);
						totalToProcess++; // Adjust total since we added one back

						// Log requeue event
						progressRenderer.log({
							url: submission.url,
							status: 'requeued',
							message: processedSubmission.error,
							requeueCount: currentRequeueCount + 1,
						});
						// Don't count as processed yet - we'll try again
					} else {
						// Max requeues reached - mark as permanently failed
						result.failed++;
						result.errors.push(`${submission.url}: ${processedSubmission.error || 'Unknown error'} (after ${currentRequeueCount} requeues)`);
						this.checkpoint.failedSubmissions.push({
							...processedSubmission,
							requeueCount: currentRequeueCount,
						});
						processedCount++;

						// Log final failure
						progressRenderer.log({
							url: submission.url,
							status: 'failed',
							message: `${processedSubmission.error} (exhausted ${maxRequeues} requeues)`,
							retryCount: processedSubmission.retryCount,
							requeueCount: currentRequeueCount,
						});
					}
				} else if (processedSubmission.status === 'skipped') {
					result.skipped++;
					processedCount++;

					// Log the skip result to the scrolling log
					const archiveAge = processedSubmission.existingArchive
						? this.formatDuration(processedSubmission.existingArchive.age)
						: undefined;
					progressRenderer.log({
						url: submission.url,
						status: processedSubmission.ageCheckResult === 'too_new' ? 'cached' : 'skipped',
						archiveAge,
						fromCache: processedSubmission.ageCheckFromCache,
					});
				}

				// Update progress UI with latest stats
				progressRenderer.update({
					processed: processedCount,
					total: totalToProcess,
					successful: result.successful,
					failed: result.failed,
					skipped: result.skipped,
					ageStats: { ...result.ageStats },
					cacheStats: {
						hits: this.cacheHits,
						misses: this.cacheMisses,
						size: Object.keys(this.archiveCache?.entries || {}).length,
					},
				});

				// Update checkpoint (only for completed URLs, not requeued ones)
				if (processedSubmission.status !== 'failed' || (submission.requeueCount || 0) >= maxRequeues) {
					this.checkpoint.processedUrls.push(submission.url);
				}
				this.checkpoint.lastUpdated = Date.now();

				// Save checkpoint after every item to avoid losing progress on cancel
				await this.saveCheckpoint();
				await this.saveArchiveCacheIfDirty();
			}

			// Mark progress as complete
			progressRenderer.complete();

			// Small delay to ensure final render is visible before cleanup
			await this.sleep(100);
			progressRenderer.cleanup();

			// Final checkpoint and cache save
			await this.saveCheckpoint();
			await this.saveArchiveCacheIfDirty();

			// Save results to output directory
			await this.saveResults(result, options.output);
		} catch (error) {
			result.errors.push(error instanceof Error ? error.message : 'Unknown error');
			// Still save cache on error
			await this.saveArchiveCacheIfDirty();
		}

		result.duration = Date.now() - startTime;
		return result;
	}

	private async collectManualUrls(dataDir: string, fields: UrlField[]): Promise<WaybackSubmission[]> {
		const submissions: WaybackSubmission[] = [];
		const absoluteDataDir = path.resolve(dataDir);

		// Check if directory exists
		try {
			await fs.access(absoluteDataDir);
		} catch {
			console.log(`  Manuals directory not found: ${absoluteDataDir}`);
			return submissions;
		}

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
			if (field === 'images') continue; // images field is catalog-only

			for (const dir of dirs) {
				const manual = manuals.get(dir);
				if (!manual) continue;

				const url = manual[field as keyof ManualJson];
				if (url && typeof url === 'string' && url.startsWith('http')) {
					submissions.push({
						url,
						field,
						itemId: manual.id,
						sourceType: 'manual',
						status: 'pending',
						retryCount: 0,
					});
				}
			}
		}

		return submissions;
	}

	private async collectCatalogUrls(dataDir: string, fields: UrlField[]): Promise<WaybackSubmission[]> {
		const submissions: WaybackSubmission[] = [];
		const absoluteDataDir = path.resolve(dataDir);

		// Check if directory exists
		try {
			await fs.access(absoluteDataDir);
		} catch {
			console.log(`  Catalog directory not found: ${absoluteDataDir}`);
			return submissions;
		}

		// Read all subdirectories
		const entries = await fs.readdir(absoluteDataDir, { withFileTypes: true });
		const dirs = entries
			.filter((e) => e.isDirectory())
			.map((e) => e.name)
			.sort();

		// Pre-load all catalog items to avoid repeated file reads
		const items: Map<string, CatalogItemJson> = new Map();
		for (const dir of dirs) {
			const jsonPath = path.join(absoluteDataDir, dir, `${dir}.json`);
			try {
				const content = await fs.readFile(jsonPath, 'utf-8');
				items.set(dir, JSON.parse(content));
			} catch {
				// Skip unreadable files
			}
		}

		// Collect URLs grouped by field type
		for (const field of fields) {
			for (const dir of dirs) {
				const item = items.get(dir);
				if (!item) continue;

				if (field === 'images' && item.images) {
					// Handle images array
					for (const imageUrl of item.images) {
						if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
							submissions.push({
								url: imageUrl,
								field: 'images',
								itemId: item.id,
								sourceType: 'catalog',
								status: 'pending',
								retryCount: 0,
							});
						}
					}
				} else if (field === 'sourceUrl' && item.sourceUrl) {
					// Handle sourceUrl
					if (item.sourceUrl.startsWith('http')) {
						submissions.push({
							url: item.sourceUrl,
							field: 'sourceUrl',
							itemId: item.id,
							sourceType: 'catalog',
							status: 'pending',
							retryCount: 0,
						});
					}
				}
			}
		}

		return submissions;
	}

	private async submitWithRetry(
		submission: WaybackSubmission,
		maxRetries: number,
		verbose: boolean,
		onRetry?: (attempt: number, error: string, delayMs: number) => void
	): Promise<WaybackSubmission> {
		let lastError = '';
		const unlimitedRetries = maxRetries < 0;
		// Hard cap at 3 retries even in "unlimited" mode - failed items get requeued
		const effectiveMaxRetries = unlimitedRetries ? 3 : maxRetries;

		for (let attempt = 0; attempt <= effectiveMaxRetries; attempt++) {
			try {
				const result = await this.submitUrl(submission.url);

				if (result.success) {
					const successSubmission: WaybackSubmission = {
						...submission,
						status: 'success',
						retryCount: attempt,
					};
					if (result.archiveUrl) {
						successSubmission.archiveUrl = result.archiveUrl;
					}
					return successSubmission;
				} else {
					lastError = result.error || `SubmitUrl returned no error message (success: ${result.success})`;
					if (verbose && result.error) {
						console.log(`  SubmitUrl failed with: ${result.error}`);
					}

					// Don't retry on permanent errors
					if (result.permanent) {
						break;
					}

					// Exponential backoff for retryable errors
					if (attempt < effectiveMaxRetries) {
						const delay = Math.min(Math.pow(2, attempt) * 1000, 60000); // Cap at 60s
						if (onRetry) {
							onRetry(attempt + 1, lastError, delay);
						}
						if (verbose) {
							console.log(`  Retry ${attempt + 1}/${unlimitedRetries ? '∞' : maxRetries} after ${delay}ms...`);
						}
						await this.sleep(delay);
					}
				}
			} catch (error) {
				lastError = error instanceof Error ? error.message : 'Network error';

				if (attempt < effectiveMaxRetries) {
					const delay = Math.min(Math.pow(2, attempt) * 1000, 60000); // Cap at 60s
					if (onRetry) {
						onRetry(attempt + 1, lastError, delay);
					}
					if (verbose) {
						console.log(`  Retry ${attempt + 1}/${unlimitedRetries ? '∞' : maxRetries} after ${delay}ms...`);
					}
					await this.sleep(delay);
				}
			}
		}

		return {
			...submission,
			status: 'failed',
			error: lastError,
			retryCount: effectiveMaxRetries,
		};
	}

	private async submitUrl(url: string): Promise<{ success: boolean; archiveUrl?: string; error?: string; permanent?: boolean }> {
		// If we have API keys, try with auth first
		if (this.accessKey && this.secretKey) {
			const authResult = await this.submitUrlWithAuth(url, true);
			if (authResult.success) {
				return authResult;
			}
			// If auth failed with a non-permanent error, try without auth
			if (!authResult.permanent) {
				// Log the fallback to UI
				if (this.onAuthFallback) {
					this.onAuthFallback(url, authResult.error || 'Auth failed');
				}
				const noAuthResult = await this.submitUrlWithAuth(url, false);
				// If both auth and no-auth failed, mark as permanent to avoid retries
				// (we've exhausted both authentication strategies)
				if (!noAuthResult.success) {
					return { ...noAuthResult, permanent: true };
				}
				return noAuthResult;
			}
			return authResult;
		}
		// No API keys, just submit without auth
		return this.submitUrlWithAuth(url, false);
	}

	private async submitUrlWithAuth(url: string, useAuth: boolean): Promise<{ success: boolean; archiveUrl?: string; error?: string; permanent?: boolean }> {
		try {
			const headers: Record<string, string> = {
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': 'GunplaCollectionManager/1.0 (gunpla-archive-preservation)',
			};

			// Add S3-style authorization if requested and keys are available
			if (useAuth && this.accessKey && this.secretKey) {
				headers['Authorization'] = `LOW ${this.accessKey}:${this.secretKey}`;
			}

			const response = await fetch(WAYBACK_SAVE_URL, {
				method: 'POST',
				headers,
				body: new URLSearchParams({ url }),
			});

			if (response.ok) {
				// Check for location headers first (these indicate successful archiving)
				const location = response.headers.get('location');
				if (location) {
					// Ensure the location includes id_ suffix in the timestamp
					const correctedUrl = location.replace(/\/web\/(\d{14})\//, '/web/$1id_/');
					return { success: true, archiveUrl: correctedUrl };
				}

				// Try to parse content-location or construct URL
				const contentLocation = response.headers.get('content-location');
				if (contentLocation) {
					// Ensure the content-location includes id_ suffix in the timestamp
					const archiveUrl = contentLocation.startsWith('http') ? contentLocation : `https://web.archive.org${contentLocation}`;
					// If the content-location doesn't have id_ after the timestamp, add it
					const correctedUrl = archiveUrl.replace(/\/web\/(\d{14})\//, '/web/$1id_/');
					return { success: true, archiveUrl: correctedUrl };
				}

				// If no location headers, check if we got an HTML response (indicates error/confirmation page)
				const contentType = response.headers.get('content-type');
				if (contentType && contentType.includes('text/html')) {
					// This is likely an HTML page (donation prompt, error page, etc.)
					// Try to read the response to understand what happened
					let responseText = '';
					try {
						responseText = await response.text();
					} catch {
						// Ignore response text parsing errors
					}

					// Look for specific error patterns in the HTML
					if (responseText.includes('has already been archived')) {
						return { success: false, error: 'URL already exists in archive (check via Available API)', permanent: true };
					} else if (responseText.includes('robots.txt') || responseText.includes('blocked')) {
						return { success: false, error: 'URL blocked by robots.txt or access restrictions', permanent: true };
					} else if (responseText.includes('forbidden')) {
						return { success: false, error: 'Access forbidden - URL may be restricted', permanent: true };
					} else if (responseText.includes('donate') || responseText.includes('reminder')) {
						// Donation prompt - not permanent, auth fallback might help
						return { success: false, error: 'Archive submission requires user interaction (donation prompt)', permanent: false };
					} else {
						return { success: false, error: 'Archive submission failed - unknown HTML response', permanent: false };
					}
				}

				// If we get here, we have a 200 response but no location headers and not HTML
				// This is unexpected - treat as failure
				return { success: false, error: 'Archive submission incomplete - no location headers received', permanent: false };
			}

			// Enhanced error handling - try to get response text for more details
			let responseText = '';
			try {
				responseText = await response.text();
			} catch {
				// Ignore response text parsing errors
			}

			// Handle specific error responses
			switch (response.status) {
				case 429:
					return { success: false, error: 'Rate limited (429)', permanent: false };
				case 403:
					return { success: false, error: `Forbidden (403) - ${responseText || 'URL may be blocked'}`, permanent: true };
				case 404:
					return { success: false, error: `Original URL not found (404) - ${responseText || 'URL may not exist'}`, permanent: true };
				case 423:
					return { success: false, error: `Locked (423) - ${responseText || 'Resource is locked'}`, permanent: false };
				case 503:
					return { success: false, error: `Service unavailable (503) - ${responseText || 'Wayback Machine temporarily unavailable'}`, permanent: false };
				default:
					if (response.status >= 500) {
						return { success: false, error: `Server error (${response.status}) - ${responseText || 'Server-side issue'}`, permanent: false };
					} else if (response.status >= 400) {
						return { success: false, error: `Client error (${response.status}) - ${responseText || 'Request issue'}`, permanent: true };
					} else {
						// This shouldn't happen since response.ok is false, but handle it anyway
						return { success: false, error: `Unexpected response (${response.status}) - ${responseText || 'Unknown issue'}`, permanent: false };
					}
			}
		} catch (error) {
			// Handle network errors, fetch failures, etc.
			if (error instanceof Error) {
				// Common fetch errors
				if (error.name === 'AbortError') {
					return { success: false, error: 'Request timeout', permanent: false };
				} else if (error.name === 'TypeError' && error.message.includes('fetch')) {
					return { success: false, error: 'Network error - DNS or connection failed', permanent: false };
				} else {
					return { success: false, error: `Network error: ${error.message}`, permanent: false };
				}
			}
			return { success: false, error: 'Unknown network error', permanent: false };
		}
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

	private async submitWithAgeCheck(
		submission: WaybackSubmission,
		maxRetries: number,
		verbose: boolean,
		onRetry?: (attempt: number, error: string, delayMs: number) => void
	): Promise<WaybackSubmission> {
		// Check archive age first
		const ageCheck = await this.checkArchiveAge(submission.url);

		let processedSubmission: WaybackSubmission = {
			...submission,
			ageCheckResult: ageCheck.result,
			ageCheckFromCache: ageCheck.fromCache,
		};

		if (ageCheck.archive) {
			processedSubmission.existingArchive = ageCheck.archive;
		}

		// If archive is too new, skip submission
		if (ageCheck.result === 'too_new') {
			if (verbose) {
				console.log(`  Archive exists and is too recent (${this.formatDuration(ageCheck.archive!.age)} old)`);
			}
			processedSubmission.status = 'skipped';
			return processedSubmission;
		}

		// Otherwise proceed with submission
		return await this.submitWithRetry(processedSubmission, maxRetries, verbose, onRetry);
	}

	private async checkArchiveAge(url: string): Promise<ArchiveAgeCheck> {
		// Check cache first
		const cached = this.getCachedArchiveStatus(url);
		if (cached) {
			this.cacheHits++;
			return { ...cached, fromCache: true };
		}

		// Not in cache or cache expired, fetch from API
		this.cacheMisses++;
		const result = await this.fetchArchiveAge(url);

		// Cache the result
		this.cacheArchiveStatus(url, result);

		return { ...result, fromCache: false };
	}

	/**
	 * Get cached archive status if it exists and is still valid
	 */
	private getCachedArchiveStatus(url: string): ArchiveAgeCheck | null {
		if (!this.archiveCache) return null;

		const entry = this.archiveCache.entries[url];
		if (!entry) return null;

		// Check if cache entry is still valid
		const age = Date.now() - entry.checkedAt;
		if (age > this.cacheTtlMs) {
			// Cache entry expired
			return null;
		}

		// Return cached result
		return {
			result: entry.result,
			archive: entry.archive,
		};
	}

	/**
	 * Store archive status in cache
	 */
	private cacheArchiveStatus(url: string, check: ArchiveAgeCheck): void {
		if (!this.archiveCache) return;

		this.archiveCache.entries[url] = {
			checkedAt: Date.now(),
			result: check.result,
			archive: check.archive,
		};
		this.archiveCacheDirty = true;
	}

	/**
	 * Fetch archive age from Wayback Machine API
	 */
	private async fetchArchiveAge(url: string): Promise<ArchiveAgeCheck> {
		try {
			const response = await fetch(`${WAYBACK_AVAILABLE_URL}?url=${encodeURIComponent(url)}`, {
				method: 'GET',
				headers: {
					'User-Agent': 'GunplaCollectionManager/1.0 (gunpla-archive-check)',
				},
			});

			if (!response.ok) {
				// If we can't check, assume not archived
				return { result: 'not_archived' };
			}

			const data: WaybackAvailableResponse = await response.json();

			if (!data.archived_snapshots?.closest || !data.archived_snapshots.closest.available) {
				return { result: 'not_archived' };
			}

			const archive = data.archived_snapshots.closest;
			const archiveDate = this.parseWaybackTimestamp(archive.timestamp);
			const age = Date.now() - archiveDate.getTime();

			return {
				result: age < this.minAgeMs ? 'too_new' :
						age > this.maxAgeMs ? 'needs_update' : 'too_new',
				archive: {
					timestamp: archive.timestamp,
					age,
					url: archive.url,
				},
			};
		} catch (error) {
			// If we can't check, assume not archived and proceed
			return { result: 'not_archived' };
		}
	}

	/**
	 * Load archive cache from disk
	 */
	private async loadArchiveCache(): Promise<ArchiveCache> {
		try {
			const content = await fs.readFile(this.archiveCachePath, 'utf-8');
			const cache = JSON.parse(content) as ArchiveCache;

			// Validate cache version
			if (cache.version !== 1) {
				console.log('Archive cache version mismatch, starting fresh');
				return { version: 1, entries: {} };
			}

			return cache;
		} catch {
			// No cache file or invalid JSON, start fresh
			return { version: 1, entries: {} };
		}
	}

	/**
	 * Save archive cache to disk if it has been modified
	 */
	private async saveArchiveCacheIfDirty(): Promise<void> {
		if (!this.archiveCacheDirty || !this.archiveCache) return;

		const tempPath = `${this.archiveCachePath}.tmp`;
		await fs.writeFile(tempPath, JSON.stringify(this.archiveCache, null, 2), 'utf-8');
		await fs.rename(tempPath, this.archiveCachePath);
		this.archiveCacheDirty = false;
	}

	private parseDuration(duration: string): number {
		const match = duration.match(/^(\d+)([dmy])$/);
		if (!match?.[1] || !match[2]) {
			throw new Error(`Invalid duration format: ${duration}. Use format like 30d, 6m, 2y`);
		}

		const num = match[1];
		const unit = match[2];
		const value = Number.parseInt(num, 10);

		switch (unit) {
			case 'd': return value * 24 * 60 * 60 * 1000; // days to ms
			case 'm': return value * 30 * 24 * 60 * 60 * 1000; // months to ms (approximate)
			case 'y': return value * 365 * 24 * 60 * 60 * 1000; // years to ms (approximate)
			default:
				throw new Error(`Invalid duration unit: ${unit}. Use d, m, or y`);
		}
	}

	private parseWaybackTimestamp(timestamp: string): Date {
		if (timestamp.length !== 14) {
			throw new Error(`Invalid Wayback timestamp format: ${timestamp}`);
		}

		const year = parseInt(timestamp.slice(0, 4), 10);
		const month = parseInt(timestamp.slice(4, 6), 10) - 1; // JS months are 0-based
		const day = parseInt(timestamp.slice(6, 8), 10);
		const hour = parseInt(timestamp.slice(8, 10), 10);
		const minute = parseInt(timestamp.slice(10, 12), 10);
		const second = parseInt(timestamp.slice(12, 14), 10);

		return new Date(Date.UTC(year, month, day, hour, minute, second));
	}

	private formatDuration(ms: number): string {
		const days = Math.floor(ms / (24 * 60 * 60 * 1000));
		const remainingMs = ms % (24 * 60 * 60 * 1000);
		const hours = Math.floor(remainingMs / (60 * 60 * 1000));
		const remainingMinutesMs = remainingMs % (60 * 60 * 1000);
		const minutes = Math.floor(remainingMinutesMs / (60 * 1000));

		if (days > 0) {
			return `${days}d ${hours}h`;
		} else if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else {
			return `${minutes}m`;
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
