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


// Shared style for filter chips - using brand image aspect ratio (300x170) - EXACT match with FilterSection
const FILTER_IMAGE_WIDTH = 300;
const FILTER_IMAGE_HEIGHT = 170;
const FILTER_CHIP_WIDTH = 100;
const FILTER_CHIP_HEIGHT = Math.round(FILTER_CHIP_WIDTH * (FILTER_IMAGE_HEIGHT / FILTER_IMAGE_WIDTH));
const UNSELECTED_TEXT_COLOR = "black";

// Drop shadow for images that may have transparency (PNG/SVG) - makes white logos visible on white background
const TRANSPARENT_IMAGE_FILTER = "drop-shadow(0 0 1px rgba(0,0,0,0.7)) drop-shadow(0 0 2px rgba(0,0,0,0.5))";

// Button border radius constants
const FILTER_BUTTON_BORDER_RADIUS = "8px"; // Keep all corners rounded
const EXPAND_BUTTON_BORDER_RADIUS = "0 8px 8px 0";

// Check if image might have transparency based on file extension
const mightHaveTransparency = (src: string) => /\.(png|svg)$/i.test(src);

const getFilterImageStyle = (src: string): React.CSSProperties => ({
	display: "block",
	width: "100%",
	height: "100%",
	objectFit: "contain",
	margin: 0,
	padding: 0,
	filter: mightHaveTransparency(src) ? TRANSPARENT_IMAGE_FILTER : undefined,
});

// Background color for filter buttons
const FILTER_BUTTON_BG_UNSELECTED = "white";

// Text colors for count displays
const COUNT_PRIMARY_COLOR_SELECTED = "rgba(255,255,255,0.7)";
const COUNT_PRIMARY_COLOR_UNSELECTED = "rgba(0,0,0,0.8)";
const COUNT_SECONDARY_COLOR_SELECTED = "white";
const COUNT_SECONDARY_COLOR_UNSELECTED = "black";

// Shared styling constants to avoid duplication
const COUNT_BG_UNSELECTED = "rgba(255,255,255,0.9)";
const TEXT_STYLE_BASE = {
	fontFamily: "Inter, system-ui, -apple-system, sans-serif",
	fontVariantNumeric: "tabular-nums" as const,
	textTransform: "uppercase" as const,
	letterSpacing: -0.5,
};

// Base style for all filter button containers - EXACT match with FilterSection
const FILTER_BUTTON_BASE_STYLE: React.CSSProperties = {
	width: FILTER_CHIP_WIDTH,
	height: "auto",
	borderRadius: 8,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	position: "relative",
	cursor: "pointer",
	padding: 0,
	margin: 0,
	transition: "all 0.2s ease",
	overflow: "hidden",
};

function formatGradeName(id: string): string {
	const grade = getGradeById(id);
	return grade ? getNodeDisplayName(grade) : id;
}

