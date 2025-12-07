import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet, createHashHistory } from "@tanstack/react-router";
import { Suspense, lazy, useState } from "react";

import { Header } from "./components/layout/Header";

// Lazy load route components for code splitting
const HomePage = lazy(() => import("./pages/home-page").then(module => ({
	default: module.HomePage,
})));
const AboutPage = lazy(() => import("./pages/about-page").then(module => ({
	default: module.AboutPage,
})));
const DatabasePage = lazy(() => import("./pages/database-page").then(module => ({
	default: module.DatabasePage,
})));
const DatabaseHobbyPage = lazy(() => import("./pages/database-hobby-page").then(module => ({
	default: module.DatabaseHobbyPage,
})));
const ItemDetailPage = lazy(() => import("./pages/item-detail-page").then(module => ({
	default: module.ItemDetailPage,
})));
const SharedListPage = lazy(() => import("./pages/shared-list-page").then(module => ({
	default: module.SharedListPage,
})));
const SearchPage = lazy(() => import("./pages/search-page").then(module => ({
	default: module.SearchPage,
})));
const CollectionPage = lazy(() => import("./pages/collection-page").then(module => ({
	default: module.CollectionPage,
})));
const CollectionHobbyPage = lazy(() => import("./pages/collection-hobby-page").then(module => ({
	default: module.CollectionHobbyPage,
})));
const CollectionDetailPage = lazy(() => import("./pages/collection-detail-page").then(module => ({
	default: module.CollectionDetailPage,
})));
const ItemEditPage = lazy(() => import("./pages/item-edit-page").then(module => ({
	default: module.ItemEditPage,
})));
const NotFoundPage = lazy(() => import("./pages/not-found-page").then(module => ({
	default: module.NotFoundPage,
})));

// Loading component for lazy loaded routes
const RouteLoadingFallback = () => (
	<div style={{
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		height: "50vh",
		fontSize: "1.2rem",
	}}>
    Loading...
	</div>
);

/**
 * Root layout route with header, navigation, and footer
 */
const rootRoute = createRootRoute({
	component: () => {
		const [opened, { toggle }] = useState(false);

		return (
			<div className="app-layout">
				<Header opened={opened} toggle={toggle} />
				<main className="app-main">
					<Suspense fallback={<RouteLoadingFallback />}>
						<Outlet />
					</Suspense>
				</main>
				<footer className="app-footer">
					<p>&copy; 2025 hobby.ninja</p>
				</footer>
			</div>
		);
	},
});

/**
 * Index route (home page)
 */
const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: HomePage,
});

/**
 * Database route
 */
const databaseRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/database",
	component: DatabasePage,
});

/**
 * Database hobby type route
 */
const databaseHobbyRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/database/$hobbyType",
	component: DatabaseHobbyPage,
});

/**
 * Item detail route
 */
const itemDetailRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/database/$hobbyType/$id",
	component: ItemDetailPage,
});

/**
 * Shared list route (Pako URL)
 */
const sharedListRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/database/share/$compressedData",
	component: SharedListPage,
});

/**
 * Search route
 */
const searchRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/search",
	component: SearchPage,
});

/**
 * Collection hub route
 */
const collectionRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/collection",
	component: CollectionPage,
});

/**
 * Collection hobby type route
 */
const collectionHobbyRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/collection/$hobbyType",
	component: CollectionHobbyPage,
});

/**
 * Collection detail route
 */
const collectionDetailRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/collection/$hobbyType/$collectionId",
	component: CollectionDetailPage,
});

/**
 * Item edit/create route
 */
const itemEditRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/collection/$hobbyType/item/$itemId",
	component: ItemEditPage,
});

/**
 * About route
 */
const aboutRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/about",
	component: AboutPage,
});

/**
 * 404 catch-all route
 */
const notFoundRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "*",
	component: NotFoundPage,
});

// Create route tree with all routes
const routeTree = rootRoute.addChildren([
	indexRoute,
	databaseRoute,
	databaseHobbyRoute,
	itemDetailRoute,
	sharedListRoute,
	searchRoute,
	collectionRoute,
	collectionHobbyRoute,
	collectionDetailRoute,
	itemEditRoute,
	aboutRoute,
	notFoundRoute,
]);

// Create hash history for static hosting compatibility
const hashHistory = createHashHistory();

/**
 * Router instance with hash-based routing for static hosting compatibility
 */
export const router = createRouter({
	routeTree,
	history: hashHistory,
	defaultPreload: "intent",
	defaultComponent: NotFoundPage,
	caseSensitive: false,
});

/**
 * Router provider component for use in main.tsx
 */
export function AppRouter() {
	return <RouterProvider router={router} />;
}

// Export root route for type-safe navigation
export const Route = rootRoute;