"use client";

import { useEffect, useRef, useState } from "react";

const DATA_YEAR_SELECTOR = "[data-year]";

/**
 * Hook to track which year is currently most visible in the viewport.
 * Uses IntersectionObserver to watch elements with data-year attribute.
 * Tracks the year of the topmost visible item in the center region.
 *
 * @param containerSelector - CSS selector for the container to observe (defaults to document)
 * @returns The year most visible in the viewport, or undefined if none
 */
export function useScrollYear(containerSelector?: string): number | undefined {
	const [currentYear, setCurrentYear] = useState<number | undefined>();
	const observerRef = useRef<IntersectionObserver | null>(null);
	// Track currently visible elements with their positions
	const visibleElementsRef = useRef<Map<HTMLElement, number>>(new Map());

	useEffect(() => {
		// Disconnect existing observer
		if (observerRef.current) {
			observerRef.current.disconnect();
		}

		visibleElementsRef.current.clear();

		const updateCurrentYear = () => {
			const visibleElements = visibleElementsRef.current;
			if (visibleElements.size === 0) {
				return; // Keep last known year
			}

			// Find the element closest to the top of the viewport center region
			let topElement: HTMLElement | undefined;
			let topPosition = Number.POSITIVE_INFINITY;

			for (const [element, position] of visibleElements) {
				if (position < topPosition) {
					topPosition = position;
					topElement = element;
				}
			}

			if (topElement) {
				const yearAttr = topElement.dataset.year;
				if (yearAttr) {
					const year = Number.parseInt(yearAttr, 10);
					if (!Number.isNaN(year)) {
						setCurrentYear(year);
					}
				}
			}
		};

		const observer = new IntersectionObserver(
			(entries) => {
				const visibleElements = visibleElementsRef.current;

				for (const entry of entries) {
					const element = entry.target as HTMLElement;
					if (!element.dataset.year) continue;

					if (entry.isIntersecting) {
						// Store element with its top position
						visibleElements.set(element, entry.boundingClientRect.top);
					} else {
						visibleElements.delete(element);
					}
				}

				updateCurrentYear();
			},
			{
				// Focus on the middle 40% of the viewport for current year detection
				rootMargin: "-30% 0px -30% 0px",
				threshold: 0,
			},
		);

		observerRef.current = observer;

		// Find and observe all elements with data-year attribute
		const container = containerSelector
			? document.querySelector(containerSelector)
			: document;

		if (container) {
			const elements = container.querySelectorAll(DATA_YEAR_SELECTOR);
			for (const element of elements) {
				observer.observe(element);
			}
		}

		return () => {
			observer.disconnect();
		};
	}, [containerSelector]);

	// Re-observe when DOM changes (for virtual scroll)
	useEffect(() => {
		const observer = observerRef.current;
		if (!observer) return;

		const container = containerSelector
			? document.querySelector(containerSelector)
			: document;

		if (!container) return;

		// Use MutationObserver to watch for new elements
		const mutationObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				// Handle removed nodes - clean up our tracking map
				for (const node of mutation.removedNodes) {
					if (node instanceof HTMLElement) {
						visibleElementsRef.current.delete(node);
						const childElements = node.querySelectorAll(DATA_YEAR_SELECTOR);
						for (const child of childElements) {
							visibleElementsRef.current.delete(child as HTMLElement);
						}
					}
				}

				// Handle added nodes - observe them
				for (const node of mutation.addedNodes) {
					if (node instanceof HTMLElement) {
						if (node.dataset.year) {
							observer.observe(node);
						}
						const childElements = node.querySelectorAll(DATA_YEAR_SELECTOR);
						for (const child of childElements) {
							observer.observe(child);
						}
					}
				}
			}
		});

		mutationObserver.observe(container as Node, {
			childList: true,
			subtree: true,
		});

		return () => {
			mutationObserver.disconnect();
		};
	}, [containerSelector]);

	return currentYear;
}
