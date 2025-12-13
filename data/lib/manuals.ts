import { z } from "zod";
import manualsJson from "../dist/manuals.json" with { type: "json" };
import { ManualSchema } from "./schemas.js";
import type { Manual } from "./schemas.js";

const ManualsRecordSchema = z.record(z.string(), ManualSchema);
export const manuals = ManualsRecordSchema.parse(manualsJson);

export const manualsList = Object.values(manuals);

export function getManualIds(): string[] {
	return Object.keys(manuals);
}

export function getManualById(id: string): Manual | undefined {
	return manuals[id];
}

export function getManualCount(): number {
	return manualsList.length;
}

export type { Manual } from "./schemas.js";
