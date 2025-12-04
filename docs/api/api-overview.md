# API Overview

This document provides a comprehensive overview of the Gunpla App's API architecture, design patterns, and internal interfaces. Since this is a client-side Progressive Web Application (PWA) with offline-first architecture, our API documentation focuses on internal client APIs, data access patterns, and service interfaces.

##  API Architecture

### Architecture Philosophy

The Gunpla App follows a **layered service architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Components Layer                        │
├─────────────────────────────────────────────────────────────┤
│                    Custom Hooks Layer                         │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │ Kit Service │ │ Photo Svc   │ │ Storage Svc │ │ Auth Svc│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│                  Data Access Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │ IndexedDB   │ │ LocalStorage│ │ SessionStorage││ Cache   │ │
│  │ (Dexie)     │ │             │ │             │ │ API     │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Offline-First**: All APIs work without network connectivity
2. **Type-Safe**: Full TypeScript coverage with strict typing
3. **Reactive**: Observable patterns for real-time updates
4. **Performance Optimized**: Efficient caching and lazy loading
5. **Error Resilient**: Graceful degradation and error boundaries

## 📚 API Categories

### 1. Storage APIs
Data persistence and management using IndexedDB via Dexie

### 2. Service APIs
Business logic and data transformation services

### 3. Hook APIs
React hooks for state management and side effects

### 4. Utility APIs
Helper functions and common utilities

### 5. Browser APIs
Native browser features and Web APIs

### 6. PWA APIs
Progressive Web App specific interfaces

---

## 🗄️ Storage APIs

### IndexedDB Service (Dexie)

The primary storage mechanism using Dexie ORM for IndexedDB access.

```typescript
// Database schema definition
interface GunplaDatabase extends Dexie {
  kits: Table<GunplaKit>;
  categories: Table<Category>;
  tags: Table<Tag>;
  photos: Table<Photo>;
  settings: Table<AppSettings>;
  userPreferences: Table<UserPreferences>;
  buildLogs: Table<BuildLog>;
}

// Database initialization
const db = new GunplaDatabase('GunplaAppDB');
```

#### Key Features:
- **Versioned Migrations**: Automatic schema upgrades
- **Transactions**: ACID-compliant operations
- **Indexing**: Optimized queries with compound indexes
- **Observables**: Real-time data change notifications

### Storage Service API

```typescript
class StorageService {
  // Kit operations
  async createKit(kit: Omit<GunplaKit, 'id'>): Promise<GunplaKit>
  async updateKit(id: string, updates: Partial<GunplaKit>): Promise<GunplaKit>
  async deleteKit(id: string): Promise<void>
  async getKit(id: string): Promise<GunplaKit | null>
  async getKits(filter?: KitFilter): Promise<GunplaKit[]>

  // Batch operations
  async bulkCreateKits(kits: Omit<GunplaKit, 'id'>[]): Promise<GunplaKit[]>
  async bulkUpdateKits(updates: Array<{id: string, changes: Partial<GunplaKit>}): Promise<void>
  async bulkDeleteKits(ids: string[]): Promise<void>

  // Query operations
  async searchKits(query: SearchQuery): Promise<SearchResult<GunplaKit>>
  async getKitsByCategory(categoryId: string): Promise<GunplaKit[]>
  async getKitsByGrade(grade: KitGrade): Promise<GunplaKit[]>

  // Photo operations
  async addPhoto(kitId: string, photo: PhotoInput): Promise<Photo>
  async updatePhoto(photoId: string, updates: Partial<Photo>): Promise<Photo>
  async deletePhoto(photoId: string): Promise<void>
  async getPhotos(kitId: string): Promise<Photo[]>
}
```

### Local Storage API

```typescript
class LocalStorageService {
  // User preferences
  setUserPreferences(preferences: UserPreferences): void
  getUserPreferences(): UserPreferences
  updateUserPreferences(updates: Partial<UserPreferences>): void

  // App settings
  setSetting(key: string, value: unknown): void
  getSetting<T>(key: string, defaultValue?: T): T
  removeSetting(key: string): void

  // Cache management
  setCache(key: string, data: unknown, ttl?: number): void
  getCache<T>(key: string): T | null
  clearCache(): void
  clearExpiredCache(): void
}
```

---

## 🔧 Service APIs

### Kit Service API

Core business logic for kit management and operations.

