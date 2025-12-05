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

### V. Comprehensive TypeScript Type Checking
All TypeScript code MUST be typechecked regardless of compilation strategy. Source files, scripts, and configuration files MUST be validated by TypeScript compiler, even if only JIT transpiled when executed. Build tools MUST include all .ts files in typechecking scope. No untyped JavaScript files allowed where TypeScript equivalent exists. Type errors MUST block execution and deployment.

### VI. Configuration Type Safety
All .ts configuration files MUST be typechecked without being built. Config files MUST be included in TypeScript project references and validated during compilation. Configuration MUST use `noEmit: true` to prevent file generation. Type errors in config files MUST block builds. No JavaScript configuration files allowed where TypeScript equivalent exists. Root-level configuration MUST validate all package configs: vite.config.ts, eslint.config.ts, playwright.config.ts, vitest.config.ts, knip.config.ts, syncpack.config.ts.

### VII. Build Process Isolation
Source files MUST remain pristine with no in-place compilation artifacts. All .ts files configured with `noEmit: true` to prevent accidental .js generation. Build outputs confined to dist/ directory. Development tools MUST use transpilation pipelines, not file system emission. Source maps MUST reference original source files, not compiled intermediates.

### VIII. Accessibility First (WCAG 2.1 AA)
Full keyboard navigation, screen reader support, high contrast mode, text scaling to 200%. ARIA labels, semantic HTML, focus management required. Automated axe-core testing integration. Reduced motion respect mandatory.

### IX. Nx Build System Optimization
Nx executor plugins and inferred targets MUST be preferred over nx:run-commands. Build configurations MUST use specialized executors (@nx/vite:build, @nx/eslint:lint, @nx/playwright:run, etc.) for better caching, dependency tracking, and IDE integration. Project.json files MUST leverage Nx plugin system for automatic target inference. Manual command execution limited to exceptional cases where no suitable executor exists.

### X. Persistence and Resilience in Problem Solving
When encountering technical challenges, implementation obstacles, or configuration issues, solutions MUST be pursued to completion with proper investigation and research. Online documentation, official documentation, and community solutions MUST be researched before declaring a problem unsolvable. **SIMPLE, TEMPORARY, OR MOCK IMPLEMENTATIONS ARE ABSOLUTELY FORBIDDEN.** All implementations MUST be complete, production-ready solutions that fully address the requirements. Simplified fallbacks, placeholder implementations, and "minimum viable" approaches are PROHIBITED unless explicitly documented as technical debt with an approved remediation plan and timeline. Root cause analysis MUST be performed for all blocking issues.

### XI. Automated Barrel Export Management
Index files (index.ts) MUST NEVER be manually modified or contain manual content. All barrel exports MUST be generated and managed exclusively by barrelsby automation. Manual entries in index files are FORBIDDEN. Content MUST be organized in properly named files within appropriate directories, allowing barrelsby to generate clean, consistent export structures. This ensures maintainable module boundaries and prevents merge conflicts.

### XII. Security by Default
Content Security Policy headers implemented. XSS protection via React. Input validation via Zod schemas. Client-side data encryption for sensitive IndexedDB storage. Regular security scanning in CI/CD. No external dependencies without security review.

## Technology Standards

React 19 with latest stable dependencies. TanStack Router for type-safe routing with hash mode. Mantine UI component library prioritized over custom implementations. Vanilla Extract CSS for type-safe styling with minimal custom CSS. Dexie for IndexedDB wrapper.

Performance optimization through code splitting, lazy loading, and bundle analysis. Nx computational caching for development efficiency. Nx executor plugins (@nx/vite, @nx/eslint, @nx/playwright) for optimized build and test execution. Syncpack for dependency version consistency across monorepo.

## Development Workflow

Incremental atomic conventional commits required. Each commit MUST contain one logical change. Format: feat:, fix:, chore:, refactor:, test:, docs:. Peer review mandatory for all changes.

CI/CD pipeline includes automated security scanning, dependency updates, and deployment to GitHub Pages. Manual and automated CLI execution modes for data updates. Environment-specific configurations handled through build-time variables.

Quality gates enforce: TypeScript compilation, ESLint rules, test coverage, accessibility compliance, security validation. No production deployments without gate completion.

## Governance

This constitution supersedes all other development practices. Amendments require documentation, team approval, and migration plan. All pull requests MUST verify constitutional compliance. Complexity MUST be justified with clear business value.

Template files (plan.md, spec.md, tasks.md) MUST align with constitutional principles. Regular constitution reviews scheduled quarterly or when major architectural changes occur.

**Version**: 1.8.0 | **Ratified**: 2025-12-03 | **Last Amended**: 2025-12-05

<!--
Sync Impact Report:
Version change: 1.7.1 → 1.8.0 (MINOR - added new principle XI for automated barrel export management)
Modified principles: X. Persistence and Resilience in Problem Solving (renumbered to X), XI. Security by Default (renumbered to XII)
Added sections: XI. Automated Barrel Export Management (new principle forbidding manual index.ts modifications)
Removed sections: None
Templates updated: ✅ .specify/templates/plan-template.md, ✅ .specify/templates/spec-template.md, ✅ .specify/templates/tasks-template.md
Commands updated: ✅ All .specify/templates/commands/*.md files
Follow-up TODOs: None - all placeholders filled with concrete values
-->