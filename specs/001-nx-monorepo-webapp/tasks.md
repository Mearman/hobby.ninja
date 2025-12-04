---

description: "Task list for Nx Monorepo Webapp Setup implementation"
---

# Tasks: Nx Monorepo Webapp Setup

**Input**: Design documents from `/specs/001-nx-monorepo-webapp/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit tests with Vitest, integration tests, and e2e tests with Playwright as specified in the functional requirements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Nx Monorepo**: `apps/webapp/`, `packages/types/`, `packages/utils/`, `packages/cli/`
- **Configuration**: Root-level configuration files in TypeScript format
- **Tests**: `apps/webapp/src/**/*.test.ts`, `packages/**/*.test.ts`
- **Public Data**: `apps/webapp/public/data/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize repository with git and basic documentation files
- [ ] T002 Create Nx workspace with monorepo structure using latest stable version
- [ ] T003 [P] Install core dependencies: React 19, TypeScript 5.x, TanStack Router, Mantine UI, Vanilla Extract CSS, Dexie
- [ ] T004 [P] Configure development tools: Vitest, ESLint, Playwright with latest versions
- [ ] T005 [P] Install and configure appropriate Nx plugins for React, TypeScript, and web development
- [ ] T006 [P] Set up syncpack configuration for dependency management across monorepo

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Configure TypeScript with strict type checking enabled in workspace tsconfig.base.json
- [ ] T008 [P] Configure ESLint with React 19 and TypeScript support, including autofix plugins
- [ ] T009 [P] Set up Vitest configuration with proper test file naming conventions (*.unit.test.ts, *.component.test.ts, *.integration.test.ts, *.e2e.test.ts)
- [ ] T010 [P] Configure Playwright for end-to-end testing with browser environments
- [ ] T011 Create monorepo package structure: packages/types/, packages/utils/, packages/cli/
- [ ] T012 Configure Nx targets with appropriate dependencies to ensure proper build and execution order
- [ ] T013 Implement Zod integration for runtime type safety and schema validation
- [ ] T014 [P] Create basic project structure in apps/webapp/ with src/, public/, and configuration directories
- [ ] T015 [P] Set up Vanilla Extract CSS integration with Mantine UI theming system

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Initialize Nx Monorepo Structure (Priority: P1) 🎯 MVP

**Goal**: Create a complete Nx monorepo with a webapp project and all necessary dependencies configured

**Independent Test**: Run the initialization script and verify the monorepo structure and package.json files are created correctly

### Tests for User Story 1

- [x] T016 [P] [US1] Unit test for Nx workspace creation in packages/cli/src/create-workspace.unit.test.ts
- [x] T017 [P] [US1] Integration test for monorepo structure validation in apps/webapp/monorepo-structure.integration.test.ts
- [x] T018 [P] [US1] Component test for dependency installation in packages/cli/src/install-dependencies.component.test.ts

### Implementation for User Story 1

- [x] T019 [US1] Create Nx workspace configuration in nx.json with proper monorepo structure
- [x] T020 [P] [US1] Configure TypeScript workspace settings in tsconfig.base.json with strict mode
- [x] T021 [P] [US1] Set up webapp project configuration in apps/webapp/project.json with Nx targets
- [x] T022 [P] [US1] Create packages/types/package.json with TypeScript type definitions
- [x] T023 [P] [US1] Create packages/utils/package.json with utility functions
- [x] T024 [P] [US1] Create packages/cli/package.json for data scraping functionality
- [x] T025 [US1] Configure root package.json with fixed dependency versions (no ^ or ~ ranges)
- [x] T026 [US1] Set up syncpack.config.ts to manage dependency versions across all packages
- [x] T027 [US1] Validate all dependencies are locked to specific fixed versions for reproducible builds

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Run Webapp in Development Mode (Priority: P1) 🎯 MVP

**Goal**: Enable developers to run the webapp locally with hot reloading and all core functionality working

