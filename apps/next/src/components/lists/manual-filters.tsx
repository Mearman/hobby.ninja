"use client";

import type { Manual } from "@hobby-ninja/data";
import { TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";

import type { FilterProps } from "./types";

export function ManualFilters({ onFilterChange }: FilterProps<Manual>) {
	const [search, setSearch] = useState("");

	const handleSearchChange = (value: string) => {
		setSearch(value);
		onFilterChange({ search: value });
	};

	return (
		<TextInput
			leftSection={<IconSearch size={16} />}
			placeholder="Search manuals..."
			value={search}
			onChange={(e) => { handleSearchChange(e.target.value); }}
			size="md"
		/>
	);
}