```typescript
class KitService {
  // CRUD operations
  async createKit(input: CreateKitInput): Promise<KitResult>
  async updateKit(id: string, input: UpdateKitInput): Promise<KitResult>
  async deleteKit(id: string): Promise<DeleteResult>
  async getKit(id: string): Promise<KitResult>
  async getKits(params?: GetKitsParams): Promise<PaginatedKitsResult>

  // Search and filtering
  async searchKits(query: SearchKitsInput): Promise<SearchResult>
  async filterKits(filters: KitFilters): Promise<FilterResult>
  async getKitSuggestions(query: string): Promise<KitSuggestion[]>

  // Analytics and statistics
  async getCollectionStats(): Promise<CollectionStats>
  async getProgressStats(): Promise<ProgressStats>
  async getValueStats(): Promise<ValueStats>

  // Import/Export
  async exportKits(format: ExportFormat): Promise<ExportResult>
  async importKits(data: ImportData): Promise<ImportResult>
  async validateImportData(data: unknown): Promise<ValidationResult>
}
```

### Photo Service API

Image management and processing functionality.

```typescript
class PhotoService {
  // Photo management
  async uploadPhoto(file: File, metadata?: PhotoMetadata): Promise<PhotoResult>
  async processPhoto(photo: Photo, operations: PhotoOperations): Promise<Photo>
  async resizePhoto(photo: Photo, dimensions: Dimensions): Promise<Photo>
  async optimizePhoto(photo: Photo): Promise<Photo>

  // Photo operations
  async rotatePhoto(photoId: string, degrees: number): Promise<Photo>
  async cropPhoto(photoId: string, cropArea: CropArea): Promise<Photo>
  async adjustPhoto(photoId: string, adjustments: PhotoAdjustments): Promise<Photo>

  // Storage and caching
  async cachePhoto(photo: Photo): Promise<void>
  async getCachedPhoto(photoId: string): Promise<Photo | null>
  async clearPhotoCache(): Promise<void>

  // EXIF data
  async extractExifData(photo: Photo): Promise<ExifData>
  async removeExifData(photo: Photo): Promise<Photo>
}
```

### Category Service API

Collection categorization and organization.

```typescript
class CategoryService {
  // Category management
  async createCategory(input: CreateCategoryInput): Promise<Category>
  async updateCategory(id: string, input: UpdateCategoryInput): Promise<Category>
  async deleteCategory(id: string): Promise<void>
  async getCategory(id: string): Promise<Category | null>
  async getCategories(): Promise<Category[]>

  // Category hierarchy
  async createSubCategory(parentId: string, input: CreateCategoryInput): Promise<Category>
  async getCategoryTree(): Promise<CategoryTree>
  async moveCategory(categoryId: string, newParentId?: string): Promise<void>

  // Category statistics
  async getCategoryStats(categoryId: string): Promise<CategoryStats>
  async getPopularCategories(limit?: number): Promise<Category[]>
}
```

### Settings Service API

Application settings and user preferences management.

```typescript
class SettingsService {
  // Settings management
  async getSettings(): Promise<AppSettings>
  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings>
  async resetSettings(): Promise<AppSettings>
  async exportSettings(): Promise<SettingsExport>
  async importSettings(data: SettingsImport): Promise<void>

  // Theme management
  async getTheme(): Promise<Theme>
  async setTheme(theme: Theme): Promise<void>
  async createCustomTheme(theme: CustomThemeInput): Promise<CustomTheme>
  async deleteCustomTheme(themeId: string): Promise<void>

  // Notification settings
  async getNotificationSettings(): Promise<NotificationSettings>
  async updateNotificationSettings(updates: Partial<NotificationSettings>): Promise<void>
}
```

---

## 🪝 Hook APIs

React hooks provide reactive state management and side effect handling.

### Kit Hooks

```typescript
// Kit data hooks
function useKit(id: string): KitHookResult
function useKits(params?: UseKitsParams): UseKitsResult
function useSearchKits(query: string, debounceMs?: number): SearchKitsResult
function useKitFilters(): KitFiltersHookResult

// Kit mutation hooks
function useCreateKit(): UseCreateKitResult
function useUpdateKit(): UseUpdateKitResult
function useDeleteKit(): UseDeleteKitResult
function useBulkUpdateKits(): UseBulkUpdateKitsResult

// Kit statistics hooks
function useCollectionStats(): CollectionStatsResult
function useProgressStats(): ProgressStatsResult
```

