# Quick Start Guide: Static Graph Pages Generation

**Feature**: Static Graph Pages Generation
**Branch**: `008-static-graph-pages`
**Date**: 2025-12-07

## Overview

This feature generates static HTML pages for all 8,485+ graph nodes (brands, categories, items, manuals, series) using TanStack Router's native SSG capabilities. The implementation uses clean path routing for static nodes and hash routing for dynamic features, optimized for GitHub Pages with custom hobby.ninja domain.

## Prerequisites

### Development Environment
- Node.js >= 20.0.0
- pnpm 10.0.0+
- Nx CLI installed globally
- Git with access to repository

### Repository Setup
```bash
# Clone repository (if not already done)
git clone <repository-url>
cd unnamed-gunpla-app

# Switch to feature branch
git checkout 008-static-graph-pages

# Install dependencies
pnpm install
```

## Architecture Overview

### Routing Strategy
- **Static Graph Nodes**: Clean paths (`/brand/30mm`, `/item/01_1000`) - Pre-generated HTML
- **Dynamic Features**: Hash routing (`#/collection`, `#/search`) - Client-side React app
- **Seamless Navigation**: Static pages link to static pages, dynamic features use hash routing

### Build Process
1. **Data Loading**: Preload all 8,485+ graph nodes from JSON files
2. **Route Generation**: Create static routes from graph data
3. **Static Generation**: Generate HTML files for each graph node
4. **Bundle Creation**: Package React app for dynamic features
5. **Optimization**: Memory management and performance tuning

## Key Files and Locations

### Source Code Structure
```
apps/web/src/
├── pages/
│   ├── graph-node-page.tsx          # Unified template for all node types
│   └── ...                          # Existing pages
├── components/
│   └── graph/
│       ├── GraphNodeDetails.tsx     # Type-specific content rendering
│       └── RelatedNodesGrid.tsx      # Related nodes navigation
├── utils/
│   ├── graph-routes-generator.ts    # Route generation from graph data
│   └── graph-preloader.ts           # Memory-efficient data loading
├── router.tsx                       # Hybrid routing configuration
└── entry-ssg.tsx                    # SSG entry point
```

### Configuration Files
```
apps/web/
├── vite.config.ts                   # SSG build configuration
├── project.json                     # Nx build targets
└── public/api/graph/                # Graph data source
    ├── brands/                      # Brand data (78 files)
    ├── categories/                  # Category data (5 files)
    ├── items/                       # Item data (6,009 files)
    ├── manuals/                     # Manual data (2,258 files)
    └── series/                      # Series data (135 files)
```

## Development Commands

### Build Commands
```bash
# Development build (client-side only)
pnpm nx serve web

# Static generation build
pnpm nx run web:build:ssg

# Preview static build locally
pnpm nx run web:serve:ssg

# Incremental build (only modified nodes)
pnpm nx run web:build:ssg:incremental
```

### Testing Commands
```bash
# Unit and integration tests
pnpm nx test web

# End-to-end tests
pnpm nx e2e web

# SSG-specific tests
pnpm nx test web --grep "ssg"
```

## Implementation Steps

### Phase 1: Foundation Setup
1. **Install SSG Dependencies**
   ```bash
   pnpm add -D vite-plugin-react-ssg @tanstack/router-server
   ```

2. **Create Graph Routes Generator**
   - Location: `apps/web/src/utils/graph-routes-generator.ts`
   - Purpose: Scan graph data and generate route list
   - Output: Array of routes like `["/brand/30mm", "/item/01_1000"]`

3. **Create Graph Preloader**
   - Location: `apps/web/src/utils/graph-preloader.ts`
   - Purpose: Memory-efficient loading of 8,485+ nodes
   - Features: Chunked processing, garbage collection

### Phase 2: Router Configuration
1. **Update TanStack Router**
   - Location: `apps/web/src/router.tsx`
   - Changes: Add static routes for graph nodes
   - Approach: Clean paths for SSG, hash routing for dynamic features

2. **Configure SSG Entry Point**
   - Location: `apps/web/src/entry-ssg.tsx`
   - Purpose: Bridge between TanStack Router and static generation
   - Features: Data preloading, template rendering

### Phase 3: Page Components
1. **Create Unified Page Template**
   - Location: `apps/web/src/pages/graph-node-page.tsx`
   - Purpose: Single template for all node types
   - Features: Type-adaptive rendering, responsive design

2. **Create Supporting Components**
   - `GraphNodeDetails.tsx`: Type-specific content display
   - `RelatedNodesGrid.tsx`: Navigation between related nodes

### Phase 4: Build System Integration
1. **Update Vite Configuration**
   - Location: `apps/web/vite.config.ts`
   - Changes: Add SSG plugin, optimize build for large datasets

