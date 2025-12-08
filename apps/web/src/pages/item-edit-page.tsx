import { Container, Title, Text, Card, Button, Group, Stack, TextInput, Select, Textarea, NumberInput, SimpleGrid, Alert, Skeleton } from "@mantine/core";
import { IconDeviceFloppy, IconArrowLeft, IconPhoto, IconPlus, IconX } from "@tabler/icons-react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";

import { collectionService } from "../services/collectionService";
import { UniversalItem, ItemStatus } from "../types/hobby";

interface ItemEditPageProps {}

const statusOptions = [
	{ value: "wanted", label: "Wanted" },
	{ value: "ordered", label: "Ordered" },
	{ value: "owned", label: "Owned" },
	{ value: "building", label: "Building" },
	{ value: "completed", label: "Completed" },
	{ value: "for_sale", label: "For Sale" },
	{ value: "traded", label: "Traded" },
	{ value: "lost", label: "Lost" },
	{ value: "archived", label: "Archived" },
];

const scaleOptions = [
	{ value: "1/144", label: "1/144" },
	{ value: "1/100", label: "1/100" },
	{ value: "1/72", label: "1/72" },
	{ value: "1/60", label: "1/60" },
	{ value: "1/48", label: "1/48" },
	{ value: "1/35", label: "1/35" },
	{ value: "1/24", label: "1/24" },
	{ value: "Other", label: "Other" },
];

const gradeOptions = [
	{ value: "HG", label: "HG" },
	{ value: "RG", label: "RG" },
	{ value: "MG", label: "MG" },
	{ value: "PG", label: "PG" },
	{ value: "SD", label: "SD" },
	{ value: "EG", label: "Entry Grade" },
	{ value: "Other", label: "Other" },
];

/**
 * Item creation/editing page with dynamic form fields based on hobby type
 */
