import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transformEdgesToUltraCompact, parseUltraCompactEdgeKey } from './edge-transformer';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GraphNode {
  id: string;
  type: 'item' | 'brand' | 'category' | 'series' | 'manual';
  name: {
    ja: string;
    en: string;
  };
  description?: string[];
  accessories?: string[];
  contents?: string[];
  images?: string[];
  sourceUrl?: string;
  url?: string;
  extractedAt?: string;
}

export interface UnifiedEdge {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  sourceType: string;
  targetType: string;
}

export interface UnifiedEdge {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  sourceType: string;
  targetType: string;
}

interface UltraCompactEdgeMap {
  [edgeKey: string]: Record<string, never>;
}

interface UnifiedData {
  nodes: GraphNode[];
  edges: UltraCompactEdgeMap; // Using ultra-compact object format
}

interface BuildResults {
  [category: string]: number;
  nodes: number;
  edges: number;
}

export interface DataProcessorOptions {
  sourceDir?: string;
  outputDir?: string;
  categories?: readonly string[];
}

/**
 * Core data processing logic that can be used by both webpack plugin and external scripts
 */
export class DataProcessor {
  private sourceDir: string;
  private outputDir: string;
  private categories: readonly string[];

  constructor(options: DataProcessorOptions = {}) {
    this.sourceDir = options.sourceDir || path.join(process.cwd(), 'data', 'api', 'graph');
    this.outputDir = options.outputDir || path.join(process.cwd(), 'apps', 'next', 'src', 'data');
    this.categories = options.categories || ['items', 'brands', 'categories', 'series', 'manuals'] as const;
  }

  /**
   * Validate that source directories exist before processing
   */
  private validateSourceDirectories(): void {
    const missingDirs: string[] = [];

    for (const category of this.categories) {
      const categoryDir = path.join(this.sourceDir, category);
      if (!fs.existsSync(categoryDir)) {
        missingDirs.push(category);
      }
    }

    if (missingDirs.length > 0) {
      throw new Error(
        `❌ CRITICAL: Missing data directories for categories: ${missingDirs.join(', ')}\n` +
        `   Expected source directory: ${this.sourceDir}\n` +
        `   Missing subdirectories: ${missingDirs.map(cat => path.join(this.sourceDir, cat)).join(', ')}\n` +
        `   This is a hard failure - data processing cannot continue.`
      );
    }
  }

