# Gunpla App Documentation

Welcome to the comprehensive documentation for the Gunpla App - a modern Progressive Web Application built with React 19, Nx, and TypeScript for managing Gundam model kit collections.

## 📚 Documentation Overview

This documentation covers everything you need to know about the Gunpla App, from initial setup to advanced deployment and user guides.

###  Quick Start
- [Getting Started](./guides/getting-started.md) - Quick setup and installation guide
- [Development Workflow](./guides/development-workflow.md) - How to contribute and develop
- [Project Overview](./guides/project-overview.md) - High-level project introduction

###  Architecture
- [Architecture Overview](./architecture/architecture-overview.md) - System design and patterns
- [Monorepo Structure](./architecture/monorepo-structure.md) - Nx workspace organization
- [Data Model](./architecture/data-model.md) - Database schema and data flow
- [State Management](./architecture/state-management.md) - Application state patterns

### 📖 Guides
- [Setup Guide](./guides/setup-guide.md) - Detailed environment setup
- [Development Commands](./guides/development-commands.md) - All available Nx commands
- [Code Style Guide](./guides/code-style.md) - Coding standards and conventions
- [Testing Guide](./guides/testing.md) - Unit, integration, and E2E testing

### 🔌 API Documentation
- [API Overview](./api/api-overview.md) - API architecture and design
- [Client-Side APIs](./api/client-apis.md) - Browser APIs and utilities
- [Data Schemas](./api/data-schemas.md) - TypeScript schemas and validation
- [Storage APIs](./api/storage-apis.md) - IndexedDB and local storage

### ⚙️ PWA Features
- [PWA Configuration](./pwa/pwa-configuration.md) - Service worker and manifest setup
- [Offline Capabilities](./pwa/offline-support.md) - Offline data handling
- [Installation](./pwa/installation.md) - App installation and updates

###  Accessibility
- [A11y Compliance](./accessibility/a11y-overview.md) - WCAG 2.1 AA compliance
- [Accessibility Testing](./accessibility/testing.md) - Testing tools and techniques
- [Component Accessibility](./accessibility/components.md) - Accessible component patterns

###  Security
- [Security Overview](./security/README.md) - Security architecture and practices
- [Security Workflows](./security/security-workflows.md) - Security development lifecycle
- [CI/CD Security](./security/ci-cd-security.md) - Automated security checks

###  Deployment
- [Deployment Overview](./deployment/deployment-overview.md) - Deployment strategies
- [Environment Configuration](./deployment/environment-config.md) - Environment variables and setup
- [CI/CD Pipeline](./deployment/ci-cd-pipeline.md) - Automated deployment workflows
- [Monitoring](./deployment/monitoring.md) - Performance and error monitoring

### 🔧 Troubleshooting
- [Common Issues](./troubleshooting/common-issues.md) - Frequently encountered problems
- [Debugging Guide](./troubleshooting/debugging.md) - Debugging techniques and tools
- [FAQ](./troubleshooting/faq.md) - Frequently asked questions

### 📊 Assets & Resources
- [Diagrams](./assets/diagrams/README.md) - Architecture and flow diagrams
- [Mockups](./assets/mockups/README.md) - UI mockups and designs
- [External Resources](./assets/external-resources.md) - Useful links and references

## 🎯 Project Goals

The Gunpla App aims to provide:

1. **Offline-First Experience** - Full functionality without internet connectivity
2. **Cross-Platform Compatibility** - Works on desktop, mobile, and tablet devices
3. **Progressive Enhancement** - Core functionality available on all devices
4. **Accessibility** - WCAG 2.1 AA compliant for inclusive user experience
5. **Performance** - Fast loading times and smooth interactions
6. **Privacy** - All data stored locally, no server dependencies

##  Tech Stack

- **Framework**: React 19 with TypeScript 5.x
- **Build System**: Nx (latest version)
- **Routing**: TanStack Router v7
- **UI Library**: Mantine UI v7
- **Styling**: Vanilla Extract CSS-in-JS
- **Database**: IndexedDB via Dexie
- **Testing**: Vitest + Playwright
- **Linting**: ESLint with TypeScript support
- **State Management**: React State + Local Storage

##  Table of Contents

Use the sidebar navigation to browse through different sections of the documentation. Each section contains detailed information, code examples, and practical guides.

##  Contributing

We welcome contributions! Please read our [Development Workflow](./guides/development-workflow.md) guide to get started.

##  License

This project is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.

## 🔗 Related Projects

- [hobby.ninja](../archive/hobby.ninja) - Turborepo monorepo with shadcn/ui components
- [collect](../archive/collect) - T3 Stack application with Next.js and tRPC
- [gunpla-tracker](../archive/gunpla-tracker) - Next.js application for tracking gunpla models
- [gundam-db](../archive/gundam-db) - Data processing for Gundam models

---

**Last Updated**: 2025-12-04
**Documentation Version**: 1.0.0