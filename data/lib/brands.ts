import { z } from "zod";
import brandsJson from "../dist/brands.json" with { type: "json" };
import { BrandSchema } from "./schemas.js";
import type { Brand } from "./schemas.js";

const BrandsRecordSchema = z.record(z.string(), BrandSchema);
export const brands = BrandsRecordSchema.parse(brandsJson);

export const brandsList = Object.values(brands);

export function getBrandIds(): string[] {
	return Object.keys(brands);
}

export function getBrandById(id: string): Brand | undefined {
	return brands[id];
}

export function getBrandCount(): number {
	return brandsList.length;
}

export type { Brand } from "./schemas.js";
