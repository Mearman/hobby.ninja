"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface StickyFiltersContextValue {
	/** Whether the sticky filter bar content is expanded (showing cards) */
	expanded: boolean;
	/** Toggle expanded state */
	toggleExpanded: () => void;
	/** Whether there are active filters to show */
	hasActiveFilters: boolean;
	/** Set whether there are active filters */
	setHasActiveFilters: (value: boolean) => void;
	/** Whether the sticky bar is currently visible (scrolled past filters) */
	isVisible: boolean;
	/** Set visibility state */
	setIsVisible: (value: boolean) => void;
}

const StickyFiltersContext = createContext<StickyFiltersContextValue | null>(null);

export function StickyFiltersProvider({ children }: { children: ReactNode }) {
	const [expanded, setExpanded] = useState(true);
	const [hasActiveFilters, setHasActiveFilters] = useState(false);
	const [isVisible, setIsVisible] = useState(false);

	const toggleExpanded = () => {
		setExpanded((prev) => !prev);
	};

	return (
		<StickyFiltersContext.Provider
			value={{
				expanded,
				toggleExpanded,
				hasActiveFilters,
				setHasActiveFilters,
				isVisible,
				setIsVisible,
			}}
		>
			{children}
		</StickyFiltersContext.Provider>
	);
}

export function useStickyFilters(): StickyFiltersContextValue {
	const context = useContext(StickyFiltersContext);
	if (!context) {
		throw new Error("useStickyFilters must be used within a StickyFiltersProvider");
	}
	return context;
}

/** Optional hook that returns null if not in provider (for header which may be used outside homepage) */
export function useStickyFiltersOptional(): StickyFiltersContextValue | null {
	return useContext(StickyFiltersContext);
}
