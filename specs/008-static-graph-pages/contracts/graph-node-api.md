# Graph Node API Contract

**Version**: 1.0.0
**Date**: 2025-12-07
**Purpose**: Define interfaces for static graph node page generation

## Core Interfaces

### IGraphNodeService
Service responsible for loading and processing graph node data for static generation.

```typescript
interface IGraphNodeService {
  // Core data loading
  loadAllNodes(): Promise<GraphNode[]>
  loadNodeByType(type: NodeType, id: string): Promise<GraphNode | null>
  loadNodesByType(type: NodeType): Promise<GraphNode[]>

  // Relationship handling
  getRelatedNodes(nodeId: string, relationshipType: string): Promise<GraphNode[]>
  getNodeRelationships(nodeId: string): Promise<RelationshipEdges>

  // Static generation support
  generateRouteList(): Promise<string[]>
  validateAllNodes(): Promise<ValidationResult[]>
}
```

### IStaticPageGenerator
Service responsible for generating static HTML pages from graph node data.

```typescript
interface IStaticPageGenerator {
  // Page generation
  generatePage(node: GraphNode, relatedNodes: GraphNode[]): Promise<StaticPage>
  generateBatch(nodes: GraphNode[], batchSize: number): Promise<StaticPage[]>

  // File operations
  writePage(page: StaticPage, outputPath: string): Promise<void>
  writeSitemap(pages: StaticPage[]): Promise<void>

  // Template handling
  renderTemplate(template: string, data: PageData): Promise<string>
  optimizeHtml(html: string): Promise<string>
}
```

### IBuildOptimizer
Service responsible for optimizing build performance for large-scale generation.

```typescript
interface IBuildOptimizer {
  // Memory management
  configureMemoryLimits(): void
  forceGarbageCollection(): void

  // Build optimization
  createBuildPlan(nodes: GraphNode[]): BuildPlan
  executeChunkedBuild(plan: BuildPlan): Promise<BuildResult>

  // Performance monitoring
  trackMemoryUsage(): MemoryMetrics
  trackBuildProgress(): BuildProgress
}
```

## Data Transfer Objects

### PageData
Data structure passed to page templates for rendering.

```typescript
interface PageData {
  node: GraphNode
  relatedNodes: {
    brands: GraphNode[]
    categories: GraphNode[]
    items: GraphNode[]
    manuals: GraphNode[]
    series: GraphNode[]
  }
  navigation: {
    breadcrumbs: Breadcrumb[]
    prevNode: GraphNode | null
    nextNode: GraphNode | null
  }
  metadata: {
    title: string
    description: string
    keywords: string[]
    canonicalUrl: string
  }
}
```

### StaticPage
Generated static page with content and metadata.

```typescript
interface StaticPage {
  path: string          // Output file path
  url: string           // Public URL
  title: string         // Page title
  description: string   // Meta description
  content: string       // HTML content
  size: number          // File size in bytes
  generatedAt: Date     // Generation timestamp
  dependencies: string[] // Template and asset dependencies
}
```

### BuildPlan
Optimized build execution plan for large-scale generation.

```typescript
interface BuildPlan {
  totalNodes: number
  batchSize: number
  chunks: BuildChunk[]
  estimatedMemory: number
  estimatedDuration: number
}

interface BuildChunk {
  id: string
  nodes: GraphNode[]
  priority: number
  dependencies: string[]
}
```

## Service Specifications

### Graph Data Loading Service
**Purpose**: Load and validate all graph node data from JSON files.

**Methods**:

#### `loadAllNodes(): Promise<GraphNode[]>`
- **Description**: Load all graph nodes from `public/api/graph/` directories
- **Returns**: Array of all validated GraphNode objects
- **Performance**: Processes 8,485+ files with memory optimization
- **Error Handling**: Graceful handling of malformed files with detailed error reporting

#### `loadNodeByType(type: NodeType, id: string): Promise<GraphNode | null>`
- **Description**: Load specific node by type and ID
- **Parameters**:
  - `type`: Node type (brand, category, item, manual, series)
  - `id`: Unique node identifier
- **Returns**: GraphNode if found, null otherwise
- **Performance**: O(1) lookup with cached indexing

#### `generateRouteList(): Promise<string[]>`
- **Description**: Generate list of all static routes to be created
- **Returns**: Array of route paths (e.g., `["/brand/30mm", "/item/01_1000"]`)
- **Validation**: Ensures all routes are unique and accessible

