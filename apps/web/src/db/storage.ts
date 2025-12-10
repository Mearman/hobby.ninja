import Dexie, { Table } from "dexie";
import { z } from "zod";

import { logger } from "../lib/logger";



// Generate UUID function
export function generateId(): string {
	// Use browser's built-in crypto.randomUUID if available
	if (typeof crypto !== "undefined") {
		return crypto.randomUUID();
	}

	// Fallback for older browsers
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replaceAll(/[xy]/g, (c) => {
		const r = Math.trunc(Math.random() * 16);
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

// Simplified schema storage - just store schema metadata and track versions
export interface StoredSchema {
  id: string;
  name: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

// Document that references a schema
export interface Document {
  id?: string; // UUID, optional for create
  data: unknown; // Raw JSON data
  schemaId: string; // Reference to stored schema
  createdAt: Date;
  updatedAt: Date;
}

export class Database extends Dexie {
	schemas!: Table<StoredSchema, string>;
	documents!: Table<Document, string>;

	constructor() {
		super("DocumentDatabase");
		this.version(1).stores({
			schemas: "id, name, version, createdAt",
			documents: "&id, schemaId, createdAt",
		});
	}
}

// Initialize database
export const db = new Database();

// In-memory schema registry with persistent metadata
export const schemaRegistry = {
	schemas: new Map<string, z.ZodObject<z.ZodRawShape>>(),

	// Store a new schema
	async register(schema: z.ZodObject<z.ZodRawShape>, name: string, version = "1.0.0"): Promise<void> {
		const id = `${name}@${version}`;

		// Store schema in memory
		this.schemas.set(id, schema);

		// Store metadata in database
		const schemaData: StoredSchema = {
			id,
			name,
			version,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await db.schemas.put(schemaData);
		logger.debug(`Schema registered: ${name}@${version}`);
	},

	// Get a stored schema
	get(id: string): z.ZodObject<z.ZodRawShape> | null {
		return this.schemas.get(id) ?? null;
	},

	// Validate data against a schema
	validate(data: unknown, schemaId: string): { success: true; data: unknown } | { success: false; error: string } {
		const schema = this.get(schemaId);
		if (schema === null) {
			return { success: false, error: `Schema not found: ${schemaId}` };
		}

		const result = schema.safeParse(data);
		return result.success ? { success: true, data: result.data } : { success: false, error: result.error.message };
	},

	// List all registered schemas
	async list(): Promise<StoredSchema[]> {
		return await db.schemas.toArray();
	},

	// Re-register schemas from database metadata (call this on startup)
	async reloadFromStorage(schemas: Record<string, z.ZodObject<z.ZodRawShape>>): Promise<void> {
		const storedSchemas = await this.list();
		for (const stored of storedSchemas) {
			if (Object.prototype.hasOwnProperty.call(schemas, stored.id)) {
				this.schemas.set(stored.id, schemas[stored.id]);
			}
		}
	},
};

// Document-based operations with schema validation
export const storage = {
	// Get all documents for a specific schema type
	getBySchema(schemaId: string): Promise<Document[]> {
		return db.documents.where("schemaId").equals(schemaId).toArray();
	},

	// Get a single document by ID
	getById(id: string): Promise<Document | undefined> {
		return db.documents.get(id);
	},


	// Store a new document with schema validation
	async create(schemaId: string, data: unknown, id?: string): Promise<{ success: true; id: string } | { success: false; error: string }> {
		// Validate data against schema first
		const validation = schemaRegistry.validate(data, schemaId);
		if (!validation.success) {
			return { success: false, error: validation.error };
		}

		const now = new Date();
		const doc: Document = {
			id: id ?? generateId(),
			data: validation.data,
			schemaId,
			createdAt: now,
			updatedAt: now,
		};

		const result = await db.documents.add(doc);
		const returnedId = typeof result === "string" ? result : generateId();
		return { success: true, id: returnedId };
	},

	// Update an existing document
	async update(id: string, data: unknown): Promise<{ success: true } | { success: false; error: string }> {
		const existing = await db.documents.get(id);
		if (!existing) {
			return { success: false, error: "Document not found" };
		}

		// Validate new data against existing schema
		const validation = schemaRegistry.validate(data, existing.schemaId);
		if (!validation.success) {
			return { success: false, error: validation.error };
		}

		const updatedDoc: Document = {
			...existing,
			data: validation.data,
			updatedAt: new Date(),
		};

		await db.documents.update(id, updatedDoc);
		return { success: true };
	},

	// Get typed document data
	async getTyped(schemaId: string): Promise<Array<{ data: unknown; id: string }>> {
		const documents = await this.getBySchema(schemaId);
		return documents.map(doc => ({
			data: doc.data,
			id: doc.id ?? generateId(),
		}));
	},

	// Search across document data
	search(query: string): Promise<Document[]> {
		const lowerQuery = query.toLowerCase();
		return db.documents.filter(doc => {
			const dataString = JSON.stringify(doc.data);
			return dataString.toLowerCase().includes(lowerQuery);
		}).toArray();
	},

	// Delete document
	delete(id: string): Promise<void> {
		return db.documents.delete(id);
	},

	// Initialize database
	init(): Promise<void> {
		return db.open().then(() => {
			logger.debug("Schema-based storage initialized");
		});
	},
};