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
import { Fragment, useEffect, useState } from "react";


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
const TEXT_WRAP_STYLE = {
	wordBreak: "break-word" as const,
	hyphens: "auto" as const,
};
const TEXT_STYLE_BASE = {
	fontFamily: "Inter, system-ui, -apple-system, sans-serif",
	fontVariantNumeric: "tabular-nums" as const,
	textTransform: "uppercase" as const,
	letterSpacing: -0.5,
	...TEXT_WRAP_STYLE,
};

// Base style for all filter button containers - EXACT match with FilterSection
const FILTER_BUTTON_BASE_STYLE: React.CSSProperties = {
	width: FILTER_CHIP_WIDTH,
	height: "100%", // Fill grid cell height for equal-height rows
	borderRadius: 8,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "flex-start", // Content wrapper handles centering
	position: "relative",
	cursor: "pointer",
	padding: 0,
	margin: 0,
	transition: "all 0.2s ease",
	overflow: "hidden",
};

// Grid container for filter chips - ensures equal height per row
const FILTER_CHIP_GRID_STYLE: React.CSSProperties = {
	display: "grid",
	gridTemplateColumns: `repeat(auto-fill, ${FILTER_CHIP_WIDTH}px)`,
	gap: "var(--mantine-spacing-xs)",
	alignItems: "stretch",
	marginTop: "var(--mantine-spacing-xs)",
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

	// Compute families that should be auto-collapsed (all children deselected)
	// This is a derived value, not state mutation in useEffect
	const familiesToCollapse = new Set<string>();
	for (const rootId of expandedFamilies) {
		const familyIds = getGradeFamilyIds(rootId).filter((id) => availableGrades.includes(id));
		// Only check selectable grades (those with items)
		const selectableFamilyIds = familyIds.filter(gradeId => (totalCounts?.[gradeId] ?? 0) > 0);
		const selectedFamilyCount = selectableFamilyIds.filter((grade) => selectedGrades.includes(grade)).length;
		if (selectedFamilyCount === 0) {
			familiesToCollapse.add(rootId);
		}
	}

	// Auto-collapse effect: triggered once when familiesToCollapse changes
	// Using a separate effect with a ref to avoid cascading renders
	useEffect(() => {
		if (familiesToCollapse.size > 0) {
			setExpandedFamilies((prev) => {
				const next = new Set(prev);
				for (const rootId of familiesToCollapse) next.delete(rootId);
				return next;
			});
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps -- familiesToCollapse is derived from deps
	}, [selectedGrades, availableGrades, totalCounts]);

	if (availableHierarchy.length === 0 && !hasOtherOption) return null;

	// Smart parent click handler with enhanced state management
	const handleParentClick = (rootId: string) => {
		const familyIds = getGradeFamilyIds(rootId).filter((id) => availableGrades.includes(id));
		// IMPORTANT: Only include grades that actually have items (can be selected in the UI)
		const selectableFamilyIds = familyIds.filter(gradeId => (totalCounts?.[gradeId] ?? 0) > 0);
		const currentGrades = selectedGrades;

		// Check how many family grades are currently selected (only selectable ones)
		const selectedFamilyCount = selectableFamilyIds.filter(grade => currentGrades.includes(grade)).length;

		// Delegate grade selection to parent via onToggleFamily
		// This ensures all grades are updated in a SINGLE state update, avoiding React batching issues
		onToggleFamily(rootId);

		// Handle expansion state locally (UI-only concern)
		// Match the selection logic: selectedFamilyCount === 0 → selecting → expand
		//                            selectedFamilyCount > 0 → deselecting → collapse
		if (selectedFamilyCount === 0) {
			// onToggleFamily will select all → expand the family to show children
			setExpandedFamilies((prev) => {
				const next = new Set(prev);
				next.add(rootId);
				return next;
			});
		} else {
			// onToggleFamily will deselect all → collapse the family
			setExpandedFamilies((prev) => {
				const next = new Set(prev);
				next.delete(rootId);
				return next;
			});
		}
	};

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
							flex: 1,
							width: "100%",
							height: "100%",
						}}>
							{/* Image container - centers image in remaining space */}
							<div style={{
								flex: 1,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}>
								<Image
									src={imageSrc}
									alt={label}
									width={FILTER_CHIP_WIDTH}
									height={FILTER_CHIP_HEIGHT}
									style={getFilterImageStyle(imageSrc)}
								/>
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
					) : (
						<div style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							flex: 1,
							width: "100%",
							height: "100%",
						}}>
							{/* Text container - centers text in remaining space */}
							<div style={{
								flex: 1,
								width: FILTER_CHIP_WIDTH,
								minHeight: FILTER_CHIP_HEIGHT,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								padding: "4px 2px",
							}}>
								<Text
									size="xs"
									fw={900}
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
									onClick={() => { handleParentClick(root.id); }}
									style={{
										...FILTER_BUTTON_BASE_STYLE,
										borderRadius: FILTER_BUTTON_BORDER_RADIUS, // Keep all corners rounded
										border: `2px solid var(--mantine-color-${color}-${selectedInFamily.length > 0 ? "filled" : "outline"})`,
										background: selectedInFamily.length === familyIds.length ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
										opacity: hasAnySelection && selectedInFamily.length === 0 ? 0.7 : 1,
										position: "relative", // Required for absolute positioning of child elements
									}}
								>
									{/* Content wrapper - fills button and positions content */}
									<div style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										flex: 1,
										width: "100%",
										height: "100%",
									}}>
										{/* Image container - centers image in remaining space */}
										<div style={{
											flex: 1,
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
									</div>
								</UnstyledButton>
							</Tooltip>
						) : (
							<Tooltip label={`${formatGradeName(root.id)} (select all)`} position="top" withArrow={true}>
								<UnstyledButton
									onClick={() => { handleParentClick(root.id); }}
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
									{/* Content wrapper - fills button and positions content */}
									<div style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										flex: 1,
										width: "100%",
										height: "100%",
									}}>
										{/* Text container - centers text in remaining space */}
										<div style={{
											flex: 1,
											width: FILTER_CHIP_WIDTH,
											minHeight: FILTER_CHIP_HEIGHT,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											padding: "4px 2px",
										}}>
											<Text
												size="xs"
												fw={900}
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
									</div>
									{/* Expand/collapse button in bottom right corner */}
									<ActionIcon
										variant="filled"
										size="sm"
										onClick={(e) => { e.stopPropagation(); toggleFamilyExpand(root.id); }}
										title="Collapse sub-grades"
										style={{
											position: "absolute",
											bottom: 4,
											right: 4,
											width: "24px",
											height: "24px",
											background: "white",
											color: color,
											border: `1px solid ${color}`,
											zIndex: 30,
										}}
									>
										<IconChevronDown size={12} />
									</ActionIcon>
								</UnstyledButton>
							</Tooltip>
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
							onClick={() => { handleParentClick(root.id); }}
							style={{
								...FILTER_BUTTON_BASE_STYLE,
								borderRadius: FILTER_BUTTON_BORDER_RADIUS, // Keep all corners rounded
								border: `2px solid var(--mantine-color-${color}-${selectedInFamily.length > 0 ? "filled" : "outline"})`,
								background: selectedInFamily.length > 0 ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
								opacity: hasAnySelection && selectedInFamily.length === 0 ? 0.7 : 1,
								position: "relative", // Required for absolute positioning of child elements
							}}
						>
							{/* Content wrapper - fills button and positions content */}
							<div style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								flex: 1,
								width: "100%",
								height: "100%",
							}}>
								{/* Image container - centers image in remaining space */}
								<div style={{
									flex: 1,
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
							</div>
						</UnstyledButton>
					</Tooltip>
				</div>
			);
		}

		return (
			<div key={root.id} style={{ display: "flex", alignItems: "stretch", gap: "0px" }}>
				<Tooltip label={formatGradeName(root.id)} position="top" withArrow={true}>
					<UnstyledButton
						onClick={() => { handleParentClick(root.id); }}
						style={{
							...FILTER_BUTTON_BASE_STYLE,
							borderRadius: FILTER_BUTTON_BORDER_RADIUS, // Keep all corners rounded
							border: `2px solid var(--mantine-color-${color}-${selectedInFamily.length > 0 ? "filled" : "outline"})`,
							background: selectedInFamily.length > 0 ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
							opacity: hasAnySelection && selectedInFamily.length === 0 ? 0.7 : 1,
							position: "relative", // Required for absolute positioning of child elements
						}}
					>
						{/* Content wrapper - fills button and positions content */}
						<div style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							flex: 1,
							width: "100%",
							height: "100%",
						}}>
							{/* Text container - centers text in remaining space */}
							<div style={{
								flex: 1,
								width: FILTER_CHIP_WIDTH,
								minHeight: FILTER_CHIP_HEIGHT,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								padding: "4px 2px",
							}}>
								<Text
									size="xs"
									fw={900}
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
						</div>
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
				<Box style={FILTER_CHIP_GRID_STYLE}>
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
											ta="center"
											style={{
												fontSize: displayMode === "icon" ? "14px" : "10px",
												letterSpacing: displayMode === "icon" ? "0.5px" : "normal",
												...TEXT_WRAP_STYLE,
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
										ta="center"
										style={{
											fontSize: displayMode === "icon" ? "14px" : "10px",
											letterSpacing: displayMode === "icon" ? "0.5px" : "normal",
											...TEXT_WRAP_STYLE,
										}}
									>
										{iconText}
									</Text>
								</UnstyledButton>
							</Tooltip>
						);
					})}
				</Box>
			)}

			{/* Expanded: Show all grades in horizontal flow */}
			{expanded && (
				<Box style={FILTER_CHIP_GRID_STYLE}>
					{availableHierarchy.map((entry) => renderRootGrade(entry))}
					{hasOtherOption && renderGradeChip("Other")}
				</Box>
			)}
		</Box>
	);
}
