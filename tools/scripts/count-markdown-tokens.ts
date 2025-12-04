#!/usr/bin/env tsx

import { resolve } from "node:path";
import { globSync } from "glob";
import { countFileTokens, countTokens } from "./markdown-utils";

interface TokenCountResult {
	filePath: string;
	tokens: {
		words: number;
		characters: number;
		charactersNoSpaces: number;
		estimatedTokens: number;
		modelTokens: {
			gpt3_5: number;
			gpt4: number;
			claude: number;
		};
	};
}

interface TokenCountReport {
	totalFiles: number;
	totalWords: number;
	totalCharacters: number;
	totalCharactersNoSpaces: number;
	totalEstimatedTokens: number;
	totalModelTokens: {
		gpt3_5: number;
		gpt4: number;
		claude: number;
	};
	fileResults: TokenCountResult[];
}

/**
 * Count tokens in a single markdown file
 */
function countFile(filePath: string): TokenCountResult {
	const tokenCount = countFileTokens(filePath);
	return {
		filePath: tokenCount.filePath,
		tokens: {
			words: tokenCount.words,
			characters: tokenCount.characters,
			charactersNoSpaces: tokenCount.charactersNoSpaces,
			estimatedTokens: tokenCount.estimatedTokens,
			modelTokens: tokenCount.modelTokens,
		},
	};
}

/**
 * Count tokens in multiple markdown files with symlink deduplication
 */
function countFiles(pattern: string, options: { ignore?: string[] } = {}): TokenCountReport {
	const files = globSync(pattern, {
		ignore: [
			"**/node_modules/**",
			"**/dist/**",
			"**/build/**",
			"**/.next/**",
			"**/.nx/**",
			...(options.ignore || []),
		],
		nodir: true,
	});

	const fileResults: TokenCountResult[] = [];
	const processedRealPaths = new Set<string>();
	const symlinksFound: string[] = [];

	let totalWords = 0;
	let totalCharacters = 0;
	let totalCharactersNoSpaces = 0;
	let totalEstimatedTokens = 0;
	let totalGpt3_5Tokens = 0;
	let totalGpt4Tokens = 0;
	let totalClaudeTokens = 0;

	for (const file of files) {
		try {
			// Get full result with symlink info
			const resultWithSymlinkInfo = countFile(file) as any;

			// Skip if we've already processed this real file (deduplicate symlinks)
			if (resultWithSymlinkInfo.realPath && processedRealPaths.has(resultWithSymlinkInfo.realPath)) {
				continue;
			}

			// Track real paths to avoid duplicates
			if (resultWithSymlinkInfo.realPath) {
				processedRealPaths.add(resultWithSymlinkInfo.realPath);
			}

			if (resultWithSymlinkInfo.isSymlink) {
				symlinksFound.push(`${resultWithSymlinkInfo.filePath} → ${resultWithSymlinkInfo.symlinkTarget}`);
			}

			// Add to results using the standard format
			fileResults.push({
				filePath: resultWithSymlinkInfo.filePath,
				tokens: {
					words: resultWithSymlinkInfo.tokens.words,
					characters: resultWithSymlinkInfo.tokens.characters,
					charactersNoSpaces: resultWithSymlinkInfo.tokens.charactersNoSpaces,
					estimatedTokens: resultWithSymlinkInfo.tokens.estimatedTokens,
					modelTokens: resultWithSymlinkInfo.tokens.modelTokens,
				},
			});

			totalWords += resultWithSymlinkInfo.tokens.words;
			totalCharacters += resultWithSymlinkInfo.tokens.characters;
			totalCharactersNoSpaces += resultWithSymlinkInfo.tokens.charactersNoSpaces;
			totalEstimatedTokens += resultWithSymlinkInfo.tokens.estimatedTokens;
			totalGpt3_5Tokens += resultWithSymlinkInfo.tokens.modelTokens.gpt3_5;
			totalGpt4Tokens += resultWithSymlinkInfo.tokens.modelTokens.gpt4;
			totalClaudeTokens += resultWithSymlinkInfo.tokens.modelTokens.claude;
		} catch (error) {
			console.error(`Error processing ${file}:`, error instanceof Error ? error.message : error);
		}
	}

	// Report symlinks found
	if (symlinksFound.length > 0) {
		console.log(`\n🔗 Found ${symlinksFound.length} symlink(s):`);
		symlinksFound.forEach(symlink => console.log(`   ${symlink}`));
		console.log(`   (Deduplicated to avoid double-counting)\n`);
	}

	return {
		totalFiles: fileResults.length,
		totalWords,
		totalCharacters,
		totalCharactersNoSpaces,
		totalEstimatedTokens,
		totalModelTokens: {
			gpt3_5: totalGpt3_5Tokens,
			gpt4: totalGpt4Tokens,
			claude: totalClaudeTokens,
		},
		fileResults: fileResults.sort((a, b) => b.tokens.estimatedTokens - a.tokens.estimatedTokens),
	};
}

/**
 * Format token count for display
 */
function formatNumber(num: number): string {
	return num.toLocaleString();
}

/**
 * Format and print token count report
 */
