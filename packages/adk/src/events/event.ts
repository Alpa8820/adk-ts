import { type FunctionCall, LLMResponse } from "@adk/models";
import type { FunctionResponse } from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import { EventActions } from "./event-actions";

interface EventOpts {
	invocationId?: string;
	author: string;
	actions?: EventActions;
	longRunningToolIds?: Set<string>;
	branch?: string;
	id?: string;
	timestamp?: number;
	content?: any;
	function_call?: FunctionCall;
	function_responses?: FunctionResponse[];
	tool_calls?: any[];
	role?: string;
	partial?: boolean;
	raw_response?: any;
}

/**
 * Represents an event in a conversation between agents and users.
 * It is used to store the content of the conversation, as well as the actions
 * taken by the agents like function calls, etc.
 */
export class Event extends LLMResponse {
	/** The invocation ID of the event. */
	invocationId = "";

	/** 'user' or the name of the agent, indicating who appended the event to the session. */
	author: string;

	/** The actions taken by the agent. */
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
	 * agent_2, and agent_2 is the parent of agent_3. Branch is used when multiple
	 * sub-agents shouldn't see their peer agents' conversation history.
	 */
	branch?: string;

	/** The unique identifier of the event. */
	id = "";

	/** The timestamp of the event. */
	timestamp: number = Date.now();

	/**
	 * Constructor for Event.
	 */
	constructor(opts: EventOpts) {
		super({
			content: opts.content,
			function_call: opts.function_call,
			function_responses: opts.function_responses,
			tool_calls: opts.tool_calls,
			role: opts.role,
			is_partial: opts.partial,
			raw_response: opts.raw_response,
		});
		this.invocationId = opts.invocationId;
		this.author = opts.author;
		this.actions = opts.actions;
		this.longRunningToolIds = opts.longRunningToolIds;
		this.branch = opts.branch;
		this.id = opts.id || Event.newId();
		this.timestamp = opts.timestamp ?? Date.now();
	}

	/**
	 * Returns whether the event is the final response of the agent.
	 */
	isFinalResponse(): boolean {
		if (this.actions.skipSummarization || this.longRunningToolIds) {
			return true;
		}
		return (
			this.getFunctionCalls().length === 0 &&
			this.getFunctionResponses().length === 0 &&
			!this.is_partial &&
			!this.hasTrailingCodeExecutionResult()
		);
	}

	/**
	 * Returns the function calls in the event.
	 */
	getFunctionCalls(): FunctionCall[] {
		const funcCalls: FunctionCall[] = [];
		if (this.content && Array.isArray(this.content.parts)) {
			for (const part of this.content.parts) {
				if (part.function_call) {
					funcCalls.push(part.function_call);
				}
			}
		}
		return funcCalls;
	}

	/**
	 * Returns the function responses in the event.
	 */
	getFunctionResponses(): FunctionResponse[] {
		const funcResponses: FunctionResponse[] = [];
		if (this.content && Array.isArray(this.content.parts)) {
			for (const part of this.content.parts) {
				if (part.function_response) {
					funcResponses.push(part.function_response);
				}
			}
		}
		return funcResponses;
	}

	/**
	 * Returns whether the event has a trailing code execution result.
	 */
	hasTrailingCodeExecutionResult(): boolean {
		if (
			this.content &&
			Array.isArray(this.content.parts) &&
			this.content.parts.length > 0
		) {
			return (
				this.content.parts[this.content.parts.length - 1]
					.code_execution_result != null
			);
		}
		return false;
	}

	/**
	 * Generates a new random ID for an event.
	 */
	static newId(): string {
		return uuidv4().replace(/-/g, "").substring(0, 8);
	}
}
