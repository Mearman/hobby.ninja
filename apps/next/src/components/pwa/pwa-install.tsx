"use client";

import {
	ActionIcon,
	Box,
	Button,
	Flex,
	Group,
	Modal,
	Text,
	Title,
	rem,
} from "@mantine/core";
import {
	IconDownload,
	IconDeviceMobile,
	IconX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{
		outcome: "accepted" | "dismissed";
		platform: string;
	}>;
}

// Check if app is already installed (outside component for initial state)
function isAppInstalled(): boolean {
	if (typeof globalThis.matchMedia !== "function") return false;
	return globalThis.matchMedia("(display-mode: standalone)").matches;
}

export function PWAInstall() {
	const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
	const [showInstallPrompt, setShowInstallPrompt] = useState(() => !isAppInstalled());
	const [showInstallModal, setShowInstallModal] = useState(false);

	useEffect(() => {
		// Listen for the beforeinstallprompt event
		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault();
			setDeferredPrompt(e as BeforeInstallPromptEvent);
			setShowInstallPrompt(true);
		};

		// Listen for app installed event
		const handleAppInstalled = () => {
			setDeferredPrompt(null);
			setShowInstallPrompt(false);
			setShowInstallModal(false);
		};

		globalThis.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
		globalThis.addEventListener("appinstalled", handleAppInstalled);

		return () => {
			globalThis.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
			globalThis.removeEventListener("appinstalled", handleAppInstalled);
		};
	}, []);

	const handleInstallClick = async () => {
		if (!deferredPrompt) {
			return;
		}

		try {
			await deferredPrompt.prompt();
			const { outcome } = await deferredPrompt.userChoice;

			if (outcome === "accepted") {
				setShowInstallPrompt(false);
				setShowInstallModal(false);
			}

			setDeferredPrompt(null);
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("Error during PWA installation:", errorMessage);
		}
	};

	const handleInstallModalClose = () => {
		setShowInstallModal(false);
		// Don't show the prompt again for a while
		setShowInstallPrompt(false);
		setTimeout(() => {
			if (deferredPrompt) {
				setShowInstallPrompt(true);
			}
		}, 60_000); // 1 minute
	};

	if (!showInstallPrompt || !deferredPrompt) {
		return null;
	}

	return (
		<>
			{/* Floating install button */}
			<Box
				pos="fixed"
				bottom={rem(20)}
				right={rem(20)}
				style={{ zIndex: 1000 }}
			>
				<Flex gap="sm" align="center" justify="flex-end">
					<Text
						size="sm"
						c="dimmed"
						display={{ base: "none", sm: "block" }}
					>
						Install app for offline access
					</Text>
					<ActionIcon
						size="lg"
						radius="xl"
						color="blue"
						variant="filled"
						onClick={() => { setShowInstallModal(true); }}
					>
						<IconDownload size={20} />
					</ActionIcon>
				</Flex>
			</Box>

			{/* Install modal */}
			<Modal
				opened={showInstallModal}
				onClose={handleInstallModalClose}
				size="sm"
				radius="md"
				title={
					<Title order={3}>Install Hobby Ninja</Title>
				}
				withCloseButton={true}
			>
				<Group gap="lg" mb="md">
					<Box
						w={rem(60)}
						h={rem(60)}
						style={{
							background: "linear-gradient(135deg, var(--mantine-color-blue-5), var(--mantine-color-blue-6))",
							borderRadius: "12px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<IconDeviceMobile size={rem(28)} color="white" />
					</Box>
					<div>
						<Text fw={500} mb={rem(4)}>
							Install as PWA
						</Text>
						<Text size="sm" c="dimmed">
							Get offline access, push notifications, and a native app experience
						</Text>
					</div>
				</Group>

				<Flex gap="sm" justify="flex-end">
					<Button
						variant="subtle"
						onClick={handleInstallModalClose}
						leftSection={<IconX size={14} />}
					>
						Not now
					</Button>
					<Button
						color="blue"
						onClick={() => { void handleInstallClick(); }}
						leftSection={<IconDownload size={14} />}
					>
						Install
					</Button>
				</Flex>
			</Modal>
		</>
	);
}