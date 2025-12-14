"use client";

import { Group, Stack, Text, TextInput } from "@mantine/core";
import { IconCalendar } from "@tabler/icons-react";

export interface DateRangeValue {
	start: Date | null;
	end: Date | null;
}

export interface DateRangeFilterProps {
	value: DateRangeValue;
	onChange: (value: DateRangeValue) => void;
	label?: string;
	placeholder?: {
		start?: string;
		end?: string;
	};
	disabled?: boolean;
	size?: "xs" | "sm" | "md" | "lg";
}

// Constants for end-of-day time
const END_OF_DAY_HOURS = 23;
const END_OF_DAY_MINUTES = 59;
const END_OF_DAY_SECONDS = 59;
const END_OF_DAY_MILLISECONDS = 999;

// Format date for input value
function formatDate(date: Date | null): string {
	if (!date) return "";
	return date.toISOString().split("T")[0]; // YYYY-MM-DD format
}

// Set default end date to today if not provided
function getDefaultEnd(): Date {
	const today = new Date();
	today.setHours(
		END_OF_DAY_HOURS,
		END_OF_DAY_MINUTES,
		END_OF_DAY_SECONDS,
		END_OF_DAY_MILLISECONDS,
	);
	return today;
}

export function DateRangeFilter({
	value,
	onChange,
	label = "Date Range",
	placeholder = {
		start: "Start date",
		end: "End date",
	},
	disabled = false,
	size = "sm",
}: DateRangeFilterProps) {
	const handleStartChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const start = event.target.value ? new Date(event.target.value) : null;
		onChange({ start, end: value.end });
	};

	const handleEndChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const end = event.target.value ? new Date(event.target.value) : null;
		onChange({ start: value.start, end });
	};

	return (
		<Stack gap="xs">
			<Text size="sm" fw={500}>
				{label}
			</Text>
			<Group gap="sm">
				<TextInput
					leftSection={<IconCalendar size={16} />}
					placeholder={placeholder.start}
					value={formatDate(value.start)}
					onChange={handleStartChange}
					disabled={disabled}
					size={size}
					style={{ flex: 1 }}
					type="date"
				/>
				<Text size="sm" c="dimmed">
					to
				</Text>
				<TextInput
					leftSection={<IconCalendar size={16} />}
					placeholder={placeholder.end}
					value={formatDate(value.end ?? getDefaultEnd())}
					onChange={handleEndChange}
					disabled={disabled}
					size={size}
					style={{ flex: 1 }}
					type="date"
				/>
			</Group>
		</Stack>
	);
}

// Utility function to check if a date falls within the range
export function isDateInRange(date: Date | string | undefined, range: DateRangeValue): boolean {
	if (!date) return true; // Include items with no date

	const itemDate = typeof date === "string" ? new Date(date) : date;

	if (range.start && itemDate < range.start) return false;
	if (range.end && itemDate > range.end) return false;

	return true;
}

// Utility function to extract year from various date formats
export function extractYearFromDate(date: Date | string | { year?: string } | undefined): string {
	if (!date) return "";

	if (typeof date === "string") {
		return date.split("-")[0];
	}

	if (date instanceof Date) {
		return date.getFullYear().toString();
	}

	if (typeof date === "object" && "year" in date && date.year) {
		return date.year;
	}

	return "";
}