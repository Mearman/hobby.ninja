import { CollectionPageClient } from "./collection-page-client";

// Generate static params for collection pages
// Collections are user-generated in IndexedDB, so we generate a fallback route
// The "_" placeholder allows the route to exist; actual IDs are handled client-side
// eslint-disable-next-line react-refresh/only-export-components
export function generateStaticParams() {
	return [{ id: "_" }];
}

// Server component wrapper - renders the client component
export default function CollectionDetailPage() {
	return <CollectionPageClient />;
}
