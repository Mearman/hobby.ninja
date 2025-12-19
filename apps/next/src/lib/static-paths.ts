export function generateStaticPaths() {
	try {
		// Basic static paths for Next.js static export
		// In a real deployment, these would be generated from the actual data files
		const paths: string[] = [
			"/",
			"/about",
			"/database",
			"/collection",
			"/search",
			"/database/gunpla",
			"/collection/gunpla",
		];

		// eslint-disable-next-line no-console
		console.log(`Generated ${paths.length} basic static paths (no dynamic data in static export mode)`);
		return paths;

	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error generating static paths:", error);
		return [];
	}
}

export function getStaticPathsCount() {
	const paths = generateStaticPaths();
	return {
		total: paths.length,
		items: paths.filter(p => p.startsWith("/item/")).length,
		brands: paths.filter(p => p.startsWith("/brand/")).length,
		categories: paths.filter(p => p.startsWith("/category/")).length,
		series: paths.filter(p => p.startsWith("/series/")).length,
		manuals: paths.filter(p => p.startsWith("/manual/")).length,
		static: paths.filter(p => !/^\/(item|brand|category|series|manual)\//.test(p)).length,
	};
}