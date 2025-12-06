# CLI API Contract: Bandai Items Catalog Discovery

## Extended CLI Interface

### Command: `gundam-scraper scrape`

#### New Option: `--source bandai-items-catalog`
Enables catalog discovery mode for Bandai hobby items.

#### Additional Options (extend existing CLI)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--ranges` | string | "01_1000,02_1000,03_1000" | Comma-separated catalog ranges to process |
| `--dry-run` | boolean | false | Discover URLs only, don't scrape individual items |

### Input Validation

```typescript
interface CatalogDiscoveryInput {
  source: 'bandai-items-catalog';
  ranges?: string[];           // Parsed from --ranges option
  output?: string;             // Existing --output option
  cache?: boolean;             // Existing --cache option
  resume?: boolean;            // Existing --resume option
  verbose?: boolean;           // Existing --verbose option
  dryRun?: boolean;            // New --dry-run option
  delayMs?: number;            // Existing delay option
}
```

### Output Format

Extends existing `ScrapeResult` interface:

```typescript
interface CatalogScrapeResult extends ScrapeResult {
  // Inherited from ScrapeResult
  totalProcessed: number;
  successful: number;
  failed: number;
  cached: number;
  new: number;
  errors: string[];
  duration: number;

  // Catalog discovery specific
  discoveredUrls: number;      // Total URLs discovered from catalog pages
  rangesProcessed: string[];   // Catalog ranges successfully processed
  catalogPagesTotal: number;   // Total catalog pages visited
}
```

## Processing Flow Contract

### Phase 1: Catalog Discovery
1. Parse catalog ranges from `--ranges` option
2. For each range (e.g., "01_1000"):
   - Construct URL: `https://bandai-hobby.net/item/{range}/`
   - Fetch page using existing BaseScraper infrastructure
   - Extract all item page URLs using link selectors
   - Store discovered URLs in memory/array
3. Return collection of discovered item URLs

### Phase 2: Item Processing
1. Pass discovered URLs to existing `BandaiHobbyScraper`
2. Use existing rate limiting, caching, and retry logic
3. Generate existing `GundamData` output format
4. Save to existing `data/bandai/items/[id]/[id].json` structure

## Error Handling Contract

### Catalog Discovery Errors
- Network timeouts: Log and continue with next range
- Invalid catalog pages: Log error, skip range
- No URLs found: Log warning, continue processing
- Parsing errors: Log error, use fallback selectors

### Item Processing Errors
- Use existing `BandaiHobbyScraper` error handling
- Maintain existing retry logic and fallback behavior
- Preserve existing error reporting format

## Performance Contract

### Rate Limiting
- Catalog pages: Respect existing delay settings (default 2000ms)
- Item pages: Use existing `BandaiRateLimiter` behavior

### Caching
- Catalog pages: Use existing `CacheManager` infrastructure
- Item pages: Existing caching behavior preserved

### Memory Usage
- Store discovered URLs in array during processing
- Stream URLs to scraper to minimize memory footprint
- Clean up catalog page HTML after URL extraction