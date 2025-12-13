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

import { ManualsClient } from "./manuals-client";

import { getAllManuals } from "@/lib/server-graph-data";


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
				<Text size="xl" fw={700} mt="sm">{topLanguageName}</Text>
			</Card>
		</SimpleGrid>
	);
}

export default function ManualsPage() {
	// Load data synchronously
	const manuals = getAllManuals();
	const total = manuals.length;

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
						Manual Directory
					</Title>
					<Text size="lg" c="dimmed">
						Browse {total.toLocaleString()} instruction manuals with search and infinite scroll.
					</Text>
				</Box>

				{/* Statistics */}
				<ManualStatistics manuals={manuals} />

				{/* Client Component with Infinite Scroll */}
				<Box>
					<Title order={2} mb="md">
						All Manuals
					</Title>
					<ManualsClient manuals={manuals} totalManuals={total} />
				</Box>
			</Stack>
		</Container>
	);
}
