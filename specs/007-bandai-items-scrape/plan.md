# Implementation Plan: Bandai Hobby Catalog Discovery

**Branch**: `007-bandai-items-scrape` | **Date**: 2025-12-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-bandai-items-scrape/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add catalog URL discovery functionality to existing Bandai hobby scraper infrastructure. Extend CLI to support discovering item URLs from catalog pages (like `/item/01_1000/`) and pass them to existing `BandaiHobbyScraper` for processing. Leverage existing rate limiting, caching, and resume mechanisms.

## Technical Context

**Language/Version**: TypeScript 5.7+ (strict mode)
**Primary Dependencies**: Existing - Cheerio, Playwright (built-in), BaseScraper, ProfileManager
**Storage**: Files (JSON output to `data/bandai/items/`) + existing cache infrastructure
**Testing**: Vitest for unit/integration tests, follows existing patterns
**Target Platform**: Node.js CLI tool
**Project Type**: CLI extension to existing monorepo scraper infrastructure
**Performance Goals**: Use existing rate limiting (2s delay), maintain current processing speeds
**Constraints**: Must integrate with existing CLI patterns and BaseScraper architecture
**Scale/Scope**: Extends existing scraper to handle catalog discovery, no new infrastructure needed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Test-First Development ✅
- **GATE**: Must write tests before implementation
- **Plan**: Use Vitest, follow existing CLI test patterns in packages/cli/src/
- **Coverage**: Target 80%+ statements, 75%+ branches, 80%+ functions, 80%+ lines

### II. Modular Monorepo Architecture ✅
- **GATE**: Clear package boundaries, minimal cross-dependencies
- **Plan**: Extend existing packages/cli and packages/scrapers, respect boundaries
- **Dependencies**: Use existing BaseScraper, BandaiRateLimiter, CacheManager

### III. Static Hosting Compatibility ✅
- **GATE**: No server-side processing
- **Plan**: CLI tool outputs JSON files, no hosting impact

### V. Comprehensive TypeScript Type Checking ✅
- **GATE**: All .ts files typechecked, no untyped JavaScript
- **Plan**: Follow existing strict TypeScript patterns, extend existing interfaces

### VI. Configuration Type Safety ✅
- **GATE**: Config files typechecked with noEmit: true
- **Plan**: No new configuration needed, uses existing CLI patterns

### VII. Build Process Isolation ✅
- **GATE**: No in-place compilation, outputs to dist/
- **Plan**: Follow existing Nx build patterns for packages/cli

### X. Programmatic Implementation ✅
- **GATE**: YAGNI principle, avoid over-engineering
- **Plan**: Extend existing BandaiHobbyScraper, reuse all infrastructure, minimal additions

### XI. Persistence and Resilience ✅
- **GATE**: Complete production-ready solutions only
- **Plan**: Use existing retry logic, rate limiting, resume functionality

### XII. Automated Barrel Export Management ✅
- **GATE**: No manual index.ts modifications
- **Plan**: Organize code in proper files, let barrelsby handle exports

### IX. Nx Build System Optimization ✅
- **GATE**: Use Nx executors over run-commands
- **Plan**: Extend existing @nx/vite:build and test executors

**GATE STATUS**: ✅ PASSED - All constitutional requirements aligned with plan

## Phase 0: Research Summary

No NEEDS CLARIFICATION markers remained - all technical context established from existing codebase analysis. Key research findings:

### Catalog Page Analysis
- **Decision**: Extend existing `BandaiHobbyScraper` rather than create new scraper
- **Rationale**: Existing scraper already handles `/item/` URLs and has Playwright support
- **Alternatives considered**:
  - New dedicated scraper (rejected - violates DRY principle)
  - Separate discovery tool (rejected - breaks CLI integration)

### Client-Side Rendering Strategy
- **Decision**: Use existing BaseScraper.determineOptimalMethod() automatic detection
- **Rationale**: Built-in Playwright support with intelligent fallback from Cheerio
- **Infrastructure**: ProfileManager will cache rendering requirements per URL pattern

## Phase 1: Design

### Data Model

```typescript
interface CatalogDiscoveryOptions {
  ranges: string[];        // ["01_1000", "02_1000", ...]
  outputDir: string;       // "./data/bandai/items/"
  resume: boolean;         // Use existing resume infrastructure
  cache: boolean;          // Use existing cache infrastructure
}

interface CatalogDiscoveryResult {
  discoveredUrls: string[];
  processedUrls: number;
  successful: number;
  failed: number;
  errors: string[];
  duration: number;
}
```

### CLI Integration

**New Command Option**: `--source bandai-items-catalog`

**Implementation**: Extend existing `ScrapeCommand` with catalog discovery mode
- Reuse existing rate limiting (BandaiRateLimiter)
- Reuse existing caching (CacheManager)
- Reuse existing resume functionality
- Pass discovered URLs to existing `BandaiHobbyScraper`

### Processing Flow

1. **Discovery Phase**: Extract item URLs from catalog pages (`/item/01_1000/`, etc.)
2. **Processing Phase**: Pass URLs to existing `BandaiHobbyScraper.extractFromPage()`
3. **Output Phase**: Save to `data/bandai/items/[id]/[id].json` using existing patterns

## Project Structure

### Documentation (this feature)

```text
specs/007-bandai-items-scrape/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command) - INCLUDED ABOVE
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/cli/src/cli/
├── scrape.ts              # Extend existing ScrapeCommand with catalog discovery
├── catalog-discovery.ts   # NEW: Catalog discovery logic
└── types/                 # NEW: Catalog discovery type definitions

packages/scrapers/src/
├── bandai-hobby.ts        # Extend existing scraper if needed
└── catalog-discovery.ts   # NEW: URL extraction from catalog pages

packages/cli/src/tests/
├── catalog-discovery.test.ts   # NEW: Unit tests for discovery logic
└── scrape.test.ts              # Extend existing CLI tests

packages/scrapers/src/tests/
└── catalog-discovery.test.ts   # NEW: Integration tests for URL extraction
```

**Structure Decision**: Extend existing monorepo packages/cli and packages/scrapers with minimal new files, following established patterns for CLI extensions and scraper functionality.

## Phase 1 Complete ✅

- ✅ Data model designed with TypeScript interfaces
- ✅ CLI API contract defined extending existing patterns
- ✅ Quick start guide with usage examples
- ✅ Project structure mapped to existing monorepo layout
- ✅ Agent context updated with new technology details
- ✅ Constitution Check re-validated post-design

## Next Steps

Run `/speckit.tasks` to generate implementation tasks from this plan.
