import { z } from "zod";

import { logger } from "../lib/logger";

import { storage, schemaRegistry } from "./storage";



// Generic document operations without hardcoded schemas
export const documents = {
	// Register a new schema
	async registerSchema(schema: z.ZodObject<z.ZodRawShape>, name: string, version = "1.0.0"): Promise<void> {
		await schemaRegistry.register(schema, name, version);
	},

	// Get all documents for a specific schema type
	getBySchema(schemaId: string): Promise<Array<{ data: unknown; id: string }>> {
		return storage.getTyped(schemaId);
	},

	// Create a new document with schema validation
	create(data: unknown, schemaId: string, id?: string): Promise<{ success: true; id: string } | { success: false; error: string }> {
		return storage.create(schemaId, data, id);
	},

	// Update an existing document
	update(id: string, data: unknown): Promise<{ success: true } | { success: false; error: string }> {
		return storage.update(id, data);
	},

	// Get a single document by ID
	getById(id: string): Promise<{ data: unknown; schemaId: string } | undefined> {
		return storage.getById(id).then(doc =>
			doc ? { data: doc.data, schemaId: doc.schemaId } : undefined,
		);
	},

	// Search documents
	search(query: string): Promise<Array<{ data: unknown; schemaId: string; id: string }>> {
		return storage.search(query).then(docs => docs.map(doc => ({
			data: doc.data,
			schemaId: doc.schemaId,
			id: doc.id ?? crypto.randomUUID(),
		})));
	},

	// Delete document by ID
	delete(id: string): Promise<void> {
		return storage.delete(id);
	},

	// Get schema validation result
	validate(data: unknown, schemaId: string): { success: true; data: unknown } | { success: false; error: string } {
		return schemaRegistry.validate(data, schemaId);
	},

	// List available schemas
	listSchemas(): Promise<Array<{ id: string; name: string; version: string }>> {
		return schemaRegistry.list().then(schemas => schemas.map(schema => ({
			id: schema.id,
			name: schema.name,
			version: schema.version,
		})));
	},
};

// Initialize storage without predefined schemas
export async function initStorage(): Promise<void> {
	await storage.init();
	logger.debug("Database initialized with generic schema-based storage");
}