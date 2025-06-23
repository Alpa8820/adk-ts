import { CallbackContext, type InvocationContext } from "@adk/agents";
import { Event, EventActions } from "@adk/events";
import { traceToolCall } from "@adk/telemetry";
import { type BaseTool, ToolContext } from "@adk/tools";
import type { Content, FunctionCall, Part } from "@google/genai";
import { v4 as uuidv4 } from "uuid";

const AF_FUNCTION_CALL_ID_PREFIX = "adk-";
const REQUEST_EUC_FUNCTION_CALL_NAME = "adk_request_credential";

export function generateClientFunctionCallId(): string {
	return `${AF_FUNCTION_CALL_ID_PREFIX}${uuidv4()}`;
}

export function populateClientFunctionCallId(modelResponseEvent: Event): void {
	const functionCalls = modelResponseEvent.getFunctionCalls?.() || [];
	if (!functionCalls) return;
	for (const functionCall of functionCalls) {
		if (!functionCall.id) {
			functionCall.id = generateClientFunctionCallId();
		}
	}
}

export function removeClientFunctionCallId(content: Content): void {
	if (content?.parts) {
		for (const part of content.parts) {
			if (part.functionCall?.id?.startsWith(AF_FUNCTION_CALL_ID_PREFIX)) {
				part.functionCall.id = undefined;
			}
			if (part.functionResponse?.id?.startsWith(AF_FUNCTION_CALL_ID_PREFIX)) {
				part.functionResponse.id = undefined;
			}
		}
	}
}

export function getLongRunningFunctionCalls(
	functionCalls: FunctionCall[],
	toolsDict: Record<string, BaseTool>,
): Set<string> {
	const longRunningToolIds = new Set<string>();
	for (const functionCall of functionCalls) {
		if (
			functionCall.name in toolsDict &&
			toolsDict[functionCall.name].isLongRunning
		) {
			longRunningToolIds.add(functionCall.id);
		}
	}
	return longRunningToolIds;
}

export function generateAuthEvent(
	invocationContext: InvocationContext,
	functionResponseEvent: Event,
): Event | undefined {
	if (
		!functionResponseEvent.actions ||
		!functionResponseEvent.actions.requestedAuthConfigs
	) {
		return undefined;
	}
	const parts: Part[] = [];
	const longRunningToolIds = new Set<string>();
	for (const [functionCallId, authConfig] of Object.entries(
		functionResponseEvent.actions.requestedAuthConfigs,
	)) {
		const requestEucFunctionCall: FunctionCall = {
			name: REQUEST_EUC_FUNCTION_CALL_NAME,
			args: {
				function_call_id: functionCallId,
				auth_config: authConfig,
			},
		};
		requestEucFunctionCall.id = generateClientFunctionCallId();
		longRunningToolIds.add(requestEucFunctionCall.id);
		parts.push({ functionCall: requestEucFunctionCall });
	}
	return new Event({
		invocationId: invocationContext.invocationId,
		author: invocationContext.agent.name,
		branch: invocationContext.branch,
		content: {
			parts,
			role: functionResponseEvent.content.role,
		},
		longRunningToolIds: longRunningToolIds,
	});
}

