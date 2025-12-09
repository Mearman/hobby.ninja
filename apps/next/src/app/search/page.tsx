"use client";

import {
	Title,
	Text,
	Container,
	Grid,
	Box,
	Stack,
} from "@mantine/core";
import React from "react";
import FuseSearch from "@/components/search/fuse-search";
import type { SearchResult } from "@/lib/fuse-search";

export default function SearchPage() {
	const handleResultClick = (result: SearchResult) => {
		// Navigate to the item detail page
		window.location.href = `/item/${result.item.id}`;
	};

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
            Advanced Search
					</Title>
					<Text size="lg" c="dimmed">
            Search through our comprehensive database with instant results
					</Text>
				</Box>

				<Grid>
					{/* Search Interface */}
					<Grid.Col span={{ base: 12, lg: 8, xl: 6 }} offset={{ xl: 1 }}>
						<FuseSearch
							onResultClick={handleResultClick}
							placeholder="Search for Gundam models, brands, series..."
							maxResults={20}
							showFilters={false}
						/>
					</Grid.Col>
				</Grid>
			</Stack>
		</Container>
	);
}