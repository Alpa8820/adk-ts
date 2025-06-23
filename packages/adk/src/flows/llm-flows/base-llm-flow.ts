import {
	type BaseAgent,
	CallbackContext,
	type InvocationContext,
	ReadonlyContext,
	StreamingMode,
} from "@adk/agents";
import { Event } from "@adk/events";
import { type BaseLlm, LlmRequest, LlmResponse } from "@adk/models";
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
			await tool.process_llm_request({
				toolContext,
				llmRequest,
			});
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
			llmRequest.toolsDict,
		);
		if (functionResponseEvent) {
			const authEvent = functions.generateAuthEvent(
				invocationContext,
				functionResponseEvent,
			);
			if (authEvent) yield authEvent;

			yield functionResponseEvent;
			const transferToAgent = functionResponseEvent.actions.transferToAgent;
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

		llmRequest.config = llmRequest.config || {};
		llmRequest.config.labels = llmRequest.config.labels || {};

		if (!(_ADK_AGENT_NAME_LABEL_KEY in llmRequest.config.labels)) {
			llmRequest.config.labels[_ADK_AGENT_NAME_LABEL_KEY] =
				invocationContext.agent.name;
		}

		const llm = this.__getLlm(invocationContext);

		invocationContext.incrementLlmCallCount();
		for await (const llmResponse of llm.generateContentAsync(
			llmRequest,
			invocationContext.runConfig.streamingMode === StreamingMode.SSE,
		)) {
			traceLlmCall(
				invocationContext,
				modelResponseEvent.id,
				llmRequest,
				llmResponse,
			);
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
		if (typeof agent.canonicalBeforeAgentCallbacks !== "object") return;

		if (!agent.canonicalBeforeAgentCallbacks) return;

		const callbackContext = new CallbackContext(invocationContext, {
			eventActions: modelResponseEvent.actions,
		});

		for (const callback of agent.canonicalBeforeAgentCallbacks) {
			let beforeModelCallbackContent = callback(callbackContext);
			if (beforeModelCallbackContent instanceof Promise) {
				beforeModelCallbackContent = await beforeModelCallbackContent;
			}
			if (beforeModelCallbackContent) {
				return new LlmResponse({ content: beforeModelCallbackContent });
			}
		}
	}

	async _handleAfterModelCallback(
		invocationContext: InvocationContext,
		llmResponse: LlmResponse,
		modelResponseEvent: Event,
	): Promise<LlmResponse | undefined> {
		const agent = invocationContext.agent;
		if (typeof agent.canonicalAfterAgentCallbacks !== "object") return;

		if (!agent.canonicalAfterAgentCallbacks) return;

		const callbackContext = new CallbackContext(invocationContext, {
			eventActions: modelResponseEvent.actions,
		});

		for (const callback of agent.canonicalAfterAgentCallbacks) {
			let afterModelCallbackContent = callback(callbackContext);
			if (afterModelCallbackContent instanceof Promise) {
				afterModelCallbackContent = await afterModelCallbackContent;
			}
			if (afterModelCallbackContent) {
				return new LlmResponse({ content: afterModelCallbackContent });
			}
		}
	}

	_finalizeModelResponseEvent(
		llmRequest: LlmRequest,
		llmResponse: LlmResponse,
		modelResponseEvent: Event,
	): Event {
		// Merge modelResponseEvent and llmResponse
		const event = {
			...modelResponseEvent,
			...llmResponse,
		} as Event;

		if (event.content) {
			const functionCalls = event.getFunctionCalls();
			if (functionCalls) {
				functions.populateClientFunctionCallId(event);
				event.longRunningToolIds = functions.getLongRunningFunctionCalls(
					functionCalls,
					llmRequest.toolsDict,
				);
			}
		}
		return event;
	}

	__getLlm(invocationContext: InvocationContext): BaseLlm {
		return (invocationContext.agent as any).canonicalModel;
	}
}
