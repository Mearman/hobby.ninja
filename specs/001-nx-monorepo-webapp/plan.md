# Implementation Plan: Nx Monorepo Webapp Setup

**Branch**: `001-nx-monorepo-webapp` | **Date**: 2025-12-03 | **Spec**: ./spec.md
**Input**: Feature specification from `/specs/001-nx-monorepo-webapp/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Initialize an Nx monorepo containing a React 19 webapp with TypeScript strict mode, TanStack Router (hash routing for GitHub Pages), Mantine UI, Vanilla Extract CSS, and Dexie for client-side storage. Include comprehensive development tooling (Vitest, ESLint, Playwright), shared packages (types, utils, CLI for data scraping), and automated CI/CD integration for dataset updates.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x (latest stable)
**Primary Dependencies**: React 19, Nx (latest), TanStack Router (latest), Mantine UI (latest), Dexie (latest), Vanilla Extract CSS (latest)
**Storage**: IndexedDB via Dexie (client-side user data), JSON files in public/data directory (main dataset static)
**Testing**: Vitest (unit/integration), Playwright (e2e), ESLint (linting)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge) - GitHub Pages static hosting
**Project Type**: Web application (monorepo structure)
**Performance Goals**: <2s hot reload, <10s dev server start, efficient data loading with per-SKU JSON files
**Constraints**: GitHub Pages static hosting, hash routing requirement, user data stored in IndexedDB
**Scale/Scope**: Single-page application with potential 1000+ Gunpla kits, modular package structure

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Basic Project Principles (Applied)

- **Test-First Development**: Vitest + Playwright configured with comprehensive test coverage requirements
- **Modular Architecture**: Separate packages (types, utils, CLI) with clear boundaries and responsibilities
- **Static Hosting Compatibility**: Hash routing and JSON file structure optimized for GitHub Pages
- **Modern Tooling**: Latest versions with TypeScript strict mode and comprehensive linting
- **CI/CD Integration**: Both manual and automated execution modes for data updates

### 🚪 Quality Gates Passed

- ✅ All requirements have acceptance criteria defined
- ✅ Technical architecture supports GitHub Pages constraints
- ✅ Package structure promotes code reuse and maintainability
- ✅ Testing strategy covers unit, integration, and e2e levels
- ✅ Performance considerations addressed with per-SKU JSON organization

### ✅ Post-Design Validation (Phase 1 Complete)

**Architecture Validation**:
- ✅ Nx monorepo structure validated for scalability
- ✅ React 19 + TypeScript strict mode configuration confirmed
- ✅ TanStack Router hash routing compatible with GitHub Pages
- ✅ Mantine + Vanilla Extract CSS integration designed
- ✅ Dexie IndexedDB strategy appropriate for user-specific data
- ✅ Static JSON files approach optimal for main Gunpla dataset

**Package Structure Validation**:
- ✅ Types package provides centralized TypeScript interfaces
- ✅ Utils package offers reusable functionality
- ✅ CLI package supports both manual and CI/CD workflows
- ✅ Caching system enables efficient development iterations

**Development Workflow Validation**:
- ✅ Incremental atomic commits strategy defined
- ✅ Comprehensive testing strategy (Vitest + Playwright)
- ✅ Modern ESLint configuration with autofix support
- ✅ Zod integration for runtime type safety

**Data Architecture Validation**:
- ✅ Per-SKU JSON files optimize for GitHub Pages hosting (main dataset)
- ✅ Index files enable efficient data discovery and querying
- ✅ Bandai SKU canonical identification system implemented
- ✅ Page caching reduces development iteration time
- ✅ IndexedDB reserved for user data (preferences, collections, personal data)
- ✅ Clear separation between static dataset and dynamic user data

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

**Structure Decision**: Nx monorepo with single webapp in apps/webapp directory, following standard Nx conventions for React applications

## Development Workflow

### Incremental Atomic Conventional Commits

**Requirement**: Create incremental atomic conventional commits as development progresses

**Commit Strategy**:
- **Atomic**: Each commit contains one logical change or feature
- **Incremental**: Commit frequently after each meaningful progress
- **Conventional Format**: Follow conventional commit specification
  - `feat:` for new features
  - `fix:` for bug fixes
  - `chore:` for maintenance, configuration, dependencies
  - `refactor:` for code restructuring without functional changes
  - `test:` for adding or updating tests
  - `docs:` for documentation changes

**Examples**:
- `feat: add Nx workspace initialization`
- `feat: create shared types package structure`
- `feat: implement CLI scraping commands`
- `fix: resolve TypeScript strict mode errors`
- `chore: configure ESLint plugins`
- `test: add unit tests for utility functions`

**Benefits**:
- Clear development history
- Easy code review process
- Simplified rollback capabilities
- Automated changelog generation
- Better team collaboration

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
