"use client";

import {
	Badge,
	Box,
	Card,
	Group,
	Image,
	SimpleGrid,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import {
	IconBuilding,
	IconSearch,
	IconStarFilled,
} from "@tabler/icons-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { InfiniteScrollLoader } from "@/components/ui/infinite-scroll-loader";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { createPlaceholderSvg, createErrorPlaceholderSvg } from "@/lib/image-placeholders";
import { categoryCard } from "@/styles/components.css";

interface BrandWithStats {
	id: string;
	type: string;
	name: string | { ja: string; en?: string };
	image?: string;
	country?: string;
	founded?: string | number;
	website?: string;
	description?: string;
	itemCount: number;
	averagePrice?: number;
	priceCurrency?: string;
	isFeatured?: boolean;
}

interface BrandsClientProps {
	brands: BrandWithStats[];
	totalBrands: number;
}

// Helper functions
const getDisplayName = (brand: BrandWithStats): string => {
	if (typeof brand.name === "string") return brand.name;
	const nameObj = brand.name as { ja: string; en?: string };
	return nameObj.en ?? nameObj.ja;
};

const getCountryFlag = (country?: string): string => {
	if (!country) return "";
	/* eslint-disable no-emoji/no-emoji -- Country flags are intentional UI elements */
	const flags: Record<string, string> = {
		japan: "🇯🇵",
		china: "🇨🇳",
		korea: "🇰🇷",
		usa: "🇺🇸",
		taiwan: "🇹🇼",
	};
	/* eslint-enable no-emoji/no-emoji */
	return flags[country.toLowerCase()] ?? "";
};

// Brand Card Component
function BrandCard({ brand }: { brand: BrandWithStats }) {
	return (
		<Link href={`/brand/${encodeURIComponent(brand.id)}`} style={{ textDecoration: "none", color: "inherit" }}>
			<Card
				p="md"
				radius="md"
				className={categoryCard}
				withBorder={true}
			>
				<Stack gap="md">
					<Group justify="space-between" align="flex-start">
						<Group gap="sm">
							<Box w={80} h={80}>
								<Image
									src={brand.image ?? createPlaceholderSvg(getDisplayName(brand).slice(0, 3), 80, 80)}
									alt={getDisplayName(brand)}
									fit="contain"
									radius="sm"
									fallbackSrc={createErrorPlaceholderSvg(80, 80)}
								/>
							</Box>
							<Stack gap="xs" flex={1}>
								<Text size="md" fw={600} lineClamp={2}>
									{getDisplayName(brand)}
								</Text>
								<Group gap="xs">
									{brand.country && (
										<Text size="xs" c="dimmed">
											{getCountryFlag(brand.country)} {brand.country}
										</Text>
									)}
									{brand.founded && (
										<Text size="xs" c="dimmed">
											Est. {typeof brand.founded === "number" ? brand.founded : brand.founded}
										</Text>
									)}
								</Group>
							</Stack>
						</Group>
					</Group>

					<Group gap="xs" wrap="wrap">
						<Badge variant="light" size="sm">
							{brand.itemCount} items
						</Badge>
						{brand.averagePrice && (
							<Badge variant="light" color="green" size="sm">
								{brand.priceCurrency === "JPY" ? "¥" : brand.priceCurrency ?? "$"}{brand.averagePrice.toFixed(0)} avg
							</Badge>
						)}
						{brand.isFeatured && (
							<Badge variant="light" color="yellow" size="sm">
								<IconStarFilled size={10} />
							</Badge>
						)}
					</Group>

					<Group justify="space-between" align="center">
						<Text size="sm" fw={500} c="blue">
							View all items
						</Text>
						{brand.website && (
							<Text size="xs" c="dimmed">
								Has website
							</Text>
						)}
					</Group>
				</Stack>
			</Card>
		</Link>
	);
}

export function BrandsClient({ brands, totalBrands }: BrandsClientProps) {
	const { preferences } = useUserPreferences();
	const [search, setSearch] = useState("");

	// Filter brands by search
	const filteredBrands = useMemo(() => {
		if (!search.trim()) return brands;
		const query = search.toLowerCase();
		return brands.filter((brand) => {
			const name = getDisplayName(brand).toLowerCase();
			const country = brand.country?.toLowerCase() ?? "";
			const description = brand.description?.toLowerCase() ?? "";
			return name.includes(query) || country.includes(query) || description.includes(query);
		});
	}, [brands, search]);

	const { visibleItems: paginatedBrands, isLoading, hasMore, lastItemRef } = useInfiniteScroll({
		items: filteredBrands,
		itemsPerPage: preferences.infiniteScrollPageSize,
		preservePageParam: true,
		autoLoad: preferences.autoLoadInfiniteScroll,
	});

	return (
		<Stack gap="md">
			{/* Search */}
			<TextInput
				leftSection={<IconSearch size={16} />}
				placeholder="Search brands..."
				value={search}
				onChange={(e) => { setSearch(e.target.value); }}
				size="md"
			/>

			{/* Results count */}
			<Group justify="space-between">
				<Text size="sm" c="dimmed">
					{filteredBrands.length === totalBrands
						? `${totalBrands.toLocaleString()} brands`
						: `${filteredBrands.length.toLocaleString()} of ${totalBrands.toLocaleString()} brands`
					}
				</Text>
			</Group>

			{/* Brands Grid */}
			{paginatedBrands.length > 0 ? (
				<>
					<SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
						{paginatedBrands.map((brand) => (
							<BrandCard key={brand.id} brand={brand} />
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
					<IconBuilding size={64} style={{ color: "var(--mantine-color-gray-4)" }} />
					<Text size="lg" fw={500}>
						{search ? "No brands match your search" : "No brands found"}
					</Text>
					<Text c="dimmed" ta="center">
						{search
							? "Try a different search term."
							: "No brands are currently available."
						}
					</Text>
				</Stack>
			)}
		</Stack>
	);
}
