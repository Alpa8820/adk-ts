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
}
