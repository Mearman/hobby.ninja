/**
 * Main API for Bandai Manual Parser
 */

import { promises as fs } from "node:fs";

import { SimpleHtmlParser, ManualDocument } from "./core/simple-html-parser";

const parser = new SimpleHtmlParser();

/**
 * Parse a single manual file - the primary use case
 */
export async function parseManual(htmlFilePath: string): Promise<ManualDocument> {
	const content = await fs.readFile(htmlFilePath, "utf8");
	const result = parser.parse(content);

	if (!result.success || !result.data) {
		throw new Error(result.error ?? "Failed to parse manual");
	}

	return result.data;
}

/**
 * Parse HTML content directly
 */
export function parseHtmlContent(htmlContent: string): ManualDocument {
	const result = parser.parse(htmlContent);

	if (!result.success || !result.data) {
		throw new Error(result.error ?? "Failed to parse HTML content");
	}

	return result.data;
}


// Export the core parser for advanced usage
export { SimpleHtmlParser } from "./core/simple-html-parser";