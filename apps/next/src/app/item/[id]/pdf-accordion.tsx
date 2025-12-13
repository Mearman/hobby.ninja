"use client";

import { useState, useEffect, useRef } from "react";
import { Accordion, Box, Skeleton, ActionIcon, Group, Tooltip, Switch } from "@mantine/core";
import { IconDownload, IconExternalLink, IconFileTypePdf, IconArrowsHorizontal } from "@tabler/icons-react";

const STORAGE_KEY = "pdf-full-width-preference";

interface PdfItem {
	name: string;
	src: string;
	title: string;
}

interface PdfAccordionProps {
	pdfs: PdfItem[];
	height?: number;
}

function useFullWidthPreference() {
	const [fullWidth, setFullWidth] = useState(false);
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored !== null) {
			setFullWidth(stored === "true");
		}
		setIsHydrated(true);
	}, []);

	const toggleFullWidth = () => {
		const newValue = !fullWidth;
		setFullWidth(newValue);
		localStorage.setItem(STORAGE_KEY, String(newValue));
	};

	return { fullWidth, toggleFullWidth, isHydrated };
}

interface FullWidthPdfProps {
	src: string;
	title: string;
	height: number;
	isLoaded: boolean;
	onLoad: () => void;
	fullWidth: boolean;
}

function FullWidthPdf({ src, title, height, isLoaded, onLoad, fullWidth }: FullWidthPdfProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [offset, setOffset] = useState({ left: 0, width: "100%" });

	useEffect(() => {
		if (!fullWidth || !containerRef.current) {
			setOffset({ left: 0, width: "100%" });
			return;
		}

		const updateOffset = () => {
			const el = containerRef.current;
			if (!el) return;

			const rect = el.getBoundingClientRect();
			const viewportWidth = window.innerWidth;

			setOffset({
				left: -rect.left,
				width: `${viewportWidth}px`,
			});
		};

		updateOffset();
		window.addEventListener("resize", updateOffset);
		return () => window.removeEventListener("resize", updateOffset);
	}, [fullWidth]);

	return (
		<Box ref={containerRef} pos="relative" style={{ overflow: "visible" }}>
			<Box
				pos="relative"
				style={
					fullWidth
						? {
								marginLeft: offset.left,
								width: offset.width,
								padding: "0 1rem",
								transition: "margin-left 0.2s ease-out, width 0.2s ease-out",
							}
						: {}
				}
			>
				{!isLoaded && (
					<Skeleton
						height={height}
						radius={4}
						pos="absolute"
						top={0}
						left={fullWidth ? "1rem" : 0}
						right={fullWidth ? "1rem" : 0}
					/>
				)}
				<iframe
					src={src}
					title={title}
					onLoad={onLoad}
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
		</Box>
	);
}

export function PdfAccordion({ pdfs, height = 800 }: PdfAccordionProps) {
	const [expandedItems, setExpandedItems] = useState<string[]>([]);
	const [loadedItems, setLoadedItems] = useState<Set<string>>(new Set());
	const { fullWidth, toggleFullWidth, isHydrated } = useFullWidthPreference();

	const handleChange = (values: string[]) => {
		setExpandedItems(values);
	};

	const handleLoad = (id: string) => {
		setLoadedItems((prev) => new Set(prev).add(id));
	};

	return (
		<Box style={{ overflow: "visible" }}>
			{/* Preference toggle */}
			<Group justify="flex-end" mb="xs">
				<Tooltip label="Expand PDFs to full page width" position="left">
					<Group gap="xs">
						<IconArrowsHorizontal size={16} style={{ opacity: 0.6 }} />
						<Switch
							size="sm"
							checked={isHydrated ? fullWidth : false}
							onChange={toggleFullWidth}
							label="Full width"
							styles={{ label: { paddingLeft: 8, fontSize: "var(--mantine-font-size-sm)" } }}
						/>
					</Group>
				</Tooltip>
			</Group>

			<Accordion
				multiple
				value={expandedItems}
				onChange={handleChange}
				variant="separated"
				radius="md"
				styles={{
					item: { overflow: "visible" },
					panel: { overflow: "visible" },
					content: { overflow: "visible" },
				}}
			>
				{pdfs.map((pdf, index) => {
					const itemId = `pdf-${index}`;
					const isExpanded = expandedItems.includes(itemId);
					const isLoaded = loadedItems.has(itemId);

					return (
						<Accordion.Item key={index} value={itemId}>
							<Accordion.Control icon={<IconFileTypePdf size={20} />}>
								<Group justify="space-between" wrap="nowrap" pr="md">
									<span>{pdf.name}</span>
									<Group gap="xs" onClick={(e) => e.stopPropagation()}>
										<ActionIcon
											component="a"
											href={pdf.src}
											download
											variant="subtle"
											color="gray"
											size="sm"
											title="Download PDF"
										>
											<IconDownload size={16} />
										</ActionIcon>
										<ActionIcon
											component="a"
											href={pdf.src}
											target="_blank"
											rel="noopener noreferrer"
											variant="subtle"
											color="gray"
											size="sm"
											title="Open in new tab"
										>
											<IconExternalLink size={16} />
										</ActionIcon>
									</Group>
								</Group>
							</Accordion.Control>
							<Accordion.Panel>
								{isExpanded && (
									<FullWidthPdf
										src={pdf.src}
										title={pdf.title}
										height={height}
										isLoaded={isLoaded}
										onLoad={() => handleLoad(itemId)}
										fullWidth={fullWidth}
									/>
								)}
							</Accordion.Panel>
						</Accordion.Item>
					);
				})}
			</Accordion>
		</Box>
	);
}
