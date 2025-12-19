"use client";

import { Skeleton, SimpleGrid, Table, Group, Box } from "@mantine/core";

import { UI } from "@/lib/constants";

export interface LoadingSkeletonGridProps {
	count?: number;
	viewMode?: "grid" | "list" | "table";
}

export function LoadingSkeletonGrid({
	count = UI.SKELETON_COUNT,
	viewMode = "grid",
}: LoadingSkeletonGridProps) {
	// Grid view skeleton
	if (viewMode === "grid") {
		return (
			<SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }} spacing="md">
				{Array.from({ length: count }).map((_, index) => (
					<SkeletonCard key={index} />
				))}
			</SimpleGrid>
		);
	}

	// List view skeleton
	if (viewMode === "list") {
		return (
			<Box>
				{Array.from({ length: count }).map((_, index) => (
					<SkeletonListItem key={index} />
				))}
			</Box>
		);
	}

	// Table view skeleton
	// Note: viewMode is already validated to be "grid" | "list" | "table"
	// This condition is always true here but required for TypeScript exhaustiveness
	return (
		<Table striped={true} highlightOnHover={true}>
			<Table.Thead>
				<Table.Tr>
					<Table.Th>Image</Table.Th>
					<Table.Th>Name</Table.Th>
					<Table.Th>Brand</Table.Th>
					<Table.Th>Grade</Table.Th>
					<Table.Th>Scale</Table.Th>
					<Table.Th>Price</Table.Th>
				</Table.Tr>
			</Table.Thead>
			<Table.Tbody>
				{Array.from({ length: count }).map((_, index) => (
					<SkeletonTableRow key={index} />
				))}
			</Table.Tbody>
		</Table>
	);
}

// Skeleton card component for grid view
function SkeletonCard() {
	return (
		<Box>
			<Skeleton height={UI.THUMBNAIL_HEIGHT} radius="md" mb="xs" />
			<Skeleton height={20} width="80%" mb="xs" />
			<Skeleton height={16} width="60%" mb="xs" />
			<Group justify="space-between" mb="xs">
				<Skeleton height={14} width="40%" />
				<Skeleton height={14} width="30%" />
			</Group>
		</Box>
	);
}

// Skeleton list item for list view
function SkeletonListItem() {
	return (
		<Box
			p="md"
			mb="xs"
			style={{
				border: "1px solid var(--mantine-color-gray-3)",
				borderRadius: "var(--mantine-radius-md)",
			}}
		>
			<Group gap="md">
				<Skeleton width={60} height={60} radius="sm" />
				<Box flex={1}>
					<Skeleton height={20} width="70%" mb="xs" />
					<Skeleton height={16} width="50%" mb="xs" />
					<Skeleton height={14} width="30%" />
				</Box>
				<Box ta="right">
					<Skeleton height={16} width={80} mb="xs" />
					<Skeleton height={14} width={60} />
				</Box>
			</Group>
		</Box>
	);
}

// Skeleton table row for table view
function SkeletonTableRow() {
	return (
		<Table.Tr>
			<Table.Td>
				<Skeleton width={40} height={40} radius="sm" />
			</Table.Td>
			<Table.Td>
				<Skeleton height={16} width="80%" />
			</Table.Td>
			<Table.Td>
				<Skeleton height={14} width="60%" />
			</Table.Td>
			<Table.Td>
				<Skeleton height={14} width="40%" />
			</Table.Td>
			<Table.Td>
				<Skeleton height={14} width="40%" />
			</Table.Td>
			<Table.Td>
				<Skeleton height={14} width="70%" />
			</Table.Td>
		</Table.Tr>
	);
}