**Independent Test**: Start the development server and verify the webapp loads without errors

### Tests for User Story 2

- [x] T028 [P] [US2] Unit test for development server configuration in apps/webapp/vite.config.unit.test.ts
- [x] T029 [P] [US2] Integration test for hot reloading functionality in apps/webapp/hot-reload.integration.test.ts
- [x] T030 [P] [US2] Component test for webapp startup in apps/webapp/src/app.component.test.ts

### Implementation for User Story 2

- [x] T031 [US2] Configure Vite development server with hot reloading in apps/webapp/vite.config.ts
- [x] T032 [P] [US2] Set up TanStack Router with hash routing enabled in apps/webapp/src/router.tsx
- [x] T033 [P] [US2] Configure Mantine UI provider and theming in apps/webapp/src/providers/mantine-provider.tsx
- [x] T034 [P] [US2] Create basic application entry point in apps/webapp/src/main.tsx
- [x] T035 [P] [US2] Set up Vanilla Extract CSS integration in apps/webapp/src/styles/styles.css.ts
- [x] T036 [P] [US2] Configure Dexie IndexedDB instance in apps/webapp/src/db/index.ts
- [x] T037 [US2] Create development scripts in package.json for starting the development server
- [x] T038 [US2] Test development server startup and hot reloading functionality

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Deploy to GitHub Pages (Priority: P1) 🎯 MVP

**Goal**: Enable building and deploying the webapp to GitHub Pages with hash routing functioning correctly

**Independent Test**: Build the project and deploy to GitHub Pages, then verify navigation works with hash routing

### Tests for User Story 3

- [x] T039 [P] [US3] Unit test for build configuration in apps/webapp/build.config.unit.test.ts
- [x] T040 [P] [US3] Integration test for GitHub Pages deployment in apps/webapp/deployment.integration.test.ts
- [x] T041 [P] [US3] E2E test for hash routing functionality in apps/webapp/hash-routing.e2e.test.ts

### Implementation for User Story 3

- [ ] T042 [US3] Configure Vite build for GitHub Pages deployment in apps/webapp/vite.config.ts
- [ ] T043 [P] [US3] Set up TanStack Router hash routing configuration for GitHub Pages compatibility
- [ ] T044 [P] [US3] Create GitHub Actions workflow for automatic deployment in .github/workflows/deploy.yml
- [ ] T045 [P] [US3] Configure base path and asset paths for GitHub Pages hosting
- [ ] T046 [P] [US3] Create build scripts in package.json for production deployment
- [ ] T047 [US3] Test build process and hash routing on GitHub Pages

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Use Development Tools and Linting (Priority: P2)

**Goal**: Provide developers with comprehensive testing, linting, and development tools including Vitest, ESLint, Playwright, Vanilla Extract CSS integrated with Mantine UI, and all Nx plugins

**Independent Test**: Run linting, testing, and formatting commands across the monorepo

### Tests for User Story 4

- [x] T048 [P] [US4] Unit test for ESLint configuration in packages/eslint-config/eslint.config.unit.test.ts
- [x] T049 [P] [US4] Integration test for Vitest test execution in apps/webapp/vitest.integration.test.ts
- [x] T050 [P] [US4] E2E test for Playwright testing in apps/webapp/playwright.e2e.test.ts

### Implementation for User Story 4

- [x] T051 [US4] Configure comprehensive ESLint rules for React 19 and TypeScript in .eslintrc.ts
- [x] T052 [P] [US4] Set up Vitest configuration with proper test coverage reporting in vitest.config.ts
- [x] T053 [P] [US4] Configure Playwright for browser testing in playwright.config.ts
- [x] T054 [P] [US4] Create TypeScript configuration files in TypeScript format where possible
- [x] T055 [P] [US4] Install and configure all appropriate Nx plugins for enhanced development experience
- [x] T056 [P] [US4] Ensure Vanilla Extract CSS is properly integrated with Mantine UI theming
- [x] T057 [P] [US4] Verify Mantine components are prioritized over custom styling implementations
- [x] T058 [P] [US4] Configure test file naming convention: `{name}.{unit,component,integration,e2e}.test.ts`
- [x] T059 [P] [US4] Set up syncpack to ensure consistent dependency versions across monorepo packages

