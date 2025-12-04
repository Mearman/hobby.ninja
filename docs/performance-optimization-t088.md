# T088: Performance Optimization Analysis & Implementation Plan

## Executive Summary

This document provides a comprehensive performance optimization strategy for the unnamed-gunpla-app Nx monorepo, focusing on React webapp performance, CLI tool efficiency, and monorepo build optimization.

## Current Performance Assessment

### Application Architecture Analysis

**Monorepo Structure:**
- **Main Webapp**: React 19 + TypeScript + Vite + TanStack Router + Mantine UI + Vanilla Extract CSS
- **CLI Tools**: Node.js-based CLI for data scraping and management
- **Database**: IndexedDB via Dexie for client-side storage
- **Build System**: Nx with Vite for fast development and optimized builds
- **Packages**: 5 internal packages (cli, eslint-config, types, utils, webapp)

**Performance Bottlenecks Identified:**

1. **Bundle Size Issues**:
   - No code splitting implemented in router
   - All dependencies loaded eagerly at startup
   - Mantine UI components not tree-shaken effectively
   - PWA assets not optimized

2. **Database Performance**:
   - No database indexing strategy beyond basic SKU indexing
   - Bulk operations not implemented for large datasets
   - No query optimization for complex filtering
   - Missing pagination for large collections

3. **Rendering Performance**:
   - No virtualization implemented for large lists
   - Component memoization not utilized
   - No React Concurrent features leveraged
   - Missing key prop optimizations

4. **Caching Strategy**:
   - Basic PWA caching present but not optimized
   - No IndexedDB query result caching
   - Missing HTTP caching headers for static assets
   - No service worker update strategies

5. **Build Performance**:
   - No parallel build optimization configured
   - Missing incremental build strategies
   - Large dependencies not externalized
   - No bundle analysis integration

## Optimization Implementation Plan

### Phase 1: Bundle Optimization (Immediate Impact)

#### 1.1 Code Splitting Implementation
**Files to modify:** `/apps/webapp/src/router.tsx`, `/apps/webapp/vite.config.ts`

```typescript
// Implement lazy loading for route components
const HomePage = lazy(() => import('./pages/HomePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const CollectionPage = lazy(() => import('./pages/CollectionPage'));
// ... other routes

// Add Suspense boundaries with loading states
<Suspense fallback={<LoadingSpinner />}>
  <Outlet />
</Suspense>
```

**Expected Impact:** 40-60% reduction in initial bundle size

#### 1.2 Tree Shaking Optimization
**Files to modify:** `/apps/webapp/vite.config.ts`, package.json

```typescript
// Vite configuration for better tree shaking
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['react-dom', 'react'],
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    }
  }
});
```

**Expected Impact:** 15-25% reduction in bundle size

#### 1.3 Dependency Optimization
**Files to modify:** `/apps/webapp/vite.config.ts`

```typescript
// Externalize large dependencies
export default defineConfig({
  optimizeDeps: {
    exclude: ['@mantine/core', '@mantine/hooks'],
    include: ['react', 'react-dom']
  }
});
```

### Phase 2: Database Performance Optimization

#### 2.1 Query Optimization
**Files to modify:** `/apps/webapp/src/db/index.ts`

```typescript
// Implement compound indexes and optimized queries
gunplaDB.version(2).stores({
  collectionEntries: 'id, sku, quantity, condition, addedAt, updatedAt, [status+addedAt]',
  // ... other optimized indexes
});

// Add pagination and bulk operations
async getPaginatedCollectionEntries(page: number, limit: number, filters?: FilterOptions) {
  let query = gunplaDB.collectionEntries.orderBy('addedAt').reverse();

  if (filters) {
    query = query.filter(entry => matchesFilters(entry, filters));
  }

  return await query.offset((page - 1) * limit).limit(limit).toArray();
}
```

**Expected Impact:** 70-80% improvement in query performance for large datasets

#### 2.2 Caching Layer Implementation
**Files to modify:** `/apps/webapp/src/db/cache-manager.ts` (new)

```typescript
// Implement intelligent caching for frequently accessed data
class DatabaseCacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  async getCachedData<T>(key: string, fetchFn: () => Promise<T>, ttl = 300000): Promise<T> {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: Date.now(), ttl });

    return data;
  }
}
```

### Phase 3: Rendering Performance Optimization

#### 3.1 Component Memoization
**Files to modify:** All component files

