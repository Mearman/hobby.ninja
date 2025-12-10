import { useState, useEffect } from "react";

import { getMaxYear, LEGACY_MAX_YEAR } from "@/lib/constants";

/**
 * Hook to get the dynamic maximum year from the dataset
 * Falls back to LEGACY_MAX_YEAR if data loading fails
 */
export function useMaxYear(): { maxYear: number; isLoading: boolean } {
	const [maxYear, setMaxYear] = useState(LEGACY_MAX_YEAR);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		const loadMaxYear = async () => {
			try {
				setIsLoading(true);
				const year = await getMaxYear();
				if (!cancelled) {
					setMaxYear(year);
				}
			} catch (error) {
				console.warn("Failed to load max year, using fallback:", error);
				if (!cancelled) {
					setMaxYear(LEGACY_MAX_YEAR);
				}
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};

		loadMaxYear();

		return () => {
			cancelled = true;
		};
	}, []);

	return { maxYear, isLoading };
}

export default useMaxYear;