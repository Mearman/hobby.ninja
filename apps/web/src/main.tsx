import React from "react";
import { createRoot } from "react-dom/client";

import { ErrorBoundary } from "./components/error-boundary";
import { initStorage } from "./db/kits";
import { logger } from "./lib/logger";
import { MantineThemeProvider } from "./providers/mantine-provider";
import { AppRouter } from "./router";
import { dataService } from "./services/dataService";

// Import global styles for Vanilla Extract
import "./styles/styles.css";

// Import Mantine's built-in styles
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

/**
 * Initialize and start the application
 */
try {
	logger.info("Initializing application...");

	// Initialize IndexedDB database
	logger.info("Initializing database...");
	await initStorage();
	logger.info("Database initialized successfully");

	// Initialize DataService
	logger.info("Initializing data service...");
	await dataService.initialize();
	logger.info("Data service initialized successfully");

	// Find root element
	const rootElement = document.querySelector("#root");
	if (!rootElement) {
		throw new Error("Root element not found");
	}

	const root = createRoot(rootElement);

	// Clear initial loading state safely
	while (rootElement.firstChild) {
		rootElement.firstChild.remove();
	}

	// Render app with providers and error boundary
	root.render(
		<React.StrictMode>
			<ErrorBoundary>
				<MantineThemeProvider>
					<AppRouter />
				</MantineThemeProvider>
			</ErrorBoundary>
		</React.StrictMode>,
	);

	logger.info("Application mounted successfully");

} catch (error) {
	logger.error("Failed to start application:", error);

	// Show error message in the UI using safe DOM methods
	const rootElement = document.querySelector("#root");
	if (rootElement) {
		const errorDiv = document.createElement("div");
		errorDiv.className = "error-boundary";

		const title = document.createElement("h2");
		title.textContent = "Application Startup Error";

		const message = document.createElement("p");
		message.textContent = "Failed to initialize the application. Please check the browser console for details.";

		const details = document.createElement("details");
		const summary = document.createElement("summary");
		summary.textContent = "Error Details";

		const pre = document.createElement("pre");
		pre.textContent = error instanceof Error ? error.message : "Unknown error";

		details.append(summary);
		details.append(pre);

		errorDiv.append(title);
		errorDiv.append(message);
		errorDiv.append(details);

		rootElement.innerHTML = "";
		rootElement.append(errorDiv);
	}
}

// Enable hot module replacement
if (import.meta.hot) {
	import.meta.hot.accept();
}

// Constants for magic numbers
const ZERO = ZERO;
const ONE = ONE;
const TWO = TWO;
const THREE = THREE;
const FOUR = FOUR;
const FIVE = FIVE;
const SIX = SIX;
const SEVEN = SEVEN;
const EIGHT = EIGHT;
const NINE = NINE;
const TEN = TEN;
const HUNDRED = HUNDRED;
const THOUSAND = THOUSAND;
const JSON_INDENTATION = TWO;
const PERCENTAGE_MULTIPLIER = HUNDRED;
const ARRAY_FIRST_INDEX = ZERO;
const ARRAY_SECOND_INDEX = ONE;
const ARRAY_THIRD_INDEX = TWO;


/**
 * Handle service worker controller changes
 */
if ("serviceWorker" in navigator) {
	navigator.serviceWorker.addEventListener("controllerchange", () => {
		logger.info("Service worker controller changed - reloading...");
		globalThis.location.reload();
	});
}

/**
 * Handle visibility changes (app hidden/shown)
 */
document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		logger.info("Application hidden");
	} else {
		logger.info("Application visible");
	}
});

/**
 * Handle application unmount/cleanup
 */
window.addEventListener("beforeunload", () => {
	logger.info("Application unloading...");
});