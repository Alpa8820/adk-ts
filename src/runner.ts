import type { BaseAgent } from "./agents/base-agent";
import { InvocationContext } from "./agents/invocation-context";
import { RunConfig } from "./agents/run-config";
import { Event } from "./events/event";
import type { BaseMemoryService } from "./memory/base-memory-service";
import { InMemoryMemoryService } from "./memory/in-memory-memory-service";
import type { Message } from "./models/llm-request";
import type { SessionService } from "./sessions/base-session-service";
import { InMemorySessionService } from "./sessions/in-memory-session-service";
import type { Session } from "./sessions/session";

/**
 * The Runner class is used to run agents.
 * It manages the execution of an agent within a session, handling message
 * processing, event generation, and interaction with various services.
 */
export class Runner {
	/**
	 * The app name of the runner.
	 */
	appName: string;

	/**
	 * The root agent to run.
	 */
	agent: BaseAgent;

	/**
	 * The session service for the runner.
	 */
	sessionService: SessionService;

	/**
	 * The memory service for the runner.
	 */
	memoryService?: BaseMemoryService;

	/**
	 * Initializes the Runner.
	 */
	constructor({
		appName,
		agent,
		sessionService,
		memoryService,
	}: {
		appName: string;
		agent: BaseAgent;
		sessionService: SessionService;
		memoryService?: BaseMemoryService;
	}) {
		this.appName = appName;
		this.agent = agent;
		this.sessionService = sessionService;
		this.memoryService = memoryService;
	}

	/**
	 * Main entry method to run the agent in this runner.
	 */
	async *runAsync({
		userId,
		sessionId,
		newMessage,
		runConfig = new RunConfig(),
	}: {
		userId: string;
		sessionId: string;
		newMessage: Message;
		runConfig?: RunConfig;
	}): AsyncGenerator<Event, void, unknown> {
		// Get the session
		const session = await this.sessionService.getSession(sessionId);
		if (!session) {
			throw new Error(`Session not found: ${sessionId}`);
		}

		// Create invocation context
		const invocationContext = this._newInvocationContext({
			session,
			newMessage,
			runConfig,
		});

		// Append new message to session if provided
		if (newMessage) {
			await this._appendNewMessageToSession({
				session,
				newMessage,
				invocationContext,
			});
		}

		// Run the agent and yield events
		for await (const event of this.agent.runStreaming(invocationContext)) {
			if (!event.is_partial) {
				await this.sessionService.appendEvent(session, event);
			}
			yield event;
		}
	}

	/**
	 * Appends a new message to the session.
	 */
	private async _appendNewMessageToSession({
		session,
		newMessage,
		invocationContext,
	}: {
		session: Session;
		newMessage: Message;
		invocationContext: InvocationContext;
	}): Promise<void> {
		// Create and append the event
		const event = new Event({
			invocationId: invocationContext.sessionId, // Using sessionId as invocationId for now
			author: "user",
			content:
				typeof newMessage.content === "string" ? newMessage.content : null,
		});

		await this.sessionService.appendEvent(session, event);
	}

	/**
	 * Creates a new invocation context.
	 */
	private _newInvocationContext({
		session,
		newMessage,
		runConfig = new RunConfig(),
	}: {
		session: Session;
		newMessage?: Message;
		runConfig?: RunConfig;
	}): InvocationContext {
		return new InvocationContext({
			sessionId: session.id,
			messages: session.messages || [],
			config: runConfig,
			userId: session.userId,
			appName: this.appName,
			sessionService: this.sessionService,
			memoryService: this.memoryService,
			metadata: session.metadata || {},
		});
	}
}

/**
 * An in-memory Runner for testing and development.
 */
export class InMemoryRunner extends Runner {
	/**
	 * Initializes the InMemoryRunner.
	 */
	constructor(
		agent: BaseAgent,
		{ appName = "InMemoryRunner" }: { appName?: string } = {},
	) {
		const inMemorySessionService = new InMemorySessionService();

		super({
			appName,
			agent,
			sessionService: inMemorySessionService,
			memoryService: new InMemoryMemoryService(),
		});
	}
}