export async function handleFunctionCallsAsync(
	invocationContext: InvocationContext,
	functionCallEvent: Event,
	toolsDict: { [name: string]: BaseTool },
	filters?: Set<string>,
): Promise<Event | undefined> {
	const agent = invocationContext.agent;
	// Only process if agent is LlmAgent (type check)
	if (typeof agent.canonicalBeforeAgentCallbacks === "undefined") return;

	const functionCalls = functionCallEvent.getFunctionCalls?.() || [];
	const functionResponseEvents: Event[] = [];
	for (const functionCall of functionCalls) {
		if (filters && !filters.has(functionCall.id)) continue;
		const [tool, toolContext] = getToolAndContext(
			invocationContext,
			functionCallEvent,
			functionCall,
			toolsDict,
		);

		// Tracing span (optional)
		// tracer.startAsCurrentSpan(`execute_tool ${tool.name}`);
		const functionArgs = functionCall.args || {};
		let functionResponse: any = undefined;

		for (const callback of agent.canonicalBeforeAgentCallbacks || []) {
			const ctx = new CallbackContext(invocationContext);
			functionResponse = callback(ctx);
			if (functionResponse instanceof Promise) {
				functionResponse = await functionResponse;
			}
			if (functionResponse) break;
		}

		if (!functionResponse) {
			functionResponse = await callToolAsync(tool, functionArgs, toolContext);
		}

		for (const callback of agent.canonicalAfterAgentCallbacks || []) {
			const ctx = new CallbackContext(invocationContext);
			let alteredFunctionResponse = callback(ctx);
			if (alteredFunctionResponse instanceof Promise) {
				alteredFunctionResponse = await alteredFunctionResponse;
			}
			if (alteredFunctionResponse !== undefined) {
				functionResponse = alteredFunctionResponse;
				break;
			}
		}

		if (tool.isLongRunning && !functionResponse) {
			continue;
		}

		const functionResponseEvent = buildResponseEvent(
			tool,
			functionResponse,
			toolContext,
			invocationContext,
		);
		traceToolCall(tool, functionArgs, functionResponseEvent);
		functionResponseEvents.push(functionResponseEvent);
	}

	if (!functionResponseEvents.length) return undefined;
	const mergedEvent = mergeParallelFunctionResponseEvents(
		functionResponseEvents,
	);

	return mergedEvent;
}

function getToolAndContext(
	invocationContext: InvocationContext,
	functionCallEvent: Event,
	functionCall: FunctionCall,
	toolsDict: Record<string, BaseTool>,
): [BaseTool, ToolContext] {
	if (!(functionCall.name in toolsDict)) {
		throw new Error(
			`Function ${functionCall.name} is not found in the toolsDict.`,
		);
	}
	const toolContext = new ToolContext(invocationContext, {
		functionCallId: functionCall.id,
		eventActions: functionCallEvent.actions,
	});
	const tool = toolsDict[functionCall.name];
	return [tool, toolContext];
}

async function callToolAsync(
	tool: BaseTool,
	args: { [key: string]: any },
	toolContext: ToolContext,
): Promise<any> {
	return await tool.runAsync(args, toolContext);
}

function buildResponseEvent(
	tool: BaseTool,
	functionResult: { [key: string]: any },
	toolContext: ToolContext,
	invocationContext: InvocationContext,
): Event {
	let _functionResult = functionResult;
	// Specs requires the result to be an object.
	if (typeof functionResult !== "object" || functionResult === null) {
		_functionResult = { result: functionResult };
	}
	const functionResponse: Part["functionResponse"] = {
		name: tool.name,
		response: _functionResult,
	};
	functionResponse.id = toolContext.functionCallId;

	const content: Content = {
		role: "user",
		parts: [{ functionResponse }],
	};

	return new Event({
		invocationId: invocationContext.invocationId,
		author: invocationContext.agent.name,
		content,
		actions: toolContext.actions,
		branch: invocationContext.branch,
	});
}

export function mergeParallelFunctionResponseEvents(
	functionResponseEvents: Event[],
): Event {
	if (!functionResponseEvents.length) {
		throw new Error("No function response events provided.");
	}
	if (functionResponseEvents.length === 1) {
		return functionResponseEvents[0];
	}
	const mergedParts: Part[] = [];
	for (const event of functionResponseEvents) {
		if (event.content) {
			for (const part of event.content.parts || []) {
				mergedParts.push(part);
			}
		}
	}
	const baseEvent = functionResponseEvents[0];

	// Merge actions from all events
	const mergedActions = new EventActions();
	const mergedRequestedAuthConfigs: { [key: string]: any } = {};
	for (const event of functionResponseEvents) {
		Object.assign(
			mergedRequestedAuthConfigs,
			event.actions.requestedAuthConfigs,
		);
		Object.assign(mergedActions, event.actions);
	}
	mergedActions.requestedAuthConfigs = mergedRequestedAuthConfigs;

	const mergedEvent = new Event({
		invocationId: Event.newId(),
		author: baseEvent.author,
		branch: baseEvent.branch,
		content: { role: "user", parts: mergedParts },
		actions: mergedActions,
	});
	mergedEvent.timestamp = baseEvent.timestamp;
	return mergedEvent;
}
