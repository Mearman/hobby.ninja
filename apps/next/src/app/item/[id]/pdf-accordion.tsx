"use client";

import { Accordion, Box, Skeleton, ActionIcon, Group, Tooltip, Switch, Card, Stack } from "@mantine/core";
import { IconDownload, IconExternalLink, IconFileTypePdf, IconArrowsHorizontal } from "@tabler/icons-react";
import { useCallback, useState, useRef } from "react";

const STORAGE_KEY = "pdf-full-width-preference";

interface PdfItem {
	name: string;
	src: string;
	title: string;
}

interface PdfAccordionProps {
	pdfs: PdfItem[];
	header?: React.ReactNode;
}

function useFullWidthPreference() {
	const [state, setState] = useState<{ fullWidth: boolean; isHydrated: boolean }>(() => {
		// Lazy initializer: only runs once during mount
		// Check if we're on the client side before accessing localStorage
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem(STORAGE_KEY);
			return {
				fullWidth: stored === "true",
				isHydrated: true,
			};
		}
		return {
			fullWidth: false,
			isHydrated: false,
		};
	});

	const toggleFullWidth = useCallback(() => {
		setState((prev) => {
			const newValue = !prev.fullWidth;
			// Only access localStorage on client side
			if (typeof window !== "undefined") {
				localStorage.setItem(STORAGE_KEY, String(newValue));
			}
			return { ...prev, fullWidth: newValue };
		});
	}, []);

	return { fullWidth: state.fullWidth, toggleFullWidth, isHydrated: state.isHydrated };
}

// Height for PDF viewer: full viewport minus space for accordion header and some padding
const PDF_HEIGHT = "calc(100vh - 120px)";
// Delay for scroll-to-accordion timing in milliseconds
const SCROLL_DELAY_MS = 250;
// Top padding offset for scroll position
const SCROLL_TOP_OFFSET = 16;

export function PdfAccordion({ pdfs, header }: PdfAccordionProps) {
	const [expandedItems, setExpandedItems] = useState<string[]>([]);
	const [loadedItems, setLoadedItems] = useState<Set<string>>(new Set());
	const { fullWidth, toggleFullWidth, isHydrated } = useFullWidthPreference();
	const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	const handleChange = (values: string[]) => {
		// Find newly expanded items
		const newlyExpanded = values.filter((v) => !expandedItems.includes(v));

		setExpandedItems(values);

		// Scroll the expanded accordion item header to top
		if (newlyExpanded.length > 0) {
			const itemId = newlyExpanded[0];
			const element = itemRefs.current.get(itemId);
			if (element) {
				// Calculate absolute position by walking up offsetParent chain
				let top = 0;
				let el: HTMLElement | null = element;
				while (el) {
					top += el.offsetTop;
					el = el.offsetParent as HTMLElement | null;
				}
				setTimeout(() => {
					globalThis.window.scrollTo({ top: top - SCROLL_TOP_OFFSET, behavior: "smooth" });
				}, SCROLL_DELAY_MS);
			}
		}
	};

	const handleLoad = (id: string) => {
		setLoadedItems((prev) => new Set(prev).add(id));
	};

	// Full width container styles - only apply when toggle is on AND accordion is expanded
	const hasExpandedItems = expandedItems.length > 0;
	const shouldExpand = fullWidth && hasExpandedItems;

	const fullWidthStyles = shouldExpand
		? {
			marginLeft: "calc(-50vw + 50%)",
			marginRight: "calc(-50vw + 50%)",
			width: "100vw",
			paddingLeft: "1rem",
			paddingRight: "1rem",
			transition: "margin 0.2s ease-out, width 0.2s ease-out, padding 0.2s ease-out",
		}
		: {
			transition: "margin 0.2s ease-out, width 0.2s ease-out, padding 0.2s ease-out",
		};

	return (
		<Box style={fullWidthStyles}>
			<Card withBorder={true} p="lg">
				<Stack gap="md">
					{/* Header content passed from parent */}
					{header}

					{/* Preference toggle */}
					<Group justify="flex-end">
						<Tooltip label="Expand manual section to full page width" position="left">
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

					{/* PDF Accordion */}
					<Accordion
						multiple={true}
						value={expandedItems}
						onChange={handleChange}
						variant="separated"
						radius="md"
					>
						{pdfs.map((pdf, index) => {
							const itemId = `pdf-${index}`;
							const isExpanded = expandedItems.includes(itemId);
							const isLoaded = loadedItems.has(itemId);

							return (
								<Accordion.Item
									key={index}
									value={itemId}
									ref={(el: HTMLDivElement | null) => {
										if (el) itemRefs.current.set(itemId, el);
										else itemRefs.current.delete(itemId);
									}}
								>
									<Accordion.Control icon={<IconFileTypePdf size={20} />}>
										<Group justify="space-between" wrap="nowrap" pr="md">
											<span>{pdf.name}</span>
											<Group gap="xs" onClick={(e) => { e.stopPropagation(); }}>
												<ActionIcon
													component="a"
													href={pdf.src}
													download={true}
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
											<Box pos="relative">
												{!isLoaded && (
													<Skeleton
														h={PDF_HEIGHT}
														radius={4}
														pos="absolute"
														top={0}
														left={0}
														right={0}
													/>
												)}
												<iframe
													src={pdf.src}
													title={pdf.title}
													onLoad={() => { handleLoad(itemId); }}
													style={{
														width: "100%",
														height: PDF_HEIGHT,
														border: "1px solid var(--mantine-color-default-border)",
														borderRadius: 4,
														opacity: isLoaded ? 1 : 0,
														transition: "opacity 0.2s ease-in-out",
													}}
												/>
											</Box>
										)}
									</Accordion.Panel>
								</Accordion.Item>
							);
						})}
					</Accordion>
				</Stack>
			</Card>
		</Box>
	);
}
