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

## Advanced CLI Features

### Robust Error Handling & Recovery

**Retry Mechanisms**:
- **Exponential Backoff**: Retry failed requests with increasing delays
- **Circuit Breaker**: Stop retrying after consecutive failures to prevent blacklisting
- **Rate Limiting**: Respect robots.txt and implement polite scraping intervals
- **User-Agent Rotation**: Rotate user agents to avoid detection
- **Proxy Support**: Optional proxy configuration for geographic restrictions

**Error Recovery Strategies**:
- **Partial Success Recovery**: Continue processing other items when individual requests fail
- **Checkpoint System**: Save progress to resume from last successful batch
- **Fallback Data Sources**: Alternative scrapers when primary source fails
- **Data Validation**: Post-scrape validation to ensure data integrity
- **Graceful Degradation**: Continue with reduced functionality when non-critical features fail

### Advanced Caching Strategies

**Smart Cache Management**:
- **Content-Based Cache Keys**: Cache based on content hash, not just URL
- **Conditional Requests**: Use ETags and Last-Modified headers
- **Cache Invalidation**: Smart invalidation when source data changes
- **Compressed Cache**: Compress cached HTML to save disk space
- **Cache Analytics**: Track cache hit rates and optimize accordingly

### Performance Optimization

**Concurrent Processing**:
- **Worker Pool**: Configure number of concurrent requests
- **Request Batching**: Group similar requests for efficiency
- **Memory Management**: Stream processing for large datasets
- **Progress Tracking**: Real-time progress reporting for long operations
- **Resource Monitoring**: Track memory and CPU usage during scraping

## Complexity Tracking

> **Justification for architectural decisions**

| Component | Complexity Reason | Simpler Alternative Rejected |
|-----------|-------------------|-----------------------------|
| 3-Package Structure (types, utils, CLI) | Clear separation of concerns; enables independent testing and deployment | Single monolithic package rejected due to maintainability concerns |
| Per-SKU JSON Files | Optimizes GitHub Pages loading; enables efficient caching | Single large JSON file rejected due to poor loading performance |
| Dual Storage (JSON + IndexedDB) | Static hosting for dataset + dynamic user data | Everything in IndexedDB rejected due to complexity and initial load performance |
| Advanced CLI with Caching | Reduces development iteration time; respects rate limits | Direct scraping without cache rejected due to development inefficiency |

## Security & Monitoring Strategy

### Web Application Security

**Content Security Policy (CSP)**:
- **Strict CSP Headers**: Prevent XSS attacks with restrictive content policies
- **Trusted Domains**: Whitelist external resources (CDNs, APIs)
- **Inline Script Restrictions**: Disallow inline JavaScript except for development
- **Frame Protection**: Clickjacking protection with X-Frame-Options

**Data Protection**:
- **Input Validation**: Zod schemas for all user inputs and API responses
- **Output Encoding**: Prevent injection attacks in rendered content
- **Secure Storage**: Sensitive data encryption in IndexedDB
- **API Rate Limiting**: Prevent abuse with client-side rate limiting

**Dependency Security**:
- **Automated Scanning**: npm audit integration in CI/CD pipeline
- **Vulnerability Monitoring**: GitHub Dependabot for security alerts
- **License Compliance**: Check for restrictive or problematic licenses
- **Supply Chain Security**: Verify integrity of third-party packages

### Observability & Monitoring

**Performance Monitoring**:
- **Web Vitals**: Core Web Vitals tracking (LCP, FID, CLS)
- **Error Tracking**: Comprehensive error logging and reporting
- **Performance Metrics**: Bundle size, loading times, API response times
- **User Analytics**: Privacy-focused usage statistics

**CLI Monitoring**:
- **Execution Metrics**: Track scraping success rates and performance
- **Error Analysis**: Categorize and analyze scraping failures
- **Resource Usage**: Monitor memory and CPU usage during operations
- **Data Quality Metrics**: Validate scraped data completeness and accuracy

**Application Health**:
- **Health Endpoints**: Basic health checks for application status
- **Database Health**: IndexedDB integrity and performance monitoring
- **Cache Health**: Cache hit rates and storage usage analytics
- **Error Budgets**: Track error rates against SLOs

