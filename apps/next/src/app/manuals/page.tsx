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
import {
	IconHome,
	IconFileText,
} from "@tabler/icons-react";
import Link from "next/link";

import { getAllManuals } from "@/lib/server-graph-data";
import { getNodeDisplayName } from "@/lib/schemas";
import { categoryCard } from "@/styles/components.css";
import type { ManualNode } from "@/lib/schemas";

// Helper function to get item display name
const getItemDisplayName = (manual: ManualNode): string | null => {
	if (!manual.itemName) return null;
	if (typeof manual.itemName === "string") return manual.itemName;
	return manual.itemName.en ?? manual.itemName.ja ?? null;
};

// Manual Card Component
function ManualCard({ manual }: { manual: ManualNode }) {
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
						{manual.size && (
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

// Manual Statistics Component
function ManualStatistics({ manuals }: { manuals: ManualNode[] }) {
	const manualsWithPdf = manuals.filter(m => m.url).length;
	const manualsWithPages = manuals.filter(m => m.pages).length;
	const totalPages = manuals.reduce((sum, m) => sum + (m.pages || 0), 0);
	const avgPages = manualsWithPages > 0 ? totalPages / manualsWithPages : 0;

	const languages = new Map<string, number>();
	manuals.forEach(m => {
		if (m.language) {
			languages.set(m.language, (languages.get(m.language) || 0) + 1);
		}
	});
	const topLanguage = [...languages.entries()].sort((a, b) => b[1] - a[1])[0];

	return (
		<SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
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
				<Text size="xl" fw={700} mt="sm">
					{topLanguage ? topLanguage[0] : "N/A"}
				</Text>
			</Card>
		</SimpleGrid>
	);
}

export default function ManualsPage() {
	// Load data synchronously
	const manuals = getAllManuals();

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
					<Anchor href="/manuals" size="sm">
						Manuals
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						Manual Directory
					</Title>
					<Text size="lg" c="dimmed">
						Browse {manuals.length.toLocaleString()} instruction manuals in our database
					</Text>
				</Box>

				{/* Statistics */}
				<ManualStatistics manuals={manuals} />

				{/* All Manuals */}
				<Box>
					<Title order={2} mb="md">
						All Manuals
					</Title>
					<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
						{manuals.map((manual) => (
							<ManualCard key={manual.id} manual={manual} />
						))}
					</SimpleGrid>
				</Box>
			</Stack>
		</Container>
	);
}
