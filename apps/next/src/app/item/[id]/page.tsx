import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box, Group, Stack, Text, Title, Anchor } from "@mantine/core";

import { generateItemParams } from "@/lib/data-loader";
import { getItemById } from "@/lib/graph-data";
import {
	getNodeDisplayName,
	getNodePrice,
	getNodeReleaseYear,
	getNodeImages,
	getNodeDescription,
	getNodeAccessories,
	getNodeManuals,
	isItemNode,
} from "@/lib/schemas";


interface ItemPageProps {
  params: Promise<{ id: string }>;
}

// Generate static params for items from JSON files
export async function generateStaticParams() {
	const params = await generateItemParams();
	// For static export, limit to first 50 items to prevent build timeouts
	const result = Array.isArray(params) ? params.slice(0, 50) : [];
	return result;
}

// Generate metadata for each item with type-safe data
export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
	const { id } = await params;
	const item = await getItemById(id);

	if (!item || !isItemNode(item)) {
		return {
			title: "Item Not Found",
		};
	}

	const displayName = getNodeDisplayName(item);
	const releaseYear = getNodeReleaseYear(item);

	const itemDescription = getNodeDescription(item);
	const truncatedDesc = itemDescription
		? `${itemDescription.slice(0, 160).replaceAll("\n", " ")}...`
		: `Details about ${displayName}${releaseYear ? ` (${releaseYear})` : ""} from the hobby.ninja database`;

	return {
		title: `${displayName} - hobby.ninja`,
		description: truncatedDesc,
		keywords: [
			"gunpla", "gundam", "model kit",
			item.brand ?? "",
			item.category ?? "",
			item.series ?? "",
			item.grade ?? "",
			item.scale ?? "",
		].filter(Boolean).join(", "),
	};
}

export default async function ItemPage({ params }: ItemPageProps) {
	const { id } = await params;
	const item = await getItemById(id);

	if (!item || !isItemNode(item)) {
		notFound();
	}

	const displayName = getNodeDisplayName(item);
	const price = getNodePrice(item);
	const releaseYear = getNodeReleaseYear(item);
	const images = getNodeImages(item);
	const description = getNodeDescription(item);
	const accessories = getNodeAccessories(item);
	const manuals = getNodeManuals(item);

	return (
		<article>
				<header>
					<h1>{displayName}</h1>
					<div className="item-meta">
						{item.brand && <span>Brand: {item.brand}</span>}
						{item.category && <span>Category: {item.category}</span>}
						{item.series && <span>Series: {item.series}</span>}
						{item.grade && <span>Grade: {item.grade}</span>}
						{item.scale && <span>Scale: {item.scale}</span>}
						{price && <span>Price: {price}</span>}
						{releaseYear && <span>Release: {releaseYear}</span>}
						{item.targetAge && <span>Age: {item.targetAge}+</span>}
					</div>
				</header>

				{description && (
					<section>
						<h2>Description</h2>
						<div>
							{description.split("\n").map((line, index) => (
								<p key={index}>{line}</p>
							))}
						</div>
					</section>
				)}

				{accessories.length > 0 && (
					<section>
						<h2>Accessories</h2>
						<ul>
							{accessories.map((accessory, index) => (
								<li key={index}>{accessory}</li>
							))}
						</ul>
					</section>
				)}

				{images.length > 0 && (
					<section>
						<h2>Images</h2>
						<div className="image-gallery">
							{images.map((image, index) => (
								<img
									key={index}
									src={image}
									alt={`${displayName} - Image ${index + 1}`}
									loading="lazy"
								/>
							))}
						</div>
					</section>
				)}

				{manuals.length > 0 && (
					<section>
						<h2>Manuals</h2>
						<ul>
							{manuals.map((manual, index: number) => {
								const manualId = typeof manual === "string" ? manual : manual.id;
								return (
									<li key={index}>
										<a href={`/manual/${manualId}`}>
                      View Manual {index + 1}
										</a>
									</li>
								);
							})}
						</ul>
					</section>
				)}

				{/* Price details */}
				{item.price && (
					<section>
						<h2>Price Information</h2>
						<dl>
							<dt>Amount</dt>
							<dd>{item.price.currency} {item.price.amount.toLocaleString()}</dd>
							{item.price.taxIncluded !== undefined && (
								<>
									<dt>Tax</dt>
									<dd>{item.price.taxIncluded ? "Included" : "Excluded"}</dd>
								</>
							)}
							{item.price.taxRate && (
								<>
									<dt>Tax Rate</dt>
									<dd>{item.price.taxRate}%</dd>
								</>
							)}
						</dl>
					</section>
				)}

				{/* Release date details */}
				{item.releaseDate && (
					<section>
						<h2>Release Information</h2>
						<dl>
							<dt>Japanese Date</dt>
							<dd>{item.releaseDate.ja}</dd>
							<dt>Year</dt>
							<dd>{item.releaseDate.year}</dd>
							<dt>Month</dt>
							<dd>{item.releaseDate.month}</dd>
							<dt>Day</dt>
							<dd>{item.releaseDate.day}</dd>
						</dl>
					</section>
				)}

				{/* Specifications */}
				{item.specifications && Object.keys(item.specifications).length > 0 && (
					<section>
						<h2>Specifications</h2>
						<dl>
							{Object.entries(item.specifications).map(([key, value]) => (
								<div key={key}>
									<dt>{key.replaceAll(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}</dt>
									<dd>
										{typeof value === "object"
											? JSON.stringify(value, null, 2)
											: String(value)
										}
									</dd>
								</div>
							))}
						</dl>
					</section>
				)}

				{/* Additional metadata */}
				{item.metadata && Object.keys(item.metadata).length > 0 && (
					<section>
						<h2>Additional Information</h2>
						<dl>
							{Object.entries(item.metadata).map(([key, value]) => {
								if (
									value === null ||
                  value === undefined ||
                  (typeof value === "string" && value.trim() === "")
								) {
									return null;
								}

								return (
									<div key={key}>
										<dt>{key.replaceAll(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}</dt>
										<dd>
											{typeof value === "object"
												? JSON.stringify(value, null, 2)
												: String(value)
											}
										</dd>
									</div>
								);
							})}
						</dl>
					</section>
				)}

				{/* Tags */}
				{item.tags && item.tags.length > 0 && (
					<section>
						<h2>Tags</h2>
						<div className="tags">
							{item.tags.map((tag, index) => (
								<span key={index} className="tag">
									{String(tag)}
								</span>
							))}
						</div>
					</section>
				)}
		</article>
	);
}