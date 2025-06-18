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
	 * Last update timestamp
	 */
	lastUpdateTime: number;
}
