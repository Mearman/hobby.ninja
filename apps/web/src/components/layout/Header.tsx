import { useState } from "react";

import { Link, useNavigate } from "@tanstack/react-router";
import {
	ActionIcon,
	Box,
	Burger,
	Button,
	Container,
	Group,
	Menu,
	Stack,
	Text,
	TextInput,
	Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
	IconAdjustmentsHorizontal,
	IconClipboardList,
	IconDatabase,
	IconDeviceDesktop,
	IconHome,
	IconInfoCircle,
	IconMoon,
	IconSearch,
	IconSun,
	IconChevronDown,
} from "@tabler/icons-react";

import { useThemeContext } from "../../providers/mantine-provider";

// Constants
const MOBILE_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = MOBILE_BREAKPOINT + 1;
const HEADER_HEIGHT = 64;
const SEARCH_WIDTH = 300;
const ACTION_ICON_SIZE = 36;
const THEME_ICON_SIZE = 18;
const SMALL_ICON_SIZE = 16;
const EXTRA_SMALL_ICON_SIZE = 14;
const TINY_ICON_SIZE = 12;
const DROPDOWN_WIDTH = 200;
const HEADER_Z_INDEX = 1000;

interface HeaderProps {
	/**
	 * Whether the mobile menu is opened
	 */
	opened: boolean;
	/**
	 * Toggle function for mobile menu
	 */
	toggle: () => void;
}

/**
 * Header component with navigation and search functionality
 */
