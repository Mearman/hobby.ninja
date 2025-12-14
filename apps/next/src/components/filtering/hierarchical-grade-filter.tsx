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
	Chip,
	Group,
	Text,
	Tooltip,
	UnstyledButton,
} from "@mantine/core";
import {
	IconChevronDown,
	IconChevronRight,
	IconPhoto,
	IconTextSize,
} from "@tabler/icons-react";
import Image from "next/image";
import { Fragment, useState } from "react";

import { getGradeImage } from "@/lib/image-lookup";

const FILTER_IMAGE_HEIGHT = 56;
const FILTER_IMAGE_STYLE: React.CSSProperties = {
	height: FILTER_IMAGE_HEIGHT,
	width: "auto",
	objectFit: "contain",
	display: "block",
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
}

export function HierarchicalGradeFilter({
	availableGrades,
	selectedGrades,
	onToggle,
	onToggleFamily,
	displayMode,
	onDisplayModeToggle,
	color = "teal",
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
		const imageSrc = getGradeImage(gradeId);
		const hasAnySelection = selectedGrades.length > 0;
		const label = options?.label ?? formatGradeName(gradeId);
		const borderStyle = options?.dashed ? "dashed" : "solid";

		if (displayMode === "icon" && imageSrc) {
			return (
				<Tooltip key={gradeId} label={label} position="top" withArrow={true}>
					<UnstyledButton
						onClick={() => { onToggle(gradeId); }}
						style={{
							height: FILTER_IMAGE_HEIGHT,
							borderRadius: 8,
							overflow: "hidden",
							border: `2px ${borderStyle} var(--mantine-color-${color}-${isSelected ? "filled" : "outline"})`,
							background: isSelected ? `var(--mantine-color-${color}-filled)` : "transparent",
							opacity: hasAnySelection && !isSelected ? 0.7 : 1,
						}}
					>
						<Image
							src={imageSrc}
							alt={label}
							width={120}
							height={FILTER_IMAGE_HEIGHT}
							style={FILTER_IMAGE_STYLE}
						/>
					</UnstyledButton>
				</Tooltip>
			);
		}

		return (
			<Chip
				key={gradeId}
				checked={isSelected}
				onChange={() => { onToggle(gradeId); }}
				size="sm"
				variant="outline"
				color={color}
				styles={options?.dashed ? { label: { fontStyle: "italic" } } : undefined}
			>
				{label}
			</Chip>
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
		const imageSrc = getGradeImage(root.id);
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
											position: "relative",
											height: FILTER_IMAGE_HEIGHT,
											borderRadius: 8,
											overflow: "hidden",
											border: `2px solid var(--mantine-color-${color}-${selectedInFamily.length > 0 ? "filled" : "outline"})`,
											background: selectedInFamily.length === familyIds.length ? `var(--mantine-color-${color}-filled)` : "transparent",
											opacity: hasAnySelection && selectedInFamily.length === 0 ? 0.7 : 1,
										}}
									>
										<Image
											src={imageSrc}
											alt={formatGradeName(root.id)}
											width={120}
											height={FILTER_IMAGE_HEIGHT}
											style={FILTER_IMAGE_STYLE}
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
								<Chip
									checked={selectedInFamily.length > 0}
									onChange={() => { onToggleFamily(root.id); }}
									size="sm"
									variant="outline"
									color={color}
								>
									{formatGradeName(root.id)}
								</Chip>
								<ActionIcon
									variant="filled"
									size="sm"
									color={color}
									onClick={() => { toggleFamilyExpand(root.id); }}
									title="Collapse sub-grades"
								>
									<IconChevronDown size={14} />
								</ActionIcon>
								{selectedInFamily.length > 0 && (
									<Badge size="xs" variant="filled" color={color}>
										{selectedInFamily.length}/{familyIds.length}
									</Badge>
								)}
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
								position: "relative",
								height: FILTER_IMAGE_HEIGHT,
								borderRadius: 8,
								overflow: "hidden",
								border: `2px solid var(--mantine-color-${color}-${selectedInFamily.length > 0 ? "filled" : "outline"})`,
								background: selectedInFamily.length > 0 ? `var(--mantine-color-${color}-filled)` : "transparent",
								opacity: hasAnySelection && selectedInFamily.length === 0 ? 0.7 : 1,
							}}
						>
							<Image
								src={imageSrc}
								alt={formatGradeName(root.id)}
								width={120}
								height={FILTER_IMAGE_HEIGHT}
								style={FILTER_IMAGE_STYLE}
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
				<Chip
					checked={selectedInFamily.length > 0}
					onChange={() => { onToggleFamily(root.id); }}
					size="sm"
					variant="outline"
					color={color}
				>
					{formatGradeName(root.id)}
				</Chip>
				<ActionIcon
					variant="subtle"
					size="sm"
					onClick={() => { toggleFamilyExpand(root.id); }}
					title="Expand sub-grades"
				>
					<IconChevronRight size={14} />
				</ActionIcon>
				{selectedInFamily.length > 0 && (
					<Badge size="xs" variant="light" color={color}>
						{selectedInFamily.length}/{familyIds.length}
					</Badge>
				)}
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
				<ActionIcon
					variant={displayMode === "icon" ? "filled" : "light"}
					size="sm"
					onClick={(e) => { e.stopPropagation(); onDisplayModeToggle(); }}
					title={displayMode === "icon" ? "Switch to text labels" : "Switch to icons"}
				>
					{displayMode === "icon" ? <IconPhoto size={16} /> : <IconTextSize size={16} />}
				</ActionIcon>
			</Group>

			{/* Collapsed: Show selected values only */}
			{!expanded && selectedGrades.length > 0 && (
				<Group gap="xs" wrap="wrap" mt="xs">
					{selectedGrades.map((gradeId) => {
						const imageSrc = getGradeImage(gradeId);
						if (displayMode === "icon" && imageSrc) {
							return (
								<Tooltip key={gradeId} label={formatGradeName(gradeId)} position="top" withArrow={true}>
									<UnstyledButton
										onClick={() => { onToggle(gradeId); }}
										style={{
											height: FILTER_IMAGE_HEIGHT,
											borderRadius: 8,
											overflow: "hidden",
											border: `2px solid var(--mantine-color-${color}-filled)`,
											background: `var(--mantine-color-${color}-filled)`,
										}}
									>
										<Image
											src={imageSrc}
											alt={formatGradeName(gradeId)}
											width={120}
											height={FILTER_IMAGE_HEIGHT}
											style={FILTER_IMAGE_STYLE}
										/>
									</UnstyledButton>
								</Tooltip>
							);
						}
						return (
							<Chip
								key={gradeId}
								checked={true}
								onChange={() => { onToggle(gradeId); }}
								size="xs"
								variant="filled"
								color={color}
							>
								{formatGradeName(gradeId)}
							</Chip>
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
