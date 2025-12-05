# Implementation Plan: Bandai Manual Content Downloader

**Branch**: `005-manual-downloader` | **Date**: 2025-12-05-125030 | **Spec**: [005-manual-downloader/spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-manual-downloader/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implementation of intelligent manual content discovery system for Bandai hobby manuals. The system will automatically discover valid manual page IDs from unknown ranges using adaptive algorithms, implement respectful rate limiting (8-second delays), provide resumable operation with JSON-based persistence, and organize downloaded content in structured file hierarchy. Primary technical challenge is intelligent ID discovery when range boundaries are unknown, solved through expansion algorithms and gap detection patterns.

## Technical Context

**Language/Version**: TypeScript 5.7+ (Node.js 20+)
**Primary Dependencies**: Built-in Node.js fetch API, Node.js fs/promises, URL pattern detection algorithms
**Storage**: File system (JSON) for progress persistence + raw HTML files
**Testing**: Vitest for unit tests, Playwright for end-to-end validation
**Target Platform**: Cross-platform CLI tool (Linux/macOS/Windows)
**Project Type**: CLI tool extending existing scraper package in monorepo
**Performance Goals**: Process 100 manual IDs per minute with 95% discovery rate, <5s resume capability
**Constraints**: Must handle unknown ID ranges, implement rate limiting (8s delays), memory-efficient HTML handling, disk space validation
**Scale/Scope**: Designed for 10K+ manual pages with intelligent discovery algorithms

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Constitution Check ✅ PASSED

**Test-First Development**: Confirmed - All implementation will follow Red-Green-Refactor cycle with 80% coverage requirements using Vitest and Playwright.

**Modular Monorepo Architecture**: Confirmed - Implementation extends existing `packages/scrapers` with clear service boundaries: Discovery, Storage, Resume, RateLimiting, Validation services.

**Static Hosting Compatibility**: Confirmed - CLI tool generates static HTML files, compatible with existing monorepo deployment constraints.

**Progressive Web App Standards**: Confirmed - CLI tool supports offline operation patterns, not directly PWA-related but follows similar resilience principles.

**Comprehensive TypeScript Type Checking**: Confirmed - All contracts and data models use strict TypeScript with Zod validation schemas.

**Configuration Type Safety**: Confirmed - Configuration will use TypeScript files with `noEmit: true` for validation.

**Build Process Isolation**: Confirmed - Implementation follows existing build patterns with no in-place compilation artifacts.

**Accessibility First**: N/A - CLI tool doesn't have UI accessibility requirements.

**Nx Build System Optimization**: Confirmed - Will use Nx executors and follow existing project.json patterns.

**Persistence and Resilience**: Confirmed - Research validated robust resume capability and error handling strategies.

**Automated Barrel Export Management**: Confirmed - Will follow existing barrel management patterns.

**Security by Default**: Confirmed - Rate limiting, respectful user agents, input validation, and secure file operations implemented.

### Post-Design Constitution Check ✅ PASSED

**Constitutional Compliance Validated:**
- Service-oriented design maintains modular architecture (Principle II)
- Type-safe interfaces throughout (Principle V)
- File system operations follow build isolation (Principle VII)
- No violations detected requiring justification

**Complexity Assessment: No additional complexity introduced - design leverages existing monorepo patterns and extends proven scraping architecture.**

## Project Structure

### Documentation (this feature)

```text
specs/005-manual-downloader/
├── plan.md              # This file (/speckit.plan command output) ✅ COMPLETED
├── research.md          # Phase 0 output (/speckit.plan command) ✅ COMPLETED
├── data-model.md        # Phase 1 output (/speckit.plan command) ✅ COMPLETED
├── quickstart.md        # Phase 1 output (/speckit.plan command) ✅ COMPLETED
├── contracts/           # Phase 1 output (/speckit.plan command) ✅ COMPLETED
│   ├── readme.md        # Contract overview and usage guidelines
│   ├── downloader-service.ts
│   ├── discovery-service.ts
│   ├── storage-service.ts
│   ├── resume-service.ts
│   ├── rate-limiter-service.ts
│   ├── validation-service.ts
│   ├── http-client.ts
│   ├── configuration.ts
│   ├── logging.ts
│   └── errors.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Structure Decision**: Single project extension within existing monorepo - extending `packages/scrapers` with new manual downloader functionality while maintaining existing patterns and boundaries.

```text
packages/scrapers/
├── src/
│   ├── url-scanner/              # Existing URL scanner functionality
│   ├── manual-downloader/        # NEW: Manual downloader implementation
│   │   ├── services/             # Core service implementations
│   │   │   ├── downloader-service.ts      # Main orchestration
│   │   │   ├── discovery-service.ts       # ID discovery algorithms
│   │   │   ├── storage-service.ts         # File operations
│   │   │   ├── resume-service.ts          # Session persistence
│   │   │   ├── rate-limiter-service.ts    # Request throttling
│   │   │   ├── validation-service.ts      # Content verification
│   │   │   ├── http-client.ts             # HTTP abstraction
│   │   │   ├── configuration.ts           # Config management
│   │   │   ├── logging.ts                 # Progress reporting
│   │   │   └── errors.ts                  # Error handling
│   │   ├── types/                # TypeScript type definitions
│   │   │   ├── index.ts                  # Type exports
│   │   │   ├── manual-page.ts            # Manual page entities
│   │   │   ├── download-session.ts       # Session management
│   │   │   └── discovery-results.ts      # Discovery algorithms
│   │   ├── utils/                # Utility functions
│   │   │   ├── file-operations.ts         # File system helpers
│   │   │   ├── rate-limiting.ts          # Rate limiting helpers
│   │   │   ├── validation.ts             # Content validation
│   │   │   └── crypto.ts                 # Hash generation
│   │   ├── cli/                  # Command line interface
│   │   │   ├── index.ts                  # Main CLI entry point
│   │   │   ├── commands.ts               # CLI command definitions
│   │   │   └── progress-reporting.ts     # CLI output formatting
│   │   └── index.ts              # Main module exports
│   ├── shared/                  # Shared utilities across scraper features
│   └── cli/                     # Existing CLI infrastructure
├── tests/
│   ├── manual-downloader/      # Test suite for manual downloader
│   │   ├── unit/               # Unit tests for individual services
│   │   │   ├── downloader-service.test.ts
│   │   │   ├── discovery-service.test.ts
│   │   │   ├── storage-service.test.ts
│   │   │   ├── resume-service.test.ts
│   │   │   ├── rate-limiter-service.test.ts
│   │   │   └── validation-service.test.ts
│   │   ├── integration/        # Integration tests for service interaction
│   │   │   ├── end-to-end-workflow.test.ts
│   │   │   ├── resume-recovery.test.ts
│   │   │   └── rate-limiting-behavior.test.ts
│   │   ├── e2e/                # End-to-end tests with real websites
│   │   │   ├── manual-discovery.test.ts
│   │   │   ├── file-download.test.ts
│   │   │   └── error-recovery.test.ts
│   │   └── fixtures/           # Test data and mocks
│   │       ├── sample-responses/
│   │       ├── mock-configs/
│   │       └── test-manuals/
│   └── url-scanner/            # Existing URL scanner tests
├── package.json                # Updated with new dependencies and scripts
├── tsconfig.json               # Updated with new paths
├── project.json                # Nx project configuration
└── README.md                   # Updated package documentation
```

### Data Output Structure

```text
./data/raw/bandai/manuals/          # Primary output directory
├── 652.html                       # Individual manual pages
├── 653.html
├── ...
└── progress/                      # Session and progress data
    ├── sessions/                  # Download session state
    │   ├── {session-id}.json     # Individual session data
    │   └── latest.json           # Pointer to most recent session
    ├── checkpoints/              # Resume checkpoints
    │   ├── {session-id}-{timestamp}.json
    │   └── {session-id}-backup.json
    └── statistics/               # Usage and performance statistics
        ├── discovery-stats.json
        ├── download-stats.json
        └── error-logs.json
```

**Structure Decision**: Extends existing `packages/scrapers` structure with new `manual-downloader` module following established patterns from `url-scanner`. Maintains monorepo consistency while providing clear separation of concerns and testable service boundaries.

## Complexity Tracking

> **No constitutional violations detected - design maintains existing architectural patterns and complexity levels.**
