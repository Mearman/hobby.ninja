#!/usr/bin/env tsx

import { resolve } from "node:path";

import {
	EMBED_LINK_REGEX,
	EMBED_SIMPLE_REGEX,
	readMarkdownFile,
	checkFileExists,
} from "./markdown-utils";

interface MergeOptions {
	maxDepth?: number;
	baseDir?: string;
	includeMarkers?: boolean;
}

interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

/**
 * Validate all embeds in a markdown file without merging
 */
function validateEmbeds(
	filePath: string,
	options: MergeOptions = {},
	visited = new Set<string>(),
	depth = 0,
): ValidationResult {
	const { maxDepth = 10, baseDir = process.cwd() } = options;
	const result: ValidationResult = {
		valid: true,
		errors: [],
		warnings: [],
	};

	// Read markdown file
	let markdownFile;
	try {
		markdownFile = readMarkdownFile(filePath, baseDir);
	} catch (error) {
		result.valid = false;
		result.errors.push(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
		return result;
	}

	const { absolutePath, content, directory: currentDir } = markdownFile;

	// Check for circular references
	if (visited.has(absolutePath)) {
		result.valid = false;
		result.errors.push(`Circular reference detected: ${filePath}`);
		return result;
	}

	// Check max depth
	if (depth > maxDepth) {
		result.valid = false;
		result.errors.push(`Max depth exceeded: ${filePath}`);
		return result;
	}

	// Mark as visited
	visited.add(absolutePath);

	// Validate [@path](path) format embeds
	const linkMatches = [...content.matchAll(EMBED_LINK_REGEX)];
	for (const match of linkMatches) {
		const [, linkText, linkPath] = match;

		// Validate that link text matches link path
		if (linkText !== linkPath) {
			result.valid = false;
			result.errors.push(
				`Invalid embed format in ${filePath}: link text "${linkText}" does not match path "${linkPath}"`,
			);
			continue;
		}

		// Recursively validate embedded file
		const embeddedPath = resolve(currentDir, linkPath);
		const embeddedResult = validateEmbeds(
			embeddedPath,
			{ ...options, baseDir: currentDir },
			new Set(visited),
			depth + 1,
		);

		result.errors.push(...embeddedResult.errors);
		result.warnings.push(...embeddedResult.warnings);
		if (!embeddedResult.valid) {
			result.valid = false;
		}
	}

	// Validate @path format embeds
	const simpleMatches = [...content.matchAll(EMBED_SIMPLE_REGEX)];
	const processedEmbeds = new Set<string>();

	for (const match of simpleMatches) {
		const [fullMatch, path] = match;

		// Skip if already processed
		if (processedEmbeds.has(fullMatch)) {
			continue;
		}

		// Skip if it looks like an email or mention
		if (fullMatch.includes("@") && !fullMatch.startsWith("@")) {
			continue;
		}

		// Skip if within a markdown link that was already processed
		const matchIndex = content.indexOf(fullMatch);
		const beforeMatch = content.slice(0, matchIndex);
		if (beforeMatch.endsWith("[") || beforeMatch.includes(`[@${path}](`)) {
			continue;
		}

		processedEmbeds.add(fullMatch);

		// Recursively validate embedded file
		const embeddedPath = resolve(currentDir, path);
		const embeddedResult = validateEmbeds(
			embeddedPath,
			{ ...options, baseDir: currentDir },
			new Set(visited),
			depth + 1,
		);

		result.errors.push(...embeddedResult.errors);
		result.warnings.push(...embeddedResult.warnings);
		if (!embeddedResult.valid) {
			result.valid = false;
		}
	}

	return result;
}

/**
 * Merge markdown file with embedded references
 */
function mergeMarkdown(
	filePath: string,
	options: MergeOptions = {},
	visited = new Set<string>(),
	depth = 0,
): string {
	const { maxDepth = 10, baseDir = process.cwd(), includeMarkers = false } = options;

	// Read markdown file
	let markdownFile;
	try {
		markdownFile = readMarkdownFile(filePath, baseDir);
	} catch (error) {
		return `<!-- Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)} -->`;
	}

	const { absolutePath, content, directory: currentDir } = markdownFile;

	// Check for circular references
	if (visited.has(absolutePath)) {
		return `<!-- Circular reference detected: ${filePath} -->`;
	}

	// Check max depth
	if (depth > maxDepth) {
		return `<!-- Max depth exceeded: ${filePath} -->`;
	}

	// Mark as visited
	visited.add(absolutePath);

	// Helper function to embed a file
	const embedFile = (path: string): string => {
		// Resolve relative path from current file's directory
		const embeddedPath = resolve(currentDir, path);

		// Recursively merge embedded file
		const embeddedContent = mergeMarkdown(
			embeddedPath,
			{ ...options, baseDir: currentDir },
			new Set(visited),
			depth + 1,
		);

		// Return embedded content with optional markers
		if (includeMarkers) {
			return `\n\n<!-- BEGIN EMBEDDED: ${path} -->\n\n${embeddedContent}\n\n<!-- END EMBEDDED: ${path} -->\n\n`;
		}
		return `\n\n${embeddedContent}\n\n`;
	};

	// Process [@path](path) format embeds
	let merged = content.replace(EMBED_LINK_REGEX, (match, linkText, linkPath) => {
		// Validate that link text matches link path (after @ prefix)
		if (linkText !== linkPath) {
			return `<!-- Invalid embed format: link text "${linkText}" does not match path "${linkPath}" -->`;
		}

		return embedFile(linkPath);
	});

	// Process @path format embeds (but not within existing embeds or links)
	// Skip if it's part of an email address or already processed link
	const processedEmbeds = new Set<string>();
	merged = merged.replace(EMBED_SIMPLE_REGEX, (match, path) => {
		// Skip if already processed
		if (processedEmbeds.has(match)) {
			return match;
		}

		// Skip if it looks like an email or mention
		if (match.includes("@") && !match.startsWith("@")) {
			return match;
		}

		// Skip if within a markdown link that was already processed
		const beforeMatch = merged.slice(0, merged.indexOf(match));
		if (beforeMatch.endsWith("[") || beforeMatch.includes(`[@${path}](`)) {
			return match;
		}

		processedEmbeds.add(match);
		return embedFile(path);
	});

	return merged;
}

/**
 * Main CLI function
 */
function main() {
	const args = process.argv.slice(2);

	if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
		console.log(`
Usage: npx tsx merge-markdown.ts <file.md> [options]

Merge markdown files by recursively resolving [@path](path) and @path embeds.

Arguments:
  <file.md>              Input markdown file path

Options:
  --max-depth <number>   Maximum recursion depth (default: 10)
  --base-dir <path>      Base directory for resolving paths (default: cwd)
  --markers              Include <!-- BEGIN/END EMBEDDED --> markers (default: false)
  --validate             Only validate embeds without merging
  -h, --help             Show this help message

Examples:
  npx tsx merge-markdown.ts AGENTS.md
  npx tsx merge-markdown.ts AGENTS.md --max-depth 5 --markers
  npx tsx merge-markdown.ts AGENTS.md --validate
		`);
		process.exit(0);
	}

	const inputFile = args[0];
	let maxDepth = 10;
	let baseDir = process.cwd();
	let includeMarkers = false;
	let validateOnly = false;

	// Parse options
	for (let i = 1; i < args.length; i++) {
		if (args[i] === "--max-depth" && args[i + 1]) {
			maxDepth = Number.parseInt(args[i + 1], 10);
			i++;
		} else if (args[i] === "--base-dir" && args[i + 1]) {
			baseDir = args[i + 1];
			i++;
		} else if (args[i] === "--markers") {
			includeMarkers = true;
		} else if (args[i] === "--validate") {
			validateOnly = true;
		}
	}

	try {
		if (validateOnly) {
			// Validation mode
			const result = validateEmbeds(inputFile, { maxDepth, baseDir });

			if (result.valid) {
				console.error("✓ All embeds are valid");
				process.exit(0);
			} else {
				console.error("✗ Validation failed\n");
				if (result.errors.length > 0) {
					console.error("Errors:");
					for (const error of result.errors) {
						console.error(`  - ${error}`);
					}
				}
				if (result.warnings.length > 0) {
					console.error("\nWarnings:");
					for (const warning of result.warnings) {
						console.error(`  - ${warning}`);
					}
				}
				process.exit(1);
			}
		} else {
			// Merge mode
			const merged = mergeMarkdown(inputFile, { maxDepth, baseDir, includeMarkers });
			console.log(merged);
		}
	} catch (error) {
		console.error("Error:", error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

// Run if executed directly
if (require.main === module) {
	main();
}

export { mergeMarkdown, validateEmbeds, type MergeOptions, type ValidationResult };
