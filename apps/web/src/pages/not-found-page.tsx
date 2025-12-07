import { Container, Title, Text, Button, Group, Stack, ThemeIcon } from "@mantine/core";
import { IconHome, IconSearch, IconArrowLeft, IconRobot } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import React from "react";

import { notFoundContainer } from "../styles/styles.css";


export function NotFoundPage() {
	return (
		<div className={notFoundContainer}>
			<Container size="sm">
				<Stack align="center" gap="lg">
					<ThemeIcon size={128} variant="light" color="gray" radius="xl" style={{ opacity: 0.5 }}>
						<IconRobot size={80} />
					</ThemeIcon>

					<Title order={1} size={48} c="primary">
            404 - Page Not Found
					</Title>

					<Text size="lg" c="dimmed" ta="center">
            Oops! It looks like this Gunpla kit has gone missing in action.
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
					</Text>

					<Text c="dimmed" ta="center">
            Maybe try checking the navigation or searching for what you need?
					</Text>

					<Group>
						<Button
							component={Link}
							to="/"
							size="lg"
							leftSection={<IconHome size={16} />}
						>
              Go Home
						</Button>

						<Button
							component={Link}
							to="/database"
							variant="outline"
							size="lg"
							leftSection={<IconSearch size={16} />}
						>
              Browse Database
						</Button>
					</Group>

					<Button
						variant="subtle"
						size="sm"
						onClick={() => { globalThis.history.back(); }}
						leftSection={<IconArrowLeft size={14} />}
					>
            Go Back
					</Button>
				</Stack>
			</Container>
		</div>
	);
}