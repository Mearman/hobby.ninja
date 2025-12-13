import {
  Box,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import Link from "next/link";

import { getAllBrands, getAllCategories, getAllItems, getAllSeries } from "@/lib/graph-data";
import { type Brand, type Category, type Item, getNodeDisplayName, type Series } from "@hobby-ninja/data";

// Types
interface DatabaseStats {
  totalItems: number;
  totalBrands: number;
  totalCategories: number;
  totalSeries: number;
  avgPrice: number;
  brands: Array<Brand & { itemCount: number }>;
  categories: Array<Category & { itemCount: number }>;
  series: Array<Series & { itemCount: number }>;
  recentItems: Item[];
}

// Calculate database statistics
function calculateStats(
  allItems: Item[],
  allBrands: Brand[],
  allCategories: Category[],
  allSeries: Series[]
): DatabaseStats {
  // Calculate average price
  const itemsWithPrice = allItems.filter(item =>
    item.price && typeof item.price.amount === 'number'
  );
  const avgPrice = itemsWithPrice.length > 0
    ? itemsWithPrice.reduce((sum, item) => sum + (item.price?.amount ?? 0), 0) / itemsWithPrice.length
    : 0;

  // Get top brands by item count
  const brandCounts = new Map<string, number>();
  allItems.forEach(item => {
    for (const brandId of item.brandIds) {
      brandCounts.set(brandId, (brandCounts.get(brandId) || 0) + 1);
    }
  });

  const brandsWithCounts = allBrands
    .map(brand => ({
      ...brand,
      itemCount: brandCounts.get(brand.id) || 0
    }))
    .sort((a, b) => b.itemCount - a.itemCount)
    .slice(0, 10);

  // Get top categories by item count
  const categoryCounts = new Map<string, number>();
  allItems.forEach(item => {
    for (const categoryId of item.categoryIds) {
      categoryCounts.set(categoryId, (categoryCounts.get(categoryId) || 0) + 1);
    }
  });

  const categoriesWithCounts = allCategories
    .map(category => ({
      ...category,
      itemCount: categoryCounts.get(category.id) || 0
    }))
    .sort((a, b) => b.itemCount - a.itemCount)
    .slice(0, 10);

  // Get top series by item count
  const seriesCounts = new Map<string, number>();
  allItems.forEach(item => {
    for (const seriesId of item.seriesIds) {
      seriesCounts.set(seriesId, (seriesCounts.get(seriesId) || 0) + 1);
    }
  });

  const seriesWithCounts = allSeries
    .map(series => ({
      ...series,
      itemCount: seriesCounts.get(series.id) || 0
    }))
    .sort((a, b) => b.itemCount - a.itemCount)
    .slice(0, 10);

  // Get 24 most recent items for preview
  const recentItems = [...allItems].slice(0, 24);

  return {
    totalItems: allItems.length,
    totalBrands: allBrands.length,
    totalCategories: allCategories.length,
    totalSeries: allSeries.length,
    avgPrice: Math.round(avgPrice),
    brands: brandsWithCounts,
    categories: categoriesWithCounts,
    series: seriesWithCounts,
    recentItems,
  };
}

// Server component
export default function DatabasePage() {
  // Load data synchronously on server
  const allItems = getAllItems();
  const allBrands = getAllBrands();
  const allCategories = getAllCategories();
  const allSeries = getAllSeries();

  // Calculate stats
  const stats = calculateStats(allItems, allBrands, allCategories, allSeries);

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Title order={1} mb="sm">
            Database Overview
          </Title>
          <Text size="lg" c="dimmed">
            Static overview of the hobby database with key statistics
          </Text>
        </Box>

        {/* Stats Dashboard */}
        <Card p="lg" radius="md" withBorder>
          <Title order={3} mb="md">Database Statistics</Title>
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

        {/* Top Brands */}
        <Card p="lg" radius="md" withBorder>
          <Title order={3} mb="md">Top Brands</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {stats.brands.slice(0, 6).map((brand) => (
              <Card key={brand.id} p="md" withBorder>
                <Group justify="space-between">
                  <Text size="sm" fw="bold" lineClamp={1}>
                    {getNodeDisplayName(brand)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {brand.itemCount} items
                  </Text>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Card>

        {/* Top Categories */}
        <Card p="lg" radius="md" withBorder>
          <Title order={3} mb="md">Top Categories</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {stats.categories.slice(0, 6).map((category) => (
              <Card key={category.id} p="md" withBorder>
                <Group justify="space-between">
                  <Text size="sm" fw="bold" lineClamp={1}>
                    {getNodeDisplayName(category)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {category.itemCount} items
                  </Text>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Card>

        {/* Top Series */}
        <Card p="lg" radius="md" withBorder>
          <Title order={3} mb="md">Top Series</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {stats.series.slice(0, 6).map((series) => (
              <Card key={series.id} p="md" withBorder>
                <Group justify="space-between">
                  <Text size="sm" fw="bold" lineClamp={1}>
                    {getNodeDisplayName(series)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {series.itemCount} items
                  </Text>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Card>

        {/* Recent Items Preview */}
        <Card p="lg" radius="md" withBorder>
          <Title order={3} mb="md">Recent Items</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
            {stats.recentItems.map((item) => {
              const priceAmount = item.price?.amount;
              return (
                <Link
                  key={item.id}
                  href={`/item/${item.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Card p="md" radius="md" withBorder>
                    <Stack gap="xs">
                      <Text size="sm" fw="bold" lineClamp={2}>
                        {getNodeDisplayName(item)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {item.brandIds.length > 0 ? item.brandIds.join(", ") : ""}
                      </Text>
                      {priceAmount !== undefined && (
                        <Text size="sm" fw="bold" c="green">
                          ¥{priceAmount.toLocaleString()}
                        </Text>
                      )}
                    </Stack>
                  </Card>
                </Link>
              );
            })}
          </SimpleGrid>
        </Card>
      </Stack>
    </Container>
  );
}