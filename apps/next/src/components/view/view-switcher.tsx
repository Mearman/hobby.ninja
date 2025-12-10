"use client";

import { Button, Group, Tooltip, useMantineTheme } from "@mantine/core";
import { IconLayoutGrid, IconList, IconTable } from "@tabler/icons-react";
import { useState, useCallback, useEffect } from "react";

export type ViewMode = "grid" | "list" | "table";

interface ViewSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  disabled?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
}

const VIEW_MODES: { mode: ViewMode; icon: typeof IconLayoutGrid; label: string }[] = [
  { mode: "grid", icon: IconLayoutGrid, label: "Grid view" },
  { mode: "list", icon: IconList, label: "List view" },
  { mode: "table", icon: IconTable, label: "Table view" },
];

export function ViewSwitcher({ value, onChange, disabled = false, size = "sm" }: ViewSwitcherProps) {
  const theme = useMantineTheme();

  const handleViewChange = useCallback((mode: ViewMode) => {
    onChange(mode);
  }, [onChange]);

  return (
    <Group gap="xs" role="radiogroup" aria-label="View mode">
      {VIEW_MODES.map(({ mode, icon: Icon, label }) => (
        <Tooltip key={mode} label={label} withinPortal>
          <Button
            variant={value === mode ? "filled" : "light"}
            color={value === mode ? "blue" : "gray"}
            size={size}
            onClick={() => handleViewChange(mode)}
            disabled={disabled}
            aria-pressed={value === mode}
            aria-label={label}
            p={size === "xs" ? 4 : 8}
          >
            <Icon size={size === "xs" ? 12 : size === "sm" ? 14 : 16} />
          </Button>
        </Tooltip>
      ))}
    </Group>
  );
}

// Hook for managing view mode state with URL persistence
export function useViewMode(defaultMode: ViewMode = "grid") {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);

  // Initialize from URL params on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlViewMode = params.get("view") as ViewMode;
      if (urlViewMode && ["grid", "list", "table"].includes(urlViewMode)) {
        setViewMode(urlViewMode);
      }
    }
  }, []);

  const updateViewMode = useCallback((newMode: ViewMode) => {
    setViewMode(newMode);

    // Update URL without page reload
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (newMode === defaultMode) {
        url.searchParams.delete("view");
      } else {
        url.searchParams.set("view", newMode);
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, [defaultMode]);

  return {
    viewMode,
    setViewMode: updateViewMode,
  };
}