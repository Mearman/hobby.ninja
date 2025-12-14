"use client";

import type { Manual } from "@hobby-ninja/data";
import {
	Anchor,
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
import {
	IconHome,
} from "@tabler/icons-react";

import { manualConfigEnhanced } from "@/components/lists/configs";
import { GenericListPage } from "@/components/lists/generic-list-page";

interface ManualsClientProps {
	manuals: Manual[];
	totalManuals: number;
}

// Manual Statistics Component
function ManualStatistics({ manuals }: { manuals: Manual[] }) {
	const manualsWithPdf = manuals.filter(m => m.url).length;
	const manualsWithPages = manuals.filter(m => m.pages).length;
	const totalPages = manuals.reduce((sum, m) => sum + (m.pages ?? 0), 0);
	const avgPages = manualsWithPages > 0 ? totalPages / manualsWithPages : 0;

	const languages = new Map<string, number>();
	for (const m of manuals) {
		if (m.language) {
			languages.set(m.language, (languages.get(m.language) ?? 0) + 1);
		}
	}
	const sortedLanguages = [...languages.entries()].toSorted((a, b) => b[1] - a[1]);
	const topLanguageName = sortedLanguages.length > 0 ? sortedLanguages[0][0] : "N/A";

	// Calculate date range statistics
	const manualsWithDates = manuals.filter(m => m.releaseDate);
	const earliestDate = manualsWithDates.length > 0 ?
		new Date(Math.min(...manualsWithDates.map(m => {
			if (typeof m.releaseDate === "string") return new Date(m.releaseDate).getTime();
			if (typeof m.releaseDate === "object" && "year" in m.releaseDate) {
				return new Date(m.releaseDate.year ?? 0).getTime();
			}
			return 0;
		}))) : null;
	const latestDate = manualsWithDates.length > 0 ?
		new Date(Math.max(...manualsWithDates.map(m => {
			if (typeof m.releaseDate === "string") return new Date(m.releaseDate).getTime();
			if (typeof m.releaseDate === "object" && "year" in m.releaseDate) {
				return new Date(m.releaseDate.year ?? 0).getTime();
			}
			return 0;
		}))) : null;

	return (
		<SimpleGrid cols={{ base: 1, sm: 2, md: 4, lg: 6 }} spacing="md">
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>Total Manuals</Text>
				<Text size="xl" fw={700} mt="sm">{manuals.length.toLocaleString()}</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>With PDF</Text>
				<Text size="xl" fw={700} mt="sm">{manualsWithPdf.toLocaleString()}</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>Avg Pages</Text>
				<Text size="xl" fw={700} mt="sm">{avgPages > 0 ? avgPages.toFixed(0) : "N/A"}</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>Top Language</Text>
				<Text size="xl" fw={700} mt="sm">{topLanguageName}</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>Date Range</Text>
				<Text size="sm" fw={700} mt="sm">
					{earliestDate ? earliestDate.getFullYear() : "N/A"} - {latestDate ? latestDate.getFullYear() : "N/A"}
				</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>With Dates</Text>
				<Text size="xl" fw={700} mt="sm">{manualsWithDates.length.toLocaleString()}</Text>
			</Card>
		</SimpleGrid>
	);
}

export function ManualsClientEnhanced({ manuals, totalManuals }: ManualsClientProps) {
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
					<Text size="sm" c="dimmed">
						Manuals
					</Text>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						Enhanced Manual Directory
					</Title>
					<Text size="lg" c="dimmed">
						Browse {totalManuals.toLocaleString()} instruction manuals with advanced search, date filtering, and sorting.
					</Text>
				</Box>

				{/* Statistics */}
				<ManualStatistics manuals={manuals} />

				{/* Feature Highlights */}
				<Card p="lg" radius="md" withBorder={true} bg="blue.0">
					<Title order={3} mb="sm" c="blue">
						New Features
					</Title>
					<Group>
						<Text>
							<strong>Date Range Filtering:</strong> Filter manuals by release date using interactive date pickers
						</Text>
					</Group>
					<Group>
						<Text>
							<strong>Advanced Sorting:</strong> Sort by name, date, page count, or language
						</Text>
					</Group>
					<Group>
						<Text>
							<strong>Smart Search:</strong> Search manual names and associated item names
						</Text>
					</Group>
				</Card>

				{/* Generic List Page with Enhanced Filters */}
				<GenericListPage
					items={manuals}
					totalItems={totalManuals}
					config={manualConfigEnhanced}
					pageTitle="All Manuals"
					subtitle="Use the advanced filters to narrow down your search"
					breadcrumbs={undefined} // Already handled above
				/>
			</Stack>
		</Container>
	);
}