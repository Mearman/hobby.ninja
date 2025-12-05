# Quick Start Guide: Bandai Manual Content Downloader

**Feature**: Manual Downloader | **Spec**: 005-manual-downloader | **Date**: 2025-12-05-125000
**Purpose**: Developer setup and contribution instructions for implementing the manual downloader feature

---

## 🚀 Getting Started

This guide provides everything you need to start implementing the Bandai Manual Content Downloader feature. Follow these steps to set up your development environment and begin contributing.

### Prerequisites

**Required Software:**
- Node.js 20.0.0 or higher
- pnpm 10.0.0+ (package manager)
- Git 2.30.0+
- TypeScript 5.7+ (global installation recommended)

**Development Tools:**
- VS Code or equivalent TypeScript IDE
- Terminal/Command Prompt
- Git client (GitHub Desktop, SourceTree, or CLI)

**System Requirements:**
- 4GB+ RAM minimum (8GB+ recommended)
- 10GB+ available disk space
- Stable internet connection for testing

---

## 📋 Development Setup

### 1. Repository Setup

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd unnamed-gunpla-app

# Install dependencies
pnpm install

# Verify installation
pnpm nx test webapp  # Should run successfully
```

### 2. Feature Branch Setup

```bash
# Create and switch to feature branch
git checkout -b 005-manual-downloader

# Verify you're on the correct branch
git branch
```

### 3. Project Structure Navigation

```bash
# Navigate to the scraper package (implementation location)
cd packages/scrapers

# Explore existing structure
ls -la src/
```

**Key Directories:**
```
packages/scrapers/
├── src/
│   ├── url-scanner/          # Existing URL scanner (reference)
│   ├── manual-downloader/    # NEW: Manual downloader implementation
│   ├── shared/               # Shared utilities and types
│   └── cli/                  # CLI command implementations
├── tests/                    # Test files
├── package.json              # Package configuration
└── tsconfig.json             # TypeScript configuration
```

---

## 🏗️ Implementation Architecture

### Component Overview

```
Manual Downloader System
├── Discovery Service     # Intelligent ID range detection
├── Download Service      # Orchestrate download process
├── Storage Service       # File system operations
├── Resume Service        # Session persistence
├── Rate Limiter          # Request throttling
├── Validation Service    # Content verification
└── CLI Interface         # Command-line operations
```

### Key Design Patterns

1. **Service-Oriented Architecture**: Each component is a separate service
2. **Dependency Injection**: Services accept dependencies via constructors
3. **Event-Driven**: Progress updates via event emitters
4. **Async/Await**: All I/O operations use promises
5. **Type Safety**: Full TypeScript with strict mode

---

## 📁 File Organization

### Create Directory Structure

```bash
# Create main implementation directory
mkdir -p packages/scrapers/src/manual-downloader

# Create subdirectories
mkdir -p packages/scrapers/src/manual-downloader/{services,types,utils,cli}
mkdir -p packages/scrapers/tests/manual-downloader/{unit,integration,e2e}
```

### File Creation Template

```typescript
// packages/scrapers/src/manual-downloader/services/downloader-service.ts
import { IDownloaderService } from '../../../specs/005-manual-downloader/contracts/downloader-service';

export class DownloaderService implements IDownloaderService {
  // Implementation here
}
```

---

## 🔧 Development Workflow

### 1. Test-First Development

```bash
# Create test file first
touch packages/scrapers/tests/manual-downloader/unit/downloader-service.test.ts

# Run tests in watch mode
pnpm test:unit packages/scrapers --watch
```

**Test Structure:**
```typescript
import { DownloaderService } from '../../../src/manual-downloader/services/downloader-service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('DownloaderService', () => {
  let service: DownloaderService;

  beforeEach(() => {
    service = new DownloaderService(/* mock dependencies */);
  });

  it('should initialize with default configuration', async () => {
    await service.initialize(/* config */);
    expect(service.config).toBeDefined();
  });
});
```

### 2. Implementation Cycle

1. **Write Test First**: Define behavior expectations
2. **Run Test**: Confirm it fails (Red)
3. **Implement Code**: Minimal implementation to pass test
4. **Run Test**: Confirm it passes (Green)
5. **Refactor**: Improve code quality while maintaining tests
6. **Repeat**: Continue with next feature

### 3. Code Quality Standards

```bash
# Lint code
pnpm lint packages/scrapers

# Format code
pnpm format packages/scrapers

# Type checking
pnpm typecheck packages/scrapers

