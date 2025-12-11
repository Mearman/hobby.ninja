import {
	Box,
	Container,
	Stack,
	Text,
	Title,
	Card,
	SimpleGrid,
	Group,
} from "@mantine/core";
import {
	IconSearch,
	IconCategory,
	IconPackage,
	IconBrandYoutube,
	IconBuildingStore,
} from "@tabler/icons-react";
import Link from "next/link";

export default function SearchPage() {
	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						Search & Browse
					</Title>
					<Text size="lg" c="dimmed">
						Explore our database through different views and filters
					</Text>
				</Box>

				{/* Browse Options */}
				<SimpleGrid cols={{ base: 1, sm: 2, md: 2, lg: 4 }} spacing="md">
					{/* Categories */}
					<Link href="/browse/categories" style={{ textDecoration: "none" }}>
						<Card
							p="xl"
							radius="md"
							withBorder
							h="100%"
							style={{ cursor: "pointer" }}
													>
							<Stack gap="md" align="center">
								<Box
									p="md"
									style={{
										borderRadius: "var(--mantine-radius-md)",
										backgroundColor: "var(--mantine-color-blue-1)",
									}}
								>
									<IconCategory size={32} color="var(--mantine-color-blue-6)" />
								</Box>
								<Box ta="center">
									<Text size="lg" fw={600} mb="xs">
										Browse Categories
									</Text>
									<Text size="sm" c="dimmed">
										Explore by category type
									</Text>
								</Box>
							</Stack>
						</Card>
					</Link>

					{/* Items */}
					<Link href="/browse/items" style={{ textDecoration: "none" }}>
						<Card
							p="xl"
							radius="md"
							withBorder
							h="100%"
							style={{ cursor: "pointer" }}
													>
							<Stack gap="md" align="center">
								<Box
									p="md"
									style={{
										borderRadius: "var(--mantine-radius-md)",
										backgroundColor: "var(--mantine-color-green-1)",
									}}
								>
									<IconPackage size={32} color="var(--mantine-color-green-6)" />
								</Box>
								<Box ta="center">
									<Text size="lg" fw={600} mb="xs">
										Browse Items
									</Text>
									<Text size="sm" c="dimmed">
										View all available items
									</Text>
								</Box>
							</Stack>
						</Card>
					</Link>

					{/* Series */}
					<Link href="/browse/series" style={{ textDecoration: "none" }}>
						<Card
							p="xl"
							radius="md"
							withBorder
							h="100%"
							style={{ cursor: "pointer" }}
													>
							<Stack gap="md" align="center">
								<Box
									p="md"
									style={{
										borderRadius: "var(--mantine-radius-md)",
										backgroundColor: "var(--mantine-color-violet-1)",
									}}
								>
									<IconBrandYoutube size={32} color="var(--mantine-color-violet-6)" />
								</Box>
								<Box ta="center">
									<Text size="lg" fw={600} mb="xs">
										Browse Series
									</Text>
									<Text size="sm" c="dimmed">
										Explore by series
									</Text>
								</Box>
							</Stack>
						</Card>
					</Link>

					{/* Brands */}
					<Link href="/browse/brands" style={{ textDecoration: "none" }}>
						<Card
							p="xl"
							radius="md"
							withBorder
							h="100%"
							style={{ cursor: "pointer" }}
													>
							<Stack gap="md" align="center">
								<Box
									p="md"
									style={{
										borderRadius: "var(--mantine-radius-md)",
										backgroundColor: "var(--mantine-color-orange-1)",
									}}
								>
									<IconBuildingStore size={32} color="var(--mantine-color-orange-6)" />
								</Box>
								<Box ta="center">
									<Text size="lg" fw={600} mb="xs">
										Browse Brands
									</Text>
									<Text size="sm" c="dimmed">
										View by manufacturer
									</Text>
								</Box>
							</Stack>
						</Card>
					</Link>
				</SimpleGrid>

				{/* Info Card */}
				<Card withBorder p="xl">
					<Stack align="center" gap="md">
						<IconSearch size={48} color="var(--mantine-color-gray-4)" />
						<Title order={3} c="dimmed">
							Browse our database
						</Title>
						<Text size="lg" c="dimmed" ta="center">
							Use the browse options above to explore our database by different facets. Each view provides filtered access to our collection.
						</Text>
					</Stack>
				</Card>
			</Stack>
		</Container>
	);
}