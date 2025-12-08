import React from 'react';
import {
  Title,
  Text,
  Badge,
  Group,
  Stack,
  Card,
  SimpleGrid,
  Container,
  Grid,
  Image,
  Box,
  TextInput,
  Select,
  MultiSelect,
  Slider,
  Button,
  Divider,
  Collapse,
  Accordion,
  Switch,
  NumberInput,
  ScrollArea,
} from '@mantine/core';
import {
  IconSearch,
  IconFilter,
  IconX,
  IconChevronRight,
  IconAdjustmentsHorizontal,
} from '@tabler/icons-react';
import { useSearch } from '@/hooks/use-search';
import { useUrlState } from '@/hooks/use-url-state';
import { getAllItems, getAllBrands, getAllCategories, getAllSeries } from '@/lib/graph-data';
import { getNodeDisplayName, isItemNode } from '@/lib/schemas';
import * as styles from '@/styles/components.css';

// Static data fetching
const getSearchData = async () => {
  try {
    const [items, brands, categories, series] = await Promise.all([
      getAllItems(),
      getAllBrands(),
      getAllCategories(),
      getAllSeries(),
    ]);

    return {
      items: items.filter(isItemNode),
      brands: brands.map(brand => ({ value: brand.id, label: getNodeDisplayName(brand) })),
      categories: categories.map(cat => ({ value: cat.id, label: getNodeDisplayName(cat) })),
      series: series.map(s => ({ value: s.id, label: getNodeDisplayName(s) })),
      grades: ['HG', 'RG', 'MG', 'PG', 'EG', 'RE', 'Mega Size', 'SD', 'BB', 'HR', 'ME', 'Other'],
      scales: ['1/144', '1/100', '1/60', '1/48', '1/72', '1/550', '1/1000', '1/2000', '1/12', '1/24', 'Other'],
    };
  } catch (error) {
    console.error('Failed to load search data:', error);
    return {
      items: [],
      brands: [],
      categories: [],
      series: [],
      grades: [],
      scales: [],
    };
  }
};

// Search filters interface
interface SearchFilters {
  query: string;
  brands: string[];
  categories: string[];
  series: string[];
  grades: string[];
  scales: string[];
  yearRange: [number, number];
  priceRange: [number, number];
  hasImages: boolean;
  hasManuals: boolean;
  inStock: boolean;
  sortBy: 'relevance' | 'name' | 'date' | 'price' | 'year';
  sortOrder: 'asc' | 'desc';
}

// Item card component
function ItemCard({ item }: { item: any }) {
  if (!isItemNode(item)) return null;

  return (
    <Card
      component="a"
      href={`/item/${item.id}`}
      p={0}
      radius="md"
      className={styles.itemCard}
      withBorder
    >
      <Box className={styles.itemCardImage}>
        <Image
          src={`https://via.placeholder.com/280x200/f5f5f5/666666?text=${encodeURIComponent(getNodeDisplayName(item))}`}
          alt={getNodeDisplayName(item)}
          fit="cover"
          height={200}
          fallbackSrc="https://via.placeholder.com/280x200/e0e0e0/999999?text=No+Image"
        />
      </Box>
      <Box className={styles.itemCardContent}>
        <Text className={styles.itemCardTitle} lineClamp={2}>
          {getNodeDisplayName(item)}
        </Text>
        {item.series && (
          <Text className={styles.itemCardSubtitle} lineClamp={1}>
            {item.series}
          </Text>
        )}
        <Box className={styles.itemCardMetadata}>
          {item.grade && (
            <Badge className={styles.itemCardBadge} variant="light">
              {item.grade}
            </Badge>
          )}
          {item.scale && (
            <Badge className={styles.itemCardBadge} variant="light">
              {item.scale}
            </Badge>
          )}
          {item.brand && (
            <Badge className={styles.itemCardBadge} variant="outline">
              {item.brand}
            </Badge>
          )}
        </Box>
      </Box>
    </Card>
  );
}

