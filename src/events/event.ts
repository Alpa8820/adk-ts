import { type FunctionCall, LLMResponse, type ToolCall } from "@adk/models";
import { v4 as uuidv4 } from "uuid";
import { EventActions } from "./event-actions";

/**
 * Represents an event in a conversation between agents and users.
 * It is used to store the content of the conversation, as well as the actions
 * taken by the agents like function calls, etc.
 */
export class Event extends LLMResponse {
	/**
	 * The invocation ID of the event.
	 */
	invocationId = "";

	/**
	 * 'user' or the name of the agent, indicating who appended the event to the session.
	 */
	author: string;

	/**
	 * The actions taken by the agent.
	 */
	actions: EventActions = new EventActions();

	/**
	 * Set of ids of the long running function calls.
	 * Agent client will know from this field about which function call is long running.
	 * Only valid for function call event.
	 */
	longRunningToolIds?: Set<string>;

	/**
	 * The branch of the event.
	 * The format is like agent_1.agent_2.agent_3, where agent_1 is the parent of
	 * agent_2, and agent_2 is the parent of agent_3.
	 * Branch is used when multiple sub-agent shouldn't see their peer agents'
	 * conversation history.
	 */
	branch?: string;

	/**
	 * The unique identifier of the event.
	 */
	id = "";

	/**
	 * The timestamp of the event.
	 */
	timestamp: number;

	/**
	 * Constructor for Event
	 */
	constructor({
		invocationId = "",
		author,
		content,
		function_call,
		tool_calls,
		role = "assistant",
		actions = new EventActions(),
		longRunningToolIds,
		branch,
		id = "",
		timestamp,
		partial = false,
		raw_response,
	}: {
		invocationId?: string;
		author: string;
		content?: string | null;
		function_call?: FunctionCall;
		tool_calls?: ToolCall[];
		role?: string;
		actions?: EventActions;
		longRunningToolIds?: Set<string>;
		branch?: string;
		id?: string;
		timestamp?: number;
		partial?: boolean;
		raw_response?: any;
	}) {
		super({
			content,
			function_call,
			tool_calls,
			role,
			is_partial: partial,
			raw_response,
		});
		this.invocationId = invocationId;
		this.author = author;
		this.actions = actions;
		this.longRunningToolIds = longRunningToolIds;
		this.branch = branch;
		this.id = id || Event.newId();
		this.timestamp = timestamp || Date.now();
		
		// Ensure content is properly handled for streaming responses
		if (this.is_partial && this.content === "") {
			this.content = null;
		}
	}

	/**
	 * Returns whether the event is the final response of the agent.
	 */
	isFinalResponse(): boolean {
		if (this.actions.skipSummarization || this.longRunningToolIds) {
			return true;
		}

		return (
			!this.function_call &&
			(!this.tool_calls || this.tool_calls.length === 0) &&
			!this.is_partial
		);
	}
	
	/**
	 * Returns whether the event has meaningful content.
	 * Used to filter out empty or meaningless streaming chunks.
	 */
	hasContent(): boolean {
		return this.content !== null && this.content !== undefined && this.content.trim() !== "";
	}

	/**
	 * Generates a new random ID for an event.
	 */
	static newId(): string {
		return uuidv4().substring(0, 8);
	}
}
