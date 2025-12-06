import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet, Link, createHashHistory } from "@tanstack/react-router";
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
						<Link to="/">hobby.ninja</Link>
					</h1>
					<ul className="nav-links">
						<li>
							<Link to="/">Home</Link>
						</li>
						<li>
							<Link to="/about">About</Link>
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
				<p>&copy; 2025 hobby.ninja</p>
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

// Create hash history for GitHub Pages compatibility
const hashHistory = createHashHistory();

/**
 * Router instance with hash routing for GitHub Pages compatibility
 * Uses built-in TanStack Router hash history for reliable hash-based navigation
 */
// eslint-disable-next-line react-refresh/only-export-components
export const router = createRouter({
	routeTree,
	history: hashHistory, // Use built-in hash history for GitHub Pages compatibility
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