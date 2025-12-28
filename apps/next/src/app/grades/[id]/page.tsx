import {
	getGradeById,
	getItemsByGrade,
	getGradeIds,
	type GradeData,
	getNodeDisplayName,
} from "@hobby-ninja/data";
import {
	Badge,
	Card,
	Container,
	Group,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import {
	IconChevronRight,
	IconClock,
	IconCurrencyYen,
} from "@tabler/icons-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GradeItemsClient } from "./grade-items-client";

interface GradePageProps {
	params: Promise<{ id: string }>;
}

// Generate static params for all grades
export function generateStaticParams() {
	const gradeIds = getGradeIds();
	console.log(`Generating static params for ${gradeIds.length} grades`);
	return gradeIds.map(id => ({ id }));
}

// Generate metadata for grade page
export async function generateMetadata({ params }: GradePageProps): Promise<Metadata> {
	const { id } = await params;
	const grade = getGradeById(id);

	if (!grade) {
		return {
			title: "Grade Not Found",
		};
	}

	const gradeName = getNodeDisplayName(grade);
	return {
		title: `${gradeName} - Grade - hobby.ninja`,
		description: `Browse all ${gradeName} grade items. ${grade.itemCount} items available.`,
	};
}

// Breadcrumbs component
function GradeBreadcrumbs({ grade }: { grade: GradeData }) {
	const gradeName = getNodeDisplayName(grade);
	const breadcrumbItems = [
		{ title: "Home", href: "/" },
		{ title: "Database", href: "/database" },
		{ title: "Grades", href: "/grades" },
		{ title: gradeName, href: "" },
	];

	return (
		<Group gap={8} mb="md">
			{breadcrumbItems.map((crumb, index) => (
				<Group key={index} gap={4}>
					{index > 0 && <IconChevronRight size={16} color="var(--mantine-color-gray-5)" />}
					{index < breadcrumbItems.length - 1 ? (
						<Link href={crumb.href} style={{ textDecoration: "none" }}>
							<Text size="sm" c="dimmed">
								{crumb.title}
							</Text>
						</Link>
					) : (
						<Text size="sm" fw={500} c="var(--mantine-color-dark-2)">
							{crumb.title}
						</Text>
					)}
				</Group>
			))}
		</Group>
	);
}

export default async function GradeDetailPage({ params }: GradePageProps) {
	const { id } = await params;

	// Fetch data at build time
	let grade;
	let gradeItems;
	try {
		grade = getGradeById(id);
		gradeItems = getItemsByGrade(id);
	} catch (error) {
		console.error("Error fetching grade:", error);
		throw new Error(`Failed to load grade: ${id}`);
	}

	if (!grade) {
		notFound();
	}

	// Get parent grade if exists
	const parentGrade = grade.parent ? getGradeById(grade.parent) : null;

	// Get child grades if exists
	const childGrades = grade.children.length > 0
		? grade.children.map(childId => getGradeById(childId)).filter(Boolean) as GradeData[]
		: [];

	// Calculate statistics
	const scaleDistribution = new Map<string, number>();
	let totalPrice = 0;
	let priceCount = 0;
	let minYear = 9999;
	let maxYear = 0;

	for (const item of gradeItems) {
		for (const scale of item.scales) {
			scaleDistribution.set(scale, (scaleDistribution.get(scale) ?? 0) + 1);
		}
		if (item.releaseDate?.year) {
			minYear = Math.min(minYear, item.releaseDate.year);
			maxYear = Math.max(maxYear, item.releaseDate.year);
		}
		if (item.price?.amount) {
			totalPrice += item.price.amount;
			priceCount++;
		}
	}

	const stats = {
		totalItems: gradeItems.length,
		scaleDistribution: [...scaleDistribution.entries()]
			.toSorted((a, b) => b[1] - a[1])
			.slice(0, 5),
		yearRange: minYear < 9999 && maxYear > 0 ? { first: minYear, last: maxYear } : null,
		averagePrice: priceCount > 0 ? totalPrice / priceCount : null,
	};

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Breadcrumbs */}
				<GradeBreadcrumbs grade={grade} />

				{/* Grade Header */}
				<Card p="lg" radius="md" withBorder={true}>
					<Stack gap="md">
						<Title order={1}>{getNodeDisplayName(grade)}</Title>

						<Group gap="xs">
							<Badge variant="outline" size="lg">
								{stats.totalItems} items
							</Badge>
							{stats.yearRange && (
								<Badge variant="light" color="blue" size="lg">
									{stats.yearRange.first} - {stats.yearRange.last}
								</Badge>
							)}
						</Group>

						{/* Parent Grade Link */}
						{parentGrade && (
							<Group gap="xs">
								<Text size="sm" c="dimmed">Parent Grade:</Text>
								<Link href={`/grades/${parentGrade.id}`} style={{ textDecoration: "none" }}>
									<Badge variant="light" size="md">
										{getNodeDisplayName(parentGrade)}
									</Badge>
								</Link>
							</Group>
						)}

						{/* Child Grades */}
						{childGrades.length > 0 && (
							<div>
								<Text size="sm" c="dimmed" mb="xs">Sub-Grades:</Text>
								<Group gap="xs">
									{childGrades.map((child) => (
										<Link key={child.id} href={`/grades/${child.id}`} style={{ textDecoration: "none" }}>
											<Badge variant="light" color="violet" size="md">
												{getNodeDisplayName(child)} ({child.itemCount})
											</Badge>
										</Link>
									))}
								</Group>
							</div>
						)}
					</Stack>
				</Card>

				{/* Items Section with Client-Side Filtering */}
				<GradeItemsClient
					items={gradeItems}
					gradeName={getNodeDisplayName(grade)}
					totalItems={stats.totalItems}
				/>

				{/* Statistics Sections */}
				<Stack gap="md">

					{/* Statistics Section */}
					<Card p="lg" radius="md" withBorder={true} h="100%">
						<Title order={3} mb="md">Scale Distribution</Title>
						<Stack gap="sm">
							{stats.scaleDistribution.length > 0 ? (
								stats.scaleDistribution.map(([scale, count]) => (
									<Group key={scale} justify="space-between">
										<Badge variant="light" color="green">1/{scale}</Badge>
										<Text size="sm">{count} items</Text>
									</Group>
								))
							) : (
								<Text c="dimmed">No scale information available</Text>
							)}
						</Stack>
					</Card>

					{/* Price and Timeline Info */}
					{(stats.averagePrice != null || stats.yearRange != null) && (
						<Card p="lg" radius="md" withBorder={true}>
							<SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
								{stats.averagePrice && (
									<Group gap="xs">
										<IconCurrencyYen size={20} />
										<Text fw={500}>Average Price:</Text>
										<Text>¥{Math.round(stats.averagePrice).toLocaleString()}</Text>
									</Group>
								)}
								{stats.yearRange && (
									<Group gap="xs">
										<IconClock size={20} />
										<Text fw={500}>Release Period:</Text>
										<Text>{stats.yearRange.first} - {stats.yearRange.last}</Text>
									</Group>
								)}
							</SimpleGrid>
						</Card>
					)}
				</Stack>
			</Stack>
		</Container>
	);
}
