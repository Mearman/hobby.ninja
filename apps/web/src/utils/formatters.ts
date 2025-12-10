/**
 * Utility functions for formatting data throughout the application
 */

import type { PurchaseInfo, ItemStatus } from '../types/hobby';

/**
 * Format currency amount with proper symbol and decimals
 */
export const formatCurrency = (
	amount: number,
	currency: string = 'JPY',
	locale: string = 'ja-JP'
): string => {
	try {
		return new Intl.NumberFormat(locale, {
			style: 'currency',
			currency,
			minimumFractionDigits: currency === 'JPY' ? 0 : 2,
			maximumFractionDigits: currency === 'JPY' ? 0 : 2,
		}).format(amount);
	} catch (error) {
		console.warn(`Failed to format currency: ${currency}`, error);
		return `${currency} ${amount.toLocaleString()}`;
	}
};

/**
 * Format date string to readable format
 */
export const formatDate = (
	dateString: string,
	locale: string = 'en-US',
	options: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	}
): string => {
	try {
		const date = new Date(dateString);
		return date.toLocaleDateString(locale, options);
	} catch (error) {
		console.warn(`Failed to format date: ${dateString}`, error);
		return dateString;
	}
};

/**
 * Format relative time (e.g., "2 days ago", "in 3 months")
 */
export const formatRelativeTime = (
	dateString: string,
	locale: string = 'en-US'
): string => {
	try {
		const date = new Date(dateString);
		const now = new Date();
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diffInSeconds < 60) {
			return 'just now';
		}

		const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

		if (diffInSeconds < 3600) {
			const minutes = Math.floor(diffInSeconds / 60);
			return rtf.format(-minutes, 'minute');
		}

		if (diffInSeconds < 86400) {
			const hours = Math.floor(diffInSeconds / 3600);
			return rtf.format(-hours, 'hour');
		}

		if (diffInSeconds < 2592000) {
			const days = Math.floor(diffInSeconds / 86400);
			return rtf.format(-days, 'day');
		}

		if (diffInSeconds < 31536000) {
			const months = Math.floor(diffInSeconds / 2592000);
			return rtf.format(-months, 'month');
		}

		const years = Math.floor(diffInSeconds / 31536000);
		return rtf.format(-years, 'year');
	} catch (error) {
		console.warn(`Failed to format relative time: ${dateString}`, error);
		return formatDate(dateString, locale);
	}
};

/**
 * Format item status for display
 */
export const formatItemStatus = (status: ItemStatus): string => {
	const statusMap: Record<ItemStatus, string> = {
		wanted: 'Wanted',
		ordered: 'Ordered',
		owned: 'Owned',
		building: 'Building',
		completed: 'Completed',
		for_sale: 'For Sale',
		traded: 'Traded',
		lost: 'Lost',
		archived: 'Archived',
	};

	return statusMap[status] || status;
};

/**
 * Format purchase information for display
 */
export const formatPurchaseInfo = (purchaseInfo?: PurchaseInfo): string => {
	if (!purchaseInfo) {
		return 'No purchase info';
	}

	const parts: string[] = [];

	if (purchaseInfo.price) {
		const price = formatCurrency(purchaseInfo.price, purchaseInfo.currency || 'JPY');
		parts.push(price);
	}

	if (purchaseInfo.date) {
		const date = formatDate(purchaseInfo.date);
		parts.push(date);
	}

	if (purchaseInfo.seller) {
		parts.push(`from ${purchaseInfo.seller}`);
	}

	if (purchaseInfo.condition) {
		parts.push(`(${purchaseInfo.condition})`);
	}

	return parts.length > 0 ? parts.join(' ') : 'Basic purchase info';
};

/**
 * Format scale ratio (e.g., "1/144" -> "1/144 scale")
 */
export const formatScale = (scale: string): string => {
	if (!scale) {
		return '';
	}

	// Common scale patterns
	const scalePatterns = [
		{ pattern: /^\/\d+$/, format: (s: string) => `1${s} scale` },
		{ pattern: /^\d+\/\d+$/, format: (s: string) => `${s} scale` },
		{ pattern: /^\d+$/, format: (s: string) => `1/${s} scale` },
	];

	for (const { pattern, format } of scalePatterns) {
		if (pattern.test(scale)) {
			return format(scale);
		}
	}

	return scale;
};

/**
 * Format list of items with count
 */
export const formatListWithCount = <T>(
	items: T[],
	itemFormatter: (item: T, index: number) => string,
	maxItems: number = 3
): string => {
	if (items.length === 0) {
		return 'None';
	}

	const formattedItems = items
		.slice(0, maxItems)
		.map((item, index) => itemFormatter(item, index))
		.join(', ');

	if (items.length > maxItems) {
		return `${formattedItems} and ${items.length - maxItems} more`;
	}

	return formattedItems;
};

/**
 * Format percentage with proper decimal places
 */
export const formatPercentage = (
	value: number,
	decimals: number = 1,
	locale: string = 'en-US'
): string => {
	try {
		return new Intl.NumberFormat(locale, {
			style: 'percent',
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}).format(value / 100);
	} catch (error) {
		console.warn(`Failed to format percentage: ${value}`, error);
		return `${value}%`;
	}
};

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes: number, locale: string = 'en-US'): string => {
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toLocaleString(locale, { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
	if (text.length <= maxLength) {
		return text;
	}

	return text.slice(0, maxLength).trim() + '...';
};