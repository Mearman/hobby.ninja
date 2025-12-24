"use client";

import { getNodeDisplayName, getNodePrimaryGrade, isItem, type Category, type Item } from "@hobby-ninja/data";
import {
	Anchor,
	Badge,
	Box,
	Breadcrumbs,
	Card,
	Grid,
	Group,
	Text,
} from "@mantine/core";
import {
	IconFolder,
	IconHome,
} from "@tabler/icons-react";
import { useMemo } from "react";

import { itemConfig } from "@/components/lists/configs";
import { GenericListPage } from "@/components/lists/generic-list-page";

interface CategoryPageClientProps {
	initialCategory: Category;
	initialItems: Item[];
	_initialCategories: Category[];
	categoryId: string;
}

// Statistics interface
interface CategoryStats {
	totalItems: number;
	avgPrice?: number;
	priceRange?: { min: number; max: number };
	newestItem?: string;
	oldestItem?: string;
	brandsCount: number;
	gradesCount: number;
	scalesCount: number;
	seriesCount: number;
}

// Main client component
export function CategoryPageClient({
	initialCategory,
	initialItems,
	_initialCategories,
	categoryId,
}: CategoryPageClientProps) {
	// Calculate category statistics
	const categoryStats = useMemo((): CategoryStats => {
		const validItems: Item[] = initialItems.filter((item): item is Item => isItem(item));
		const prices: number[] = [];
		let newestItem = "";
		let oldestItem = "";
		let newestDate = "";
		let oldestDate = "";

		const brands = new Set<string>();
		const grades = new Set<string>();
		const scales = new Set<string>();
		const series = new Set<string>();

		for (const item of validItems) {
			// Collect price data
			if (item.price?.amount) {
				prices.push(item.price.amount);
			}

			// Track newest/oldest items by release date
			const itemDate = item.releaseDate?.ja ?? item.created ?? "";
			if (!oldestDate || itemDate < oldestDate) {
				oldestDate = itemDate;
				oldestItem = getNodeDisplayName(item);
			}
			if (!newestDate || itemDate > newestDate) {
				newestDate = itemDate;
				newestItem = getNodeDisplayName(item);
			}

			// Collect filter options
			for (const brand of item.brands) {
				brands.add(brand.id);
			}
			const grade = getNodePrimaryGrade(item);
			if (grade) grades.add(grade);
			if (item.scale) scales.add(item.scale);
			for (const s of item.series) {
				series.add(s.id);
			}
		}

		const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : undefined;
		const priceRange = prices.length > 0 ? {
			min: Math.min(...prices),
			max: Math.max(...prices),
		} : undefined;

		return {
			totalItems: validItems.length,
			avgPrice,
			priceRange,
			newestItem,
			oldestItem,
			brandsCount: brands.size,
			gradesCount: grades.size,
			scalesCount: scales.size,
			seriesCount: series.size,
		};
	}, [initialItems]);

	return (
		<GenericListPage
			items={initialItems}
			totalItems={categoryStats.totalItems}
			config={itemConfig}
			pageTitle={getNodeDisplayName(initialCategory)}
			subtitle={`${categoryStats.totalItems.toLocaleString()} items in this category`}
			hiddenFilters={["categories"]}
			breadcrumbs={
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
					<Anchor href={`/categories/${categoryId}`} size="sm" fw={500}>
						{getNodeDisplayName(initialCategory)}
					</Anchor>
				</Breadcrumbs>
			}
			headerContent={
				<Card p="lg" radius="md" withBorder={true}>
					<Group justify="space-between" align="flex-start">
						<Box flex={1}>
							<Group align="center" gap="sm" mb="md">
								<IconFolder size={28} color="var(--mantine-color-blue-6)" />
								<Badge size="lg" variant="light" color="blue">
									Category
								</Badge>
							</Group>

							{/* Category Statistics Grid */}
							<Grid>
								<Grid.Col span={{ base: 6, md: 3 }}>
									<Box>
										<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Brands</Text>
										<Text size="lg" fw={600}>{categoryStats.brandsCount}</Text>
									</Box>
								</Grid.Col>
								<Grid.Col span={{ base: 6, md: 3 }}>
									<Box>
										<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Grades</Text>
										<Text size="lg" fw={600}>{categoryStats.gradesCount}</Text>
									</Box>
								</Grid.Col>
								<Grid.Col span={{ base: 6, md: 3 }}>
									<Box>
										<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Scales</Text>
										<Text size="lg" fw={600}>{categoryStats.scalesCount}</Text>
									</Box>
								</Grid.Col>
								<Grid.Col span={{ base: 6, md: 3 }}>
									<Box>
										<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Series</Text>
										<Text size="lg" fw={600}>{categoryStats.seriesCount}</Text>
									</Box>
								</Grid.Col>
							</Grid>

							{categoryStats.avgPrice && (
								<Text size="sm" c="dimmed" mt="md">
									Average price: ¥{categoryStats.avgPrice.toLocaleString()}
									{categoryStats.priceRange && (
										` (Range: ¥${categoryStats.priceRange.min.toLocaleString()} - ¥${categoryStats.priceRange.max.toLocaleString()})`
									)}
								</Text>
							)}
						</Box>
					</Group>
				</Card>
			}
			stats={
				(categoryStats.newestItem && categoryStats.newestItem.length > 0) || (categoryStats.oldestItem && categoryStats.oldestItem.length > 0) ? (
					<Card p="md" radius="md" withBorder={true} bg="gray.0">
						<Group justify="space-between">
							{categoryStats.newestItem && categoryStats.newestItem.length > 0 && (
								<Box>
									<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Newest Item</Text>
									<Text size="sm" truncate={true} maw={200}>{categoryStats.newestItem}</Text>
								</Box>
							)}
							{categoryStats.oldestItem && categoryStats.oldestItem.length > 0 && (
								<Box>
									<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Oldest Item</Text>
									<Text size="sm" truncate={true} maw={200}>{categoryStats.oldestItem}</Text>
								</Box>
							)}
						</Group>
					</Card>
				) : undefined
			}
		/>
	);
}
