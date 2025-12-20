# hobby.ninja

A modern progressive web application for managing hobby collections. Built with React 19, TypeScript, and cutting-edge web technologies.

## Features

- **Collection Management**: Track your hobby items with purchase info, status, and photos
- **Wishlist System**: Maintain wishlist with priority tracking
- **Progress Tracking**: Document your hobby journey
- **Search & Discovery**: Database with advanced filtering
- **Offline Support**: Full offline functionality with data sync

## Tech Stack

- **Frontend**: React 19 + TypeScript 5.7 (strict)
- **Routing**: TanStack Router
- **UI**: Mantine v7 + Vanilla Extract CSS
- **Storage**: IndexedDB via Dexie (client-side)
- **Build**: Vite 6.0 + Nx monorepo
- **Testing**: Vitest + Playwright
- **Package Manager**: pnpm 10.0.0

## Quick Start

```bash
# Prerequisites
Node.js >= 20.0.0
pnpm 10.0.0+

# Install (see "Cloning the Repository" below for large repo options)
git clone <repo-url>
cd hobby-ninja
pnpm install

# Development
pnpm nx serve webapp

# Build
pnpm nx build webapp
```

## Cloning the Repository

This repository contains a large `./assets/` directory. Contributors can use partial or incremental cloning to avoid downloading all assets upfront.

### Partial Clone (Recommended)

Clone without downloading blob content until needed. Blobs are fetched on-demand when you access files:

```bash
git clone --filter=blob:none <repo-url>
```

### Partial Clone with Size Limit

Skip blobs larger than 1MB during initial clone:

```bash
git clone --filter=blob:limit=1m <repo-url>
```

### Sparse Checkout (Exclude assets entirely)

Clone structure only, then exclude the assets directory:

```bash
git clone --filter=blob:none --sparse <repo-url>
cd hobby-ninja
git sparse-checkout set '/*' '!assets/'
```

### Shallow Clone + Incremental Deepening

Start with only the latest commit, then fetch more history as needed:

```bash
# Initial clone - only latest commit
git clone --depth 1 <repo-url>

# Later, fetch more history incrementally
git fetch --deepen=10    # Add 10 more commits
git fetch --unshallow    # Eventually get full history
```

### How Partial Clones Work

When using `--filter=blob:none`, Git downloads commit and tree objects (the structure) but marks blobs as "promisor objects" - placeholders that the remote delivers on demand.

Any operation that needs file content triggers automatic fetching:

```bash
git checkout <branch>     # Fetches needed blobs
git diff                  # Fetches needed blobs
git show <file>           # Fetches needed blobs
```

To see fetches in action:

```bash
GIT_TRACE=1 git show HEAD:assets/large-file.png
```

**Requirements**: Git 2.22+ on both client and server.

## PWA Features

- Installable as native app
- Full offline functionality
- Automatic data synchronization
- Mobile-first responsive design

## Accessibility

WCAG 2.1 AA compliant with:

- Full keyboard navigation
- Screen reader support
- High contrast mode
- Text scaling to 200%

## Security

Built-in security measures:

- Content Security Policy (CSP)
- XSS protection via React
- Client-side data encryption
- Regular security scanning

## Commands

```bash
# Development
pnpm nx serve webapp          # Start dev server
pnpm nx test webapp           # Run tests
pnpm nx lint webapp           # Lint code

# Building
pnpm nx build webapp          # Production build

# Workspace
pnpm install                 # Install dependencies
pnpm nx graph                # Visualize dependencies

# Barrels (Export Management)
pnpm barrels                 # Generate barrel exports
pnpm barrels:watch          # Watch and regenerate exports
```

## Project Structure

```
apps/webapp/           # Main React application
packages/types/        # Shared TypeScript definitions
packages/utils/        # Common utilities
packages/cli/          # Data scraping CLI
tools/security/        # Security scanning tools
eslint-plugins/        # Custom ESLint plugins
```

## Deployment

Builds to static files suitable for:

- Vercel, Netlify, GitHub Pages
- Docker containers
- CDN hosting

```bash
pnpm nx build webapp
# Deploy dist/apps/webapp/
```

## Contributing

1. Fork and clone
2. Create feature branch
3. Follow code standards (ESLint + Prettier)
4. Add tests for new features
5. Submit pull request
