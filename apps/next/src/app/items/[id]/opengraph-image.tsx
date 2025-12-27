import { getItemIds, getItemPageData } from "@hobby-ninja/data";
import { ImageResponse } from "next/og";

// jsDelivr serves GitHub content with proper content-type headers (image/jpeg vs text/plain)
// Satori requires correct content-type to determine image dimensions
const JSDELIVR_BASE = "https://cdn.jsdelivr.net/gh/Mearman/hobby.ninja@main/assets";

// Validate image by checking magic bytes (some "images" are actually 404 HTML pages)
async function validateImageUrl(url: string): Promise<string | null> {
	try {
		const response = await fetch(url);
		if (!response.ok) return null;

		const buffer = await response.arrayBuffer();
		const bytes = new Uint8Array(buffer);

		// Check magic bytes for JPEG (FFD8FF) or PNG (89504E47)
		const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
		const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;

		if (!isJpeg && !isPng) return null;

		// Convert to base64 data URL for Satori
		const base64 = Buffer.from(buffer).toString("base64");
		const mimeType = isJpeg ? "image/jpeg" : "image/png";
		return `data:${mimeType};base64,${base64}`;
	} catch {
		return null;
	}
}

// Required for static export
export const dynamic = "force-static";

// Generate static params for all items
export function generateStaticParams() {
	return getItemIds().map(id => ({ id }));
}

// Image dimensions for OpenGraph
export const size = {
	width: 1200,
	height: 630,
};

export const contentType = "image/png";

// Fetch Noto Sans JP font for Japanese text and special characters like ∀
async function loadFont(): Promise<ArrayBuffer> {
	const cssResponse = await fetch(
		"https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&display=swap",
	);
	const css = await cssResponse.text();
	const fontUrlMatch = /src: url\(([^)]+)\)/.exec(css);
	if (!fontUrlMatch?.[1]) {
		throw new Error("Could not find font URL in CSS");
	}
	const fontResponse = await fetch(fontUrlMatch[1]);
	return fontResponse.arrayBuffer();
}


interface Props {
	params: Promise<{ id: string }>;
}

// eslint-disable-next-line import/no-default-export -- Next.js OG images require default export
export default async function Image({ params }: Props) {
	const { id } = await params;
	const item = getItemPageData(id);

	if (!item) {
		// Fallback for missing items
		return new ImageResponse(
			(
				<div
					style={{
						width: "100%",
						height: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "#1a1b1e",
						color: "#fff",
						fontSize: 48,
					}}
				>
					Item Not Found
				</div>
			),
			{ ...size },
		);
	}

	// Get the display image URL using jsDelivr (serves proper content-type headers)
	// item.images contains paths like "/images/items/01_0001/153_1.jpg"
	// Validate the image is actually an image (some are 404 HTML pages saved as .jpg)
	const firstImage = item.images[0];
	const rawImageUrl = firstImage ? `${JSDELIVR_BASE}${firstImage}` : null;
	const imageUrl = rawImageUrl ? await validateImageUrl(rawImageUrl) : null;
	const brand = item.brands[0]?.name;
	const grade = item.primaryGrade;
	const scale = item.scale;

	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					backgroundColor: "#1a1b1e",
					fontFamily: "Noto Sans JP",
				}}
			>
				{/* Product image - full height left side */}
				<div
					style={{
						width: 630,
						height: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "#25262b",
						overflow: "hidden",
					}}
				>
					{imageUrl ? (
						<img
							src={imageUrl}
							alt={item.name}
							style={{
								width: "100%",
								height: "100%",
								objectFit: "cover",
							}}
						/>
					) : (
						<div
							style={{
								fontSize: 64,
								color: "#5c5f66",
							}}
						>
							?
						</div>
					)}
				</div>

				{/* Right content panel */}
				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						padding: 40,
					}}
				>
					{/* Branding */}
					<div
						style={{
							fontSize: 24,
							fontWeight: 700,
							color: "#339af0",
							marginBottom: 24,
						}}
					>
						hobby.ninja
					</div>

					{/* Item name */}
					<div
						style={{
							fontSize: 36,
							fontWeight: 700,
							color: "#fff",
							lineHeight: 1.2,
							flex: 1,
							display: "flex",
							alignItems: "center",
						}}
					>
						{item.name}
					</div>

					{/* Badges row */}
					<div
						style={{
							display: "flex",
							gap: 10,
							flexWrap: "wrap",
							marginTop: 16,
						}}
					>
						{brand && (
							<div
								style={{
									backgroundColor: "#1c7ed6",
									color: "#fff",
									padding: "6px 12px",
									borderRadius: 6,
									fontSize: 16,
									fontWeight: 600,
								}}
							>
								{brand}
							</div>
						)}
						{grade && (
							<div
								style={{
									backgroundColor: "#37b24d",
									color: "#fff",
									padding: "6px 12px",
									borderRadius: 6,
									fontSize: 16,
									fontWeight: 600,
								}}
							>
								{grade}
							</div>
						)}
						{scale && (
							<div
								style={{
									backgroundColor: "#f76707",
									color: "#fff",
									padding: "6px 12px",
									borderRadius: 6,
									fontSize: 16,
									fontWeight: 600,
								}}
							>
								{scale}
							</div>
						)}
					</div>

					{/* Bottom accent bar */}
					<div
						style={{
							height: 4,
							backgroundColor: "#339af0",
							borderRadius: 2,
							marginTop: 24,
						}}
					/>
				</div>
			</div>
		),
		{
			...size,
			fonts: [
				{
					name: "Noto Sans JP",
					data: await loadFont(),
					weight: 700,
					style: "normal",
				},
			],
		},
	);
}
