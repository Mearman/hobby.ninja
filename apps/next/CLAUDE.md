# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm nx run next:dev           # Start Next.js dev server (Turbopack)
pnpm nx run next:build         # Build for production (static export)
pnpm nx run next:serve         # Serve static build

# From this directory
yarn dev                       # Start dev server
yarn build                     # Build with 8GB memory limit
yarn lint                      # ESLint

# Testing (from monorepo root)
pnpm test                      # Run all tests
pnpm nx run next:test          # Test this app only

# Data processing
yarn build-data                # Process data via tsx scripts/data-processor.ts
```

## Architecture

### Static Export PWA

This is a **fully static Next.js 16 app** with `output: "export"`. It generates 6,000+ static pages at build time for hobby collection management (Gunpla/model kits). All data is embedded at build time.

### Data Flow

```
@hobby-ninja/data package → Server Components → Static HTML
                          ↘ Client Components → IndexedDB (user collections)
```

**Server-only data** (`src/lib/graph-data.ts`): Uses `"server-only"` to prevent client imports. Provides `getAllItems()`, `getAllBrands()`, etc. from the `@hobby-ninja/data` package.

**Client storage** (`src/lib/collection-storage.ts`): Dexie-based IndexedDB for user collections, preferences, and sync.

### Key Patterns

**List Abstraction System** (`src/components/lists/`):

- `GenericListPage` handles all list pages with infinite scroll, filtering, view modes
- Entity configs (`itemConfig`, `manualConfig`, `databaseConfig`) define behavior per type
- Custom hooks: `use-generic-filter.ts`, `use-database-filter.ts`, `use-infinite-scroll.ts`

**URL State Management** (`src/hooks/use-url-state.ts`):

- Filter state synced to URL for shareable links
- URL compression via `src/lib/url-compression.ts`

**Search** (`src/lib/fuse-search.ts`, `src/lib/search-index.ts`):

- Fuse.js for fuzzy client-side search across items

### Route Structure

```
/items/[id]           # Individual item pages
/brands/[id]          # Brand with items list
/categories/[id]      # Category with items list
/series/[id]          # Series with items list
/grades/[id]          # Grade with items list
/scales/[id]          # Scale with items list
/manuals/[id]         # Manual viewer
/collection/          # User collection (client-only)
/database/            # Combined item/manual browser
/search/              # Search interface
```

### Workspace Dependencies

- `@hobby-ninja/data`: Pre-built JSON data (items, brands, categories, series, manuals)
- `@hobby-ninja/types`: Shared TypeScript interfaces
- `@hobby-ninja/utils`: Common utilities

## Tech Stack

- **Framework**: Next.js 16 (static export)
- **UI**: Mantine v8.3 + Tabler Icons
- **Styling**: Vanilla Extract CSS (temporarily disabled for build)
- **PWA**: next-pwa with workbox caching
- **Storage**: Dexie (IndexedDB wrapper)
- **Search**: Fuse.js

## Build Notes

- Build requires 8GB memory (`NODE_OPTIONS='--max-old-space-size=8192'`)
- 6,000+ static pages generated; timeout set to 180s per page
- Worker threads disabled to prevent OOM during static generation
- TypeScript errors ignored during build (handled separately via `nx typecheck`)
