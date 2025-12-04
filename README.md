# Gunpla Collection Manager

A modern progressive web application for managing Gundam and Gunpla model kit collections. Built with React 19, TypeScript, and cutting-edge web technologies.

## Features

- **Collection Management**: Track owned Gunpla kits with purchase info, build status, and photos
- **Wishlist System**: Maintain wishlist with priority tracking
- **Build Progress**: Document your model kit building journey
- **Search & Discovery**: Comprehensive database with advanced filtering
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

# Install
git clone <repo-url>
cd unnamed-gunpla-app
pnpm install

# Development
pnpm nx serve webapp

# Build
pnpm nx build webapp
```

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

