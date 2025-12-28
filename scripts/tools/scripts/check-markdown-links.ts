#!/usr/bin/env tsx

import path from "node:path";

import { globSync } from "glob";

import {
	MARKDOWN_LINK_REGEX,
	MARKDOWN_REFERENCE_LINK_REGEX,
	LinkType,
	classifyLinkType,
	readMarkdownFile,
	checkFileExists,
	resolveLinkPath,
} from "./markdown-utils";

interface LinkInfo {
	text: string;
	url: string;
	line: number;
	column: number;
	type: LinkType;
}


interface ValidationReport {
	totalFiles: number;
	totalLinks: number;
	validLinks: number;
	brokenLinks: number;
	externalLinks: number;
	fileResults: FileValidationResult[];
}

interface FileValidationResult {
	filePath: string;
	links: LinkValidationResult[];
}

interface LinkValidationResult {
	link: LinkInfo;
	valid: boolean;
	error?: string;
}

/**
 * Extract all markdown links from content
 */
function extractLinks(content: string, _filePath: string): LinkInfo[] {
	const links: LinkInfo[] = [];
	const lines = content.split("\n");

	// Process inline links [text](url)
	for (const [lineIndex, line] of lines.entries()) {
		const matches = [...line.matchAll(MARKDOWN_LINK_REGEX)];

		for (const match of matches) {
			const [, text, url] = match;
			const column = match.index;

			links.push({
				text,
				url,
				line: lineIndex + 1,
				column: column + 1,
				type: classifyLinkType(url),
			});
		}
	}

	// Process reference-style links [id]: url
	for (const [lineIndex, line] of lines.entries()) {
		const matches = [...line.matchAll(MARKDOWN_REFERENCE_LINK_REGEX)];

		for (const match of matches) {
			const [, text, url] = match;
			const column = match.index;
			const trimmedUrl = url.trim();

			links.push({
				text,
				url: trimmedUrl,
				line: lineIndex + 1,
				column: column + 1,
				type: classifyLinkType(trimmedUrl),
			});
		}
	}

	return links;
}

/**
 * Validate a single link
 */
function validateLink(
	link: LinkInfo,
	baseDir: string,
): LinkValidationResult {
	// Skip external links (assume valid)
	if (link.type === "external") {
		return { link, valid: true };
	}

	// Skip anchor links (can't validate without parsing headers)
	if (link.type === "anchor") {
		return { link, valid: true };
	}

	// Check if file exists for internal/relative/absolute links
	const targetPath = resolveLinkPath(link.url, baseDir, link.type);
	const checkResult = checkFileExists(targetPath);

	if (!checkResult.exists || !checkResult.isFile) {
		return {
			link,
			valid: false,
			error: checkResult.error,
		};
	}

	return { link, valid: true };
}

/**
 * Check all links in a markdown file
 */
function checkFileLinks(
	filePath: string,
	baseDir?: string,
): FileValidationResult {
	const markdownFile = readMarkdownFile(filePath, baseDir);
	const { absolutePath, content, directory } = markdownFile;

	// Extract links
	const links = extractLinks(content, absolutePath);

	// Validate each link
	const results = links.map((link) => validateLink(link, directory));

	return {
		filePath: path.relative(process.cwd(), absolutePath),
		links: results,
	};
}

/**
 * Check all markdown files in a directory
 */
function checkDirectory(
	pattern = "**/*.md",
	options: { ignore?: string[] } = {},
): ValidationReport {
	const files = globSync(pattern, {
		ignore: [
			"**/node_modules/**",
			"**/dist/**",
			"**/build/**",
			"**/.next/**",
			"**/.nx/**",
			...(options.ignore ?? []),
		],
		nodir: true,
	});

	const fileResults: FileValidationResult[] = [];
	let totalLinks = 0;
	let validLinks = 0;
	let brokenLinks = 0;
	let externalLinks = 0;

	for (const file of files) {
		const result = checkFileLinks(file);
		fileResults.push(result);

		totalLinks += result.links.length;

		for (const linkResult of result.links) {
			if (linkResult.link.type === "external") {
				externalLinks++;
			}

			if (linkResult.valid) {
				validLinks++;
			} else {
				brokenLinks++;
			}
		}
	}

	return {
		totalFiles: files.length,
		totalLinks,
		validLinks,
		brokenLinks,
		externalLinks,
		fileResults,
	};
}