// Search form component
function SearchForm({
  filters,
  onFiltersChange,
  searchData,
}: {
  filters: SearchFilters;
  onFiltersChange: (filters: Partial<SearchFilters>) => void;
  searchData: Awaited<ReturnType<typeof getSearchData>>;
}) {
  return (
    <Card p="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group>
          <IconAdjustmentsHorizontal size={20} />
          <Text fw={500}>Advanced Search</Text>
        </Group>
        <Button
          variant="subtle"
          size="sm"
          leftSection={<IconX size={14} />}
          onClick={() => {
            onFiltersChange({
              query: '',
              brands: [],
              categories: [],
              series: [],
              grades: [],
              scales: [],
              yearRange: [1980, 2024],
              priceRange: [0, 50000],
              hasImages: false,
              hasManuals: false,
              inStock: false,
              sortBy: 'relevance',
              sortOrder: 'desc',
            });
          }}
        >
          Clear All
        </Button>
      </Group>

      <Accordion defaultValue={['basics', 'filters']} multiple>
        {/* Basic Search */}
        <Accordion.Item value="basics">
          <Accordion.Control>Basic Search</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <TextInput
                label="Search Query"
                placeholder="Search by name, brand, series, grade..."
                value={filters.query}
                onChange={(e) => onFiltersChange({ query: e.target.value })}
                leftSection={<IconSearch size={16} />}
              />

              <Select
                label="Sort By"
                data={[
                  { value: 'relevance', label: 'Relevance' },
                  { value: 'name', label: 'Name' },
                  { value: 'date', label: 'Date Added' },
                  { value: 'price', label: 'Price' },
                  { value: 'year', label: 'Release Year' },
                ]}
                value={filters.sortBy}
                onChange={(value) => onFiltersChange({ sortBy: value as SearchFilters['sortBy'] })}
              />

              <Group>
                <Switch
                  label="Sort Order"
                  checked={filters.sortOrder === 'desc'}
                  onChange={(e) => onFiltersChange({ sortOrder: e.target.checked ? 'desc' : 'asc' })}
                />
                <Text size="sm" c="dimmed">
                  {filters.sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                </Text>
              </Group>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Category & Brand Filters */}
        <Accordion.Item value="filters">
          <Accordion.Control>Category & Brand</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <MultiSelect
                label="Categories"
                placeholder="Select categories"
                data={searchData.categories}
                value={filters.categories}
                onChange={(value) => onFiltersChange({ categories: value })}
                searchable
                clearable
              />

              <MultiSelect
                label="Brands"
                placeholder="Select brands"
                data={searchData.brands}
                value={filters.brands}
                onChange={(value) => onFiltersChange({ brands: value })}
                searchable
                clearable
              />

              <MultiSelect
                label="Series"
                placeholder="Select series"
                data={searchData.series}
                value={filters.series}
                onChange={(value) => onFiltersChange({ series: value })}
                searchable
                clearable
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Specifications */}
        <Accordion.Item value="specs">
          <Accordion.Control>Specifications</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <MultiSelect
                label="Grades"
                placeholder="Select grades"
                data={searchData.grades.map(grade => ({ value: grade, label: grade }))}
                value={filters.grades}
                onChange={(value) => onFiltersChange({ grades: value })}
                searchable
                clearable
              />

              <MultiSelect
                label="Scales"
                placeholder="Select scales"
                data={searchData.scales.map(scale => ({ value: scale, label: scale }))}
                value={filters.scales}
                onChange={(value) => onFiltersChange({ scales: value })}
                searchable
                clearable
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Price & Year */}
        <Accordion.Item value="range">
          <Accordion.Control>Price & Release Year</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm">Release Year</Text>
                  <Text size="sm" fw={500}>
                    {filters.yearRange[0]} - {filters.yearRange[1]}
                  </Text>
                </Group>
                <Slider
                  min={1980}
                  max={2024}
                  value={filters.yearRange}
                  onChange={(value) => onFiltersChange({ yearRange: value as [number, number] })}
                  marks={[
                    { value: 1980, label: '1980' },
                    { value: 1990, label: '1990' },
                    { value: 2000, label: '2000' },
                    { value: 2010, label: '2010' },
                    { value: 2020, label: '2020' },
                    { value: 2024, label: '2024' },
                  ]}
                />
              </div>

              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm">Price Range (¥)</Text>
                  <Text size="sm" fw={500}>
                    ¥{filters.priceRange[0].toLocaleString()} - ¥{filters.priceRange[1].toLocaleString()}
                  </Text>
                </Group>
                <Slider
                  min={0}
                  max={50000}
                  step={1000}
                  value={filters.priceRange}
                  onChange={(value) => onFiltersChange({ priceRange: value as [number, number] })}
                  marks={[
                    { value: 0, label: '¥0' },
                    { value: 10000, label: '¥10k' },
                    { value: 25000, label: '¥25k' },
                    { value: 50000, label: '¥50k' },
                  ]}
                />
              </div>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Additional Filters */}
        <Accordion.Item value="additional">
          <Accordion.Control>Additional Filters</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Switch
                label="Has Images"
                description="Only show items with images"
                checked={filters.hasImages}
                onChange={(e) => onFiltersChange({ hasImages: e.target.checked })}
              />

              <Switch
                label="Has Manuals"
                description="Only show items with instruction manuals"
                checked={filters.hasManuals}
                onChange={(e) => onFiltersChange({ hasManuals: e.target.checked })}
              />

              <Switch
                label="In Stock"
                description="Only show currently available items"
                checked={filters.inStock}
                onChange={(e) => onFiltersChange({ inStock: e.target.checked })}
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Card>
  );
}

