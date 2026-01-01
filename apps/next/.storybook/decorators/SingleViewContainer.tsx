import type { Decorator } from "@storybook/react";
import React, { useMemo, useRef } from "react";

import { ScrollContainerContext, type ScrollContainerContextValue } from "../../src/contexts/scroll-container-context";

interface SingleViewContainerProps {
	children: React.ReactNode;
	height?: number;
}

/**
 * Container that provides scroll container context for single-view stories.
 * Similar to MultiDevice but without width constraints - uses full viewport.
 *
 * Provides a two-layer structure:
 * - Fixed layer: For portaled elements like YearScrollbar
 * - Scroll layer: For scrolling content
 */
function SingleViewContainerInner({ children, height = 800 }: SingleViewContainerProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const fixedRef = useRef<HTMLDivElement>(null);

	const contextValue = useMemo<ScrollContainerContextValue>(() => ({
		scrollRef,
		fixedRef,
	}), []);

	return (
		<div style={{ height, position: "relative", overflow: "hidden" }}>
			{/* Fixed position layer for portaled elements */}
			<div
				ref={fixedRef}
				style={{
					position: "absolute",
					inset: 0,
					pointerEvents: "none",
					zIndex: 100,
				}}
			/>
			{/* Scrolling content layer */}
			<div
				ref={scrollRef}
				style={{
					height: "100%",
					overflowY: "auto",
					overflowX: "hidden",
				}}
			>
				<ScrollContainerContext.Provider value={contextValue}>
					{children}
				</ScrollContainerContext.Provider>
			</div>
		</div>
	);
}

/**
 * Decorator that wraps the story in a scroll container context.
 * Use this for single-view stories that need YearScrollbar to render correctly.
 */
export const SingleViewContainer: Decorator = (Story) => (
	<SingleViewContainerInner>
		<Story />
	</SingleViewContainerInner>
);

/**
 * Factory to create a SingleViewContainer decorator with custom height.
 */
export function createSingleViewContainer(height: number): Decorator {
	return (Story) => (
		<SingleViewContainerInner height={height}>
			<Story />
		</SingleViewContainerInner>
	);
}
