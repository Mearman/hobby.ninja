---

description: "Task list for implementing Bandai Manual Content Downloader feature"
---

# Tasks: Bandai Manual Content Downloader

**Input**: Design documents from `/specs/005-manual-downloader/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test-first development is REQUIRED by constitution with 80% coverage using Vitest and Playwright.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: `packages/scrapers/src/manual-downloader/` for implementation
- **Tests**: `packages/scrapers/tests/manual-downloader/` for test suite
- **CLI**: `packages/scrapers/src/manual-downloader/cli/` for command interface

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create manual-downloader directory structure in packages/scrapers/src/manual-downloader/
- [X] T002 [P] Create test directory structure in packages/scrapers/tests/manual-downloader/{unit,integration,e2e,fixtures}
- [X] T003 [P] Update packages/scrapers/tsconfig.json to include new manual-downloader paths
- [X] T004 Update packages/scrapers/package.json with new CLI script "download-manuals"
- [X] T005 [P] Create index.ts export file in packages/scrapers/src/manual-downloader/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create type definitions in packages/scrapers/src/manual-downloader/types/index.ts
- [X] T007 [P] Implement RateLimiterService in packages/scrapers/src/manual-downloader/services/rate-limiter-service.ts
- [X] T008 [P] Implement HttpClient in packages/scrapers/src/manual-downloader/services/http-client.ts
- [X] T009 [P] Implement ValidationError classes in packages/scrapers/src/manual-downloader/services/errors.ts
- [X] T010 [P] Create configuration management in packages/scrapers/src/manual-downloader/services/configuration.ts
- [X] T011 [P] Implement logging service in packages/scrapers/src/manual-downloader/services/logging.ts
- [X] T012 [P] Create crypto utilities for SHA-256 hashing in packages/scrapers/src/manual-downloader/utils/crypto.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Automated Manual Discovery (Priority: P1) 🎯 MVP

**Goal**: Automatically discover and download all available Bandai manual pages without knowing ID range in advance

**Independent Test**: Run discovery process on known small ID range (650-660) and verify it correctly identifies existing vs non-existing pages and downloads valid ones

### Tests for User Story 1 (REQUIRED - Constitution mandates test-first development) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T013 [P] [US1] Unit test for DiscoveryService in packages/scrapers/tests/manual-downloader/unit/discovery-service.test.ts
- [ ] T014 [P] [US1] Unit test for DownloaderService in packages/scrapers/tests/manual-downloader/unit/downloader-service.test.ts
- [ ] T015 [P] [US1] Integration test for discovery workflow in packages/scrapers/tests/manual-downloader/integration/discovery-workflow.test.ts
- [ ] T016 [P] [US1] E2E test with real Bandai URLs in packages/scrapers/tests/manual-downloader/e2e/manual-discovery.test.ts

### Implementation for User Story 1

- [X] T013 [P] [US1] Unit test for DiscoveryService in packages/scrapers/tests/manual-downloader/unit/discovery-service.test.ts
- [X] T014 [P] [US1] Unit test for DownloaderService in packages/scrapers/tests/manual-downloader/unit/downloader-service.test.ts
- [X] T015 [P] [US1] Integration test for discovery workflow in packages/scrapers/tests/manual-downloader/integration/discovery-workflow.test.ts
- [X] T016 [P] [US1] E2E test with real Bandai URLs in packages/scrapers/tests/manual-downloader/e2e/manual-discovery.test.ts
- [X] T017 [P] [US1] Create ManualPage entity in packages/scrapers/src/manual-downloader/types/manual-page.ts
- [X] T018 [P] [US1] Create DownloadSession entity in packages/scrapers/src/manual-downloader/types/download-session.ts
- [X] T019 [US1] Implement DiscoveryService in packages/scrapers/src/manual-downloader/services/discovery-service.ts (depends on T017, T018)
- [X] T020 [US1] Implement DownloaderService in packages/scrapers/src/manual-downloader/services/downloader-service.ts (depends on T019)
- [X] T021 [US1] Add discovery algorithms for unknown ID ranges in DiscoveryService
- [X] T022 [US1] Add 404 error handling and graceful skipping in DownloaderService
- [X] T023 [US1] Add 8-second rate limiting implementation using RateLimiterService
- [X] T024 [US1] Add progress tracking and logging for discovery operations

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Organized File Storage (Priority: P1)

**Goal**: Save downloaded manual pages in organized hierarchical structure using manual ID as filename

**Independent Test**: Run scraper on single known manual ID (652) and verify file is created at ./data/raw/bandai/manuals/652.html

### Tests for User Story 2 (REQUIRED - Constitution mandates test-first development) ⚠️

- [ ] T025 [P] [US2] Unit test for StorageService in packages/scrapers/tests/manual-downloader/unit/storage-service.test.ts
- [ ] T026 [P] [US2] Unit test for file operations in packages/scrapers/tests/manual-downloader/unit/file-operations.test.ts
- [ ] T027 [P] [US2] Integration test for file storage workflow in packages/scrapers/tests/manual-downloader/integration/file-storage.test.ts

### Implementation for User Story 2

- [ ] T028 [P] [US2] Implement StorageService in packages/scrapers/src/manual-downloader/services/storage-service.ts
- [ ] T029 [P] [US2] Create file operations utilities in packages/scrapers/src/manual-downloader/utils/file-operations.ts
- [ ] T030 [US2] Add automatic directory creation for ./data/raw/bandai/manuals/
- [ ] T031 [US2] Add file naming convention {ID}.html implementation
- [ ] T032 [US2] Add file validation and integrity checking in StorageService
- [ ] T033 [US2] Integrate StorageService with DownloaderService from US1

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Progress Tracking and Error Handling (Priority: P2)

**Goal**: Display real-time progress updates and detailed error reporting for operational monitoring

**Independent Test**: Intentionally introduce network errors or invalid URLs and verify proper error reporting and progress tracking

### Tests for User Story 3 (REQUIRED - Constitution mandates test-first development) ⚠️

- [ ] T034 [P] [US3] Unit test for ResumeService in packages/scrapers/tests/manual-downloader/unit/resume-service.test.ts
- [ ] T035 [P] [US3] Unit test for ValidationService in packages/scrapers/tests/manual-downloader/unit/validation-service.test.ts
- [ ] T036 [P] [US3] Integration test for error recovery in packages/scrapers/tests/manual-downloader/integration/error-recovery.test.ts
- [ ] T037 [P] [US3] Integration test for resume functionality in packages/scrapers/tests/manual-downloader/integration/resume-recovery.test.ts

### Implementation for User Story 3

- [ ] T038 [P] [US3] Implement ResumeService in packages/scrapers/src/manual-downloader/services/resume-service.ts
- [ ] T039 [P] [US3] Implement ValidationService in packages/scrapers/src/manual-downloader/services/validation-service.ts
- [ ] T040 [P] [US3] Add JSON-based session persistence with atomic file operations
- [ ] T041 [US3] Add progress event emission and real-time status updates
- [ ] T042 [US3] Add comprehensive error classification and logging
- [ ] T043 [US3] Add resume capability with <5-second recovery time
- [ ] T044 [US3] Add network timeout and retry logic with exponential backoff
- [ ] T045 [US3] Integrate progress tracking into CLI output

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: CLI Interface and User Experience

**Purpose**: Command-line interface for manual downloader operations

- [ ] T046 [P] Create CLI entry point in packages/scrapers/src/manual-downloader/cli/index.ts
- [ ] T047 [P] Implement CLI commands in packages/scrapers/src/manual-downloader/cli/commands.ts
- [ ] T048 Add progress reporting formatting in packages/scrapers/src/manual-downloader/cli/progress-reporting.ts
- [ ] T049 Add command-line argument parsing for URL, output directory, rate limiting options
- [ ] T050 Add help documentation and usage examples
- [ ] T051 Add dry-run mode for testing discovery without downloading
- [ ] T052 Add verbose and quiet output modes

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T053 [P] Update packages/scrapers/README.md with manual downloader documentation
- [ ] T054 [P] Add comprehensive error messages with troubleshooting suggestions
- [ ] T055 [P] Add disk space validation before starting downloads
- [ ] T056 [P] Add configuration file support for default settings
- [ ] T057 [P] Performance optimization for large ID ranges (10K+ pages)
- [ ] T058 [P] Add memory-efficient streaming HTML handling
- [ ] T059 [P] Additional unit tests for edge cases in packages/scrapers/tests/manual-downloader/unit/
- [ ] T060 [P] Security hardening for file path validation and input sanitization
- [ ] T061 Run complete test suite validation for 80% coverage requirement
- [ ] T062 Validate constitutional compliance for all implemented features
- [ ] T063 Run quickstart.md validation to ensure setup instructions work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **CLI Interface (Phase 6)**: Depends on User Stories 1-3 completion
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Integrates with US1 through DownloaderService
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Builds upon US1/US2 for session management

### Within Each User Story

- Tests (T013-T016, T025-T027, T034-T037) MUST be written and FAIL before implementation (Constitution: Test-First Development)
- Type definitions before service implementations
- Service implementations before integration
- Core implementation before CLI integration
- Story validation before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T001-T005)
- All Foundational tasks marked [P] can run in parallel (T007-T012)
- Once Foundational phase completes, User Stories 1 & 2 (both P1) can start in parallel by different team members
- All tests for a user story marked [P] can run in parallel
- CLI tasks (Phase 6) can run in parallel once core functionality is complete
- Polish tasks (Phase 7) can run in parallel once all stories are complete

---

## Parallel Example: User Story 1

```bash
# Terminal 1: Write tests first (ensure they fail)
T013: npm test -- discovery-service.test.ts
T014: npm test -- downloader-service.test.ts
T015: npm test -- discovery-workflow.test.ts
T016: npm test -- manual-discovery.test.ts

