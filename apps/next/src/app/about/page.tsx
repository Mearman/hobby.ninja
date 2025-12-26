import { Anchor, Box, Container, Divider, List, ListItem, Stack, Text, Title } from "@mantine/core";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "About - hobby.ninja",
	description: "About hobby.ninja - an unofficial fan reference database for hobby model kits",
};

export default function AboutPage() {
	return (
		<Container size="md" py="xl">
			<Stack gap="xl">
				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						About hobby.ninja
					</Title>
					<Text size="lg" c="dimmed">
						A fan-run reference database for hobby model kits
					</Text>
				</Box>

				<Divider />

				{/* Disclaimer Section */}
				<Stack gap="md">
					<Title order={2}>Disclaimer</Title>
					<Text>
						<strong>hobby.ninja</strong> is an unofficial, fan-operated reference database.
						This site is not affiliated with, endorsed by, or sponsored by BANDAI SPIRITS,
						Bandai Namco Holdings, or any related entities.
					</Text>
				</Stack>

				{/* Trademark Notice */}
				<Stack gap="md">
					<Title order={3}>Trademark Notice</Title>
					<Text>
						All product names, trademarks, and registered trademarks are property of their
						respective owners. GUNDAM, GUNPLA, and related marks are trademarks of Sunrise Inc.
						and BANDAI SPIRITS. All other franchise marks (including but not limited to those
						listed on official Bandai sites) belong to their respective copyright holders.
					</Text>
				</Stack>

				{/* Non-Commercial Use */}
				<Stack gap="md">
					<Title order={3}>Non-Commercial Use</Title>
					<Text>
						This site is provided free of charge for educational and reference purposes only.
						We do not sell products or generate revenue from this content.
					</Text>
				</Stack>

				{/* Official Sources */}
				<Stack gap="md">
					<Title order={3}>Official Sources</Title>
					<Text>
						Product information is compiled from publicly available materials for fan reference.
						For official product information, purchasing, and support, please visit:
					</Text>
					<List>
						<ListItem>
							<Anchor href="https://bandai-hobby.net" target="_blank" rel="noopener noreferrer">
								BANDAI HOBBY SITE
							</Anchor>
							{" "}(Japan)
						</ListItem>
						<ListItem>
							<Anchor href="https://global.bandai-hobby.net" target="_blank" rel="noopener noreferrer">
								BANDAI HOBBY SITE
							</Anchor>
							{" "}(Global)
						</ListItem>
						<ListItem>
							<Anchor href="https://p-bandai.jp" target="_blank" rel="noopener noreferrer">
								P-Bandai
							</Anchor>
							{" "}(Japan)
						</ListItem>
						<ListItem>
							<Anchor href="https://p-bandai.com/us" target="_blank" rel="noopener noreferrer">
								P-Bandai
							</Anchor>
							{" "}(US)
						</ListItem>
						<ListItem>
							<Anchor href="https://manual.bandai-hobby.net" target="_blank" rel="noopener noreferrer">
								BANDAI HOBBY Manual Site
							</Anchor>
						</ListItem>
					</List>
				</Stack>

				<Divider />

				{/* What is this site */}
				<Stack gap="md">
					<Title order={2}>What is hobby.ninja?</Title>
					<Text>
						hobby.ninja is a reference tool for hobbyists to explore and track their model kit
						collections. We catalog publicly available product information to help fans discover
						and organize their hobby.
					</Text>
				</Stack>
			</Stack>
		</Container>
	);
}
