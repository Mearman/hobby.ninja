"use client";

import type { GradeData } from "@hobby-ninja/data";
import { getNodeDisplayName } from "@hobby-ninja/data";
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
	IconSearch,
	IconTrophy,
} from "@tabler/icons-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { InfiniteScrollLoader } from "@/components/ui/infinite-scroll-loader";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { categoryCard } from "@/styles/components.css";

interface GradeWithSubGrades {
	grade: GradeData;
	subGrades: GradeData[];
}

interface GradesClientProps {
	gradesWithSubGrades: GradeWithSubGrades[];
	totalGrades: number;
}

// Grade Card Component
function GradeCard({ grade, subGrades }: { grade: GradeData; subGrades: GradeData[] }) {
	return (
		<Link
			href={`/grade/${encodeURIComponent(grade.id)}`}
			style={{ textDecoration: "none", color: "inherit" }}
		>
			<Card p="md" radius="md" className={categoryCard} withBorder={true}>
				<Stack gap="md">
					<Group justify="space-between" align="flex-start">
						<Stack gap="xs" flex={1}>
							<Text size="lg" fw={700} lineClamp={1}>
								{getNodeDisplayName(grade)}
							</Text>
							<Badge variant="light" size="sm">
								{grade.itemCount.toLocaleString()} items
							</Badge>
						</Stack>
					</Group>

					{subGrades.length > 0 && (
						<Box>
							<Text size="xs" c="dimmed" mb="xs" tt="uppercase" fw={600}>
								Sub-Grades:
							</Text>
							<Group gap="xs" wrap="wrap">
								{subGrades.map((subGrade) => (
									<Badge
										key={subGrade.id}
										variant="light"
										color="blue"
										size="xs"
										style={{ cursor: "pointer" }}
									>
										{getNodeDisplayName(subGrade)} ({subGrade.itemCount})
									</Badge>
								))}
							</Group>
						</Box>
					)}

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

export function GradesClient({ gradesWithSubGrades, totalGrades }: GradesClientProps) {
	const { preferences } = useUserPreferences();
	const [search, setSearch] = useState("");

	// Filter grades by search
	const filteredGrades = useMemo(() => {
		if (!search.trim()) return gradesWithSubGrades;
		const query = search.toLowerCase();
		return gradesWithSubGrades.filter(({ grade, subGrades }) => {
			const gradeName = getNodeDisplayName(grade).toLowerCase();
			const subGradeNames = subGrades.map(sg => getNodeDisplayName(sg).toLowerCase()).join(" ");
			return gradeName.includes(query) || subGradeNames.includes(query);
		});
	}, [gradesWithSubGrades, search]);

	const { visibleItems: paginatedGrades, isLoading, hasMore, lastItemRef } = useInfiniteScroll({
		items: filteredGrades,
		itemsPerPage: preferences.infiniteScrollPageSize,
		preservePageParam: true,
		autoLoad: preferences.autoLoadInfiniteScroll,
	});

	return (
		<Stack gap="md">
			{/* Search */}
			<TextInput
				leftSection={<IconSearch size={16} />}
				placeholder="Search grades..."
				value={search}
				onChange={(e) => { setSearch(e.target.value); }}
				size="md"
			/>

			{/* Results count */}
			<Group justify="space-between">
				<Text size="sm" c="dimmed">
					{filteredGrades.length === totalGrades
						? `${totalGrades.toLocaleString()} grades`
						: `${filteredGrades.length.toLocaleString()} of ${totalGrades.toLocaleString()} grades`
					}
				</Text>
			</Group>

			{/* Grades Grid */}
			{paginatedGrades.length > 0 ? (
				<>
					<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
						{paginatedGrades.map(({ grade, subGrades }) => (
							<GradeCard key={grade.id} grade={grade} subGrades={subGrades} />
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
					<IconTrophy size={64} style={{ color: "var(--mantine-color-gray-4)" }} />
					<Text size="lg" fw={500}>
						{search ? "No grades match your search" : "No grades found"}
					</Text>
					<Text c="dimmed" ta="center">
						{search
							? "Try a different search term."
							: "No grades are currently available."
						}
					</Text>
				</Stack>
			)}
		</Stack>
	);
}