export function Header({ opened, toggle }: HeaderProps): JSX.Element {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState("");
	const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);
	const isDesktop = useMediaQuery(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
	const { colorScheme, cycleTheme } = useThemeContext();

	// Get the appropriate icon based on current theme
	const getThemeIcon = (): JSX.Element => {
		switch (colorScheme) {
			case "system":
				return <IconDeviceDesktop size={THEME_ICON_SIZE} />;
			case "dark":
				return <IconSun size={THEME_ICON_SIZE} />;
			case "light":
				return <IconMoon size={THEME_ICON_SIZE} />;
			default:
				return <IconDeviceDesktop size={THEME_ICON_SIZE} />;
		}
	};

	
	// Handle search submission
	const handleSearch = (query: string): void => {
		if (query.trim()) {
			void navigate({
				to: "/search",
				search: { q: query.trim() },
			});
			setSearchQuery("");
		}
	};

	// Hobby types for dropdown
	const hobbyTypes = [
		{ id: "model_kits", name: "Model Kits", description: "Plastic models, gunpla, aircraft" },
		{ id: "trading_cards", name: "Trading Cards", description: "Pokémon, Magic, sports cards" },
		{ id: "miniatures", name: "Miniatures", description: "Warhammer, D&D, gaming miniatures" },
		{ id: "other", name: "Other", description: "Custom hobby types" },
	];

	return (
		<header
			style={{
				background: "var(--mantine-color-body)",
				borderBottom: "1px solid var(--mantine-color-default-border)",
				position: "sticky",
				top: 0,
				zIndex: HEADER_Z_INDEX,
			}}
		>
			<Container size="lg" h={HEADER_HEIGHT} px="md">
				<Group h="100%" justify="space-between">
					{/* Logo and main navigation */}
					<Group>
						<Burger
							opened={opened}
							onClick={toggle}
							hiddenFrom="sm"
							size="sm"
						/>

						<Link
							to="/"
							style={{
								textDecoration: "none",
								color: "var(--mantine-color-text)",
							}}
						>
							<Text
								size="lg"
								fw={700}
								c="gunplaBlue"
								style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
							>
								hobby.ninja
							</Text>
						</Link>

						{/* Mobile navigation */}
						{isMobile && (
							<Group gap="xs">
								<Link
									to="/"
									style={{
										textDecoration: "none",
									}}
								>
									<Button
										variant="subtle"
										leftSection={<IconHome size={16} />}
										size="sm"
									>
										Home
									</Button>
								</Link>

								<Menu
									shadow="md"
									width={200}
									position="bottom-start"
									withArrow={true}
								>
									<Menu.Target>
										<Button
											variant="subtle"
											leftSection={<IconDatabase size={16} />}
											rightSection={<IconChevronDown size={12} />}
											size="sm"
										>
											Database
										</Button>
									</Menu.Target>

									<Menu.Dropdown>
										<Menu.Item
											leftSection={<IconDatabase size={14} />}
											onClick={() => void navigate({ to: "/database" })}
										>
											Database Home
										</Menu.Item>

										<Menu.Divider />

										{hobbyTypes.map((type) => (
											<Menu.Item
												key={type.id}
												onClick={() =>
													void navigate({
														to: "/database/$hobbyType",
														params: { hobbyType: type.id },
													})
												}
											>
												<Stack gap={0}>
													<Text size="sm" fw={500}>
														{type.name}
													</Text>
													<Text size="xs" c="dimmed">
														{type.description}
													</Text>
												</Stack>
											</Menu.Item>
										))}

										<Menu.Divider />

										<Menu.Item
											leftSection={<IconAdjustmentsHorizontal size={14} />}
											onClick={() => void navigate({ to: "/search" })}
										>
											Advanced Search
										</Menu.Item>
									</Menu.Dropdown>
								</Menu>

								<Link
									to="/collection"
									style={{
										textDecoration: "none",
									}}
								>
									<Button
										variant="subtle"
										leftSection={<IconClipboardList size={16} />}
										size="sm"
									>
										Collections
									</Button>
								</Link>

								<Link
									to="/about"
									style={{
										textDecoration: "none",
									}}
								>
									<Button
										variant="subtle"
										leftSection={<IconInfoCircle size={16} />}
										size="sm"
									>
										About
									</Button>
								</Link>
							</Group>
						)}
					</Group>

					{/* Search bar and theme toggle */}
					<Group>
						{isDesktop && (
							<TextInput
								placeholder="Search kits, series, grades..."
								leftSection={<IconSearch size={16} />}
								size="sm"
								w={300}
								value={searchQuery}
								onChange={(event) => { setSearchQuery(event.currentTarget.value); }}
								onKeyDown={(event) => {
									if (event.key === "Enter") {
										handleSearch(searchQuery);
									}
								}}
							/>
						)}

						{/* Theme toggle button */}
						<ActionIcon
							variant="default"
							size={36}
							onClick={cycleTheme}
							aria-label="Toggle theme"
						>
							{getThemeIcon()}
						</ActionIcon>

						{isMobile && (
							<Tooltip label="Search">
								<ActionIcon
									variant="default"
									size={36}
									onClick={() => void navigate({ to: "/search" })}
								>
									<IconSearch size={18} />
								</ActionIcon>
							</Tooltip>
						)}
					</Group>
				</Group>
			</Container>

			{/* Mobile menu */}
			{opened && (
				<Box
					bg="var(--mantine-color-body)"
					style={{
						borderTop: "1px solid var(--mantine-color-default-border)",
					}}
				>
					<Container size="lg" py="md">
						<Stack gap="sm">
							<TextInput
								placeholder="Search kits, series, grades..."
								leftSection={<IconSearch size={16} />}
								value={searchQuery}
								onChange={(event) => { setSearchQuery(event.currentTarget.value); }}
								onKeyDown={(event) => {
									if (event.key === "Enter") {
										handleSearch(searchQuery);
										toggle();
									}
								}}
							/>

							<Button
								variant="subtle"
								justify="start"
								leftSection={<IconHome size={16} />}
								onClick={() => {
									void navigate({ to: "/" });
									toggle();
								}}
							>
									Home
							</Button>

							<Button
								variant="subtle"
								justify="start"
								leftSection={<IconDatabase size={16} />}
								onClick={() => {
									void navigate({ to: "/database" });
									toggle();
								}}
							>
									Database
							</Button>

							{hobbyTypes.map((type) => (
								<Button
									key={type.id}
									variant="subtle"
									justify="start"
									onClick={() => {
										void navigate({
											to: "/database/$hobbyType",
											params: { hobbyType: type.id },
										});
										toggle();
									}}
									pl="lg"
								>
									<Text size="sm">{type.name}</Text>
								</Button>
							))}

							<Button
								variant="subtle"
								justify="start"
								leftSection={<IconAdjustmentsHorizontal size={16} />}
								onClick={() => {
									void navigate({ to: "/search" });
									toggle();
								}}
							>
									Advanced Search
							</Button>

							<Button
								variant="subtle"
								justify="start"
								leftSection={<IconClipboardList size={16} />}
								onClick={() => {
									void navigate({ to: "/collection" });
									toggle();
								}}
							>
									Collections
							</Button>

							<Button
								variant="subtle"
								justify="start"
								leftSection={<IconInfoCircle size={16} />}
								onClick={() => {
									void navigate({ to: "/about" });
									toggle();
								}}
							>
									About
							</Button>

							{/* Theme toggle in mobile menu */}
							<Button
								variant="subtle"
								justify="start"
								leftSection={getThemeIcon()}
								onClick={cycleTheme}
							>
								Theme
							</Button>
						</Stack>
					</Container>
				</Box>
			)}
		</header>
	);
}