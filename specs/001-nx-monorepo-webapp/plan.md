# Implementation Plan: Nx Monorepo Webapp Setup

**Branch**: `001-nx-monorepo-webapp` | **Date**: 2025-12-03 | **Spec**: [Nx Monorepo Webapp Setup](spec.md)
**Input**: Feature specification from `/specs/001-nx-monorepo-webapp/spec.md` with Vanilla Extract CSS styling

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This implementation plan creates a modern Nx monorepo with a React 19 webapp using TypeScript (strict), TanStack Router (hash routing for GitHub Pages), Mantine UI, Vanilla Extract CSS, Dexie (IndexedDB), Vitest, ESLint, Playwright, and comprehensive Nx plugins. All packages use their latest stable versions, and all configuration files will be written in TypeScript where possible. The solution provides a complete development environment optimized for static site deployment on GitHub Pages with type-safe styling via Vanilla Extract.

## Technical Context

**Language/Version**: TypeScript 5.x (latest stable), React 19
**Primary Dependencies**: Nx (latest stable), TanStack Router (latest stable), Mantine UI (latest stable), Vanilla Extract CSS (latest stable), Dexie (latest stable), Vitest (latest stable), ESLint (latest stable), Playwright (latest stable), Vite (latest stable)
**Storage**: IndexedDB via Dexie (client-side), No backend storage required
**Testing**: Vitest (unit), Playwright (e2e), ESLint (linting)
**Target Platform**: Web browsers, GitHub Pages (static hosting)
**Project Type**: Web application (monorepo structure)
**Performance Goals**: <10s development startup, <2s hot reload, static site optimization
**Constraints**: GitHub Pages hosting (hash routing required), static deployment, modern browser support
**Scale/Scope**: Single webapp project within monorepo, development team of 1-5 developers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Status**: ✅ PASSED - No constitution constraints defined in template
**Post-Design Status**: ✅ PASSED - Design aligns with standard development practices

### Validation Results
- **Constitution File**: Contains template placeholders only, no actual constraints
- **Design Compliance**: All design decisions follow industry best practices
- **Architecture**: Standard Nx monorepo structure with appropriate separation of concerns
- **Complexity**: Appropriate for project scope (single webapp in monorepo)
- **Security**: Implements standard security practices for client-side applications

### Architecture Compliance
- ✅ Follows Nx monorepo conventions
- ✅ Implements TypeScript strict mode
- ✅ Uses modern React patterns (React 19)
- ✅ Appropriate testing strategy (Vitest + Playwright)
- ✅ Static deployment strategy compatible with GitHub Pages

