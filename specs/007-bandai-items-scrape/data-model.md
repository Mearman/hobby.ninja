# Data Model: Bandai Hobby Catalog Discovery

**Feature**: 007-bandai-items-scrape
**Date**: 2025-12-06

## Core Entities

### CatalogDiscoveryOptions
Configuration for catalog discovery operations.

```typescript
interface CatalogDiscoveryOptions {
  /** Catalog ranges to process (e.g., ["01_1000", "02_1000"]) */
  ranges: string[];

  /** Output directory for scraped items (default: "./data/bandai/items/") */
  outputDir: string;

  /** Enable caching of catalog pages */
  cache: boolean;

  /** Resume from previous discovery session */
  resume: boolean;

  /** Enable verbose logging */
  verbose: boolean;

  /** Delay between requests in milliseconds */
  delayMs: number;
}
```

### CatalogDiscoveryResult
Results from catalog discovery operation.

```typescript
interface CatalogDiscoveryResult {
  /** Total URLs discovered across all ranges */
  discoveredUrls: number;

  /** Total URLs successfully processed */
  processedUrls: number;

  /** Successfully scraped items */
  successful: number;

  /** Failed item scrapes */
  failed: number;

  /** Array of error messages */
  errors: string[];

  /** Total operation duration in milliseconds */
  duration: number;

  /** Catalog ranges processed */
  rangesCompleted: string[];
}
```

### CatalogRange
Represents a single catalog range page.

```typescript
interface CatalogRange {
  /** Range identifier (e.g., "01_1000") */
  id: string;

  /** Full URL to the catalog page */
  url: string;

  /** Current processing status */
  status: 'pending' | 'discovering' | 'completed' | 'failed';

  /** Number of item URLs discovered */
  itemCount: number;

  /** Processing errors if any */
  error?: string;
}
```

## Data Flow

```
CatalogDiscoveryOptions
    ↓
Discover catalog ranges (01_1000, 02_1000, etc.)
    ↓
Extract item URLs from each catalog page
    ↓
BandaiHobbyScraper.processUrls(discoveredUrls)
    ↓
CatalogDiscoveryResult
```

## Integration Points

### Existing Interfaces Used
- `ScrapeOptions` - Extended for catalog discovery mode
- `ScrapeResult` - Reused for compatibility with existing CLI
- `BandaiHobbyScraper` - Existing scraper for processing discovered URLs

### Output Format
- Follows existing `data/bandai/items/[id]/[id].json` structure
- Uses existing `GundamData` type schema
- Maintains compatibility with manual scraper output