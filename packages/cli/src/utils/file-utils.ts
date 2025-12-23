/**
 * File utilities for efficient file operations
 */

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
