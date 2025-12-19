"use client";

import { Button, Group, Tooltip } from "@mantine/core";
import { IconLayoutGrid, IconList, IconTable } from "@tabler/icons-react";
import { useState, useCallback } from "react";

export type ViewMode = "grid" | "list" | "table";

interface ViewSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  disabled?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
}

const VIEW_MODES: Array<{ mode: ViewMode; icon: typeof IconLayoutGrid; label: string }> = [
	{ mode: "grid", icon: IconLayoutGrid, label: "Grid view" },
	{ mode: "list", icon: IconList, label: "List view" },
	{ mode: "table", icon: IconTable, label: "Table view" },
];

const ICON_SIZE_XS = 12;
const ICON_SIZE_SM = 14;
const ICON_SIZE_DEFAULT = 16;

export function ViewSwitcher({ value, onChange, disabled = false, size = "sm" }: ViewSwitcherProps) {
	const handleViewChange = useCallback((mode: ViewMode) => {
		onChange(mode);
	}, [onChange]);

	return (
		<Group gap="xs" role="radiogroup" aria-label="View mode">
			{VIEW_MODES.map(({ mode, icon: Icon, label }) => (
				<Tooltip key={mode} label={label} withinPortal={true}>
					<Button
						variant={value === mode ? "filled" : "light"}
						color={value === mode ? "blue" : "gray"}
						size={size}
						onClick={() => { handleViewChange(mode); }}
						disabled={disabled}
						aria-pressed={value === mode}
						aria-label={label}
						p={size === "xs" ? 4 : 8}
					>
						<Icon size={size === "xs" ? ICON_SIZE_XS : size === "sm" ? ICON_SIZE_SM : ICON_SIZE_DEFAULT} />
					</Button>
				</Tooltip>
			))}
		</Group>
	);
}

// Hook for managing view mode state with URL persistence
export function useViewMode(defaultMode: ViewMode = "grid") {
	// Initialize from URL params on mount
	const getInitialViewMode = (): ViewMode => {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- SSR compatibility check
		if (globalThis.window === undefined) {
			return defaultMode;
		}
		const params = new URLSearchParams(globalThis.location.search);
		const urlViewMode = params.get("view");
		const validModes: ViewMode[] = ["grid", "list", "table"];
		if (urlViewMode && validModes.includes(urlViewMode as ViewMode)) {
			return urlViewMode as ViewMode;
		}
		return defaultMode;
	};

	const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);

	const updateViewMode = useCallback((newMode: ViewMode) => {
		setViewMode(newMode);

		// Update URL without page reload
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- SSR compatibility check
		if (globalThis.window !== undefined) {
			const url = new URL(globalThis.location.href);
			if (newMode === defaultMode) {
				url.searchParams.delete("view");
			} else {
				url.searchParams.set("view", newMode);
			}
			globalThis.history.replaceState({}, "", url.toString());
		}
	}, [defaultMode]);

	return {
		viewMode,
		setViewMode: updateViewMode,
	};
}