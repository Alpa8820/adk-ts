import type { InvocationContext } from "./invocation-context";

/**
 * Readonly context providing access to invocation data without modification capabilities
 */
export class ReadonlyContext {
	/**
	 * The underlying invocation context
	 */
	protected readonly _invocationContext: InvocationContext;

	/**
	 * Constructor for ReadonlyContext
	 */
	constructor(invocationContext: InvocationContext) {
		this._invocationContext = invocationContext;
	}

	/**
	 * The user content that started this invocation. READONLY field.
	 */
	get userContent(): string | null {
		// Get the first user message content as the user content that started this invocation
		const userMessage = this._invocationContext.messages.find(
			(msg) => msg.role === "user",
		);
		return typeof userMessage?.content === "string"
			? userMessage.content
			: null;
	}

	/**
	 * The current invocation id
	 */
	get invocationId(): string {
		return this._invocationContext.sessionId;
	}

	/**
	 * The name of the agent that is currently running
	 */
	get agentName(): string {
		// For now, return a default since agent reference might not be available
		// This may need to be updated when we have a proper agent reference in InvocationContext
		return this._invocationContext.metadata.agentName || "unknown";
	}

	/**
	 * The state of the current session. READONLY field.
	 */
	get state(): Readonly<Record<string, any>> {
		// Return a readonly view of the metadata as state proxy
		// This may need to be updated when we implement the proper State class
		return Object.freeze({ ...this._invocationContext.metadata });
	}
}
