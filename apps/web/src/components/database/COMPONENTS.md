# Database Components

This directory contains React components for displaying and interacting with the Gundam model database.

## Components

### ItemCard

Individual item display card for the database grid with the following features:

- **Multilingual Support**: Displays names in both Japanese and English
- **Lazy Loading**: Images load only when visible with skeleton loaders
- **Responsive Design**: Adapts to mobile, tablet, and desktop layouts
- **Interactive Elements**: Favorite, share, and selection functionality
- **Source Indicators**: Shows if data comes from catalog, manual, or unified sources
- **Confidence Badges**: Displays match quality for unified items
- **Accessibility**: Full keyboard navigation and ARIA labels

```tsx
import { ItemCard } from "./database";

<ItemCard
	item={item}
	itemType="unified"
	compact={false}
	selected={false}
	onSelect={(id, selected) => console.log(id, selected)}
	viewMode="grid"
	onClick={(item) => console.log(item)}
	loading={false}
/>;
```

### ItemGrid

Virtual scrolling grid for efficiently displaying large datasets (10,000+ items).

- **Virtual Scrolling**: Uses `@tanstack/react-virtual` for performance
- **Responsive Layout**: Adapts column count based on screen size
- **View Modes**: Grid and list view options
- **Sorting**: Sort by name, release date, grade, or relevance
- **Selection**: Bulk selection with select all/clear options
- **Infinite Scroll**: Optional infinite scrolling or pagination
- **Loading States**: Skeleton loaders and loading indicators
- **Error Handling**: Comprehensive error states and retry functionality

```tsx
import { ItemGrid } from "./database";

<ItemGrid
	items={items}
	loading={loading}
	error={error}
	page={1}
	total={1000}
	selectedItems={selectedItems}
	onSelectionChange={setSelectedItems}
	onPageChange={handlePageChange}
	onSortChange={handleSortChange}
	onViewModeChange={setViewMode}
	onItemClick={handleItemClick}
	onRefresh={handleRefresh}
	onFiltersClick={openFilters}
	infiniteScroll={false}
	searchQuery="Gundam"
	showFilters={true}
	compact={false}
/>;
```

### DatabaseDemo

Complete demonstration component showing how to use ItemCard and ItemGrid with the actual data service.

### ComponentTest

Simple test component for development and testing purposes with mock data.

## Data Types

The components work with three main data types:

### UnifiedItem
Items with merged data from multiple sources (catalog + manual):
```tsx
interface UnifiedItem {
  id: string;
  name: { ja?: string; en?: string };
  series?: { ja?: string; en?: string };
  grade?: string;
  scale?: string;
  releaseDate?: { year: number; month?: number; day?: number };
  sources: {
    catalog?: { id: string; confidence: number; linkedAt: string };
    manual?: { id: string; productNumber?: string; confidence: number; linkedAt: string };
  };
  matchMethod: "exact" | "fuzzy" | "manual_override";
  matchStage?: number;
  createdAt: string;
  updatedAt: string;
}
```

### ManualItem
Items from manual data:
```tsx
interface ManualItem {
  id: string;
  title: string;
  metadata: {
    language: "ja" | "en" | "mixed";
    encoding: string;
    extractedAt: string;
  };
  content: {
    blocks: Array<{
      type: string;
      content: { text?: string; ja?: string; src?: string; href?: string };
    }>;
  };
  assets: {
    images: string[];
    links: string[];
  };
}
```

### DatabaseCatalogItem
Items from catalog data:
```tsx
interface DatabaseCatalogItem {
  id: string;
  name: string;
  series?: string;
  grade?: string;
  scale?: string;
  productNumber?: string;
  releaseDate?: { year: number; month?: number; day?: number };
  price?: { amount: number; currency: string };
  images?: string[];
  description?: string;
  status?: "available" | "discontinued" | "preorder";
}
```

## Features

### Virtual Scrolling
- Handles 10,000+ items efficiently
- Only renders visible items
- Configurable overscan for smooth scrolling
- Automatic height estimation

### Responsive Design
- Mobile: 2 columns (grid), single list (list)
- Tablet: 3 columns (grid), single list (list)
- Desktop: 4-5 columns (grid), single list (list)
- Touch-friendly interactions

### Performance Optimizations
- Lazy image loading with Intersection Observer
- Memoized callbacks and computed values
- Efficient re-rendering with React optimization patterns
- Image error handling with fallbacks

### Accessibility
- Full keyboard navigation
- Screen reader support with ARIA labels
- High contrast mode support
- Focus management
- Semantic HTML structure

## Usage

1. **Import Components**
```tsx
import { ItemCard, ItemGrid } from "@/components/database";
import type { UnifiedItem } from "@/services/dataService";
```

2. **Fetch Data**
```tsx
import { dataService } from "@/services/dataService";

const items = await dataService.getUnifiedItems();
// or
const result = await dataService.searchItems(query, filters);
```

3. **Render Components**
```tsx
<ItemGrid
	items={items}
	onItemClick={(item) => navigate(`/items/${item.id}`)}
	onSelect={handleSelection}
	viewMode="grid"
/>;
```

## Dependencies

- `@tanstack/react-virtual`: Virtual scrolling implementation
- `@mantine/core`: UI components and theming
- `@mantine/hooks`: React hooks
- `@tabler/icons-react`: Icon library
- React 18+: Modern React features

## Development

The components are fully typed with TypeScript and follow strict typing conventions. All components are tested for accessibility and performance.

Run the development server to see the components in action:
```bash
pnpm nx serve web
```

The demo page is available at the `/database` route and the test page at `/database/test`.