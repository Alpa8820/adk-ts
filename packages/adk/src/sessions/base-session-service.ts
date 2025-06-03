import type { Event } from "@adk/events/event";
import type { ListSessionOptions, Session } from "./session";
/**
 * Service for managing sessions
 */
export interface SessionService {
	/**
	 * Creates a new session
	 * @param userId User identifier
	 * @param metadata Optional session metadata
	 * @returns The created session
	 */
	createSession(
		userId: string,
		metadata?: Record<string, any>,
	): Promise<Session>;

	/**
	 * Gets a session by ID
	 * @param sessionId Session identifier
	 * @returns The session or undefined if not found
	 */
	getSession(sessionId: string): Promise<Session | undefined>;

	/**
	 * Updates an existing session
	 * @param session The session to update
	 */
	updateSession(session: Session): Promise<void>;

	/**
	 * Lists sessions for a user
	 * @param userId User identifier
	 * @param options Optional filtering options
	 * @returns Array of matching sessions
	 */
	listSessions(
		userId: string,
		options?: ListSessionOptions,
	): Promise<Session[]>;

	/**
	 * Deletes a session
	 * @param sessionId Session identifier
	 */
	deleteSession(sessionId: string): Promise<void>;

	/**
	 * Appends an event to a session object
	 * @param session The session to append the event to
	 * @param event The event to append
	 * @returns The appended event
	 */
	appendEvent(session: Session, event: Event): Promise<Event>;
}