# Run all quality checks
pnpm lint:packages:scrapers
```

---

## 🧪 Testing Strategy

### Unit Tests

**Location**: `packages/scrapers/tests/manual-downloader/unit/`

**Coverage Requirements:**
- 80% statements coverage
- 75% branches coverage
- 80% functions coverage

**Example Test Structure:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscoveryService } from '../../../src/manual-downloader/services/discovery-service';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let mockHttpClient: any;

  beforeEach(() => {
    mockHttpClient = {
      validateUrl: vi.fn(),
      validateUrls: vi.fn()
    };
    service = new DiscoveryService(mockHttpClient);
  });

  describe('discoverRange', () => {
    it('should discover valid ID range efficiently', async () => {
      // Arrange
      const baseUrl = 'https://manual.bandai-hobby.net/menus/detail/';
      mockHttpClient.validateUrl.mockResolvedValue({
        statusCode: 200,
        contentLength: 5000,
        isValid: true
      });

      // Act
      const result = await service.discoverRange(baseUrl);

      // Assert
      expect(result.minId).toBeGreaterThan(0);
      expect(result.maxId).toBeGreaterThan(result.minId);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });
});
```

### Integration Tests

**Location**: `packages/scrapers/tests/manual-downloader/integration/`

**Focus Areas:**
- Service interaction
- File system operations
- HTTP client behavior
- Configuration loading

### End-to-End Tests

**Location**: `packages/scrapers/tests/manual-downloader/e2e/`

**Test Scenarios:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Manual Downloader E2E', () => {
  test('should download manuals from real website', async () => {
    // Test against actual manual.bandai-hobby.net
    // Use known good manual IDs
    // Verify file creation and content
  });

  test('should handle rate limiting gracefully', async () => {
    // Test rate limiting behavior
    // Verify proper delays
    // Test backoff strategies
  });
});
```

---

## 📊 Development Commands

### Build and Test Commands

```bash
# Build the scraper package
pnpm nx build scraper

# Run unit tests
pnpm nx test scraper

# Run integration tests
pnpm nx test:e2e scraper

# Run performance tests
pnpm nx test:performance scraper

# Code coverage
pnpm nx test scraper --coverage
```

### CLI Testing

```bash
# Test CLI command during development
pnpm nx run scraper:download-manuals -- --help

# Test with sample options
pnpm nx run scraper:download-manuals \
  --url "https://manual.bandai-hobby.net/menus/detail/" \
  --output "./test-output" \
  --start 650 \
  --end 660 \
  --dry-run
```

### Development Server

```bash
# Watch mode for development
pnpm nx serve scraper

# Auto-reload on changes
pnpm nx dev scraper
```

---

## 🔍 Debugging Guide

### Local Debugging

**VS Code Debug Configuration:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Manual Downloader",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/packages/scrapers/src/manual-downloader/cli/index.ts",
      "args": [
        "--url", "https://manual.bandai-hobby.net/menus/detail/",
        "--output", "./debug-output",
        "--start", "652",
        "--end", "655",
        "--verbose"
      ],
      "env": {
        "NODE_ENV": "development"
      },
      "runtimeArgs": ["-r", "ts-node/register"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging Configuration

```typescript
// Enable detailed logging during development
const logger = new Logger({
  level: 'debug',
  format: 'pretty',
  outputs: ['console', 'file'],
  filePath: './debug.log'
});
```

### Common Issues and Solutions

**Issue**: TypeScript compilation errors
```bash
# Clear cache
pnpm nx reset

# Reinstall dependencies
rm -rf node_modules
pnpm install
```

**Issue**: Test timeouts
```bash
# Increase test timeout
vitest --timeout=10000

# Run specific test file
pnpm test downloader-service.test.ts
```

**Issue**: HTTP request failures
- Check internet connectivity
- Verify URL format
- Test rate limiting configuration
- Mock HTTP client for unit tests

---

## 📈 Performance Optimization

### Development Performance

**Fast Development Commands:**
```bash
# Skip type checking for faster builds
pnpm nx build scraper --skip-type-check

# Run only changed tests
pnpm nx affected:test scraper

# Use file watcher for efficient development
pnpm nx watch scraper
```

### Memory Management

**Monitoring Memory Usage:**
```bash
# Monitor Node.js process
node --inspect packages/scrapers/src/manual-downloader/cli/index.ts