### Storage Hooks

```typescript
// Storage state hooks
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void]
function useSessionStorage<T>(key: string, initialValue: T): [T, (value: T) => void]
function useIndexedDB<T>(table: string, query?: any): UseIndexedDBResult<T>

// Sync hooks
function useSyncStatus(): SyncStatusResult
function useOfflineMode(): OfflineModeResult
```

### UI Hooks

```typescript
// Responsive design hooks
function useBreakpoint(): BreakpointResult
function useMediaQuery(query: string): boolean
function useViewportSize(): ViewportSize

// User interaction hooks
function useDebounce<T>(value: T, delay: number): T
function useThrottle<T>(value: T, limit: number): T
function useKeyPress(targetKey: string): boolean
function useClickOutside(callback: () => void): RefObject<HTMLElement>
```

### PWA Hooks

```typescript
// PWA functionality hooks
function useInstallPrompt(): InstallPromptResult
function useNetworkStatus(): NetworkStatusResult
function useBeforeInstallPrompt(): BeforeInstallPromptResult
function useServiceWorker(): ServiceWorkerResult

// Push notification hooks
function usePushNotifications(): PushNotificationsResult
function useNotificationPermission(): NotificationPermissionResult
```

---

##  Utility APIs

### Validation API

```typescript
class ValidationService {
  // Schema validation
  validateKit(input: unknown): ValidationResult<CreateKitInput>
  validatePhoto(file: File): ValidationResult<PhotoInput>
  validateCategory(input: unknown): ValidationResult<CreateCategoryInput>

  // Custom validators
  validateImageFile(file: File): ValidationResult<File>
  validateKitGrade(grade: string): ValidationResult<KitGrade>
  validatePrice(price: number): ValidationResult<number>

  // Form validation
  validateForm<T>(schema: ValidationSchema<T>, data: unknown): ValidationResult<T>
  validateField(field: string, value: unknown, rules: ValidationRule[]): ValidationResult
}
```

### File Processing API

```typescript
class FileProcessingService {
  // Image processing
  async resizeImage(file: File, dimensions: Dimensions): Promise<File>
  async compressImage(file: File, quality: number): Promise<File>
  async convertFormat(file: File, format: ImageFormat): Promise<File>

  // File operations
  async readFileAsDataURL(file: File): Promise<string>
  async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer>
  async getFileMetadata(file: File): Promise<FileMetadata>

  // Import/Export
  async exportToJSON(data: unknown): Promise<File>
  async exportToCSV(data: ExportableData): Promise<File>
  async parseImportFile(file: File): Promise<ImportData>
}
```

### Date/Time API

```typescript
class DateTimeService {
  // Formatting
  formatDate(date: Date, format?: string): string
  formatDateRelative(date: Date): string
  formatDateTime(date: Date): string

  // Calculations
  calculateAge(date: Date): number
  calculateDuration(startDate: Date, endDate?: Date): Duration
  isDateInPast(date: Date): boolean
  isDateInFuture(date: Date): boolean

  // Time zones
  convertTimeZone(date: Date, timeZone: string): Date
  getUserTimeZone(): string
}
```

---

## 🌐 Browser APIs

### Notification API

```typescript
class NotificationService {
  async requestPermission(): Promise<NotificationPermission>
  async showNotification(notification: NotificationOptions): Promise<Notification>
  async scheduleNotification(notification: ScheduledNotification): Promise<void>
  async closeNotification(notificationId: string): Promise<void>
  async getActiveNotifications(): Promise<Notification[]>
}
```

### Geolocation API

```typescript
class GeolocationService {
  async getCurrentPosition(): Promise<GeolocationPosition>
  async watchPosition(callback: PositionCallback): Promise<number>
  async clearWatch(watchId: number): Promise<void>
  async isSupported(): Promise<boolean>
}
```

### Clipboard API

```typescript
class ClipboardService {
  async writeText(text: string): Promise<void>
  async readText(): Promise<string>
  async writeData(data: ClipboardData): Promise<void>
  async readData(mimeType: string): Promise<string>
  async isSupported(): Promise<boolean>
}
```

---

##  PWA APIs

### Service Worker API

