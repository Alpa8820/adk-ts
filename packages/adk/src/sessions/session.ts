import type { Event } from "@adk/events/event";
import type { SessionState } from "./state";

/**
 * Represents a conversation session
 */
export interface Session {
	/**
	 * Unique session identifier
	 */
	id: string;

	/**
	 * Name of the app
	 */
	appName: string;

	/**
	 * User identifier associated with the session
	 */
	userId: string;

	/**
	 * Session state for storing arbitrary data
	 */
	state: SessionState;

	/**
	 * Session events
	 */
	events?: Event[];

	/**
	 * Additional session metadata
	 */
	metadata: Record<string, any>;

	/**
	 * Session creation timestamp
	 */
	createdAt: Date;

	/**
	 * Last update timestamp
	 */
	updatedAt: Date;
}

/**
 * Options for listing sessions
 */
export interface ListSessionOptions {
	/**
	 * Maximum number of sessions to return
	 */
	limit?: number;

	/**
	 * Only include sessions created after this time
	 */
	createdAfter?: Date;

	/**
	 * Only include sessions updated after this time
	 */
	updatedAfter?: Date;

	/**
	 * Filter sessions by metadata
	 */
	metadataFilter?: Record<string, any>;
}