/**
 * Format and print validation report
 */
function printReport(report: ValidationReport, options: { verbose?: boolean; errorsOnly?: boolean } = {}) {
	console.log("\n=== Markdown Link Check Report ===\n");
	console.log(`Files checked: ${report.totalFiles}`);
	console.log(`Total links: ${report.totalLinks}`);
	console.log(`Valid links: ${report.validLinks}`);
	console.log(`Broken links: ${report.brokenLinks}`);
	console.log(`External links: ${report.externalLinks} (not validated)\n`);

	if (report.brokenLinks === 0 && !options.verbose) {
		console.log("✓ All links are valid!\n");
		return;
	}

	// Print file-by-file results
	for (const fileResult of report.fileResults) {
		const brokenInFile = fileResult.links.filter((l) => !l.valid).length;

		// Skip files with no broken links if errorsOnly mode
		if (options.errorsOnly && brokenInFile === 0) {
			continue;
		}

		// Skip files with no links if not verbose
		if (!options.verbose && fileResult.links.length === 0) {
			continue;
		}

		console.log(`\n${fileResult.filePath}:`);

		if (fileResult.links.length === 0) {
			console.log("  (no links found)");
			continue;
		}

		for (const linkResult of fileResult.links) {
			// Skip valid links unless verbose mode
			if (linkResult.valid && !options.verbose) {
				continue;
			}

			const status = linkResult.valid ? "✓" : "✗";
			const typeLabel = `[${linkResult.link.type}]`;
			const location = `${linkResult.link.line}:${linkResult.link.column}`;

			console.log(`  ${status} ${typeLabel.padEnd(12)} ${location.padEnd(10)} ${linkResult.link.url}`);

			if (!linkResult.valid && linkResult.error) {
				console.log(`    Error: ${linkResult.error}`);
			}
		}
	}

	console.log();
}

/**
 * Main CLI function
 */
function main() {
	const args = process.argv.slice(2);

	if (args.includes("--help") || args.includes("-h")) {
		console.log(`
Usage: npx tsx check-markdown-links.ts [pattern] [options]

Check all markdown links in files matching the glob pattern.

Arguments:
  [pattern]              Glob pattern for markdown files (default: "**/*.md")

Options:
  --verbose              Show all links (including valid ones)
  --errors-only          Only show files with broken links
  --ignore <pattern>     Additional glob patterns to ignore (can be used multiple times)
  -h, --help             Show this help message

Examples:
  npx tsx check-markdown-links.ts
  npx tsx check-markdown-links.ts "docs/**/*.md"
  npx tsx check-markdown-links.ts --verbose
  npx tsx check-markdown-links.ts --errors-only
  npx tsx check-markdown-links.ts --ignore "**/.specify/**"
		`);
		process.exit(0);
	}

	// Parse arguments
	let pattern = "**/*.md";
	const verbose = args.includes("--verbose");
	const errorsOnly = args.includes("--errors-only");
	const ignorePatterns: string[] = [];

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--ignore" && args[i + 1]) {
			ignorePatterns.push(args[i + 1]);
			i++;
		} else if (!args[i].startsWith("--") && i === 0) {
			pattern = args[i];
		}
	}

	try {
		const report = checkDirectory(pattern, { ignore: ignorePatterns });
		printReport(report, { verbose, errorsOnly });

		// Exit with error code if broken links found
		if (report.brokenLinks > 0) {
			process.exit(1);
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

export { checkFileLinks, checkDirectory, extractLinks, validateLink, type LinkInfo, type ValidationReport };
