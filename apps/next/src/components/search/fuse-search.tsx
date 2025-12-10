"use client";

import { Badge } from "@/components/ui/badge";

import {
	TextInput,
	Group,
	Stack,
	Card,
	Text,
	// Badge removed,
	ActionIcon,
	Loader,
	ScrollArea,
	Divider,
	Flex,
	Box,
} from "@mantine/core";
import {
	IconSearch,
	IconX,
	IconClock,
	IconFilter,
} from "@tabler/icons-react";
import React, { useState, useEffect, useCallback, useMemo } from "react";

import { useSearch, type SearchResult, type SearchOptions } from "@/lib/fuse-search";
import { getNodeDisplayName } from "@/lib/schemas";

interface FuseSearchProps {
  onResultClick?: (result: SearchResult) => void;
  placeholder?: string;
  maxResults?: number;
  showFilters?: boolean;
  className?: string;
}

export function FuseSearch({
	onResultClick,
	placeholder = "Search items, brands, series...",
	maxResults = 10,
	showFilters = true,
	className,
}: FuseSearchProps) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [recentSearches, setRecentSearches] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [debouncedQuery, setDebouncedQuery] = useState("");

	const { isInitialized, search, getSuggestions, getStats } = useSearch();

	// Debounce search input
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(query);
		}, 300);

		return () => { clearTimeout(timer); };
	}, [query]);

	// Load recent searches from localStorage
	useEffect(() => {
		const saved = localStorage.getItem("recent-searches");
		if (saved) {
			try {
				const parsed = JSON.parse(saved) as string[];
				if (Array.isArray(parsed)) {
					setRecentSearches(parsed);
				}
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error("Failed to parse recent searches:", errorMessage);
			}
		}
	}, []);

	// Save recent searches to localStorage
	const saveRecentSearch = useCallback((searchQuery: string) => {
		const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
		setRecentSearches(updated);
		localStorage.setItem("recent-searches", JSON.stringify(updated));
	}, [recentSearches]);

	// Perform search when debounced query changes
	useEffect(() => {
		if (!isInitialized || debouncedQuery.length < 2) {
			setResults([]);
			setSuggestions([]);
			return;
		}

		setIsLoading(true);

		const performSearch = async () => {
			try {
				const options: SearchOptions = { limit: maxResults * 2 };
				const searchResults = search(debouncedQuery, options);
				const searchSuggestions = getSuggestions(debouncedQuery, 5);

				setResults(searchResults);
				setSuggestions(searchSuggestions);
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error("Search error:", errorMessage);
				setResults([]);
				setSuggestions([]);
			} finally {
				setIsLoading(false);
			}
		};

		performSearch();
	}, [debouncedQuery, isInitialized, maxResults]); // Remove search and getSuggestions from deps

	// Handle search input
	const handleInputChange = useCallback((value: string) => {
		setQuery(value);
		setShowSuggestions(true);
	}, []);

	// Handle search submission
	const handleSearch = useCallback((searchQuery: string = query) => {
		if (searchQuery.trim()) {
			saveRecentSearch(searchQuery.trim());
			setShowSuggestions(false);
		}
	}, [query, saveRecentSearch]);

	// Handle result click
	const handleResultClick = useCallback((result: SearchResult) => {
		handleSearch();
		onResultClick?.(result);
	}, [handleSearch, onResultClick]);

	// Handle suggestion click
	const handleSuggestionClick = useCallback((suggestion: string) => {
		setQuery(suggestion);
		handleSearch(suggestion);
	}, [handleSearch]);

	// Handle recent search click
	const handleRecentSearchClick = useCallback((recentQuery: string) => {
		setQuery(recentQuery);
		handleSearch(recentQuery);
	}, [handleSearch]);

	// Clear search
	const handleClear = useCallback(() => {
		setQuery("");
		setResults([]);
		setSuggestions([]);
		setShowSuggestions(false);
	}, []);

	// Format price for display
	const formatPrice = useCallback((price?: { amount: number; currency: string }) => {
		if (!price) return "";
		return new Intl.NumberFormat("ja-JP", {
			style: "currency",
			currency: price.currency || "JPY",
		}).format(price.amount);
	}, []);

	// Get search stats for display
	const searchStats = useMemo(() => {
		if (!isInitialized) return null;
		try {
			return getStats();
		} catch {
			return null;
		}
	}, [isInitialized, getStats]);

	if (!isInitialized) {
		return (
			<Card p="md" radius="md" withBorder={true}>
				<Flex justify="center" align="center" py="xl">
					<Loader size="sm" />
					<Text ml="sm" size="sm" c="dimmed">
            Initializing search...
					</Text>
				</Flex>
			</Card>
		);
	}

	return (
		<Card p="md" radius="md" withBorder={true} className={className}>
			<Stack gap="md">
				{/* Search Input */}
				<Group gap="sm">
					<TextInput
						flex={1}
						placeholder={placeholder}
						value={query}
						onChange={(e) => { handleInputChange(e.target.value); }}
						onFocus={() => { setShowSuggestions(true); }}
						onBlur={() => setTimeout(() => { setShowSuggestions(false); }, 200)}
						leftSection={<IconSearch size={16} />}
						rightSection={
							query && (
								<ActionIcon size="sm" variant="subtle" onClick={handleClear}>
									<IconX size={14} />
								</ActionIcon>
							)
						}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleSearch();
							}
						}}
					/>
					{showFilters && (
						<ActionIcon variant="light" title="Advanced filters">
							<IconFilter size={16} />
						</ActionIcon>
					)}
				</Group>

				{/* Loading State */}
				{isLoading && (
					<Flex justify="center" py="md">
						<Loader size="sm" />
					</Flex>
				)}

				{/* Search Results */}
				{results.length > 0 && (
					<Stack gap="xs">
						<Group justify="space-between" mb="xs">
							<Text size="sm" fw={500}>
                Search Results ({results.length})
							</Text>
							<Text size="xs" c="dimmed">
                Best matches first
							</Text>
						</Group>
						<ScrollArea.Autosize mah={400}>
							<Stack gap="xs">
								{results.slice(0, maxResults).map((result, index) => (
									<Card
										key={`${result.item.id}-${index}`}
										p="sm"
										radius="md"
										withBorder={true}
										style={{ cursor: "pointer" }}
										onClick={() => { handleResultClick(result); }}
										onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
											e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-0)";
										}}
										onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
											e.currentTarget.style.backgroundColor = "transparent";
										}}
									>
										<Stack gap="xs">
											<Group justify="space-between" align="start">
												<Box flex={1}>
													<Text size="sm" fw={500} lineClamp={1}>
														{getNodeDisplayName(result.item)}
													</Text>
													{result.item.series && (
														<Text size="xs" c="dimmed" lineClamp={1}>
															{result.item.series}
														</Text>
													)}
												</Box>
												{result.item.price && (
													<Text size="sm" fw={500} c="blue">
														{formatPrice(result.item.price)}
													</Text>
												)}
											</Group>

											<Group gap="xs" wrap="wrap">
												{result.item.grade && (
													<Badge size="xs" variant="light">
														{result.item.grade}
													</Badge>
												)}
												{result.item.scale && (
													<Badge size="xs" variant="outline">
														{result.item.scale}
													</Badge>
												)}
												{result.item.brand && (
													<Badge size="xs" variant="light" c="gray">
														{result.item.brand}
													</Badge>
												)}
											</Group>

											{/* Match confidence indicator */}
											<Group gap="xs" align="center">
												<Text size="xs" c="dimmed">
													{Math.round((1 - result.score) * 100)}% match
												</Text>
												{result.score < 0.3 && (
													<Badge size="xs" color="green" variant="light">
                            Excellent match
													</Badge>
												)}
											</Group>
										</Stack>
									</Card>
								))}
							</Stack>
						</ScrollArea.Autosize>
					</Stack>
				)}

				{/* Suggestions */}
				{showSuggestions && suggestions.length > 0 && results.length === 0 && query.length >= 2 && (
					<Stack gap="xs">
						<Text size="xs" c="dimmed" fw={500}>
              Suggestions
						</Text>
						{suggestions.map((suggestion, index) => (
							<Card
								key={`suggestion-${index}`}
								p="xs"
								radius="sm"
								withBorder={true}
								style={{ cursor: "pointer" }}
								onClick={() => { handleSuggestionClick(suggestion); }}
								onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
									e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-0)";
								}}
								onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
									e.currentTarget.style.backgroundColor = "transparent";
								}}
							>
								<Text size="sm">{suggestion}</Text>
							</Card>
						))}
					</Stack>
				)}

				{/* Recent Searches */}
				{showSuggestions && recentSearches.length > 0 && query.length < 2 && (
					<Stack gap="xs">
						<Group justify="space-between" align="center">
							<Text size="xs" c="dimmed" fw={500}>
								<IconClock size={12} style={{ marginRight: 4 }} />
                Recent Searches
							</Text>
							{recentSearches.length > 0 && (
								<ActionIcon
									size="xs"
									variant="subtle"
									onClick={() => {
										setRecentSearches([]);
										localStorage.removeItem("recent-searches");
									}}
								>
									<IconX size={10} />
								</ActionIcon>
							)}
						</Group>
						{recentSearches.map((recentQuery, index) => (
							<Card
								key={`recent-${index}`}
								p="xs"
								radius="sm"
								withBorder={true}
								style={{ cursor: "pointer" }}
								onClick={() => { handleRecentSearchClick(recentQuery); }}
								onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
									e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-0)";
								}}
								onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
									e.currentTarget.style.backgroundColor = "transparent";
								}}
							>
								<Group gap="xs">
									<IconClock size={12} color="var(--mantine-color-gray-5)" />
									<Text size="sm">{recentQuery}</Text>
								</Group>
							</Card>
						))}
					</Stack>
				)}

				{/* Search Stats */}
				{searchStats && !isLoading && query.length < 2 && (
					<>
						<Divider />
						<Group gap="lg">
							<Text size="xs" c="dimmed">
								<strong>{searchStats.totalItems.toLocaleString()}</strong> items
							</Text>
							<Text size="xs" c="dimmed">
								<strong>{searchStats.brands.length}</strong> brands
							</Text>
							<Text size="xs" c="dimmed">
								<strong>{searchStats.series.length}</strong> series
							</Text>
							<Text size="xs" c="dimmed">
								<strong>{searchStats.grades.length}</strong> grades
							</Text>
						</Group>
					</>
				)}

				{/* No Results */}
				{!isLoading && query.length >= 2 && results.length === 0 && suggestions.length === 0 && (
					<Stack align="center" py="md">
						<IconSearch size={48} color="var(--mantine-color-gray-4)" />
						<Text size="lg" c="dimmed">
              No results found
						</Text>
						<Text size="sm" c="dimmed" ta="center">
              Try different keywords or check your spelling
						</Text>
					</Stack>
				)}
			</Stack>
		</Card>
	);
}