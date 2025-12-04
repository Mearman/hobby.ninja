# Setup Guide

This comprehensive guide will help you set up a complete development environment for the Gunpla App, including all necessary tools, configurations, and best practices.

##  Prerequisites

### Required Software

Before starting, ensure you have the following installed:

#### Node.js and npm
- **Node.js**: 20.11.0 or higher (LTS version recommended)
- **npm**: 10.x or higher (comes with Node.js)

```bash
# Check if Node.js is installed
node --version

# Check npm version
npm --version

# If not installed, download from https://nodejs.org
# Or use a version manager like nvm (recommended)
```

#### Git
- **Git**: 2.30.0 or higher

```bash
# Check Git version
git --version

# Configure Git (first time setup)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Optional but Recommended

#### Version Manager (nvm)
```bash
# Install nvm (macOS/Linux)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install nvm (Windows)
# Download from https://github.com/coreybutler/nvm-windows

# Install and use Node.js 20
nvm install 20
nvm use 20
```

#### Yarn (Alternative package manager)
```bash
# Install Yarn globally
npm install -g yarn

# Check version
yarn --version
```

##  Development Environment Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-username/gunpla-app.git

# Navigate to the project directory
cd gunpla-app

# Checkout the main branch
git checkout main

# Pull latest changes
git pull origin main
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install
```

### 3. Environment Configuration

Create environment files for different environments:

```bash
# Copy environment template
cp .env.example .env.local

# Edit the environment file
nano .env.local
```

#### Environment Variables (.env.local)

```env
# Application
NODE_ENV=development
PORT=4200
HOST=localhost

# Feature Flags
ENABLE_PWA=true
ENABLE_ANALYTICS=false
ENABLE_CRASH_REPORTING=false

# Development
DEVTOOLS=true
HOT_RELOAD=true
SOURCE_MAP=true

# Build
GENERATE_SOURCEMAP=true
ANALYZE_BUNDLE=false
```

### 4. Database Setup (Optional)

The app uses IndexedDB for client-side storage, which requires no setup. However, for development and testing:

```bash
# Install database browser tools
npm install -g idb-explorer

# Or use browser developer tools
# Chrome: DevTools > Application > IndexedDB
# Firefox: Developer Tools > Storage > IndexedDB
```

## 💻 IDE Setup

### Visual Studio Code

#### 1. Install VS Code
Download from [https://code.visualstudio.com](https://code.visualstudio.com)

#### 2. Recommended Extensions

Install these extensions via the Extensions panel (Ctrl+Shift+X):

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "nrwl.angular-console",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-jest",
    "ms-playwright.playwright",
    "ms-vscode-remote.remote-containers",
    "ms-vscode.vscode-docker"
  ]
}
```

#### 3. VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.nx/cache": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.nx/cache": true,
    "**/.git": true
  }
}
```

#### 4. VS Code Tasks

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Dev Server",
      "type": "npm",
      "script": "dev",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      }
    },
    {
      "label": "Run Tests",
      "type": "npm",
      "script": "test",
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      }
    },
    {
      "label": "Build Project",
      "type": "npm",
      "script": "build",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      }
    }
  ]
}
```

### WebStorm / IntelliJ IDEA

#### 1. Configuration
- Open the project folder
- Go to `File > Settings > Languages & Frameworks > TypeScript`
- Enable TypeScript Service
- Set TypeScript version to the project's node_modules

#### 2. Code Style
- Import `.editorconfig` settings
- Configure Prettier as the default formatter
- Set up ESLint integration

#### 3. Run Configuration
- Create npm run configurations:
  - `dev` - Start development server
  - `build` - Build for production
  - `test` - Run tests
  - `lint` - Run ESLint

### Vim / Neovim

#### 1. TypeScript Support
```vim
" Install vim-plug if not already installed
" https://github.com/junegunn/vim-plug

" Add to .vimrc
call plug#begin()
  Plug 'leafgarland/typescript-vim'
  Plug 'peitalin/vim-jsx-typescript'
  Plug 'prettier/vim-prettier'
  Plug 'dense-analysis/ale'
call plug#end()
```

#### 2. LSP Configuration
```vim
" For Neovim with nvim-lspconfig
lua << EOF
require'lspconfig'.tsserver.setup{}
EOF
```

## 🔧 Git Configuration

### 1. Git Hooks

Install Git hooks for code quality:

```bash
# Install Husky (if not already installed)
npm install --save-dev husky

# Enable Git hooks
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run test"

# Add commit-msg hook
npx husky add .husky/commit-msg "npx commitlint --edit $1"
```

### 2. Git Ignore

The project includes a comprehensive `.gitignore` file. Ensure it covers:

```gitignore
# Dependencies
node_modules/
.pnp/
.pnp.js

# Build outputs
dist/
build/
.next/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Cache
.cache/
.nx/cache/

