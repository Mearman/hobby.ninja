import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
  CSSProperties,
} from 'react';

// Styles using inline CSS
const styles = {
  container: {
    height: '100%',
    overflow: 'auto',
    position: 'relative',
    scrollbarWidth: 'thin',
    scrollbarColor: '#cbd5e1 #f1f5f9',
  } as CSSProperties,
  innerContainer: {
    height: '100%',
    width: '100%',
    position: 'relative',
  } as CSSProperties,
  spacer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '1px',
    pointerEvents: 'none',
  } as CSSProperties,
  item: {
    position: 'absolute',
    left: 0,
    right: 0,
    willChange: 'transform',
  } as CSSProperties,
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    color: '#64748b',
  } as CSSProperties,
  error: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    borderRadius: '4px',
    margin: '10px',
  } as CSSProperties,
};

// Types for the virtualized list
export interface VirtualizedListItem {
  id: string | number;
  [key: string]: any;
}

export interface VirtualizedListProps<T extends VirtualizedListItem> {
  items: T[];
  itemHeight: number | ((index: number, item: T) => number);
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  height: number;
  width?: number | string;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  error?: string | null;
  errorComponent?: React.ReactNode;
  estimatedItemHeight?: number;
  getItemKey?: (item: T, index: number) => string | number;
  onItemsRendered?: (startIndex: number, endIndex: number) => void;
  scrollElement?: HTMLElement | Window | null;
  horizontal?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Ref interface for imperative actions
export interface VirtualizedListRef {
  scrollToIndex: (index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start') => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  getVisibleRange: () => { start: number; end: number } | null;
}

// Main VirtualizedList component
function VirtualizedListComponent<T extends VirtualizedListItem>(
  {
    items,
    itemHeight,
    renderItem,
    height,
    width = '100%',
    overscan = 5,
    onScroll,
    onEndReached,
    endReachedThreshold = 200,
    loading = false,
    loadingComponent,
    error,
    errorComponent,
    estimatedItemHeight = 50,
    getItemKey = (item, index) => item.id || index,
    onItemsRendered,
    scrollElement,
    horizontal = false,
    className,
    style,
  }: VirtualizedListProps<T>,
  ref: React.Ref<VirtualizedListRef>
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const itemHeights = useRef<Map<number, number>>(new Map());
  const itemPositions = useRef<number[]>([]);

  // Calculate item positions memoized
  const { totalHeight, itemPositions: positions } = useMemo(() => {
    let currentHeight = 0;
    const positions: number[] = [0];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const height = typeof itemHeight === 'function'
        ? itemHeight(i, item)
        : itemHeight;

      itemHeights.current.set(i, height);
      currentHeight += height;
      positions.push(currentHeight);
    }

    itemPositions.current = positions;

    return {
      totalHeight: currentHeight,
      itemPositions: positions,
    };
  }, [items, itemHeight]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (!containerSize.height) return { start: 0, end: 0 };

    const start = Math.max(0, Math.floor(scrollTop / estimatedItemHeight) - overscan);
    let end = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerSize.height) / estimatedItemHeight) + overscan
    );

    // Find actual end position using precise heights
    let currentHeight = 0;
    for (let i = start; i <= end && i < items.length; i++) {
      currentHeight += itemHeights.current.get(i) || estimatedItemHeight;
      if (currentHeight > scrollTop + containerSize.height) {
        end = i;
        break;
      }
    }

    return { start, end };
  }, [scrollTop, containerSize.height, items.length, overscan, estimatedItemHeight]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);

    // Trigger end reached callback
    if (
      onEndReached &&
      !loading &&
      newScrollTop + containerSize.height >= totalHeight - endReachedThreshold
    ) {
      onEndReached();
    }
  }, [onScroll, onEndReached, loading, containerSize.height, totalHeight, endReachedThreshold]);

  // Measure container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Notify parent about rendered items
  useEffect(() => {
    onItemsRendered?.(visibleRange.start, visibleRange.end);
  }, [visibleRange, onItemsRendered]);

  // Imperative methods
  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number, align = 'auto') => {
      const container = containerRef.current;
      if (!container || index < 0 || index >= items.length) return;

      const itemPosition = positions[index];
      const itemHeight = itemHeights.current.get(index) || estimatedItemHeight;

      let scrollTopValue: number;

      switch (align) {
        case 'start':
          scrollTopValue = itemPosition;
          break;
        case 'center':
          scrollTopValue = itemPosition - (containerSize.height - itemHeight) / 2;
          break;
        case 'end':
          scrollTopValue = itemPosition - containerSize.height + itemHeight;
          break;
        case 'smart':
        case 'auto':
        default:
          if (itemPosition < scrollTop) {
            scrollTopValue = itemPosition;
          } else if (itemPosition + itemHeight > scrollTop + containerSize.height) {
            scrollTopValue = itemPosition - containerSize.height + itemHeight;
          } else {
            return; // Item is already visible
          }
          break;
      }

      container.scrollTo({
        top: Math.max(0, scrollTopValue),
        behavior: 'smooth',
      });
    },
    scrollToTop: () => {
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    scrollToBottom: () => {
      containerRef.current?.scrollTo({
        top: totalHeight,
        behavior: 'smooth',
      });
    },
    getVisibleRange: () => visibleRange,
  }), [items.length, positions, estimatedItemHeight, scrollTop, containerSize.height, totalHeight, visibleRange]);

  // Render visible items
  const visibleItems = useMemo(() => {
    const itemsToRender = [];

    for (let i = visibleRange.start; i <= visibleRange.end && i < items.length; i++) {
      const item = items[i];
      const key = getItemKey(item, i);
      const top = positions[i];
      const itemHeight = itemHeights.current.get(i) || estimatedItemHeight;

      const itemStyle: React.CSSProperties = {
        position: 'absolute',
        top: horizontal ? 0 : top,
        left: horizontal ? top : 0,
        width: horizontal ? itemHeight : '100%',
        height: horizontal ? '100%' : itemHeight,
      };

      itemsToRender.push(
        <div key={key} style={{...styles.item, ...itemStyle}}>
          {renderItem(item, i, itemStyle)}
        </div>
      );
    }

    return itemsToRender;
  }, [visibleRange, items, positions, estimatedItemHeight, horizontal, getItemKey, renderItem]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...styles.container,
        height,
        width,
        ...style,
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          ...styles.innerContainer,
          height: totalHeight,
          width: horizontal ? totalHeight : '100%',
          position: 'relative',
        }}
      >
        {visibleItems}

        {/* Loading indicator */}
        {loading && loadingComponent && (
          <div style={styles.loading}>
            {loadingComponent}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div style={styles.error}>
            {errorComponent || <span>{error}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// Export with forwardRef for imperative access
export const VirtualizedList = forwardRef(VirtualizedListComponent) as <T extends VirtualizedListItem>(
  props: VirtualizedListProps<T> & { ref?: React.Ref<VirtualizedListRef> }
) => React.ReactElement;

// Hook for infinite loading
export function useInfiniteLoad<T>(
  fetchItems: (page: number) => Promise<T[]>,
  initialItems: T[] = [],
  pageSize = 20
) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const newItems = await fetchItems(page);

      if (newItems.length < pageSize) {
        setHasMore(false);
      }

      setItems(prev => [...prev, ...newItems]);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [fetchItems, loading, hasMore, page, pageSize]);

  const reset = useCallback(() => {
    setItems(initialItems);
    setLoading(false);
    setError(null);
    setHasMore(true);
    setPage(1);
  }, [initialItems]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    reset,
  };
}

// Grid version of virtualized list
export interface VirtualizedGridProps<T extends VirtualizedListItem> extends Omit<VirtualizedListProps<T>, 'itemHeight'> {
  columnCount: number;
  rowHeight: number;
  gap?: number;
}

export function VirtualizedGrid<T extends VirtualizedListItem>({
  items,
  columnCount,
  rowHeight,
  gap = 0,
  renderItem,
  height,
  getItemKey: originalGetItemKey,
  ...props
}: VirtualizedGridProps<T>) {
  const rowCount = Math.ceil(items.length / columnCount);

  // Define row item type
  type RowItem = {
    id: string;
    rowIndex: number;
    items: T[];
  };

  // Transform grid item to list item
  const gridItemHeight = rowHeight;
  const transformedItems: RowItem[] = Array.from({ length: rowCount }, (_, rowIndex) => {
    const startIndex = rowIndex * columnCount;
    const endIndex = Math.min(startIndex + columnCount, items.length);
    return {
      id: `row-${rowIndex}`,
      rowIndex,
      items: items.slice(startIndex, endIndex),
    };
  });

  const renderGridRow = (rowItem: RowItem, index: number, style: React.CSSProperties) => (
    <div style={{ ...style, display: 'flex', gap }}>
      {rowItem.items.map((item: T, itemIndex: number) => (
        <div
          key={originalGetItemKey ? originalGetItemKey(item, index * columnCount + itemIndex) : (item.id || String(index * columnCount + itemIndex))}
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          {renderItem(item, index * columnCount + itemIndex, {})}
        </div>
      ))}
    </div>
  );

  return (
    <VirtualizedList<RowItem>
      items={transformedItems}
      itemHeight={gridItemHeight}
      renderItem={renderGridRow}
      height={height}
      getItemKey={(item: RowItem) => item.id}
      {...props}
    />
  );
}

export default VirtualizedList;