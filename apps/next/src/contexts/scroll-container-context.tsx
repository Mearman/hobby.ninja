"use client";

import { createContext, useContext } from "react";

export interface ScrollContainerContextValue {
	/** Ref to the scrolling container element */
	scrollRef: React.RefObject<HTMLElement | null>;
	/** Ref to a fixed-position container for portaling fixed elements */
	fixedRef: React.RefObject<HTMLElement | null>;
}

/**
 * Context for providing a custom scroll container to components that need scroll tracking.
 * When null, components should fall back to window scroll.
 */
export const ScrollContainerContext = createContext<ScrollContainerContextValue | null>(null);

/**
 * Hook to get the scroll container context.
 * Returns null if no custom container is provided (use window scroll).
 */
export function useScrollContainer(): ScrollContainerContextValue | null {
	return useContext(ScrollContainerContext);
}
