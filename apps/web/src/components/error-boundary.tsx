import React, { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
	errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
}

/**
 * Proper React error boundary component for development environment
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		// Update state so the next render will show the fallback UI
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		// Log the error to console for debugging
		console.error("Error Boundary caught an error:", error);
		console.error("Error Info:", errorInfo);

		this.setState({
			error,
			errorInfo,
		});
	}

	render() {
		// In production, always render children (or fallback if error occurred)
		if (!import.meta.env.DEV) {
			if (this.state.hasError) {
				return this.props.fallback || <div>Something went wrong.</div>;
			}
			return this.props.children;
		}

		// In development, show detailed error information if an error occurred
		if (this.state.hasError) {
			return (
				<div className="error-boundary">
					<h2>Development Error Boundary</h2>
					<p>If you see this, there was an error in the application.</p>
					<details open>
						<summary>Error Details</summary>
						<pre>
							{this.state.error?.toString() || "Unknown error"}

							{this.state.errorInfo?.componentStack && (
								<>
									{"\n\nComponent Stack:"}
									{this.state.errorInfo.componentStack}
								</>
							)}
						</pre>
					</details>
				</div>
			);
		}

		// In development with no error, render children normally
		return this.props.children;
	}
}