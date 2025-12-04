#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { encoding_for_model } from "tiktoken";
import { mergeMarkdown, validateEmbeds } from "./merge-markdown";
import { countTokens } from "./markdown-utils";

/**
 * Configuration
 */
const TOKEN_THRESHOLD = 1000; // Temporary for testing
const CLAUDE_FILE = "../../CLAUDE.md";

/**
 * Count tokens in merged content
 */
function countMergedTokens(content: string): {
	gpt3_5: number;
	gpt4: number;
	claude: number;
	total: number;
} {
	try {
		// Get encodings for different models
		const gpt3_5_encoding = encoding_for_model("gpt-3.5-turbo");
		const gpt4_encoding = encoding_for_model("gpt-4");
		const p50k_encoding = encoding_for_model("gpt-4"); // Use gpt-4 for Claude approximation

		// Count tokens
		const gpt3_5_tokens = gpt3_5_encoding.encode(content).length;
		const gpt4_tokens = gpt4_encoding.encode(content).length;
		const claude_tokens = p50k_encoding.encode(content).length;

		// Clean up encodings
		gpt3_5_encoding.free();
		gpt4_encoding.free();
		p50k_encoding.free();

		return {
			gpt3_5: gpt3_5_tokens,
			gpt4: gpt4_tokens,
			claude: claude_tokens,
			total: gpt4_tokens, // Use GPT-4 as primary
		};
	} catch (error) {
		console.error("Error counting tokens:", error instanceof Error ? error.message : error);
		throw error;
	}
}

/**
 * Format number with thousands separator
 */
function formatNumber(num: number): string {
	return num.toLocaleString();
}

/**
 * Main function
 */
function main() {
	try {
		console.log("🔍 Analyzing CLAUDE.md and all merged content...\n");

		// First validate embeds
		console.log("Validating embed references...");
		const validationResult = validateEmbeds(CLAUDE_FILE);
		if (!validationResult.valid) {
			console.error("❌ Validation failed:");
			for (const error of validationResult.errors) {
				console.error(`  - ${error}`);
			}
			process.exit(1);
		}
		console.log("✅ All embed references are valid\n");

		// Merge content
		console.log("Merging content...");
		const mergedContent = mergeMarkdown(CLAUDE_FILE);
		console.log(`✅ Merged ${mergedContent.length} characters\n`);

		// Count tokens
		console.log("Counting tokens...");
		const tokenCounts = countMergedTokens(mergedContent);

		// Display results
		console.log("=== Token Count Results ===\n");
		console.log(`GPT-3.5 Turbo: ${formatNumber(tokenCounts.gpt3_5)} tokens`);
		console.log(`GPT-4:         ${formatNumber(tokenCounts.gpt4)} tokens`);
		console.log(`Claude (approx): ${formatNumber(tokenCounts.claude)} tokens`);
		console.log();

		// Check threshold
		if (tokenCounts.total > TOKEN_THRESHOLD) {
			console.log(`🚨 WARNING: ${formatNumber(tokenCounts.total)} tokens exceeds threshold of ${formatNumber(TOKEN_THRESHOLD)}`);
			console.log(`This content may be too large for some LLM contexts.`);

			// Return token count as exit code (capped at 255 for Unix compatibility)
			const exitCode = Math.min(tokenCounts.total, 255);
			console.log(`\nExiting with code: ${exitCode}`);
			process.exit(exitCode);
		} else {
			console.log(`✅ ${formatNumber(tokenCounts.total)} tokens is within threshold`);
			console.log(`Below limit of ${formatNumber(TOKEN_THRESHOLD)} tokens`);
			process.exit(0);
		}

	} catch (error) {
		console.error("❌ Error:", error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

// Run if executed directly
if (require.main === module) {
	main();
}

export { countMergedTokens, TOKEN_THRESHOLD, CLAUDE_FILE };
