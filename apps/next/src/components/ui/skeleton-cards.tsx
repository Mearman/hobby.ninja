"use client";

import { Card, Grid, SimpleGrid, Skeleton, Stack, Table, Box, Group } from "@mantine/core";
import { ViewMode } from "@/components/view/view-switcher";

interface LoadingSkeletonsProps {
  viewMode: ViewMode;
  itemsPerPage: number;
}

// Individual skeleton card for grid view
function GridSkeletonCard() {
  return (
    <Card p={0} radius="md" withBorder>
      <Skeleton height={200} />
      <Box p="md">
        <Skeleton height={16} width="85%" mb="sm" />
        <Skeleton height={12} width="60%" mb="md" />
        <Group gap="xs">
          <Skeleton height={16} width={40} />
          <Skeleton height={16} width={40} />
          <Skeleton height={16} width={50} />
        </Group>
      </Box>
    </Card>
  );
}

// Skeleton for list view
function ListSkeletonCard() {
  return (
    <Card p="md" radius="md" withBorder>
      <Group gap="md" align="flex-start">
        <Skeleton width={80} height={80} />
        <Box flex={1}>
          <Skeleton height={20} width="70%" mb="sm" />
          <Skeleton height={14} width="50%" mb="md" />
          <Group gap="xs">
            <Skeleton height={20} width={40} />
            <Skeleton height={20} width={40} />
            <Skeleton height={20} width={50} />
          </Group>
        </Box>
      </Group>
    </Card>
  );
}

// Skeleton rows for table view
function TableSkeletonRows({ count }: { count: number }) {
  const rows = Array.from({ length: count }, (_, index) => (
    <Table.Tr key={index}>
      <Table.Td>
        <Skeleton height={16} width={20} />
      </Table.Td>
      <Table.Td>
        <Group gap="sm" align="center">
          <Skeleton width={40} height={40} />
          <Skeleton height={14} width={120} />
        </Group>
      </Table.Td>
      <Table.Td>
        <Skeleton height={14} width={80} />
      </Table.Td>
      <Table.Td>
        <Skeleton height={14} width={60} />
      </Table.Td>
      <Table.Td>
        <Skeleton height={14} width={60} />
      </Table.Td>
      <Table.Td>
        <Skeleton height={14} width={70} />
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Box>
      <Table striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={40}></Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Series</Table.Th>
            <Table.Th>Grade</Table.Th>
            <Table.Th>Scale</Table.Th>
            <Table.Th>Brand</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Box>
  );
}

export function LoadingSkeletons({ viewMode, itemsPerPage }: LoadingSkeletonsProps) {
  const skeletonCount = Math.min(itemsPerPage, 12);

  switch (viewMode) {
    case "grid":
      return (
        <SimpleGrid
          cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
          spacing="md"
        >
          {Array.from({ length: skeletonCount }, (_, index) => (
            <GridSkeletonCard key={index} />
          ))}
        </SimpleGrid>
      );

    case "list":
      return (
        <Stack gap="md">
          {Array.from({ length: skeletonCount }, (_, index) => (
            <ListSkeletonCard key={index} />
          ))}
        </Stack>
      );

    case "table":
      return <TableSkeletonRows count={skeletonCount} />;

    default:
      return null;
  }
}

// Loading skeleton for filters section
export function FilterSkeletons() {
  return (
    <Card p="lg" radius="md" withBorder>
      <Skeleton height={40} mb="md" />
      <Grid>
        <Grid.Col span={{ base: 6, md: 2 }}>
          <Skeleton height={40} />
        </Grid.Col>
        <Grid.Col span={{ base: 6, md: 2 }}>
          <Skeleton height={40} />
        </Grid.Col>
        <Grid.Col span={{ base: 6, md: 2 }}>
          <Skeleton height={40} />
        </Grid.Col>
        <Grid.Col span={{ base: 6, md: 2 }}>
          <Skeleton height={40} />
        </Grid.Col>
      </Grid>
    </Card>
  );
}

// Loading skeleton for item count and stats
export function StatsSkeleton() {
  return (
    <Group gap="md">
      <Skeleton height={24} width={200} />
      <Skeleton height={24} width={100} />
    </Group>
  );
}