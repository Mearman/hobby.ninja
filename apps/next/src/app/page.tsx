"use client";

import { Title, Text, Container, Card, Stack, Group, ThemeIcon, rem, ActionIcon, Tooltip } from "@mantine/core";
import { IconCheck, IconDatabase, IconSearch, IconPalette, IconSun, IconMoon } from "@tabler/icons-react";
import { useThemeContext } from "@/providers/mantine-provider";
import { UI, TYPOGRAPHY } from "@/lib/constants";


export default function HomePage() {
	const { effectiveColorScheme, cycleTheme } = useThemeContext();

	const getThemeIcon = () => {
		switch (effectiveColorScheme) {
			case "light":
				return <IconSun style={{ width: rem(UI.ICON_SIZE_SM), height: rem(UI.ICON_SIZE_SM) }} />;
			case "dark":
				return <IconMoon style={{ width: rem(UI.ICON_SIZE_SM), height: rem(UI.ICON_SIZE_SM) }} />;
			default:
				return <IconSun style={{ width: rem(UI.ICON_SIZE_SM), height: rem(UI.ICON_SIZE_SM) }} />;
		}
	};

	const getThemeLabel = () => {
		switch (effectiveColorScheme) {
			case "light":
				return "Switch to dark mode";
			case "dark":
				return "Switch to system mode";
			default:
				return "Switch to light mode";
		}
	};

	return (
		<Container size="lg" py="xl">
			<Stack align="center" gap="lg">
				<Group justify="space-between" w="100%">
					<Title order={1} c="blue.6">
						hobby.ninja
					</Title>
					<Tooltip label={getThemeLabel()}>
						<ActionIcon
							variant="light"
							size="lg"
							onClick={cycleTheme}
							aria-label="Toggle theme"
						>
							{getThemeIcon()}
						</ActionIcon>
					</Tooltip>
				</Group>
				<Text size="lg" c="dimmed">
					Static Database & Collection Management
				</Text>
				<Text size="sm" c="dimmed">
					Current theme: {effectiveColorScheme}
				</Text>
			</Stack>

			<Card shadow="sm" p="lg" radius="md" withBorder mt="xl">
				<Title order={2} mb="md">
					✅ System Status
				</Title>
				<Stack gap="md">
					<Group gap="sm">
						<ThemeIcon color="green" size={24} radius="xl">
							<IconCheck style={{ width: rem(16), height: rem(16) }} />
						</ThemeIcon>
						<Text fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>Mantine v7+ components working!</Text>
					</Group>
					<Group gap="sm">
						<ThemeIcon color="blue" size={24} radius="xl">
							<IconDatabase style={{ width: rem(16), height: rem(16) }} />
						</ThemeIcon>
						<Text fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>Static export configured!</Text>
					</Group>
					<Group gap="sm">
						<ThemeIcon color="orange" size={24} radius="xl">
							<IconSearch style={{ width: rem(16), height: rem(16) }} />
						</ThemeIcon>
						<Text fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>Search functionality ready!</Text>
					</Group>
					<Group gap="sm">
						<ThemeIcon color="violet" size={24} radius="xl">
							<IconPalette style={{ width: rem(16), height: rem(16) }} />
						</ThemeIcon>
						<Text fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>Minimal Vanilla Extract styling!</Text>
					</Group>
				</Stack>
			</Card>

			<Group justify="center" mt="xl">
				<Text c="dimmed" size="sm">
					Built with React 19, Next.js 15, TypeScript, and Mantine
				</Text>
			</Group>
		</Container>
	);
}