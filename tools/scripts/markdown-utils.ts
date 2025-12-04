#!/usr/bin/env tsx

import { readFileSync, existsSync, statSync, lstatSync, readlinkSync } from "node:fs";
import { resolve, dirname, isAbsolute, relative, basename } from "node:path";
import { encoding_for_model, get_encoding } from "tiktoken";

/**
 * Common regex patterns for markdown parsing
 */
export const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\(([^)]+)\)/g;
export const MARKDOWN_REFERENCE_LINK_REGEX = /\[([^\]]+)\]:\s*(.+)/g;
export const EMBED_LINK_REGEX = /\[@([^\]]+)\]\(([^)]+)\)/g;
export const EMBED_SIMPLE_REGEX = /@([a-zA-Z0-9][a-zA-Z0-9_\-\/]*\.[a-zA-Z0-9]+(?:\/[a-zA-Z0-9_\-\/\.]*)?)/g;

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
 * Read and parse a markdown file with symlink resolution
 */
export interface MarkdownFile {
	absolutePath: string;
	realPath: string;
	content: string;
	lines: string[];
	directory: string;
	isSymlink: boolean;
	symlinkTarget?: string;
}

export function readMarkdownFile(filePath: string, baseDir?: string): MarkdownFile {
	const absolutePath = resolve(baseDir || process.cwd(), filePath);
	const stat = lstatSync(absolutePath);
	const isSymlink = stat.isSymbolicLink();

	let realPath = absolutePath;
	let symlinkTarget: string | undefined;

	if (isSymlink) {
		// Use readlink to get the symlink target properly
		const linkTarget = readlinkSync(absolutePath);
		realPath = resolve(dirname(absolutePath), linkTarget);
		symlinkTarget = relative(process.cwd(), realPath);
	}

	const content = readFileSync(realPath, "utf-8");
	const lines = content.split("\n");
	const directory = dirname(realPath);

	return {
		absolutePath,
		realPath,
		content,
		lines,
		directory,
		isSymlink,
		symlinkTarget,
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

/**
 * Token counting utility for markdown content using tiktoken
 */
export interface TokenCount {
	words: number;
	characters: number;
	charactersNoSpaces: number;
	estimatedTokens: number;
	modelTokens: {
		gpt3_5: number;
		gpt4: number;
		claude: number; // Approximate
	};
}

/**
 * Count tokens in markdown content using tiktoken for accurate LLM token counts
 *
 * Uses OpenAI's tiktoken library for precise token counting across different models
 */
export function countTokens(content: string): TokenCount {
	// Count basic metrics
	const words = content.split(/\s+/).filter(word => word.length > 0).length;
	const characters = content.length;
	const charactersNoSpaces = content.replace(/\s/g, "").length;

	// Use tiktoken for accurate token counting
	try {
		// Get encodings for different models
		const gpt3_5_encoding = encoding_for_model("gpt-3.5-turbo");
		const gpt4_encoding = encoding_for_model("gpt-4");
		const p50k_encoding = get_encoding("p50k_base"); // Used by Claude approximations

		// Count tokens for different models
		const gpt3_5_tokens = gpt3_5_encoding.encode(content).length;
		const gpt4_tokens = gpt4_encoding.encode(content).length;
		const claude_tokens = p50k_encoding.encode(content).length;

		// Clean up encodings
		gpt3_5_encoding.free();
		gpt4_encoding.free();
		p50k_encoding.free();

		// Use GPT-4 tokens as the primary "estimated tokens" value
		return {
			words,
			characters,
			charactersNoSpaces,
			estimatedTokens: gpt4_tokens,
			modelTokens: {
				gpt3_5: gpt3_5_tokens,
				gpt4: gpt4_tokens,
				claude: claude_tokens,
			},
		};
	} catch (error) {
		// Fallback to word-based estimation if tiktoken fails
		console.warn("tiktoken failed, using word-based estimation:", error instanceof Error ? error.message : error);
		const estimatedTokens = Math.ceil(words * 1.3);
		return {
			words,
			characters,
			charactersNoSpaces,
			estimatedTokens,
			modelTokens: {
				gpt3_5: estimatedTokens,
				gpt4: estimatedTokens,
				claude: estimatedTokens,
			},
		};
	}
}

/**
 * Count tokens in a markdown file
 */
export function countFileTokens(filePath: string, baseDir?: string): TokenCount & {
	filePath: string;
	realPath?: string;
	isSymlink: boolean;
	symlinkTarget?: string;
} {
	const markdownFile = readMarkdownFile(filePath, baseDir);
	const tokenCount = countTokens(markdownFile.content);

	return {
		...tokenCount,
		filePath: relative(process.cwd(), markdownFile.absolutePath),
		realPath: relative(process.cwd(), markdownFile.realPath),
		isSymlink: markdownFile.isSymlink,
		symlinkTarget: markdownFile.symlinkTarget,
	};
}
