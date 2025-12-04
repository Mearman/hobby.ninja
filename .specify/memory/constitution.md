# Gunpla Collection Manager Constitution

## Core Principles

### I. Test-First Development
Tests MUST be written before implementation. Red-Green-Refactor cycle strictly enforced. All features require unit tests, integration tests for contracts, and e2e tests for user workflows. Vitest for unit/integration, Playwright for e2e. Coverage thresholds: 80% statements, 75% branches, 80% functions, 80% lines.

### II. Modular Monorepo Architecture
Clear package separation with defined boundaries: apps/webapp (main application), packages/types (TypeScript definitions), packages/utils (shared utilities), packages/cli (data scraping). Each package MUST be independently testable and have single responsibility. Cross-package dependencies MUST be explicitly declared and minimal.

### III. Static Hosting Compatibility
GitHub Pages deployment constraints MUST be respected. Hash routing REQUIRED for all navigation. Static assets ONLY - no server-side processing. JSON files for main dataset, IndexedDB for user data. Build outputs MUST be self-contained static files.

### IV. Progressive Web App Standards
PWA features MUST be implemented: service worker for offline capability, app manifest for installability, responsive design for mobile-first experience. Performance targets: <2s hot reload, <10s dev server start, Core Web Vitals compliance.

### V. TypeScript Strict Mode
TypeScript strict mode ENFORCED across all packages. No implicit any, no unused locals/parameters, strict null checks enabled. All configuration files MUST be TypeScript when possible. Zod integration for runtime type validation.

### VI. Accessibility First (WCAG 2.1 AA)
Full keyboard navigation, screen reader support, high contrast mode, text scaling to 200%. ARIA labels, semantic HTML, focus management required. Automated axe-core testing integration. Reduced motion respect mandatory.

### VII. Security by Default
Content Security Policy headers implemented. XSS protection via React. Input validation via Zod schemas. Client-side data encryption for sensitive IndexedDB storage. Regular security scanning in CI/CD. No external dependencies without security review.

## Technology Standards

React 19 with latest stable dependencies. TanStack Router for type-safe routing with hash mode. Mantine UI component library prioritized over custom implementations. Vanilla Extract CSS for type-safe styling with minimal custom CSS. Dexie for IndexedDB wrapper.

Performance optimization through code splitting, lazy loading, and bundle analysis. Nx computational caching for development efficiency. Syncpack for dependency version consistency across monorepo.

## Development Workflow

Incremental atomic conventional commits required. Each commit MUST contain one logical change. Format: feat:, fix:, chore:, refactor:, test:, docs:. Peer review mandatory for all changes.

CI/CD pipeline includes automated security scanning, dependency updates, and deployment to GitHub Pages. Manual and automated CLI execution modes for data updates. Environment-specific configurations handled through build-time variables.

Quality gates enforce: TypeScript compilation, ESLint rules, test coverage, accessibility compliance, security validation. No production deployments without gate completion.

## Governance

This constitution supersedes all other development practices. Amendments require documentation, team approval, and migration plan. All pull requests MUST verify constitutional compliance. Complexity MUST be justified with clear business value.

Template files (plan.md, spec.md, tasks.md) MUST align with constitutional principles. Regular constitution reviews scheduled quarterly or when major architectural changes occur.

**Version**: 1.2.0 | **Ratified**: 2025-12-03 | **Last Amended**: 2025-12-04

<!--
Sync Impact Report:
Version change: 1.1.0 → 1.2.0 (MINOR - added Accessibility and Security principles)
Modified principles: None renamed
Added sections: VI. Accessibility First, VII. Security by Default
Removed sections: None
Templates updated: ✅ .specify/templates/plan-template.md, ✅ .specify/templates/spec-template.md, ✅ .specify/templates/tasks-template.md
Commands updated: ✅ All .specify/templates/commands/*.md files
Follow-up TODOs: None - all placeholders filled with concrete values
-->