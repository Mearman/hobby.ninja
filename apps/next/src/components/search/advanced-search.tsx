"use client";

import { getGradeById, getNodeDisplayName } from "@hobby-ninja/data";
import {
	TextInput,
	MultiSelect,
	RangeSlider,
	Group,
	Stack,
	Card,
	Button,
	ActionIcon,
	Text,
	Divider,
	Collapse,
	Badge,
} from "@mantine/core";
import {
	IconSearch,
	IconX,
	IconChevronDown,
	IconChevronUp,
} from "@tabler/icons-react";
import React, { useState, useCallback } from "react";

import { useSearch, type SearchResult, type SearchFilters, type SearchStats } from "@/lib/fuse-search";
import { getBrandImage, getGradeImage, getSeriesImage } from "@/lib/image-lookup";

function formatGradeName(id: string): string {
	const grade = getGradeById(id);
	return grade ? getNodeDisplayName(grade) : id;
}

interface AdvancedSearchProps {
  onSearch: (results: SearchResult[]) => void;
  loading?: boolean;
}

export function AdvancedSearch({ onSearch, loading }: AdvancedSearchProps) {
	const [query, setQuery] = useState("");
	const [showFilters, setShowFilters] = useState(false);
	const [filters, setFilters] = useState<SearchFilters>({
		brands: [],
		categories: [],
		series: [],
		grades: [],
		scales: [],
		minPrice: 1000,
		maxPrice: 50_000,
		minYear: 1980,
		maxYear: 2024,
	});

	const { advancedSearch, getStats } = useSearch();
	const [stats, setStats] = useState<SearchStats | null>(null);

	// Load stats for filter options
	React.useEffect(() => {
		try {
			const searchStats = getStats();
			setStats(searchStats);
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("Failed to load search stats:", errorMessage);
		}
	}, [getStats]);

	const handleSearch = useCallback(() => {
		if (query.trim() || filters.brands?.length || filters.categories?.length) {
			const results = advancedSearch(query, filters);
			onSearch(results);
		}
	}, [query, filters, advancedSearch, onSearch]);

	const handleClear = useCallback(() => {
		setQuery("");
		setFilters({
			brands: [],
			categories: [],
			series: [],
			grades: [],
			scales: [],
			minPrice: 1000,
			maxPrice: 50_000,
			minYear: 1980,
			maxYear: 2024,
		});
		onSearch([]);
	}, [onSearch]);

	const formatPrice = useCallback((value: number) => {
		return `¥${value.toLocaleString()}`;
	}, []);

	return (
		<Card p="md" radius="md" withBorder={true}>
			<Stack gap="md">
				{/* Search Input */}
				<Group gap="sm">
					<TextInput
						flex={1}
						placeholder="Search for items, brands, series..."
						value={query}
						onChange={(e) => { setQuery(e.target.value); }}
						leftSection={<IconSearch size={16} />}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleSearch();
							}
						}}
					/>
					<ActionIcon
						variant={showFilters ? "filled" : "light"}
						onClick={() => { setShowFilters(!showFilters); }}
						title="Toggle filters"
					>
						{showFilters ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
					</ActionIcon>
				</Group>

				{/* Advanced Filters */}
				<Collapse in={showFilters}>
					<Stack gap="md" mt="md">
						<Divider />

						{stats && (
							<>
								{/* Brand Filter */}
								<MultiSelect
									label="Brands"
									placeholder="Select brands"
									data={stats.brands.map((brand) => ({
										value: brand,
										label: brand,
									}))}
									value={filters.brands}
									onChange={(value) => { setFilters(prev => ({ ...prev, brands: value })); }}
									searchable={true}
									clearable={true}
									renderOption={({ option }) => (
										<Group gap="xs">
											{getBrandImage(option.value) && (
												<img
													src={getBrandImage(option.value)}
													alt=""
													style={{ width: 16, height: 16, objectFit: "contain" }}
												/>
											)}
											<span>{option.label}</span>
										</Group>
									)}
								/>

								{/* Category Filter */}
								<MultiSelect
									label="Categories"
									placeholder="Select categories"
									data={stats.categories.map((category) => ({
										value: category,
										label: category,
									}))}
									value={filters.categories}
									onChange={(value) => { setFilters(prev => ({ ...prev, categories: value })); }}
									searchable={true}
									clearable={true}
								/>

								{/* Series Filter */}
								<MultiSelect
									label="Series"
									placeholder="Select series"
									data={stats.series.map((series) => ({
										value: series,
										label: series,
									}))}
									value={filters.series}
									onChange={(value) => { setFilters(prev => ({ ...prev, series: value })); }}
									searchable={true}
									clearable={true}
									maxValues={5}
									renderOption={({ option }) => (
										<Group gap="xs">
											{getSeriesImage(option.value) && (
												<img
													src={getSeriesImage(option.value)}
													alt=""
													style={{ width: 16, height: 16, objectFit: "contain" }}
												/>
											)}
											<span>{option.label}</span>
										</Group>
									)}
								/>

								{/* Grade Filter */}
								<MultiSelect
									label="Grades"
									placeholder="Select grades"
									data={stats.grades.map((grade) => ({
										value: grade,
										label: grade,
									}))}
									value={filters.grades}
									onChange={(value) => { setFilters(prev => ({ ...prev, grades: value })); }}
									searchable={true}
									clearable={true}
								/>

								{/* Scale Filter */}
								<MultiSelect
									label="Scales"
									placeholder="Select scales"
									data={stats.scales.map((scale) => ({
										value: scale,
										label: scale,
									}))}
									value={filters.scales}
									onChange={(value) => { setFilters(prev => ({ ...prev, scales: value })); }}
									searchable={true}
									clearable={true}
								/>

								{/* Price Range */}
								<div>
									<Group justify="space-between" mb="xs">
										<Text size="sm">Price Range</Text>
										<Text size="sm" fw={500}>
											{formatPrice(filters.minPrice ?? 0)} - {formatPrice(filters.maxPrice ?? 100_000)}
										</Text>
									</Group>
									<RangeSlider
										min={0}
										max={100_000}
										step={1000}
										value={[filters.minPrice ?? 0, filters.maxPrice ?? 100_000]}
										onChange={(value) => { setFilters(prev => ({
											...prev,
											minPrice: value[0],
											maxPrice: value[1],
										})); }}
										marks={[
											{ value: 0, label: "¥0" },
											{ value: 10_000, label: "¥10k" },
											{ value: 25_000, label: "¥25k" },
											{ value: 50_000, label: "¥50k" },
											{ value: 100_000, label: "¥100k" },
										]}
									/>
								</div>

								{/* Year Range */}
								<div>
									<Group justify="space-between" mb="xs">
										<Text size="sm">Release Year</Text>
										<Text size="sm" fw={500}>
											{filters.minYear ?? 1980} - {filters.maxYear ?? 2024}
										</Text>
									</Group>
									<RangeSlider
										min={1980}
										max={2024}
										value={[filters.minYear ?? 1980, filters.maxYear ?? 2024]}
										onChange={(value) => { setFilters(prev => ({
											...prev,
											minYear: value[0],
											maxYear: value[1],
										})); }}
										marks={[
											{ value: 1980, label: "1980" },
											{ value: 1990, label: "1990" },
											{ value: 2000, label: "2000" },
											{ value: 2010, label: "2010" },
											{ value: 2020, label: "2020" },
											{ value: 2024, label: "2024" },
										]}
									/>
								</div>
							</>
						)}
					</Stack>
				</Collapse>

				{/* Active Filters Display */}
				{(query.trim() ||
					(filters.brands?.length ?? 0) > 0 ||
					(filters.categories?.length ?? 0) > 0 ||
					(filters.series?.length ?? 0) > 0 ||
					(filters.grades?.length ?? 0) > 0 ||
					(filters.scales?.length ?? 0) > 0) && (
					<Group gap="xs" wrap="wrap">
						{query.trim() && (
							<Badge size="sm" variant="light" color="blue">
								&ldquo;{query}&rdquo;
							</Badge>
						)}
						{filters.brands?.map(brand => (
							<Badge key={brand} size="sm" variant="light" leftSection={
								getBrandImage(brand) ? (
									<img src={getBrandImage(brand)} alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />
								) : null
							}>
								{brand}
							</Badge>
						))}
						{filters.categories?.map(category => (
							<Badge key={category} size="sm" variant="light" color="green">
								{category}
							</Badge>
						))}
						{filters.series?.map(serie => (
							<Badge key={serie} size="sm" variant="light" color="orange" leftSection={
								getSeriesImage(serie) ? (
									<img src={getSeriesImage(serie)} alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />
								) : null
							}>
								{serie}
							</Badge>
						))}
						{filters.grades?.map(grade => (
							<Badge key={grade} size="sm" variant="light" color="purple" leftSection={
								getGradeImage(grade) ? (
									<img src={getGradeImage(grade)} alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />
								) : null
							}>
								{formatGradeName(grade)}
							</Badge>
						))}
						{filters.scales?.map(scale => (
							<Badge key={scale} size="sm" variant="light" color="cyan">
								{scale}
							</Badge>
						))}
					</Group>
				)}

				{/* Action Buttons */}
				<Group justify="space-between">
					<Button
						onClick={handleSearch}
						loading={loading}
						leftSection={<IconSearch size={16} />}
					>
            Search
					</Button>
					<Button
						variant="subtle"
						onClick={handleClear}
						leftSection={<IconX size={16} />}
					>
            Clear All
					</Button>
				</Group>
			</Stack>
		</Card>
	);
}