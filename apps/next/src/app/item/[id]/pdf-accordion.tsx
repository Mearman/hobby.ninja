"use client";

import { useState } from "react";
import { Accordion, Box, Skeleton, ActionIcon, Group } from "@mantine/core";
import { IconDownload, IconExternalLink, IconFileTypePdf } from "@tabler/icons-react";

interface PdfItem {
	name: string;
	src: string;
	title: string;
}

interface PdfAccordionProps {
	pdfs: PdfItem[];
	height?: number;
}

export function PdfAccordion({ pdfs, height = 800 }: PdfAccordionProps) {
	const [expandedItems, setExpandedItems] = useState<string[]>([]);
	const [loadedItems, setLoadedItems] = useState<Set<string>>(new Set());

	const handleChange = (values: string[]) => {
		setExpandedItems(values);
	};

	const handleLoad = (id: string) => {
		setLoadedItems((prev) => new Set(prev).add(id));
	};

	return (
		<Accordion
			multiple
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
										src={pdf.src}
										title={pdf.title}
										onLoad={() => handleLoad(itemId)}
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
							)}
						</Accordion.Panel>
					</Accordion.Item>
				);
			})}
		</Accordion>
	);
}
