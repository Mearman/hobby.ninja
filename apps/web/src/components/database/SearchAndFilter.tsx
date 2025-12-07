import {
	TextInput,
	Group,
	Button,
	Badge,
	ActionIcon,
	Popover,
	Select,
	MultiSelect,
	ScrollArea,
	Text,
	Divider,
	Stack,
	Loader,
	Box,
	Flex,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import {
	IconSearch,
	IconFilter,
	IconAdjustmentsHorizontal,
	IconHistory,
	IconX,
	IconChevronDown,
} from "@tabler/icons-react";
import React, { useState, useEffect, useCallback, useRef } from "react";

import { dataService, FilterOptions } from "../../services/dataService";

interface SearchAndFilterProps {
  onSearch: (query: string, filters: FilterOptions) => void;
  onFiltersChange: (filters: FilterOptions) => void;
  loading?: boolean;
  initialQuery?: string;
  initialFilters?: FilterOptions;
  placeholder?: string;
  showAdvancedToggle?: boolean;
  onAdvancedToggle?: () => void;
  className?: string;
}

interface SearchSuggestion {
  id: string;
  text: string;
  type: "recent" | "suggestion" | "autocomplete";
  count?: number;
}

export function SearchAndFilter({
	onSearch,
	onFiltersChange,
	loading = false,
	initialQuery = "",
	initialFilters = {},
	placeholder = "Search for kits, series, or grades...",
	showAdvancedToggle = true,
	onAdvancedToggle,
	className,
}: SearchAndFilterProps): React.ReactElement {
	const [query, setQuery] = useState(initialQuery);
	const [debouncedQuery] = useDebouncedValue(query, 300);
	const [filters, setFilters] = useState<FilterOptions>(initialFilters);
	const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
	const [searchHistory, setSearchHistory] = useState<string[]>([]);
	const [suggestionsOpened, setSuggestionsOpened] = useState(false);
	const [quickFiltersOpened, setQuickFiltersOpened] = useState(false);
	const [gradeOptions, setGradeOptions] = useState<string[]>([]);
	const [scaleOptions, setScaleOptions] = useState<string[]>([]);
	const [seriesOptions, setSeriesOptions] = useState<string[]>([]);
	const [loadingOptions, setLoadingOptions] = useState(false);

	const searchInputRef = useRef<HTMLInputElement>(null);

	// Load filter options and search history
	useEffect(() => {
		const loadOptions = async () => {
			try {
				setLoadingOptions(true);
				const [grades, scales, series] = await Promise.all([
					dataService.getFilterOptions("grade"),
					dataService.getFilterOptions("scale"),
					dataService.getFilterOptions("series"),
				]);

				setGradeOptions(grades);
				setScaleOptions(scales);
				setSeriesOptions(series);
			} catch (error) {
				console.error("Failed to load filter options:", error);
			} finally {
				setLoadingOptions(false);
			}
		};

		// Load search history from localStorage
		const history = localStorage.getItem("hobby_db_search_history");
		if (history) {
			try {
				setSearchHistory(JSON.parse(history));
			} catch {
				// Ignore invalid history
			}
		}

		loadOptions();
	}, []);

	// Handle debounced search
	useEffect(() => {
		if (debouncedQuery !== initialQuery) {
			performSearch(debouncedQuery, filters);
			updateSearchHistory(debouncedQuery);
		}
	}, [debouncedQuery]);

	// Update search history
	const updateSearchHistory = (newQuery: string) => {
		if (newQuery.trim().length < 2) return;

		const updatedHistory = [
			newQuery.trim(),
			...searchHistory.filter(item => item !== newQuery.trim()),
		].slice(0, 10); // Keep only 10 most recent

		setSearchHistory(updatedHistory);
		localStorage.setItem("hobby_db_search_history", JSON.stringify(updatedHistory));
	};

	// Perform search
	const performSearch = useCallback((searchQuery: string, searchFilters: FilterOptions) => {
		onSearch(searchQuery, searchFilters);
	}, [onSearch]);

	// Handle query change
	const handleQueryChange = useCallback((value: string) => {
		setQuery(value);

		// Generate suggestions if query is long enough
		if (value.length >= 2) {
			generateSuggestions(value);
		} else {
			setSuggestions([]);
		}
	}, []);

	// Generate search suggestions
	const generateSuggestions = async (input: string) => {
		const suggestions: SearchSuggestion[] = [];

		// Add recent searches
		const recentMatches = searchHistory
			.filter(item => item.toLowerCase().includes(input.toLowerCase()))
			.slice(0, 3)
			.map((text, index) => ({
				id: `recent_${index}`,
				text,
				type: "recent" as const,
			}));

		suggestions.push(...recentMatches);

		// Add autocomplete suggestions (this would typically come from the API)
		// For now, we'll use a mock implementation
		try {
			// In a real implementation, you'd call an autocomplete endpoint
			const mockSuggestions = await generateMockSuggestions(input);
			suggestions.push(...mockSuggestions);
		} catch (error) {
			console.error("Failed to generate suggestions:", error);
		}

		setSuggestions(suggestions);
	};

	// Mock autocomplete suggestions (replace with real API call)
	const generateMockSuggestions = async (input: string): Promise<SearchSuggestion[]> => {
		// Simulate API delay
		await new Promise(resolve => setTimeout(resolve, 100));

		const mockTerms = [
			"Gundam RX-78-2",
			"Strike Freedom",
			"Wing Zero",
			"Unicorn Gundam",
			"Nu Gundam",
			"Sazabi",
		];

		return mockTerms
			.filter(term => term.toLowerCase().includes(input.toLowerCase()))
			.slice(0, 5)
			.map((text, index) => ({
				id: `autocomplete_${index}`,
				text,
				type: "autocomplete" as const,
			}));
	};

	// Handle suggestion selection
	const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
		setQuery(suggestion.text);
		setSuggestionsOpened(false);
		performSearch(suggestion.text, filters);
		updateSearchHistory(suggestion.text);
	};

	// Handle filter changes
	const handleFilterChange = useCallback((newFilters: Partial<FilterOptions>) => {
		const updatedFilters = { ...filters, ...newFilters };
		setFilters(updatedFilters);
		onFiltersChange(updatedFilters);

		// Trigger search with new filters
		if (debouncedQuery || Object.keys(updatedFilters).length > 0) {
			performSearch(debouncedQuery, updatedFilters);
		}
	}, [filters, debouncedQuery, performSearch, onFiltersChange]);

	// Get active filter count
	const getActiveFilterCount = useCallback(() => {
		let count = 0;
		if (filters.grade?.length) count++;
		if (filters.scale?.length) count++;
		if (filters.series?.length) count++;
		if (filters.releaseDateRange) count++;
		if (filters.priceRange) count++;
		if (filters.availability?.length) count++;
		return count;
	}, [filters]);

	// Clear all filters
	const clearAllFilters = useCallback(() => {
		const emptyFilters: FilterOptions = {};
		setFilters(emptyFilters);
		onFiltersChange(emptyFilters);
		if (debouncedQuery) {
			performSearch(debouncedQuery, emptyFilters);
		}
	}, [debouncedQuery, performSearch, onFiltersChange]);

	// Clear search query
	const clearSearch = useCallback(() => {
		setQuery("");
		setSuggestions([]);
		if (Object.keys(filters).length > 0) {
			performSearch("", filters);
		}
	}, [filters, performSearch]);

	// Handle form submission
	const handleSubmit = useCallback((event?: React.FormEvent) => {
		event?.preventDefault();
		performSearch(query, filters);
		updateSearchHistory(query);
		setSuggestionsOpened(false);
	}, [query, filters, performSearch]);

	// Quick filter dropdown
	const quickFilters = (
		<Popover
			opened={quickFiltersOpened}
			onChange={setQuickFiltersOpened}
			width={300}
			position="bottom-end"
			withArrow={true}
			shadow="md"
		>
			<Popover.Target>
				<Button
					variant="light"
					size="sm"
					rightSection={<IconChevronDown size={12} />}
					onClick={() => { setQuickFiltersOpened(!quickFiltersOpened); }}
				>
          Quick Filters
					{getActiveFilterCount() > 0 && (
						<Badge
							size="xs"
							variant="filled"
							ml="xs"
							style={{ position: "absolute", top: -8, right: -8 }}
						>
							{getActiveFilterCount()}
						</Badge>
					)}
				</Button>
			</Popover.Target>

			<Popover.Dropdown>
				<Stack gap="md">
					<Group justify="space-between" align="center">
						<Text size="sm" fw={500}>Quick Filters</Text>
						{getActiveFilterCount() > 0 && (
							<Button
								variant="subtle"
								size="xs"
								onClick={clearAllFilters}
							>
                Clear All
							</Button>
						)}
					</Group>

					<Divider />

					{/* Grade Filter */}
					{loadingOptions ? (
						<Loader size="sm" />
					) : (
						<MultiSelect
							label="Grade"
							placeholder="Select grades..."
							data={gradeOptions}
							value={filters.grade || []}
							onChange={(value) => { handleFilterChange({ grade: value }); }}
							size="xs"
							searchable={true}
							clearable={true}
						/>
					)}

					{/* Scale Filter */}
					{loadingOptions ? (
						<Loader size="sm" />
					) : (
						<MultiSelect
							label="Scale"
							placeholder="Select scales..."
							data={scaleOptions}
							value={filters.scale || []}
							onChange={(value) => { handleFilterChange({ scale: value }); }}
							size="xs"
							searchable={true}
							clearable={true}
						/>
					)}

					{/* Series Filter */}
					{loadingOptions ? (
						<Loader size="sm" />
					) : (
						<MultiSelect
							label="Series"
							placeholder="Select series..."
							data={seriesOptions.slice(0, 20)} // Limit options for performance
							value={filters.series || []}
							onChange={(value) => { handleFilterChange({ series: value }); }}
							size="xs"
							searchable={true}
							clearable={true}
							maxDropdownHeight={200}
						/>
					)}
				</Stack>
			</Popover.Dropdown>
		</Popover>
	);

	return (
		<Box className={className}>
			<form onSubmit={handleSubmit}>
				<Stack gap="md">
					{/* Main search input */}
					<Popover
						opened={suggestionsOpened && suggestions.length > 0}
						onChange={setSuggestionsOpened}
						width="target"
						position="bottom-start"
						withArrow={false}
						shadow="md"
					>
						<Popover.Target>
							<TextInput
								ref={searchInputRef}
								size="lg"
								placeholder={placeholder}
								value={query}
								onChange={(event) => { handleQueryChange(event.currentTarget.value); }}
								onFocus={() => { setSuggestionsOpened(true); }}
								leftSection={<IconSearch size={20} />}
								rightSection={
									<Group gap="xs">
										{loading && <Loader size="sm" />}
										{query && (
											<ActionIcon
												variant="subtle"
												size="sm"
												onClick={clearSearch}
												aria-label="Clear search"
											>
												<IconX size={14} />
											</ActionIcon>
										)}
										<Button
											type="submit"
											size="sm"
											disabled={loading}
											aria-label="Search"
										>
                      Search
										</Button>
									</Group>
								}
								styles={{
									input: {
										fontSize: "1rem",
									},
								}}
								aria-label="Search database"
							/>
						</Popover.Target>

						<Popover.Dropdown p={0}>
							<ScrollArea.Autosize mah={300} type="always">
								<Stack gap={0}>
									{suggestions.map((suggestion) => (
										<Button
											key={suggestion.id}
											variant="subtle"
											justify="start"
											fullWidth={true}
											size="sm"
											onClick={() => { handleSuggestionSelect(suggestion); }}
											leftSection={
												suggestion.type === "recent" ? (
													<IconHistory size={14} />
												) : (
													<IconSearch size={14} />
												)
											}
											styles={{
												inner: {
													justifyContent: "flex-start",
												},
											}}
										>
											<Text size="sm">{suggestion.text}</Text>
											{suggestion.type === "recent" && (
												<Text size="xs" c="dimmed" ml="auto">
                          Recent
												</Text>
											)}
										</Button>
									))}
								</Stack>
							</ScrollArea.Autosize>
						</Popover.Dropdown>
					</Popover>

					{/* Filter controls */}
					<Flex justify="space-between" align="center" gap="md">
						<Group gap="sm">
							{quickFilters}

							{/* Data source filter */}
							<Select
								placeholder="Data Source"
								data={[
									{ value: "unified", label: "All Sources" },
									{ value: "manual", label: "Manuals Only" },
									{ value: "catalog", label: "Catalog Only" },
								]}
								value={filters.dataSource as any || "unified"}
								onChange={(value) => { handleFilterChange({ dataSource: value as any }); }}
								size="xs"
								w={120}
								clearable={true}
							/>

							{/* Sort options */}
							<Select
								placeholder="Sort by"
								data={[
									{ value: "relevance_desc", label: "Relevance" },
									{ value: "name_asc", label: "Name (A-Z)" },
									{ value: "name_desc", label: "Name (Z-A)" },
									{ value: "releaseDate_desc", label: "Newest First" },
									{ value: "releaseDate_asc", label: "Oldest First" },
								]}
								value={`${filters.sort?.field || "relevance"}_${filters.sort?.direction || "desc"}`}
								onChange={(value) => {
									if (value) {
										const [field, direction] = value.split("_");
										handleFilterChange({
											sort: { field: field as any, direction: direction as any },
										});
									}
								}}
								size="xs"
								w={120}
								clearable={true}
							/>
						</Group>

						<Group gap="sm">
							{showAdvancedToggle && onAdvancedToggle && (
								<Button
									variant="outline"
									size="xs"
									leftSection={<IconAdjustmentsHorizontal size={14} />}
									onClick={onAdvancedToggle}
								>
                  Advanced
								</Button>
							)}
						</Group>
					</Flex>

					{/* Active filters display */}
					{getActiveFilterCount() > 0 && (
						<Group gap="xs">
							<Text size="xs" c="dimmed">Active filters:</Text>
							{filters.grade?.map(grade => (
								<Badge
									key={grade}
									size="xs"
									variant="light"
									rightSection={
										<ActionIcon
											size="xs"
											onClick={() => {
												const newGrades = filters.grade?.filter(g => g !== grade) || [];
												handleFilterChange({ grade: newGrades });
											}}
										>
											<IconX size={8} />
										</ActionIcon>
									}
								>
									{grade}
								</Badge>
							))}
							{filters.scale?.map(scale => (
								<Badge
									key={scale}
									size="xs"
									variant="light"
									rightSection={
										<ActionIcon
											size="xs"
											onClick={() => {
												const newScales = filters.scale?.filter(s => s !== scale) || [];
												handleFilterChange({ scale: newScales });
											}}
										>
											<IconX size={8} />
										</ActionIcon>
									}
								>
									{scale}
								</Badge>
							))}
							{filters.series?.map(series => (
								<Badge
									key={series}
									size="xs"
									variant="light"
									rightSection={
										<ActionIcon
											size="xs"
											onClick={() => {
												const newSeries = filters.series?.filter(s => s !== series) || [];
												handleFilterChange({ series: newSeries });
											}}
										>
											<IconX size={8} />
										</ActionIcon>
									}
								>
									{series}
								</Badge>
							))}
						</Group>
					)}
				</Stack>
			</form>
		</Box>
	);
}