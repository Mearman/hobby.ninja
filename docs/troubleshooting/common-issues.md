# Common Issues

This comprehensive troubleshooting guide covers common issues, errors, and solutions for the Gunpla App. Each issue includes symptoms, causes, and step-by-step resolution instructions.

##  Table of Contents

- [Getting Started Issues](#getting-started-issues)
- [Build and Development Issues](#build-and-development-issues)
- [Performance Issues](#performance-issues)
- [PWA and Offline Issues](#pwa-and-offline-issues)
- [Database and Storage Issues](#database-and-storage-issues)
- [Browser Compatibility Issues](#browser-compatibility-issues)
- [Accessibility Issues](#accessibility-issues)
- [Deployment Issues](#deployment-issues)

---

##  Getting Started Issues

### Issue: Node.js Version Incompatible

#### Symptoms
- npm install fails with dependency errors
- Build fails with syntax errors
- TypeScript compiler errors about unsupported features

#### Causes
- Node.js version too old (< 20.11.0)
- npm version outdated
- Global Node.js installation corrupted

#### Solutions

##### Option 1: Update Node.js
```bash
# Check current version
node --version
npm --version

# Update Node.js using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# Verify versions
node --version  # Should be v20.x.x
npm --version  # Should be 10.x.x
```

##### Option 2: Use Package Manager
```bash
# macOS with Homebrew
brew install node@20
brew link --overwrite node@20

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows (download from nodejs.org)
# Download and install Node.js 20.x LTS
```

##### Option 3: Reinstall Completely
```bash
# Uninstall Node.js completely
# (commands vary by OS)

# Clear npm cache
npm cache clean --force

# Reinstall Node.js 20.x
# Follow official installation guide
```

---

### Issue: Dependencies Installation Fails

#### Symptoms
- `npm install` hangs or fails
- Permission denied errors
- peer dependency conflicts
- network-related errors

#### Solutions

##### Clean Installation
```bash
# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Verify npm configuration
npm config list

# Install fresh dependencies
npm install
```

##### Permission Issues
```bash
# Fix npm permissions (Linux/macOS)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Alternative: Use nvm to avoid global permissions
# Install nvm and use it to manage Node.js
```

##### Network Issues
```bash
# Use different registry
npm config set registry https://registry.npmjs.org/

# Use npm mirror for faster downloads
npm config set registry https://registry.npmmirror.com/

# Use Yarn instead
npm install -g yarn
yarn install
```

##### Proxy/Firewall Issues
```bash
# Configure proxy for npm
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Or use npm with proxy
npm install --proxy http://proxy.company.com:8080
```

---

### Issue: Development Server Won't Start

#### Symptoms
- `npm run dev` fails to start
- Port already in use error
- Module not found errors
- HMR (Hot Module Replacement) not working

#### Solutions

##### Port Already in Use
```bash
# Find process using port 4200
lsof -i :4200

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- --port 4300

# Kill all Node processes
pkill -f node
```

##### Module Resolution Issues
```bash
# Clear Nx cache
nx reset

# Rebuild dependencies
npm run build

# Check TypeScript configuration
npx tsc --noEmit

# Verify path mappings in tsconfig.json
```

##### HMR Issues
```bash
# Restart development server with HMR debug
npm run dev:debug

# Check for WebSocket issues
# Verify firewall allows localhost connections
```

---

## 🔨 Build and Development Issues

### Issue: TypeScript Compilation Errors

#### Symptoms
- Type errors in build output
- Module resolution failures
- Declaration file errors
- Strict type checking violations

#### Solutions

##### Common TypeScript Fixes
```bash
# Check TypeScript errors with verbose output
npx tsc --noEmit --pretty

# Update TypeScript types
npm update @types/react @types/react-dom @types/node

# Check for type conflicts
npx tsc --listFiles | grep -i error
```

##### Module Resolution
```json
// tsconfig.json fixes
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"]
    }
  }
}
```

##### Type Declaration Issues
```bash
# Generate declaration files
npx tsc --declaration --emitDeclarationOnly

# Update type definitions
npm update @types/*

# Use type checking with less strict rules temporarily
npx tsc --noImplicitReturns false --strictNullChecks false
```

---

### Issue: ESLint/Prettier Conflicts

#### Symptoms
- Formatting conflicts
- Linting errors after formatting
- Inconsistent code style
- Pre-commit hook failures

#### Solutions

##### Configuration Sync
```json
// .eslintrc.json
{
  "extends": [
    "@nx/eslint-plugin/react",
    "@nx/eslint-plugin/react-typescript",
    "prettier"
  ],
  "plugins": ["prettier"],
  "rules": {
    "prettier/prettier": "error",
    "@typescript-eslint/no-unused-vars": "warn"
  }
}
```

##### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

##### Fix Conflicts
```bash
# Auto-fix ESLint issues
npm run lint:fix

# Format with Prettier
npm run format

# Check for conflicting rules
npx eslint-config-prettier .
```

---

### Issue: Test Failures

#### Symptoms
- Unit tests failing
- E2E tests not finding elements
- Test environment issues
- Mock/stub problems

#### Solutions

##### Unit Test Issues
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- KitCard.test.tsx

# Update test snapshots
npm run test:update-snapshots

# Debug tests
npm run test:debug
```

##### E2E Test Issues
```bash
# Run E2E tests in headed mode
npm run test:e2e:headed

# Slow down tests for debugging
npm run test:e2e -- --slowMo 1000

# Check Playwright configuration
npx playwright install

# Update browser binaries
npx playwright install --with-deps
```

##### Test Environment Setup
```bash
# Clear test cache
npm run test -- --no-cache

# Reset test database
npm run db:reset

# Check test configuration
# Verify vitest.config.ts and playright.config.ts
```

---

## ⚡ Performance Issues

### Issue: Slow Build Times

#### Symptoms
- Initial build takes > 2 minutes
- Incremental builds are slow
- HMR updates take > 5 seconds
- Memory usage high during build

#### Solutions

##### Nx Configuration
```json
// nx.json optimization
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "@nx/workspace/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint"]
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"]
    }
  }
}
```

##### Vite Optimization
```typescript
// vite.config.ts performance tweaks
export default defineConfig({
  build: {
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Optimize chunk splitting
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  },
  server: {
    hmr: {
      overlay: false
    }
  }
})
```

##### System Optimization
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"

# Use faster package manager
npm install -g pnpm
pnpm install

# Enable Nx daemon
npx nx enable-daemon
```

---

### Issue: Large Bundle Size

#### Symptoms
- Bundle > 5MB
- Slow initial load times
- Poor Core Web Vitals scores
- Memory issues on mobile

#### Solutions

##### Bundle Analysis
```bash
# Analyze bundle size
npm run build:analyze

# Check bundle composition
npx webpack-bundle-analyzer dist/stats.json

# Identify large dependencies
npx depcheck
```

##### Code Splitting
```typescript
// Optimize imports
import { lazy } from 'react'

const LazyComponent = lazy(() => import('./LazyComponent'))

// Dynamic imports for heavy libraries
const heavyLibrary = await import('./heavyLibrary')

// Tree shake unused exports
export { usedFunction }
// Keep unusedFunction unexported
```

##### Asset Optimization
```typescript
// Image optimization
const optimizedImage = new Image()
optimizedImage.src = '/path/to/image.webp'

// Font optimization
const font = new FontFace('CustomFont', 'url(/font.woff2)')
font.load().then(() => document.fonts.add(font))
```

---

##  PWA and Offline Issues

### Issue: Service Worker Not Registering

#### Symptoms
- PWA won't install
- Offline functionality not working
- Service worker registration errors
- Caching not working

#### Solutions

##### Service Worker Registration
```typescript
// Debug service worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('SW registered:', registration)
    })
    .catch(error => {
      console.error('SW registration failed:', error)
    })
}
```

##### Service Worker Scope
```javascript
// sw.js - Check registration scope
self.addEventListener('install', (event) => {
  console.log('Service worker installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
})
```

##### HTTPS Requirement
```bash
# Service workers require HTTPS (except localhost)
# For development:
npm run dev:https

# Or use ngrok for HTTPS tunnel
ngrok http 4200
```

---

### Issue: PWA Installation Fails

#### Symptoms
- Install prompt not showing
- Installation fails
- App not added to home screen
- Manifest errors

#### Solutions

##### Manifest Configuration
```json
// manifest.json validation
{
  "name": "Gunpla App",
  "short_name": "Gunpla",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ff6b35",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

##### Installation Debugging
```typescript
// Debug install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  console.log('Install prompt ready:', e)
  // Store event for later use
  deferredPrompt = e
})

// Check if app is installed
window.addEventListener('appinstalled', () => {
  console.log('PWA installed')
})
```

---

### Issue: Offline Data Sync Fails

#### Symptoms
- Data not syncing when online
- Actions lost in offline mode
- Background sync not working
- IndexedDB errors

#### Solutions

##### Sync Queue Debugging
```typescript
// Debug queued actions
async function debugSyncQueue() {
  const actions = await getQueuedActions()
  console.log('Queued actions:', actions)

  for (const action of actions) {
    console.log('Action:', action)
    try {
      await processAction(action)
    } catch (error) {
      console.error('Action failed:', action, error)
    }
  }
}
```

##### IndexedDB Debugging
```bash
# Debug IndexedDB in browser
# Chrome: DevTools > Application > IndexedDB
# Firefox: DevTools > Storage > IndexedDB

# Clear corrupted data
indexedDB.deleteDatabase('GunplaAppDB')
```

---

## 💾 Database and Storage Issues

### Issue: IndexedDB Errors

#### Symptoms
- Database not opening
- Data not saving
- Quota exceeded errors
- Transaction failures

#### Solutions

##### Database Debugging
```typescript
// Enhanced error handling
try {
  await db.open()
} catch (error) {
  console.error('Database error:', error)

  // Try to delete and recreate
  if (error.name === 'VersionError') {
    await indexedDB.deleteDatabase('GunplaAppDB')
    await db.open()
  }
}
```

##### Quota Management
```typescript
// Check storage quota
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const estimate = await navigator.storage.estimate()
  console.log('Storage quota:', estimate)

  if (estimate.usage && estimate.quota) {
    const usagePercentage = (estimate.usage / estimate.quota) * 100
    if (usagePercentage > 90) {
      console.warn('Storage nearly full')
      // Implement cleanup
    }
  }
}
```

---

## 🌐 Browser Compatibility Issues

### Issue: Chrome Specific Problems

#### Symptoms
- Chrome extensions interfering
- DevTools errors only in Chrome
- Chrome-specific performance issues

#### Solutions

##### Chrome Debugging
```bash
# Run with Chrome debug flags
npm run dev:debug

# Disable extensions
# chrome://extensions/ - disable all extensions

# Clear Chrome data
# chrome://settings/clearBrowserData
```

---

### Issue: Safari/WebKit Issues

#### Symptoms
- CSS not rendering correctly
- JavaScript errors only in Safari
- Touch events not working

#### Solutions

##### Safari Debugging
```typescript
// Safari-specific fixes
// Add webkit prefixes for CSS
.vendor-prefix {
  -webkit-transform: translateX(0);
  transform: translateX(0);
}

// Handle Safari touch events
element.addEventListener('touchstart', handleTouch, { passive: true })
```

---

### Issue: Mobile Browser Issues

#### Symptoms
- Touch targets too small
- Viewport scaling problems
- Mobile-specific JavaScript errors

#### Solutions

##### Mobile Optimization
```css
/* Mobile viewport fixes */
html {
  touch-action: manipulation;
}

.mobile-friendly {
  min-height: 44px;
  min-width: 44px;
  font-size: 16px; /* Prevent zoom on iOS */
}
```

```typescript
// Mobile-specific JavaScript
if ('ontouchstart' in window) {
  // Touch device optimizations
  document.addEventListener('touchstart', function() {}, { passive: true })
}
```

---

##  Accessibility Issues

### Issue: Screen Reader Problems

#### Symptoms
- Content not announced
- Navigation not working
- Forms not accessible

#### Solutions

##### ARIA Fixes
```typescript
// Add proper ARIA labels
<button
  aria-label="Delete kit"
  aria-describedby="delete-confirmation"
>
  🗑️
</button>

// Live regions for dynamic content
<div
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {announcement}
</div>
```

---

##  Deployment Issues

### Issue: Build Fails in CI/CD

#### Symptoms
- Build passes locally but fails in CI
- Environment-specific errors
- Asset path issues

#### Solutions

##### CI Debugging
```yaml
# GitHub Actions debug
- name: Debug build
  run: |
    npm run build -- --verbose
    ls -la dist/
```

---

## 🆘 Getting Additional Help

### When to Ask for Help
- You've tried all solutions above
- Issue is blocking your development
- You need help understanding error messages
- Performance issues persist

### How to Get Help
1. **Search existing issues**: Check GitHub issues for similar problems
2. **Create detailed issue**: Include error messages, steps to reproduce, environment info
3. **Join community**: Discord, forums, or Stack Overflow
4. **Contact maintainers**: Email or direct messaging for urgent issues

### Information to Include
- Operating system and version
- Node.js and npm versions
- Browser and version
- Full error messages
- Steps to reproduce
- What you've tried so far

---

**Still having issues?** Check our [FAQ](./faq.md) or [open an issue](https://github.com/your-username/gunpla-app/issues).

**Last Updated**: 2025-12-04
**Version**: 1.0.0