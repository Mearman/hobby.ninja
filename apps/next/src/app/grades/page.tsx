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
import { IconHome } from "@tabler/icons-react";
import Link from "next/link";

import { getGradesIndex, getNodeDisplayName, type GradeData } from "@hobby-ninja/data";
import { categoryCard } from "@/styles/components.css";

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

// Statistics Component
function GradeStatistics({ grades }: { grades: GradeData[] }) {
	const totalItems = grades.reduce((sum, grade) => sum + grade.itemCount, 0);
	const parentGrades = grades.filter((g) => g.parent === null);
	const avgItemsPerGrade = totalItems / grades.length;

	// Find most popular grade
	const mostPopular = [...grades].sort((a, b) => b.itemCount - a.itemCount)[0];

	const stats = {
		totalGrades: grades.length,
		parentGrades: parentGrades.length,
		totalItems,
		avgItemsPerGrade,
		mostPopular,
	};

	return (
		<SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>
					Total Grades
				</Text>
				<Text size="xl" fw={700} mt="sm">
					{stats.totalGrades.toLocaleString()}
				</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>
					Parent Grades
				</Text>
				<Text size="xl" fw={700} mt="sm">
					{stats.parentGrades.toLocaleString()}
				</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>
					Total Items
				</Text>
				<Text size="xl" fw={700} mt="sm">
					{stats.totalItems.toLocaleString()}
				</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>
					Most Popular
				</Text>
				<Text size="xl" fw={700} mt="sm">
					{stats.mostPopular ? getNodeDisplayName(stats.mostPopular) : "N/A"}
				</Text>
			</Card>
		</SimpleGrid>
	);
}

export default function GradesPage() {
	// Load grades index data
	const gradesIndex = getGradesIndex();
	const { grades, hierarchy } = gradesIndex;

	// Separate parent grades and sub-grades
	const parentGrades = grades.filter((g) => g.parent === null);
	const subGradesMap = new Map<string, GradeData[]>();

	// Build map of parent grades to their sub-grades
	for (const grade of grades) {
		if (grade.parent !== null) {
			const existing = subGradesMap.get(grade.parent) || [];
			existing.push(grade);
			subGradesMap.set(grade.parent, existing);
		}
	}

	// Sort parent grades by item count (descending)
	const sortedParentGrades = [...parentGrades].sort((a, b) => b.itemCount - a.itemCount);

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
					<Anchor href="/grades" size="sm">
						Grades
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						Grade Directory
					</Title>
					<Text size="lg" c="dimmed">
						Explore {grades.length.toLocaleString()} grade categories and their hierarchies
					</Text>
				</Box>

				{/* Statistics */}
				<GradeStatistics grades={grades} />

				{/* Parent Grades with Sub-Grades */}
				<Box>
					<Title order={2} mb="md">
						Grade Hierarchy
					</Title>
					<Text size="sm" c="dimmed" mb="lg">
						Main grade lines with their sub-categories
					</Text>
					<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
						{sortedParentGrades.map((grade) => {
							const subGrades = subGradesMap.get(grade.id) || [];
							return <GradeCard key={grade.id} grade={grade} subGrades={subGrades} />;
						})}
					</SimpleGrid>
				</Box>
			</Stack>
		</Container>
	);
}
