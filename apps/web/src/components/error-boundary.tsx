import React from "react";

interface ErrorBoundaryProps {
	children: React.ReactNode;
}

/**
 * Error boundary component for development environment
 */
export function ErrorBoundary({ children }: ErrorBoundaryProps) {
	if (globalThis.window !== undefined && import.meta.env.DEV) {
		return (
			<div className="error-boundary">
				<h2>Development Error Boundary</h2>
				<p>If you see this, there was an error in the application.</p>
				<details>
					<summary>Error Details</summary>
					<pre>
            Check the browser console for detailed error information.
					</pre>
				</details>
			</div>
		);
	}

	// In production, render children normally since this is just a development helper
	return <>{children}</>;
}