function printReport(report: TokenCountReport, options: { detailed?: boolean; compact?: boolean } = {}) {
	console.log("\n=== Markdown Token Count Report ===\n");
	console.log(`Files processed: ${report.totalFiles}`);
	console.log(`Total words: ${formatNumber(report.totalWords)}`);
	console.log(`Total characters: ${formatNumber(report.totalCharacters)}`);
	console.log(`Characters (no spaces): ${formatNumber(report.totalCharactersNoSpaces)}`);
	console.log();

	console.log("Token Estimates by Model:");
	console.log(`  GPT-3.5 Turbo: ${formatNumber(report.totalModelTokens.gpt3_5)} tokens`);
	console.log(`  GPT-4: ${formatNumber(report.totalModelTokens.gpt4)} tokens`);
	console.log(`  Claude (approx): ${formatNumber(report.totalModelTokens.claude)} tokens`);
	console.log();

	if (report.totalFiles === 0) {
		console.log("No markdown files found.\n");
		return;
	}

	// Show top files by token count
	const topFiles = options.compact ? 5 : 10;
	const displayFiles = report.fileResults.slice(0, topFiles);

	if (displayFiles.length > 0) {
		console.log(`Top ${displayFiles.length} files by token count:`);
		for (const result of displayFiles) {
			const relativePath = result.filePath;
			const tokens = result.tokens.estimatedTokens;
			console.log(`  ${formatNumber(tokens).padStart(6)} tokens  ${relativePath}`);
		}

		if (report.fileResults.length > displayFiles.length) {
			console.log(`  ... and ${report.fileResults.length - displayFiles.length} more files`);
		}
		console.log();
	}

	// Detailed mode
	if (options.detailed) {
		console.log("Detailed file breakdown:");
		for (const result of report.fileResults) {
			console.log(`\n${result.filePath}:`);
			console.log(`  Words: ${formatNumber(result.tokens.words)}`);
			console.log(`  Characters: ${formatNumber(result.tokens.characters)}`);
			console.log(`  Characters (no spaces): ${formatNumber(result.tokens.charactersNoSpaces)}`);
			console.log(`  Tokens by model:`);
			console.log(`    GPT-3.5: ${formatNumber(result.tokens.modelTokens.gpt3_5)}`);
			console.log(`    GPT-4: ${formatNumber(result.tokens.modelTokens.gpt4)}`);
			console.log(`    Claude: ${formatNumber(result.tokens.modelTokens.claude)}`);
		}
	}
}

/**
 * Count tokens from direct string input
 */
function countFromString(content: string) {
	const tokenCount = countTokens(content);

	console.log("\n=== Token Count for Input String ===\n");
	console.log(`Words: ${formatNumber(tokenCount.words)}`);
	console.log(`Characters: ${formatNumber(tokenCount.characters)}`);
	console.log(`Characters (no spaces): ${formatNumber(tokenCount.charactersNoSpaces)}`);
	console.log();

	console.log("Token Estimates by Model:");
	console.log(`  GPT-3.5 Turbo: ${formatNumber(tokenCount.modelTokens.gpt3_5)} tokens`);
	console.log(`  GPT-4: ${formatNumber(tokenCount.modelTokens.gpt4)} tokens`);
	console.log(`  Claude (approx): ${formatNumber(tokenCount.modelTokens.claude)} tokens`);
	console.log();

	if (tokenCount.modelTokens.gpt4 > 4000) {
		console.log(`⚠️  Warning: This content exceeds typical context window limits`);
	}
	if (tokenCount.modelTokens.gpt4 > 100000) {
		console.log(`🚨 Critical: This content exceeds 100k tokens - very expensive to process`);
	}
}

/**
 * Main CLI function
 */
function main() {
	const args = process.argv.slice(2);

	if (args.includes("--help") || args.includes("-h")) {
		console.log(`
Usage: npx tsx count-markdown-tokens.ts [pattern] [options]

Count tokens in markdown files using OpenAI's tiktoken for accurate LLM token counts.

Arguments:
  [pattern]              Glob pattern for markdown files (default: "**/*.md")

Options:
  --detailed             Show detailed breakdown for each file
  --compact              Show only top 5 files
  --string <content>     Count tokens in a string instead of files
  --ignore <pattern>     Additional glob patterns to ignore (can be used multiple times)
  -h, --help             Show this help message

Examples:
  npx tsx count-markdown-tokens.ts
  npx tsx count-markdown-tokens.ts "docs/**/*.md"
  npx tsx count-markdown-tokens.ts --detailed
  npx tsx count-markdown-tokens.ts --compact
  npx tsx count-markdown-tokens.ts --string "Your markdown content here"
  npx tsx count-markdown-tokens.ts --ignore "**/.git/**" --ignore "**/node_modules/**"

Token Models:
  - GPT-3.5 Turbo: cl100k_base encoding
  - GPT-4: cl100k_base encoding
  - Claude: p50k_base encoding (approximation)
		`);
		process.exit(0);
	}

	// Parse arguments
	let pattern = "**/*.md";
	const detailed = args.includes("--detailed");
	const compact = args.includes("--compact");
	const ignorePatterns: string[] = [];
	let stringContent: string | undefined;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--ignore" && args[i + 1]) {
			ignorePatterns.push(args[i + 1]);
			i++;
		} else if (args[i] === "--string" && args[i + 1]) {
			stringContent = args[i + 1];
			i++;
		} else if (!args[i].startsWith("--") && i === 0) {
			pattern = args[i];
		}
	}

	try {
		if (stringContent) {
			countFromString(stringContent);
		} else {
			const report = countFiles(pattern, { ignore: ignorePatterns });
			printReport(report, { detailed, compact });

			// Exit with warning code if no files found
			if (report.totalFiles === 0) {
				process.exit(2);
			}
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

export { countFile, countFiles, countTokens, type TokenCountResult, type TokenCountReport };
