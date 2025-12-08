import React from 'react';
import Link from 'next/link';
import { Title, Text, Badge, Group, Stack, Card, SimpleGrid, Container, Grid, Image, Box } from '@mantine/core';
import { IconFolder, IconBox, IconTag, IconSearch, IconTrendingUp } from '@tabler/icons-react';
import { getAllItems, getAllBrands, getAllCategories, getAllSeries } from '@/lib/graph-data';
import { getNodeDisplayName } from '@/lib/schemas';
import * as styles from '@/styles/components.css';

// Static data fetching
const getDatabaseStats = async () => {
  try {
    const [items, brands, categories, series] = await Promise.all([
      getAllItems(),
      getAllBrands(),
      getAllCategories(),
      getAllSeries(),
    ]);

    return {
      totalItems: items.length,
      totalBrands: brands.length,
      totalCategories: categories.length,
      totalSeries: series.length,
      brands: brands.slice(0, 8), // Show top 8 brands
      categories: categories.slice(0, 12), // Show top 12 categories
      series: series.slice(0, 8), // Show top 8 series
    };
  } catch (error) {
    console.error('Failed to load database stats:', error);
    return {
      totalItems: 0,
      totalBrands: 0,
      totalCategories: 0,
      totalSeries: 0,
      brands: [],
      categories: [],
      series: [],
    };
  }
};

// Component for database statistics
function DatabaseStats({ stats }: { stats: Awaited<ReturnType<typeof getDatabaseStats>> }) {
  return (
    <SimpleGrid
      cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
      spacing={{ base: 'sm', md: 'lg' }}
    >
      <Card p="lg" radius="md" className={styles.statCard}>
        <Group>
          <div className={styles.databaseStatIcon}>
            <IconBox size={24} />
          </div>
          <div>
            <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
              Total Items
            </Text>
            <Text size="lg" fw={500}>
              {stats.totalItems.toLocaleString()}
            </Text>
          </div>
        </Group>
      </Card>

      <Card p="lg" radius="md" className={styles.databaseStatCard}>
        <Group>
          <div className={styles.databaseStatIcon}>
            <IconFolder size={24} />
          </div>
          <div>
            <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
              Brands
            </Text>
            <Text size="lg" fw={500}>
              {stats.totalBrands}
            </Text>
          </div>
        </Group>
      </Card>

      <Card p="lg" radius="md" className={styles.databaseStatCard}>
        <Group>
          <div className={styles.databaseStatIcon}>
            <IconTag size={24} />
          </div>
          <div>
            <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
              Categories
            </Text>
            <Text size="lg" fw={500}>
              {stats.totalCategories}
            </Text>
          </div>
        </Group>
      </Card>

      <Card p="lg" radius="md" className={styles.databaseStatCard}>
        <Group>
          <div className={styles.databaseStatIcon}>
            <IconTrendingUp size={24} />
          </div>
          <div>
            <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
              Series
            </Text>
            <Text size="lg" fw={500}>
              {stats.totalSeries}
            </Text>
          </div>
        </Group>
      </Card>
    </SimpleGrid>
  );
}

