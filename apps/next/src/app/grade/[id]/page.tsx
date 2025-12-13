import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	Badge,
	Box,
	Card,
	Container,
	Group,
	Image,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import {
	IconChevronRight,
	IconClock,
	IconCurrencyYen,
	IconList,
	IconPhoto,
} from "@tabler/icons-react";
import Link from "next/link";

import {
	getGradeById,
	getItemsByGrade,
	getGradesIndex,
	getGradeIds,
	type GradeData,
	getNodeDisplayName,
	type Item,
} from "@hobby-ninja/data";
import { itemCard } from "@/styles/components.css";
import { createPlaceholderSvg, createErrorPlaceholderSvg } from "@/lib/image-placeholders";

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

// Item card component (server component - no hooks)
function ItemCard({ item }: { item: Item & { series?: string; grade?: string; scale?: string; brand?: string } }) {
	const rawImage = item.images?.[0];
	// Handle union type: string | { url: string } | unknown
	const primaryImage = typeof rawImage === "string"
		? rawImage
		: (rawImage && typeof rawImage === "object" && "url" in rawImage)
			? (rawImage as { url: string }).url
			: undefined;
	const name = getNodeDisplayName(item);

	return (
		<Link href={`/item/${item.id}`} style={{ textDecoration: "none", color: "inherit" }}>
			<Card
				p="md"
				radius="md"
				withBorder={true}
				className={itemCard}
			>
				<Stack gap="md">
					<Box h={160} style={{ overflow: "hidden", borderRadius: "var(--mantine-radius-sm)" }}>
						<Image
							src={primaryImage || createPlaceholderSvg(name.slice(0, 20), 200, 200)}
							alt={name}
							fit="cover"
							radius="sm"
							fallbackSrc={createErrorPlaceholderSvg(200, 200)}
						/>
					</Box>
					<div>
						<Text size="sm" fw={600} lineClamp={2} mb="xs">
							{name}
						</Text>
						<Group gap="xs" mb="xs">
							{item.grade && (
								<Badge variant="light" color="blue" size="xs">
									{item.grade}
								</Badge>
							)}
							{item.scale && (
								<Badge variant="light" color="green" size="xs">
									1/{item.scale}
								</Badge>
							)}
						</Group>
						<Group justify="space-between">
							{item.price && (
								<Text size="xs" c="dimmed">
									¥{item.price.amount.toLocaleString()}
								</Text>
							)}
							{item.releaseDate?.year && (
								<Text size="xs" c="dimmed">
									{item.releaseDate.year}
								</Text>
							)}
						</Group>
					</div>
				</Stack>
			</Card>
		</Link>
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

	// Get grades index for parent/child lookups
	const gradesIndex = getGradesIndex();

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
		if (item.scale) {
			scaleDistribution.set(item.scale, (scaleDistribution.get(item.scale) || 0) + 1);
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
		scaleDistribution: Array.from(scaleDistribution.entries())
			.sort((a, b) => b[1] - a[1])
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
								<Link href={`/grade/${parentGrade.id}`} style={{ textDecoration: "none" }}>
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
										<Link key={child.id} href={`/grade/${child.id}`} style={{ textDecoration: "none" }}>
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

				{/* Content Sections */}
				<Stack gap="md">
					{/* Items Section */}
					<Card p="lg" radius="md" withBorder={true}>
						<Stack gap="md">
							<Group justify="space-between">
								<Title order={2}>
									<Group gap="xs">
										<IconList size={24} />
										Items ({stats.totalItems})
									</Group>
								</Title>
							</Group>

							{gradeItems.length > 0 ? (
								<SimpleGrid
									cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }}
									spacing="md"
								>
									{gradeItems.slice(0, 24).map((item) => (
										<ItemCard key={item.id} item={item} />
									))}
								</SimpleGrid>
							) : (
								<Box ta="center" py="xl">
									<IconPhoto size={64} color="var(--mantine-color-gray-4)" />
									<Title order={3} mt="md" mb="sm">
										No items found
									</Title>
									<Text c="dimmed">
										No items are currently available for this grade.
									</Text>
								</Box>
							)}

							{gradeItems.length > 24 && (
								<Text ta="center" c="dimmed" size="sm">
									Showing 24 of {gradeItems.length} items
								</Text>
							)}
						</Stack>
					</Card>

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
					{(stats.averagePrice || stats.yearRange) && (
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
