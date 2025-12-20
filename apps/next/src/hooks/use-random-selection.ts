"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

// Simple client-side check using useSyncExternalStore
function emptySubscribe(): () => void {
	return function unsubscribe() {
		// No-op: static value never changes
	};
}
function getClientSnapshot(): boolean {
	return true;
}
function getServerSnapshot(): boolean {
	return false;
}

/**
 * Hook to randomly select items from a pool.
 * Returns deterministic selection on server render to avoid hydration mismatch,
 * then returns shuffled selection on client.
 *
 * @param items - Pool of items to select from
 * @param count - Number of items to select
 * @returns Selected items (first N on server, random N on client)
 */
export function useRandomSelection<T>(items: T[], count: number): T[] {
	const isClient = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

	return useMemo(() => {
		if (!isClient) {
			// Server: return first N items (deterministic)
			return items.slice(0, count);
		}
		// Client: shuffle and return random N items
		return shuffleArray(items).slice(0, count);
	}, [items, count, isClient]);
}
