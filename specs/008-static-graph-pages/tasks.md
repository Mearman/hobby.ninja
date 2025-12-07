---

description: "Task list for static graph pages generation feature implementation"
---

# Tasks: Static Graph Pages Generation

**Input**: Design documents from `/specs/008-static-graph-pages/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web application (monorepo)**: `apps/web/src/`, based on plan.md structure
- **Testing**: `apps/web/src/test/` for unit/integration, e2e tests at repository root

## Phase 1: Setup (SSG Dependencies)

**Purpose**: Install and configure static site generation dependencies

- [ ] T001 Install TanStack Router SSG dependencies in apps/web/package.json
- [ ] T002 [P] Update TypeScript configuration to include SSG compilation

---

## Phase 2: Foundational (Core SSG Infrastructure)

**Purpose**: Core SSG infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Create TypeScript interfaces for graph node data structures in apps/web/src/types/graph.ts
- [ ] T004 [P] Implement GraphNodeService for data loading in apps/web/src/services/graph-node-service.ts
- [ ] T005 [P] Implement StaticPageGenerator for HTML generation in apps/web/src/services/static-page-generator.ts
- [T006 [P] Implement BuildOptimizer for performance in apps/web/src/services/build-optimizer.ts
- [ ] T007 [P] Create TanStack Router configuration for hybrid routing in apps/web/src/router.tsx
- [ ] T008 [P] Configure Vite for SSG build optimization in apps/web/vite.config.ts
- [ ] T009 Update Nx build targets for SSG in apps/web/project.json

**Checkpoint**: SSG foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Access Static Graph Node Pages (Priority: P1) 🎯 MVP

**Goal**: Generate static HTML pages for all graph nodes with clean URLs for instant access

**Independent Test**: Access any graph node URL (e.g., `/brand/30mm`) and verify static HTML is served with complete node information

### Implementation for User Story 1

- [ ] T010 [P] [US1] Create graph routes generator utility in apps/web/src/utils/graph-routes-generator.ts
- [ ] T011 [P] [US1] Create graph preloader for memory-efficient loading in apps/web/src/utils/graph-preloader.ts
- [ ] T012 [P] [US1] Create unified graph node page component in apps/web/src/pages/graph-node-page.tsx
- [ ] T013 [P] [US1] Create GraphNodeDetails component for type-specific rendering in apps/web/src/components/graph/GraphNodeDetails.tsx
- [ ] T014 [P] [US1] Create RelatedNodesGrid component for navigation in apps/web/src/components/graph/RelatedNodesGrid.tsx
- [ ] T015 [US1] Create SSG entry point for TanStack Router in apps/web/src/entry-ssg.tsx
- [ ] T016 [US1] Configure static page generation routes in router.tsx
- [ ] T017 [US1] Implement error handling for missing nodes
- [ ] T018 [US1] Add meta tags and SEO optimization for static pages

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Navigate Between Related Graph Nodes (Priority: P2)

**Goal**: Enable navigation between related graph nodes with seamless link transitions

**Independent Test**: Click related node links and verify navigation to other static pages with correct context

### Implementation for User Story 2

- [ ] T019 [P] [US2] Implement relationship traversal in GraphNodeService
- [ ] T020 [P] [US2] Add related nodes linking logic in GraphNodeDetails component
- [ ] T021 [P] [US2] Implement breadcrumb navigation in graph-node-page.tsx
- [ ] T022 [US2] Add navigation components for RelatedNodesGrid
- [ ] T023 [US2] Implement back/forward navigation support
- [T024] [US2] Test navigation between different node types (brand → item, item → manual)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Search Engine Discovery (Priority: P2)

**Goal**: Optimize static pages for search engine indexing and discoverability

**Independent Test**: Verify static pages contain proper meta tags and are crawlable by search engine bots

### Implementation for User Story 3

- [ ] T025 [P] [US3] Generate sitemap.xml for all static pages
- [T026] [US3] Add structured data and meta tags to page templates
- [ ] T027 [P] [US3] Implement Open Graph tags for social sharing
- [ ] T028 [P] [US3] Add canonical URLs for SEO
- [ ] [P] [US3] Test search engine crawlability with Lighthouse

**Checkpoint**: All user stories should now be independently functional with full SEO support

---

## Phase 6: Performance & Optimization (Cross-Cutting)

**Purpose**: Optimize build performance and runtime performance for 8,485+ pages

- [ ] T029 [P] Implement chunked processing for large dataset generation
- [ ] T030 [P] Add memory management and garbage collection optimization
- [ ] T031 [P] Optimize static page loading performance
- [ ] T032 [P] Implement incremental build support for modified nodes only
- [ ] T033 [P] Add build progress tracking and reporting

---

## Phase 7: Testing & Validation

**Purpose**: Comprehensive testing of static generation functionality

- [ ] T034 [P] Create unit tests for GraphNodeService
- [ ] T035 [P] Create unit tests for StaticPageGenerator
- [ ] T036 [P] Create integration tests for SSG pipeline
- [ ] T037 [P] Create e2e tests for static page accessibility
- [ ] T038 [P] Test build performance with 8,485+ pages
- [ ] T039 [P] Validate GitHub Pages deployment compatibility

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in sequential priority order (P1 → P2 → P3)
- **Performance (Phase 6)**: Depends on core user story completion
- **Testing (Phase 7)**: Depends on all implementation phases

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core SSG functionality
- **User Story 2 (P2)**: Can start after User Story 1 completion - Navigation features
- **User Story 3 (P2)**: Can start after User Story 2 completion - SEO optimizations

### Within Each User Story

- Setup tasks before implementation tasks
- Core implementation before integration and optimization
- Testing after implementation (if tests requested)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Within each story, tasks marked [P] can run in parallel
- Component creation can be parallel across different parts of the application
- Unit tests for different services can run in parallel

---

## Parallel Example: User Story 1 Implementation

```bash
# Launch all component creation tasks together:
Task: "Create graph routes generator utility in apps/web/src/utils/graph-routes-generator.ts"
Task: "Create graph preloader for memory-efficient loading in apps/web/src/utils/graph-preloader.ts"
Task: "Create unified graph node page component in apps/web/src/pages/graph-node-page.tsx"

