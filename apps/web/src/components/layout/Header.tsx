import {
	Group,
	Container,
	Burger,
	Text,
	TextInput,
	ActionIcon,
	Tooltip,
	Menu,
	Button,
	Stack,
	Box,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
	IconSearch,
	IconDatabase,
	IconHome,
	IconInfoCircle,
	IconChevronDown,
	IconAdjustmentsHorizontal,
	IconClipboardList,
} from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

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
export function Header({ opened, toggle }: HeaderProps): React.ReactElement {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState("");
	const isMobile = useMediaQuery("(max-width: 768px)");
	const isDesktop = useMediaQuery("(min-width: 769px)");

	// Handle search submission
	const handleSearch = (query: string) => {
		if (query.trim()) {
			navigate({
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
				zIndex: 1000,
			}}
		>
			<Container size="lg" h={64} px="md">
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
											onClick={() => navigate({ to: "/database" })}
										>
											Database Home
										</Menu.Item>

										<Menu.Divider />

										{hobbyTypes.map((type) => (
											<Menu.Item
												key={type.id}
												onClick={() =>
													navigate({
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
											onClick={() => navigate({ to: "/search" })}
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

					{/* Search bar */}
					<Group>
						{isDesktop && (
							<TextInput
								placeholder="Search kits, series, grades..."
								leftSection={<IconSearch size={16} />}
								size="sm"
								w={300}
								value={searchQuery}
								onChange={(event) => setSearchQuery(event.currentTarget.value)}
								onKeyPress={(event) => {
									if (event.key === "Enter") {
										handleSearch(searchQuery);
									}
								}}
							/>
						)}

						{isMobile && (
							<Tooltip label="Search">
								<ActionIcon
									variant="default"
									size={36}
									onClick={() => navigate({ to: "/search" })}
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
				<>
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
									onChange={(event) => setSearchQuery(event.currentTarget.value)}
									onKeyPress={(event) => {
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
										navigate({ to: "/" });
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
										navigate({ to: "/database" });
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
											navigate({
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
										navigate({ to: "/search" });
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
										navigate({ to: "/collection" });
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
										navigate({ to: "/about" });
										toggle();
									}}
								>
									About
								</Button>
							</Stack>
						</Container>
					</Box>
				</>
			)}
		</header>
	);
}