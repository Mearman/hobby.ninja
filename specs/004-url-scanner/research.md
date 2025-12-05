# Research Results: URL Validation Scanner

**Date**: 2025-12-05
**Purpose**: Research technical decisions for URL validation scanner implementation

## HTTP Client Selection

### Decision: Node.js Built-in Fetch API

**Rationale**:
- Native to Node.js 18+ (built-in, no external dependency)
- Excellent performance for high-volume requests
- Full TypeScript support
- Zero bundle size impact
- Compatible with existing monorepo toolchain

**Key Features for URL Validation**:
- Native timeout support via AbortController
- Redirect following (default behavior)
- Response header access
- Stream processing capability

**Implementation Considerations**:
```typescript
// Example usage pattern
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch(url, {
    signal: controller.signal,
    redirect: 'follow' // default behavior
  });
  // Process response...
} finally {
  clearTimeout(timeoutId);
}
```

## Data Extraction Viability Detection

### Decision: Multi-layered Static Content Analysis

**Rationale**:
Focus on whether essential Gundam data is available in initial HTML, not whether the page uses JavaScript generally.

**Detection Strategy**:

#### Layer 1: Essential Data Indicators (Static)
- **Product Title**: `<title>`, `og:title`, `h1`, `.product-name` classes
- **Product Description**: `og:description`, meta description, `.product-description` classes
- **Images**: `og:image`, `<img>` tags with product-related alt text
- **SKU/Model**: Pattern matching for HG/MG/PG/RG/SD in content
- **Structured Data**: JSON-LD, microdata with product information

#### Layer 2: Dynamic-Only Indicators (Requires JS)
- **Empty Content Containers**: `<div class="content"></div>` with no children
- **Loading Placeholders**: "Loading...", spinner elements
- **JavaScript Data Sources**: Script tags with JSON data, API endpoints
- **SPA Framework Signals**: Root divs with `data-reactroot`, `ng-app`, etc.

#### Layer 3: Hybrid Detection
- **Partial Static Content**: Some data available statically (title, basic info)
- **Enhanced with JS**: Additional details, images, or interactive elements
- **Classification**: Mark as "static" if essential data (name, SKU) is available

### Accuracy Targets
- **True Static**: Essential Gundam data available in initial HTML
- **False Dynamic**: Page appears dynamic but essential data is static
- **Missed Dynamic**: Essential data requires JS execution

### Bandai-Specific Patterns
Based on analysis of Bandai hobby sites:
- **bandai-hobby.net**: Usually static product pages with complete data
- **manual.bandai-hobby.net**: Mixed - some static, some JavaScript-enhanced
- **p-bandai.com**: Often requires JavaScript for complete product details

## Implementation Heuristics

```typescript
interface DetectionResult {
  hasStaticData: boolean;
  dataType: 'complete' | 'partial' | 'none';
  confidence: number;
  indicators: string[];
}

function detectStaticViability(html: string, headers: Headers): DetectionResult {
  const indicators = [];

  // Check for static product title
  if (html.includes('<title>') && extractTitle(html)) {
    indicators.push('static-title');
  }

  // Check for structured data
  if (html.includes('"@type":"Product"') || html.includes('application/ld+json')) {
    indicators.push('structured-data');
  }

  // Check for empty containers (dynamic indicator)
  if (html.includes('<div class="content"></div>') || html.includes('loading')) {
    indicators.push('dynamic-indicator');
  }

  // Determine classification
  const hasEssentialData = indicators.some(i =>
    ['static-title', 'structured-data', 'static-sku'].includes(i)
  );

  return {
    hasStaticData,
    dataType: hasEssentialData ? 'complete' : 'none',
    confidence: hasEssentialData ? 0.95 : 0.85,
    indicators
  };
}
```

## File Storage Strategy

### Decision: Simple Text Files + JSON Progress

**Output Files**:
- `valid_static_urls.txt`: URLs with essential data in initial HTML
- `valid_dynamic_urls.txt`: URLs requiring JavaScript for essential data
- `invalid_urls.txt`: URLs with errors or no content

**Progress File**: `progress.json` with scan state, last processed URL, and metadata

**Rationale**: Simple, reliable, easily readable, and compatible with constitution's static hosting requirements.

## Performance Considerations

- **Concurrency**: Use Promise.allSettled() for batched requests (10-20 concurrent)
- **Memory**: Stream responses, don't buffer large HTML in memory
- **Rate Limiting**: Implement delays between requests to respect server limits
- **Retry Logic**: Exponential backoff for failed requests