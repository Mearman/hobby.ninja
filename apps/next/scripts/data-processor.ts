import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transformEdgesToUltraCompact, parseUltraCompactEdgeKey, type UltraCompactEdgeMap } from './edge-transformer';

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
  // Item-specific fields
  price?: {
    amount: number;
    currency: string;
    taxIncluded?: boolean;
    taxRate?: number;
  };
  releaseDate?: {
    ja?: string;
    year?: number;
    month?: number;
    day?: number;
  };
  scale?: string;
  targetAge?: number;
  // Manual-specific fields
  pdfUrl?: string;
  productNumber?: string;
  productImage?: string;
  thumbnailImage?: string;
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
            ...(rawData.extractedAt && { extractedAt: rawData.extractedAt }),
            // Item-specific fields
            ...(rawData.price && { price: rawData.price }),
            ...(rawData.releaseDate && { releaseDate: rawData.releaseDate }),
            ...(rawData.scale && { scale: rawData.scale }),
            ...(rawData.targetAge && { targetAge: rawData.targetAge }),
            // Manual-specific fields
            ...(rawData.pdfUrl && { pdfUrl: rawData.pdfUrl }),
            ...(rawData.productNumber && { productNumber: rawData.productNumber }),
            ...(rawData.productImage && { productImage: rawData.productImage }),
            ...(rawData.thumbnailImage && { thumbnailImage: rawData.thumbnailImage })
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

    // Step 5: Generate lightweight homepage data (stats + featured items)
    const itemNodes = allNodes.filter(node => node.type === 'item');
    const brandNodes = allNodes.filter(node => node.type === 'brand');
    const categoryNodes = allNodes.filter(node => node.type === 'category');
    const seriesNodes = allNodes.filter(node => node.type === 'series');

    // Get featured items (first 12 by name)
    const featuredItems = [...itemNodes]
      .sort((a, b) => {
        const nameA = typeof a.name === 'string' ? a.name : a.name?.en || a.name?.ja || '';
        const nameB = typeof b.name === 'string' ? b.name : b.name?.en || b.name?.ja || '';
        return nameA.localeCompare(nameB);
      })
      .slice(0, 12);

    // Get popular brands (first 8 by name)
    const popularBrands = [...brandNodes]
      .sort((a, b) => {
        const nameA = typeof a.name === 'string' ? a.name : a.name?.en || a.name?.ja || '';
        const nameB = typeof b.name === 'string' ? b.name : b.name?.en || b.name?.ja || '';
        return nameA.localeCompare(nameB);
      })
      .slice(0, 8);

    const homepageData = {
      stats: {
        totalItems: itemNodes.length,
        totalBrands: brandNodes.length,
        totalCategories: categoryNodes.length,
        totalSeries: seriesNodes.length,
      },
      featuredItems,
      popularBrands,
      categories: categoryNodes,
    };

    const homepageOutputFile = path.join(this.outputDir, 'homepage.json');
    fs.writeFileSync(homepageOutputFile, JSON.stringify(homepageData, null, 2));
    console.log(`✅ Generated homepage.json with pre-computed stats and featured content`);

    // Step 6: Generate lightweight static-params files (IDs only for generateStaticParams)
    const staticParamsData = {
      itemIds: itemNodes.map(node => node.id),
      seriesIds: seriesNodes.map(node => node.id),
      categoryIds: categoryNodes.map(node => node.id),
      brandIds: brandNodes.map(node => node.id),
    };
    const staticParamsOutputFile = path.join(this.outputDir, 'static-params.json');
    fs.writeFileSync(staticParamsOutputFile, JSON.stringify(staticParamsData, null, 2));
    console.log(`✅ Generated static-params.json with ${staticParamsData.itemIds.length} item IDs`);

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

    // Step 7: Copy data files to public/data for client-side fetch
    // This enables the PWA to cache them via service worker for offline support
    // outputDir is apps/next/src/data, so we need to go up two levels to apps/next
    const appRoot = path.resolve(this.outputDir, '../..');
    const publicDataDir = path.join(appRoot, 'public', 'data');
    if (!fs.existsSync(publicDataDir)) {
      fs.mkdirSync(publicDataDir, { recursive: true });
    }

    const filesToCopy = ['items.json', 'brands.json', 'categories.json', 'series.json', 'manuals.json'];
    for (const file of filesToCopy) {
      const srcPath = path.join(this.outputDir, file);
      const destPath = path.join(publicDataDir, file);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
    console.log(`✅ Copied data files to public/data for client-side fetch (offline support)`);

    // Step 8: Generate optimized client-side data files
    // - search-index.json: Lightweight search data (~2MB instead of 19MB)
    // - item-ids.json: Array of valid IDs for validation (~50KB)
    // - items/{id}.json: Full data per item for specific lookups (~3KB each)
    console.log('\n🔧 Generating optimized client-side data files...');

    // 8a: Generate lightweight search index (only fields needed for Fuse.js)
    interface SearchIndexItem {
      id: string;
      name: { ja: string; en?: string } | string;
      brand?: string;
      category?: string;
      series?: string;
      grade?: string;
      scale?: string;
      price?: { amount: number };
      releaseDate?: { year?: number };
    }

    const searchIndexData: SearchIndexItem[] = itemNodes.map(node => ({
      id: node.id,
      name: node.name,
      ...(node.price && { price: { amount: node.price.amount } }),
      ...(node.releaseDate?.year && { releaseDate: { year: node.releaseDate.year } }),
    }));

    // Enrich with relationship data from edges (both IDs for linking and names for display)
    interface ItemRelationships {
      brandIds: string[];
      brandNames: string[];
      categoryIds: string[];
      categoryNames: string[];
      seriesIds: string[];
      seriesNames: string[];
      relatedItemIds: string[];
    }
    const itemEdgeMap = new Map<string, ItemRelationships>();

    // Also build reverse maps for per-page JSON generation
    const brandItemsMap = new Map<string, string[]>(); // brandId -> itemIds
    const categoryItemsMap = new Map<string, string[]>(); // categoryId -> itemIds
    const seriesItemsMap = new Map<string, string[]>(); // seriesId -> itemIds
    const manualItemsMap = new Map<string, string[]>(); // manualId -> itemIds (via series/brand)
    const gradeItemsMap = new Map<string, string[]>(); // grade -> itemIds
    const scaleItemsMap = new Map<string, string[]>(); // scale -> itemIds

    // Process edges to build item relationships
    // Outbound edges from items: sourceType="item", targetType="brand"|"category"|"series"|"item"
    for (const edge of allEdges) {
      if (edge.sourceType === 'item') {
        const itemId = edge.sourceId;
        const existing = itemEdgeMap.get(itemId) || {
          brandIds: [], brandNames: [],
          categoryIds: [], categoryNames: [],
          seriesIds: [], seriesNames: [],
          relatedItemIds: []
        };

        if (edge.targetType === 'brand') {
          const brandNode = brandNodes.find(b => b.id === edge.targetId);
          if (brandNode) {
            existing.brandIds.push(edge.targetId);
            existing.brandNames.push(typeof brandNode.name === 'string' ? brandNode.name : brandNode.name?.en || brandNode.name?.ja);
            // Add to reverse map
            const brandItems = brandItemsMap.get(edge.targetId) || [];
            brandItems.push(itemId);
            brandItemsMap.set(edge.targetId, brandItems);
          }
        }
        if (edge.targetType === 'category') {
          const categoryNode = categoryNodes.find(c => c.id === edge.targetId);
          if (categoryNode) {
            existing.categoryIds.push(edge.targetId);
            existing.categoryNames.push(typeof categoryNode.name === 'string' ? categoryNode.name : categoryNode.name?.en || categoryNode.name?.ja);
            // Add to reverse map
            const categoryItems = categoryItemsMap.get(edge.targetId) || [];
            categoryItems.push(itemId);
            categoryItemsMap.set(edge.targetId, categoryItems);
          }
        }
        if (edge.targetType === 'series') {
          const seriesNode = seriesNodes.find(s => s.id === edge.targetId);
          if (seriesNode) {
            existing.seriesIds.push(edge.targetId);
            existing.seriesNames.push(typeof seriesNode.name === 'string' ? seriesNode.name : seriesNode.name?.en || seriesNode.name?.ja);
            // Add to reverse map
            const seriesItems = seriesItemsMap.get(edge.targetId) || [];
            seriesItems.push(itemId);
            seriesItemsMap.set(edge.targetId, seriesItems);
          }
        }
        if (edge.targetType === 'item') {
          existing.relatedItemIds.push(edge.targetId);
        }
        itemEdgeMap.set(itemId, existing);
      }
    }

    // Build grade and scale maps from item data with hierarchical support
    // Grade hierarchy: parent grades contain all items from their sub-grades
    interface GradeDefinition {
      id: string;
      name: string;
      pattern: RegExp;
      parent?: string; // Parent grade ID for hierarchy
    }

    const gradeDefinitions: GradeDefinition[] = [
      // PG hierarchy
      { id: 'pg', name: 'PG', pattern: /\bpg\b|\bperfect grade\b/i },

      // MG hierarchy
      { id: 'mgex', name: 'MGEX', pattern: /\bmgex\b|\bmaster grade extreme\b/i, parent: 'mg' },
      { id: 'mg-ver-ka', name: 'MG Ver.Ka', pattern: /\bmg\s*ver\.?\s*ka\b|\bversion katoki\b/i, parent: 'mg' },
      { id: 'mg', name: 'MG', pattern: /\bmg\b|\bmaster grade\b/i },

      // RG hierarchy
      { id: 'rg', name: 'RG', pattern: /\brg\b|\breal grade\b/i },

      // HG hierarchy (sub-grades first for proper matching)
      { id: 'hg-uc', name: 'HGUC', pattern: /\bhguc\b|\bhg\s*universal\s*century\b/i, parent: 'hg' },
      { id: 'hg-ce', name: 'HGCE', pattern: /\bhgce\b|\bhg\s*cosmic\s*era\b/i, parent: 'hg' },
      { id: 'hg-ac', name: 'HGAC', pattern: /\bhgac\b|\bhg\s*after\s*colony\b/i, parent: 'hg' },
      { id: 'hg-ibo', name: 'HG IBO', pattern: /\bhg\s*ibo\b|\biron[- ]?blooded/i, parent: 'hg' },
      { id: 'hg-amplified', name: 'HG Amplified', pattern: /\bhg\s*amplified\b/i, parent: 'hg' },
      { id: 'hg', name: 'HG', pattern: /\bhg\b|\bhigh grade\b/i },

      // EG hierarchy
      { id: 'eg', name: 'EG', pattern: /\beg\b|\bentry grade\b/i },

      // SD hierarchy (sub-grades first)
      { id: 'sd-cs', name: 'SD Cross Silhouette', pattern: /\bsd\s*cross\s*silhouette\b|\bsdcs\b/i, parent: 'sd' },
      { id: 'sd-bb', name: 'SD BB Senshi', pattern: /\bsd\s*bb\s*senshi\b|\bbb\s*senshi\b/i, parent: 'sd' },
      { id: 'sd-bb-warrior', name: 'SD BB Warrior', pattern: /\bsd\s*bb\s*warrior\b|\bbb\s*warrior\b/i, parent: 'sd' },
      { id: 'sdex', name: 'SDEX', pattern: /\bsdex\b/i, parent: 'sd' },
      { id: 'sd', name: 'SD', pattern: /\bsd\b/i },

      // Other grades
      { id: 're-100', name: 'RE/100', pattern: /\bre\/100\b|\breborn/i },
      { id: 'fm', name: 'FM', pattern: /\bfm\b|\bfull mechanics\b/i },
      { id: 'figure-rise', name: 'Figure-rise', pattern: /\bfigure[- ]?rise\b/i },
      { id: 'mega-size', name: 'Mega Size', pattern: /\bmega\s*size\b/i },
    ];

    // Track which grades each item belongs to (can be multiple due to hierarchy)
    const itemGradesMap = new Map<string, string[]>(); // itemId -> gradeIds[]

    for (const item of itemNodes) {
      // Build scale map
      if (item.scale) {
        const scaleItems = scaleItemsMap.get(item.scale) || [];
        scaleItems.push(item.id);
        scaleItemsMap.set(item.scale, scaleItems);
      }

      // Build grade map from ALL brand names (not just first)
      const enriched = itemEdgeMap.get(item.id);
      if (enriched?.brandNames.length) {
        const matchedGrades = new Set<string>();

        // Check all brand names for grade matches
        for (const brandName of enriched.brandNames) {
          for (const gradeDef of gradeDefinitions) {
            if (gradeDef.pattern.test(brandName)) {
              matchedGrades.add(gradeDef.id);
              // Also add to parent grade if exists
              if (gradeDef.parent) {
                matchedGrades.add(gradeDef.parent);
              }
              break; // Only one grade per brand name
            }
          }
        }

        // Add item to all matched grades
        for (const gradeId of matchedGrades) {
          const gradeItems = gradeItemsMap.get(gradeId) || [];
          gradeItems.push(item.id);
          gradeItemsMap.set(gradeId, gradeItems);
        }

        // Track grades for this item
        if (matchedGrades.size > 0) {
          itemGradesMap.set(item.id, [...matchedGrades]);
        }
      }
    }

    // Build grade hierarchy metadata for JSON output
    const gradeHierarchy = new Map<string, { parent?: string; children: string[] }>();
    for (const gradeDef of gradeDefinitions) {
      if (!gradeHierarchy.has(gradeDef.id)) {
        gradeHierarchy.set(gradeDef.id, { parent: gradeDef.parent, children: [] });
      }
      if (gradeDef.parent) {
        const parentEntry = gradeHierarchy.get(gradeDef.parent) || { children: [] };
        parentEntry.children.push(gradeDef.id);
        gradeHierarchy.set(gradeDef.parent, parentEntry);
      }
    }

    // Add enriched data to search index (use first name for display)
    for (const item of searchIndexData) {
      const enriched = itemEdgeMap.get(item.id);
      if (enriched) {
        if (enriched.brandNames.length > 0) item.brand = enriched.brandNames[0];
        if (enriched.categoryNames.length > 0) item.category = enriched.categoryNames[0];
        if (enriched.seriesNames.length > 0) item.series = enriched.seriesNames[0];
      }
      // Scale and grade come from item node directly if stored there
      const originalNode = itemNodes.find(n => n.id === item.id);
      if (originalNode?.scale) item.scale = originalNode.scale;
    }

    const searchIndexFile = path.join(publicDataDir, 'search-index.json');
    fs.writeFileSync(searchIndexFile, JSON.stringify(searchIndexData));
    const searchIndexSize = (fs.statSync(searchIndexFile).size / 1024 / 1024).toFixed(2);
    console.log(`✅ Generated search-index.json (${searchIndexSize}MB) with ${searchIndexData.length} items`);

    // 8b: Generate item IDs list for validation
    const itemIdsData = itemNodes.map(node => node.id);
    const itemIdsFile = path.join(publicDataDir, 'item-ids.json');
    fs.writeFileSync(itemIdsFile, JSON.stringify(itemIdsData));
    const itemIdsSize = (fs.statSync(itemIdsFile).size / 1024).toFixed(1);
    console.log(`✅ Generated item-ids.json (${itemIdsSize}KB) with ${itemIdsData.length} IDs`);

    // 8c: Generate per-item JSON files with relationship IDs for linking
    const itemsDir = path.join(publicDataDir, 'items');
    if (!fs.existsSync(itemsDir)) {
      fs.mkdirSync(itemsDir, { recursive: true });
    }

    // Get full item data with enriched relationships (both IDs and names)
    for (const node of itemNodes) {
      const enriched = itemEdgeMap.get(node.id);
      const fullItemData = {
        ...node,
        // Include relationship IDs for linking to other pages
        relationships: {
          brands: enriched?.brandIds.map((id, i) => ({ id, name: enriched.brandNames[i] })) || [],
          categories: enriched?.categoryIds.map((id, i) => ({ id, name: enriched.categoryNames[i] })) || [],
          series: enriched?.seriesIds.map((id, i) => ({ id, name: enriched.seriesNames[i] })) || [],
          relatedItems: enriched?.relatedItemIds || [],
        },
        // Keep legacy fields for backward compatibility
        ...(enriched?.brandNames.length && { brand: enriched.brandNames[0] }),
        ...(enriched?.categoryNames.length && { category: enriched.categoryNames[0] }),
        ...(enriched?.seriesNames.length && { series: enriched.seriesNames[0] }),
      };

      const itemFile = path.join(itemsDir, `${node.id}.json`);
      fs.writeFileSync(itemFile, JSON.stringify(fullItemData));
    }
    console.log(`✅ Generated ${itemNodes.length} per-item JSON files in public/data/items/`);

    // 8d: Generate per-brand JSON files
    const brandsDir = path.join(publicDataDir, 'brands');
    if (!fs.existsSync(brandsDir)) {
      fs.mkdirSync(brandsDir, { recursive: true });
    }

    for (const brand of brandNodes) {
      const itemIds = brandItemsMap.get(brand.id) || [];
      const brandData = {
        ...brand,
        itemIds,
        itemCount: itemIds.length,
      };
      const brandFile = path.join(brandsDir, `${brand.id}.json`);
      fs.writeFileSync(brandFile, JSON.stringify(brandData));
    }
    console.log(`✅ Generated ${brandNodes.length} per-brand JSON files in public/data/brands/`);

    // 8e: Generate per-series JSON files
    const seriesDir = path.join(publicDataDir, 'series');
    if (!fs.existsSync(seriesDir)) {
      fs.mkdirSync(seriesDir, { recursive: true });
    }

    for (const series of seriesNodes) {
      const itemIds = seriesItemsMap.get(series.id) || [];
      const seriesData = {
        ...series,
        itemIds,
        itemCount: itemIds.length,
      };
      const seriesFile = path.join(seriesDir, `${series.id}.json`);
      fs.writeFileSync(seriesFile, JSON.stringify(seriesData));
    }
    console.log(`✅ Generated ${seriesNodes.length} per-series JSON files in public/data/series/`);

    // 8f: Generate per-category JSON files
    const categoriesDir = path.join(publicDataDir, 'categories');
    if (!fs.existsSync(categoriesDir)) {
      fs.mkdirSync(categoriesDir, { recursive: true });
    }

    for (const category of categoryNodes) {
      const itemIds = categoryItemsMap.get(category.id) || [];
      const categoryData = {
        ...category,
        itemIds,
        itemCount: itemIds.length,
      };
      const categoryFile = path.join(categoriesDir, `${category.id}.json`);
      fs.writeFileSync(categoryFile, JSON.stringify(categoryData));
    }
    console.log(`✅ Generated ${categoryNodes.length} per-category JSON files in public/data/categories/`);

    // 8g: Generate per-manual JSON files
    const manualNodes = allNodes.filter(node => node.type === 'manual');
    const manualsDir = path.join(publicDataDir, 'manuals');
    if (!fs.existsSync(manualsDir)) {
      fs.mkdirSync(manualsDir, { recursive: true });
    }

    // Build manual relationships from edges
    for (const manual of manualNodes) {
      // Find related items via shared series/brand edges
      const manualEdges = allEdges.filter(e => e.sourceId === manual.id || e.targetId === manual.id);
      const relatedSeriesIds: string[] = [];
      const relatedBrandIds: string[] = [];

      for (const edge of manualEdges) {
        if (edge.targetType === 'series') relatedSeriesIds.push(edge.targetId);
        if (edge.targetType === 'brand') relatedBrandIds.push(edge.targetId);
        if (edge.sourceType === 'series') relatedSeriesIds.push(edge.sourceId);
        if (edge.sourceType === 'brand') relatedBrandIds.push(edge.sourceId);
      }

      // Find items that share the same series or brand as the manual
      const relatedItemIds = new Set<string>();
      for (const seriesId of relatedSeriesIds) {
        const items = seriesItemsMap.get(seriesId) || [];
        items.forEach(id => relatedItemIds.add(id));
      }

      const manualData = {
        ...manual,
        relatedSeriesIds: [...new Set(relatedSeriesIds)],
        relatedBrandIds: [...new Set(relatedBrandIds)],
        relatedItemIds: [...relatedItemIds],
        relatedItemCount: relatedItemIds.size,
      };
      const manualFile = path.join(manualsDir, `${manual.id}.json`);
      fs.writeFileSync(manualFile, JSON.stringify(manualData));
    }
    console.log(`✅ Generated ${manualNodes.length} per-manual JSON files in public/data/manuals/`);

    // 8h: Generate per-grade JSON files with hierarchy (derived from brand patterns)
    const gradesDir = path.join(publicDataDir, 'grades');
    if (!fs.existsSync(gradesDir)) {
      fs.mkdirSync(gradesDir, { recursive: true });
    }

    // Create a lookup for grade definitions by id
    const gradeDefLookup = new Map<string, GradeDefinition>();
    for (const gradeDef of gradeDefinitions) {
      gradeDefLookup.set(gradeDef.id, gradeDef);
    }

    for (const [gradeId, itemIds] of gradeItemsMap) {
      const gradeDef = gradeDefLookup.get(gradeId);
      const hierarchy = gradeHierarchy.get(gradeId);

      const gradeData = {
        id: gradeId,
        type: 'grade',
        name: gradeDef?.name || gradeId.toUpperCase(),
        // Hierarchy information
        parent: hierarchy?.parent || null,
        children: hierarchy?.children || [],
        // Item data
        itemIds,
        itemCount: itemIds.length,
      };
      const gradeFile = path.join(gradesDir, `${gradeId}.json`);
      fs.writeFileSync(gradeFile, JSON.stringify(gradeData));
    }

    // Also generate a grades index file with hierarchy overview
    const gradesIndex = {
      grades: gradeDefinitions.map(def => ({
        id: def.id,
        name: def.name,
        parent: def.parent || null,
        itemCount: gradeItemsMap.get(def.id)?.length || 0,
      })).filter(g => g.itemCount > 0),
      hierarchy: Object.fromEntries(
        [...gradeHierarchy.entries()].map(([id, h]) => [id, { parent: h.parent || null, children: h.children }])
      ),
    };
    const gradesIndexFile = path.join(publicDataDir, 'grades-index.json');
    fs.writeFileSync(gradesIndexFile, JSON.stringify(gradesIndex));

    console.log(`✅ Generated ${gradeItemsMap.size} per-grade JSON files in public/data/grades/ (with hierarchy)`);

    // 8i: Generate per-scale JSON files
    const scalesDir = path.join(publicDataDir, 'scales');
    if (!fs.existsSync(scalesDir)) {
      fs.mkdirSync(scalesDir, { recursive: true });
    }

    for (const [scale, itemIds] of scaleItemsMap) {
      const scaleId = scale.toLowerCase().replace(/[\/\s:]+/g, '-');
      const scaleData = {
        id: scaleId,
        type: 'scale',
        name: scale,
        itemIds,
        itemCount: itemIds.length,
      };
      const scaleFile = path.join(scalesDir, `${scaleId}.json`);
      fs.writeFileSync(scaleFile, JSON.stringify(scaleData));
    }
    console.log(`✅ Generated ${scaleItemsMap.size} per-scale JSON files in public/data/scales/`);

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
    const options: DataProcessorOptions = {};
    // Support SOURCE_DIR env var for specifying source directory
    if (process.env.SOURCE_DIR) {
      options.sourceDir = process.env.SOURCE_DIR;
    }
    const results = buildDataFiles(options);
    console.log('\n🎉 Build data files completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Build data files failed:', error);
    process.exit(1);
  }
}