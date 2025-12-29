"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook to track which year is currently most visible in the viewport.
 * Uses IntersectionObserver to watch elements with data-year attribute.
 *
 * @param containerSelector - CSS selector for the container to observe (defaults to document)
 * @returns The year most visible in the viewport, or undefined if none
 */
export function useScrollYear(containerSelector?: string): number | undefined {
	const [currentYear, setCurrentYear] = useState<number | undefined>();
	const observerRef = useRef<IntersectionObserver | null>(null);
	const visibleYearsRef = useRef<Map<number, number>>(new Map());

	const updateCurrentYear = useCallback(() => {
		const visibleYears = visibleYearsRef.current;
		if (visibleYears.size === 0) {
			setCurrentYear(undefined);
			return;
		}

		// Find the year with the most visible items
		let maxCount = 0;
		let topYear: number | undefined;

		for (const [year, count] of visibleYears) {
			if (count > maxCount) {
				maxCount = count;
				topYear = year;
			}
		}

		setCurrentYear(topYear);
	}, []);

	useEffect(() => {
		// Disconnect existing observer
		if (observerRef.current) {
			observerRef.current.disconnect();
		}

		visibleYearsRef.current.clear();

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const element = entry.target as HTMLElement;
					const yearAttr = element.dataset.year;
					if (!yearAttr) continue;

					const year = Number.parseInt(yearAttr, 10);
					if (Number.isNaN(year)) continue;

					const visibleYears = visibleYearsRef.current;

					if (entry.isIntersecting) {
						visibleYears.set(year, (visibleYears.get(year) ?? 0) + 1);
					} else {
						const count = visibleYears.get(year) ?? 0;
						if (count <= 1) {
							visibleYears.delete(year);
						} else {
							visibleYears.set(year, count - 1);
						}
					}
				}

				updateCurrentYear();
			},
			{
				// Focus on the middle 20% of the viewport for current year detection
				rootMargin: "-40% 0px -40% 0px",
				threshold: 0,
			},
		);

		observerRef.current = observer;

		// Find and observe all elements with data-year attribute
		const container = containerSelector
			? document.querySelector(containerSelector)
			: document;

		if (container) {
			const elements = container.querySelectorAll("[data-year]");
			for (const element of elements) {
				observer.observe(element);
			}
		}

		return () => {
			observer.disconnect();
		};
	}, [containerSelector, updateCurrentYear]);

	// Re-observe when DOM changes (for infinite scroll)
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
				for (const node of mutation.addedNodes) {
					if (node instanceof HTMLElement) {
						// Check if the added node has data-year
						if (node.dataset.year) {
							observer.observe(node);
						}
						// Check children
						const childElements = node.querySelectorAll("[data-year]");
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
