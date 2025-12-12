"use client";

import { Loader, Text, Button, Group, Box } from "@mantine/core";
import { IconRefresh, IconArrowDown } from "@tabler/icons-react";

export interface InfiniteScrollLoaderProps {
	isLoading: boolean;
	hasMore: boolean;
	error?: Error;
	onLoadMore?: () => void;
	loaderRef?: (node: HTMLElement | null) => void;
	autoLoad?: boolean;
}

export function InfiniteScrollLoader({
	isLoading,
	hasMore,
	error,
	onLoadMore,
	loaderRef,
	autoLoad = true,
}: InfiniteScrollLoaderProps) {
	// Don't render anything if no more items and no error
	if (!hasMore && !error && !isLoading) {
		return null;
	}

	// Error state
	if (error) {
		return (
			<Box p="md" ta="center">
				<Text c="red" mb="sm">
					Failed to load more items: {error.message}
				</Text>
				<Button
					variant="light"
					color="red"
					onClick={onLoadMore}
					leftSection={<IconRefresh size={16} />}
				>
					Retry
				</Button>
			</Box>
		);
	}

	// End of items
	if (!hasMore && !isLoading) {
		return (
			<Box p="md" ta="center">
				<Text size="sm" c="dimmed">
					No more items to load
				</Text>
			</Box>
		);
	}

	// Loading state
	if (isLoading) {
		return (
			<Box p="md" ta="center" ref={loaderRef}>
				<Group justify="center" gap="sm">
					<Loader size="sm" />
					<Text size="sm" c="dimmed">
						Loading more items...
					</Text>
				</Group>
			</Box>
		);
	}

	// Has more items but auto-load is disabled - show manual load button
	if (!autoLoad && hasMore) {
		return (
			<Box p="md" ta="center" ref={loaderRef}>
				<Button
					variant="light"
					onClick={onLoadMore}
					leftSection={<IconArrowDown size={16} />}
				>
					Load More
				</Button>
			</Box>
		);
	}

	// Has more items and auto-load is enabled - show scroll indicator
	return (
		<Box p="md" ta="center" ref={loaderRef}>
			<Text size="sm" c="dimmed">
				Scroll to load more items
			</Text>
		</Box>
	);
}