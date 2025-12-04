#!/usr/bin/env tsx

import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, isAbsolute } from "node:path";

/**
 * Common regex patterns for markdown parsing
 */
export const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\(([^)]+)\)/g;
export const MARKDOWN_REFERENCE_LINK_REGEX = /\[([^\]]+)\]:\s*(.+)/g;
export const EMBED_LINK_REGEX = /\[@([^\]]+)\]\(([^)]+)\)/g;
export const EMBED_SIMPLE_REGEX = /@([^\s@]+(?:\.[a-zA-Z0-9]+)?)/g;

/**
 * Link type classification
 */
export type LinkType = "internal" | "external" | "relative" | "absolute" | "anchor" | "embed";

/**
 * Determine the type of a link URL
 */
export function classifyLinkType(url: string): LinkType {
	if (url.startsWith("#")) {
		return "anchor";
	}
	if (url.startsWith("http://") || url.startsWith("https://")) {
		return "external";
	}
	if (isAbsolute(url)) {
		return "absolute";
	}
	if (url.startsWith("./") || url.startsWith("../")) {
		return "relative";
	}
	return "internal";
}

/**
 * Read and parse a markdown file
 */
export interface MarkdownFile {
	absolutePath: string;
	content: string;
	lines: string[];
	directory: string;
}

export function readMarkdownFile(filePath: string, baseDir?: string): MarkdownFile {
	const absolutePath = resolve(baseDir || process.cwd(), filePath);
	const content = readFileSync(absolutePath, "utf-8");
	const lines = content.split("\n");
	const directory = dirname(absolutePath);

	return {
		absolutePath,
		content,
		lines,
		directory,
	};
}

/**
 * Check if a file path exists and is a file (not a directory)
 */
export interface FileCheckResult {
	exists: boolean;
	isFile: boolean;
	error?: string;
}

export function checkFileExists(filePath: string): FileCheckResult {
	try {
		if (!existsSync(filePath)) {
			return {
				exists: false,
				isFile: false,
				error: `File not found: ${filePath}`,
			};
		}

		const stats = statSync(filePath);
		if (!stats.isFile()) {
			return {
				exists: true,
				isFile: false,
				error: `Path is not a file: ${filePath}`,
			};
		}

		return {
			exists: true,
			isFile: true,
		};
	} catch (error) {
		return {
			exists: false,
			isFile: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Resolve a link URL to an absolute file path
 */
export function resolveLinkPath(
	url: string,
	baseDir: string,
	type: LinkType,
): string {
	// Remove anchor if present
	const urlWithoutAnchor = url.split("#")[0];

	if (type === "absolute") {
		return urlWithoutAnchor;
	}

	return resolve(baseDir, urlWithoutAnchor);
}

/**
 * Extract match position information
 */
export interface MatchPosition {
	line: number;
	column: number;
}

export function getMatchPosition(
	content: string,
	matchIndex: number,
): MatchPosition {
	const beforeMatch = content.slice(0, matchIndex);
	const lines = beforeMatch.split("\n");
	const line = lines.length;
	const column = (lines.at(-1) ?? "").length + 1;

	return { line, column };
}
