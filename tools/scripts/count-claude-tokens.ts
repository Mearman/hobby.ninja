#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";

import { countTokens , EMBED_LINK_REGEX, EMBED_SIMPLE_REGEX, readMarkdownFile } from "./markdown-utils";

const CLAUDE_FILE = "CLAUDE.md";
const TOKEN_THRESHOLD = 40_000;

console.log("🔍 Analyzing CLAUDE.md and all merged content...\n");

// Build file tree
const buildFileTree = (filePath: string, visited = new Set<string>, depth = 0) => {
	const absolutePath = resolve(filePath);
	if (visited.has(absolutePath)) return null;

	try {
		const markdownFile = readMarkdownFile(filePath);
		const content = markdownFile.content;
		const tokens = countTokens(content).estimatedTokens;
		const children: any[] = [];

		const linkMatches = [...content.matchAll(EMBED_LINK_REGEX)];
		for (const match of linkMatches) {
			const [, linkText, linkPath] = match;
			if (linkText === linkPath) {
				const child = buildFileTree(resolve(markdownFile.directory, linkPath), visited, depth + 1);
				if (child) children.push(child);
			}
		}

		return { filePath, relativePath: relative(process.cwd(), absolutePath), tokens, children, depth };
	} catch {
		return null;
	}
};

// Print tree
const printFileTree = (node: any, prefix = "", isLast = true) => {
	if (!node) return;
	const connector = isLast ? "└── " : "├── ";
	const extension = node.children.length > 0 ? "" : (node.tokens > 1000 ? " 🔴" : node.tokens > 500 ? " 🟡" : " 🟢");
	console.log(`${prefix}${connector}${node.relativePath} (${node.tokens.toLocaleString()} tokens${extension})`);

	const childPrefix = prefix + (isLast ? "    " : "│   ");
	for (let i = 0; i < node.children.length; i++) {
		printFileTree(node.children[i], childPrefix, i === node.children.length - 1);
	}
};

// Calculate tree tokens
const calculateTreeTokens = (node: any): number => {
	if (!node) return 0;
	let total = node.tokens;
	for (const child of node.children) {
		total += calculateTreeTokens(child);
	}
	return total;
};

// Main execution
const tree = buildFileTree(CLAUDE_FILE);
if (tree) {
	printFileTree(tree);
	const treeTokens = calculateTreeTokens(tree);
	console.log(`\n📊 Total tokens (tree): ${treeTokens.toLocaleString()}\n`);
}

// Count tokens
console.log("📈 Counting tokens in merged content...");
const mergedContent = readFileSync(CLAUDE_FILE, "utf-8");
const tokenCounts = countTokens(mergedContent);
const totalTokens = tokenCounts.estimatedTokens;

console.log("=== Token Count Results ===\n");
console.log(`GPT-3.5 Turbo: ${tokenCounts.modelTokens.gpt3_5.toLocaleString()} tokens`);
console.log(`GPT-4:         ${tokenCounts.modelTokens.gpt4.toLocaleString()} tokens`);
console.log(`Claude (approx): ${tokenCounts.modelTokens.claude.toLocaleString()} tokens`);
console.log();

if (totalTokens > TOKEN_THRESHOLD) {
	console.log(`🚨 WARNING: ${totalTokens.toLocaleString()} tokens exceeds threshold of ${TOKEN_THRESHOLD.toLocaleString()}`);
	const exitCode = Math.min(totalTokens, 255);
	console.log(`\nExiting with code: ${exitCode} (token count)`);
	process.exit(exitCode);
} else {
	console.log(`✅ ${totalTokens.toLocaleString()} tokens is within threshold`);
	console.log(`Below limit of ${TOKEN_THRESHOLD.toLocaleString()} tokens`);
	process.exit(0);
}