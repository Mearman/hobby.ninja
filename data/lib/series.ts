import { z } from "zod";
import seriesJson from "../dist/series.json" with { type: "json" };
import { SeriesSchema } from "./schemas.js";
import type { Series } from "./schemas.js";

const SeriesRecordSchema = z.record(z.string(), SeriesSchema);
export const series = SeriesRecordSchema.parse(seriesJson);

export const seriesList = Object.values(series);

export function getSeriesIds(): string[] {
	return Object.keys(series);
}

export function getSeriesById(id: string): Series | undefined {
	return series[id];
}

export function getSeriesCount(): number {
	return seriesList.length;
}

export type { Series } from "./schemas.js";
