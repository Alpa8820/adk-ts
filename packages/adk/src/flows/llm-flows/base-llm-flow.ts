import {
	type BaseAgent,
	CallbackContext,
	type InvocationContext,
	ReadonlyContext,
	StreamingMode,
} from "@adk/agents";
import { Event } from "@adk/events";
import { LlmRequest, type LlmResponse, type BaseLlm } from "@adk/models";
import { traceLlmCall } from "@adk/telemetry";
import { ToolContext } from "@adk/tools";
import * as functions from "./functions";

const _ADK_AGENT_NAME_LABEL_KEY = "adk_agent_name";

export abstract class BaseLlmFlow {
	requestProcessors: Array<any> = [];
	responseProcessors: Array<any> = [];

	async *runAsync(invocationContext: InvocationContext): AsyncGenerator<Event> {
		while (true) {
			let lastEvent: Event | null = null;
			for await (const event of this._runOneStepAsync(invocationContext)) {
				lastEvent = event;
				yield event;
			}
			if (!lastEvent || lastEvent.isFinalResponse()) break;
			if (lastEvent.partial) {
				throw new Error(
					"Last event shouldn't be partial. LLM max output limit may be reached.",
				);
			}
		}
	}

	async *runLive(invocationContext: InvocationContext): AsyncGenerator<Event> {
		// TODO: Implement live streaming functionality
		// This is a complex feature involving:
		// - Live connection management with llm.connect()
		// - Audio transcription caching and processing
		// - Real-time bidirectional communication
		// - Task cancellation and cleanup
		// - Live request queue handling
		// For now, delegate to runAsync for basic functionality
		console.warn("runLive not fully implemented, delegating to runAsync");
		yield* this.runAsync(invocationContext);
	}

	async *_runOneStepAsync(
		invocationContext: InvocationContext,
	): AsyncGenerator<Event> {
		const llmRequest = new LlmRequest();

		for await (const event of this._preprocessAsync(
			invocationContext,
			llmRequest,
		)) {
			yield event;
		}
		if (invocationContext.endInvocation) return;

		const modelResponseEvent = new Event({
			id: Event.newId(),
			invocationId: invocationContext.invocationId,
			author: invocationContext.agent.name,
			branch: invocationContext.branch,
		});

		for await (const llmResponse of this._callLlmAsync(
			invocationContext,
			llmRequest,
			modelResponseEvent,
		)) {
			for await (const event of this._postprocessAsync(
				invocationContext,
				llmRequest,
				llmResponse,
				modelResponseEvent,
			)) {
				modelResponseEvent.id = Event.newId();
				yield event;
			}
		}
	}

	async *_preprocessAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event> {
		const agent = invocationContext.agent;
		if (
			!("canonicalTools" in agent) ||
			typeof agent.canonicalTools !== "function"
		) {
			return;
		}

		for (const processor of this.requestProcessors) {
			for await (const event of processor.runAsync(
				invocationContext,
				llmRequest,
			)) {
				yield event;
			}
		}

		for (const tool of await agent.canonicalTools(
			new ReadonlyContext(invocationContext),
		)) {
			const toolContext = new ToolContext(invocationContext);
			await tool.processLlmRequest(toolContext, llmRequest);
		}
	}