  /**
   * Build data files by combining individual JSON files and deduplicating edges
   */
  buildDataFiles(): BuildResults {
    // Validate source directories exist first
    this.validateSourceDirectories();

    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const results: BuildResults = {
      nodes: 0,
      edges: 0
    };

    console.log('🔧 Building unified graph data with deduplicated edges...');

    // Step 1: Collect all nodes
    const allNodes: GraphNode[] = [];
    const edgesSet = new Set<string>(); // For deduplication
    const allEdges: UnifiedEdge[] = [];

    for (const category of this.categories) {
      const categoryDir = path.join(this.sourceDir, category);

      try {
        // Read all JSON files in the category directory
        const files = fs.readdirSync(categoryDir).filter((file: string): file is `${string}.json` =>
          file.endsWith('.json')
        );

        if (files.length === 0) {
          throw new Error(`❌ CRITICAL: No JSON files found in ${categoryDir} for category '${category}'`);
        }

        for (const file of files) {
          const filePath = path.join(categoryDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const rawData = JSON.parse(content) as any;

          // Create unified node without edges
          const node: GraphNode = {
            id: rawData.id,
            type: rawData.type,
            name: rawData.name,
            ...(rawData.description && { description: rawData.description }),
            ...(rawData.accessories && { accessories: rawData.accessories }),
            ...(rawData.contents && { contents: rawData.contents }),
            ...(rawData.images && { images: rawData.images }),
            ...(rawData.sourceUrl && { sourceUrl: rawData.sourceUrl }),
            ...(rawData.url && { url: rawData.url }),
            ...(rawData.extractedAt && { extractedAt: rawData.extractedAt })
          };

          allNodes.push(node);

          // Process edges if they exist
          if (rawData.edges) {
            // Process outbound edges (source -> target)
            if (rawData.edges.outbound) {
              for (const edge of rawData.edges.outbound) {
                const edgeKey = `${rawData.id}-${edge.targetId}-${edge.type}`;
                if (!edgesSet.has(edgeKey)) {
                  edgesSet.add(edgeKey);
                  allEdges.push({
                    id: edgeKey,
                    type: edge.type,
                    sourceId: rawData.id,
                    targetId: edge.targetId,
                    sourceType: rawData.type,
                    targetType: edge.targetType
                  });
                }
              }
            }

            // Process inbound edges (target <- source)
            if (rawData.edges.inbound) {
              for (const edge of rawData.edges.inbound) {
                const edgeKey = `${edge.targetId}-${rawData.id}-${edge.type}`;
                if (!edgesSet.has(edgeKey)) {
                  edgesSet.add(edgeKey);
                  allEdges.push({
                    id: edgeKey,
                    type: edge.type,
                    sourceId: edge.targetId,
                    targetId: rawData.id,
                    sourceType: edge.targetType,
                    targetType: rawData.type
                  });
                }
              }
            }
          }
        }

        results[category] = files.length;

      } catch (error) {
        throw new Error(`❌ CRITICAL: Failed to process category '${category}': ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Step 2: Transform edges to ultra-compact format
    console.log('🗜️  Transforming edges to ultra-compact format...');
    const ultraCompactEdges = transformEdgesToUltraCompact(allEdges);
    const spaceSavings = Math.round((1 - JSON.stringify(ultraCompactEdges).length / JSON.stringify(allEdges).length) * 100);

    // Step 3: Write unified graph file with ultra-compact edges
    const unifiedGraphData: UnifiedData = {
      nodes: allNodes,
      edges: ultraCompactEdges
    };

    const unifiedOutputFile = path.join(this.outputDir, 'graph.json');
    fs.writeFileSync(unifiedOutputFile, JSON.stringify(unifiedGraphData, null, 2));
    console.log(`✅ Generated graph.json with ${allNodes.length} nodes and ${Object.keys(ultraCompactEdges).length} edges (${spaceSavings}% space reduction)`);

    // Step 4: Write category-specific files with ultra-compact edges
    for (const category of this.categories) {
      const categoryNodes = allNodes.filter(node => {
        if (category === 'items') return node.type === 'item';
        if (category === 'brands') return node.type === 'brand';
        if (category === 'categories') return node.type === 'category';
        if (category === 'series') return node.type === 'series';
        if (category === 'manuals') return node.type === 'manual';
        return false;
      });

      // Get edges that involve nodes in this category
      const categoryEdges = allEdges.filter(edge =>
        categoryNodes.some(node => node.id === edge.sourceId || node.id === edge.targetId)
      );

      // Transform category edges to ultra-compact format
      const categoryUltraCompactEdges = transformEdgesToUltraCompact(categoryEdges);

      const categoryData: UnifiedData = {
        nodes: categoryNodes,
        edges: categoryUltraCompactEdges
      };

      const categoryOutputFile = path.join(this.outputDir, `${category}.json`);
      fs.writeFileSync(categoryOutputFile, JSON.stringify(categoryData, null, 2));

      console.log(`✅ Generated ${category}.json with ${categoryNodes.length} nodes and ${Object.keys(categoryUltraCompactEdges).length} ultra-compact edges`);
    }

    results.nodes = allNodes.length;
    results.edges = allEdges.length;

    console.log('\n📊 Unified Graph Build Summary:');
    console.log(`   Total nodes: ${allNodes.length}`);
    console.log(`   Total deduplicated edges: ${allEdges.length}`);
    console.log(`   Ultra-compact edges: ${Object.keys(ultraCompactEdges).length} (${spaceSavings}% space reduction)`);
    Object.entries(results).forEach(([category, count]) => {
      if (category !== 'nodes' && category !== 'edges') {
        const categoryNodes = allNodes.filter(node => {
          if (category === 'items') return node.type === 'item';
          if (category === 'brands') return node.type === 'brand';
          if (category === 'categories') return node.type === 'category';
          if (category === 'series') return node.type === 'series';
          if (category === 'manuals') return node.type === 'manual';
          return false;
        });
        console.log(`   ${category}: ${categoryNodes.length} nodes`);
      }
    });

    console.log(`\n✅ Generated category-specific JSON files with ultra-compact edges`);
    console.log(`💾 Overall space savings: ${spaceSavings}% reduction in edge storage`);

    return results;
  }

  /**
   * Get processing statistics
   */
  getStats(): { sourceDir: string; outputDir: string; categories: string[] } {
    return {
      sourceDir: this.sourceDir,
      outputDir: this.outputDir,
      categories: [...this.categories],
    };
  }
}

/**
 * Standalone function for external script execution
 */
export function buildDataFiles(options: DataProcessorOptions = {}): BuildResults {
  const processor = new DataProcessor(options);
  return processor.buildDataFiles();
}

// Run the build if this script is executed directly
if (process.argv[1] === __filename) {
  try {
    const results = buildDataFiles();
    console.log('\n🎉 Build data files completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Build data files failed:', error);
    process.exit(1);
  }
}