import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
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
  Breadcrumbs,
  Anchor,
  Pagination,
  TextInput,
  Select,
  Button,
  Skeleton,
} from '@mantine/core';
import {
  IconSearch,
  IconFilter,
  IconChevronRight,
  IconHome,
  IconFolder,
} from '@tabler/icons-react';
import { getAllCategories, getAllItems } from '@/lib/graph-data';
import { getNodeDisplayName, isItemNode } from '@/lib/schemas';
import * as styles from '@/styles/components.css';

// Static data fetching
interface PageProps {
  params: { id: string };
  searchParams: { page?: string; q?: string; sort?: string; brand?: string };
}

const getCategory = async (categoryId: string) => {
  try {
    const categories = await getAllCategories();
    return categories.find(cat => cat.id === categoryId) || null;
  } catch (error) {
    console.error('Failed to load category:', error);
    return null;
  }
};

const getCategoryItems = async (
  categoryId: string,
  page: number = 1,
  limit: number = 24,
  searchQuery?: string,
  sortBy?: string,
  brandFilter?: string
) => {
  try {
    const [items, category] = await Promise.all([
      getAllItems(),
      getCategory(categoryId),
    ]);

    if (!category) {
      return { items: [], total: 0, category: null };
    }

    // Filter items by category
    let filteredItems = items.filter(item =>
      isItemNode(item) && item.category === categoryId
    );

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredItems = filteredItems.filter(item => {
        if (!isItemNode(item)) return false;
        const name = getNodeDisplayName(item).toLowerCase();
        const brand = item.brand?.toLowerCase() || '';
        const series = item.series?.toLowerCase() || '';
        const grade = item.grade?.toLowerCase() || '';
        return name.includes(query) || brand.includes(query) || series.includes(query) || grade.includes(query);
      });
    }

    // Apply brand filter
    if (brandFilter) {
      filteredItems = filteredItems.filter(item =>
        isItemNode(item) && item.brand === brandFilter
      );
    }

    // Apply sorting
    if (sortBy) {
      switch (sortBy) {
        case 'name-asc':
          filteredItems.sort((a, b) => getNodeDisplayName(a).localeCompare(getNodeDisplayName(b)));
          break;
        case 'name-desc':
          filteredItems.sort((a, b) => getNodeDisplayName(b).localeCompare(getNodeDisplayName(a)));
          break;
        case 'date-asc':
          filteredItems.sort((a, b) => (a.created || '').localeCompare(b.created || ''));
          break;
        case 'date-desc':
          filteredItems.sort((a, b) => (b.created || '').localeCompare(a.created || ''));
          break;
        default:
          // Default: keep original order
          break;
      }
    }

    const total = filteredItems.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems.filter(isItemNode),
      total,
      category,
    };
  } catch (error) {
    console.error('Failed to load category items:', error);
    return { items: [], total: 0, category: null };
  }
};

const getAvailableBrands = async (categoryId: string) => {
  try {
    const items = await getAllItems();
    const brands = new Set<string>();

    items.filter(item => isItemNode(item) && item.category === categoryId)
      .forEach(item => {
        if (item.brand && isItemNode(item)) {
          brands.add(item.brand);
        }
      });

    return Array.from(brands).sort();
  } catch (error) {
    console.error('Failed to load brands:', error);
    return [];
  }
};

