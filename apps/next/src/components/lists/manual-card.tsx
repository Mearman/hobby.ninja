"use client";

import { getNodeDisplayName, type Manual } from "@hobby-ninja/data";
import {
	Badge,
	Box,
	Card,
	Group,
	Stack,
	Text,
} from "@mantine/core";
import {
	IconFileText,
} from "@tabler/icons-react";
import Link from "next/link";

import type { ViewMode } from "@/components/lists/types";

interface ManualCardProps {
	item: Manual;
	viewMode: ViewMode;
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

export function ManualCard({ item: manual, viewMode }: ManualCardProps) {
	const displayName = getNodeDisplayName(manual);
	const itemName = getItemDisplayName(manual);

	if (viewMode === "list") {
		return (
			<Link href={`/manual/${encodeURIComponent(manual.id)}`} style={{ textDecoration: "none", color: "inherit" }}>
				<Card
					p="md"
					radius="md"
					withBorder={true}
					style={{ transition: "all 0.2s ease" }}
					onMouseEnter={(e) => {
						e.currentTarget.style.transform = "translateY(-1px)";
						e.currentTarget.style.boxShadow = "var(--mantine-shadow-md)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.transform = "translateY(0)";
						e.currentTarget.style.boxShadow = "var(--mantine-shadow-sm)";
					}}
				>
					<Group align="center" gap="md">
						<Box>
							<IconFileText size={40} color="var(--mantine-color-blue-6)" />
						</Box>
						<Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
							<Text size="md" fw={600} lineClamp={1}>
								{displayName}
							</Text>
							{itemName && (
								<Text size="xs" c="dimmed" lineClamp={1}>
									{itemName}
								</Text>
							)}
						</Stack>
						<Group gap="xs" wrap="nowrap">
							{manual.pages && (
								<Badge variant="light" size="sm">
									{manual.pages}p
								</Badge>
							)}
							{manual.language && (
								<Badge variant="light" color="blue" size="sm">
									{manual.language.toUpperCase()}
								</Badge>
							)}
							{manual.url && (
								<Badge variant="light" color="green" size="sm">
									PDF
								</Badge>
							)}
						</Group>
					</Group>
				</Card>
			</Link>
		);
	}

	// Grid view (default)
	return (
		<Link href={`/manual/${encodeURIComponent(manual.id)}`} style={{ textDecoration: "none", color: "inherit" }}>
			<Card
				p="md"
				radius="md"
				withBorder={true}
				style={{ transition: "all 0.2s ease" }}
				onMouseEnter={(e) => {
					e.currentTarget.style.transform = "translateY(-2px)";
					e.currentTarget.style.boxShadow = "var(--mantine-shadow-md)";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.transform = "translateY(0)";
					e.currentTarget.style.boxShadow = "var(--mantine-shadow-sm)";
				}}
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