**Final Assessment**: No constitution violations detected, design ready for implementation phase.

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
/
├── nx.json                    # Nx workspace configuration
├── package.json               # Root dependencies and scripts
├── tsconfig.base.json         # TypeScript configuration
├── .eslintrc.json             # ESLint configuration
├── vitest.config.ts           # Vitest configuration
├── playwright.config.ts       # Playwright configuration
├── project.json               # Nx task configuration
├── apps/
│   └── webapp/               # Main React 19 webapp
│       ├── src/
│       │   ├── app/
│       │   │   ├── router.tsx        # TanStack Router setup (hash routing)
│       │   │   └── root.tsx          # App root component
│       │   ├── components/           # Reusable UI components
│       │   ├── pages/               # Page components
│       │   ├── hooks/               # Custom React hooks
│       │   ├── lib/                 # Utility functions
│       │   ├── styles/              # Vanilla Extract CSS and Mantine theme
│       │   │   ├── theme.css.ts      # Mantine theme configuration
│       │   │   ├── global.css.ts     # Global styles
│       │   │   ├── variables.css.ts  # CSS variables and tokens
│       │   │   └── components/       # Component-specific styles
│       │   └── main.tsx             # Application entry point
│       ├── public/                  # Static assets
│       │   ├── data/                # CLI-generated JSON data files
│       │   │   ├── kits/            # Individual Gunpla kit files by SKU
│       │   │   │   ├── 5060243.json  # MG RX-78-2 Gundam ver.3.0
│       │   │   │   ├── 5059412.json  # RG 1/144 RX-78-2 Gundam
│       │   │   │   ├── 4977101.json  # PG 1/60 RX-78-2 Gundam
│       │   │   │   ├── 5061928.json  # MG MS-06S Zaku II Char Aznable
│       │   │   │   ├── 4573125.json  # RG 1/144 MS-06S Zaku II
│       │   │   │   └── ...          # One JSON per Bandai SKU
│       │   │   ├── indexes/         # Index files for efficient querying
│       │   │   │   ├── kits-by-name.json # Name-based index
│       │   │   │   ├── kits-by-series.json # Series-based index
│       │   │   │   ├── kits-by-grade.json # Grade-based index
│       │   │   │   ├── kits-by-year.json # Release year index
│       │   │   │   └── kits-search.json # Full-text search index
│       │   │   ├── metadata/        # Reference data and metadata
│       │   │   │   ├── series.json      # Gundam series reference
│       │   │   │   ├── manufacturers.json # Manufacturer data
│       │   │   │   ├── grades.json       # Grade definitions (MG, RG, etc.)
│       │   │   │   └── scales.json       # Scale definitions (1/144, 1/100, etc.)
│       │   │   └── images/          # Scrape images and media
│       │   │       ├── kits/           # Kit images organized by Bandai SKU
│       │   │       │   ├── 5060243/     # MG RX-78-2 images
│       │   │       │   ├── 5059412/     # RG RX-78-2 images
│       │   │       │   └── ...          # One folder per SKU
│       │   │       └── box-art/        # Box art collections
│       │   ├── favicon.ico          # Site favicon
│       │   └── manifest.json        # PWA manifest
│       ├── project.json             # Nx project configuration
│       ├── tsconfig.json           # TypeScript configuration
│       ├── vite.config.ts          # Vite configuration
│       └── index.html              # HTML template
├── packages/
│   ├── types/                    # Shared TypeScript types and interfaces
│   │   ├── src/
│   │   │   ├── index.ts          # Main exports file
│   │   │   ├── gunpla.ts         # Gundam/mecha specific types
│   │   │   ├── api.ts            # API response types
│   │   │   ├── storage.ts        # IndexedDB/Dexie types
│   │   │   └── config.ts         # Configuration types
│   │   ├── package.json          # Package configuration
│   │   ├── tsconfig.json         # TypeScript configuration
│   │   └── project.json          # Nx project configuration
│   └── utils/                    # Reusable utility functions
│       ├── src/
│       │   ├── index.ts          # Main exports file
│       │   ├── format.ts         # String/formatting utilities
│       │   ├── validation.ts     # Zod validation schemas
│       │   ├── storage.ts        # Storage utility functions
│       │   ├── api.ts            # API helper functions
│       │   └── constants.ts      # Application constants
│       ├── package.json          # Package configuration
│       ├── tsconfig.json         # TypeScript configuration
│       └── project.json          # Nx project configuration
│   └── cli/                      # Web scraping CLI tool
│       ├── src/
│       │   ├── index.ts          # CLI entry point
│       │   ├── commands/         # CLI command implementations
│       │   │   ├── scrape.ts     # Main scraping command
│       │   │   ├── parse.ts      # Data parsing command
│       │   │   ├── export.ts     # Data export command
│       │   │   ├── update.ts     # Full dataset update (CI-friendly)
│       │   │   └── dev.ts        # Development mode with interactive options
│       │   ├── config/           # CLI configuration
│       │   │   ├── cli.config.ts # CLI mode configurations
│       │   │   ├── development.ts # Development mode settings
│       │   │   └── ci.ts          # CI/CD mode settings
│       │   ├── scrapers/         # Website-specific scrapers
│       │   │   ├── bandai.ts     # Bandai official site scraper
│       │   │   ├── gundam-info.ts # Gundam.info scraper
│       │   │   └── dalong.ts     # Dalong's Gunpla reviews scraper
│       │   ├── parsers/          # Data parsing utilities
│       │   │   ├── kit-parser.ts # Gunpla kit data parser
│       │   │   ├── image-parser.ts # Image data parser
│       │   │   └── price-parser.ts # Price data parser
│       │   └── utils/            # CLI-specific utilities
│       │       ├── http.ts       # HTTP client utilities
│       │       ├── file.ts       # File system utilities
│       │       ├── cache.ts      # Page caching system
│       │       └── logger.ts     # Logging utilities
│       ├── cache/                 # Persistent page cache storage
│       │   ├── bandai/           # Bandai site cached pages
│       │   │   ├── product-5060243.html # Cached product page
│       │   │   └── product-5059412.html # Cached product page
│       │   ├── gundam-info/      # Gundam.info cached pages
│       │   └── dalong/           # Dalong's site cached pages
│       │       ├── 5060243/      # Cached review pages by SKU
│       │       └── metadata.json # Cache metadata and timestamps
│       ├── package.json          # Package configuration
│       ├── tsconfig.json         # TypeScript configuration
│       └── project.json          # Nx project configuration
└── tools/
    ├── webpack/                  # Webpack configurations
    └── executors/                # Custom Nx executors
├── .github/
│   └── workflows/               # GitHub Actions workflows
│       ├── update-dataset.yml   # Automated dataset updates
│       ├── deploy-webapp.yml    # Web app deployment
│       └── test-cli.yml         # CLI testing workflow
├── .vscode/
│   ├── tasks.json               # VS Code tasks for CLI
│   └── launch.json              # Debug configurations
```

**Structure Decision**: Nx monorepo with single webapp in apps/webapp directory, following standard Nx conventions for React applications

## Archive Inspiration

The implementation should draw inspiration from the existing archived projects in `../archive/`:

### Reference Projects for Patterns:
- **hobby.ninja**: Turborepo monorepo structure with shadcn/ui components
- **collect**: T3 Stack patterns with tRPC, Drizzle ORM, NextAuth.js
- **gunpla-tracker**: Next.js + shadcn/ui implementation patterns
- **gundam-db**: Data processing, scraping techniques, and Ollama integration
- **mechsplorer/mechallector**: Next.js documentation and build patterns

### Inspirational Elements (Not Direct Copy):
- **Monorepo Organization**: Package structure and shared configurations
- **Component Patterns**: shadcn/ui integration approaches
- **Data Processing**: Scraping techniques and data structures
- **Build Systems**: Nx/Turborepo configuration patterns
- **Testing Strategies**: Unit, integration, and e2e testing approaches
- **Deployment Patterns**: GitHub Pages and static hosting strategies

### Modern Improvements:
- Updated to latest package versions (React 19, Nx latest, etc.)
- Enhanced TypeScript strict mode configuration
- Improved caching and CI/CD integration
- Better error handling and logging
- Modern ESLint plugins and autofix capabilities
- Optimized data organization with per-SKU JSON files

