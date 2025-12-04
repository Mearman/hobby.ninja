# Data Schemas

This document provides comprehensive TypeScript schema definitions and validation rules for all data structures used throughout the Gunpla App.

##  Table of Contents

- [Core Schemas](#core-schemas)
- [Kit Schemas](#kit-schemas)
- [Photo Schemas](#photo-schemas)
- [Category Schemas](#category-schemas)
- [User Schemas](#user-schemas)
- [Settings Schemas](#settings-schemas)
- [API Schemas](#api-schemas)
- [Validation Rules](#validation-rules)

---

##  Core Schemas

### Base Types

```typescript
// Unique identifier type
type ID = string

// Timestamps
interface Timestamps {
  createdAt: Date
  updatedAt: Date
}

// Soft delete support
interface SoftDeletable {
  deletedAt?: Date
  isDeleted: boolean
}

// Pagination
interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
```

### Search and Filtering

```typescript
// Search query
interface SearchQuery {
  query: string
  filters?: Record<string, unknown>
  pagination?: PaginationParams
}

// Search result
interface SearchResult<T> {
  items: T[]
  total: number
  took: number
  suggestions?: string[]
}

// Filter operators
type FilterOperator =
  | 'eq'      // equals
  | 'ne'      // not equals
  | 'gt'      // greater than
  | 'gte'     // greater than or equal
  | 'lt'      // less than
  | 'lte'     // less than or equal
  | 'in'      // in array
  | 'nin'     // not in array
  | 'contains'
  | 'startsWith'
  | 'endsWith'

interface FilterCondition {
  field: string
  operator: FilterOperator
  value: unknown
}
```

---

## 🤖 Kit Schemas

### GunplaKit

```typescript
// Kit grades
type KitGrade =
  | 'HG'     // High Grade
  | 'RG'     // Real Grade
  | 'MG'     // Master Grade
  | 'PG'     | // Perfect Grade
  | 'MGSD'   // Master Grade SD
  | 'RE'     // RE/100
  | 'SD'     | // Super Deformed
  | 'EG'     // Entry Grade
  | 'RG 1/144' // Real Grade 1/144
  | 'Mega Size'

// Manufacturers
type Manufacturer =
  | 'Bandai'
  | 'Kotobukiya'
  | 'Dragon Momoko'
  | 'Daban'
  | 'Other'

// Build status
type BuildStatus =
  | 'Not Started'
  | 'In Progress'
  | 'On Hold'
  | 'Completed'
  | 'Abandoned'

// Scale
type Scale =
  | '1/144'
  | '1/100'
  | '1/60'
  | '1/48'
  | '1/35'
  | 'Non Scale'
  | 'Other'

// Series
interface Series {
  id: ID
  name: string
  abbreviation?: string
  timeline?: string
}

// Main kit interface
interface GunplaKit extends Timestamps, SoftDeletable {
  id: ID

  // Basic information
  name: string                    // e.g., "RX-78-2 Gundam"
  modelNumber?: string           // e.g., "Gundam Base Limited RX-78-2"
  grade: KitGrade
  series: Series
  scale: Scale
  manufacturer: Manufacturer

  // Release and purchase information
  releaseDate?: Date
  price?: number                 // In user's currency
  purchaseDate?: Date
  purchasePrice?: number
  purchaseLocation?: string

  // Build information
  buildStatus: BuildStatus
  buildStartDate?: Date
  completionDate?: Date
  buildTime?: number             // In hours

  // Physical attributes
  height?: number                // In millimeters
  weight?: number                // In grams
  partsCount?: number
  runnerCount?: number

  // Content
  description?: string
  notes?: string

  // External references
  boxArt?: string                // URL to box art image
  manualUrl?: string
  bandaiUrl?: string
  hgucUrl?: string

  // User data
  rating?: number                // 1-5 stars
  difficulty?: number            // 1-5 scale
  isFavorite: boolean

  // Tags and categories
  tags: string[]
  categoryId?: ID

  // Photos
  photoIds: ID[]

  // Custom fields
  customFields?: Record<string, unknown>
}

// Kit creation input
interface CreateKitInput {
  name: string
  grade: KitGrade
  series: Series
  scale: Scale
  manufacturer: Manufacturer
  price?: number
  releaseDate?: Date
  description?: string
  tags?: string[]
  categoryId?: ID
}

// Kit update input
interface UpdateKitInput {
  name?: string
  grade?: KitGrade
  series?: Series
  scale?: Scale
  manufacturer?: Manufacturer
  buildStatus?: BuildStatus
  price?: number
  rating?: number
  difficulty?: number
  description?: string
  notes?: string
  tags?: string[]
  categoryId?: ID
  isFavorite?: boolean
  customFields?: Record<string, unknown>
}

// Kit filters
interface KitFilters {
  grades?: KitGrade[]
  manufacturers?: Manufacturer[]
  scales?: Scale[]
  series?: Series[]
  buildStatuses?: BuildStatus[]
  priceRange?: [number, number]
  ratingRange?: [number, number]
  difficultyRange?: [number, number]
  tags?: string[]
  categoryId?: ID
  isFavorite?: boolean
  dateRange?: {
    releaseDate?: [Date, Date]
    purchaseDate?: [Date, Date]
    completionDate?: [Date, Date]
  }
}

// Kit statistics
interface KitStats {
  total: number
  completed: number
  inProgress: number
  notStarted: number
  onHold: number
  totalValue: number
  averageRating: number
  completionRate: number
  gradeDistribution: Record<KitGrade, number>
  manufacturerDistribution: Record<Manufacturer, number>
  seriesDistribution: Record<string, number>
}
```

### Build Log

```typescript
interface BuildLog extends Timestamps {
  id: ID
  kitId: ID

  // Log entry
  date: Date
  sessionDuration?: number      // In minutes
  description: string
  photos?: ID[]

  // Progress
  stepsCompleted?: number
  totalSteps?: number
  percentageComplete?: number

  // Materials used
  paintUsed?: string[]
  toolsUsed?: string[]

  // Rating and notes
  sessionRating?: number         // 1-5 stars
  difficulties?: string[]
  achievements?: string[]

  // Cost tracking
  materialsCost?: number
  toolsCost?: number
}

interface CreateBuildLogInput {
  kitId: ID
  date: Date
  description: string
  sessionDuration?: number
  stepsCompleted?: number
  totalSteps?: number
  photos?: ID[]
  paintUsed?: string[]
  toolsUsed?: string[]
  sessionRating?: number
  materialsCost?: number
}
```

---

## 📸 Photo Schemas

### Photo

```typescript
interface Photo extends Timestamps {
  id: ID

  // File information
  filename: string
  originalName: string
  mimeType: string
  size: number                   // In bytes
  dimensions: {
    width: number
    height: number
  }

  // Storage
  url: string                   // Base64 or blob URL
  thumbnailUrl?: string
  storageKey: string            // IndexedDB key

  // Metadata
  title?: string
  description?: string
  tags: string[]

  // EXIF data
  exifData?: ExifData

  // Photo type
  type: PhotoType
  kitId?: ID                    // If associated with a kit

  // Editing
  isEdited: boolean
  originalPhotoId?: ID          // Reference to original if edited

  // User data
  isPublic: boolean
  isFavorite: boolean
}

type PhotoType =
  | 'box_art'
  | 'build_progress'
  | 'completed'
  | 'detail_shot'
  | 'comparison'
  | 'custom'
  | 'other'

interface ExifData {
  make?: string
  model?: string
  dateTime?: Date
  exposureTime?: number
  fNumber?: number
  iso?: number
  focalLength?: number
  flash?: boolean
  gpsCoordinates?: {
    latitude: number
    longitude: number
  }
}

interface CreatePhotoInput {
  file: File
  title?: string
  description?: string
  tags?: string[]
  type?: PhotoType
  kitId?: ID
}

interface PhotoFilters {
  types?: PhotoType[]
  tags?: string[]
  kitId?: ID
  dateRange?: [Date, Date]
  isFavorite?: boolean
  hasExifData?: boolean
}
```

### Photo Processing

```typescript
interface PhotoOperations {
  resize?: {
    width: number
    height: number
    maintainAspectRatio?: boolean
  }
  crop?: {
    x: number
    y: number
    width: number
    height: number
  }
  rotate?: number               // In degrees
  adjust?: {
    brightness?: number        // -100 to 100
    contrast?: number          // -100 to 100
    saturation?: number        // -100 to 100
  }
  filter?: PhotoFilter
}

type PhotoFilter =
  | 'grayscale'
  | 'sepia'
  | 'blur'
  | 'sharpen'
  | 'vintage'
  | 'cold'
  | 'warm'
```

---

##  Category Schemas

### Category

```typescript
interface Category extends Timestamps {
  id: ID

  // Basic information
  name: string
  description?: string
  color?: string                // Hex color code
  icon?: string                 // Icon identifier

  // Hierarchy
  parentId?: ID
  level: number                  // 0 = root, 1 = child, etc.
  path: string                   // e.g., "Gundam/UC/MS"

  // Organization
  sortOrder: number
  isActive: boolean

  // Statistics
  kitCount: number
  completedCount: number

  // Rules and validation
  allowedGrades?: KitGrade[]
  allowedScales?: Scale[]

  // User data
  isSystem: boolean             // System categories cannot be deleted
  isFavorite: boolean
}

interface CreateCategoryInput {
  name: string
  description?: string
  color?: string
  icon?: string
  parentId?: ID
  allowedGrades?: KitGrade[]
  allowedScales?: Scale[]
}

interface UpdateCategoryInput {
  name?: string
  description?: string
  color?: string
  icon?: string
  parentId?: ID
  sortOrder?: number
  isActive?: boolean
  allowedGrades?: KitGrade[]
  allowedScales?: Scale[]
  isFavorite?: boolean
}

// Category tree for hierarchical display
interface CategoryTree {
  category: Category
  children: CategoryTree[]
  totalKits: number
  completedKits: number
}
```

---

## 👤 User Schemas

### User Profile

```typescript
interface UserProfile extends Timestamps {
  id: ID

  // Basic information
  displayName: string
  avatar?: string                // Base64 or URL
  bio?: string

  // Preferences
  timezone: string
  language: string
  currency: string

  // Statistics
  totalKits: number
  completedKits: number
  totalValue: number
  joinDate: Date
  lastActiveDate: Date

  // Social
  isPublic: boolean
  socialLinks?: {
    website?: string
    twitter?: string
    instagram?: string
    youtube?: string
  }
}

interface UpdateProfileInput {
  displayName?: string
  avatar?: string
  bio?: string
  timezone?: string
  language?: string
  currency?: string
  isPublic?: boolean
  socialLinks?: {
    website?: string
    twitter?: string
    instagram?: string
    youtube?: string
  }
}
```

### User Preferences

```typescript
interface UserPreferences {
  // Display preferences
  theme: 'light' | 'dark' | 'auto'
  primaryColor: string
  fontSize: 'small' | 'medium' | 'large'

  // Layout preferences
  gridView: boolean
  itemsPerPage: number
  showCompleted: boolean
  showFavorited: boolean

  // Default values
  defaultGrade: KitGrade
  defaultScale: Scale
  defaultManufacturer: Manufacturer

  // Notifications
  emailNotifications: boolean
  pushNotifications: boolean
  reminderEnabled: boolean
  reminderDays: number

  // Privacy
  shareStatistics: boolean
  shareCollection: boolean

  // Advanced
  autoBackup: boolean
  backupFrequency: 'daily' | 'weekly' | 'monthly'
  dataRetentionDays: number
}
```

---

## ⚙️ Settings Schemas

### App Settings

```typescript
interface AppSettings {
  // Application
  version: string
  isFirstLaunch: boolean
  lastMigrationVersion: string

  // Data management
  autoSave: boolean
  autoSaveInterval: number       // In seconds
  maxUndoHistory: number
  cacheSizeLimit: number         // In MB

  // Performance
  enableAnimations: boolean
  preloadImages: boolean
  lazyLoading: boolean
  virtualScrolling: boolean

  // PWA settings
  enableOffline: boolean
  syncOnConnectivity: boolean
  backgroundSync: boolean

  // Development
  debugMode: boolean
  enableExperimentalFeatures: boolean
  crashReporting: boolean
  analyticsEnabled: boolean

  // Security
  sessionTimeout: number         // In minutes
  requireAuth: boolean
  encryptionEnabled: boolean
}
```

### Theme Configuration

```typescript
interface Theme {
  id: string
  name: string
  isDark: boolean

  // Colors
  colors: {
    primary: string
    secondary: string
    background: string
    surface: string
    text: string
    textSecondary: string
    accent: string
    error: string
    warning: string
    success: string
    info: string
  }

  // Typography
  fonts: {
    primary: string
    secondary: string
    monospace: string
  }

  // Spacing
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }

  // Shadows
  shadows: {
    sm: string
    md: string
    lg: string
  }
}

interface CustomTheme extends Theme {
  isCustom: true
  createdAt: Date
  updatedAt: Date
}
```

---

## 🔌 API Schemas

### API Request/Response

```typescript
// Base API response
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  metadata?: {
    requestId: string
    timestamp: Date
    processingTime: number
  }
}

// API error
interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: Date
}

// Pagination request
interface PaginationRequest {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Batch operations
interface BatchRequest<T> {
  operation: 'create' | 'update' | 'delete'
  items: T[]
}

interface BatchResponse<T> {
  successful: T[]
  failed: Array<{
    item: T
    error: ApiError
  }>
  totalProcessed: number
  successCount: number
  failureCount: number
}
```

### Import/Export Schemas

```typescript
// Import formats
type ImportFormat =
  | 'json'
  | 'csv'
  | 'xlsx'
  | 'xml'

// Export formats
type ExportFormat =
  | 'json'
  | 'csv'
  | 'xlsx'
  | 'pdf'

// Import result
interface ImportResult {
  success: boolean
  totalRecords: number
  importedRecords: number
  failedRecords: number
  skippedRecords: number
  errors: ImportError[]
  warnings: ImportWarning[]
}

interface ImportError {
  row: number
  field: string
  value: unknown
  message: string
  code: string
}

interface ImportWarning {
  row: number
  field: string
  value: unknown
  message: string
  code: string
}

// Export options
interface ExportOptions {
  format: ExportFormat
  includePhotos: boolean
  includeBuildLogs: boolean
  includeSettings: boolean
  dateRange?: {
    start: Date
    end: Date
  }
  filters?: KitFilters
}
```

---

## ✅ Validation Rules

### Validation Schema

```typescript
// Validation rule
interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: unknown) => boolean | string
}

// Validation schema
type ValidationSchema<T> = {
  [K in keyof T]: ValidationRule | ValidationSchema<T[K]>
}

// Validation result
interface ValidationResult<T = unknown> {
  isValid: boolean
  data?: T
  errors: ValidationError[]
}

interface ValidationError {
  field: string
  message: string
  value: unknown
  code: string
}
```

### Kit Validation

```typescript
const kitValidationSchema: ValidationSchema<CreateKitInput> = {
  name: {
    required: true,
    minLength: 1,
    maxLength: 200,
    pattern: /^[a-zA-Z0-9\s\-_().]+$/
  },
  grade: {
    required: true,
    custom: (value: unknown) => {
      const validGrades: KitGrade[] = ['HG', 'RG', 'MG', 'PG', 'MGSD', 'RE', 'SD', 'EG', 'Mega Size']
      return validGrades.includes(value as KitGrade) || 'Invalid kit grade'
    }
  },
  series: {
    required: true,
    custom: (value: unknown) => {
      return value && typeof value === 'object' && 'name' in value
        ? true
        : 'Series must be a valid series object'
    }
  },
  scale: {
    required: true,
    custom: (value: unknown) => {
      const validScales: Scale[] = ['1/144', '1/100', '1/60', '1/48', '1/35', 'Non Scale', 'Other']
      return validScales.includes(value as Scale) || 'Invalid scale'
    }
  },
  manufacturer: {
    required: true,
    custom: (value: unknown) => {
      const validManufacturers: Manufacturer[] = ['Bandai', 'Kotobukiya', 'Dragon Momoko', 'Daban', 'Other']
      return validManufacturers.includes(value as Manufacturer) || 'Invalid manufacturer'
    }
  },
  price: {
    min: 0,
    max: 1000000,
    custom: (value: unknown) => {
      return value === undefined || (typeof value === 'number' && value >= 0)
        ? true
        : 'Price must be a positive number'
    }
  },
  tags: {
    custom: (value: unknown) => {
      return Array.isArray(value) && value.every(tag => typeof tag === 'string' && tag.length > 0)
        ? true
        : 'Tags must be an array of non-empty strings'
    }
  }
}
```

### Photo Validation

```typescript
const photoValidationSchema: ValidationSchema<CreatePhotoInput> = {
  file: {
    required: true,
    custom: (value: unknown) => {
      if (!(value instanceof File)) {
        return 'Must be a file'
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      const maxSize = 10 * 1024 * 1024 // 10MB

      if (!validTypes.includes(value.type)) {
        return 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed'
      }

      if (value.size > maxSize) {
        return 'File size too large. Maximum size is 10MB'
      }

      return true
    }
  },
  title: {
    maxLength: 200
  },
  description: {
    maxLength: 1000
  },
  type: {
    custom: (value: unknown) => {
      const validTypes: PhotoType[] = ['box_art', 'build_progress', 'completed', 'detail_shot', 'comparison', 'custom', 'other']
      return validTypes.includes(value as PhotoType) || 'Invalid photo type'
    }
  }
}
```

---

## 🔗 Related Documentation

- [API Overview](./api-overview.md) - High-level API architecture
- [Storage APIs](./storage-apis.md) - IndexedDB and storage layer details
- [Client-Side APIs](./client-apis.md) - Browser API integrations
- [Validation Guide](../guides/validation.md) - Custom validation strategies

---

**Last Updated**: 2025-12-04
**Version**: 1.0.0