// Component for brand grid
function BrandsGrid({ brands }: { brands: Awaited<ReturnType<typeof getDatabaseStats>>['brands'] }) {
  if (!brands.length) return null;

  return (
    <Box>
      <Title order={2} mb="lg">
        Popular Brands
      </Title>
      <SimpleGrid
        cols={4}
        spacing="md"
        breakpoints={[
          { maxWidth: 'md', cols: 3, spacing: 'sm' },
          { maxWidth: 'sm', cols: 2, spacing: 'sm' },
          { maxWidth: 'xs', cols: 1, spacing: 'sm' },
        ]}
      >
        {brands.map((brand) => (
          <Card
            key={brand.id}
            component={Link}
            href={`/brand/${brand.id}`}
            p="md"
            radius="md"
            className={styles.categoryCard}
            withBorder
          >
            <Stack align="center" gap={8}>
              <Box w={60} h={60} className={styles.brandLogo}>
                <Image
                  src={`https://via.placeholder.com/60x60/ffffff/666666?text=${encodeURIComponent(getNodeDisplayName(brand))}`}
                  alt={getNodeDisplayName(brand)}
                  fit="contain"
                  radius="sm"
                  fallbackSrc="https://via.placeholder.com/60x60/f5f5f5/999999?text=Logo"
                />
              </Box>
              <Text size="sm" fw={500} ta="center" lineClamp={2}>
                {getNodeDisplayName(brand)}
              </Text>
              <Badge variant="light" size="xs">
                {brand.itemCount || 0} items
              </Badge>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>

      <Box mt="md" ta="center">
        <Text
          component={Link}
          href="/brands"
          size="sm"
          c="blue"
          td="underline"
        >
          View all brands →
        </Text>
      </Box>
    </Box>
  );
}

// Component for category grid
function CategoriesGrid({ categories }: { categories: Awaited<ReturnType<typeof getDatabaseStats>>['categories'] }) {
  if (!categories.length) return null;

  return (
    <Box>
      <Title order={2} mb="lg">
        Browse Categories
      </Title>
      <SimpleGrid
        cols={4}
        spacing="md"
        breakpoints={[
          { maxWidth: 'lg', cols: 3, spacing: 'sm' },
          { maxWidth: 'md', cols: 3, spacing: 'sm' },
          { maxWidth: 'sm', cols: 2, spacing: 'sm' },
          { maxWidth: 'xs', cols: 1, spacing: 'sm' },
        ]}
      >
        {categories.map((category) => (
          <Card
            key={category.id}
            component={Link}
            href={`/category/${category.id}`}
            p="lg"
            radius="md"
            className={styles.categoryCard}
            withBorder
          >
            <Stack align="center" gap={8}>
              <div className={`${styles.categoryIcon} ${styles[`category-${category.id}`]}`}>
                <IconFolder size={32} />
              </div>
              <Text size="md" fw={500} ta="center" lineClamp={1}>
                {getNodeDisplayName(category)}
              </Text>
              <Badge variant="light" size="xs">
                {category.itemCount || 0} items
              </Badge>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>

      <Box mt="md" ta="center">
        <Text
          component={Link}
          href="/categories"
          size="sm"
          c="blue"
          td="underline"
        >
          View all categories →
        </Text>
      </Box>
    </Box>
  );
}

// Component for series grid
function SeriesGrid({ series }: { series: Awaited<ReturnType<typeof getDatabaseStats>>['series'] }) {
  if (!series.length) return null;

  return (
    <Box>
      <Title order={2} mb="lg">
        Popular Series
      </Title>
      <SimpleGrid
        cols={4}
        spacing="md"
        breakpoints={[
          { maxWidth: 'md', cols: 3, spacing: 'sm' },
          { maxWidth: 'sm', cols: 2, spacing: 'sm' },
          { maxWidth: 'xs', cols: 1, spacing: 'sm' },
        ]}
      >
        {series.map((seriesItem) => (
          <Card
            key={seriesItem.id}
            component={Link}
            href={`/series/${seriesItem.id}`}
            p="md"
            radius="md"
            className={styles.seriesCard}
            withBorder
          >
            <Stack gap={8}>
              <Box h={80} className={styles.seriesImage}>
                <Image
                  src={`https://via.placeholder.com/160x80/f5f5f5/666666?text=${encodeURIComponent(getNodeDisplayName(seriesItem))}`}
                  alt={getNodeDisplayName(seriesItem)}
                  fit="cover"
                  radius="sm"
                  fallbackSrc="https://via.placeholder.com/160x80/e0e0e0/999999?text=Series"
                />
              </Box>
              <div>
                <Text size="sm" fw={500} lineClamp={2}>
                  {getNodeDisplayName(seriesItem)}
                </Text>
                <Badge variant="light" size="xs" mt={4}>
                  {seriesItem.itemCount || 0} items
                </Badge>
              </div>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>

      <Box mt="md" ta="center">
        <Text
          component={Link}
          href="/series"
          size="sm"
          c="blue"
          td="underline"
        >
          View all series →
        </Text>
      </Box>
    </Box>
  );
}

// Main page component
export default async function DatabasePage() {
  const stats = await getDatabaseStats();

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Title order={1} mb="sm">
            Hobby Database
          </Title>
          <Text size="lg" color="dimmed">
            Browse our comprehensive collection of hobby items, including Gundam models, figures, and accessories
          </Text>
        </Box>

        {/* Quick Search */}
        <Card p="lg" radius="md" withBorder>
          <Card
            component={Link}
            href="/search"
            p="md"
            radius="md"
            className={styles.searchCard}
          >
            <Group>
              <IconSearch size={20} />
              <Text>Search the database...</Text>
            </Group>
          </Card>
        </Card>

        {/* Statistics */}
        <DatabaseStats stats={stats} />

        {/* Categories Grid */}
        <CategoriesGrid categories={stats.categories} />

        {/* Brands Grid */}
        <BrandsGrid brands={stats.brands} />

        {/* Series Grid */}
        <SeriesGrid series={stats.series} />

        {/* Quick Actions */}
        <Card p="lg" radius="md" withBorder>
          <Title order={3} mb="md">
            Quick Actions
          </Title>
          <SimpleGrid
            cols={3}
            spacing="md"
            breakpoints={[
              { maxWidth: 'sm', cols: 1, spacing: 'sm' },
            ]}
          >
            <Card
              component={Link}
              href="/items"
              p="md"
              radius="md"
              className={styles.actionCard}
              withBorder
            >
              <Group>
                <IconBox size={20} />
                <Text fw={500}>Browse All Items</Text>
              </Group>
            </Card>

            <Card
              component={Link}
              href="/collection"
              p="md"
              radius="md"
              className={styles.actionCard}
              withBorder
            >
              <Group>
                <IconFolder size={20} />
                <Text fw={500}>My Collection</Text>
              </Group>
            </Card>

            <Card
              component={Link}
              href="/import"
              p="md"
              radius="md"
              className={styles.actionCard}
              withBorder
            >
              <Group>
                <IconTrendingUp size={20} />
                <Text fw={500}>Import Data</Text>
              </Group>
            </Card>
          </SimpleGrid>
        </Card>
      </Stack>
    </Container>
  );
}