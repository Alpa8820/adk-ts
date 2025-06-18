import type { Event } from "@adk/events/event";
import type { SessionService } from "./base-session-service";
import type { ListSessionOptions, Session } from "./session";
import { SessionState } from "./state";
/**
 * In-memory implementation of SessionService
 */
export class InMemorySessionService implements SessionService {
	/**
	 * Map of sessions by ID
	 */
	private sessions: Map<string, Session>;

	/**
	 * Constructor for InMemorySessionService
	 */
	constructor() {
		this.sessions = new Map<string, Session>();
	}

	/**
	 * Creates a new session
	 * @param userId User identifier
	 * @param metadata Optional session metadata
	 * @returns The created session
	 */
	async createSession(
		appName: string,
		userId: string,
		metadata: Record<string, any> = {},
		state = new SessionState(),
		sessionId = this.generateSessionId(),
	): Promise<Session> {
		const id = sessionId ?? this.generateSessionId();
		const now = new Date();

		const session: Session = {
			appName,
			id,
			userId,
			metadata,
			createdAt: now,
			updatedAt: now,
			state,
			events: [],
		};

		this.sessions.set(sessionId, session);
		return session;
	}

	/**
	 * Gets a session by ID
	 * @param sessionId Session identifier
	 * @returns The session or undefined if not found
	 */
	async getSession(sessionId: string): Promise<Session | undefined> {
		return this.sessions.get(sessionId);
	}

	/**
	 * Updates an existing session
	 * @param session The session to update
	 */
	async updateSession(session: Session): Promise<void> {
		// Update the timestamp
		session.updatedAt = new Date();

		// Store the updated session
		this.sessions.set(session.id, { ...session });
	}

	/**
	 * Lists sessions for a user
	 * @param userId User identifier
	 * @param options Optional filtering options
	 * @returns Array of matching sessions
	 */
	async listSessions(
		userId: string,
		options?: ListSessionOptions,
	): Promise<Session[]> {
		// Get all sessions for the user
		let sessions = Array.from(this.sessions.values()).filter(
			(session) => session.userId === userId,
		);

		// Apply createdAfter filter
		if (options?.createdAfter) {
			sessions = sessions.filter(
				(session) => session.createdAt >= options.createdAfter!,
			);
		}

		// Apply updatedAfter filter
		if (options?.updatedAfter) {
			sessions = sessions.filter(
				(session) => session.updatedAt >= options.updatedAfter!,
			);
		}

		// Apply metadata filter if provided
		if (options?.metadataFilter) {
			sessions = sessions.filter((session) => {
				for (const [key, value] of Object.entries(options.metadataFilter!)) {
					if (session.metadata[key] !== value) {
						return false;
					}
				}
				return true;
			});
		}

		// Sort by updatedAt (newest first)
		sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

		// Apply limit if provided
		if (options?.limit !== undefined && options.limit > 0) {
			sessions = sessions.slice(0, options.limit);
		}

		return sessions;
	}

	/**
	 * Deletes a session
	 * @param sessionId Session identifier
	 */
	async deleteSession(sessionId: string): Promise<void> {
		this.sessions.delete(sessionId);
	}

	/**
	 * Clears all sessions
	 */
	clear(): void {
		this.sessions.clear();
	}

	/**
	 * Generates a unique session ID
	 * @returns A unique session ID
	 */
	private generateSessionId(): string {
		return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	/**
	 * Appends an event to a session object
	 * @param session The session to append the event to
	 * @param event The event to append
	 * @returns The appended event
	 */
	async appendEvent(session: Session, event: Event): Promise<Event> {
		if (event.is_partial) {
			return event;
		}

		// Update session state based on event
		if (event.actions?.stateDelta) {
			for (const [key, value] of Object.entries(event.actions.stateDelta)) {
				if (key.startsWith("_temp_")) {
					continue;
				}

				if (!session.state) {
					session.state = new SessionState();
				}

				session.state.set(key, value);
			}
		}

		// Add event to session
		if (!session.events) {
			session.events = [];
		}
		session.events.push(event);

		// Update session timestamp
		session.updatedAt = new Date();

		return event;
	}
}
