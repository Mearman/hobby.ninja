import { scalesList, type ScaleData } from "@hobby-ninja/data/scales";
import {
	Anchor,
	Badge,
	Box,
	Breadcrumbs,
	Card,
	Container,
	Group,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { IconHome, IconRuler } from "@tabler/icons-react";
import Link from "next/link";

import { ScalesClient } from "./scales-client";

import { categoryCard } from "@/styles/components.css";

// Helper function to parse scale ratio for sorting (e.g., "1/144" -> 144)
function parseScaleRatio(scaleName: string): number {
	const regex = /1\/(\d+)/;
	const match = regex.exec(scaleName);
	if (match) {
		return Number.parseInt(match[1], 10);
	}
	// Return a very large number for unparseable scales to sort them last
	return Number.MAX_SAFE_INTEGER;
}

// Helper function to determine if a scale is common
function isCommonScale(scaleName: string): boolean {
	const commonScales = ["1/144", "1/100", "1/60"];
	return commonScales.includes(scaleName);
}

// Sort scales: common scales first, then by numeric ratio (ascending)
function sortScales(scales: ScaleData[]): ScaleData[] {
	return [...scales].toSorted((a, b) => {
		const aIsCommon = isCommonScale(a.name);
		const bIsCommon = isCommonScale(b.name);

		// Common scales go first
		if (aIsCommon && !bIsCommon) return -1;
		if (!aIsCommon && bIsCommon) return 1;

		// Within common scales, sort by ratio
		if (aIsCommon && bIsCommon) {
			const commonOrder = ["1/144", "1/100", "1/60"];
			return commonOrder.indexOf(a.name) - commonOrder.indexOf(b.name);
		}

		// For non-common scales, sort by numeric ratio (smaller number = larger scale)
		const ratioA = parseScaleRatio(a.name);
		const ratioB = parseScaleRatio(b.name);
		return ratioA - ratioB;
	});
}

// Scale Card Component
function ScaleCard({ scale }: { scale: ScaleData }) {
	return (
		<Link
			href={`/scale/${encodeURIComponent(scale.id)}`}
			style={{ textDecoration: "none", color: "inherit" }}
		>
			<Card p="md" radius="md" className={categoryCard} withBorder={true}>
				<Stack gap="md">
					<Group justify="space-between" align="flex-start">
						<Stack gap="xs" flex={1}>
							<Group gap="sm">
								<IconRuler size={24} color="var(--mantine-color-blue-6)" />
								<Text size="lg" fw={700}>
									{scale.name}
								</Text>
							</Group>
							{isCommonScale(scale.name) && (
								<Badge variant="light" color="blue" size="sm">
									Common Scale
								</Badge>
							)}
						</Stack>
					</Group>

					<Group gap="xs" wrap="wrap">
						<Badge variant="light" size="sm">
							{scale.itemCount.toLocaleString()} items
						</Badge>
					</Group>

					<Group justify="space-between" align="center">
						<Text size="sm" fw={500} c="blue">
							View all items
						</Text>
					</Group>
				</Stack>
			</Card>
		</Link>
	);
}

// Scale Statistics Component
function ScaleStatistics({ scales }: { scales: ScaleData[] }) {
	let totalItems = 0;
	for (const scale of scales) {
		totalItems += scale.itemCount;
	}
	const avgItemsPerScale = totalItems / scales.length;

	let topScale = scales[0];
	for (const scale of scales) {
		if (scale.itemCount > topScale.itemCount) {
			topScale = scale;
		}
	}

	return (
		<SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>
					Total Scales
				</Text>
				<Text size="xl" fw={700} mt="sm">
					{scales.length.toLocaleString()}
				</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>
					Total Items
				</Text>
				<Text size="xl" fw={700} mt="sm">
					{totalItems.toLocaleString()}
				</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>
					Avg Items/Scale
				</Text>
				<Text size="xl" fw={700} mt="sm">
					{avgItemsPerScale.toFixed(1)}
				</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>
					Most Popular
				</Text>
				<Text size="xl" fw={700} mt="sm">
					{topScale.name}
				</Text>
			</Card>
		</SimpleGrid>
	);
}

// Common Scales Component
function CommonScales({ scales }: { scales: ScaleData[] }) {
	const commonScales = scales.filter((scale) => isCommonScale(scale.name));

	if (commonScales.length === 0) return null;

	return (
		<Box>
			<Title order={2} mb="md">
				Common Scales
			</Title>
			<SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
				{commonScales.map((scale) => (
					<ScaleCard key={scale.id} scale={scale} />
				))}
			</SimpleGrid>
		</Box>
	);
}

export default function ScalesPage() {
	// Load data from @hobby-ninja/data
	const scalesData = scalesList;

	// Sort scales
	const scales = sortScales(scalesData);

	// Get common and other scales
	const commonScales = scales.filter((scale) => isCommonScale(scale.name));
	const otherScales = scales.filter((scale) => !isCommonScale(scale.name));

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
					<Anchor href="/scales" size="sm">
						Scales
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						Scale Directory
					</Title>
					<Text size="lg" c="dimmed">
						Explore {scales.length.toLocaleString()} model scales in our
						database
					</Text>
				</Box>

				{/* Statistics */}
				<ScaleStatistics scales={scales} />

				{/* Common Scales */}
				{commonScales.length > 0 && <CommonScales scales={commonScales} />}

				{/* All Other Scales with Infinite Scroll */}
				{otherScales.length > 0 && (
					<Box>
						<Title order={2} mb="md">
							All Scales
						</Title>
						<ScalesClient scales={otherScales} totalScales={otherScales.length} />
					</Box>
				)}
			</Stack>
		</Container>
	);
}
