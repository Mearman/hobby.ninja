import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	Badge,
	Box,
	Button,
	Card,
	Container,
	Group,
	Image,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import {
	IconChevronRight,
	IconFile,
	IconFileText,
	IconLanguage,
	IconPhoto,
} from "@tabler/icons-react";
import Link from "next/link";

import { getManualById, getManualIds, getNodeDisplayName, type Manual } from "@hobby-ninja/data";
import { createPlaceholderSvg, createErrorPlaceholderSvg } from "@/lib/image-placeholders";

interface ManualPageProps {
	params: Promise<{ id: string }>;
}

// Generate static params for all manuals using lightweight IDs file
export function generateStaticParams() {
	const manualIds = getManualIds();
	console.log(`Generating static params for ${manualIds.length} manuals`);
	return manualIds.map(id => ({ id }));
}

// Generate metadata for manual page
export async function generateMetadata({ params }: ManualPageProps): Promise<Metadata> {
	const { id } = await params;
	const manual = getManualById(id);

	if (!manual) {
		return {
			title: "Manual Not Found",
		};
	}

	const displayName = getNodeDisplayName(manual);

	return {
		title: `${displayName} - Manual - hobby.ninja`,
		description: `View manual for ${displayName}`,
	};
}

// Breadcrumbs component
function ManualBreadcrumbs({ manual }: { manual: Manual }) {
	const breadcrumbItems = [
		{ title: "Home", href: "/" },
		{ title: "Database", href: "/database" },
		{ title: "Manuals", href: "/manuals" },
		{ title: getNodeDisplayName(manual), href: "" },
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

export default async function ManualDetailPage({ params }: ManualPageProps) {
	const { id } = await params;

	// Fetch data at build time
	let manual;
	try {
		manual = getManualById(id);
	} catch (error) {
		console.error("Error fetching manual:", error);
		throw new Error(`Failed to load manual: ${id}`);
	}

	if (!manual) {
		notFound();
	}

	const displayName = getNodeDisplayName(manual);
	const manualUrl = manual.url;
	const manualPages = manual.pages;
	const manualLanguage = manual.language;
	const manualSize = manual.size;
	const itemId = manual.itemId;
	const itemName = manual.itemName;

	// The Manual type doesn't have productImage or thumbnailImage fields
	// Display name from the manual name
	const productNumber = typeof manual.name === "object" && manual.name.ja
		? manual.name.ja
		: undefined;

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Breadcrumbs */}
				<ManualBreadcrumbs manual={manual} />

				{/* Manual Header */}
				<Card p="lg" radius="md" withBorder={true}>
					<Stack gap="md">
						<Group align="flex-start" wrap="nowrap">
							{/* Info Section */}
							<Stack gap="md" style={{ flex: 1 }}>
								<div>
									<Title order={1}>{displayName}</Title>
									{productNumber && (
										<Text size="sm" c="dimmed" mt="xs">
											Product Number: {productNumber}
										</Text>
									)}
								</div>

								<Group gap="xs">
									<Badge variant="light" size="lg">
										<Group gap={4}>
											<IconFile size={14} />
											Manual
										</Group>
									</Badge>
									{manualLanguage && (
										<Badge variant="light" color="blue" size="lg">
											<Group gap={4}>
												<IconLanguage size={14} />
												{manualLanguage}
											</Group>
										</Badge>
									)}
									{manualPages && (
										<Badge variant="light" color="green" size="lg">
											<Group gap={4}>
												<IconFileText size={14} />
												{manualPages} pages
											</Group>
										</Badge>
									)}
								</Group>

								{/* PDF Link */}
								{manualUrl && (
									<div>
										<Button
											component="a"
											href={manualUrl}
											target="_blank"
											rel="noopener noreferrer"
											leftSection={<IconFileText size={18} />}
											variant="filled"
										>
											Open PDF Manual
										</Button>
										{manualSize && (
											<Text size="xs" c="dimmed" mt="xs">
												File size: {manualSize}
											</Text>
										)}
									</div>
								)}
							</Stack>
						</Group>
					</Stack>
				</Card>

				{/* Related Item */}
				{itemId && (
					<Card p="lg" radius="md" withBorder={true}>
						<Title order={3} mb="md">Related Product</Title>
						<Group>
							<IconPhoto size={20} />
							<div>
								<Link href={`/item/${itemId}`} style={{ textDecoration: "none" }}>
									<Text fw={500} c="blue">
										{typeof itemName === "string"
											? itemName
											: typeof itemName === "object" && itemName
												? (itemName.en || itemName.ja)
												: "View Product"}
									</Text>
								</Link>
								<Text size="xs" c="dimmed">
									Product ID: {itemId}
								</Text>
							</div>
						</Group>
					</Card>
				)}

				{/* Additional Information */}
				<Card p="lg" radius="md" withBorder={true}>
					<Title order={3} mb="md">Manual Information</Title>
					<Stack gap="sm">
						<Group justify="space-between">
							<Text fw={500}>Manual ID:</Text>
							<Text>{manual.id}</Text>
						</Group>
						{manualLanguage && (
							<Group justify="space-between">
								<Text fw={500}>Language:</Text>
								<Text>{manualLanguage}</Text>
							</Group>
						)}
						{manualPages && (
							<Group justify="space-between">
								<Text fw={500}>Pages:</Text>
								<Text>{manualPages}</Text>
							</Group>
						)}
						{manualSize && (
							<Group justify="space-between">
								<Text fw={500}>File Size:</Text>
								<Text>{manualSize}</Text>
							</Group>
						)}
						{manual.created && (
							<Group justify="space-between">
								<Text fw={500}>Created:</Text>
								<Text>{new Date(manual.created).toLocaleDateString()}</Text>
							</Group>
						)}
						{manual.modified && (
							<Group justify="space-between">
								<Text fw={500}>Modified:</Text>
								<Text>{new Date(manual.modified).toLocaleDateString()}</Text>
							</Group>
						)}
					</Stack>
				</Card>
			</Stack>
		</Container>
	);
}
