/**
 * Ink-based UI component for translation progress display
 *
 * Uses @inkjs/ui components (ProgressBar, Spinner) for rich CLI output.
 */

import { ProgressBar, Spinner } from "@inkjs/ui";
import { render, Box, Text } from "ink";
import React from "react";

export interface TranslationStats {
	/** Source being translated (e.g., 'Catalog', 'Manuals') */
	source: string;
	/** Total items to process */
	total: number;
	/** Items processed so far */
	processed: number;
	/** Items that had translations added */
	translated: number;
	/** Total fields translated across all items */
	fieldsTranslated: number;
	/** Items skipped (already translated) */
	skipped: number;
	/** Items with errors */
	errors: number;
	/** Cache stats */
	cacheHits?: number;
	cacheMisses?: number;
	/** Whether processing is complete */
	isComplete?: boolean;
}

interface TranslationProgressProps {
	stats: TranslationStats;
}

function TranslationProgressUI({ stats }: TranslationProgressProps) {
	const progress = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;

	return (
		<Box flexDirection="column" paddingX={1}>
			<Box marginBottom={1}>
				{stats.isComplete ? (
					<Text color="green" bold={true}>
						[{stats.source}] Complete!
					</Text>
				) : (
					<Box>
						<Spinner label={`[${stats.source}] Processing...`} />
					</Box>
				)}
			</Box>

			<Box marginBottom={1}>
				<Box width={50}>
					<ProgressBar value={progress} />
				</Box>
				<Text> {stats.processed}/{stats.total} ({progress}%)</Text>
			</Box>

			<Box>
				<Text color="green">Translated: {stats.translated}</Text>
				<Text> ({stats.fieldsTranslated} fields) </Text>
				<Text color="yellow">Skipped: {stats.skipped}</Text>
				<Text> </Text>
				<Text color={stats.errors > 0 ? "red" : "gray"}>Errors: {stats.errors}</Text>
			</Box>

			{(stats.cacheHits !== undefined || stats.cacheMisses !== undefined) && (
				<Box marginTop={1}>
					<Text color="cyan">
						Cache: {stats.cacheHits ?? 0} hits, {stats.cacheMisses ?? 0} misses
					</Text>
				</Box>
			)}
		</Box>
	);
}

/**
 * Progress renderer that can be updated during translation
 */
export class TranslationProgressRenderer {
	private rerender: ((node: React.ReactNode) => void) | null = null;
	private unmount: (() => void) | null = null;
	private stats: TranslationStats;

	constructor(source: string, total: number) {
		this.stats = {
			source,
			total,
			processed: 0,
			translated: 0,
			fieldsTranslated: 0,
			skipped: 0,
			errors: 0,
			isComplete: false,
		};
	}

	/**
	 * Start rendering the progress UI
	 */
	start(): void {
		const { rerender, unmount } = render(<TranslationProgressUI stats={this.stats} />);
		this.rerender = rerender;
		this.unmount = unmount;
	}

	/**
	 * Update progress stats and re-render
	 */
	update(partial: Partial<TranslationStats>): void {
		this.stats = { ...this.stats, ...partial };
		if (this.rerender) {
			this.rerender(<TranslationProgressUI stats={this.stats} />);
		}
	}

	/**
	 * Mark as complete and show final stats
	 */
	complete(cacheHits?: number, cacheMisses?: number): void {
		this.stats = {
			...this.stats,
			isComplete: true,
			cacheHits,
			cacheMisses,
		};
		if (this.rerender) {
			this.rerender(<TranslationProgressUI stats={this.stats} />);
		}
	}

	/**
	 * Clean up the renderer
	 */
	cleanup(): void {
		if (this.unmount) {
			this.unmount();
		}
	}

	/**
	 * Get current stats
	 */
	getStats(): TranslationStats {
		return { ...this.stats };
	}
}