2. **Update Nx Build Targets**
   - Location: `apps/web/project.json`
   - Changes: Add SSG build targets and incremental build support

## Performance Targets

### Build Performance
- **Total Build Time**: <30 minutes for 8,485+ pages
- **Memory Usage**: <100MB during build execution
- **Incremental Builds**: <2 minutes for typical updates (80% reduction)
- **Batch Processing**: 100 pages per chunk with garbage collection

### Runtime Performance
- **Page Load Time**: <1 second for static pages
- **SEO Crawlability**: 95% content accessible without JavaScript
- **PWA Compatibility**: Offline functionality preserved
- **Navigation**: 100% accuracy for static-to-static links

## Testing Strategy

### Unit Tests
```typescript
// Route generation tests
describe('GraphRoutesGenerator', () => {
  it('should generate correct number of routes', async () => {
    const routes = await generateGraphRoutes();
    expect(routes).toHaveLength(8485);
  });
});

// Preloader tests
describe('GraphPreloader', () => {
  it('should load all nodes without memory leaks', async () => {
    const preloader = new GraphPreloader();
    await preloader.preloadAllNodes();
    expect(preloader.getMemoryUsage()).toBeLessThan(100 * 1024 * 1024);
  });
});
```

### Integration Tests
```typescript
// SSG integration tests
describe('Static Page Generation', () => {
  it('should generate valid HTML for all node types', async () => {
    const pages = await generateAllStaticPages();
    pages.forEach(page => {
      expect(page.content).toContain('<!DOCTYPE html>');
      expect(page.content).toContain(page.node.name.ja);
    });
  });
});
```

### End-to-End Tests
```typescript
// Playwright tests for generated pages
test.describe('Static Graph Pages', () => {
  test('brand page loads correctly', async ({ page }) => {
    await page.goto('/brand/30mm');
    await expect(page.locator('h1')).toContainText('30MM');
  });

  test('navigation between related pages works', async ({ page }) => {
    await page.goto('/item/01_1000');
    await page.click('[data-testid="brand-link"]');
    await expect(page).toHaveURL(/\/brand\/[^/]+$/);
  });
});
```

## Troubleshooting

### Common Issues

#### Memory Issues During Build
**Symptoms**: Build process crashes with out-of-memory errors
**Solutions**:
- Increase Node.js memory limit: `node --max-old-space-size=4096`
- Reduce batch size in graph preloader
- Add explicit garbage collection between chunks

#### Slow Build Times
**Symptoms**: Build exceeds 30-minute target
**Solutions**:
- Enable incremental builds
- Optimize graph data loading with streaming
- Use Nx computational caching

#### Missing Static Pages
**Symptoms**: Some graph nodes don't generate pages
**Solutions**:
- Check graph data JSON files for corruption
- Validate all node relationships exist
- Review error logs for specific failures

#### Navigation Issues
**Symptoms**: Links between pages don't work correctly
**Solutions**:
- Verify static-to-static link generation
- Check URL formatting consistency
- Test both development and production builds

### Debug Commands
```bash
# Check generated routes
node -e "require('./dist/utils/graph-routes-generator.js').generateGraphRoutes().then(console.log)"

# Validate graph data
node -e "require('./dist/utils/graph-preloader.js').validateAllNodes().then(console.log)"

# Test single page generation
node -e "require('./dist/utils/static-generator.js').generatePage('brand', '30mm').then(console.log)"
```

## Deployment

### GitHub Pages with Custom Domain
1. **Build static site**:
   ```bash
   pnpm nx run web:build:ssg
   ```

2. **Deploy to GitHub Pages**:
   ```bash
   git add dist/
   git commit -m "feat: add static graph pages generation"
   git push origin 008-static-graph-pages
   ```

3. **Verify deployment**:
   - Check `https://hobby.ninja/brand/30mm`
   - Validate sitemap at `https://hobby.ninja/sitemap.xml`
   - Test dynamic features at `https://hobby.ninja/collection`

### CI/CD Integration
```yaml
# .github/workflows/deploy.yml
name: Deploy Static Pages
on:
  push:
    branches: [main, 008-static-graph-pages]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm nx run web:build:ssg
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist/apps/web
```

## Next Steps

1. **Phase 1**: Complete foundation setup (dependencies, routes generator, preloader)
2. **Phase 2**: Implement router configuration and SSG integration
3. **Phase 3**: Create page components and templates
4. **Phase 4**: Integrate with build system and optimize performance
5. **Phase 5**: Test thoroughly and deploy to production

## Support

For issues or questions:
1. Check this quickstart guide
2. Review the research document for technical details
3. Examine the data model for entity relationships
4. Reference the API contracts for implementation guidance