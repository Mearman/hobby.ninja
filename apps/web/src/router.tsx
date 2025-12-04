import { createRouter, RouterProvider , createRoute, createRootRoute, Outlet } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

// Lazy load route components for code splitting
const HomePage = lazy(() => import("./pages/home-page").then(module => ({
	default: module.HomePage,
})));
const AboutPage = lazy(() => import("./pages/about-page").then(module => ({
	default: module.AboutPage,
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
	component: () => (
		<div className="app-layout">
			<header className="app-header">
				<nav className="app-nav">
					<h1 className="app-title">
						<a href="#/">Unnamed Gunpla App</a>
					</h1>
					<ul className="nav-links">
						<li>
							<a href="#/">Home</a>
						</li>
						<li>
							<a href="#/about">About</a>
						</li>
					</ul>
				</nav>
			</header>
			<main className="app-main">
				<Suspense fallback={<RouteLoadingFallback />}>
					<Outlet />
				</Suspense>
			</main>
			<footer className="app-footer">
				<p>&copy; 2025 Unnamed Gunpla App. Built with ❤️ for Gundam fans.</p>
			</footer>
		</div>
	),
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
const routeTree = rootRoute.addChildren([indexRoute, aboutRoute, notFoundRoute]);

/**
 * Router instance with hash routing for GitHub Pages compatibility
 * Note: Hash routing will be handled by the navigation links using #/ format
 */
export const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultComponent: NotFoundPage,
	// Optimize route matching
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