# Temporary files
*.tmp
*.temp
```

##  Testing Setup

### 1. Test Framework Configuration

The project uses Vitest for unit testing and Playwright for E2E testing.

#### Vitest Configuration
`vitest.config.ts` is already configured with:
- TypeScript support
- DOM environment
- Coverage reporting
- Test watch mode

#### Playwright Configuration
`playwright.config.ts` includes:
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile device emulation
- Screenshot testing
- Accessibility testing

### 2. Test Database

For testing, the app uses a separate IndexedDB instance:

```bash
# Run tests with isolated database
npm run test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Debug tests
npm run test:debug
```

## 📊 Development Tools

### 1. Browser Developer Tools

#### Chrome DevTools
- **Elements**: Inspect and debug DOM
- **Console**: JavaScript debugging
- **Network**: Monitor API calls and resource loading
- **Application**: IndexedDB, Local Storage, Service Workers
- **Lighthouse**: Performance and accessibility auditing
- **React Developer Tools**: Component inspection

#### Firefox Developer Tools
- **Inspector**: DOM and CSS debugging
- **Console**: JavaScript debugging
- **Debugger**: Source-level debugging
- **Network**: Network monitoring
- **Storage**: IndexedDB and localStorage inspection

### 2. Performance Monitoring

```bash
# Analyze bundle size
npm run analyze

# Run Lighthouse CI
npm run lighthouse

# Monitor performance in development
npm run dev:profile
```

### 3. Accessibility Testing

```bash
# Run accessibility tests
npm run test:a11y

# Install axe-devtools browser extension
# https://www.deque.com/axe/devtools/

# Use screen readers for testing
# - NVDA (Windows)
# - VoiceOver (macOS)
# - Orca (Linux)
```

##  Running the Application

### Development Mode

```bash
# Start development server
npm run dev

# Options
npm run dev -- --port 4300        # Custom port
npm run dev -- --host 0.0.0.0    # Access from other devices
npm run dev -- --open            # Auto-open browser
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Build and analyze bundle
npm run build:analyze
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🔍 Debugging Setup

### 1. VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch App",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/nx",
      "args": ["serve", "gunpla-app"],
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Launch Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/nx",
      "args": ["test", "gunpla-app"],
      "console": "integratedTerminal"
    }
  ]
}
```

### 2. Browser Debugging

#### Chrome DevTools Protocol
```bash
# Start with remote debugging
npm run dev -- --inspect

# Connect Chrome to chrome://inspect
```

### 3. React DevTools

Install React Developer Tools browser extension:
- Chrome: [Web Store](https://chrome.google.com/webstore/detail/react-developer-tools/)
- Firefox: [Add-ons](https://addons.mozilla.org/firefox/addon/react-devtools/)

##  Mobile Development Setup

### 1. Device Testing

#### Physical Devices
1. Connect device to same Wi-Fi network
2. Find your IP address: `ipconfig getifaddr en0` (macOS)
3. Access: `http://YOUR_IP:4200`

#### iOS Simulator
```bash
# Install Xcode from App Store
# Open Simulator
# Open Safari and navigate to app
```

#### Android Emulator
```bash
# Install Android Studio
# Create virtual device
# Start emulator and access app
```

### 2. PWA Testing

#### Install as PWA
1. Open app in Chrome
2. Click install icon in address bar
3. Test offline functionality
4. Check app shortcuts and notifications

## 🔐 Security Setup

### 1. HTTPS in Development

```bash
# Install mkcert for local HTTPS
# macOS
brew install mkcert
brew install nss # Firefox support

# Create local CA
mkcert -install

# Generate certificate
mkcert localhost 127.0.0.1 ::1

# Move certificates to project
mv localhost+2.pem apps/gunpla-app/public/
mv localhost+2-key.pem apps/gunpla-app/public/
```

### 2. Security Headers

Configure security headers in development:

```javascript
// vite.config.ts or nx configuration
export default {
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff'
    }
  }
}
```

## 📈 Performance Setup

### 1. Bundle Analysis

```bash
# Analyze bundle size
npm run analyze

# Find large dependencies
npx webpack-bundle-analyzer dist/stats.json
```

### 2. Lighthouse CI

```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Initialize Lighthouse CI
lhci init

# Run Lighthouse CI
lhci autorun
```

## 🎯 Next Steps

Now that your development environment is set up:

1. **Read the Development Workflow** guide
2. **Explore the Architecture Documentation**
3. **Try adding a new feature**
4. **Run the test suite**
5. **Contribute to the project**

## 🔗 Additional Resources

- [Nx Documentation](https://nx.dev/)
- [React 19 Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Mantine UI Documentation](https://mantine.dev/)
- [PWA Best Practices](https://web.dev/pwa-checklist/)

---

**Need help?** Check our [troubleshooting guide](../troubleshooting/common-issues.md) or [open an issue](https://github.com/your-username/gunpla-app/issues).

**Happy coding!** 

---

**Last Updated**: 2025-12-04
**Version**: 1.0.0