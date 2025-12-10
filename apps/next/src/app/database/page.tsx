"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  Flex,
  Group,
  Input,
  LoadingOverlay,
  Modal,
  NumberInput,
  Pagination,
  Paper,
  Progress,
  RangeSlider,
  ScrollArea,
  Select,
  SimpleGrid,
  Skeleton,
  Space,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
  Collapse,
  ActionIcon,
} from "@mantine/core";
import {
  IconBookmark,
  IconBookmarkOff,
  IconChartBar,
  IconChartPie,
  IconChevronDown,
  IconChevronUp,
  IconDownload,
  IconFilter,
  IconGridDots,
  IconLayoutList,
  IconRefresh,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconTable,
  IconX,
} from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import Link from "next/link";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

import { PAGINATION, TYPOGRAPHY, UI } from "@/lib/constants";
import { getAllBrands, getAllCategories, getAllItems, getAllSeries } from "@/lib/graph-data";
import { BaseEdge, BrandNode, CategoryNode, ItemNode, getNodeDisplayName, isBaseEdge, SeriesNode } from "@/lib/schemas";
import { useSearch, type SearchResult, type SearchFilters } from "@/lib/fuse-search";
import { ViewSwitcher, useViewMode } from "@/components/view/view-switcher";

// Types
interface DatabaseStats {
  totalItems: number;
  totalBrands: number;
  totalCategories: number;
  totalSeries: number;
  avgPrice: number;
  brands: Array<BrandNode & { itemCount: number }>;
  categories: Array<CategoryNode & { itemCount: number }>;
  series: Array<SeriesNode & { itemCount: number }>;
}

interface SortOption {
  key: string;
  label: string;
  field: keyof ItemNode | string;
}

interface QuickFilter {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  filters: Partial<SearchFilters>;
  color?: string;
}

// Colors for charts
const CHART_COLORS = [
  "#339af0", "#51cf66", "#ff6b6b", "#f59f00", "#7950f2",
  "#15aabf", "#e64980", "#228be6", "#40c057", "#ff8787",
  "#fab005", "#845ef7", "#12b886", "#f06595", "#1c7ed6"
];

// Sort options
const SORT_OPTIONS: SortOption[] = [
  { key: "name-asc", label: "Name (A-Z)", field: "name" },
  { key: "name-desc", label: "Name (Z-A)", field: "name" },
  { key: "price-asc", label: "Price (Low to High)", field: "price" },
  { key: "price-desc", label: "Price (High to Low)", field: "price" },
  { key: "year-desc", label: "Year (Newest)", field: "releaseDate" },
  { key: "year-asc", label: "Year (Oldest)", field: "releaseDate" },
  { key: "brand", label: "Brand", field: "brand" },
  { key: "category", label: "Category", field: "category" },
];

// Quick filter presets
const QUICK_FILTERS: QuickFilter[] = [
  {
    id: "latest",
    label: "Latest Releases",
    icon: IconChevronUp,
    filters: { minYear: 2023, maxYear: 2024 },
    color: "blue",
  },
  {
    id: "premium",
    label: "Premium Models (¥10k+)",
    icon: IconChartBar,
    filters: { minPrice: 10000 },
    color: "yellow",
  },
  {
    id: "budget",
    label: "Budget Friendly (¥3k-)",
    icon: IconChartPie,
    filters: { maxPrice: 3000 },
    color: "green",
  },
  {
    id: "mg",
    label: "Master Grade",
    icon: IconGridDots,
    filters: { grades: ["MG"] },
    color: "red",
  },
  {
    id: "rg",
    label: "Real Grade",
    icon: IconLayoutList,
    filters: { grades: ["RG"] },
    color: "blue",
  },
  {
    id: "pg",
    label: "Perfect Grade",
    icon: IconTable,
    filters: { grades: ["PG"] },
    color: "purple",
  },
];

