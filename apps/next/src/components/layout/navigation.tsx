'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Drawer,
  Stack,
  Group,
  Title,
  Text,
  Divider,
  ActionIcon,
  Badge,
  ScrollArea,
  ThemeIcon,
  UnstyledButton,
  Collapse
} from '@mantine/core';
import {
  IconHome,
  IconDatabase,
  IconFolder,
  IconSearch,
  IconAdjustmentsHorizontal,
  IconHeart,
  IconShoppingCart,
  IconSettings,
  IconInfoCircle,
  IconShare,
  IconChevronDown,
  IconChevronRight,
  IconExternalLink,
  IconDownload,
  IconUpload
} from '@tabler/icons-react';
import { fadeIn, mobileOnly } from '@/styles/components.css';

interface NavigationProps {
  opened: boolean;
  onClose: () => void;
}

interface NavigationItem {
  label: string;
  href?: string;
  icon: React.ComponentType<any>;
  badge?: string;
  children?: NavigationItem[];
  external?: boolean;
}

export function Navigation({ opened, onClose }: NavigationProps) {
  const pathname = usePathname();
  const [openedSections, setOpenedSections] = useState<string[]>([]);

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const toggleSection = (section: string) => {
    setOpenedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const navigationItems: NavigationItem[] = [
    {
      label: 'Home',
      href: '/',
      icon: IconHome,
    },
    {
      label: 'Database',
      href: '/database',
      icon: IconDatabase,
      children: [
        {
          label: 'All Items',
          href: '/database',
          icon: IconDatabase,
        },
        {
          label: 'Gunpla',
          href: '/database/gunpla',
          icon: IconDatabase,
        },
        // This will be dynamically populated based on available categories
      ],
    },
    {
      label: 'Search',
      href: '/search',
      icon: IconSearch,
    },
    {
      label: 'Collection',
      href: '/collection',
      icon: IconFolder,
      badge: '2', // Number of collections (would be dynamic)
      children: [
        {
          label: 'My Collections',
          href: '/collection',
          icon: IconFolder,
        },
        {
          label: 'Import / Export',
          href: '/collection/import-export',
          icon: IconUpload,
        },
        {
          label: 'Create Collection',
          href: '/collection/create',
          icon: IconHeart,
        },
      ],
    },
  ];

  const secondaryItems: NavigationItem[] = [
    {
      label: 'About',
      href: '/about',
      icon: IconInfoCircle,
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: IconSettings,
    },
  ];

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isSectionOpen = openedSections.includes(item.label);
    const active = item.href ? isActive(item.href) : false;

    if (hasChildren) {
      return (
        <div key={item.label}>
          <UnstyledButton
            w="100%"
            p="md"
            onClick={() => toggleSection(item.label)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 'var(--mantine-radius-default)',
              backgroundColor: active ? 'var(--mantine-color-blue-0)' : 'transparent',
              color: active ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-7)',
              fontWeight: active ? 600 : 400,
            }}
          >
            <Group gap="sm">
              <ThemeIcon size="sm" variant="transparent" color={active ? 'blue' : 'gray'}>
                <item.icon size={16} />
              </ThemeIcon>
              <Text size="sm">{item.label}</Text>
              {item.badge && (
                <Badge size="xs" color="blue" variant="light">
                  {item.badge}
                </Badge>
              )}
            </Group>
            {isSectionOpen ? (
              <IconChevronDown size={14} />
            ) : (
              <IconChevronRight size={14} />
            )}
          </UnstyledButton>

          <Collapse in={isSectionOpen}>
            <Stack gap="xs" pl={level + 2}>
              {item.children!.map((child) => renderNavigationItem(child, level + 1))}
            </Stack>
          </Collapse>
        </div>
      );
    }

    const content = (
      <Group gap="sm">
        <ThemeIcon size="sm" variant="transparent" color={active ? 'blue' : 'gray'}>
          <item.icon size={16} />
        </ThemeIcon>
        <Text size="sm">{item.label}</Text>
        {item.badge && (
          <Badge size="xs" color="blue" variant="light">
            {item.badge}
          </Badge>
        )}
        {item.external && <IconExternalLink size={12} />}
      </Group>
    );

    if (item.href) {
      return (
        <UnstyledButton
          key={item.label}
          component={Link}
          href={item.href}
          w="100%"
          p="md"
          onClick={onClose}
          target={item.external ? '_blank' : undefined}
          rel={item.external ? 'noopener noreferrer' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 'var(--mantine-radius-default)',
            backgroundColor: active ? 'var(--mantine-color-blue-0)' : 'transparent',
            color: active ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-7)',
            fontWeight: active ? 600 : 400,
          }}
        >
          {content}
        </UnstyledButton>
      );
    }

    return (
      <UnstyledButton
        key={item.label}
        w="100%"
        p="md"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 'var(--mantine-radius-default)',
          color: 'var(--mantine-color-gray-7)',
        }}
      >
        {content}
      </UnstyledButton>
    );
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      size={300}
      padding={0}
      withCloseButton={false}
      className={fadeIn}
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
        content: {
          backgroundColor: 'var(--mantine-color-body)',
        },
      }}
    >
      {/* Header */}
      <Stack p="md" gap="xs">
        <Group justify="space-between" align="center">
          <Title order={3}>Menu</Title>
          <ActionIcon variant="subtle" onClick={onClose} aria-label="Close menu">
            ×
          </ActionIcon>
        </Group>
      </Stack>

      <Divider />

      {/* Navigation */}
      <ScrollArea flex={1} offsetScrollbars>
        <Stack p="md" gap="xs">
          {navigationItems.map((item) => renderNavigationItem(item))}
        </Stack>

        <Divider my="md" mx="md" />

        <Stack p="md" gap="xs">
          <Text size="xs" color="dimmed" tt="uppercase" fw={600} mb="xs">
            More
          </Text>
          {secondaryItems.map((item) => renderNavigationItem(item))}
        </Stack>

        <Divider my="md" mx="md" />

        {/* Stats/Info */}
        <Stack p="md" gap="sm">
          <Text size="xs" color="dimmed" tt="uppercase" fw={600}>
            Database Stats
          </Text>
          <Group gap="xs" wrap="nowrap">
            <Badge size="sm" variant="light">
              8,485+ Items
            </Badge>
            <Badge size="sm" variant="light">
              137+ Series
            </Badge>
            <Badge size="sm" variant="light">
              80+ Brands
            </Badge>
          </Group>
        </Stack>

        {/* Quick Actions */}
        <Stack p="md" gap="sm">
          <Text size="xs" color="dimmed" tt="uppercase" fw={600}>
            Quick Actions
          </Text>
          <Group gap="xs">
            <ActionIcon size="sm" variant="light" aria-label="Share">
              <IconShare size={14} />
            </ActionIcon>
            <ActionIcon size="sm" variant="light" aria-label="Download">
              <IconDownload size={14} />
            </ActionIcon>
            <ActionIcon size="sm" variant="light" aria-label="Settings">
              <IconSettings size={14} />
            </ActionIcon>
          </Group>
        </Stack>
      </ScrollArea>
    </Drawer>
  );
}

export default Navigation;