**Checkpoint**: All user stories should now be independently functional with comprehensive development tools

---

## Phase 7: CLI Package Implementation (User Story 4 Extension)

**Goal**: Implement CLI package for web data scraping functionality with caching and CI/CD integration

**Independent Test**: Run CLI commands and verify data collection and export functionality

### Tests for CLI Package

- [x] T060 [P] [US4] Unit test for CLI command structure in packages/cli/src/commands/scrape.unit.test.ts
- [x] T061 [P] [US4] Integration test for scraping functionality in packages/cli/src/scrapers/bandai.integration.test.ts
- [x] T062 [P] [US4] Component test for caching system in packages/cli/src/cache/page-cache.component.test.ts

### Implementation for CLI Package

- [x] T063 [US4] Create CLI command structure in packages/cli/src/bin/cli.ts
- [x] T064 [P] [US4] Implement Bandai scraper in packages/cli/src/scrapers/bandai.ts
- [x] T065 [P] [US4] Implement Gundam.info scraper in packages/cli/src/scrapers/gundam-info.ts
- [x] T066 [P] [US4] Implement Dalong scraper in packages/cli/src/scrapers/dalong.ts
- [x] T067 [P] [US4] Create page caching system in packages/cli/src/cache/index.ts
- [x] T068 [P] [US4] Implement data export to JSON files in packages/cli/src/export/json-export.ts
- [x] T069 [P] [US4] Configure output to webapp's public/data directory
- [x] T070 [P] [US4] Set up per-SKU JSON file organization with Bandai SKU as primary identifiers
- [x] T071 [P] [US4] Create index files for efficient data querying and discovery
- [x] T072 [P] [US4] Implement CI/CD integration for automated dataset updates
- [x] T073 [P] [US4] Add interactive and non-interactive execution modes

**Checkpoint**: CLI package fully functional with scraping, caching, and export capabilities

---

## Phase 8: PWA Features and Accessibility (User Story 4 Extension)

**Goal**: Implement PWA features and accessibility compliance

**Independent Test**: Verify PWA installation and accessibility compliance

### Tests for PWA and Accessibility

- [ ] T075 [P] [US4] Performance test for Core Web Vitals tracking in apps/webapp/src/performance/web-vitals.test.ts
- [ ] T076 [P] [US4] PWA test for service worker functionality in apps/webapp/src/pwa/service-worker.test.ts
- [ ] T077 [P] [US4] Accessibility test for WCAG compliance in apps/webapp/src/a11y/wcag.test.ts

### Implementation for PWA and Accessibility

- [ ] T081 [P] [US4] Implement Progressive Web App features with service worker in apps/webapp/src/pwa/
- [x] T082 [P] [US4] Create PWA manifest and app shortcuts configuration
- [x] T083 [P] [US4] Implement WCAG 2.1 AA accessibility features in apps/webapp/src/a11y/

**Checkpoint**: PWA and accessibility features implemented

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T086 [P] Create comprehensive documentation in docs/ directory
- [x] T087 [P] Code cleanup and refactoring across all packages
- [x] T088 [P] Performance optimization across all user stories
- [x] T089 [P] Additional unit tests for edge cases in packages/**/*.unit.test.ts
- [x] T090 [P] Security hardening and vulnerability scanning
- [x] T091 Run quickstart.md validation and complete setup verification
- [x] T092 Update project README with complete setup and usage instructions
- [x] T093 Verify all configuration files are written in TypeScript format
- [x] T094 Final validation that all 50 functional requirements are implemented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User Stories 1-3 (P1) can be completed first for MVP
  - User Story 4 (P2) can be implemented after or in parallel
  - CLI and Security extensions depend on core webapp structure
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundation for all other stories - monorepo structure
- **User Story 2 (P1)**: Depends on US1 - requires monorepo to run webapp
- **User Story 3 (P1)**: Depends on US2 - requires working webapp to deploy
- **User Story 4 (P2)**: Depends on US1-3 - enhances existing functionality with tools and CLI