# Terminal 2: Parallel implementation (after tests written and failing)
T017: Create ManualPage entity
T018: Create DownloadSession entity

# Terminal 3: Continue parallel implementation
T019: Implement DiscoveryService (depends on T017, T018)
T020: Implement DownloaderService (depends on T019)

# Terminal 4: Supporting utilities
T021: Add discovery algorithms
T022: Add error handling
T023: Add rate limiting
T024: Add progress tracking
```

---

## MVP Scope

**Minimum Viable Product**: User Story 1 (Automated Manual Discovery) + User Story 2 (Organized File Storage)

- **Core Value**: Can discover and download manual pages without knowing ID ranges
- **Independence**: Stories 1 & 2 can be delivered and tested independently
- **Testability**: Both stories have clear independent test criteria
- **Timeline**: Focus on T001-T033 for initial delivery

**Extended MVP**: Add User Story 3 for production readiness
- **Operational**: Progress tracking and error handling essential for real usage
- **Resume Capability**: Required for large ID ranges and reliability

---

## Implementation Strategy

### Phase 1: Foundation First
1. Complete Setup (T001-T005) - establish project structure
2. Complete Foundational (T006-T012) - build core services
3. Validate foundation with integration tests

### Phase 2: MVP Delivery (Stories 1 & 2)
4. Write all tests for Stories 1 & 2 first (T013-T016, T025-T027)
5. Implement Story 1 (T017-T024) - core discovery and download
6. Implement Story 2 (T028-T033) - file organization
7. Validate MVP works end-to-end

### Phase 3: Production Ready
8. Implement Story 3 (T038-T045) - progress tracking and error handling
9. Add CLI interface (T046-T052)
10. Polish and optimize (T053-T063)

### Success Criteria Validation
- **SC-001**: 95% discovery rate validated by T016 e2e tests
- **SC-002**: 100 IDs/minute processing validated by performance benchmarks
- **SC-003**: 99% success rate validated by error handling tests
- **SC-004**: File validity validated by T032 integrity checks
- **SC-005**: <5s resume validated by T037 resume tests
- **SC-006**: Naming convention validated by T030 file operations

**Total Tasks**: 63 tasks across 7 phases
**Critical Path**: T001-T012 → T013-T024 → T028-T033 → T046-T052
**Parallel Potential**: 48 tasks marked [P] can be parallelized
**Test Coverage**: Constitutional requirement of 80% with Vitest + Playwright