// Main search page
export default async function SearchPage() {
  const searchData = await getSearchData();

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Title order={1} mb="sm">
            Advanced Search
          </Title>
          <Text size="lg" color="dimmed">
            Search through our comprehensive database of hobby items
          </Text>
        </Box>

        <Grid>
          {/* Search Form */}
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <div style={{ position: 'sticky', top: 20 }}>
              <SearchFormWrapper searchData={searchData} />
            </div>
          </Grid.Col>

          {/* Results */}
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <SearchResultsWrapper searchData={searchData} />
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}

// Client-side wrapper for search form
function SearchFormWrapper({ searchData }: { searchData: Awaited<ReturnType<typeof getSearchData>> }) {
  const { state, actions } = useSearch();
  const { updateUrlState } = useUrlState();

  const handleFiltersChange = (newFilters: Partial<SearchFilters>) => {
    actions.setFilters({ ...state.filters, ...newFilters });
    updateUrlState({
      q: newFilters.query || undefined,
      brands: newFilters.brands?.length ? newFilters.brands : undefined,
      categories: newFilters.categories?.length ? newFilters.categories : undefined,
      // ... other filters as needed
    });
  };

  return (
    <SearchForm
      filters={state.filters}
      onFiltersChange={handleFiltersChange}
      searchData={searchData}
    />
  );
}

// Client-side wrapper for search results
function SearchResultsWrapper({ searchData }: { searchData: Awaited<ReturnType<typeof getSearchData>> }) {
  const { state, actions } = useSearch();

  // Perform search when component mounts or filters change
  React.useEffect(() => {
    if (state.filters.query || state.filters.brands.length > 0 || state.filters.categories.length > 0) {
      actions.search(state.filters.query, {
        brands: state.filters.brands,
        categories: state.filters.categories,
        series: state.filters.series,
        grades: state.filters.grades,
        scales: state.filters.scales,
        sortBy: state.filters.sortBy,
        sortOrder: state.filters.sortOrder,
      });
    }
  }, [state.filters]);

  return (
    <Box>
      {/* Results Header */}
      <Group justify="space-between" mb="lg">
        <Box>
          <Text size="lg" fw={500}>
            Search Results
          </Text>
          <Text size="sm" color="dimmed">
            {state.loading
              ? 'Searching...'
              : state.results.length > 0
              ? `Found ${state.results.length} items`
              : 'No items found'
            }
          </Text>
        </Box>

        {state.results.length > 0 && (
          <Select
            w={150}
            data={[
              { value: 'relevance', label: 'Relevance' },
              { value: 'name', label: 'Name' },
              { value: 'date', label: 'Date' },
              { value: 'price', label: 'Price' },
            ]}
            value={state.filters.sortBy}
            onChange={(value) => actions.setFilters({ sortBy: value as any })}
          />
        )}
      </Group>

      {/* Loading State */}
      {state.loading && (
        <div>
          <SimpleGrid
            cols={3}
            spacing="md"
            breakpoints={[
              { maxWidth: 'md', cols: 2, spacing: 'sm' },
              { maxWidth: 'sm', cols: 1, spacing: 'sm' },
            ]}
          >
            {[...Array(9)].map((_, index) => (
              <Card key={index} p={0} radius="md" withBorder>
                <Skeleton height={200} />
                <Box p="md">
                  <Skeleton height={20} mb="xs" />
                  <Skeleton height={16} mb="md" width="60%" />
                  <Group gap="xs">
                    <Skeleton width={40} height={20} radius="sm" />
                    <Skeleton width={50} height={20} radius="sm" />
                  </Group>
                </Box>
              </Card>
            ))}
          </SimpleGrid>
        </div>
      )}

      {/* Results Grid */}
      {!state.loading && state.results.length > 0 && (
        <SimpleGrid
          cols={3}
          spacing="md"
          breakpoints={[
            { maxWidth: 'lg', cols: 2, spacing: 'sm' },
            { maxWidth: 'md', cols: 2, spacing: 'sm' },
            { maxWidth: 'sm', cols: 1, spacing: 'sm' },
          ]}
        >
          {state.results.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </SimpleGrid>
      )}

      {/* No Results */}
      {!state.loading && state.results.length === 0 && state.filters.query && (
        <Box ta="center" py="xl">
          <IconSearch size={64} color="var(--mantine-color-gray-4)" />
          <Title order={3} mt="md" mb="sm">
            No results found
          </Title>
          <Text color="dimmed" mb="lg">
            Try adjusting your search terms or filters
          </Text>
          <Button variant="light" onClick={() => actions.setFilters({ query: '' })}>
            Clear Search
          </Button>
        </Box>
      )}

      {/* Initial State */}
      {!state.loading && state.results.length === 0 && !state.filters.query && (
        <Box ta="center" py="xl">
          <IconSearch size={64} color="var(--mantine-color-gray-4)" />
          <Title order={3} mt="md" mb="sm">
            Start Searching
          </Title>
          <Text color="dimmed">
            Use the filters on the left to search for items
          </Text>
        </Box>
      )}
    </Box>
  );
}