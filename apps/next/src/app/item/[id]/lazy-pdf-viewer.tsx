"use client";

import { useRef, useState, useEffect } from "react";
import { Box, Skeleton, Text, Stack, ActionIcon, Group } from "@mantine/core";
import { IconDownload, IconExternalLink } from "@tabler/icons-react";

interface LazyPdfViewerProps {
	src: string;
	title: string;
	height?: number;
}

export function LazyPdfViewer({ src, title, height = 800 }: LazyPdfViewerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isVisible, setIsVisible] = useState(false);
	const [isLoaded, setIsLoaded] = useState(false);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				if (entry.isIntersecting) {
					setIsVisible(true);
					observer.disconnect();
				}
			},
			{
				rootMargin: "200px", // Start loading 200px before visible
				threshold: 0,
			}
		);

		observer.observe(container);

		return () => observer.disconnect();
	}, []);

	return (
		<Box ref={containerRef} pos="relative">
			{!isVisible ? (
				<Skeleton height={height} radius={4} />
			) : (
				<Stack gap="xs">
					<Group justify="flex-end" gap="xs">
						<ActionIcon
							component="a"
							href={src}
							download
							variant="subtle"
							color="gray"
							title="Download PDF"
						>
							<IconDownload size={18} />
						</ActionIcon>
						<ActionIcon
							component="a"
							href={src}
							target="_blank"
							rel="noopener noreferrer"
							variant="subtle"
							color="gray"
							title="Open in new tab"
						>
							<IconExternalLink size={18} />
						</ActionIcon>
					</Group>
					<Box pos="relative">
						{!isLoaded && (
							<Skeleton
								height={height}
								radius={4}
								pos="absolute"
								top={0}
								left={0}
								right={0}
							/>
						)}
						<iframe
							src={src}
							title={title}
							loading="lazy"
							onLoad={() => setIsLoaded(true)}
							style={{
								width: "100%",
								height,
								border: "1px solid var(--mantine-color-default-border)",
								borderRadius: 4,
								opacity: isLoaded ? 1 : 0,
								transition: "opacity 0.2s ease-in-out",
							}}
						/>
					</Box>
				</Stack>
			)}
		</Box>
	);
}
