import type { Event } from "@adk/events/event";
import type { ListSessionOptions, Message, Session } from "@adk/models";
import { type SessionService, SessionState } from "@adk/sessions";
import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { type PgliteDatabase, drizzle } from "drizzle-orm/pglite";

// Define Drizzle schema for sessions
export const sessionsSchema = pgTable("sessions", {
	id: varchar("id", { length: 255 }).primaryKey(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	messages: jsonb("messages").default("[]").$type<Message[]>(),
	metadata: jsonb("metadata").default("{}").$type<Record<string, any>>(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	state: jsonb("state").default("{}").$type<Record<string, any>>(),
});

// Type for the Drizzle schema
export type SessionsTable = typeof sessionsSchema;
export type SessionRow = typeof sessionsSchema.$inferSelect;

/**
 * Configuration for PgLiteSessionService
 */
export interface PgLiteSessionServiceConfig {
	/**
	 * An initialized PGlite instance.
	 * The service will handle all Drizzle ORM setup internally.
	 */
	pglite: PGlite;

	/**
	 * Optional: Skip automatic table creation if you handle migrations externally
	 */
	skipTableCreation?: boolean;
}

export class PgLiteSessionService implements SessionService {
	private db: PgliteDatabase<{ sessions: SessionsTable }>;
	private sessionsTable: SessionsTable;
	private initialized = false;

	constructor(config: PgLiteSessionServiceConfig) {
		// Initialize Drizzle with the provided PGlite instance
		this.db = drizzle(config.pglite, {
			schema: { sessions: sessionsSchema },
		});
		this.sessionsTable = sessionsSchema;

		// Initialize database tables unless explicitly skipped
		if (!config.skipTableCreation) {
			this.initializeDatabase().catch((error) => {
				console.error("Failed to initialize PgLite database:", error);
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
			await this.db.execute(`
				CREATE TABLE IF NOT EXISTS sessions (
					id VARCHAR(255) PRIMARY KEY,
					user_id VARCHAR(255) NOT NULL,
					messages JSONB DEFAULT '[]',
					metadata JSONB DEFAULT '{}',
					created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
					updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
					state JSONB DEFAULT '{}'
				);
			`);

			this.initialized = true;
		} catch (error) {
			console.error("Error initializing PgLite database:", error);
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

		const newSessionData: SessionRow = {
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
			createdAt: new Date(result.createdAt),
			updatedAt: new Date(result.updatedAt),
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
			createdAt: new Date(sessionData.createdAt),
			updatedAt: new Date(sessionData.updatedAt),
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
			createdAt: new Date(sessionData.createdAt),
			updatedAt: new Date(sessionData.updatedAt),
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
