# Database Search and Filter Components

A comprehensive set of React components for searching and filtering a hobby database with advanced features like autocomplete, filter presets, and URL sharing.

## Components

### SearchAndFilter

The main search interface with debounced search, autocomplete suggestions, and quick filters.

#### Features
- **Debounced Search**: 300ms delay to prevent excessive API calls
- **Autocomplete Suggestions**: Shows recent searches and intelligent suggestions
- **Search History**: Maintains local search history with localStorage
- **Quick Filters**: Dropdown for common filters (grade, scale, series)
- **Real-time Filter Count**: Badge showing active filter count
- **Multi-source Support**: Filter by data source (unified, manual, catalog)
- **Sorting Options**: Multiple sort criteria with ascending/descending order
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Accessibility**: Full ARIA label support and keyboard navigation

#### Props

```typescript
interface SearchAndFilterProps {
  onSearch: (query: string, filters: FilterOptions) => void;
  onFiltersChange: (filters: FilterOptions) => void;
  loading?: boolean;
  initialQuery?: string;
  initialFilters?: FilterOptions;
  placeholder?: string;
  showAdvancedToggle?: boolean;
  onAdvancedToggle?: () => void;
  className?: string;
}
```

#### Usage Example

```typescript
import { SearchAndFilter } from '@/components/database';
import { useState } from 'react';

function MySearchPage() {
  const [filters, setFilters] = useState({});

  const handleSearch = (query: string, searchFilters) => {
    // Perform search with query and filters
    console.log('Searching:', query, searchFilters);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <SearchAndFilter
      onSearch={handleSearch}
      onFiltersChange={handleFiltersChange}
      loading={false}
      placeholder="Search for Gundam kits..."
      onAdvancedToggle={() => setShowAdvanced(true)}
    />
  );
}
```

### AdvancedFilters

A comprehensive filter modal with preset management and sharing capabilities.

#### Features
- **Filter Presets**: Save, load, and manage custom filter configurations
- **Date Range Filtering**: Filter by release year with range controls
- **Price Range Filtering**: Slider and input controls for price ranges
- **Multi-select Filters**: Support for multiple grades, scales, and series
- **Import/Export**: Save and load filter configurations as JSON files
- **URL Sharing**: Share filters via compressed URL parameters
- **Filter Validation**: Ensures filter combinations are valid
- **Accordion Interface**: Organized filter categories for better UX
- **Active Filter Summary**: Clear display of current filter state

#### Props

```typescript
interface AdvancedFiltersProps {
  opened: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onApply: () => void;
  className?: string;
}
```

#### Usage Example

```typescript
import { AdvancedFilters } from '@/components/database';
import { useState } from 'react';

function MyDatabasePage() {
  const [filters, setFilters] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleApplyFilters = () => {
    // Apply filters and close modal
    setShowAdvanced(false);
    // Trigger search with new filters
  };

  return (
    <>
      {/* Button to open advanced filters */}
      <Button onClick={() => setShowAdvanced(true)}>
        Advanced Filters
      </Button>

      {/* Advanced filters modal */}
      <AdvancedFilters
        opened={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onApply={handleApplyFilters}
      />
    </>
  );
}
```

## Filter Options Interface

```typescript
interface FilterOptions {
  query?: string;
  series?: string[];
  grade?: string[];
  scale?: string[];
  releaseDateRange?: {
    start?: number;
    end?: number;
  };
  availability?: ("available" | "discontinued" | "preorder")[];
  priceRange?: {
    min?: number;
    max?: number;
  };
  sort?: {
    field: "name" | "releaseDate" | "price" | "relevance";
    direction: "asc" | "desc";
  };
  dataSource?: "unified" | "manual" | "catalog";
}
```

## URL Utilities

The package includes utilities for sharing filter configurations via URL:

### Functions

- **compressFilters(filters)**: Compress filter options for URL sharing
- **decompressFilters(compressed)**: Decompress URL-encoded filters
- **buildShareableUrl(baseUrl, query, filters)**: Create shareable URL with filters
- **parseFiltersFromUrl(url)**: Extract filters and query from URL
- **copyShareableUrl(query, filters)**: Copy shareable URL to clipboard
- **getFilterSummary(filters)**: Get human-readable filter summary
- **validateFilters(filters)**: Validate filter configuration

### Usage

```typescript
import { buildShareableUrl, parseFiltersFromUrl } from "@/utils/urlUtils";

// Create shareable URL
const shareUrl = buildShareableUrl(
	"https://example.com/database",
	"Gundam",
	{ grade: ["MG"], scale: ["1/100"] },
);

// Parse filters from URL
const { query, filters } = parseFiltersFromUrl(globalThis.location.href);
```

## Integration with DataService

The components are designed to work seamlessly with the DataService:

```typescript
import { dataService } from "@/services/dataService";

// In your search handler
const handleSearch = async (query: string, filters: FilterOptions) => {
	try {
		const results = await dataService.searchItems(query, filters, {
			maxResults: 50,
			onProgress: (progress) => {
				console.log(`Search progress: ${progress.percentage}%`);
			},
		});
		// Update UI with results
	} catch (error) {
		console.error("Search failed:", error);
	}
};
```

## Styling and Theming

The components use Mantine's theming system and are fully customizable:

```css
/* Custom styles for search components */
.database-search-container {
  /* Your custom styles */
}

.advanced-filters-modal {
  /* Custom modal styles */
}
```

## Accessibility Features

- **ARIA Labels**: All interactive elements have proper ARIA labels
- **Keyboard Navigation**: Full keyboard support for all controls
- **Screen Reader Support**: Compatible with screen readers
- **Focus Management**: Proper focus handling in modals and dropdowns
- **High Contrast**: Supports high contrast mode
- **Text Scaling**: Text scales properly up to 200%

## Performance Optimizations

- **Debounced Search**: Prevents excessive API calls
- **Memoized Components**: React.memo used where appropriate
- **Virtual Scrolling**: For large lists in select components
- **Lazy Loading**: Filter options loaded on demand
- **Caching**: Filter options cached in memory
- **Efficient Rendering**: Optimized re-renders with proper dependencies

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

- React 18+
- Mantine 7+
- TanStack Router
- Tabler Icons

## Contributing

When contributing to these components:

1. Follow the existing code style and patterns
2. Add proper TypeScript types
3. Include accessibility considerations
4. Write tests for new features
5. Update documentation

## License

These components are part of the hobby.ninja project and follow the same license terms.