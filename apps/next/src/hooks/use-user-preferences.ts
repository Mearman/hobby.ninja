"use client";

import { useState, useEffect, useCallback } from "react";

export interface UserPreferences {
	slideshowEnabled: boolean;
	autoLoadInfiniteScroll: boolean;
	infiniteScrollPageSize: number;
	reducedAnimations: boolean;
	hideFutureReleases: boolean;
	filterDisplayMode: "icon" | "text";
}

const STORAGE_KEY = "hobby-ninja-preferences";

const defaultPreferences: UserPreferences = {
	slideshowEnabled: true,
	autoLoadInfiniteScroll: true,
	infiniteScrollPageSize: 24,
	reducedAnimations: false,
	hideFutureReleases: false,
	filterDisplayMode: "icon",
};

export function useUserPreferences() {
	const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
	const [isLoaded, setIsLoaded] = useState(false);

	// Load preferences from localStorage on mount
	useEffect(() => {
		const loadPreferences = () => {
			try {
				const saved = localStorage.getItem(STORAGE_KEY);
				if (saved) {
					const parsed = JSON.parse(saved) as Partial<UserPreferences>;
					setPreferences(prev => ({ ...prev, ...parsed }));
				}
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error("Failed to load user preferences:", error);
			} finally {
				setIsLoaded(true);
			}
		};

		loadPreferences();
	}, []);

	// Update a single preference
	const updatePreference = useCallback(<K extends keyof UserPreferences>(
		key: K,
		value: UserPreferences[K],
	) => {
		setPreferences(prev => {
			const updated = { ...prev, [key]: value };
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error("Failed to save user preferences:", error);
			}
			return updated;
		});
	}, []);

	return { preferences, updatePreference, isLoaded };
}