### Privacy & Compliance

**User Data Privacy**:
- **Data Minimization**: Collect only necessary user data
- **Local Storage**: Keep user data local to respect privacy
- **Data Export**: Allow users to export their data
- **Data Deletion**: Provide clear data removal options

**Legal Compliance**:
- **Cookie Policy**: Transparent cookie usage and consent
- **Privacy Policy**: Clear data handling and storage policies
- **Terms of Service**: Define usage terms and limitations
- **GDPR Considerations**: Privacy-first design principles

### Development Security

**Code Security**:
- **Secrets Management**: Never commit sensitive data or API keys
- **Environment Variables**: Secure configuration management
- **Code Reviews**: Security-focused code review checklist
- **Security Testing**: Automated security testing in CI/CD

**Build Security**:
- **Source Verification**: Verify package integrity during installation
- **Build Integrity**: Ensure tamper-proof build process
- **Deployment Security**: Secure deployment pipeline with access controls

## Progressive Web App (PWA) Features

### Service Worker Implementation

**Offline Capabilities**:
- **Cache Strategy**: Network-first with cache fallback for critical resources
- **Offline Page**: Custom offline page with app functionality
- **Background Sync**: Sync user data when connectivity is restored
- **Push Notifications**: Optional notifications for collection updates
- **App Shell Architecture**: Instant loading with cached shell resources

**Performance Optimizations**:
- **Precaching**: Critical app resources cached on install
- **Runtime Caching**: Dynamic caching of API responses and images
- **Cache Management**: Intelligent cache invalidation and cleanup
- **Resource Optimization**: Minimize bundle size and optimize loading
- **Network Adaptation**: Adaptive behavior based on connection quality

### Web App Manifest

**App Identity**:
- **App Metadata**: Name, description, colors, icons for PWA installation
- **Display Modes**: Standalone, fullscreen, minimal-ui display options
- **Orientation Control**: Lock orientation for better mobile experience
- **Theme Colors**: Consistent branding across platform integration
- **Start URL**: Deep linking support with hash routing compatibility

**Installation Experience**:
- **Install Prompt**: Customizable PWA installation flow
- **Splash Screens**: Branded loading screens for installed apps
- **Icon Sets**: Multiple icon sizes for different device contexts
- **App Shortcuts**: Quick access to key app features from home screen

### Accessibility (a11y) Features

**WCAG 2.1 AA Compliance**:
- **Semantic HTML**: Proper heading structure and landmark navigation
- **Keyboard Navigation**: Full keyboard accessibility with visible focus indicators
- **Screen Reader Support**: ARIA labels, roles, and live regions for dynamic content
- **Color Contrast**: Meet WCAG AA contrast ratios for text and UI elements
- **Focus Management**: Logical tab order and trap management for modals

**Enhanced User Experience**:
- **Reduced Motion**: Respect prefers-reduced-motion for accessibility
- **High Contrast Mode**: Support for high contrast themes
- **Text Resizing**: App remains functional at 200% zoom level
- **Voice Navigation**: Voice control support for major app functions
- **Alternative Text**: Comprehensive alt text for all meaningful images

**Testing and Validation**:
- **Automated Testing**: axe-core integration for accessibility testing
- **Keyboard Testing**: Comprehensive keyboard-only usage validation
- **Screen Reader Testing**: Regular testing with popular screen readers
- **Color Blindness**: Ensure design works with various color vision deficiencies
- **Mobile Accessibility**: Touch targets sized appropriately for mobile devices

### Advanced Architecture Patterns

**Micro-frontend Considerations**:
- **Module Federation**: Future-ready architecture for independent team deployments
- **Feature Flagging**: Dynamic feature toggles for progressive rollouts
- **Error Boundaries**: Graceful error handling for improved user experience
- **State Management**: Scalable state architecture for complex interactions

**Performance Strategies**:
- **Code Splitting**: Route-based and component-based lazy loading
- **Tree Shaking**: Remove unused code from production builds
- **Image Optimization**: Responsive images with modern formats (WebP, AVIF)
- **Font Loading**: Optimize font loading with font-display strategies
