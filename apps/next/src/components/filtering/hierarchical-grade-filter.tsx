"use client";

import {
	getGradeById,
	getGradeFamilyIds,
	getGradesHierarchy,
	getNodeDisplayName,
	type GradeHierarchyEntry,
} from "@hobby-ninja/data";
import {
	ActionIcon,
	Badge,
	Box,
	Group,
	Text,
	Tooltip,
	UnstyledButton,
} from "@mantine/core";
import {
	IconChevronDown,
	IconChevronRight,
	IconChecks,
	IconPhoto,
	IconTextSize,
	IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import { Fragment, useState } from "react";


// Shared style for filter images - match aspect ratio of reference images (300x170 ≈ 1.76:1)
const FILTER_IMAGE_HEIGHT = 56;
const FILTER_IMAGE_WIDTH = 99; // 56 * (300/170) to match reference image aspect ratio

// Drop shadow for images that may have transparency (PNG/SVG) - makes white logos visible on white background
const TRANSPARENT_IMAGE_FILTER = "drop-shadow(0 0 1px rgba(0,0,0,0.7)) drop-shadow(0 0 2px rgba(0,0,0,0.5))";

// Check if image might have transparency based on file extension
const mightHaveTransparency = (src: string) => /\.(png|svg)$/i.test(src);

const getFilterImageStyle = (src: string): React.CSSProperties => ({
	maxHeight: "100%",
	maxWidth: "100%",
	objectFit: "contain",
	filter: mightHaveTransparency(src) ? TRANSPARENT_IMAGE_FILTER : undefined,
});

// Background color for filter buttons
const FILTER_BUTTON_BG_UNSELECTED = "white";

// Base style for all filter button containers - consistent sizing with aspect ratio matching reference images
const FILTER_BUTTON_BASE_STYLE: React.CSSProperties = {
	height: FILTER_IMAGE_HEIGHT,
	width: FILTER_IMAGE_WIDTH,
	borderRadius: 8,
	overflow: "hidden",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
};

function formatGradeName(id: string): string {
	const grade = getGradeById(id);
	return grade ? getNodeDisplayName(grade) : id;
}

interface HierarchicalGradeFilterProps {
	availableGrades: string[];
	selectedGrades: string[];
	onToggle: (gradeId: string) => void;
	onToggleFamily: (rootGradeId: string) => void;
	displayMode: "icon" | "text";
	onDisplayModeToggle: () => void;
	color?: string;
	onSelectAll?: () => void;
	onClearSection?: () => void;
}

export function HierarchicalGradeFilter({
	availableGrades,
	selectedGrades,
	onToggle,
	onToggleFamily,
	displayMode,
	onDisplayModeToggle,
	color = "teal",
	onSelectAll,
	onClearSection,
}: HierarchicalGradeFilterProps) {
	const [expanded, setExpanded] = useState(false);
	const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
	const hierarchy = getGradesHierarchy();

	// Filter hierarchy to only include entries with available grades
	const availableHierarchy = hierarchy.filter((entry) => {
		const familyIds = getGradeFamilyIds(entry.root.id);
		return familyIds.some((id) => availableGrades.includes(id));
	});

	if (availableHierarchy.length === 0) return null;

	const toggleFamilyExpand = (rootId: string) => {
		setExpandedFamilies((prev) => {
			const next = new Set(prev);
			if (next.has(rootId)) {
				next.delete(rootId);
			} else {
				next.add(rootId);
			}
			return next;
		});
	};

	// Render a single grade chip (same size for all)
	const renderGradeChip = (gradeId: string, options?: { dashed?: boolean; label?: string }) => {
		const isSelected = selectedGrades.includes(gradeId);
		const grade = getGradeById(gradeId);
		const imageSrc = grade?.image;
		const hasAnySelection = selectedGrades.length > 0;
		const label = options?.label ?? formatGradeName(gradeId);
		const borderStyle = options?.dashed ? "dashed" : "solid";

		if (displayMode === "icon" && imageSrc) {
			return (
				<Tooltip key={gradeId} label={label} position="top" withArrow={true}>
					<UnstyledButton
						onClick={() => { onToggle(gradeId); }}
						style={{
							...FILTER_BUTTON_BASE_STYLE,
							border: `2px ${borderStyle} var(--mantine-color-${color}-${isSelected ? "filled" : "outline"})`,
							background: isSelected ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
							opacity: hasAnySelection && !isSelected ? 0.7 : 1,
						}}
					>
						<Image
							src={imageSrc}
							alt={label}
							width={120}
							height={FILTER_IMAGE_HEIGHT}
							style={getFilterImageStyle(imageSrc)}
						/>
					</UnstyledButton>
				</Tooltip>
			);
		}

		// For icon mode without images, show grade abbreviation in a more icon-like style
		const gradeAbbr = gradeId.toUpperCase().replace("-", " ");
		const iconText = displayMode === "icon" ? gradeAbbr : label;

		return (
			<Tooltip key={gradeId} label={label} position="top" withArrow={true}>
				<UnstyledButton
					onClick={() => { onToggle(gradeId); }}
					style={{
						...FILTER_BUTTON_BASE_STYLE,
						border: `2px ${borderStyle} var(--mantine-color-${color}-${isSelected ? "filled" : "outline"})`,
						background: isSelected ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
						color: isSelected ? "white" : `var(--mantine-color-${color}-filled)`,
						opacity: hasAnySelection && !isSelected ? 0.7 : 1,
						fontStyle: options?.dashed ? "italic" : "normal",
					}}
				>
					<Text
						size={displayMode === "icon" ? "sm" : "xs"}
						fw={700}
						lineClamp={displayMode === "icon" ? 1 : 2}
						ta="center"
						style={{
							fontSize: displayMode === "icon" ? "14px" : "10px",
							letterSpacing: displayMode === "icon" ? "0.5px" : "normal",
						}}
					>
						{iconText}
					</Text>
				</UnstyledButton>
			</Tooltip>
		);
	};

	// Render a root grade with optional expand button
	const renderRootGrade = (entry: GradeHierarchyEntry) => {
		const { root, children } = entry;
		const availableChildren = children.filter((c) => availableGrades.includes(c.id));
		const hasChildren = availableChildren.length > 0;
		const isRootAvailable = availableGrades.includes(root.id);
		const isExpanded = expandedFamilies.has(root.id);

		if (!isRootAvailable && availableChildren.length === 0) {
			return null;
		}

		// Get selection state for family
		const familyIds = getGradeFamilyIds(root.id).filter((id) => availableGrades.includes(id));
		const selectedInFamily = familyIds.filter((id) => selectedGrades.includes(id));
		const grade = getGradeById(root.id);
		const imageSrc = grade?.image;
		const hasAnySelection = selectedGrades.length > 0;

		// Simple grade without children - render as regular chip
		if (!hasChildren) {
			return <Fragment key={root.id}>{renderGradeChip(root.id)}</Fragment>;
		}

		// Grade with children - render with expand toggle
		// When expanded, wrap in a background container
		if (isExpanded) {
			return (
				<Box
					key={root.id}
					style={{
						background: `var(--mantine-color-${color}-light)`,
						borderRadius: 12,
					}}
				>
					<Group gap="xs" wrap="wrap" align="center">
						{/* Parent grade with toggle */}
						{displayMode === "icon" && imageSrc ? (
							<Group gap={4} wrap="nowrap">
								<Tooltip label={`${formatGradeName(root.id)} (select all)`} position="top" withArrow={true}>
									<UnstyledButton
										onClick={() => { onToggleFamily(root.id); }}
										style={{
											...FILTER_BUTTON_BASE_STYLE,
											position: "relative",
											border: `2px solid var(--mantine-color-${color}-${selectedInFamily.length > 0 ? "filled" : "outline"})`,
											background: selectedInFamily.length === familyIds.length ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
											opacity: hasAnySelection && selectedInFamily.length === 0 ? 0.7 : 1,
										}}
									>
										<Image
											src={imageSrc}
											alt={formatGradeName(root.id)}
											width={120}
											height={FILTER_IMAGE_HEIGHT}
											style={getFilterImageStyle(imageSrc)}
										/>
										{selectedInFamily.length > 0 && (
											<Badge
												size="xs"
												variant="filled"
												color={color}
												style={{
													position: "absolute",
													top: 2,
													right: 2,
												}}
											>
												{selectedInFamily.length}/{familyIds.length}
											</Badge>
										)}
									</UnstyledButton>
								</Tooltip>
								<ActionIcon
									variant="filled"
									size="sm"
									color={color}
									onClick={() => { toggleFamilyExpand(root.id); }}
									title="Collapse sub-grades"
								>
									<IconChevronDown size={14} />
								</ActionIcon>
							</Group>
						) : (
							<Group gap={4} wrap="nowrap">
								<Tooltip label={`${formatGradeName(root.id)} (select all)`} position="top" withArrow={true}>
									<UnstyledButton
										onClick={() => { onToggleFamily(root.id); }}
										style={{
											...FILTER_BUTTON_BASE_STYLE,
											position: "relative",
											border: `2px solid var(--mantine-color-${color}-${selectedInFamily.length > 0 ? "filled" : "outline"})`,
											background: selectedInFamily.length === familyIds.length ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
											color: selectedInFamily.length > 0 ? "white" : `var(--mantine-color-${color}-filled)`,
											opacity: hasAnySelection && selectedInFamily.length === 0 ? 0.7 : 1,
										}}
									>
										<Text size="xs" fw={500} lineClamp={2} ta="center">
											{formatGradeName(root.id)}
										</Text>
										{selectedInFamily.length > 0 && (
											<Badge
												size="xs"
												variant="filled"
												color={color}
												style={{
													position: "absolute",
													top: 2,
													right: 2,
												}}
											>
												{selectedInFamily.length}/{familyIds.length}
											</Badge>
										)}
									</UnstyledButton>
								</Tooltip>
								<ActionIcon
									variant="filled"
									size="sm"
									color={color}
									onClick={() => { toggleFamilyExpand(root.id); }}
									title="Collapse sub-grades"
								>
									<IconChevronDown size={14} />
								</ActionIcon>
							</Group>
						)}

						{/* Root-only option (if root is available as standalone) */}
						{isRootAvailable && renderGradeChip(root.id, {
							dashed: true,
							label: `${formatGradeName(root.id)} (root only)`,
						})}

						{/* Child grades - same size as parent */}
						{availableChildren.map((child) => renderGradeChip(child.id))}
					</Group>
				</Box>
			);
		}

		// Collapsed state - just show parent with expand button
		if (displayMode === "icon" && imageSrc) {
			return (
				<Group key={root.id} gap={4} wrap="nowrap">
					<Tooltip label={formatGradeName(root.id)} position="top" withArrow={true}>
						<UnstyledButton
							onClick={() => { onToggleFamily(root.id); }}
							style={{
								...FILTER_BUTTON_BASE_STYLE,
								position: "relative",
								border: `2px solid var(--mantine-color-${color}-${selectedInFamily.length > 0 ? "filled" : "outline"})`,
								background: selectedInFamily.length > 0 ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
								opacity: hasAnySelection && selectedInFamily.length === 0 ? 0.7 : 1,
							}}
						>
							<Image
								src={imageSrc}
								alt={formatGradeName(root.id)}
								width={120}
								height={FILTER_IMAGE_HEIGHT}
								style={getFilterImageStyle(imageSrc)}
							/>
							{selectedInFamily.length > 0 && (
								<Badge
									size="xs"
									variant="filled"
									color={color}
									style={{
										position: "absolute",
										top: 2,
										right: 2,
									}}
								>
									{selectedInFamily.length}/{familyIds.length}
								</Badge>
							)}
						</UnstyledButton>
					</Tooltip>
					<ActionIcon
						variant="subtle"
						size="sm"
						onClick={() => { toggleFamilyExpand(root.id); }}
						title="Expand sub-grades"
					>
						<IconChevronRight size={14} />
					</ActionIcon>
				</Group>
			);
		}

		return (
			<Group key={root.id} gap={4} wrap="nowrap">
				<Tooltip label={formatGradeName(root.id)} position="top" withArrow={true}>
					<UnstyledButton
						onClick={() => { onToggleFamily(root.id); }}
						style={{
							...FILTER_BUTTON_BASE_STYLE,
							position: "relative",
							border: `2px solid var(--mantine-color-${color}-${selectedInFamily.length > 0 ? "filled" : "outline"})`,
							background: selectedInFamily.length > 0 ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
							color: selectedInFamily.length > 0 ? "white" : `var(--mantine-color-${color}-filled)`,
							opacity: hasAnySelection && selectedInFamily.length === 0 ? 0.7 : 1,
						}}
					>
						<Text size="xs" fw={500} lineClamp={2} ta="center">
							{formatGradeName(root.id)}
						</Text>
						{selectedInFamily.length > 0 && (
							<Badge
								size="xs"
								variant="filled"
								color={color}
								style={{
									position: "absolute",
									top: 2,
									right: 2,
								}}
							>
								{selectedInFamily.length}/{familyIds.length}
							</Badge>
						)}
					</UnstyledButton>
				</Tooltip>
				<ActionIcon
					variant="subtle"
					size="sm"
					onClick={() => { toggleFamilyExpand(root.id); }}
					title="Expand sub-grades"
				>
					<IconChevronRight size={14} />
				</ActionIcon>
			</Group>
		);
	};

	return (
		<Box>
			{/* Section Header */}
			<Group justify="space-between" mb={expanded ? "xs" : 0}>
				<UnstyledButton
					onClick={() => { setExpanded(!expanded); }}
					style={{ flex: 1 }}
				>
					<Group gap="xs">
						{expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
						<Text size="sm" fw={500}>
							Grades
						</Text>
						<Text size="xs" c="dimmed">
							({availableGrades.length})
						</Text>
						{selectedGrades.length > 0 && (
							<Badge size="xs" variant="filled" color={color}>
								{selectedGrades.length} selected
							</Badge>
						)}
					</Group>
				</UnstyledButton>

				{/* Action Buttons */}
				<Group gap="xs">
					{expanded && (
						<>
							{onSelectAll && selectedGrades.length < availableGrades.length && (
								<Tooltip label="Select all grades">
									<ActionIcon
										variant="light"
										size="sm"
										color={color}
										onClick={(e) => { e.stopPropagation(); onSelectAll(); }}
										title="Select all grades"
									>
										<IconChecks size={14} />
									</ActionIcon>
								</Tooltip>
							)}
							{onClearSection && selectedGrades.length > 0 && (
								<Tooltip label="Clear grade selection">
									<ActionIcon
										variant="light"
										size="sm"
										color="red"
										onClick={(e) => { e.stopPropagation(); onClearSection(); }}
										title="Clear grade selection"
									>
										<IconX size={14} />
									</ActionIcon>
								</Tooltip>
							)}
						</>
					)}
					<ActionIcon
						variant={displayMode === "icon" ? "filled" : "light"}
						size="sm"
						onClick={(e) => { e.stopPropagation(); onDisplayModeToggle(); }}
						title={displayMode === "icon" ? "Switch to text labels" : "Switch to icons"}
					>
						{displayMode === "icon" ? <IconPhoto size={16} /> : <IconTextSize size={16} />}
					</ActionIcon>
				</Group>
			</Group>

			{/* Collapsed: Show selected values only */}
			{!expanded && selectedGrades.length > 0 && (
				<Group gap="xs" wrap="wrap" mt="xs">
					{selectedGrades.map((gradeId) => {
						const grade = getGradeById(gradeId);
						const imageSrc = grade?.image;
						const gradeAbbr = gradeId.toUpperCase().replace("-", " ");
						const iconText = displayMode === "icon" ? gradeAbbr : formatGradeName(gradeId);

						if (displayMode === "icon" && imageSrc) {
							return (
								<Tooltip key={gradeId} label={formatGradeName(gradeId)} position="top" withArrow={true}>
									<UnstyledButton
										onClick={() => { onToggle(gradeId); }}
										style={{
											...FILTER_BUTTON_BASE_STYLE,
											border: `2px solid var(--mantine-color-${color}-filled)`,
											background: `var(--mantine-color-${color}-filled)`,
										}}
									>
										<Image
											src={imageSrc}
											alt={formatGradeName(gradeId)}
											width={120}
											height={FILTER_IMAGE_HEIGHT}
											style={getFilterImageStyle(imageSrc)}
										/>
									</UnstyledButton>
								</Tooltip>
							);
						}

						return (
							<Tooltip key={gradeId} label={formatGradeName(gradeId)} position="top" withArrow={true}>
								<UnstyledButton
									onClick={() => { onToggle(gradeId); }}
									style={{
										...FILTER_BUTTON_BASE_STYLE,
										border: `2px solid var(--mantine-color-${color}-filled)`,
										background: `var(--mantine-color-${color}-filled)`,
										color: "white",
									}}
								>
									<Text
										size={displayMode === "icon" ? "sm" : "xs"}
										fw={700}
										lineClamp={displayMode === "icon" ? 1 : 2}
										ta="center"
										style={{
											fontSize: displayMode === "icon" ? "14px" : "10px",
											letterSpacing: displayMode === "icon" ? "0.5px" : "normal",
										}}
									>
										{iconText}
									</Text>
								</UnstyledButton>
							</Tooltip>
						);
					})}
				</Group>
			)}

			{/* Expanded: Show all grades in horizontal flow */}
			{expanded && (
				<Group gap="xs" wrap="wrap" mt="xs" align="flex-start">
					{availableHierarchy.map((entry) => renderRootGrade(entry))}
				</Group>
			)}
		</Box>
	);
}