	async *_postprocessAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
		llmResponse: LlmResponse,
		modelResponseEvent: Event,
	): AsyncGenerator<Event> {
		for await (const event of this._postprocessRunProcessorsAsync(
			invocationContext,
			llmResponse,
		)) {
			yield event;
		}

		if (
			!llmResponse.content &&
			!llmResponse.errorCode &&
			!llmResponse.interrupted
		) {
			return;
		}

		const finalizedEvent = this._finalizeModelResponseEvent(
			llmRequest,
			llmResponse,
			modelResponseEvent,
		);
		yield finalizedEvent;

		if (finalizedEvent.getFunctionCalls()) {
			for await (const event of this._postprocessHandleFunctionCallsAsync(
				invocationContext,
				finalizedEvent,
				llmRequest,
			)) {
				yield event;
			}
		}
	}

	async *_postprocessLive(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
		llmResponse: LlmResponse,
		modelResponseEvent: Event,
	): AsyncGenerator<Event> {
		// Run processors
		for await (const event of this._postprocessRunProcessorsAsync(
			invocationContext,
			llmResponse,
		)) {
			yield event;
		}

		// Skip model response event if no content, error, or turn completion
		// This handles live-specific cases like turn_complete
		if (
			!llmResponse.content &&
			!llmResponse.errorCode &&
			!llmResponse.interrupted &&
			!(llmResponse as any).turnComplete
		) {
			return;
		}

		// Build the event
		const finalizedEvent = this._finalizeModelResponseEvent(
			llmRequest,
			llmResponse,
			modelResponseEvent,
		);
		yield finalizedEvent;

		// Handle function calls for live mode
		if (finalizedEvent.getFunctionCalls()) {
			// TODO: Implement functions.handleFunctionCallsLive when available
			const functionResponseEvent = await functions.handleFunctionCallsAsync(
				invocationContext,
				finalizedEvent,
				(llmRequest as any).toolsDict || {},
			);

			if (functionResponseEvent) {
				yield functionResponseEvent;

				const transferToAgent = functionResponseEvent.actions?.transferToAgent;
				if (transferToAgent) {
					const agentToRun = this._getAgentToRun(
						invocationContext,
						transferToAgent,
					);
					for await (const event of agentToRun.runLive?.(invocationContext) ||
						agentToRun.runAsync(invocationContext)) {
						yield event;
					}
				}
			}
		}
	}

	async *_postprocessRunProcessorsAsync(
		invocationContext: InvocationContext,
		llmResponse: LlmResponse,
	): AsyncGenerator<Event> {
		for (const processor of this.responseProcessors) {
			for await (const event of processor.runAsync(
				invocationContext,
				llmResponse,
			)) {
				yield event;
			}
		}
	}

	async *_postprocessHandleFunctionCallsAsync(
		invocationContext: InvocationContext,
		functionCallEvent: Event,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event> {
		const functionResponseEvent = await functions.handleFunctionCallsAsync(
			invocationContext,
			functionCallEvent,
			(llmRequest as any).toolsDict || {},
		);
		if (functionResponseEvent) {
			const authEvent = functions.generateAuthEvent(
				invocationContext,
				functionResponseEvent,
			);
			if (authEvent) yield authEvent;

			yield functionResponseEvent;
			const transferToAgent = functionResponseEvent.actions?.transferToAgent;
			if (transferToAgent) {
				const agentToRun = this._getAgentToRun(
					invocationContext,
					transferToAgent,
				);
				for await (const event of agentToRun.runAsync(invocationContext)) {
					yield event;
				}
			}
		}
	}

	_getAgentToRun(
		invocationContext: InvocationContext,
		agentName: string,
	): BaseAgent {
		const rootAgent = invocationContext.agent.rootAgent;
		const agentToRun = rootAgent.findAgent(agentName);
		if (!agentToRun) {
			throw new Error(`Agent ${agentName} not found in the agent tree.`);
		}
		return agentToRun;
	}

	async *_callLlmAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
		modelResponseEvent: Event,
	): AsyncGenerator<LlmResponse> {
		// Before model callback
		const beforeModelCallbackContent = await this._handleBeforeModelCallback(
			invocationContext,
			llmRequest,
			modelResponseEvent,
		);
		if (beforeModelCallbackContent) {
			yield beforeModelCallbackContent;
			return;
		}

		// Initialize config and labels
		llmRequest.config = llmRequest.config || {};
		llmRequest.config.labels = llmRequest.config.labels || {};

		// Add agent name as label for billing/tracking
		if (!(_ADK_AGENT_NAME_LABEL_KEY in llmRequest.config.labels)) {
			llmRequest.config.labels[_ADK_AGENT_NAME_LABEL_KEY] =
				invocationContext.agent.name;
		}

		const llm = this.__getLlm(invocationContext);

		// Check for CFC (Continuous Function Calling) support
		const runConfig = invocationContext.runConfig;
		if ((runConfig as any).supportCfc) {
			// TODO: Implement full CFC with live request queue
			// This would involve setting up LiveRequestQueue and calling runLive
			console.warn(
				"CFC (supportCfc) not fully implemented, using standard flow",
			);
		}

		// Standard LLM call flow
		invocationContext.incrementLlmCallCount();

		for await (const llmResponse of llm.generateContentAsync(
			llmRequest,
			invocationContext.runConfig.streamingMode === StreamingMode.SSE,
		)) {
			// Telemetry tracing
			traceLlmCall(
				invocationContext,
				modelResponseEvent.id,
				llmRequest,
				llmResponse,
			);

			// After model callback
			const alteredLlmResponse = await this._handleAfterModelCallback(
				invocationContext,
				llmResponse,
				modelResponseEvent,
			);

			yield alteredLlmResponse || llmResponse;
		}
	}

	async _handleBeforeModelCallback(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
		modelResponseEvent: Event,
	): Promise<LlmResponse | undefined> {
		const agent = invocationContext.agent;

		// Check if agent has LlmAgent-like structure
		if (!("canonicalBeforeModelCallbacks" in agent)) {
			return;
		}

		const beforeCallbacks = (agent as any).canonicalBeforeModelCallbacks;
		if (!beforeCallbacks) {
			return;
		}

		const callbackContext = new CallbackContext(invocationContext, {
			eventActions: modelResponseEvent.actions,
		});

		for (const callback of beforeCallbacks) {
			// Python passes both callback_context and llm_request
			let beforeModelCallbackContent = callback({
				callbackContext,
				llmRequest,
			});

			if (beforeModelCallbackContent instanceof Promise) {
				beforeModelCallbackContent = await beforeModelCallbackContent;
			}

			if (beforeModelCallbackContent) {
				// Python callbacks return LlmResponse objects directly
				return beforeModelCallbackContent;
			}
		}
	}

	async _handleAfterModelCallback(
		invocationContext: InvocationContext,
		llmResponse: LlmResponse,
		modelResponseEvent: Event,
	): Promise<LlmResponse | undefined> {
		const agent = invocationContext.agent;

		// Check if agent has LlmAgent-like structure
		if (!("canonicalAfterModelCallbacks" in agent)) {
			return;
		}

		const afterCallbacks = (agent as any).canonicalAfterModelCallbacks;
		if (!afterCallbacks) {
			return;
		}

		const callbackContext = new CallbackContext(invocationContext, {
			eventActions: modelResponseEvent.actions,
		});

		for (const callback of afterCallbacks) {
			// Python passes both callback_context and llm_response
			let afterModelCallbackContent = callback({
				callbackContext,
				llmResponse,
			});

			if (afterModelCallbackContent instanceof Promise) {
				afterModelCallbackContent = await afterModelCallbackContent;
			}

			if (afterModelCallbackContent) {
				return afterModelCallbackContent;
			}
		}
	}

	_finalizeModelResponseEvent(
		llmRequest: LlmRequest,
		llmResponse: LlmResponse,
		modelResponseEvent: Event,
	): Event {
		// Python uses Pydantic model_validate with model_dump - we'll use object spreading
		const eventData = { ...modelResponseEvent } as any;
		const responseData = { ...llmResponse } as any;

		// Merge excluding null/undefined values (similar to exclude_none=True)
		Object.keys(responseData).forEach((key) => {
			if (responseData[key] !== null && responseData[key] !== undefined) {
				eventData[key] = responseData[key];
			}
		});

		const event = new Event(eventData);

		if (event.content) {
			const functionCalls = event.getFunctionCalls();
			if (functionCalls) {
				functions.populateClientFunctionCallId(event);
				event.longRunningToolIds = functions.getLongRunningFunctionCalls(
					functionCalls,
					(llmRequest as any).toolsDict || {},
				);
			}
		}
		return event;
	}

	__getLlm(invocationContext: InvocationContext): BaseLlm {
		return (invocationContext.agent as any).canonicalModel;
	}
}
