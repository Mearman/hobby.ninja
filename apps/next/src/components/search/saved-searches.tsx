"use client";

import {
  ActionIcon,
  Button,
  Group,
  Menu,
  Modal,
  Stack,
  Text,
  TextInput,
  Tooltip,
  Badge,
  ScrollArea,
} from "@mantine/core";
import {
  IconBookmark,
  IconBookmarkOff,
  IconClock,
  IconTrash,
  IconBookmarks,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";

interface SearchState {
  query: string;
  brand: string;
  category: string;
  series: string;
  sortBy: string;
  itemsPerPage: number;
}

export interface SavedSearch extends SearchState {
  id: string;
  name: string;
  createdAt: string;
  isRecent?: boolean;
}

interface SavedSearchesProps {
  currentSearch: SearchState;
  onLoadSearch: (search: SavedSearch) => void;
}

const STORAGE_KEY = "hobby-ninja-saved-searches";
const RECENT_SEARCHES_KEY = "hobby-ninja-recent-searches";
const MAX_RECENT_SEARCHES = 10;

export function SavedSearches({ currentSearch, onLoadSearch }: SavedSearchesProps) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [recentSearches, setRecentSearches] = useState<SavedSearch[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [searchName, setSearchName] = useState("");

  // Load saved searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const recent = localStorage.getItem(RECENT_SEARCHES_KEY);

      if (saved) {
        setSavedSearches(JSON.parse(saved));
      }
      if (recent) {
        setRecentSearches(JSON.parse(recent));
      }
    } catch (error) {
      console.error("Failed to load saved searches:", error);
    }
  }, []);

  // Save current search to recent searches
  const saveToRecent = (search: SearchState) => {
    const newRecentSearch: SavedSearch = {
      ...search,
      id: Date.now().toString(),
      name: search.query || `Search ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString(),
      isRecent: true,
    };

    setRecentSearches(prev => {
      const filtered = prev.filter(
        s => s.query !== search.query ||
             s.brand !== search.brand ||
             s.category !== search.category ||
             s.series !== search.series
      );
      const updated = [newRecentSearch, ...filtered].slice(0, MAX_RECENT_SEARCHES);

      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save recent searches:", error);
      }

      return updated;
    });
  };

  // Save current search
  const handleSaveSearch = () => {
    if (!searchName.trim()) return;

    const newSavedSearch: SavedSearch = {
      ...currentSearch,
      id: Date.now().toString(),
      name: searchName.trim(),
      createdAt: new Date().toISOString(),
    };

    setSavedSearches(prev => {
      const updated = [newSavedSearch, ...prev];

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save searches:", error);
      }

      return updated;
    });

    setSaveModalOpen(false);
    setSearchName("");
  };

  // Delete saved search
  const handleDeleteSearch = (id: string) => {
    setSavedSearches(prev => {
      const updated = prev.filter(s => s.id !== id);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to update saved searches:", error);
      }

      return updated;
    });
  };

  // Load search
  const handleLoadSearch = (search: SavedSearch) => {
    onLoadSearch(search);

    // Add to recent searches if it's not already saved
    if (!search.isRecent) {
      saveToRecent(search);
    }
  };

  // Get search display text
  const getSearchDisplay = (search: SavedSearch) => {
    const parts = [];
    if (search.query) parts.push(`"${search.query}"`);
    if (search.brand) parts.push(`Brand: ${search.brand}`);
    if (search.category) parts.push(`Category: ${search.category}`);
    if (search.series) parts.push(`Series: ${search.series}`);
    return parts.length > 0 ? parts.join(" • ") : "All items";
  };

  return (
    <>
      <Group gap="xs">
        {/* Save Search Button */}
        <Tooltip label="Save current search">
          <ActionIcon
            variant="light"
            onClick={() => {
              setSearchName(currentSearch.query || `Search ${new Date().toLocaleDateString()}`);
              setSaveModalOpen(true);
            }}
            disabled={!currentSearch.query && !currentSearch.brand && !currentSearch.category && !currentSearch.series}
          >
            <IconBookmark size={16} />
          </ActionIcon>
        </Tooltip>

        {/* Recent Searches */}
        <Menu position="bottom-start" shadow="md">
          <Menu.Target>
            <Tooltip label="Recent searches">
              <ActionIcon variant="light" disabled={recentSearches.length === 0}>
                <IconClock size={16} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>

          {recentSearches.length > 0 && (
            <Menu.Dropdown miw={280}>
              <Menu.Label>Recent Searches</Menu.Label>
              <ScrollArea.Autosize mah={300}>
                {recentSearches.map((search) => (
                  <Menu.Item
                    key={search.id}
                    onClick={() => handleLoadSearch(search)}
                    leftSection={<IconClock size={14} />}
                  >
                    <Stack gap={2}>
                      <Text size="sm" fw={500}>{search.name}</Text>
                      <Text size="xs" c="dimmed">{getSearchDisplay(search)}</Text>
                    </Stack>
                  </Menu.Item>
                ))}
              </ScrollArea.Autosize>
            </Menu.Dropdown>
          )}
        </Menu>

        {/* Saved Searches */}
        <Menu position="bottom-start" shadow="md">
          <Menu.Target>
            <Tooltip label="Saved searches">
              <ActionIcon variant="light" disabled={savedSearches.length === 0}>
                <IconBookmarks size={16} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>

          {savedSearches.length > 0 && (
            <Menu.Dropdown miw={320}>
              <Menu.Label>Saved Searches</Menu.Label>
              <ScrollArea.Autosize mah={400}>
                {savedSearches.map((search) => (
                  <Menu.Item
                    key={search.id}
                    onClick={() => handleLoadSearch(search)}
                    rightSection={
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSearch(search.id);
                        }}
                      >
                        <IconTrash size={10} />
                      </ActionIcon>
                    }
                  >
                    <Stack gap={2}>
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>{search.name}</Text>
                        <Badge size="xs" variant="light">
                          {new Date(search.createdAt).toLocaleDateString()}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">{getSearchDisplay(search)}</Text>
                    </Stack>
                  </Menu.Item>
                ))}
              </ScrollArea.Autosize>
            </Menu.Dropdown>
          )}
        </Menu>
      </Group>

      {/* Save Search Modal */}
      <Modal
        opened={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="Save Search"
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="Search Name"
            placeholder="Enter a name for this search"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            autoFocus
          />

          <Group justify="space-between">
            <Button
              variant="subtle"
              onClick={() => setSaveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSearch}
              disabled={!searchName.trim()}
            >
              Save Search
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}