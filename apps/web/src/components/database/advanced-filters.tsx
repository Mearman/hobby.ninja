import {
	Modal,
	Stack,
	Group,
	Title,
	Text,
	Button,
	MultiSelect,
	Select,
	NumberInput,
	RangeSlider,
	Accordion,
	Badge,
	ActionIcon,
	ScrollArea,
	Alert,
	TextInput,
	Grid,
	Card,
	Flex,
} from "@mantine/core";
import {
	IconX,
	IconDeviceFloppy,
	IconShare,
	IconFilter,
	IconRefresh,
	IconInfoCircle,
	IconDownload,
	IconUpload,
} from "@tabler/icons-react";
import React, { useState, useEffect, useCallback } from "react";

import { FilterOptions, FilterPreset } from "../../services/dataService";

 
const globalAlert = alert;
 
const globalBtoa = btoa;

interface AdvancedFiltersProps {
  opened: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onApply: () => void;
  className?: string;
}

interface FilterPresetForm {
  name: string;
  description: string;
  isPublic: boolean;
}

export function AdvancedFilters({
	opened,
	onClose,
	filters,
	onFiltersChange,
	onApply,
	className,
}: AdvancedFiltersProps): React.ReactElement {
	const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);
	const [presets, setPresets] = useState<FilterPreset[]>([]);
	const [loadingPresets, setLoadingPresets] = useState(false);
	const [presetForm, setPresetForm] = useState<FilterPresetForm>({
		name: "",
		description: "",
		isPublic: false,
	});
	const [showPresetForm, setShowPresetForm] = useState(false);
	const [gradeOptions, setGradeOptions] = useState<string[]>([]);
	const [scaleOptions, setScaleOptions] = useState<string[]>([]);
	const [seriesOptions, setSeriesOptions] = useState<string[]>([]);
	const [loadingOptions, setLoadingOptions] = useState(false);

	// Load filter options and presets when modal opens
	useEffect(() => {
		if (opened) {
			loadOptions();
			loadPresets();
		}
	}, [opened]);

	// Update local filters when props change
	useEffect(() => {
		setLocalFilters(filters);
	}, [filters]);

	// Load filter options
	const loadOptions = async () => {
		try {
			setLoadingOptions(true);
			// In a real app, these would come from the dataService
			const mockGrades = ["HG", "MG", "RG", "PG", "RE", "SD", "EG", "BB", "MGSD"];
			const mockScales = ["1/144", "1/100", "1/60", "1/48", "1/72", "1/550", "1/144 (SD)"];
			const mockSeries = [
				"Mobile Suit Gundam",
				"Zeta Gundam",
				"Gundam ZZ",
				"Char's Counterattack",
				"Gundam SEED",
				"Gundam 00",
				"Gundam Wing",
				"Gundam Build Fighters",
				"Iron-Blooded Orphans",
				"The Witch from Mercury",
			];

			setGradeOptions(mockGrades);
			setScaleOptions(mockScales);
			setSeriesOptions(mockSeries);
		} catch (error) {
			console.error("Failed to load filter options:", error);
		} finally {
			setLoadingOptions(false);
		}
	};

	// Load filter presets
	const loadPresets = async () => {
		try {
			setLoadingPresets(true);
			// In a real app, these would come from the dataService
			const mockPresets: FilterPreset[] = [
				{
					id: "recent_releases",
					name: "Recent Releases",
					description: "Items from the last 2 years",
					filters: {
						releaseDateRange: {
							start: new Date().getFullYear() - 2,
							end: new Date().getFullYear(),
						},
					},
					createdBy: "system",
					isPublic: true,
					useCount: 0,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				{
					id: "master_grade",
					name: "Master Grade Collection",
					description: "All Master Grade model kits",
					filters: {
						grade: ["MG"],
						scale: ["1/100"],
					},
					createdBy: "system",
					isPublic: true,
					useCount: 0,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			];

			setPresets(mockPresets);
		} catch (error) {
			console.error("Failed to load presets:", error);
		} finally {
			setLoadingPresets(false);
		}
	};

	// Handle filter changes
	const handleFilterChange = useCallback((newFilters: Partial<FilterOptions>) => {
		setLocalFilters(prev => ({ ...prev, ...newFilters }));
	}, []);

	// Apply filters
	const handleApply = () => {
		onFiltersChange(localFilters);
		onApply();
		onClose();
	};

	// Reset filters
	const handleReset = () => {
		setLocalFilters({});
	};

	// Save preset
	const handleSavePreset = async () => {
		if (!presetForm.name.trim()) return;

		const newPreset: FilterPreset = {
			id: `custom_${Date.now()}`,
			name: presetForm.name,
			description: presetForm.description,
			filters: localFilters,
			createdBy: "user",
			isPublic: presetForm.isPublic,
			useCount: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		try {
			// In a real app, save via dataService
			setPresets(prev => [...prev, newPreset]);
			setShowPresetForm(false);
			setPresetForm({ name: "", description: "", isPublic: false });
		} catch (error) {
			console.error("Failed to save preset:", error);
		}
	};

	// Load preset
	const handleLoadPreset = (preset: FilterPreset) => {
		setLocalFilters(preset.filters);
	};

	// Delete preset
	const handleDeletePreset = async (presetId: string) => {
		try {
			// In a real app, delete via dataService
			setPresets(prev => prev.filter(p => p.id !== presetId));
		} catch (error) {
			console.error("Failed to delete preset:", error);
		}
	};

	// Share filters via URL
	const handleShareFilters = () => {
		try {
			// Compress and encode filters for URL
			const filterString = JSON.stringify(localFilters);
			const compressed = globalBtoa(filterString);
			const shareUrl = `${globalThis.location.origin}${globalThis.location.pathname}?filters=${compressed}`;

			// Copy to clipboard
			navigator.clipboard.writeText(shareUrl).then(() => {
				// Show success notification
				globalAlert("Share URL copied to clipboard!");
			}).catch(() => {
				// Fallback: show URL in alert
				globalAlert(`Share URL: ${shareUrl}`);
			});
		} catch (error) {
			console.error("Failed to create share URL:", error);
			globalAlert("Failed to create share URL");
		}
	};

	// Export filters
	const handleExportFilters = () => {
		const filterData = {
			filters: localFilters,
			exportedAt: new Date().toISOString(),
			version: "1.0",
		};

		const blob = new Blob([JSON.stringify(filterData, null, 2)], {
			type: "application/json",
		});

		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `filters_${new Date().toISOString().split("T")[0]}.json`;
		document.body.append(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	};

	// Import filters
	const handleImportFilters = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		try {
			const content = await file.text();
			const data = JSON.parse(content);

			if (data.filters) {
				setLocalFilters(data.filters);
			}
		} catch (error) {
			console.error("Failed to import filters:", error);
			globalAlert("Failed to import filters from file");
		}
	};

	// Get active filter count
	const getActiveFilterCount = () => {
		let count = 0;
		if (localFilters.grade?.length) count++;
		if (localFilters.scale?.length) count++;
		if (localFilters.series?.length) count++;
		if (localFilters.releaseDateRange) count++;
		if (localFilters.priceRange) count++;
		if (localFilters.availability?.length) count++;
		if (localFilters.dataSource) count++;
		if (localFilters.sort) count++;
		return count;
	};

	return (
		<Modal
			opened={opened}
			onClose={onClose}
			size="xl"
			title={<Title order={3}>Advanced Filters</Title>}
			className={className}
			keepMounted={false}
		>
			<ScrollArea.Autosize mah="70vh">
				<Stack gap="lg">
					{/* Filter presets section */}
					<Card withBorder={true} p="md">
						<Group justify="space-between" align="center" mb="md">
							<Title order={4}>Filter Presets</Title>
							<Group gap="xs">
								<Button
									variant="outline"
									size="xs"
									leftSection={<IconUpload size={12} />}
									component="label"
								>
                  Import
									<input
										type="file"
										accept=".json"
										onChange={handleImportFilters}
										style={{ display: "none" }}
									/>
								</Button>
								<Button
									variant="outline"
									size="xs"
									leftSection={<IconDeviceFloppy size={12} />}
									onClick={() => { setShowPresetForm(true); }}
								>
                  Save Current
								</Button>
							</Group>
						</Group>

						{showPresetForm && (
							<Card withBorder={true} p="sm" mb="md" bg="gray.0">
								<Stack gap="sm">
									<TextInput
										placeholder="Preset name..."
										value={presetForm.name}
										onChange={(e) => { setPresetForm(prev => ({
											...prev,
											name: e.target.value,
										})); }}
										size="sm"
									/>
									<TextInput
										placeholder="Description (optional)..."
										value={presetForm.description}
										onChange={(e) => { setPresetForm(prev => ({
											...prev,
											description: e.target.value,
										})); }}
										size="sm"
									/>
									<Group gap="sm">
										<Button
											size="xs"
											onClick={handleSavePreset}
											disabled={!presetForm.name.trim()}
										>
                      Save
										</Button>
										<Button
											variant="outline"
											size="xs"
											onClick={() => { setShowPresetForm(false); }}
										>
                      Cancel
										</Button>
									</Group>
								</Stack>
							</Card>
						)}

						{loadingPresets ? (
							<Text size="sm" c="dimmed">Loading presets...</Text>
						) : (
							<ScrollArea.Autosize mah={200}>
								<Group gap="sm">
									{presets.map((preset) => (
										<Card
											key={preset.id}
											p="xs"
											withBorder={true}
											style={{ cursor: "pointer" }}
											onClick={() => { handleLoadPreset(preset); }}
										>
											<Stack gap={0}>
												<Group justify="space-between" align="center">
													<Text size="sm" fw={500}>{preset.name}</Text>
													<ActionIcon
														size="xs"
														variant="subtle"
														onClick={(e) => {
															e.stopPropagation();
															handleDeletePreset(preset.id);
														}}
													>
														<IconX size={10} />
													</ActionIcon>
												</Group>
												{preset.description && (
													<Text size="xs" c="dimmed">{preset.description}</Text>
												)}
												<Group gap="xs">
													{preset.isPublic && (
														<Badge size="xs" variant="light">Public</Badge>
													)}
													<Badge size="xs" variant="outline">
														{Object.keys(preset.filters).length} filters
													</Badge>
												</Group>
											</Stack>
										</Card>
									))}
								</Group>
							</ScrollArea.Autosize>
						)}
					</Card>

					{/* Filter options */}
					<Accordion variant="separated" multiple={true} defaultValue={["basic", "dates", "pricing"]}>
						{/* Basic filters */}
						<Accordion.Item value="basic">
							<Accordion.Control icon={<IconFilter size={16} />}>
                Basic Filters
								<Badge size="xs" ml="xs" variant="light">
									{(localFilters.grade?.length || 0) + (localFilters.scale?.length || 0) + (localFilters.series?.length || 0)} active
								</Badge>
							</Accordion.Control>
							<Accordion.Panel>
								<Grid>
									<Grid.Col span={{ base: 12, sm: 6 }}>
										<MultiSelect
											label="Grade"
											placeholder="Select grades..."
											data={gradeOptions}
											value={localFilters.grade || []}
											onChange={(value) => { handleFilterChange({ grade: value }); }}
											searchable={true}
											clearable={true}
											disabled={loadingOptions}
										/>
									</Grid.Col>
									<Grid.Col span={{ base: 12, sm: 6 }}>
										<MultiSelect
											label="Scale"
											placeholder="Select scales..."
											data={scaleOptions}
											value={localFilters.scale || []}
											onChange={(value) => { handleFilterChange({ scale: value }); }}
											searchable={true}
											clearable={true}
											disabled={loadingOptions}
										/>
									</Grid.Col>
									<Grid.Col span={12}>
										<MultiSelect
											label="Series"
											placeholder="Select series..."
											data={seriesOptions}
											value={localFilters.series || []}
											onChange={(value) => { handleFilterChange({ series: value }); }}
											searchable={true}
											clearable={true}
											maxDropdownHeight={200}
											disabled={loadingOptions}
										/>
									</Grid.Col>
								</Grid>
							</Accordion.Panel>
						</Accordion.Item>

						{/* Date filters */}
						<Accordion.Item value="dates">
							<Accordion.Control icon={<IconInfoCircle size={16} />}>
                Date & Release Filters
								{localFilters.releaseDateRange && (
									<Badge size="xs" ml="xs" variant="light">Active</Badge>
								)}
							</Accordion.Control>
							<Accordion.Panel>
								<Grid>
									<Grid.Col span={{ base: 12, sm: 6 }}>
										<NumberInput
											label="Release Year From"
											placeholder="e.g., 2020"
											min={1970}
											max={new Date().getFullYear() + 5}
											value={localFilters.releaseDateRange?.start}
											onChange={(value) => { handleFilterChange({
												releaseDateRange: {
													...localFilters.releaseDateRange,
													start: typeof value === "number" ? value : value ? Number.parseInt(value, 10) || undefined : undefined,
												},
											}); }}
										/>
									</Grid.Col>
									<Grid.Col span={{ base: 12, sm: 6 }}>
										<NumberInput
											label="Release Year To"
											placeholder="e.g., 2024"
											min={1970}
											max={new Date().getFullYear() + 5}
											value={localFilters.releaseDateRange?.end}
											onChange={(value) => { handleFilterChange({
												releaseDateRange: {
													...localFilters.releaseDateRange,
													end: typeof value === "number" ? value : value ? Number.parseInt(value, 10) || undefined : undefined,
												},
											}); }}
										/>
									</Grid.Col>
								</Grid>
							</Accordion.Panel>
						</Accordion.Item>

						{/* Price filters */}
						<Accordion.Item value="pricing">
							<Accordion.Control icon={<IconFilter size={16} />}>
                Price Range
								{localFilters.priceRange && (
									<Badge size="xs" ml="xs" variant="light">Active</Badge>
								)}
							</Accordion.Control>
							<Accordion.Panel>
								<Stack gap="md">
									<RangeSlider
										label="Price Range (¥)"
										min={0}
										max={50_000}
										step={500}
										value={[
											localFilters.priceRange?.min || 0,
											localFilters.priceRange?.max || 50_000,
										]}
										onChange={([min, max]) => { handleFilterChange({
											priceRange: { min, max },
										}); }}
										marks={[
											{ value: 0, label: "¥0" },
											{ value: 10_000, label: "¥10k" },
											{ value: 20_000, label: "¥20k" },
											{ value: 30_000, label: "¥30k" },
											{ value: 50_000, label: "¥50k+" },
										]}
									/>

									<Group grow={true}>
										<NumberInput
											label="Minimum Price"
											placeholder="0"
											min={0}
											value={localFilters.priceRange?.min}
											onChange={(value) => { handleFilterChange({
												priceRange: {
													...localFilters.priceRange,
													min: typeof value === "number" ? value : value ? Number.parseInt(value, 10) || undefined : undefined,
												},
											}); }}
										/>
										<NumberInput
											label="Maximum Price"
											placeholder="50000"
											min={0}
											value={localFilters.priceRange?.max}
											onChange={(value) => { handleFilterChange({
												priceRange: {
													...localFilters.priceRange,
													max: typeof value === "number" ? value : value ? Number.parseInt(value, 10) || undefined : undefined,
												},
											}); }}
										/>
									</Group>
								</Stack>
							</Accordion.Panel>
						</Accordion.Item>

						{/* Availability */}
						<Accordion.Item value="availability">
							<Accordion.Control>
                Availability Status
								{localFilters.availability?.length && (
									<Badge size="xs" ml="xs" variant="light">
										{localFilters.availability.length} selected
									</Badge>
								)}
							</Accordion.Control>
							<Accordion.Panel>
								<MultiSelect
									data={[
										{ value: "available", label: "Available" },
										{ value: "discontinued", label: "Discontinued" },
										{ value: "preorder", label: "Pre-order" },
									]}
									value={localFilters.availability || []}
									onChange={(value) => { handleFilterChange({ availability: value as Array<"available" | "discontinued" | "preorder"> }); }}
									placeholder="Select availability status..."
									clearable={true}
								/>
							</Accordion.Panel>
						</Accordion.Item>

						{/* Sorting */}
						<Accordion.Item value="sorting">
							<Accordion.Control>
                Sorting Options
								{localFilters.sort && (
									<Badge size="xs" ml="xs" variant="light">Active</Badge>
								)}
							</Accordion.Control>
							<Accordion.Panel>
								<Group grow={true}>
									<Select
										label="Sort By"
										data={[
											{ value: "name", label: "Name" },
											{ value: "releaseDate", label: "Release Date" },
											{ value: "price", label: "Price" },
											{ value: "relevance", label: "Relevance" },
										]}
										value={localFilters.sort?.field}
										onChange={(value) => { handleFilterChange({
											sort: {
												...localFilters.sort,
												field: value as "name" | "releaseDate" | "price" | "relevance",
												direction: localFilters.sort?.direction || "asc",
											},
										}); }}
									/>
									<Select
										label="Order"
										data={[
											{ value: "asc", label: "Ascending" },
											{ value: "desc", label: "Descending" },
										]}
										value={localFilters.sort?.direction}
										onChange={(value) => { handleFilterChange({
											sort: {
												...localFilters.sort,
												field: localFilters.sort?.field || "name",
												direction: value as "asc" | "desc",
											},
										}); }}
									/>
								</Group>
							</Accordion.Panel>
						</Accordion.Item>
					</Accordion>

					{/* Filter summary */}
					<Alert icon={<IconInfoCircle size={16} />} color="blue">
						<Text size="sm">
              Currently have {getActiveFilterCount()} active filter{getActiveFilterCount() === 1 ? "" : "s"} applied.
						</Text>
					</Alert>
				</Stack>
			</ScrollArea.Autosize>

			{/* Action buttons */}
			<Flex justify="space-between" gap="md" mt="lg">
				<Group gap="xs">
					<Button
						variant="outline"
						leftSection={<IconRefresh size={14} />}
						onClick={handleReset}
					>
            Reset All
					</Button>
					<Button
						variant="outline"
						leftSection={<IconDownload size={14} />}
						onClick={handleExportFilters}
					>
            Export
					</Button>
					<Button
						variant="outline"
						leftSection={<IconShare size={14} />}
						onClick={handleShareFilters}
					>
            Share
					</Button>
				</Group>

				<Group gap="xs">
					<Button variant="subtle" onClick={onClose}>
            Cancel
					</Button>
					<Button onClick={handleApply}>
            Apply Filters ({getActiveFilterCount()})
					</Button>
				</Group>
			</Flex>
		</Modal>
	);
}