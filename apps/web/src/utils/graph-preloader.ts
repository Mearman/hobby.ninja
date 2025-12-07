/**
 * Graph Preloader
 *
 * Memory-efficient loading and caching of graph nodes for SSG generation.
 * Optimized for handling 8,485+ nodes without memory overflow.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { GraphNode } from "./graph-routes-generator";

export interface GraphCache {
  brands: Map<string, GraphNode>;
  categories: Map<string, GraphNode>;
  items: Map<string, GraphNode>;
  manuals: Map<string, GraphNode>;
  series: Map<string, GraphNode>;
}

export class GraphPreloader {
	private cache: GraphCache = {
		brands: new Map(),
		categories: new Map(),
		items: new Map(),
		manuals: new Map(),
		series: new Map(),
	};

	private memoryUsage = 0;
	private maxMemoryUsage = 100 * 1024 * 1024; // 100MB limit

	/**
   * Preloads all graph nodes into memory with chunked processing
   */
	async preloadAllNodes(): Promise<void> {
		console.log("Starting graph node preload...");
		const startTime = Date.now();

		const nodeTypes = [
			{ type: "brands", count: 78 },
			{ type: "categories", count: 5 },
			{ type: "items", count: 6009 },
			{ type: "manuals", count: 2258 },
			{ type: "series", count: 135 },
		];

		for (const { type } of nodeTypes) {
			await this.preloadNodeType(type);

			// Force garbage collection between node types
			if (globalThis.gc) {
				globalThis.gc();
			}

			this.checkMemoryUsage();
		}

		const totalNodes = Object.values(this.cache).reduce((sum, map) => sum + map.size, 0);
		const duration = Date.now() - startTime;

		console.log(`Preloaded ${totalNodes} nodes in ${duration}ms`);
		console.log(`Memory usage: ${Math.round(this.memoryUsage / 1024 / 1024)}MB`);
	}

	/**
   * Preloads a specific node type with chunked processing
   */
	private async preloadNodeType(nodeType: string): Promise<void> {
		const graphDataPath = join(process.cwd(), "apps", "web", "public", "api", "graph", nodeType);
		const files = await readdir(graphDataPath);
		const jsonFiles = files.filter(file => file.endsWith(".json"));

		console.log(`Loading ${jsonFiles.length} ${nodeType}...`);

		// Process in chunks to manage memory
		const chunkSize = 100;
		const singularType = nodeType.slice(0, -1); // brands -> brand

		for (let i = 0; i < jsonFiles.length; i += chunkSize) {
			const chunk = jsonFiles.slice(i, i + chunkSize);

			await this.processChunk(chunk, graphDataPath, singularType as keyof GraphCache);

			// Periodic garbage collection
			if (i % (chunkSize * 5) === 0 && globalThis.gc) {
				globalThis.gc();
			}
		}
	}

	/**
   * Processes a chunk of files and loads them into cache
   */
	private async processChunk(
		files: string[],
		graphDataPath: string,
		cacheKey: keyof GraphCache,
	): Promise<void> {
		const loadPromises = files.map(async (file) => {
			try {
				const nodeId = file.replace(".json", "");
				const filePath = join(graphDataPath, file);
				const fileContent = await readFile(filePath, "utf-8");
				const nodeData = JSON.parse(fileContent);

				const node: GraphNode = {
					id: nodeId,
					type: cacheKey as GraphNode["type"],
					name: nodeData.name || { ja: nodeId },
					data: nodeData,
				};

				// Estimate memory usage
				this.memoryUsage += JSON.stringify(node).length * 2; // Rough estimate

				return node;
			} catch (error) {
				console.error(`Error loading ${file}:`, error);
				return null;
			}
		});

		const results = await Promise.allSettled(loadPromises);

		for (const result of results) {
			if (result.status === "fulfilled" && result.value) {
				this.cache[cacheKey].set(result.value.id, result.value);
			}
		}
	}

	/**
   * Gets a node from cache, loading if necessary
   */
	async getNode(type: string, id: string): Promise<GraphNode | null> {
		const cacheKey = `${type}s` as keyof GraphCache;
		const nodeCache = this.cache[cacheKey];

		if (nodeCache.has(id)) {
			return nodeCache.get(id)!;
		}

		// Load on-demand if not in cache
		return this.loadNodeOnDemand(type, id);
	}

	/**
   * Loads a single node on-demand (fallback)
   */
	private async loadNodeOnDemand(type: string, id: string): Promise<GraphNode | null> {
		try {
			const graphDataPath = join(process.cwd(), "apps", "web", "public", "api", "graph", `${type}s`);
			const filePath = join(graphDataPath, `${id}.json`);
			const fileContent = await readFile(filePath, "utf-8");
			const nodeData = JSON.parse(fileContent);

			const node: GraphNode = {
				id,
				type: type as GraphNode["type"],
				name: nodeData.name || { ja: id },
				data: nodeData,
			};

			// Cache the node
			const cacheKey = `${type}s` as keyof GraphCache;
			this.cache[cacheKey].set(id, node);

			return node;
		} catch (error) {
			console.error(`Error loading node ${type}/${id} on demand:`, error);
			return null;
		}
	}

	/**
   * Gets all nodes of a specific type
   */
	getNodesByType(type: string): GraphNode[] {
		const cacheKey = `${type}s` as keyof GraphCache;
		return [...this.cache[cacheKey].values()];
	}

	/**
   * Gets nodes related to a given node
   */
	async getRelatedNodes(node: GraphNode): Promise<GraphNode[]> {
		const relatedNodes: GraphNode[] = [];
		const edges = node.data.edges || [];

		for (const edge of edges) {
			if (edge.node?.type && edge.node.id) {
				const relatedNode = await this.getNode(edge.node.type, edge.node.id);
				if (relatedNode) {
					relatedNodes.push(relatedNode);
				}
			}
		}

		return relatedNodes;
	}

	/**
   * Checks memory usage and triggers cleanup if needed
   */
	private checkMemoryUsage(): void {
		if (this.memoryUsage > this.maxMemoryUsage) {
			console.warn(`Memory usage (${Math.round(this.memoryUsage / 1024 / 1024)}MB) approaching limit`);

			// Clear least recently used caches or implement LRU strategy
			// For now, just trigger garbage collection
			if (globalThis.gc) {
				globalThis.gc();
			}
		}
	}

	/**
   * Gets cache statistics
   */
	getCacheStats(): Record<string, number> {
		return {
			brands: this.cache.brands.size,
			categories: this.cache.categories.size,
			items: this.cache.items.size,
			manuals: this.cache.manuals.size,
			series: this.cache.series.size,
			totalNodes: Object.values(this.cache).reduce((sum, map) => sum + map.size, 0),
			memoryUsageMB: Math.round(this.memoryUsage / 1024 / 1024),
		};
	}

	/**
   * Validates that all expected nodes are loaded
   */
	async validatePreload(): Promise<{ valid: number; missing: number }> {
		const expectedCounts = {
			brands: 78,
			categories: 5,
			items: 6009,
			manuals: 2258,
			series: 135,
		};

		let valid = 0;
		let missing = 0;

		for (const [type, expectedCount] of Object.entries(expectedCounts)) {
			const actualCount = this.cache[type as keyof GraphCache].size;

			if (actualCount === expectedCount) {
				valid += actualCount;
			} else {
				missing += expectedCount - actualCount;
				console.warn(`${type}: expected ${expectedCount}, found ${actualCount}`);
			}
		}

		console.log(`Validation complete: ${valid} valid, ${missing} missing`);
		return { valid, missing };
	}

	/**
   * Clears all caches (useful for memory management)
   */
	clearCache(): void {
		for (const map of Object.values(this.cache)) map.clear();
		this.memoryUsage = 0;
		console.log("Graph cache cleared");
	}
}

// Singleton instance for reuse across the application
let globalPreloader: GraphPreloader | null = null;

export function getGraphPreloader(): GraphPreloader {
	if (!globalPreloader) {
		globalPreloader = new GraphPreloader();
	}
	return globalPreloader;
}