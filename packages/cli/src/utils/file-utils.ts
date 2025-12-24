/**
 * File utilities for efficient file operations
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

/**
 * Write JSON to file only if content has changed
 * Returns true if file was written, false if unchanged
 */
export async function writeJsonIfChanged(
	filePath: string,
	data: unknown,
	indent: string | number = "\t",
): Promise<boolean> {
	const newContent = JSON.stringify(data, null, indent);

	try {
		const existingContent = await readFile(filePath, "utf8");
		if (existingContent === newContent) {
			return false;
		}
	} catch {
		// File doesn't exist, will write
	}

	await writeFile(filePath, newContent, "utf8");
	return true;
}

/**
 * Synchronous version: Write JSON to file only if content has changed
 * Returns true if file was written, false if unchanged
 */
export function writeJsonIfChangedSync(
	filePath: string,
	data: unknown,
	indent: string | number = "\t",
): boolean {
	const newContent = JSON.stringify(data, null, indent);

	if (existsSync(filePath)) {
		try {
			const existingContent = readFileSync(filePath, "utf8");
			if (existingContent === newContent) {
				return false;
			}
		} catch {
			// Error reading, will write
		}
	}

	writeFileSync(filePath, newContent);
	return true;
}

/**
 * Compute MD5 hash of a buffer
 * @param buffer - The buffer to hash
 * @returns MD5 hash as lowercase hex string
 */
export function computeBufferHash(buffer: Buffer): string {
	return createHash("md5").update(buffer).digest("hex");
}

/**
 * Compute MD5 hash of a file
 * @param filePath - Path to the file
 * @returns MD5 hash as lowercase hex string
 */
export async function computeFileHash(filePath: string): Promise<string> {
	const buffer = await readFile(filePath);
	return computeBufferHash(buffer);
}

/**
 * Synchronous version: Compute MD5 hash of a file
 * @param filePath - Path to the file
 * @returns MD5 hash as lowercase hex string
 */
export function computeFileHashSync(filePath: string): string {
	const buffer = readFileSync(filePath);
	return computeBufferHash(buffer);
}
