---

description: "Task list for Bandai Hobby Catalog Discovery feature implementation"
---

# Tasks: Bandai Hobby Catalog Discovery

**Input**: Design documents from `/specs/007-bandai-items-scrape/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/

**Tests**: Included - Test-First Development required per Constitution

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create catalog discovery types in packages/cli/src/cli/types/catalog-discovery.ts
- [ ] T002 [P] Create catalog discovery test directory structure packages/cli/src/tests/catalog-discovery/
- [ ] T003 [P] Create scraper test directory structure packages/scrapers/src/tests/catalog-discovery/

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core functionality needed before user stories

- [ ] T004 Create CatalogDiscoveryOptions interface in packages/cli/src/cli/types/catalog-discovery.ts
- [ ] T005 Create CatalogDiscoveryResult interface in packages/cli/src/cli/types/catalog-discovery.ts
- [ ] T006 Create CatalogRange interface in packages/cli/src/cli/types/catalog-discovery.ts
- [ ] T007 Create CatalogDiscoveryInput interface in packages/cli/src/cli/types/catalog-discovery.ts
- [ ] T008 Write unit tests for catalog discovery types in packages/cli/src/tests/catalog-discovery/types.test.ts

## Phase 3: User Story 1 - Catalog URL Discovery

**Goal**: Discover all item URLs from Bandai hobby catalog pages
**Independent Test**: Run discovery on one catalog range and verify it generates valid item URLs

### Tests (Test-First Development)

- [ ] T009 [P] Write unit test for catalog page URL extraction in packages/cli/src/tests/catalog-discovery/url-extraction.test.ts
- [ ] T010 [P] Write unit test for catalog range processing in packages/cli/src/tests/catalog-discovery/range-processing.test.ts
- [ ] T011 [P] Write unit test for error handling during discovery in packages/cli/src/tests/catalog-discovery/error-handling.test.ts

### Implementation

- [ ] T012 [US1] Create catalog discovery core logic in packages/cli/src/cli/catalog-discovery.ts
- [ ] T013 [US1] Implement extractItemUrlsFromCatalogPage method in packages/cli/src/cli/catalog-discovery.ts
- [ ] T014 [US1] Implement processCatalogRanges method in packages/cli/src/cli/catalog-discovery.ts
- [ ] T015 [US1] Add URL extraction logic using existing BaseScraper patterns in packages/cli/src/cli/catalog-discovery.ts
- [ ] T016 [US1] Add catalog page error handling and logging in packages/cli/src/cli/catalog-discovery.ts
- [ ] T017 [US1] [P] Write integration tests for catalog discovery in packages/scrapers/src/tests/catalog-discovery/integration.test.ts

## Phase 4: User Story 2 - CLI Command Integration

**Goal**: Simple CLI command to discover and scrape all catalog items
**Independent Test**: Run new CLI option and verify end-to-end functionality

### Tests (Test-First Development)

- [ ] T018 [P] Write unit test for CLI option parsing in packages/cli/src/tests/catalog-discovery/cli-options.test.ts
- [ ] T019 [P] Write unit test for ScrapeCommand extension in packages/cli/src/tests/catalog-discovery/command-extension.test.ts
- [ ] T020 [P] Write integration test for end-to-end catalog discovery in packages/cli/src/tests/catalog-discovery/e2e.test.ts

### Implementation

- [ ] T021 [US2] Extend ScrapeCommand class in packages/cli/src/cli/scrape.ts to support --source bandai-items-catalog
- [ ] T022 [US2] Add --ranges option parsing in packages/cli/src/cli/scrape.ts
- [ ] T023 [US2] Add --dry-run option implementation in packages/cli/src/cli/scrape.ts
- [ ] T024 [US2] Integrate catalog discovery with existing BandaiHobbyScraper in packages/cli/src/cli/scrape.ts
- [ ] T025 [US2] Pass discovered URLs to existing scraper pipeline in packages/cli/src/cli/scrape.ts
- [ ] T026 [US2] Extend ScrapeResult interface for catalog discovery statistics in packages/cli/src/cli/scrape.ts
- [ ] T027 [US2] Add catalog discovery progress logging using existing patterns in packages/cli/src/cli/scrape.ts
- [ ] T028 [US2] [P] Extend existing CLI tests to include catalog discovery scenarios in packages/cli/src/tests/scrape.test.ts

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, documentation, and optimization

- [ ] T029 Add TypeScript type definitions to packages/cli/src/index.ts exports
- [ ] T030 Update CLI help text to include catalog discovery options in packages/cli/src/cli/index.ts
- [ ] T031 Add catalog discovery examples to CLI documentation
- [ ] T032 Verify integration with existing rate limiting and caching in packages/cli/src/cli/scrape.ts
- [ ] T033 Test resume functionality with catalog discovery in packages/cli/src/tests/catalog-discovery/resume.test.ts
- [ ] T034 Test error recovery and retry logic integration in packages/cli/src/tests/catalog-discovery/recovery.test.ts
- [ ] T035 [P] Performance test with large catalog ranges in packages/cli/src/tests/catalog-discovery/performance.test.ts

## Dependencies & Execution Order

### Story Dependencies
- **US1 → US2**: Catalog discovery must be implemented before CLI integration
- **Setup → Foundational**: Type definitions needed before implementation
- **Tests → Implementation**: Test-first development requires tests written first

### Parallel Execution Opportunities

**Within Phase 3 (US1)**:
- T009, T010, T011: Test writing can be parallel
- T012, T013, T014, T015, T016: Implementation can be parallel after tests

**Within Phase 4 (US2)**:
- T018, T019, T020: Test writing can be parallel
- T021, T022, T023: CLI option implementation can be parallel
- T024, T025, T026, T027: Integration logic can be parallel

**Within Phase 5**:
- Most tasks can be parallel as they are independent optimizations

### Critical Path
T004 → T005 → T006 → T007 → T009 → T012 → T018 → T021 → T028

## Implementation Strategy

### MVP Scope (Phase 3 Only)
- Complete User Story 1: Basic catalog URL discovery
- Essential CLI integration for testing
- Core error handling and logging

### Incremental Delivery
1. **First Increment**: Catalog discovery with dry-run capability
2. **Second Increment**: Full CLI integration with existing scraper
3. **Third Increment**: Polish, optimization, and advanced features

### Independent Test Criteria
- **US1**: Discovery works on `https://bandai-hobby.net/item/01_1000/` and outputs valid URLs
- **US2**: `gundam-scraper scrape --source bandai-items-catalog --dry-run` completes successfully
- **Integration**: Discovered URLs process correctly through existing scraper pipeline