import * as fs from "node:fs";
import * as path from "node:path";
import type { Event } from "@adk/events/event";
import type { ListSessionOptions, Message, Session } from "@adk/models";
import { type SessionService, SessionState } from "@adk/sessions";
import type Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import {
	type BetterSQLite3Database,
	drizzle,
} from "drizzle-orm/better-sqlite3";
import { integer, text } from "drizzle-orm/sqlite-core";
import { sqliteTable } from "drizzle-orm/sqlite-core";

// Define Drizzle schema for sessions
const sessionsSchema = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
	messages: text("messages", { mode: "json" }).default("[]").$type<Message[]>(),
	metadata: text("metadata", { mode: "json" })
		.default("{}")
		.$type<Record<string, any>>(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	state: text("state", { mode: "json" })
		.default("{}")
		.$type<Record<string, any>>(),
});

// Type for the Drizzle schema
export type SessionsTable = typeof sessionsSchema;
export type SessionRow = typeof sessionsSchema.$inferSelect;

/**
 * Configuration for SqliteSessionService
 */
export interface SqliteSessionServiceConfig {
	/**
	 * An initialized better-sqlite3 Database instance.
	 * The service will handle all Drizzle ORM setup internally.
	 */
	sqlite: Database.Database;

	/**
	 * Optional: Skip automatic table creation if you handle migrations externally
	 */
	skipTableCreation?: boolean;
}

export class SqliteSessionService implements SessionService {
	private db: BetterSQLite3Database<{ sessions: SessionsTable }>;
	private sessionsTable: SessionsTable;
	private initialized = false;
	private sqliteInstance: Database.Database;

	constructor(config: SqliteSessionServiceConfig) {
		this.sqliteInstance = config.sqlite;

		// Ensure the database directory exists
		const dbPath = this.sqliteInstance.name;
		if (dbPath && dbPath !== ":memory:") {
			const dbDir = path.dirname(dbPath);
			if (!fs.existsSync(dbDir)) {
				fs.mkdirSync(dbDir, { recursive: true });
			}
		}

		// Initialize Drizzle with the provided SQLite instance
		this.db = drizzle(config.sqlite, {
			schema: { sessions: sessionsSchema },
		});
		this.sessionsTable = sessionsSchema;

		// Initialize database tables unless explicitly skipped
		if (!config.skipTableCreation) {
			this.initializeDatabase().catch((error) => {
				console.error("Failed to initialize SQLite database:", error);
			});
		}
	}

	/**
	 * Initialize the database by creating required tables if they don't exist
	 */
	private async initializeDatabase(): Promise<void> {
		if (this.initialized) {
			return;
		}

		try {
			// Enable WAL mode for better concurrent access
			this.sqliteInstance.pragma("journal_mode = WAL");

			// Create sessions table using raw SQL since Drizzle doesn't have migrations built-in
			this.sqliteInstance.exec(`
				CREATE TABLE IF NOT EXISTS sessions (
					id TEXT PRIMARY KEY,
					user_id TEXT NOT NULL,
					messages TEXT DEFAULT '[]',
					metadata TEXT DEFAULT '{}',
					created_at INTEGER NOT NULL,
					updated_at INTEGER NOT NULL,
					state TEXT DEFAULT '{}'
				);
			`);

			// Create index on user_id for faster queries
			this.sqliteInstance.exec(`
				CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
			`);

			this.initialized = true;
		} catch (error) {
			console.error("Error initializing SQLite database:", error);
			throw error;
		}
	}

	/**
	 * Ensure database is initialized before any operation
	 */
	private async ensureInitialized(): Promise<void> {
		if (!this.initialized) {
			await this.initializeDatabase();
		}
	}

	private generateSessionId(): string {
		return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	async createSession(
		userId: string,
		metadata: Record<string, any> = {},
	): Promise<Session> {
		await this.ensureInitialized();

		const sessionId = this.generateSessionId();
		const now = new Date();
		const sessionState = new SessionState();

		const newSessionData: typeof this.sessionsTable.$inferInsert = {
			id: sessionId,
			userId,
			messages: [] as Message[],
			metadata,
			createdAt: now,
			updatedAt: now,
			state: sessionState.toObject(),
		};

		const results = await this.db
			.insert(this.sessionsTable)
			.values(newSessionData)
			.returning();

		const result = results[0];
		if (!result) {
			throw new Error(
				"Failed to create session, no data returned from insert.",
			);
		}

		return {
			id: result.id,
			userId: result.userId,
			messages: Array.isArray(result.messages)
				? (result.messages as Message[])
				: [],
			metadata: result.metadata || {},
			state: SessionState.fromObject(result.state || {}),
			createdAt: result.createdAt,
			updatedAt: result.updatedAt,
		};
	}

	async getSession(sessionId: string): Promise<Session | undefined> {
		await this.ensureInitialized();

		const results = await this.db
			.select()
			.from(this.sessionsTable)
			.where(eq(this.sessionsTable.id, sessionId))
			.limit(1);

		const sessionData = results[0];
		if (!sessionData) {
			return undefined;
		}

		return {
			id: sessionData.id,
			userId: sessionData.userId,
			messages: Array.isArray(sessionData.messages)
				? (sessionData.messages as Message[])
				: [],
			metadata: sessionData.metadata || {},
			state: SessionState.fromObject(sessionData.state || {}),
			createdAt: sessionData.createdAt,
			updatedAt: sessionData.updatedAt,
		};
	}

	async updateSession(session: Session): Promise<void> {
		await this.ensureInitialized();

		const updateData: Partial<SessionRow> = {
			userId: session.userId,
			messages: session.messages as Message[],
			metadata: session.metadata,
			updatedAt: new Date(),
			state: session.state.toObject(),
		};

		await this.db
			.update(this.sessionsTable)
			.set(updateData)
			.where(eq(this.sessionsTable.id, session.id));
	}

	async listSessions(
		userId: string,
		options?: ListSessionOptions,
	): Promise<Session[]> {
		await this.ensureInitialized();

		let query = this.db
			.select()
			.from(this.sessionsTable)
			.where(eq(this.sessionsTable.userId, userId));

		if (options?.limit !== undefined && options.limit > 0) {
			query = query.limit(options.limit) as typeof query;
		}

		const results: SessionRow[] = await query;

		return results.map((sessionData: SessionRow) => ({
			id: sessionData.id,
			userId: sessionData.userId,
			messages: Array.isArray(sessionData.messages)
				? (sessionData.messages as Message[])
				: [],
			metadata: sessionData.metadata || {},
			state: SessionState.fromObject(sessionData.state || {}),
			createdAt: sessionData.createdAt,
			updatedAt: sessionData.updatedAt,
		}));
	}

	async deleteSession(sessionId: string): Promise<void> {
		await this.ensureInitialized();

		await this.db
			.delete(this.sessionsTable)
			.where(eq(this.sessionsTable.id, sessionId));
	}

	async appendEvent(session: Session, event: Event): Promise<Event> {
		await this.ensureInitialized();

		if (event.is_partial) {
			return event;
		}

		// Update session state based on event
		if (event.actions?.stateDelta) {
			for (const [key, value] of Object.entries(event.actions.stateDelta)) {
				if (key.startsWith("_temp_")) {
					continue;
				}

				session.state?.set(key, value);
			}
		}

		// Add event to session
		if (!session.events) {
			session.events = [];
		}
		session.events.push(event);

		// Update session timestamp
		session.updatedAt = new Date();

		// Save the updated session to the database
		await this.updateSession(session);

		return event;
	}
}
