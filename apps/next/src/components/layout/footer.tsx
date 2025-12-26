"use client";

import { Anchor, Box, Container, Text } from "@mantine/core";
import Link from "next/link";

export function Footer() {
	return (
		<Box
			component="footer"
			style={{
				borderTop: "1px solid var(--mantine-color-default-border)",
				backgroundColor: "var(--mantine-color-body)",
				marginTop: "auto",
				padding: "var(--mantine-spacing-md) 0",
			}}
		>
			<Container size="xl">
				<Text size="xs" c="dimmed" ta="center">
					hobby.ninja is an unofficial fan reference. Not affiliated with BANDAI SPIRITS.
					All trademarks belong to their respective owners.{" "}
					<Anchor component={Link} href="/about" size="xs">
						About
					</Anchor>
				</Text>
			</Container>
		</Box>
	);
}