export function ItemEditPage({}: ItemEditPageProps): React.ReactElement {
	const { hobbyType, itemId } = useParams({ from: "/collection/$hobbyType/item/$itemId" });
	const navigate = useNavigate();

	const [item, setItem] = useState<UniversalItem | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [tagInput, setTagInput] = useState("");

	// Form state
	const [formData, setFormData] = useState({
		name: "",
		brand: "",
		series: "",
		grade: "",
		scale: "",
		price: "",
		status: "wanted" as ItemStatus,
		notes: "",
		tags: [] as string[],
	});

	const hobbyTypeConfig = {
		model_kits: { name: "Model Kits", icon: "🤖", color: "blue" },
		trading_cards: { name: "Trading Cards", icon: "🃏", color: "purple" },
		miniatures: { name: "Miniatures", icon: "🎭", color: "red" },
		other: { name: "Other", icon: "📦", color: "gray" },
	};

	const config = hobbyTypeConfig[hobbyType as keyof typeof hobbyTypeConfig] || { name: "Unknown", icon: "❓", color: "gray" };

	const isEditing = itemId !== "new";

	useEffect(() => {
		const loadItem = async () => {
			if (isEditing) {
				try {
					setLoading(true);
					const itemData = await collectionService.getItem(itemId);
					if (!itemData) {
						setError("Item not found");
						return;
					}
					setItem(itemData);

					// Populate form with existing data
					setFormData({
						name: itemData.data["name"] || "",
						brand: itemData.data["brand"] || "",
						series: itemData.data["series"] || "",
						grade: itemData.data["grade"] || "",
						scale: itemData.data["scale"] || "",
						price: itemData.data["price"]?.toString() || "",
						status: itemData.status,
						notes: itemData.notes || "",
						tags: itemData.tags || [],
					});
				} catch (error_) {
					console.error("Failed to load item:", error_);
					setError("Failed to load item. Please try again.");
				} finally {
					setLoading(false);
				}
			}
		};

		loadItem();
	}, [itemId, isEditing]);

	const handleInputChange = (field: string, value: any) => {
		setFormData(prev => ({
			...prev,
			[field]: value,
		}));
	};

	const handleAddTag = () => {
		if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
			setFormData(prev => ({
				...prev,
				tags: [...prev.tags, tagInput.trim()],
			}));
			setTagInput("");
		}
	};

	const handleRemoveTag = (tagToRemove: string) => {
		setFormData(prev => ({
			...prev,
			tags: prev.tags.filter(tag => tag !== tagToRemove),
		}));
	};

	const handleSave = async () => {
		if (!formData.name.trim()) {
			setError("Item name is required");
			return;
		}

		try {
			setSaving(true);
			setError(null);

			const itemData = {
				name: formData.name.trim(),
				brand: formData.brand.trim(),
				series: formData.series.trim(),
				grade: formData.grade,
				scale: formData.scale,
				price: formData.price ? Number.parseFloat(formData.price) : undefined,
			};

			const metadata = {
				source: "manual" as const,
				confidence: 1,
			};

			await (isEditing ? collectionService.updateItem(itemId, {
				data: itemData,
				status: formData.status,
				tags: formData.tags,
				notes: formData.notes.trim(),
				metadata,
			}) : collectionService.createItem({
				hobbyType,
				data: itemData,
				images: [],
				status: formData.status,
				tags: formData.tags,
				notes: formData.notes.trim(),
				metadata,
			}));

			// Navigate back to the collection (would need collectionId for proper navigation)
			navigate({
				to: "/collection/$hobbyType",
				params: { hobbyType },
			});
		} catch (error_) {
			console.error("Failed to save item:", error_);
			setError("Failed to save item. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<Container size="lg" py="xl">
				<Stack gap="xl">
					<Skeleton height={48} width={300} />
					<Card p="xl" radius="lg" withBorder={true}>
						<Stack gap="md">
							{[1, 2, 3, 4, 5, 6].map((i) => (
								<Skeleton key={i} height={40} radius="md" />
							))}
						</Stack>
					</Card>
				</Stack>
			</Container>
		);
	}

	if (error && !item) {
		return (
			<Container size="lg" py="xl">
				<Alert color="red" title="Error">
					{error}
				</Alert>
			</Container>
		);
	}

	return (
		<>
			{/* Header Section */}
			<Container size="lg" py="xl">
				<Group justify="space-between" align="center" mb="xl">
					<Stack gap="xs">
						<Group gap="sm">
							<Button
								variant="subtle"
								onClick={() => navigate({ to: "/collection/$hobbyType", params: { hobbyType } })}
								leftSection={<IconArrowLeft size={16} />}
								size="sm"
							>
								Back
							</Button>
						</Group>
						<Title order={1} size={36}>
							{isEditing ? "Edit Item" : "Add New Item"}
						</Title>
						<Text size="lg" color="dimmed">
							{config.icon} {config.name}
						</Text>
					</Stack>

					<Button
						onClick={handleSave}
						loading={saving}
						leftSection={<IconDeviceFloppy size={16} />}
						color={config.color}
					>
						{isEditing ? "Save Changes" : "Add Item"}
					</Button>
				</Group>
			</Container>

			<Container size="lg" pb="xl">
				<Card p="xl" radius="lg" withBorder={true}>
					<Stack gap="lg">
						{error && (
							<Alert color="red" title="Error">
								{error}
							</Alert>
						)}

						{/* Basic Information */}
						<Stack gap="md">
							<Title order={3}>Basic Information</Title>
							<SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
								<TextInput
									label="Item Name"
									placeholder="Enter item name"
									value={formData.name}
									onChange={(e) => { handleInputChange("name", e.target.value); }}
									required={true}
								/>
								<TextInput
									label="Brand/Manufacturer"
									placeholder="Enter brand or manufacturer"
									value={formData.brand}
									onChange={(e) => { handleInputChange("brand", e.target.value); }}
								/>
							</SimpleGrid>
						</Stack>

						{/* Hobby-Specific Fields */}
						{(hobbyType === "model_kits" || hobbyType === "other") && (
							<Stack gap="md">
								<Title order={3}>Model Details</Title>
								<SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
									<Select
										label="Grade/Class"
										data={gradeOptions}
										value={formData.grade}
										onChange={(value) => { handleInputChange("grade", value || ""); }}
										clearable={true}
									/>
									<Select
										label="Scale"
										data={scaleOptions}
										value={formData.scale}
										onChange={(value) => { handleInputChange("scale", value || ""); }}
										clearable={true}
									/>
									<TextInput
										label="Series"
										placeholder="Enter series name"
										value={formData.series}
										onChange={(e) => { handleInputChange("series", e.target.value); }}
									/>
									<NumberInput
										label="Price"
										placeholder="Enter price"
										value={formData.price}
										onChange={(value) => { handleInputChange("price", value); }}
										prefix="$"
										decimalScale={2}
									/>
								</SimpleGrid>
							</Stack>
						)}

						{/* Status and Notes */}
						<Stack gap="md">
							<Title order={3}>Status & Notes</Title>
							<SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
								<Select
									label="Status"
									data={statusOptions}
									value={formData.status}
									onChange={(value) => { handleInputChange("status", value as ItemStatus); }}
								/>
							</SimpleGrid>
							<Textarea
								label="Notes"
								placeholder="Add any additional notes about this item"
								value={formData.notes}
								onChange={(e) => { handleInputChange("notes", e.target.value); }}
								rows={4}
							/>
						</Stack>

						{/* Tags */}
						<Stack gap="md">
							<Title order={3}>Tags</Title>
							<Group>
								<TextInput
									placeholder="Add a tag"
									value={tagInput}
									onChange={(e) => { setTagInput(e.target.value); }}
									onKeyPress={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											handleAddTag();
										}
									}}
									rightSection={
										<Button
											size="xs"
											onClick={handleAddTag}
											disabled={!tagInput.trim()}
										>
											Add
										</Button>
									}
								/>
							</Group>

							{formData.tags.length > 0 && (
								<Group gap="xs" wrap="wrap">
									{formData.tags.map((tag) => (
										<Button
											key={tag}
											variant="outline"
											size="xs"
											rightSection={<IconX size={10} />}
											onClick={() => { handleRemoveTag(tag); }}
										>
											{tag}
										</Button>
									))}
								</Group>
							)}
						</Stack>

						{/* Images placeholder */}
						<Stack gap="md">
							<Title order={3}>Images</Title>
							<Card p="lg" radius="md" withBorder={true} style={{ borderStyle: "dashed" }}>
								<Stack align="center" gap="md" mih={120}>
									<IconPhoto size={48} color="#ccc" />
									<Text color="dimmed">Image upload coming soon</Text>
								</Stack>
							</Card>
						</Stack>
					</Stack>
				</Card>
			</Container>
		</>
	);
}