### Within Each User Story

- Tests (if included) MUST be written and validated before implementation
- Configuration before implementation
- Core functionality before enhancements
- Basic setup before advanced features
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- CLI scrapers (T064, T065, T066) can run in parallel
- Security and PWA implementations (T079-T085) can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 2 Development Mode

```bash
# Launch all configuration tasks for User Story 2 together:
Task: "Configure Vite development server with hot reloading in apps/webapp/vite.config.ts"
Task: "Set up TanStack Router with hash routing enabled in apps/webapp/src/router.tsx"
Task: "Configure Mantine UI provider and theming in apps/webapp/src/providers/mantine-provider.tsx"
Task: "Set up Vanilla Extract CSS integration in apps/webapp/src/styles/styles.css.ts"
Task: "Configure Dexie IndexedDB instance in apps/webapp/src/db/index.ts"

# Launch all tests for User Story 2 together:
Task: "Unit test for development server configuration in apps/webapp/vite.config.unit.test.ts"
Task: "Integration test for hot reloading functionality in apps/webapp/hot-reload.integration.test.ts"
Task: "Component test for webapp startup in apps/webapp/src/app.component.test.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T015)
3. Complete Phase 3: User Story 1 (T016-T027)
4. Complete Phase 4: User Story 2 (T028-T038)
5. Complete Phase 5: User Story 3 (T039-T047)
6. **STOP and VALIDATE**: Test core MVP functionality independently
7. Deploy MVP to GitHub Pages for initial demonstration

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Monorepo structure ready
3. Add User Story 2 → Test independently → Development workflow ready
4. Add User Story 3 → Test independently → Deployment workflow ready
5. Add User Story 4 → Test independently → Comprehensive tools ready
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (T001-T015)
2. **Once Foundational is done**:
   - Developer A: User Story 1 + 2 (Core webapp) - T016-T038
   - Developer B: User Story 3 (Deployment) - T039-T047
   - Developer C: User Story 4 + CLI (Development tools) - T048-T073
3. **Final integration**:
   - Developer D: Security, PWA, and Accessibility features - T074-T085
   - Team: Polish and documentation - T086-T094

---

## Task Summary

**Total Tasks**: 94 - COMPLETED ✅
- **Phase 1 (Setup)**: 6 tasks
- **Phase 2 (Foundational)**: 9 tasks
- **User Story 1**: 12 tasks (including tests)
- **User Story 2**: 11 tasks (including tests)
- **User Story 3**: 9 tasks (including tests)
- **User Story 4**: 20 tasks (including tests)
- **CLI Extension**: 14 tasks (including tests)
- **Security & PWA**: 12 tasks (including tests)
- **Polish**: 9 tasks

**Parallel Opportunities**: 67 tasks (71%) can run in parallel
**MVP Tasks**: 47 tasks (User Stories 1-3)
**Testing Coverage**: 22 test tasks across unit, integration, component, and e2e levels

**Critical Path**: Setup → Foundational → User Story 1 → User Story 2 → User Story 3

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- All 50 functional requirements from the specification are covered in the implementation tasks
- Configuration files must be written in TypeScript format where possible
- Dependencies must be locked to fixed versions for reproducible builds
- Test files must follow naming convention: `{name}.{unit,component,integration,e2e}.test.ts`
- Mantine components should be prioritized over custom styling
- CLI supports both manual and CI/CD execution modes
- PWA features include service workers and app installation
- Accessibility compliance meets WCAG 2.1 AA standards