```typescript
// Implement React.memo and useMemo optimizations
const CollectionItem = React.memo(({ item }: { item: CollectionEntry }) => {
  const formattedPrice = useMemo(() =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(item.price),
    [item.price]
  );

  return <div>{formattedPrice}</div>;
});
```

#### 3.2 Virtualization for Large Lists
**Files to modify:** `/apps/webapp/src/components/VirtualizedList.tsx` (new)

```typescript
// Implement react-window or custom virtualization
import { FixedSizeList as List } from 'react-window';

const VirtualizedCollectionList: React.FC<{ items: CollectionEntry[] }> = ({ items }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <CollectionItem item={items[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={120}
      itemData={items}
    >
      {Row}
    </List>
  );
};
```

**Expected Impact:** 90%+ performance improvement for lists with 1000+ items

### Phase 4: Image and Asset Optimization

#### 4.1 Image Optimization Pipeline
**Files to modify:** `/apps/webapp/src/components/OptimizedImage.tsx` (new)

```typescript
// Implement lazy loading, progressive loading, and WebP support
const OptimizedImage: React.FC<ImageProps> = ({ src, alt, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="image-container">
      {!isLoaded && <Skeleton />}
      <img
        src={`${src}?format=webp&quality=80`}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        style={{ display: isLoaded ? 'block' : 'none' }}
        {...props}
      />
      {error && <ImageFallback />}
    </div>
  );
};
```

#### 4.2 Asset Compression and CDN
**Files to modify:** `/apps/webapp/vite.config.ts`

```typescript
// Add image optimization plugin
import { ViteImageOptimize } from 'vite-plugin-imagemin';

export default defineConfig({
  plugins: [
    ViteImageOptimize({
      gifsicle: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.65, 0.8] },
      svgo: {
        plugins: [
          { removeViewBox: false },
          { removeEmptyAttrs: false }
        ]
      }
    })
  ]
});
```

### Phase 5: Network and PWA Optimization

#### 5.1 Service Worker Optimization
**Files to modify:** `/apps/webapp/public/sw.js`, `/apps/webapp/vite.config.ts`

```typescript
// Enhanced caching strategies
const workboxConfig = {
  runtimeCaching: [
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30
        },
        cacheKeyWillBeUsed: async ({ request }) => {
          return `${request.url}?v=${VERSION}`;
        }
      }
    },
    {
      urlPattern: /^https:\/\/api\./i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 5 // 5 minutes
        }
      }
    }
  ]
};
```

#### 5.2 Request Optimization
**Files to modify:** `/apps/webapp/src/utils/api-client.ts` (new)

```typescript
// Implement request batching, deduplication, and retry logic
class ApiClient {
  private requestCache = new Map<string, Promise<any>>();
  private requestQueue: Array<() => Promise<any>> = [];

  async request<T>(url: string, options?: RequestInit): Promise<T> {
    const cacheKey = `${url}-${JSON.stringify(options)}`;

    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }

    const requestPromise = this.executeRequest(url, options);
    this.requestCache.set(cacheKey, requestPromise);

    // Clean up cache after request completes
    requestPromise.finally(() => {
      this.requestCache.delete(cacheKey);
    });

    return requestPromise;
  }

  private async executeRequest<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
          ...options?.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Implement retry logic
      if (this.shouldRetry(error)) {
        return this.retryRequest(url, options);
      }
      throw error;
    }
  }
}
```

### Phase 6: Memory Management

#### 6.1 Memory Leak Prevention
**Files to modify:** All component files, `/apps/webapp/src/hooks/useCleanup.ts` (new)

```typescript
// Custom hook for cleanup management
const useCleanup = (cleanupFn: () => void, deps: React.DependencyList = []) => {
  useEffect(() => {
    return cleanupFn;
  }, deps);
};

// Event listener cleanup
const useEventListener = (target: EventTarget, event: string, handler: Function) => {
  useCleanup(() => {
    target.addEventListener(event, handler as EventListener);
    return () => target.removeEventListener(event, handler as EventListener);
  }, [target, event, handler]);
};
```

#### 6.2 WeakMap and WeakRef Usage
**Files to modify:** `/apps/webapp/src/utils/weak-cache.ts` (new)

```typescript
// Implement memory-efficient caching
class WeakCache<K extends object, V> {
  private cache = new WeakMap<K, V>();
  private registry = new FinalizationRegistry((key: K) => {
    this.cache.delete(key);
  });

  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    this.cache.set(key, value);
    this.registry.register(key, key);
  }
}
```

