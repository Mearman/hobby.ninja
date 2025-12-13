"use client";

import { Group, Switch, Tooltip, Text } from "@mantine/core";
import { IconCalendarOff } from "@tabler/icons-react";

import { useUserPreferences } from "@/hooks/use-user-preferences";

interface FutureReleasesToggleProps {
	/** Number of items that will be hidden when toggle is on */
	futureCount?: number;
}

/**
 * Toggle to show/hide future releases.
 * Only renders on client (returns null during SSR).
 * Persists preference to localStorage.
 */
export function FutureReleasesToggle({ futureCount }: FutureReleasesToggleProps) {
	const { preferences, updatePreference, isLoaded } = useUserPreferences();

	// Don't render during SSR or before hydration
	if (!isLoaded) {
		return null;
	}

	const label = futureCount !== undefined && futureCount > 0
		? `Hide future releases (${futureCount})`
		: "Hide future releases";

	return (
		<Tooltip label="Hide items with release dates in the future" position="left">
			<Group gap="xs">
				<IconCalendarOff size={16} style={{ opacity: 0.6 }} />
				<Switch
					size="sm"
					checked={preferences.hideFutureReleases}
					onChange={() => { updatePreference("hideFutureReleases", !preferences.hideFutureReleases); }}
					label={<Text size="sm">{label}</Text>}
					styles={{ label: { paddingLeft: 8 } }}
				/>
			</Group>
		</Tooltip>
	);
}
