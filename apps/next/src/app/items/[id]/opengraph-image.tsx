import { getCdnUrls, getItemIds, getItemPageData } from "@hobby-ninja/data";
import { ImageResponse } from "next/og";

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

// Format price for display
function formatPrice(price?: { amount: number; currency: string }): string | null {
	if (!price) return null;
	const { amount, currency } = price;
	const symbol = currency === "JPY" ? "¥" : currency;
	return `${symbol}${amount.toLocaleString()}`;
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

	// Get the display image URL - use absolute URL for OG image (fallback is always GitHub raw)
	// item.images contains paths like "/images/items/01_0001/153_1.jpg"
	const firstImage = item.images[0];
	const imageUrl = firstImage
		? getCdnUrls(firstImage).fallback
		: null;
	const price = formatPrice(item.price);
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
					flexDirection: "column",
					backgroundColor: "#1a1b1e",
					padding: 48,
					fontFamily: "Noto Sans JP",
				}}
			>
				{/* Header with branding */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						marginBottom: 32,
					}}
				>
					<div
						style={{
							fontSize: 28,
							fontWeight: 700,
							color: "#339af0",
						}}
					>
						hobby.ninja
					</div>
				</div>

				{/* Main content area */}
				<div
					style={{
						display: "flex",
						flex: 1,
						gap: 48,
					}}
				>
					{/* Product image */}
					<div
						style={{
							width: 400,
							height: 400,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							backgroundColor: "#25262b",
							borderRadius: 16,
							overflow: "hidden",
						}}
					>
						{imageUrl ? (
							<img
								src={imageUrl}
								alt={item.name}
								style={{
									maxWidth: "100%",
									maxHeight: "100%",
									objectFit: "contain",
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

					{/* Text content */}
					<div
						style={{
							flex: 1,
							display: "flex",
							flexDirection: "column",
							justifyContent: "center",
							gap: 16,
						}}
					>
						{/* Item name */}
						<div
							style={{
								fontSize: 42,
								fontWeight: 700,
								color: "#fff",
								lineHeight: 1.2,
								overflow: "hidden",
								display: "-webkit-box",
								WebkitLineClamp: 3,
								WebkitBoxOrient: "vertical",
							}}
						>
							{item.name}
						</div>

						{/* Badges row */}
						<div
							style={{
								display: "flex",
								gap: 12,
								flexWrap: "wrap",
								marginTop: 8,
							}}
						>
							{brand && (
								<div
									style={{
										backgroundColor: "#1c7ed6",
										color: "#fff",
										padding: "8px 16px",
										borderRadius: 8,
										fontSize: 20,
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
										padding: "8px 16px",
										borderRadius: 8,
										fontSize: 20,
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
										padding: "8px 16px",
										borderRadius: 8,
										fontSize: 20,
										fontWeight: 600,
									}}
								>
									{scale}
								</div>
							)}
						</div>

						{/* Price */}
						{price && (
							<div
								style={{
									fontSize: 36,
									fontWeight: 700,
									color: "#339af0",
									marginTop: 16,
								}}
							>
								{price}
							</div>
						)}
					</div>
				</div>

				{/* Bottom accent bar */}
				<div
					style={{
						height: 6,
						backgroundColor: "#339af0",
						borderRadius: 3,
						marginTop: 32,
					}}
				/>
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
