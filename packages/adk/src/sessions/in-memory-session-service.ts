import type { Event } from "@adk/events/event";
import {
	BaseSessionService,
	type GetSessionConfig,
	type ListSessionsResponse,
} from "./base-session-service";
import type { Session } from "./session";
import { SessionState } from "./state";

/**
 * In-memory implementation of the session service.
 */
export class InMemorySessionService extends BaseSessionService {
	/**
	 * Map from app name to user ID to session ID to session.
	 */
	private sessions: Map<string, Map<string, Map<string, Session>>> = new Map();

	/**
	 * Map from app name to user ID to key to value (user state).
	 */
	private userState: Map<string, Map<string, Map<string, any>>> = new Map();

	/**
	 * Map from app name to key to value (app state).
	 */
	private appState: Map<string, Map<string, any>> = new Map();

	/**
	 * Creates a new session.
	 */
	async createSession(
		appName: string,
		userId: string,
		state: SessionState,
		sessionId?: string,
	): Promise<Session> {
		const id = sessionId?.trim() || this.generateSessionId();
		const now = Date.now() / 1000;

		const session: Session = {
			appName,
			id,
			userId,
			state,
			events: [],
			lastUpdateTime: now,
		};

		if (!this.sessions.has(appName)) this.sessions.set(appName, new Map());
		const userSessions = this.sessions.get(appName)!;
		if (!userSessions.has(userId)) userSessions.set(userId, new Map());
		userSessions.get(userId)!.set(id, session);

		const copiedSession = structuredClone(session);

		return this.mergeState(appName, userId, copiedSession);
	}

	/**
	 * Gets a session.
	 */
	async getSession(
		appName: string,
		userId: string,
		sessionId: string,
		config?: GetSessionConfig,
	): Promise<Session | undefined> {
		const userSessions = this.sessions.get(appName)?.get(userId);
		if (!userSessions) return undefined;
		const session = userSessions.get(sessionId);
		if (!session) return undefined;

		// Deep copy
		const copiedSession = structuredClone(session);

		// Filter events if config is provided
		if (config) {
			if (config.numRecentEvents) {
				copiedSession.events = copiedSession.events.slice(
					-config.numRecentEvents,
				);
			}
			if (config.afterTimestamp) {
				let i = copiedSession.events.length - 1;
				while (i >= 0) {
					if (copiedSession.events[i].timestamp < config.afterTimestamp) break;
					i--;
				}
				if (i >= 0) {
					copiedSession.events = copiedSession.events.slice(i + 1);
				}
			}
		}

		return this.mergeState(appName, userId, copiedSession);
	}

	/**
	 * Lists all the sessions for a user.
	 */
	async listSessions(
		appName: string,
		userId: string,
	): Promise<ListSessionsResponse> {
		const userSessions = this.sessions.get(appName)?.get(userId);
		if (!userSessions) return { sessions: [] };

		const sessionsWithoutEvents: Session[] = [];
		for (const session of userSessions.values()) {
			sessionsWithoutEvents.push({
				...session,
				events: [],
				state: new SessionState(),
			});
		}
		return { sessions: sessionsWithoutEvents };
	}

	/**
	 * Deletes a session.
	 */
	async deleteSession(
		appName: string,
		userId: string,
		sessionId: string,
	): Promise<void> {
		const userSessions = this.sessions.get(appName)?.get(userId);
		if (userSessions) {
			userSessions.delete(sessionId);
		}
	}

	/**
	 * Appends an event to a session object.
	 */
	async appendEvent(session: Session, event: Event): Promise<Event> {
		if (event.partial) {
			return event;
		}
		this.updateSessionState(session, event);
		if (!session.events) session.events = [];
		session.events.push(event);
		session.lastUpdateTime = event.timestamp;

		// Update the storage session
		const appName = session.appName;
		const userId = session.userId;
		const sessionId = session.id;

		const userSessions = this.sessions.get(appName)?.get(userId);
		if (!userSessions) return event;
		const storageSession = userSessions.get(sessionId);
		if (!storageSession) return event;

		// Handle app/user state deltas
		if (event.actions?.stateDelta) {
			for (const key in event.actions.stateDelta) {
				const value = event.actions.stateDelta[key];
				if (key.startsWith("app_")) {
					if (!this.appState.has(appName))
						this.appState.set(appName, new Map());
					this.appState.get(appName)!.set(key.replace(/^app_/, ""), value);
				} else if (key.startsWith("user_")) {
					if (!this.userState.has(appName))
						this.userState.set(appName, new Map());
					const userMap = this.userState.get(appName)!;
					if (!userMap.has(userId)) userMap.set(userId, new Map());
					userMap.get(userId)!.set(key.replace(/^user_/, ""), value);
				}
			}
		}

		// Update the storage session's events and lastUpdateTime
		if (!storageSession.events) storageSession.events = [];
		storageSession.events.push(event);
		storageSession.lastUpdateTime = event.timestamp;

		return event;
	}

	/**
	 * Merges app and user state into the session state.
	 */
	private mergeState(
		appName: string,
		userId: string,
		session: Session,
	): Session {
		// Merge app state
		if (this.appState.has(appName)) {
			for (const [key, value] of this.appState.get(appName)!.entries()) {
				session.state[`app_${key}`] = value;
			}
		}
		// Merge user state
		if (
			this.userState.has(appName) &&
			this.userState.get(appName)!.has(userId)
		) {
			for (const [key, value] of this.userState
				.get(appName)!
				.get(userId)!
				.entries()) {
				session.state[`user_${key}`] = value;
			}
		}
		return session;
	}

	/**
	 * Generates a unique session ID.
	 */
	private generateSessionId(): string {
		return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}
}