# Launch all supporting component tasks together:
Task: "Create GraphNodeDetails component for type-specific rendering in apps/web/src/components/graph/GraphNodeDetails.tsx"
Task: "Create RelatedNodesGrid component for navigation in apps/web/src/components/graph/RelatedNodesGrid.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (SSG dependencies)
2. Complete Phase 2: Foundational (SSG infrastructure - CRITICAL)
3. Complete Phase 3: User Story 1 (static page generation)
4. **STOP AND VALIDATE**: Test User Story 1 independently with sample nodes
5. Deploy to GitHub Pages and verify functionality

### Incremental Delivery

1. Complete Setup + Foundational → SSG foundation ready
2. Add User Story 1 → Test independently → Deploy (MVP static pages!)
3. Add User Story 2 → Test independently → Deploy (navigation!)
4. Add User Story 3 → Test independently → Deploy (SEO optimized!)
5. Each story adds value without breaking previous functionality

### Fallback Strategy

If hybrid routing (clean paths for static + hash routing for dynamic) encounters issues:

1. **Automatic detection**: Monitor build complexity and routing conflicts
2. **Graceful degradation**: Fall back to clean paths for all features
3. **Minimal changes**: Update router configuration to use clean paths everywhere
4. **Preserve functionality**: Ensure all existing features continue to work

---

## Performance Targets

- **Build Time**: <30 minutes for complete 8,485+ page generation
- **Memory Usage**: <100MB during build process
- **Page Load Time**: <1 second for static pages
- **SEO Crawlability**: 95% content accessible without JavaScript
- **Incremental Builds**: 80% time reduction for typical updates

---

## Technical Notes

- **[P]** tasks = different files, no dependencies on incomplete tasks
- **[Story]** label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify static pages are accessible before moving to next priority
- Commit after each task or logical group of related tasks
- Stop at any checkpoint to validate story independently
- Avoid: cross-task dependencies within parallel execution that would cause failures

---

## Success Metrics

- **User Story 1**: All 8,485+ graph nodes generate as accessible static HTML pages
- **User Story 2**: 100% link accuracy between related nodes
- **User Story 3**: 95% SEO crawlability without JavaScript execution
- **Performance**: Build completes within 30 minutes with <100MB memory usage
- **Compatibility**: GitHub Pages deployment with custom domain works correctly