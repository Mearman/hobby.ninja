"use client";

import { useSearch } from "@/lib/fuse-search";
import { Badge, Box, Group, Text, TextInput, Combobox, useCombobox } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState, useEffect, useMemo } from "react";
import { getSearchItemDisplayName } from "@/lib/client-data";

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  onSearch?: (value: string) => void;
}

export function SearchAutocomplete({
  value,
  onChange,
  placeholder = "Search items...",
  disabled = false,
  size = "md",
  onSearch
}: SearchAutocompleteProps) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const combobox = useCombobox();
  const { search } = useSearch();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  // Get search suggestions
  const suggestions = useMemo(() => {
    if (!debouncedValue || debouncedValue.length < 2) return [];

    try {
      const results = search(debouncedValue, { limit: 8 });
      return results.slice(0, 5).map(result => ({
        value: getSearchItemDisplayName(result.item),
        item: result.item,
        score: result.score
      }));
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }, [debouncedValue, search]);

  const options = suggestions.map((suggestion, index) => (
    <Combobox.Option value={suggestion.value} key={`${suggestion.value}-${index}`}>
      <Group justify="space-between">
        <Text size="sm">{suggestion.value}</Text>
        {suggestion.item.series && (
          <Badge size="xs" variant="light">{suggestion.item.series}</Badge>
        )}
      </Group>
    </Combobox.Option>
  ));

  const handleOptionSubmit = (optionValue: string) => {
    onChange(optionValue);
    onSearch?.(optionValue);
    combobox.closeDropdown();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onSearch?.(value);
      combobox.closeDropdown();
    }
  };

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleOptionSubmit}
      withinPortal={false}
    >
      <Combobox.Target>
        <TextInput
          leftSection={<IconSearch size={16} />}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          size={size}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={200} style={{ overflowY: 'auto' }}>
          {options.length > 0 ? (
            options
          ) : debouncedValue && debouncedValue.length >= 2 ? (
            <Combobox.Empty>
              <Text size="sm" c="dimmed" ta="center" py="sm">
                No suggestions found
              </Text>
            </Combobox.Empty>
          ) : (
            <Combobox.Empty>
              <Text size="sm" c="dimmed" ta="center" py="sm">
                Type at least 2 characters for suggestions
              </Text>
            </Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}