### Static Page Generation Service
**Purpose**: Generate HTML pages from graph node data using unified template.

**Methods**:

#### `generatePage(node: GraphNode, relatedNodes: GraphNode[]): Promise<StaticPage>`
- **Description**: Generate static HTML page for a single graph node
- **Parameters**:
  - `node`: Primary graph node data
  - `relatedNodes`: Connected nodes for navigation and cross-references
- **Returns**: Complete static page with metadata
- **Template**: Unified template adapts based on node.type
- **Optimization**: HTML minification and critical CSS inlining

#### `generateBatch(nodes: GraphNode[], batchSize: number): Promise<StaticPage[]>`
- **Description**: Generate multiple pages in batch with memory management
- **Parameters**:
  - `nodes`: Array of graph nodes to process
  - `batchSize`: Number of nodes to process simultaneously
- **Returns**: Array of generated static pages
- **Performance**: Chunked processing to prevent memory overflow
- **Error Handling**: Individual page failures don't stop batch processing

#### `writeSitemap(pages: StaticPage[]): Promise<void>`
- **Description**: Generate XML sitemap for SEO
- **Parameters**: Array of all generated static pages
- **Output**: `sitemap.xml` in build output directory
- **SEO**: Includes lastmod dates and priority rankings

### Build Optimization Service
**Purpose**: Optimize build performance for large-scale static generation.

**Methods**:

#### `createBuildPlan(nodes: GraphNode[]): BuildPlan`
- **Description**: Create optimized build execution plan
- **Parameters**: Array of all nodes to generate
- **Returns**: Structured build plan with chunking strategy
- **Optimization**: Prioritizes frequently accessed nodes, groups related nodes
- **Memory**: Estimates memory requirements and adjusts chunk sizes

#### `executeChunkedBuild(plan: BuildPlan): Promise<BuildResult>`
- **Description**: Execute build using optimized chunked approach
- **Parameters**: Pre-computed build plan
- **Returns**: Build execution results with metrics
- **Monitoring**: Real-time progress tracking and memory usage monitoring
- **Recovery**: Automatic retry for failed chunks

## Error Handling

### Service Exceptions
All services implement standardized error handling:

```typescript
interface ServiceError {
  code: string           // Unique error code
  message: string        // Human-readable error message
  details: any          // Additional error context
  timestamp: Date       // Error occurrence time
  retryable: boolean    // Whether operation can be retried
}
```

### Error Codes
- `NODE_NOT_FOUND`: Requested graph node does not exist
- `INVALID_RELATIONSHIP`: Relationship references non-existent node
- `TEMPLATE_RENDER_ERROR`: Template rendering failure
- `FILE_WRITE_ERROR`: Static page file write failure
- `MEMORY_LIMIT_EXCEEDED`: Build process exceeded memory limits
- `BUILD_TIMEOUT`: Individual chunk exceeded time limits

## Performance Requirements

### Build Performance
- **Total Build Time**: <30 minutes for 8,485+ pages
- **Memory Usage**: <100MB during build execution
- **Concurrent Processing**: 10 pages maximum per batch
- **Error Recovery**: <5% page failure rate acceptable

### Page Generation
- **Page Size**: <50KB average HTML size
- **Render Time**: <500ms per page generation
- **Template Cache**: 100% template reuse across node types
- **Asset Optimization**: Critical CSS inlined, non-critical deferred

### Validation Performance
- **Node Validation**: <1ms per node
- **Relationship Validation**: <5ms per node with relationships
- **Full Validation**: <10 seconds for complete dataset

## Integration Points

### TanStack Router Integration
```typescript
// Route definitions for static generation
interface StaticRoute {
  path: string
  component: React.ComponentType
  loader: () => Promise<PageData>
  generateStaticParams: () => Promise<StaticParam[]>
}
```

### Vite Build Integration
```typescript
// Vite plugin configuration
interface ViteSSGConfig {
  routes: string[]
  template: string
  onBeforePageRender: (page: PageContext) => Promise<void>
  onAfterPageRender: (page: GeneratedPage) => Promise<void>
}
```

### Nx Executor Integration
```typescript
// Nx build target configuration
interface NxSSGTarget {
  executor: '@nx/vite:build'
  options: {
    mode: 'production'
    ssr: true
    generateStaticRoutes: true
  }
  dependsOn: ['@hobby-ninja/types:build', '@hobby-ninja/utils:build']
}
```