"use client";

import { getNodeDisplayName, type Manual } from "@hobby-ninja/data";
import {
	Badge,
	Box,
	Card,
	Group,
	SimpleGrid,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import {
	IconFileText,
	IconSearch,
} from "@tabler/icons-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { InfiniteScrollLoader } from "@/components/ui/infinite-scroll-loader";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { categoryCard } from "@/styles/components.css";

interface ManualsClientProps {
	manuals: Manual[];
	totalManuals: number;
}

// Helper function to get item display name
const getItemDisplayName = (manual: Manual): string | null => {
	if (!manual.itemName) return null;
	if (typeof manual.itemName === "string") return manual.itemName;
	// Prefer en, fall back to ja if en is empty
	const en = manual.itemName.en;
	const ja = manual.itemName.ja;
	if (en && en.length > 0) return en;
	if (ja && ja.length > 0) return ja;
	return null;
};

// Manual Card Component
function ManualCard({ manual }: { manual: Manual }) {
	const displayName = getNodeDisplayName(manual);
	const itemName = getItemDisplayName(manual);

	return (
		<Link href={`/manual/${encodeURIComponent(manual.id)}`} style={{ textDecoration: "none", color: "inherit" }}>
			<Card
				p="md"
				radius="md"
				className={categoryCard}
				withBorder={true}
			>
				<Stack gap="md">
					<Group gap="sm" align="flex-start">
						<Box>
							<IconFileText size={48} color="var(--mantine-color-blue-6)" />
						</Box>
						<Stack gap="xs" flex={1}>
							<Text size="md" fw={600} lineClamp={2}>
								{displayName}
							</Text>
							{itemName && (
								<Text size="xs" c="dimmed" lineClamp={1}>
									{itemName}
								</Text>
							)}
						</Stack>
					</Group>

					<Group gap="xs" wrap="wrap">
						{manual.pages && (
							<Badge variant="light" size="sm">
								{manual.pages} pages
							</Badge>
						)}
						{manual.language && (
							<Badge variant="light" color="blue" size="sm">
								{manual.language}
							</Badge>
						)}
						{manual.size !== undefined && (
							<Badge variant="light" color="gray" size="sm">
								{manual.size}
							</Badge>
						)}
						{manual.url && (
							<Badge variant="light" color="green" size="sm">
								PDF Available
							</Badge>
						)}
					</Group>

					<Group justify="space-between" align="center">
						<Text size="sm" fw={500} c="blue">
							View manual
						</Text>
					</Group>
				</Stack>
			</Card>
		</Link>
	);
}

export function ManualsClient({ manuals, totalManuals }: ManualsClientProps) {
	const { preferences } = useUserPreferences();
	const [search, setSearch] = useState("");

	// Filter manuals by search
	const filteredManuals = useMemo(() => {
		if (!search.trim()) return manuals;
		const query = search.toLowerCase();
		return manuals.filter((manual) => {
			const name = getNodeDisplayName(manual).toLowerCase();
			const itemName = getItemDisplayName(manual)?.toLowerCase() ?? "";
			return name.includes(query) || itemName.includes(query);
		});
	}, [manuals, search]);

	const { visibleItems: paginatedManuals, isLoading, hasMore, lastItemRef } = useInfiniteScroll({
		items: filteredManuals,
		itemsPerPage: preferences.infiniteScrollPageSize,
		preservePageParam: true,
		autoLoad: preferences.autoLoadInfiniteScroll,
	});

	// Note: useInfiniteScroll automatically resets when items array reference changes

	return (
		<Stack gap="md">
			{/* Search */}
			<TextInput
				leftSection={<IconSearch size={16} />}
				placeholder="Search manuals..."
				value={search}
				onChange={(e) => { setSearch(e.target.value); }}
				size="md"
			/>

			{/* Results count */}
			<Group justify="space-between">
				<Text size="sm" c="dimmed">
					{filteredManuals.length === totalManuals
						? `${totalManuals.toLocaleString()} manuals`
						: `${filteredManuals.length.toLocaleString()} of ${totalManuals.toLocaleString()} manuals`
					}
				</Text>
			</Group>

			{/* Manuals Grid */}
			{paginatedManuals.length > 0 ? (
				<>
					<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
						{paginatedManuals.map((manual) => (
							<ManualCard key={manual.id} manual={manual} />
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
					<IconFileText size={64} style={{ color: "var(--mantine-color-gray-4)" }} />
					<Text size="lg" fw={500}>
						{search ? "No manuals match your search" : "No manuals found"}
					</Text>
					<Text c="dimmed" ta="center">
						{search
							? "Try a different search term."
							: "No manuals are currently available."
						}
					</Text>
				</Stack>
			)}
		</Stack>
	);
}