# Profile memory usage
node --prof packages/scrapers/src/manual-downloader/cli/index.ts
node --prof-process isolate-*.log > performance.txt
```

### Rate Limiting Development

**Testing Rate Limiting:**
```typescript
// Faster rate limiting for development
const devConfig = {
  rateLimitDelay: 1000,  // 1 second instead of 8
  maxConcurrent: 2,
  // ... other config
};
```

---

## 🤝 Contribution Guidelines

### Code Standards

1. **TypeScript Strict Mode**: All code must pass strict type checking
2. **ESLint Rules**: Follow project ESLint configuration
3. **Prettier Formatting**: Auto-format on save
4. **Conventional Commits**: Use conventional commit format

### Commit Message Format

```
feat(downloader): add intelligent ID discovery algorithm
fix(storage): resolve file permission issues in Windows
docs(readme): update installation instructions
test(e2e): add rate limiting integration test
refactor(services): extract common HTTP client logic
```

### Pull Request Process

1. **Create Feature Branch**: From latest main
2. **Implement Feature**: Following test-first approach
3. **Run Quality Checks**: All tests must pass
4. **Update Documentation**: Include new features
5. **Submit Pull Request**: With detailed description

### Code Review Checklist

- [ ] Tests pass with 80%+ coverage
- [ ] TypeScript compilation succeeds
- [ ] ESLint rules pass
- [ ] Code follows architectural patterns
- [ ] Documentation is updated
- [ ] Performance implications considered
- [ ] Error handling is comprehensive
- [ ] Security implications assessed

---

## 🛠️ Tools and Extensions

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "ms-vscode.test-adapter-converter",
    "vitest.explorer"
  ]
}
```

### Development Scripts

**Package.json Scripts:**
```json
{
  "scripts": {
    "dev": "pnpm nx serve scraper",
    "build": "pnpm nx build scraper",
    "test": "pnpm nx test scraper",
    "test:e2e": "pnpm nx e2e scraper-e2e",
    "lint": "pnpm nx lint scraper",
    "format": "pnpm nx format scraper",
    "typecheck": "pnpm nx typecheck scraper",
    "coverage": "pnpm nx test scraper --coverage",
    "download-manuals": "pnpm nx run scraper:download-manuals"
  }
}
```

---

## 📚 Learning Resources

### Documentation

- [Feature Specification](../spec.md) - Complete requirements
- [Data Model](../data-model.md) - Entity definitions
- [Service Contracts](../contracts/) - Interface specifications
- [Research Findings](../research.md) - Technical research

### Reference Implementations

- [URL Scanner](../../../src/url-scanner/) - Similar scraping functionality
- [CLI Commands](../../../src/cli/) - CLI pattern reference
- [Test Examples](../../../tests/) - Testing patterns

### External Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Testing Guide](https://vitest.dev/guide/)
- [Playwright Testing](https://playwright.dev/)

---

## 🆘 Getting Help

### Troubleshooting Steps

1. **Check Logs**: Review console output and log files
2. **Run Tests**: Ensure all tests pass
3. **Check Configuration**: Verify environment and config files
4. **Consult Documentation**: Review relevant documentation
5. **Search Issues**: Check existing GitHub issues
6. **Ask for Help**: Contact maintainers or team

### Contact Information

- **GitHub Issues**: Create new issue with detailed description
- **Development Team**: [team-contact@example.com]
- **Documentation Issues**: [docs@example.com]

### FAQ

**Q: How do I test rate limiting without hitting the real server?**
A: Use the mock HTTP client in unit tests. Set `mockHttpClient.validateUrl()` to return predefined responses.

**Q: What's the difference between unit and integration tests?**
A: Unit tests test individual services in isolation. Integration tests test how services work together.

**Q: How do I run just the manual downloader tests?**
A: Use `pnpm nx test scraper --testNamePattern="Manual Downloader"` or run specific test files.

**Q: Can I test with real Bandai URLs during development?**
A: Yes, but be respectful. Use high rate limiting delays (8+ seconds) and limit test ranges.

---

## ✅ Completion Checklist

Before submitting your implementation, verify:

### Code Quality
- [ ] All TypeScript code compiles without errors
- [ ] ESLint rules pass without warnings
- [ ] Prettier formatting applied
- [ ] Test coverage meets requirements (80%+)

### Functionality
- [ ] All user stories implemented
- [ ] Success criteria met
- [ ] Error handling comprehensive
- [ ] Performance requirements satisfied

### Documentation
- [ ] Code comments added where necessary
- [ ] README files updated
- [ ] API documentation current
- [ ] Usage examples provided

### Testing
- [ ] Unit tests written for all services
- [ ] Integration tests validate service interaction
- [ ] End-to-end tests cover user scenarios
- [ ] Performance tests validate requirements

### Deployment
- [ ] Build process works correctly
- [ ] CLI commands function properly
- [ ] Configuration loading works
- [ ] Error scenarios handled gracefully

---

## 🎉 Next Steps

After completing your implementation:

1. **Final Testing**: Run complete test suite
2. **Performance Validation**: Verify performance requirements
3. **Documentation Review**: Ensure documentation is complete
4. **Code Review**: Submit for team review
5. **Integration Testing**: Test in full application context
6. **Deployment**: Prepare for production deployment

Happy coding! 🚀