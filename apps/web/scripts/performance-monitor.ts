/**
 * Performance Monitor for SSG Build
 *
 * Tracks build performance metrics and provides optimization recommendations
 */

import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

interface BuildMetrics {
	startTime: number;
	endTime?: number;
	totalRoutes: number;
	successfulRoutes: number;
	failedRoutes: number;
	memoryUsage: {
		initial: number;
		peak: number;
		final: number;
	};
	routeGenerationTime: number;
	htmlGenerationTime: number;
	seoGenerationTime: number;
	errors: Array<{
		route: string;
		error: string;
		timestamp: number;
	}>;
}

interface PerformanceReport {
	buildDate: string;
	totalDuration: number;
	routeStats: {
		total: number;
		successful: number;
		failed: number;
		successRate: number;
	};
	performance: {
		routesPerSecond: number;
		averageRouteTime: number;
		memoryEfficiency: string;
	};
	optimizations: string[];
}

export class PerformanceMonitor {
	private metrics: BuildMetrics;
	private logStream: any; // Using any for fs.WriteStream to avoid typing conflicts

	constructor(outputDir: string = join(process.cwd(), "dist", "apps", "web")) {
		this.metrics = {
			startTime: Date.now(),
			totalRoutes: 0,
			successfulRoutes: 0,
			failedRoutes: 0,
			memoryUsage: {
				initial: this.getCurrentMemoryUsage(),
				peak: this.getCurrentMemoryUsage(),
				final: 0,
			},
			routeGenerationTime: 0,
			htmlGenerationTime: 0,
			seoGenerationTime: 0,
			errors: [],
		};

		// Create log directory
		const logDir = join(outputDir, "logs");
		if (!existsSync(logDir)) {
			mkdirSync(logDir, { recursive: true });
		}

		const logPath = join(logDir, `performance-${Date.now()}.json`);
		this.logStream = createWriteStream(logPath, { encoding: "utf8" });
	}

	/**
	 * Records route generation phase
	 */
	recordRouteGeneration(routeCount: number, duration: number): void {
		this.metrics.routeGenerationTime = duration;
		this.metrics.totalRoutes = routeCount;
		this.updateMemoryPeak();
	}

	/**
	 * Records HTML generation phase
	 */
	recordHTMLGeneration(successful: number, failed: number, duration: number): void {
		this.metrics.htmlGenerationTime = duration;
		this.metrics.successfulRoutes = successful;
		this.metrics.failedRoutes = failed;
		this.updateMemoryPeak();
	}

	/**
	 * Records SEO generation phase
	 */
	recordSEOGeneration(duration: number): void {
		this.metrics.seoGenerationTime = duration;
		this.updateMemoryPeak();
	}

	/**
	 * Records an error during build
	 */
	recordError(route: string, error: string): void {
		this.metrics.errors.push({
			route,
			error,
			timestamp: Date.now(),
		});
	}

	/**
	 * Finalizes the build metrics
	 */
	finalize(): void {
		this.metrics.endTime = Date.now();
		this.metrics.memoryUsage.final = this.getCurrentMemoryUsage();

		const report = this.generateReport();

		// Write performance report
		this.logStream.write(JSON.stringify(report, null, 2));
		this.logStream.end();

		// Log summary to console
		this.logSummary(report);
	}

	/**
	 * Generates performance report
	 */
	private generateReport(): PerformanceReport {
		const totalDuration = (this.metrics.endTime! - this.metrics.startTime) / 1000;
		const routeStats = {
			total: this.metrics.totalRoutes,
			successful: this.metrics.successfulRoutes,
			failed: this.metrics.failedRoutes,
			successRate: (this.metrics.successfulRoutes / this.metrics.totalRoutes) * 100,
		};

		return {
			buildDate: new Date().toISOString(),
			totalDuration,
			routeStats,
			performance: {
				routesPerSecond: this.metrics.successfulRoutes / totalDuration,
				averageRouteTime: totalDuration / this.metrics.successfulRoutes * 1000, // ms per route
				memoryEfficiency: this.formatMemory(this.metrics.memoryUsage.peak - this.metrics.memoryUsage.initial),
			},
			optimizations: this.generateOptimizations(routeStats, totalDuration),
		};
	}

	/**
	 * Generates optimization recommendations
	 */
	private generateOptimizations(routeStats: any, totalDuration: number): string[] {
		const optimizations: string[] = [];

		// Success rate optimization
		if (routeStats.successRate < 99) {
			optimizations.push("Investigate failed routes - consider error handling improvements");
		}

		// Speed optimization
		if (routeStats.successfulRoutes / totalDuration < 50) {
			optimizations.push("Consider increasing concurrency or optimizing route generation");
		}

		// Memory optimization
		const memoryUsed = this.metrics.memoryUsage.peak - this.metrics.memoryUsage.initial;
		if (memoryUsed > 100 * 1024 * 1024) { // 100MB
			optimizations.push("High memory usage detected - consider implementing chunked processing");
		}

		// Error rate optimization
		if (this.metrics.errors.length > routeStats.total * 0.01) {
			optimizations.push("High error rate detected - review data quality and validation");
		}

		if (optimizations.length === 0) {
			optimizations.push("Build performance is optimal");
		}

		return optimizations;
	}

	/**
	 * Gets current memory usage in bytes
	 */
	private getCurrentMemoryUsage(): number {
		if (typeof process !== "undefined" && process.memoryUsage) {
			return process.memoryUsage().heapUsed;
		}
		return 0;
	}

	/**
	 * Updates memory peak if current usage is higher
	 */
	private updateMemoryPeak(): void {
		const current = this.getCurrentMemoryUsage();
		if (current > this.metrics.memoryUsage.peak) {
			this.metrics.memoryUsage.peak = current;
		}
	}

	/**
	 * Formats memory bytes to human readable format
	 */
	private formatMemory(bytes: number): string {
		const mb = bytes / 1024 / 1024;
		return `${mb.toFixed(1)}MB`;
	}

	/**
	 * Logs performance summary to console
	 */
	private logSummary(report: PerformanceReport): void {
		console.log("\n📊 Performance Summary:");
		console.log(`   ⏱️  Total Duration: ${report.totalDuration.toFixed(1)}s`);
		console.log(`   📄 Routes Generated: ${report.routeStats.successful}/${report.routeStats.total}`);
		console.log(`   📈 Success Rate: ${report.routeStats.successRate.toFixed(1)}%`);
		console.log(`   ⚡ Speed: ${report.performance.routesPerSecond.toFixed(1)} routes/second`);
		console.log(`   💾 Memory Used: ${report.performance.memoryEfficiency}`);
		console.log(`   🔧 Optimizations:`);
		report.optimizations.forEach((opt, index) => {
			console.log(`     ${index + 1}. ${opt}`);
		});
	}
}

export default PerformanceMonitor;