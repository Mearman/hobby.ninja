import { getGradesIndex, getNodeDisplayName, type GradeData } from "@hobby-ninja/data";
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
import { IconHome } from "@tabler/icons-react";

import { GradesClient } from "./grades-client";

// Statistics Component
function GradeStatistics({ grades }: { grades: GradeData[] }) {
	const totalItems = grades.reduce((sum, grade) => sum + grade.itemCount, 0);
	const parentGrades = grades.filter((g) => g.parent === null);
	const avgItemsPerGrade = totalItems / grades.length;

	// Find most popular grade
	const mostPopular = [...grades].toSorted((a, b) => b.itemCount - a.itemCount)[0];

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
					{getNodeDisplayName(stats.mostPopular)}
				</Text>
			</Card>
		</SimpleGrid>
	);
}

export default function GradesPage() {
	// Load grades index data
	const gradesIndex = getGradesIndex();
	const { grades } = gradesIndex;

	// Separate parent grades and sub-grades
	const parentGrades = grades.filter((g) => g.parent === null);
	const subGradesMap = new Map<string, GradeData[]>();

	// Build map of parent grades to their sub-grades
	for (const grade of grades) {
		if (grade.parent !== null) {
			const existing = subGradesMap.get(grade.parent) ?? [];
			existing.push(grade);
			subGradesMap.set(grade.parent, existing);
		}
	}

	// Sort parent grades by item count (descending)
	const sortedParentGrades = [...parentGrades].toSorted((a, b) => b.itemCount - a.itemCount);

	// Prepare grades with sub-grades for client component
	const gradesWithSubGrades = sortedParentGrades.map((grade) => ({
		grade,
		subGrades: subGradesMap.get(grade.id) ?? [],
	}));

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

				{/* Parent Grades with Sub-Grades and Infinite Scroll */}
				<Box>
					<Title order={2} mb="md">
						Grade Hierarchy
					</Title>
					<Text size="sm" c="dimmed" mb="lg">
						Main grade lines with their sub-categories
					</Text>
					<GradesClient
						gradesWithSubGrades={gradesWithSubGrades}
						totalGrades={sortedParentGrades.length}
					/>
				</Box>
			</Stack>
		</Container>
	);
}