// Item card component
function ItemCard({ item }: { item: any }) {
  if (!isItemNode(item)) return null;

  return (
    <Card
      component={Link}
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

// Loading skeleton component
function LoadingGrid() {
  return (
    <SimpleGrid
      cols={4}
      spacing="md"
      breakpoints={[
        { maxWidth: 'lg', cols: 3, spacing: 'sm' },
        { maxWidth: 'md', cols: 2, spacing: 'sm' },
        { maxWidth: 'sm', cols: 1, spacing: 'sm' },
      ]}
    >
      {[...Array(12)].map((_, index) => (
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
  );
}

// Main page component
export default async function CategoryPage({ params, searchParams }: PageProps) {
  const page = parseInt(searchParams.page || '1', 10);
  const searchQuery = searchParams.q;
  const sortBy = searchParams.sort || 'date-desc';
  const brandFilter = searchParams.brand;

  const [itemsData, availableBrands] = await Promise.all([
    getCategoryItems(params.id, page, 24, searchQuery, sortBy, brandFilter),
    getAvailableBrands(params.id),
  ]);

  if (!itemsData.category) {
    notFound();
  }

  const totalPages = Math.ceil(itemsData.total / 24);

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Breadcrumbs */}
        <Breadcrumbs>
          <Anchor href="/" size="sm">
            <Group gap={4}>
              <IconHome size={14} />
              Home
            </Group>
          </Anchor>
          <Anchor href="/database" size="sm">
            Database
          </Anchor>
          <Anchor href="/categories" size="sm">
            Categories
          </Anchor>
          <Anchor href={`/category/${params.id}`} size="sm">
            {getNodeDisplayName(itemsData.category)}
          </Anchor>
        </Breadcrumbs>

        {/* Header */}
        <Box>
          <Group justify="space-between" align="flex-start">
            <Box>
              <Title order={1} mb="sm">
                {getNodeDisplayName(itemsData.category)}
              </Title>
              <Text size="lg" color="dimmed">
                {itemsData.total.toLocaleString()} items in this category
              </Text>
            </Box>
            <Badge size="lg" variant="light">
              Category
            </Badge>
          </Group>
        </Box>

        {/* Search and Filters */}
        <Card p="lg" radius="md" withBorder>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                leftSection={<IconSearch size={16} />}
                placeholder={`Search ${getNodeDisplayName(itemsData.category)}...`}
                value={searchQuery || ''}
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  if (e.target.value) {
                    url.searchParams.set('q', e.target.value);
                  } else {
                    url.searchParams.delete('q');
                  }
                  url.searchParams.delete('page');
                  window.location.href = url.toString();
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                leftSection={<IconFilter size={16} />}
                placeholder="Filter by brand"
                data={[
                  { value: '', label: 'All Brands' },
                  ...availableBrands.map(brand => ({ value: brand, label: brand })),
                ]}
                value={brandFilter || ''}
                onChange={(value) => {
                  const url = new URL(window.location.href);
                  if (value) {
                    url.searchParams.set('brand', value);
                  } else {
                    url.searchParams.delete('brand');
                  }
                  url.searchParams.delete('page');
                  window.location.href = url.toString();
                }}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                placeholder="Sort by"
                data={[
                  { value: 'date-desc', label: 'Latest First' },
                  { value: 'date-asc', label: 'Oldest First' },
                  { value: 'name-asc', label: 'Name (A-Z)' },
                  { value: 'name-desc', label: 'Name (Z-A)' },
                ]}
                value={sortBy}
                onChange={(value) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('sort', value || 'date-desc');
                  window.location.href = url.toString();
                }}
              />
            </Grid.Col>
          </Grid>
        </Card>

        {/* Results */}
        <Box>
          <Group justify="space-between" mb="md">
            <Text size="sm" color="dimmed">
              Showing {Math.min((page - 1) * 24 + 1, itemsData.total)}-{Math.min(page * 24, itemsData.total)} of {itemsData.total.toLocaleString()} items
            </Text>
            {(searchQuery || brandFilter) && (
              <Button
                variant="light"
                size="sm"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('q');
                  url.searchParams.delete('brand');
                  url.searchParams.delete('page');
                  window.location.href = url.toString();
                }}
              >
                Clear Filters
              </Button>
            )}
          </Group>

          {itemsData.items.length > 0 ? (
            <SimpleGrid
              cols={4}
              spacing="md"
              breakpoints={[
                { maxWidth: 'lg', cols: 3, spacing: 'sm' },
                { maxWidth: 'md', cols: 2, spacing: 'sm' },
                { maxWidth: 'sm', cols: 1, spacing: 'sm' },
              ]}
            >
              {itemsData.items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </SimpleGrid>
          ) : (
            <Box ta="center" py="xl">
              <IconFolder size={64} color="var(--mantine-color-gray-4)" />
              <Title order={3} mt="md" mb="sm">
                No items found
              </Title>
              <Text color="dimmed" mb="lg">
                {searchQuery || brandFilter
                  ? 'Try adjusting your search or filters'
                  : 'There are no items in this category yet.'
                }
              </Text>
              {(searchQuery || brandFilter) && (
                <Button
                  variant="light"
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('q');
                    url.searchParams.delete('brand');
                    url.searchParams.delete('page');
                    window.location.href = url.toString();
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </Box>
          )}
        </Box>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box>
            <Pagination
              total={totalPages}
              value={page}
              onChange={(newPage) => {
                const url = new URL(window.location.href);
                url.searchParams.set('page', newPage.toString());
                window.location.href = url.toString();
              }}
              siblings={1}
              boundaries={2}
            />
          </Box>
        )}
      </Stack>
    </Container>
  );
}

// Generate static params for popular categories
export async function generateStaticParams() {
  try {
    const categories = await getAllCategories();
    // Generate static params for top 20 categories
    return categories.slice(0, 20).map((category) => ({
      id: category.id,
    }));
  } catch (error) {
    console.error('Failed to generate static params:', error);
    return [];
  }
}