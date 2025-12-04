<!--
Sync Impact Report:
- Version change: 1.1.0 → 1.2.0
- Modified principles: Streamlined all principles for conciseness
- Added sections: N/A
- Removed sections: N/A
- Templates requiring updates: N/A (templates already aligned)
- Follow-up TODOs: N/A
-->

# Unnamed Gunpla App Constitution

## Core Principles

### I. Clean Workspace
Remove all temporary files (DEPLOYMENT_READINESS.md, drafts, *.tmp). Never commit non-production artifacts.

### II. TypeScript First
Strict TypeScript mode mandatory. All code must pass type checking before completion.

### III. Test Coverage
Comprehensive testing required (unit, integration, e2e). Tests written before or alongside implementation.

### IV. Independent MVPs
Each user story must be independently testable and deliver standalone value.

### V. Documentation Driven
Features specified before implementation with clear user stories and acceptance criteria.

### VI. No Type Coercion
All type conversions must be explicit. No implicit coercion allowed.

## Development Standards

### Code Quality
- TypeScript strict mode enforcement
- Linting and formatting checks mandatory
- Security best practices required
- Code reviews for all changes

### Architecture
- Nx monorepo with workspace management
- Shared packages for common functionality
- Client-side storage via IndexedDB (Dexie)
- Clear frontend/backend separation

### Performance
- PWA features enabled
- WCAG 2.1 AA accessibility
- Optimized bundle sizes
- Mobile-first responsive design

## Governance

This constitution supersedes all development guidelines. All PRs must verify compliance.

### Amendment Process
1. Document proposed changes with rationale
2. Maintainer approval required
3. Migration plan for breaking changes
4. Semantic versioning updates

### Compliance Review
- Regular codebase reviews
- Automated checks (linting, type checking, coverage)
- Manual architectural reviews
- Documentation updates required

**Version**: 1.2.0 | **Ratified**: 2025-12-04 | **Last Amended**: 2025-12-04