// Main component
export default function DatabasePage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [items, setItems] = useState<ItemNode[]>([]);
  const [filteredItems, setFilteredItems] = useState<ItemNode[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // View and pagination
  const { viewMode, setViewMode } = useViewMode("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  // Filters and sorting
  const [showFilters, setShowFilters] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    brands: [],
    categories: [],
    series: [],
    grades: [],
    scales: [],
    minPrice: 0,
    maxPrice: 100000,
    minYear: 1980,
    maxYear: 2024,
  });
  const [sortBy, setSortBy] = useState<SortOption>(SORT_OPTIONS[0]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);

  const { advancedSearch, getStats } = useSearch();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [allItems, allBrands, allCategories, allSeries] = await Promise.all([
          getAllItems(),
          getAllBrands(),
          getAllCategories(),
          getAllSeries(),
        ]);

        // Process brands with counts
        const brandsWithCounts = allBrands.map(brand => {
          const itemCount = allItems.filter(item =>
            item.edges?.outbound?.some((edge): edge is BaseEdge =>
              isBaseEdge(edge) && edge.target === brand.id
            )
          ).length;
          return { ...brand, itemCount };
        });

        // Process categories with counts
        const categoriesWithCounts = allCategories.map(category => {
          const itemCount = allItems.filter(item =>
            item.edges?.outbound?.some((edge): edge is BaseEdge =>
              isBaseEdge(edge) && edge.target === category.id
            )
          ).length;
          return { ...category, itemCount };
        });

        // Process series with counts
        const seriesWithCounts = allSeries.map(seriesItem => {
          const itemCount = allItems.filter(item =>
            item.edges?.outbound?.some((edge): edge is BaseEdge =>
              isBaseEdge(edge) && edge.target === seriesItem.id
            )
          ).length;
          return { ...seriesItem, itemCount };
        });

        // Calculate average price
        const itemsWithPrice = allItems.filter(item =>
          item.metadata && typeof item.metadata.price === 'number'
        );
        const avgPrice = itemsWithPrice.length > 0
          ? itemsWithPrice.reduce((sum, item) => sum + ((item.metadata?.price as number) || 0), 0) / itemsWithPrice.length
          : 0;

        setStats({
          totalItems: allItems.length,
          totalBrands: allBrands.length,
          totalCategories: allCategories.length,
          totalSeries: allSeries.length,
          avgPrice: Math.round(avgPrice),
          brands: brandsWithCounts.sort((a, b) => b.itemCount - a.itemCount).slice(0, 10),
          categories: categoriesWithCounts.sort((a, b) => b.itemCount - a.itemCount).slice(0, 10),
          series: seriesWithCounts.sort((a, b) => b.itemCount - a.itemCount).slice(0, 10),
        });

        setItems(allItems);
        setFilteredItems(allItems);
      } catch (error) {
        console.error("Failed to load database:", error);
        showNotification({
          title: "Error",
          message: "Failed to load database data",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("database-favorites");
    if (saved) {
      try {
        setFavorites(new Set(JSON.parse(saved)));
      } catch (error) {
        console.error("Failed to load favorites:", error);
      }
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = useCallback((newFavorites: Set<string>) => {
    localStorage.setItem("database-favorites", JSON.stringify(Array.from(newFavorites)));
    setFavorites(newFavorites);
  }, []);

  // Search and filter
  const applyFilters = useCallback(() => {
    if (!items.length) return;

    setSearchLoading(true);
    try {
      let results = items;

      // Apply search query if provided
      if (searchQuery.trim()) {
        const searchResults = advancedSearch(searchQuery, filters);
        results = searchResults.map(r => r.item);
      } else {
        // Apply filters without search
        if (filters.brands?.length ||
            filters.categories?.length ||
            filters.series?.length ||
            filters.grades?.length ||
            filters.scales?.length ||
            filters.minPrice ||
            (filters.maxPrice && filters.maxPrice < 100000) ||
            (filters.minYear && filters.minYear > 1980) ||
            (filters.maxYear && filters.maxYear < 2024)) {
          const searchResults = advancedSearch("", filters);
          results = searchResults.map(r => r.item);
        }
      }

      // Apply sorting
      results = [...results].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        // Extract values based on sort field
        if (sortBy.field === "name") {
          aValue = getNodeDisplayName(a);
          bValue = getNodeDisplayName(b);
        } else if (sortBy.field === "price") {
          aValue = a.metadata?.price || 0;
          bValue = b.metadata?.price || 0;
        } else if (sortBy.field === "releaseDate") {
          aValue = a.metadata?.releaseDate || "";
          bValue = b.metadata?.releaseDate || "";
        } else {
          aValue = getNodeDisplayName(a);
          bValue = getNodeDisplayName(b);
        }

        // Compare values
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortOrder === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
        }

        return 0;
      });

      setFilteredItems(results);
      setCurrentPage(1);
    } catch (error) {
      console.error("Failed to apply filters:", error);
      showNotification({
        title: "Error",
        message: "Failed to apply filters",
        color: "red",
      });
    } finally {
      setSearchLoading(false);
    }
  }, [items, searchQuery, filters, sortBy, sortOrder, advancedSearch]);

  // Auto-apply filters when dependencies change
  useEffect(() => {
    const timeoutId = setTimeout(applyFilters, 300);
    return () => clearTimeout(timeoutId);
  }, [applyFilters]);

  // Toggle favorite
  const toggleFavorite = useCallback((itemId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(itemId)) {
      newFavorites.delete(itemId);
      showNotification({
        title: "Removed from favorites",
        message: "Item removed from your favorites",
        color: "gray",
      });
    } else {
      newFavorites.add(itemId);
      showNotification({
        title: "Added to favorites",
        message: "Item added to your favorites",
        color: "green",
      });
    }
    saveFavorites(newFavorites);
  }, [favorites, saveFavorites]);

  // Export functionality
  const exportData = useCallback((format: "csv" | "json") => {
    try {
      const dataToExport = filteredItems.map(item => ({
        id: item.id,
        name: getNodeDisplayName(item),
        brand: item.metadata?.brand || "",
        category: item.metadata?.category || "",
        series: item.metadata?.series || "",
        grade: item.metadata?.grade || "",
        scale: item.metadata?.scale || "",
        price: item.metadata?.price || "",
        releaseDate: item.metadata?.releaseDate || "",
        url: item.sourceUrl || "",
      }));

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === "csv") {
        const headers = Object.keys(dataToExport[0] || {});
        const csvContent = [
          headers.join(","),
          ...dataToExport.map(row =>
            headers.map(header => {
              const value = String(row[header as keyof typeof row] || "");
              return value.includes(",") ? `"${value.replace(/"/g, '""')}"` : value;
            }).join(",")
          )
        ].join("\n");

        content = csvContent;
        filename = `database-export-${new Date().toISOString().split("T")[0]}.csv`;
        mimeType = "text/csv";
      } else {
        content = JSON.stringify(dataToExport, null, 2);
        filename = `database-export-${new Date().toISOString().split("T")[0]}.json`;
        mimeType = "application/json";
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification({
        title: "Export successful",
        message: `Exported ${dataToExport.length} items as ${format.toUpperCase()}`,
        color: "green",
      });
    } catch (error) {
      console.error("Export failed:", error);
      showNotification({
        title: "Export failed",
        message: "Failed to export data",
        color: "red",
      });
    }
  }, [filteredItems]);

  // Apply quick filter
  const applyQuickFilter = useCallback((quickFilter: QuickFilter) => {
    setFilters(prev => ({ ...prev, ...quickFilter.filters }));
    setShowFilters(true);
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setFilters({
      brands: [],
      categories: [],
      series: [],
      grades: [],
      scales: [],
      minPrice: 0,
      maxPrice: 100000,
      minYear: 1980,
      maxYear: 2024,
    });
    setSortBy(SORT_OPTIONS[0]);
    setSortOrder("asc");
  }, []);

  // Get paginated items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  // Prepare chart data
  const brandChartData = useMemo(() =>
    stats?.brands.slice(0, 5).map(brand => ({
      name: getNodeDisplayName(brand),
      value: brand.itemCount,
    })) || [], [stats]);

  const categoryChartData = useMemo(() =>
    stats?.categories.slice(0, 5).map(category => ({
      name: getNodeDisplayName(category),
      value: category.itemCount,
    })) || [], [stats]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <LoadingOverlay visible={true} />
        <Stack gap="xl">
          <Skeleton height={60} />
          <SimpleGrid cols={4} spacing="md">
            {[...Array(8)].map((_, i) => <Card key={i} p="lg"><Skeleton height={120} /></Card>)}
          </SimpleGrid>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Title order={1} mb="sm">
            Hobby Database
          </Title>
          <Text size="lg" c="dimmed">
            Professional database exploration with advanced filtering and analytics
          </Text>
        </Box>

        {/* Stats Dashboard */}
        {stats && (
          <Card p="lg" radius="md" withBorder>
            <Title order={3} mb="md">Database Overview</Title>
            <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
              <Box ta="center">
                <Text size="2xl" fw="bold" c="blue">
                  {stats.totalItems.toLocaleString()}
                </Text>
                <Text size="sm" c="dimmed">Total Items</Text>
              </Box>
              <Box ta="center">
                <Text size="2xl" fw="bold" c="green">
                  {stats.totalBrands}
                </Text>
                <Text size="sm" c="dimmed">Brands</Text>
              </Box>
              <Box ta="center">
                <Text size="2xl" fw="bold" c="orange">
                  {stats.totalCategories}
                </Text>
                <Text size="sm" c="dimmed">Categories</Text>
              </Box>
              <Box ta="center">
                <Text size="2xl" fw="bold" c="purple">
                  {stats.totalSeries}
                </Text>
                <Text size="sm" c="dimmed">Series</Text>
              </Box>
              <Box ta="center">
                <Text size="2xl" fw="bold" c="red">
                  ¥{stats.avgPrice.toLocaleString()}
                </Text>
                <Text size="sm" c="dimmed">Avg Price</Text>
              </Box>
            </SimpleGrid>
          </Card>
        )}

        {/* Quick Filters */}
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between" mb="sm">
            <Text size="sm" fw="bold">Quick Filters</Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={clearAllFilters}
              leftSection={<IconX size={12} />}
            >
              Clear All
            </Button>
          </Group>
          <Group gap="xs" wrap="wrap">
            {QUICK_FILTERS.map((filter) => (
              <Button
                key={filter.id}
                variant="light"
                size="sm"
                color={filter.color as any}
                leftSection={<filter.icon size={14} />}
                onClick={() => applyQuickFilter(filter)}
              >
                {filter.label}
              </Button>
            ))}
          </Group>
        </Card>

        <Flex gap="lg" direction={{ base: "column", lg: "row" }}>
          {/* Filters Sidebar */}
          <Card
            p="md"
            radius="md"
            withBorder
            w={{ base: "100%", lg: 300 }}
            style={{ flexShrink: 0 }}
          >
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" fw="bold">Filters</Text>
                <ActionIcon
                  variant="light"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
                </ActionIcon>
              </Group>

              <Collapse in={showFilters}>
                <Stack gap="md">
                  {/* Search */}
                  <TextInput
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    leftSection={<IconSearch size={14} />}
                    size="sm"
                  />

                  {/* Brands */}
                  {stats && (
                    <Select
                      label="Brand"
                      placeholder="Select brand"
                      data={[
                        { value: "", label: "All brands" },
                        ...stats.brands.map(brand => ({
                          value: brand.id,
                          label: `${getNodeDisplayName(brand)} (${brand.itemCount})`,
                        }))
                      ]}
                      value={filters.brands?.[0] || ""}
                      onChange={(value) => setFilters(prev => ({
                        ...prev,
                        brands: value ? [value] : [],
                      }))}
                      searchable
                      clearable
                      size="sm"
                    />
                  )}

                  {/* Categories */}
                  {stats && (
                    <Select
                      label="Category"
                      placeholder="Select category"
                      data={[
                        { value: "", label: "All categories" },
                        ...stats.categories.map(category => ({
                          value: category.id,
                          label: `${getNodeDisplayName(category)} (${category.itemCount})`,
                        }))
                      ]}
                      value={filters.categories?.[0] || ""}
                      onChange={(value) => setFilters(prev => ({
                        ...prev,
                        categories: value ? [value] : [],
                      }))}
                      searchable
                      clearable
                      size="sm"
                    />
                  )}

                  {/* Price Range */}
                  <Box>
                    <Text size="xs" mb="xs">Price Range</Text>
                    <RangeSlider
                      min={0}
                      max={100000}
                      step={1000}
                      value={[filters.minPrice || 0, filters.maxPrice || 100000]}
                      onChange={(value) => setFilters(prev => ({
                        ...prev,
                        minPrice: value[0],
                        maxPrice: value[1],
                      }))}
                      size="sm"
                      marks={[
                        { value: 0, label: "¥0" },
                        { value: 50000, label: "¥50k" },
                        { value: 100000, label: "¥100k" },
                      ]}
                    />
                  </Box>

                  {/* Year Range */}
                  <Box>
                    <Text size="xs" mb="xs">Release Year</Text>
                    <RangeSlider
                      min={1980}
                      max={2024}
                      value={[filters.minYear || 1980, filters.maxYear || 2024]}
                      onChange={(value) => setFilters(prev => ({
                        ...prev,
                        minYear: value[0],
                        maxYear: value[1],
                      }))}
                      size="sm"
                      marks={[
                        { value: 1980, label: "1980" },
                        { value: 2000, label: "2000" },
                        { value: 2020, label: "2020" },
                        { value: 2024, label: "2024" },
                      ]}
                    />
                  </Box>
                </Stack>
              </Collapse>
            </Stack>
          </Card>

          {/* Main Content */}
          <Box style={{ flex: 1 }}>
            <Stack gap="md">
              {/* Toolbar */}
              <Group justify="space-between">
                <Group gap="sm">
                  <Text size="sm" c="dimmed">
                    {filteredItems.length.toLocaleString()} items found
                  </Text>
                  {favorites.size > 0 && (
                    <Badge variant="light" color="yellow">
                      {favorites.size} favorites
                    </Badge>
                  )}
                </Group>

                <Group gap="sm">
                  {/* Sort */}
                  <Select
                    placeholder="Sort by"
                    value={sortBy.key}
                    onChange={(value) => {
                      const sort = SORT_OPTIONS.find(s => s.key === value);
                      if (sort) {
                        setSortBy(sort);
                      }
                    }}
                    data={SORT_OPTIONS.map(option => ({
                      value: option.key,
                      label: option.label,
                    }))}
                    size="sm"
                    w={180}
                  />

                  {/* Sort Order */}
                  <ActionIcon
                    variant="light"
                    size="sm"
                    onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                    title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
                  >
                    {sortOrder === "asc" ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />}
                  </ActionIcon>

                  {/* View Switcher */}
                  <ViewSwitcher
                    value={viewMode}
                    onChange={setViewMode}
                    size="sm"
                  />

                  {/* Export */}
                  <Button
                    variant="light"
                    size="sm"
                    leftSection={<IconDownload size={14} />}
                    onClick={() => setShowExportModal(true)}
                  >
                    Export
                  </Button>
                </Group>
              </Group>

              {/* Loading Overlay */}
              <Box pos="relative">
                <LoadingOverlay visible={searchLoading} />

                {/* Results */}
                {viewMode === "grid" && (
                  <SimpleGrid
                    cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
                    spacing="md"
                  >
                    {paginatedItems.map((item) => (
                      <Card
                        key={item.id}
                        component={Link}
                        href={`/item/${item.id}`}
                        p="md"
                        radius="md"
                        withBorder
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <Stack gap="xs">
                          <Group justify="space-between" align="start">
                            <Text size="sm" fw="bold" lineClamp={2}>
                              {getNodeDisplayName(item)}
                            </Text>
                            <ActionIcon
                              variant="light"
                              size="sm"
                              color={favorites.has(item.id) ? "yellow" : "gray"}
                              onClick={(e) => {
                                e.preventDefault();
                                toggleFavorite(item.id);
                              }}
                            >
                              {favorites.has(item.id) ? (
                                <IconBookmark size={12} />
                              ) : (
                                <IconBookmarkOff size={12} />
                              )}
                            </ActionIcon>
                          </Group>

                          <Text size="xs" c="dimmed">
                            {(item.metadata?.brand as string) || ""}
                          </Text>

                          {typeof item.metadata?.price === 'number' && (
                            <Text size="sm" fw="bold" c="green">
                              ¥{item.metadata.price.toLocaleString()}
                            </Text>
                          )}
                        </Stack>
                      </Card>
                    ))}
                  </SimpleGrid>
                )}

                {viewMode === "list" && (
                  <Stack gap="xs">
                    {paginatedItems.map((item) => (
                      <Card
                        key={item.id}
                        component={Link}
                        href={`/item/${item.id}`}
                        p="md"
                        radius="md"
                        withBorder
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <Group justify="space-between">
                          <Box style={{ flex: 1 }}>
                            <Text size="sm" fw="bold">
                              {getNodeDisplayName(item)}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {(item.metadata?.brand as string) || ""} • {(item.metadata?.category as string) || ""}
                            </Text>
                          </Box>

                          <Group gap="sm">
                            {typeof item.metadata?.price === 'number' && (
                              <Text size="sm" fw="bold" c="green">
                                ¥{item.metadata.price.toLocaleString()}
                              </Text>
                            )}
                            <ActionIcon
                              variant="light"
                              size="sm"
                              color={favorites.has(item.id) ? "yellow" : "gray"}
                              onClick={(e) => {
                                e.preventDefault();
                                toggleFavorite(item.id);
                              }}
                            >
                              {favorites.has(item.id) ? (
                                <IconBookmark size={12} />
                              ) : (
                                <IconBookmarkOff size={12} />
                              )}
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                )}

                {viewMode === "table" && (
                  <Card p={0} radius="md" withBorder>
                    <ScrollArea>
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Brand</Table.Th>
                            <Table.Th>Category</Table.Th>
                            <Table.Th>Grade</Table.Th>
                            <Table.Th>Price</Table.Th>
                            <Table.Th>Year</Table.Th>
                            <Table.Th />
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {paginatedItems.map((item) => (
                            <Table.Tr key={item.id}>
                              <Table.Td>
                                <Text
                                  size="sm"
                                  fw="bold"
                                  component={Link}
                                  href={`/item/${item.id}`}
                                  style={{ textDecoration: "none", color: "inherit" }}
                                >
                                  {getNodeDisplayName(item)}
                                </Text>
                              </Table.Td>
                              <Table.Td>{(item.metadata?.brand as string) || ""}</Table.Td>
                              <Table.Td>{(item.metadata?.category as string) || ""}</Table.Td>
                              <Table.Td>{(item.metadata?.grade as string) || ""}</Table.Td>
                              <Table.Td>
                                {typeof item.metadata?.price === 'number' && (
                                  <Text c="green">
                                    ¥{item.metadata.price.toLocaleString()}
                                  </Text>
                                )}
                              </Table.Td>
                              <Table.Td>{(item.metadata?.releaseDate as string) || ""}</Table.Td>
                              <Table.Td>
                                <ActionIcon
                                  variant="light"
                                  size="sm"
                                  color={favorites.has(item.id) ? "yellow" : "gray"}
                                  onClick={() => toggleFavorite(item.id)}
                                >
                                  {favorites.has(item.id) ? (
                                    <IconBookmark size={12} />
                                  ) : (
                                    <IconBookmarkOff size={12} />
                                  )}
                                </ActionIcon>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  </Card>
                )}
              </Box>

              {/* Pagination */}
              {filteredItems.length > itemsPerPage && (
                <Group justify="center" mt="lg">
                  <Pagination
                    total={Math.ceil(filteredItems.length / itemsPerPage)}
                    value={currentPage}
                    onChange={setCurrentPage}
                    size="sm"
                  />
                </Group>
              )}
            </Stack>
          </Box>
        </Flex>

        {/* Charts Section */}
        {stats && brandChartData.length > 0 && (
          <Card p="lg" radius="md" withBorder>
            <Title order={3} mb="md">Data Analytics</Title>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
              {/* Brand Distribution */}
              <Box>
                <Text size="sm" fw="bold" mb="md" ta="center">
                  Top Brands by Item Count
                </Text>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={brandChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {brandChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <Box mt="md">
                  {brandChartData.map((brand, index) => (
                    <Group key={brand.name} gap="xs" mb="xs">
                      <Box
                        w={12}
                        h={12}
                        bg={CHART_COLORS[index % CHART_COLORS.length]}
                        style={{ borderRadius: 2 }}
                      />
                      <Text size="xs">{brand.name}</Text>
                      <Text size="xs" c="dimmed" ml="auto">
                        {brand.value} items
                      </Text>
                    </Group>
                  ))}
                </Box>
              </Box>

              {/* Category Distribution */}
              <Box>
                <Text size="sm" fw="bold" mb="md" ta="center">
                  Top Categories by Item Count
                </Text>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill={CHART_COLORS[0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </SimpleGrid>
          </Card>
        )}

        {/* Export Modal */}
        <Modal
          opened={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="Export Data"
          size="sm"
        >
          <Stack gap="md">
            <Text size="sm">
              Export {filteredItems.length} items in your preferred format
            </Text>

            <Group gap="sm">
              <Button
                variant="light"
                color="blue"
                onClick={() => exportData("json")}
                style={{ flex: 1 }}
              >
                Export as JSON
              </Button>
              <Button
                variant="light"
                color="green"
                onClick={() => exportData("csv")}
                style={{ flex: 1 }}
              >
                Export as CSV
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}