# Implementation Plan: Static Graph Pages Generation

**Branch**: `008-static-graph-pages` | **Date**: 2025-12-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-static-graph-pages/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Generate static HTML pages for all 8,485+ graph nodes (brands, categories, items, manuals, series) using TanStack Router's native SSG capabilities with clean path routing for static nodes and hash routing for dynamic features. Custom hobby.ninja domain enables clean URLs (`/brand/30mm`) for graph nodes while maintaining hash routing for interactive features.

## Technical Context

**Language/Version**: TypeScript 5.7+ (strict mode)
**Primary Dependencies**: React 19, TanStack Router v1.89+, Vite 6.0, Mantine v7, Vanilla Extract CSS
**Storage**: JSON files (graph data) + IndexedDB (user data)
**Testing**: Vitest for unit/integration, Playwright for e2e
**Target Platform**: Static web hosting (GitHub Pages) - PWA compatible
**Project Type**: Web application (monorepo with Nx)
**Performance Goals**: <1 second page load time, <30 minute build time for 8,485+ pages, <100MB memory usage during build
**Constraints**: GitHub Pages + custom hobby.ninja domain, clean path routing for static nodes, hash routing for dynamic features, offline capability, static assets only
**Scale/Scope**: 8,485+ static pages, 5 node types (brands, categories, items, manuals, series), hybrid routing system

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Gates Evaluation

✅ **I. Test-First Development**: Implementation requires comprehensive test coverage for 8,485+ pages with Vitest/Playwright
✅ **II. Modular Monorepo Architecture**: Fits existing Nx monorepo structure with apps/webapp as target
✅ **III. Static Hosting Compatibility**: Clean path routing with custom domain maintains GitHub Pages compatibility
✅ **IV. Progressive Web App Standards**: PWA features preserved with static content and service worker
✅ **V. Comprehensive TypeScript Type Checking**: Strict TypeScript 5.7+ required for all SSG infrastructure
✅ **VI. Configuration Type Safety**: All build configs must be TypeScript files with type checking
✅ **VII. Build Process Isolation**: No in-place compilation, outputs confined to dist/ directory
✅ **VIII. Accessibility First**: Mantine components provide WCAG 2.1 AA compliance foundation
✅ **IX. Nx Build System Optimization**: Uses @nx/vite:build and specialized executors
✅ **X. Programmatic Implementation**: Direct TanStack Router SSG usage, no over-engineering
✅ **XI. Persistence and Resilience**: Hybrid routing addresses technical challenges with clean paths for SSG and hash routing for dynamic features
✅ **XII. Security by Default**: Static HTML generation maintains existing CSP and XSS protection

### Gate Status: **PASSED**

All constitutional requirements are compatible with the hybrid routing approach. Clean paths for static nodes and hash routing for dynamic features. No violations identified.

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
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
