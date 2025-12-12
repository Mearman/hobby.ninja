/**
 * Workspace root detection utilities
 *
 * Finds the monorepo workspace root by looking for marker files like nx.json
 */

import { existsSync } from "node:fs";
import path from "node:path";

/** Files that indicate workspace root */
const WORKSPACE_MARKERS = ["nx.json", "pnpm-workspace.yaml", "turbo.json"] as const;

/** Cached workspace root to avoid repeated filesystem lookups */
let cachedWorkspaceRoot: string | null = null;

/**
 * Find the workspace root by walking up the directory tree
 * looking for marker files (nx.json, pnpm-workspace.yaml, etc.)
 *
 * @param startDir - Directory to start searching from (defaults to process.cwd())
 * @returns The workspace root path
 * @throws Error if no workspace root can be found
 */
export function findWorkspaceRoot(startDir?: string): string {
	// Return cached result if available
	if (cachedWorkspaceRoot) {
		return cachedWorkspaceRoot;
	}

	let currentDir = path.resolve(startDir ?? process.cwd());
	let previousDir = "";

	// Walk up until we reach the filesystem root (when dirname returns the same path)
	while (currentDir !== previousDir) {
		for (const marker of WORKSPACE_MARKERS) {
			if (existsSync(path.join(currentDir, marker))) {
				cachedWorkspaceRoot = currentDir;
				return currentDir;
			}
		}
		previousDir = currentDir;
		currentDir = path.dirname(currentDir);
	}

	throw new Error(
		`Could not find workspace root. Looked for: ${WORKSPACE_MARKERS.join(", ")} ` +
		`starting from: ${startDir ?? process.cwd()}`,
	);
}

/**
 * Resolve a path relative to the workspace root
 *
 * @param relativePath - Path relative to workspace root
 * @returns Absolute path
 */
export function resolveWorkspacePath(relativePath: string): string {
	// If already absolute, return as-is
	if (relativePath.startsWith("/")) {
		return relativePath;
	}
	return path.join(findWorkspaceRoot(), relativePath);
}

/**
 * Clear the cached workspace root (mainly for testing)
 */
export function clearWorkspaceRootCache(): void {
	cachedWorkspaceRoot = null;
}
