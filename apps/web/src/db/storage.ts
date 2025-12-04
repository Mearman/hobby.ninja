import Dexie, { Table } from "dexie";
import { z } from "zod";
import { logger } from "../lib/logger";

// Generate UUID function
function generateId(): string {
	// Use browser's built-in crypto.randomUUID if available
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
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
	async register(schema: z.ZodObject<z.ZodRawShape>, name: string, version: string = "1.0.0"): Promise<void> {
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
		logger.debug(`✅ Schema registered: ${name}@${version}`);
	},

	// Get a stored schema
	async get(id: string): Promise<z.ZodObject<z.ZodRawShape> | null> {
		return this.schemas.get(id) || null;
	},

	// Validate data against a schema
	async validate(data: unknown, schemaId: string): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
		const schema = await this.get(schemaId);
		if (!schema) {
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
			if (schemas[stored.id]) {
				this.schemas.set(stored.id, schemas[stored.id]);
			}
		}
	},
};

// Document-based operations with schema validation
export const storage = {
	// Get all documents for a specific schema type
	async getBySchema(schemaId: string): Promise<Document[]> {
		return await db.documents.where("schemaId").equals(schemaId).toArray();
	},

	// Get a single document by ID
	async getById(id: string): Promise<Document | undefined> {
		return await db.documents.get(id);
	},


	// Store a new document with schema validation
	async create(schemaId: string, data: unknown, id?: string): Promise<{ success: true; id: string } | { success: false; error: string }> {
		// Validate data against schema first
		const validation = await schemaRegistry.validate(data, schemaId);
		if (!validation.success) {
			return { success: false, error: validation.error };
		}

		const now = new Date();
		const doc: Document = {
			id: id || generateId(),
			data: validation.data,
			schemaId,
			createdAt: now,
			updatedAt: now,
		};

		await db.documents.add(doc);
		return { success: true, id: doc.id! };
	},

	// Update an existing document
	async update(id: string, data: unknown): Promise<{ success: true } | { success: false; error: string }> {
		const existing = await db.documents.get(id);
		if (!existing) {
			return { success: false, error: "Document not found" };
		}

		// Validate new data against existing schema
		const validation = await schemaRegistry.validate(data, existing.schemaId);
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
	async getTyped<T>(schemaId: string): Promise<Array<{ data: T; id: string }>> {
		const documents = await this.getBySchema(schemaId);
		return documents.map(doc => ({
			data: doc.data as T,
			id: doc.id!,
		}));
	},

	// Search across document data
	async search(query: string): Promise<Document[]> {
		const lowerQuery = query.toLowerCase();
		return await db.documents.filter(doc => {
			const dataString = JSON.stringify(doc.data);
			return dataString.toLowerCase().includes(lowerQuery);
		}).toArray();
	},

	// Delete document
	async delete(id: string): Promise<void> {
		await db.documents.delete(id);
	},

	// Initialize database
	async init(): Promise<void> {
		await db.open();
		logger.debug("✅ Schema-based storage initialized");
	},
};