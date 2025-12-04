# AGENTS.md

Agent guidance for the Unnamed Gunpla App project.

## Constitution

@.specify/memory/constitution.md

## Project Status

Nx monorepo with React 19 webapp, CLI tools. Core implementation complete (94/94 tasks). Currently resolving TypeScript compilation errors to enable production build.

## Tech Stack

- **Framework**: React 19 + TypeScript 5.7 (strict)
- **Build**: Nx monorepo + Vite 6.0
- **Routing**: TanStack Router (hash routing for GitHub Pages)
- **UI**: Mantine v7 + Vanilla Extract CSS
- **Storage**: IndexedDB via Dexie (client-side)
- **Testing**: Vitest (unit/integration) + Playwright (e2e)
- **Package Manager**: pnpm 10.0.0 with workspace configuration

## Commands

```bash
# Development
pnpm nx serve webapp          # Start dev server
pnpm nx test webapp           # Run tests
pnpm nx lint webapp           # Lint code

# Building
pnpm nx build webapp          # Production build
pnpm nx build cli             # Build CLI tools

# Workspace
pnpm install                 # Install dependencies
pnpm nx graph                # Dependency graph
```

## Architecture

```
apps/webapp/           # Main React application
packages/types/        # Shared TypeScript definitions
packages/utils/        # Common utilities
packages/cli/          # Data scraping CLI
packages/icons/        # Icon components (Tabler)
tools/security/        # Security scanning tools
```

## Key Requirements

- TypeScript strict mode (constitutional)
- Explicit type conversions only (constitutional)
- Tests written before implementation (constitutional)
- Clean workspace - remove temporary files (constitutional)

## Build Status

✅ Dependencies installed
✅ Project structure complete
⚠️ TypeScript compilation errors in progress
❌ Production build blocked by type errors

## Project Overview

@README.md

## Documentation

- Specification templates: `.specify/templates/`
- Feature specifications: `specs/`
- Project docs: `docs/`

Generated: 2025-12-04