# Quick Start: Bandai Hobby Catalog Discovery

## Overview
Extends the existing Gundam scraper to discover item URLs from Bandai hobby catalog pages and process them with the existing `BandaiHobbyScraper`.

## Prerequisites
- Node.js >= 20.0.0
- pnpm package manager
- Existing monorepo setup

## Usage

### Basic Catalog Discovery
```bash
# Discover and scrape all items from default ranges
gundam-scraper scrape --source bandai-items-catalog

# Specify custom catalog ranges
gundam-scraper scrape --source bandai-items-catalog --ranges "01_1000,02_1000"

# Custom output directory
gundam-scraper scrape --source bandai-items-catalog --output ./my-items/

# Enable verbose logging
gundam-scraper scrape --source bandai-items-catalog --verbose
```

### Advanced Options
```bash
# Resume from previous session
gundam-scraper scrape --source bandai-items-catalog --resume

# Disable caching
gundam-scraper scrape --source bandai-items-catalog --no-cache

# Custom delay between requests (milliseconds)
gundam-scraper scrape --source bandai-items-catalog --delay-ms 3000

# Dry run (discover URLs only, don't scrape)
gundam-scraper scrape --source bandai-items-catalog --dry-run
```

## Output Structure
```
data/bandai/items/
├── 12345/
│   ├── 12345.json          # Item metadata and scraped data
│   └── images/             # Downloaded product images
│       ├── main.jpg
│       ├── package.jpg
│       └── detail-1.jpg
├── 12346/
│   ├── 12346.json
│   └── images/
└── ...
```

## Integration with Existing Infrastructure

### CLI Compatibility
- Uses existing `ScrapeCommand` patterns
- Supports all standard options: `--cache`, `--resume`, `--output`, `--verbose`
- Maintains existing result format and statistics

### Scraper Integration
- Leverages existing `BandaiHobbyScraper` for item processing
- Automatic Playwright fallback for client-side rendered pages
- Uses existing rate limiting and retry logic
- Maintains existing data schema compatibility

### Caching and Resume
- Uses existing `CacheManager` for catalog page caching
- Integrates with existing checkpoint/resume infrastructure
- Preserves existing performance optimization patterns

## Error Handling
- Network timeouts: Automatic retry with exponential backoff
- Missing catalog pages: Logged and skipped
- Invalid item URLs: Filtered and reported
- Rendering issues: Automatic fallback to Playwright

## Performance Considerations
- Default 2-second delay between catalog page requests
- Parallel processing of discovered items (existing behavior)
- Intelligent caching of catalog pages
- Profile-based rendering optimization