```typescript
class ServiceWorkerService {
  async register(): Promise<ServiceWorkerRegistration>
  async unregister(): Promise<boolean>
  async update(): Promise<ServiceWorker>
  async skipWaiting(): Promise<void>
  async getMessageChannel(): MessageChannel

  // Caching
  async cacheRequest(request: Request): Promise<Response>
  async getCachedRequest(request: Request): Promise<Response | null>
  async clearCache(): Promise<void>
}
```

### Web App Manifest API

```typescript
class ManifestService {
  async getManifest(): Promise<WebAppManifest>
  async updateManifest(updates: Partial<WebAppManifest>): Promise<void>
  async install(): Promise<void>
  async isInstallable(): Promise<boolean>
  async getInstallState(): Promise<InstallState>
}
```

### Background Sync API

```typescript
class BackgroundSyncService {
  async registerSync(tag: string): Promise<void>
  async getSyncTags(): Promise<string[]>
  async unregisterSync(tag: string): Promise<void>
  async syncNow(tag?: string): Promise<void>
  async isSupported(): Promise<boolean>
}
```

---

## 🔄 Data Flow Patterns

### Reactive Data Flow

```typescript
// Example: Kit list with real-time updates
function useKitsWithRealTimeUpdates() {
  const [kits, setKits] = useState<GunplaKit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Initial load
    storageService.getKits()
      .then(setKits)
      .catch(setError)
      .finally(() => setLoading(false))

    // Subscribe to real-time updates
    const subscription = db.kits.hook('changes', () => {
      storageService.getKits().then(setKits)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { kits, loading, error }
}
```

### Optimistic Updates

```typescript
// Example: Optimistic kit updates
function useOptimisticKitUpdate() {
  const queryClient = useQueryClient()

  const updateKit = useMutation({
    mutationFn: ({ id, updates }: {id: string, updates: Partial<GunplaKit>}) =>
      storageService.updateKit(id, updates),

    onMutate: async ({ id, updates }) => {
      // Cancel any in-flight queries
      await queryClient.cancelQueries(['kits'])

      // Snapshot previous value
      const previousKit = queryClient.getQueryData(['kit', id])

      // Optimistically update
      queryClient.setQueryData(['kit', id], (old: GunplaKit) =>
        ({ ...old, ...updates })
      )

      return { previousKit }
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousKit) {
        queryClient.setQueryData(['kit', variables.id], context.previousKit)
      }
    },

    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries(['kit', variables.id])
    }
  })

  return updateKit
}
```

---

## 🛡️ Error Handling

### Error Types

```typescript
// Base error class
class GunplaAppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'GunplaAppError'
  }
}

// Specific error types
class ValidationError extends GunplaAppError {
  constructor(message: string, public validationErrors: ValidationError[]) {
    super(message, 'VALIDATION_ERROR', 400, { validationErrors })
  }
}

class StorageError extends GunplaAppError {
  constructor(message: string, public operation: string) {
    super(message, 'STORAGE_ERROR', 500, { operation })
  }
}

class NetworkError extends GunplaAppError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR', 0)
  }
}
```

### Error Boundaries

```typescript
class APIErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('API Error:', error, errorInfo)
    // Report to error tracking service
    this.reportError(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}
```

---

## 📊 Performance Monitoring

### API Performance Tracking

```typescript
class APIMonitor {
  private static instance: APIMonitor
  private metrics: Map<string, APIMetric[]> = new Map()

  async trackAPICall<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()

    try {
      const result = await operation()

      this.recordMetric(name, {
        duration: performance.now() - startTime,
        success: true,
        timestamp: Date.now()
      })

      return result
    } catch (error) {
      this.recordMetric(name, {
        duration: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      })

      throw error
    }
  }

  getMetrics(name: string): APIMetric[] {
    return this.metrics.get(name) || []
  }

  getAverageLatency(name: string): number {
    const metrics = this.getMetrics(name)
    return metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
  }
}
```

---

## 🔗 Related Documentation

- [Data Schemas](./data-schemas.md) - TypeScript interfaces and validation schemas
- [Storage APIs](./storage-apis.md) - Detailed storage layer documentation
- [Client-Side APIs](./client-apis.md) - Browser and Web API integrations
- [Testing Guide](../guides/testing.md) - Testing strategies for APIs

---

**Last Updated**: 2025-12-04
**Version**: 1.0.0