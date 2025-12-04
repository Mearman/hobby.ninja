# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The Gundam Data Scraper is a CLI package that extracts product data, technical documentation, and series content from three Bandai sources (bandai-hobby.net, manual.bandai.hobby.net, gundam.info) with intelligent language detection and file organization. The system implements a two-phase approach: **Profile Building Phase** uses progressive enhancement (Cheerio → Playwright escalation) to analyze page types and determine their optimal rendering strategy (static vs dynamic), then **Production Phase** uses the cached profiles to efficiently scrape with the correct method (Cheerio for static pages, Playwright for dynamic pages). This ensures comprehensive data extraction while minimizing unnecessary Playwright overhead.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Node.js 20+, TypeScript 5.7 (strict)
**Primary Dependencies**: Cheerio for HTML parsing (primary), Playwright for profile building (limited), Commander.js for CLI, Zod for validation, zlib for compression
**Storage**: File system with JSON output (.en.json/.jp.json), scraping profiles (JSON), compressed page cache (gzip), checkpoint files for resumable operations
**Testing**: Vitest for unit tests, Playwright for integration tests (profile building only), file system fixtures for data validation
**Target Platform**: Node.js CLI tool for Nx monorepo (Linux/macOS/Windows)
**Project Type**: CLI package (packages/cli) in Nx monorepo
**Performance Goals**: 3000+ pages/hour production scraping, <10s average page processing, 95% cache hit reduction for re-parsing, optimized Playwright usage based on page type requirements
**Constraints**: <50ms Cheerio-only page fetch, <200ms Playwright page fetch for dynamic pages, <10GB cache storage with automatic cleanup, rate limiting to avoid blocking
**Scale/Scope**: 10,000+ product pages, 5,000+ manual documents, 1000+ series content pages, multi-language content extraction
**Two-Phase Strategy**: Profile Building Phase (determine Cheerio vs Playwright per page type) → Production Phase (use cached optimal method per page type)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**✅ Constitution Compliance Verified - Phase 1 Complete:**

**I. Test-First Development**: ✅
- Unit tests with Vitest for all extraction logic and utilities
- Integration tests with Playwright for scraper workflows
- Test fixtures for data validation and language detection
- Coverage targets: 80% statements, 75% branches, 80% functions, 80% lines

**II. Modular Monorepo Architecture**: ✅
- CLI package in packages/cli with single responsibility
- Minimal cross-package dependencies (only types, utils)
- Independent testing and clear separation of concerns

**III. Static Hosting Compatibility**: ✅
- CLI tool produces static JSON files (.jp.json/.en.json)
- No server-side processing required
- Compatible with GitHub Pages deployment

**V. Comprehensive TypeScript**: ✅
- Strict typing throughout with complete interface definitions
- Zod schemas for runtime validation
- No untyped JavaScript - all configuration .ts files

**VI. Configuration Type Safety**: ✅
- All config files .ts with noEmit: true
- Included in TypeScript project references
- Type errors block builds

**VII. Build Process Isolation**: ✅
- Source files remain pristine with no in-place compilation
- Build outputs to dist/ directory only
- Development tools use transpilation pipelines

**IX. Nx Build System**: ✅
- Using @nx/executors for optimized caching and dependency tracking
- project.json with proper target inference
- Minimal manual command execution

**X. Persistence and Resilience**: ✅
- Progressive enhancement strategy (Cheerio → Playwright)
- Comprehensive error handling with retry mechanisms
- Checkpoint-based resumable operations
- Root cause investigation for anti-bot measures

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/cli/
├── src/
│   ├── scrapers/
│   │   ├── bandai-hobby.ts
│   │   ├── bandai-manual.ts
│   │   ├── gundam-info.ts
│   │   └── base-scraper.ts
│   ├── utils/
│   │   ├── language-detection.ts
│   │   ├── cache-manager.ts
│   │   ├── checkpoint.ts
│   │   └── rate-limiter.ts
│   ├── types/
│   │   ├── product-data.ts
│   │   ├── manual-data.ts
│   │   ├── series-data.ts
│   │   └── cache-types.ts
│   ├── schemas/
│   │   └── validation.ts
│   ├── cli/
│   │   └── index.ts
│   └── index.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── cache/
├── output/
│   ├── bandai-hobby/
│   ├── manual-data/
│   └── gundam-info/
└── project.json
```

**Structure Decision**: CLI package in packages/cli following Nx monorepo conventions, with modular scrapers, shared utilities, and clear separation of concerns. File-based output organized by source and language.

## Two-Phase Scraping Strategy

### Phase 1: Profile Building (One-Time Analysis)

The system analyzes each unique page type across the three sources to determine optimal rendering strategy:

1. **Progressive Enhancement Analysis**: Start with Cheerio → escalate to Playwright if needed
2. **Page Type Classification**: Group similar pages by URL patterns and HTML structure
3. **Rendering Strategy Assignment**: Determine whether each page type requires static or dynamic extraction
4. **Profile Creation**: Store optimal extraction method and selectors for each page type

**Example Profile Output:**
```json
{
  "bandai-hobby:product-detail": {
    "requiresPlaywright": false,
    "selectors": { "name": ".product-title", "price": ".price" },
    "extractionMethod": "cheerio"
  },
  "bandai-hobby:search-results": {
    "requiresPlaywright": true,
    "selectors": { "products": ".product-card", "pagination": ".next-page" },
    "extractionMethod": "playwright",
    "waitForSelector": ".product-grid"
  }
}
```

### Phase 2: Production Scraping (Optimized Execution)

Using cached profiles, the system selects the appropriate extraction method for each page:

1. **URL Pattern Matching**: Match current URL to cached page type profile
2. **Method Selection**: Use Cheerio for static pages, Playwright for dynamic pages
3. **Optimized Extraction**: Apply pre-determined selectors and strategies
4. **Performance Gains**: Avoid unnecessary Playwright overhead for static content

**Performance Benefits:**
- **Static pages**: 95% processed with Cheerio (~50ms per page)
- **Dynamic pages**: Only pages requiring JavaScript use Playwright (~200ms per page)
- **Overall efficiency**: 80-90% reduction in Playwright usage vs universal approach
- **Consistent quality**: Profile-based extraction ensures reliable data capture

## Complexity Tracking

> **No constitutional violations - all complexity justified by requirements**

The implementation complexity is justified by the multi-source nature of the data extraction requirements:

| Complexity Element | Justification | Simpler Alternative Rejected |
|-------------------|----------------|-----------------------------|
| Three separate scrapers | Different site structures, anti-bot measures, and data patterns per source | Single scraper would be fragile and hard to maintain |
| Language detection system | Pages may be Japanese or English, requires proper file organization (.jp.json/.en.json) | Assuming single language would lose critical data context |
| Caching system | Development efficiency - rapid parsing iteration without refetching 1000+ pages | Direct fetching would be slow, expensive, and anti-bot unfriendly |
| Checkpoint system | Large-scale operations (10,000+ pages) require resumable processing | Single-run processing would fail on interruption, wasting hours of work |
| Rate limiting | Respectful scraping required to avoid IP blocking from Japanese sites | Aggressive scraping would quickly get blocked and fail completely |
