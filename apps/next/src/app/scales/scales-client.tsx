"use client";

import type { ScaleData } from "@hobby-ninja/data/scales";
import {
	Badge,
	Card,
	Group,
	SimpleGrid,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import { IconRuler, IconSearch } from "@tabler/icons-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { InfiniteScrollLoader } from "@/components/ui/infinite-scroll-loader";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { categoryCard } from "@/styles/components.css";

interface ScalesClientProps {
	scales: ScaleData[];
	totalScales: number;
}

// Helper function to determine if a scale is common
function isCommonScale(scaleName: string): boolean {
	const commonScales = ["1/144", "1/100", "1/60"];
	return commonScales.includes(scaleName);
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

export function ScalesClient({ scales, totalScales }: ScalesClientProps) {
	const { preferences } = useUserPreferences();
	const [search, setSearch] = useState("");

	// Filter scales by search
	const filteredScales = useMemo(() => {
		if (!search.trim()) return scales;
		const query = search.toLowerCase();
		return scales.filter((scale) => {
			const name = scale.name.toLowerCase();
			return name.includes(query);
		});
	}, [scales, search]);

	const { visibleItems: paginatedScales, isLoading, hasMore, lastItemRef } = useInfiniteScroll({
		items: filteredScales,
		itemsPerPage: preferences.infiniteScrollPageSize,
		preservePageParam: true,
		autoLoad: preferences.autoLoadInfiniteScroll,
	});

	return (
		<Stack gap="md">
			{/* Search */}
			<TextInput
				leftSection={<IconSearch size={16} />}
				placeholder="Search scales..."
				value={search}
				onChange={(e) => { setSearch(e.target.value); }}
				size="md"
			/>

			{/* Results count */}
			<Group justify="space-between">
				<Text size="sm" c="dimmed">
					{filteredScales.length === totalScales
						? `${totalScales.toLocaleString()} scales`
						: `${filteredScales.length.toLocaleString()} of ${totalScales.toLocaleString()} scales`
					}
				</Text>
			</Group>

			{/* Scales Grid */}
			{paginatedScales.length > 0 ? (
				<>
					<SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
						{paginatedScales.map((scale) => (
							<ScaleCard key={scale.id} scale={scale} />
						))}
					</SimpleGrid>

					{/* Infinite Scroll Loader */}
					<div ref={lastItemRef}>
						<InfiniteScrollLoader
							isLoading={isLoading}
							hasMore={hasMore}
							autoLoad={preferences.autoLoadInfiniteScroll}
						/>
					</div>
				</>
			) : (
				<Stack align="center" py="xl" gap="md">
					<IconRuler size={64} style={{ color: "var(--mantine-color-gray-4)" }} />
					<Text size="lg" fw={500}>
						{search ? "No scales match your search" : "No scales found"}
					</Text>
					<Text c="dimmed" ta="center">
						{search
							? "Try a different search term."
							: "No scales are currently available."
						}
					</Text>
				</Stack>
			)}
		</Stack>
	);
}
