/**
 * PDF processing utilities for manual downloads
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { resolveWorkspacePath } from "@hobby-ninja/utils/workspace";

import type { ManualData } from "../manual-parser.js";

// Constants
const UNKNOWN_ERROR = "Unknown error";
const DEFAULT_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
const FETCH_TIMEOUT_MS = 30_000; // 30 second timeout for HTTP requests
const MAX_FETCH_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // Base delay between retries (exponential backoff)

// Data directories
const MANUALS_ASSETS_DIR = resolveWorkspacePath("assets/manuals");

/** Download statistics */
export interface DownloadStats {
	downloaded: number;
	skipped: number;
}

/**
 * Promise with a hard timeout
 * Rejects if the operation doesn't complete within timeoutMs
 */
async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	timeoutMsg = "Operation timed out",
): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout>;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => { reject(new Error(timeoutMsg)); }, timeoutMs);
	});

	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		clearTimeout(timeoutId!);
	}
}

/**
 * Fetch with timeout and retry logic
 * Uses hard timeout that covers the entire operation including body reading
 */
async function fetchWithRetry(
	url: string,
	options: RequestInit,
	maxRetries = MAX_FETCH_RETRIES,
): Promise<Response> {
	let lastError: Error | undefined;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const response = await withTimeout(
				fetch(url, options),
				FETCH_TIMEOUT_MS,
				`Fetch timeout after ${FETCH_TIMEOUT_MS}ms`,
			);
			return response;
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(UNKNOWN_ERROR);
			const isTimeout = lastError.message.includes("timeout") || lastError.message.includes("Timeout");
			const isAbort = lastError.name === "AbortError";

			if (attempt < maxRetries && (isTimeout || isAbort)) {
				const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
				console.log(`    Retry ${attempt}/${maxRetries} after ${delay}ms (${lastError.message})`);
				await new Promise(resolve => setTimeout(resolve, delay));
			} else {
				// Throw on final attempt OR non-retryable errors
				throw lastError;
			}
		}
	}

	throw lastError ?? new Error("Fetch failed after retries");
}

/**
 * Download a PDF from URL with retry on timeout
 */
export async function downloadPdf(url: string): Promise<Buffer> {
	const response = await fetchWithRetry(url, {
		headers: {
			"User-Agent": DEFAULT_USER_AGENT,
			"Accept": "application/pdf,*/*;q=0.8",
			"Referer": "https://manual.bandai-hobby.net/",
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}

	// Wrap body reading in timeout (PDFs can be large and hang during transfer)
	const arrayBuffer = await withTimeout(
		response.arrayBuffer(),
		FETCH_TIMEOUT_MS * 2, // 60s for PDF downloads (they can be large)
		"PDF download timeout",
	);
	return Buffer.from(arrayBuffer);
}

/**
 * Find existing PDF file, checking both unpadded and padded filenames
 * e.g., for "1.pdf", also checks "0001.pdf", "001.pdf", "01.pdf"
 */
export async function findExistingPdf(dir: string, filename: string): Promise<string | null> {
	// Try exact filename first
	const exactPath = path.join(dir, filename);
	try {
		await fs.access(exactPath);
		return exactPath;
	} catch {
		// Not found, try padded versions
	}

	// Extract base name and extension (e.g., "1" and ".pdf")
	const ext = path.extname(filename);
	const base = path.basename(filename, ext);

	// If base is numeric, try padded versions
	const num = Number.parseInt(base, 10);
	if (!Number.isNaN(num)) {
		const paddedVersions = [
			num.toString().padStart(4, "0"), // 0001
			num.toString().padStart(3, "0"), // 001
			num.toString().padStart(2, "0"), // 01
		];

		for (const padded of paddedVersions) {
			if (padded === base) continue; // Skip if same as original
			const paddedPath = path.join(dir, `${padded}${ext}`);
			try {
				await fs.access(paddedPath);
				return paddedPath;
			} catch {
				// Not found, try next
			}
		}
	}

	return null;
}

/**
 * Download PDFs for a manual and update paths
 */
export async function downloadManualPdfs(
	manualId: string,
	manualData: ManualData,
): Promise<DownloadStats> {
	const stats = { downloaded: 0, skipped: 0 };

	// Create manual's PDF directory
	const manualPdfDir = path.join(MANUALS_ASSETS_DIR, manualId);
	await fs.mkdir(manualPdfDir, { recursive: true });

	for (const pdf of manualData.pdfs) {
		if (!pdf.url) continue;

		// Extract filename from URL (e.g., "1.pdf" from ".../pdf/1.pdf")
		const urlPath = new URL(pdf.url).pathname;
		const filename = path.basename(urlPath);

		// Check for existing file with either unpadded or padded name
		// URLs use unpadded (1.pdf) but existing files may be padded (0001.pdf)
		const existingPath = await findExistingPdf(manualPdfDir, filename);
		if (existingPath) {
			const existingFilename = path.basename(existingPath);
			pdf.path = `/manuals/${manualId}/${existingFilename}`;
			stats.skipped++;
			continue;
		}

		// Download the PDF using the URL filename
		const localPath = path.join(manualPdfDir, filename);
		const relativePath = `/manuals/${manualId}/${filename}`;

		try {
			const pdfBuffer = await downloadPdf(pdf.url);
			await fs.writeFile(localPath, pdfBuffer);
			pdf.path = relativePath;
			stats.downloaded++;
			console.log(`    Downloaded: ${filename}`);
		} catch (error) {
			const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
			console.log(`    Failed: ${filename} - ${msg}`);
		}
	}

	return stats;
}
