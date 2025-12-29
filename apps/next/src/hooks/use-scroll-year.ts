"use client";

import { useEffect, useRef, useState } from "react";

const DATA_YEAR_SELECTOR = "[data-year]";

/**
 * Hook to track which year is currently most visible in the viewport.
 * Uses IntersectionObserver to track which elements are visible,
 * and requestAnimationFrame for smooth scroll tracking.
 *
 * @param containerSelector - CSS selector for the container to observe (defaults to document)
 * @returns The year most visible in the viewport, or undefined if none
 */
export function useScrollYear(containerSelector?: string): number | undefined {
	const [currentYear, setCurrentYear] = useState<number | undefined>();
	const observerRef = useRef<IntersectionObserver | null>(null);
	// Track currently visible elements (without stale positions)
	const visibleElementsRef = useRef<Set<HTMLElement>>(new Set());
	// RAF scheduling to avoid jank
	const rafIdRef = useRef<number | null>(null);

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

			// Find element closest to viewport center (50% mark)
			const viewportCenter = window.innerHeight / 2;
			let closestElement: HTMLElement | undefined;
			let closestDistance = Number.POSITIVE_INFINITY;

			for (const element of visibleElements) {
				const rect = element.getBoundingClientRect();
				// Calculate element's center point
				const elementCenter = rect.top + rect.height / 2;
				const distance = Math.abs(elementCenter - viewportCenter);

				if (distance < closestDistance) {
					closestDistance = distance;
					closestElement = element;
				}
			}

			if (closestElement) {
				const yearAttr = closestElement.dataset.year;
				if (yearAttr) {
					const year = Number.parseInt(yearAttr, 10);
					if (!Number.isNaN(year)) {
						setCurrentYear(year);
					}
				}
			}
		};

		// Schedule update on next animation frame (avoids jank)
		const scheduleUpdate = () => {
			if (rafIdRef.current !== null) return; // Already scheduled
			rafIdRef.current = requestAnimationFrame(() => {
				rafIdRef.current = null;
				updateCurrentYear();
			});
		};

		const observer = new IntersectionObserver(
			(entries) => {
				const visibleElements = visibleElementsRef.current;

				for (const entry of entries) {
					const element = entry.target as HTMLElement;
					if (!element.dataset.year) continue;

					if (entry.isIntersecting) {
						visibleElements.add(element);
					} else {
						visibleElements.delete(element);
					}
				}

				scheduleUpdate();
			},
			{
				// Watch a larger region to track elements before they reach center
				rootMargin: "-10% 0px -10% 0px",
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

		// Add scroll listener - RAF scheduling ensures smooth updates
		window.addEventListener("scroll", scheduleUpdate, { passive: true });

		return () => {
			observer.disconnect();
			window.removeEventListener("scroll", scheduleUpdate);
			if (rafIdRef.current !== null) {
				cancelAnimationFrame(rafIdRef.current);
			}
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
				// Handle removed nodes - clean up our tracking set
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
