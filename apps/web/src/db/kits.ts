import { z } from "zod";

import { storage, schemaRegistry } from "./storage";
import { logger } from "../lib/logger";

// Generic document operations without hardcoded schemas
export const documents = {
	// Register a new schema
	async registerSchema(schema: z.ZodObject<z.ZodRawShape>, name: string, version: string = "1.0.0"): Promise<void> {
		await schemaRegistry.register(schema, name, version);
	},

	// Get all documents for a specific schema type
	async getBySchema<T>(schemaId: string): Promise<Array<{ data: T; id: string }>> {
		return await storage.getTyped<T>(schemaId);
	},

	// Create a new document with schema validation
	async create<T>(data: T, schemaId: string, id?: string): Promise<{ success: true; id: string } | { success: false; error: string }> {
		return await storage.create(schemaId, data, id);
	},

	// Update an existing document
	async update<T>(id: string, data: T): Promise<{ success: true } | { success: false; error: string }> {
		return await storage.update(id, data);
	},

	// Get a single document by ID
	async getById(id: string): Promise<{ data: unknown; schemaId: string } | undefined> {
		const doc = await storage.getById(id);
		return doc ? { data: doc.data, schemaId: doc.schemaId } : undefined;
	},

	// Search documents
	async search(query: string): Promise<Array<{ data: unknown; schemaId: string; id: string }>> {
		const docs = await storage.search(query);
		return docs.map(doc => ({
			data: doc.data,
			schemaId: doc.schemaId,
			id: doc.id!,
		}));
	},

	// Delete document by ID
	async delete(id: string): Promise<void> {
		await storage.delete(id);
	},

	// Get schema validation result
	async validate(data: unknown, schemaId: string): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
		return await schemaRegistry.validate(data, schemaId);
	},

	// List available schemas
	async listSchemas(): Promise<Array<{ id: string; name: string; version: string }>> {
		const schemas = await schemaRegistry.list();
		return schemas.map(schema => ({
			id: schema.id,
			name: schema.name,
			version: schema.version,
		}));
	},
};

// Initialize storage without predefined schemas
export async function initStorage(): Promise<void> {
	await storage.init();
	logger.debug("✅ Database initialized with generic schema-based storage");
}