// Calculate aggregated counts for a grade (sum of counts from all grades in the hierarchy)
function calculateAggregatedCounts(
	gradeId: string,
	filterCounts: Record<string, number> | undefined,
	totalCounts: Record<string, number> | undefined,
): { currentCount: number; totalCount: number } {
	if (!filterCounts || !totalCounts) {
		return { currentCount: 0, totalCount: 0 };
	}

	// Get all grades in this grade's family hierarchy
	const familyIds = getGradeFamilyIds(gradeId);

	// Sum counts from all grades in the family
	const currentCount = familyIds.reduce((sum, id) => sum + (filterCounts[id] ?? 0), 0);
	const totalCount = familyIds.reduce((sum, id) => sum + (totalCounts[id] ?? 0), 0);

	return { currentCount, totalCount };
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
	filterCounts?: Record<string, number>;
	totalCounts?: Record<string, number>;
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
	filterCounts,
	totalCounts,
}: HierarchicalGradeFilterProps) {
	const [expanded, setExpanded] = useState(false);
	const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
	const hierarchy = getGradesHierarchy();

	// Filter hierarchy to only include entries with available grades
	const availableHierarchy = hierarchy.filter((entry) => {
		const familyIds = getGradeFamilyIds(entry.root.id);
		return familyIds.some((id) => availableGrades.includes(id));
	});

	// Check if "Other" is available (items with no grade)
	const hasOtherOption = availableGrades.includes("Other");

	if (availableHierarchy.length === 0 && !hasOtherOption) return null;

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

		// Get counts for this grade (simple grades don't need aggregation)
		const currentCount = filterCounts?.[gradeId] ?? 0;
		const totalCount = totalCounts?.[gradeId] ?? 0;

		// Use exact same structure as FilterSection's renderChipContent
		return (
			<Tooltip
				key={gradeId}
				label={totalCount > 0 ? `${label} (${currentCount}/${totalCount})` : label}
				position="top"
				withArrow={true}
			>
				<UnstyledButton
					onClick={() => { onToggle(gradeId); }}
					disabled={totalCount === 0}
					style={{
						...FILTER_BUTTON_BASE_STYLE,
						border: `2px ${borderStyle} var(--mantine-color-${color}-${isSelected ? "filled" : "outline"})`,
						background: isSelected ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
						opacity: (hasAnySelection && !isSelected) || totalCount === 0 ? 0.7 : 1,
						cursor: totalCount === 0 ? "not-allowed" : "pointer",
					}}
				>
					{displayMode === "icon" && imageSrc ? (
						<div style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: "2px",
						}}>
							<Image
								src={imageSrc}
								alt={label}
								width={FILTER_CHIP_WIDTH}
								height={FILTER_CHIP_HEIGHT}
								style={getFilterImageStyle(imageSrc)}
							/>
							{/* Count display below chip */}
							<div
								style={{
									background: isSelected ? COUNT_PRIMARY_COLOR_UNSELECTED : COUNT_BG_UNSELECTED,
									borderRadius: 3,
									padding: "1px 4px",
									display: "flex",
									alignItems: "center",
									width: "100%",
								}}
							>
								<div
									style={{
										color: isSelected ? COUNT_SECONDARY_COLOR_SELECTED : COUNT_SECONDARY_COLOR_UNSELECTED,
										fontSize: "11px",
										fontWeight: 600,
										lineHeight: 1.2,
										flex: 1,
										textAlign: "center",
									}}
								>
									{currentCount}
								</div>
								<div
									style={{
										color: isSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
										fontSize: "11px",
										fontWeight: 600,
										lineHeight: 1.2,
										flex: "none",
									}}
								>
									/
								</div>
								<div
									style={{
										color: isSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
										fontSize: "11px",
										fontWeight: 600,
										lineHeight: 1.2,
										flex: 1,
										textAlign: "center",
									}}
								>
									{totalCount}
								</div>
							</div>
						</div>
					) : (
						<div style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: "2px",
						}}>
							<div style={{
								width: FILTER_CHIP_WIDTH,
								height: FILTER_CHIP_HEIGHT,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}>
								<Text
									size="xs"
									fw={900}
									lineClamp={1}
									ta="center"
									style={{
										color: isSelected ? "white" : UNSELECTED_TEXT_COLOR,
										...TEXT_STYLE_BASE,
									}}
								>
									{label}
								</Text>
							</div>
							{/* Count display below chip */}
							<div
								style={{
									background: isSelected ? COUNT_PRIMARY_COLOR_UNSELECTED : COUNT_BG_UNSELECTED,
									borderRadius: 3,
									padding: "1px 4px",
									display: "flex",
									alignItems: "center",
									width: "100%",
								}}
							>
								<div
									style={{
										color: isSelected ? COUNT_SECONDARY_COLOR_SELECTED : COUNT_SECONDARY_COLOR_UNSELECTED,
										fontSize: "11px",
										fontWeight: 600,
										lineHeight: 1.2,
										flex: 1,
										textAlign: "center",
									}}
								>
									{currentCount}
								</div>
								<div
									style={{
										color: isSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
										fontSize: "11px",
										fontWeight: 600,
										lineHeight: 1.2,
										flex: "none",
									}}
								>
									/
								</div>
								<div
									style={{
										color: isSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
										fontSize: "11px",
										fontWeight: 600,
										lineHeight: 1.2,
										flex: 1,
										textAlign: "center",
									}}
								>
									{totalCount}
								</div>
							</div>
						</div>
					)}
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
			// Calculate aggregated counts for the parent grade
			const { currentCount: parentCurrentCount, totalCount: parentTotalCount } = calculateAggregatedCounts(
				root.id,
				filterCounts,
				totalCounts,
			);
			const isParentSelected = selectedInFamily.length > 0;

			return (
				<Box
					key={root.id}
					style={{
						background: `var(--mantine-color-${color}-light)`,
						borderRadius: 12,
						overflow: "visible",
					}}
				>
									<Group gap="0" wrap="wrap" align="stretch" style={{ overflow: "visible" }}>
						{/* Parent grade with integrated expand button - unified container */}
						{displayMode === "icon" && imageSrc ? (
							<Tooltip label={`${formatGradeName(root.id)} (select all)`} position="top" withArrow={true}>
								<UnstyledButton
									onClick={() => { onToggleFamily(root.id); }}
									style={{
										...FILTER_BUTTON_BASE_STYLE,
										borderRadius: FILTER_BUTTON_BORDER_RADIUS, // Keep all corners rounded
										border: `2px solid var(--mantine-color-${color}-${selectedInFamily.length > 0 ? "filled" : "outline"})`,
										background: selectedInFamily.length === familyIds.length ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
										opacity: hasAnySelection && selectedInFamily.length === 0 ? 0.7 : 1,
										position: "relative", // Required for absolute positioning of child elements
									}}
								>
									{/* Image container exactly like FilterSection */}
									<div style={{
										width: FILTER_CHIP_WIDTH,
										height: FILTER_CHIP_HEIGHT,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}>
										<Image
											src={imageSrc}
											alt={formatGradeName(root.id)}
											width={FILTER_CHIP_WIDTH}
											height={FILTER_CHIP_HEIGHT}
											style={getFilterImageStyle(imageSrc)}
										/>
									</div>
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
									{/* Count display integrated like FilterSection */}
									<div
										style={{
											background: isParentSelected ? COUNT_PRIMARY_COLOR_UNSELECTED : COUNT_BG_UNSELECTED,
											borderRadius: 3,
											padding: "1px 4px",
											display: "flex",
											alignItems: "center",
											width: "100%",
											marginTop: "2px",
										}}
									>
										<div
											style={{
												color: isParentSelected ? COUNT_SECONDARY_COLOR_SELECTED : COUNT_SECONDARY_COLOR_UNSELECTED,
												fontSize: "11px",
												fontWeight: 600,
												lineHeight: 1.2,
												flex: 1,
												textAlign: "center",
											}}
										>
											{parentCurrentCount}
										</div>
										<div
											style={{
												color: isParentSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
												fontSize: "11px",
												fontWeight: 600,
												lineHeight: 1.2,
												flex: "none",
											}}
										>
											/
										</div>
										<div
											style={{
												color: isParentSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
												fontSize: "11px",
												fontWeight: 600,
												lineHeight: 1.2,
												flex: 1,
												textAlign: "center",
											}}
										>
											{parentTotalCount}
										</div>
									</div>
								</UnstyledButton>
							</Tooltip>
						) : (
							<Tooltip label={`${formatGradeName(root.id)} (select all)`} position="top" withArrow={true}>
								<UnstyledButton
									onClick={() => { onToggleFamily(root.id); }}
									style={{
										...FILTER_BUTTON_BASE_STYLE,
										borderRadius: FILTER_BUTTON_BORDER_RADIUS, // Keep all corners rounded
										border: `2px solid var(--mantine-color-${color}-${selectedInFamily.length > 0 ? "filled" : "outline"})`,
										background: selectedInFamily.length === familyIds.length ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
										color: selectedInFamily.length > 0 ? "white" : `var(--mantine-color-${color}-filled)`,
										opacity: hasAnySelection && selectedInFamily.length === 0 ? 0.7 : 1,
										position: "relative", // Required for absolute positioning of child elements
									}}
								>
									{/* Text container exactly like FilterSection */}
									<div style={{
										width: FILTER_CHIP_WIDTH,
										height: FILTER_CHIP_HEIGHT,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}>
										<Text
											size="xs"
											fw={900}
											lineClamp={1}
											ta="center"
											style={{
												color: selectedInFamily.length > 0 ? "white" : UNSELECTED_TEXT_COLOR,
												...TEXT_STYLE_BASE,
											}}
										>
											{formatGradeName(root.id)}
										</Text>
									</div>
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
									{/* Count display integrated like FilterSection */}
									<div
										style={{
											background: isParentSelected ? COUNT_PRIMARY_COLOR_UNSELECTED : COUNT_BG_UNSELECTED,
											borderRadius: 3,
											padding: "1px 4px",
											display: "flex",
											alignItems: "center",
											width: "100%",
											marginTop: "2px",
										}}
									>
										<div
											style={{
												color: isParentSelected ? COUNT_SECONDARY_COLOR_SELECTED : COUNT_SECONDARY_COLOR_UNSELECTED,
												fontSize: "11px",
												fontWeight: 600,
												lineHeight: 1.2,
												flex: 1,
												textAlign: "center",
											}}
										>
											{parentCurrentCount}
										</div>
										<div
											style={{
												color: isParentSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
												fontSize: "11px",
												fontWeight: 600,
												lineHeight: 1.2,
												flex: "none",
											}}
										>
											/
										</div>
										<div
											style={{
												color: isParentSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
												fontSize: "11px",
												fontWeight: 600,
												lineHeight: 1.2,
												flex: 1,
												textAlign: "center",
											}}
										>
											{parentTotalCount}
										</div>
									</div>
																</UnstyledButton>
							</Tooltip>
						)}
						{/* Collapse button positioned next to parent chip */}
						<ActionIcon
							variant="filled"
							size="sm"
							onClick={(e) => { e.stopPropagation(); toggleFamilyExpand(root.id); }}
							title="Collapse sub-grades"
							style={{
								alignSelf: "center",
								width: "32px",
								height: "32px",
								background: "white",
								color: color,
								border: `2px solid ${color}`,
							}}
						>
							<IconChevronDown size={16} />
						</ActionIcon>

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

		// Collapsed state - just show parent with expand button and counts
		// Calculate aggregated counts for the parent grade
		const { currentCount: parentCurrentCount, totalCount: parentTotalCount } = calculateAggregatedCounts(
			root.id,
			filterCounts,
			totalCounts,
		);
		const isParentSelected = selectedInFamily.length > 0;

		if (displayMode === "icon" && imageSrc) {
			return (
				<div key={root.id} style={{ display: "flex", alignItems: "stretch", gap: "0px" }}>
					<Tooltip label={formatGradeName(root.id)} position="top" withArrow={true}>
						<UnstyledButton
							onClick={() => { onToggleFamily(root.id); }}
							style={{
								...FILTER_BUTTON_BASE_STYLE,
								borderRadius: FILTER_BUTTON_BORDER_RADIUS, // Keep all corners rounded
								border: `2px solid var(--mantine-color-${color}-${selectedInFamily.length > 0 ? "filled" : "outline"})`,
								background: selectedInFamily.length > 0 ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
								opacity: hasAnySelection && selectedInFamily.length === 0 ? 0.7 : 1,
								position: "relative", // Required for absolute positioning of child elements
							}}
						>
							{/* Image container exactly like FilterSection */}
							<div style={{
								width: FILTER_CHIP_WIDTH,
								height: FILTER_CHIP_HEIGHT,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}>
								<Image
									src={imageSrc}
									alt={formatGradeName(root.id)}
									width={FILTER_CHIP_WIDTH}
									height={FILTER_CHIP_HEIGHT}
									style={getFilterImageStyle(imageSrc)}
								/>
							</div>
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
							{/* Count display integrated like FilterSection */}
							<div
								style={{
									background: isParentSelected ? COUNT_PRIMARY_COLOR_UNSELECTED : COUNT_BG_UNSELECTED,
									borderRadius: 3,
									padding: "1px 4px",
									display: "flex",
									alignItems: "center",
									width: "100%",
									marginTop: "2px",
								}}
							>
								<div
									style={{
										color: isParentSelected ? COUNT_SECONDARY_COLOR_SELECTED : COUNT_SECONDARY_COLOR_UNSELECTED,
										fontSize: "11px",
										fontWeight: 600,
										lineHeight: 1.2,
										flex: 1,
										textAlign: "center",
									}}
								>
									{parentCurrentCount}
								</div>
								<div
									style={{
										color: isParentSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
										fontSize: "11px",
										fontWeight: 600,
										lineHeight: 1.2,
										flex: "none",
									}}
								>
									/
								</div>
								<div
									style={{
										color: isParentSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
										fontSize: "11px",
										fontWeight: 600,
										lineHeight: 1.2,
										flex: 1,
										textAlign: "center",
									}}
								>
									{parentTotalCount}
								</div>
							</div>
						{/* Integrated expand/collapse button - vertically centered */}
			<ActionIcon
				variant="subtle"
				size="sm"
				onClick={(e) => { e.stopPropagation(); toggleFamilyExpand(root.id); }}
				title="Expand sub-grades"
				style={{
					position: "absolute",
					top: "50%",
					right: 2,
					transform: "translateY(-50%)",
					width: "28px",
					height: "28px",
					zIndex: 20,
					background: "white",
					color: color,
					border: `2px solid ${color}`,
				}}
			>
				<IconChevronRight size={14} />
			</ActionIcon>
		</UnstyledButton>
					</Tooltip>
				</div>
			);
		}

		return (
			<div key={root.id} style={{ display: "flex", alignItems: "stretch", gap: "0px" }}>
				<Tooltip label={formatGradeName(root.id)} position="top" withArrow={true}>
					<UnstyledButton
						onClick={() => { onToggleFamily(root.id); }}
						style={{
							...FILTER_BUTTON_BASE_STYLE,
							borderRadius: FILTER_BUTTON_BORDER_RADIUS, // Keep all corners rounded
							border: `2px solid var(--mantine-color-${color}-${selectedInFamily.length > 0 ? "filled" : "outline"})`,
							background: selectedInFamily.length > 0 ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
							opacity: hasAnySelection && selectedInFamily.length === 0 ? 0.7 : 1,
							position: "relative", // Required for absolute positioning of child elements
						}}
					>
						{/* Text container exactly like FilterSection */}
						<div style={{
							width: FILTER_CHIP_WIDTH,
							height: FILTER_CHIP_HEIGHT,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}>
							<Text
								size="xs"
								fw={900}
								lineClamp={1}
								ta="center"
								style={{
									color: selectedInFamily.length > 0 ? "white" : UNSELECTED_TEXT_COLOR,
									fontFamily: "Inter, system-ui, -apple-system, sans-serif",
									fontVariantNumeric: "tabular-nums",
									textTransform: "uppercase",
									letterSpacing: -0.5,
								}}
							>
								{formatGradeName(root.id)}
							</Text>
						</div>
						{/* Count display - part of the same button like FilterSection */}
						<div
							style={{
								background: isParentSelected ? COUNT_PRIMARY_COLOR_UNSELECTED : COUNT_BG_UNSELECTED,
								borderRadius: 3,
								padding: "1px 4px",
								display: "flex",
								alignItems: "center",
								width: "100%",
							}}
						>
							<div
								style={{
									color: isParentSelected ? COUNT_SECONDARY_COLOR_SELECTED : COUNT_SECONDARY_COLOR_UNSELECTED,
									fontSize: "11px",
									fontWeight: 600,
									lineHeight: 1.2,
									flex: 1,
									textAlign: "center",
								}}
							>
								{parentCurrentCount}
							</div>
							<div
								style={{
									color: isParentSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
									fontSize: "11px",
									fontWeight: 600,
									lineHeight: 1.2,
									flex: "none",
								}}
							>
								/
							</div>
							<div
								style={{
									color: isParentSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
									fontSize: "11px",
									fontWeight: 600,
									lineHeight: 1.2,
									flex: 1,
									textAlign: "center",
								}}
							>
								{parentTotalCount}
							</div>
						</div>
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
					{/* Integrated expand/collapse button - vertically centered */}
			<ActionIcon
				variant="subtle"
				size="sm"
				onClick={(e) => { e.stopPropagation(); toggleFamilyExpand(root.id); }}
				title="Expand sub-grades"
				style={{
					position: "absolute",
					top: "50%",
					right: 2,
					transform: "translateY(-50%)",
					width: "28px",
					height: "28px",
					zIndex: 20,
					background: "white",
					color: color,
					border: `2px solid ${color}`,
				}}
			>
				<IconChevronRight size={14} />
			</ActionIcon>
		</UnstyledButton>
				</Tooltip>
			</div>
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
						// Special handling for "Other" - it doesn't have a grade object
						if (gradeId === "Other") {
							return (
								<Tooltip key={gradeId} label="Other (no grade)" position="top" withArrow={true}>
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
											Other
										</Text>
									</UnstyledButton>
								</Tooltip>
							);
						}

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
					{hasOtherOption && renderGradeChip("Other")}
				</Group>
			)}
		</Box>
	);
}