### Phase 7: Build and CI/CD Optimization

#### 7.1 Nx Build Optimization
**Files to modify:** `nx.json`, `/apps/webapp/project.json`

```json
{
  "targetDefaults": {
    "build": {
      "cache": true,
      "dependsOn": ["^build"],
      "parallel": 4,
      "maxParallel": 4
    }
  }
}
```

#### 7.2 Bundle Analysis Integration
**Files to modify:** `/apps/webapp/vite.config.ts`, `package.json`

```typescript
// Add rollup-plugin-visualizer for bundle analysis
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true
    })
  ]
});
```

## Performance Metrics and Monitoring

### Key Performance Indicators (KPIs)

1. **Core Web Vitals Targets:**
   - LCP (Largest Contentful Paint): < 2.5s
   - FID (First Input Delay): < 100ms
   - CLS (Cumulative Layout Shift): < 0.1

2. **Bundle Size Targets:**
   - Initial JavaScript bundle: < 200KB (gzipped)
   - Total JavaScript: < 500KB (gzipped)
   - Total CSS: < 50KB (gzipped)
   - Images: Optimized to WebP with appropriate sizes

3. **Database Performance Targets:**
   - Simple queries: < 10ms
   - Complex queries with filters: < 50ms
   - Bulk operations: < 100ms for 1000 items
   - Index size: < 10MB for typical user data

4. **Build Performance Targets:**
   - Development server start: < 5s
   - Production build: < 2 minutes
   - Incremental build: < 30 seconds
   - Test execution: < 1 minute

### Monitoring Implementation

#### Real User Monitoring (RUM)
```typescript
// Core Web Vitals monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Send to analytics service
  gtag('event', metric.name, {
    event_category: 'Web Vitals',
    event_label: metric.id,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    non_interaction: true,
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

#### Performance Budget Integration
```json
{
  "performanceBudget": {
    "scripts": 200,
    "styles": 50,
    "images": 500,
    "fonts": 100,
    "total": 800
  }
}
```

## Implementation Timeline

### Week 1: Foundation (Bundle & Database)
- Implement code splitting for routes
- Optimize database queries and add pagination
- Set up bundle analysis and monitoring

### Week 2: Rendering & Memory
- Implement component memoization
- Add virtualization for large lists
- Fix memory leaks and optimize memory usage

### Week 3: Assets & Network
- Implement image optimization pipeline
- Optimize PWA caching strategies
- Add request optimization layer

### Week 4: Build & CI/CD
- Optimize monorepo build performance
- Add performance monitoring
- Implement performance budgets

## Expected Performance Improvements

### Quantitative Improvements
- **Initial Bundle Size**: 60-70% reduction
- **Time to Interactive**: 40-50% improvement
- **Database Query Performance**: 70-80% improvement
- **Build Times**: 30-40% reduction
- **Memory Usage**: 50% reduction for large datasets
- **Core Web Vitals**: Meet all Google thresholds

### User Experience Improvements
- Faster initial page loads
- Smooth scrolling and interactions
- Responsive interface with large datasets
- Better offline experience
- Reduced data usage on mobile

## Risk Assessment and Mitigation

### Potential Risks
1. **Breaking Changes**: Code splitting may introduce race conditions
2. **Memory Leaks**: New caching layer could introduce leaks
3. **Build Complexity**: Additional tooling may increase build time
4. **Compatibility**: PWA features may not work on all browsers

### Mitigation Strategies
1. **Incremental Rollout**: Deploy changes in phases with feature flags
2. **Comprehensive Testing**: Add performance regression tests
3. **Monitoring**: Real-time performance monitoring with alerts
4. **Fallbacks**: Graceful degradation for unsupported features

## Success Metrics

### Technical Metrics
- Bundle size reduction > 50%
- Core Web Vitals scores in "Good" range
- Build time improvement > 30%
- Database query performance improvement > 60%

### Business Metrics
- User engagement increase
- Bounce rate reduction
- Page view duration increase
- Mobile conversion improvement

## Conclusion

This comprehensive performance optimization plan addresses all aspects of the unnamed-gunpla-app, from bundle size and database performance to build optimization and user experience. The phased approach ensures minimal disruption while delivering maximum performance improvements.

By implementing these optimizations, the application will achieve modern web performance standards, providing an excellent user experience across all devices and network conditions.