import {
	DiagConsoleLogger,
	DiagLogLevel,
	type Tracer,
	diag,
	trace,
} from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import type { InvocationContext } from "./agents/invocation-context";
import type { Event } from "./events/event";
import type {
	ImageContent,
	LLMRequest,
	MessageContent,
	TextContent,
} from "./models/llm-request";
import type { LLMResponse } from "./models/llm-response";
import type { BaseTool } from "./tools";

export interface TelemetryConfig {
	appName: string;
	appVersion?: string;
	otlpEndpoint: string;
	otlpHeaders?: Record<string, string>;
	environment?: string;
}

let sdk: NodeSDK | null = null;
let isInitialized = false;

export const tracer: Tracer = trace.getTracer("iqai-adk", "0.1.0");

export function initializeTelemetry(config: TelemetryConfig): void {
	if (isInitialized) {
		diag.warn("Telemetry is already initialized. Skipping.");
		return;
	}
	diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

	const resource = resourceFromAttributes({
		[ATTR_SERVICE_NAME]: config.appName,
		[ATTR_SERVICE_VERSION]: config.appVersion,
	});

	const traceExporter = new OTLPTraceExporter({
		url: config.otlpEndpoint,
		headers: config.otlpHeaders,
	});

	sdk = new NodeSDK({
		resource,
		traceExporter,
		instrumentations: [getNodeAutoInstrumentations()],
	});

	try {
		sdk.start();
		isInitialized = true;
		diag.info("OpenTelemetry SDK started successfully.");
	} catch (error) {
		diag.error("Error starting OpenTelemetry SDK:", error);
	}
}

export async function shutdownTelemetry(): Promise<void> {
	if (sdk) {
		await sdk
			.shutdown()
			.then(() => diag.info("Telemetry terminated successfully."))
			.catch((error) => diag.error("Error terminating telemetry", error));
	}
}

// --- Span-Enriching Helper Functions (The Direct Translation) ---

function _safeJsonStringify(obj: any): string {
	try {
		// The 'default' handler is not standard in JSON.stringify,
		// so we use a replacer to handle complex objects if needed,
		// or just catch the error for simplicity.
		return JSON.stringify(obj);
	} catch (e) {
		return "<not serializable>";
	}
}

/**
 * Builds a dictionary representation of the LLM request for tracing.
 *
 * This function prepares a dictionary representation of the LLMRequest
 * object, suitable for inclusion in a trace. It excludes fields that cannot
 * be serialized (e.g., function pointers) and avoids sending binary data.
 *
 * @param llmRequest - The LLMRequest object.
 * @returns A dictionary representation of the LLM request.
 */
function _buildLlmRequestForTrace(llmRequest: LLMRequest): Record<string, any> {
	// Some fields in LLMRequest are function pointers and cannot be serialized.
	const result: Record<string, any> = {
		model: llmRequest.model,
		config: {
			// Exclude non-serializable fields like response_schema if they exist
			...llmRequest.config,
			// Remove any function references or other non-serializable properties
			functions: llmRequest.config.functions?.map((func) => ({
				name: func.name,
				description: func.description,
				parameters: func.parameters,
				// Exclude any function implementation details
			})),
		},
		messages: [],
	};

	// Filter out binary data and non-serializable content from messages
	for (const message of llmRequest.messages) {
		const filteredMessage: Record<string, any> = {
			role: message.role,
			content: _filterMessageContent(message.content),
		};

		// Include optional fields if they exist
		if (message.name) {
			filteredMessage.name = message.name;
		}
		if (message.function_call) {
			filteredMessage.function_call = message.function_call;
		}
		if (message.tool_calls) {
			filteredMessage.tool_calls = message.tool_calls;
		}
		if (message.tool_call_id) {
			filteredMessage.tool_call_id = message.tool_call_id;
		}

		result.messages.push(filteredMessage);
	}

	return result;
}

/**
 * Filters message content to exclude binary data and non-serializable content.
 *
 * @param content - The message content to filter.
 * @returns Filtered message content safe for serialization.
 */
function _filterMessageContent(content: MessageContent): any {
	if (typeof content === "string") {
		return content;
	}

	if (Array.isArray(content)) {
		return content
			.filter((item) => _isSerializableContent(item))
			.map((item) => _sanitizeContentItem(item));
	}

	if (_isSerializableContent(content)) {
		return _sanitizeContentItem(content);
	}

	return "<filtered content>";
}

/**
 * Checks if a content item is serializable (not binary data).
 *
 * @param content - The content item to check.
 * @returns True if the content is serializable.
 */
function _isSerializableContent(content: TextContent | ImageContent): boolean {
	// For now, we'll include both text and image content
	// In the future, you might want to exclude certain image types or large images
	return content.type === "text" || content.type === "image";
}

/**
 * Sanitizes a content item for safe serialization.
 *
 * @param content - The content item to sanitize.
 * @returns Sanitized content item.
 */
function _sanitizeContentItem(content: TextContent | ImageContent): any {
	if (content.type === "text") {
		return {
			type: content.type,
			text: content.text,
		};
	}

	if (content.type === "image") {
		return {
			type: content.type,
			image_url: {
				url: content.image_url.url,
			},
		};
	}

	return content;
}

/**
 * Traces a tool call by adding detailed attributes to the current span.
 * A direct translation of Python's `trace_tool_call`.
 */
export function traceToolCall(
	tool: BaseTool,
	args: Record<string, any>,
	functionResponseEvent: Event,
	llmRequest?: LLMRequest, // Optional LLM request that led to this tool call
	invocationContext?: InvocationContext,
) {
	const span = trace.getActiveSpan();
	if (!span) return;

	const toolCallId =
		functionResponseEvent.tool_calls?.[0]?.id ?? "<not specified>";
	const toolResponse = functionResponseEvent.content ?? "<not specified>";

	span.setAttributes({
		"gen_ai.system.name": "iqai-adk",
		"gen_ai.operation.name": "execute_tool",
		"gen_ai.tool.name": tool.name,
		"gen_ai.tool.description": tool.description,
		"gen_ai.tool.call.id": toolCallId,

		// Session and user tracking
		...(invocationContext && {
			"session.id": invocationContext.sessionId,
			"user.id": invocationContext.userId,
		}),

		// Environment
		...(process.env.NODE_ENV && {
			"deployment.environment.name": process.env.NODE_ENV,
		}),

		// Tool-specific data
		"adk.tool_call_args": _safeJsonStringify(args),
		"adk.event_id": functionResponseEvent.invocationId,
		"adk.tool_response": _safeJsonStringify(toolResponse),
		"adk.llm_request": llmRequest
			? _safeJsonStringify(_buildLlmRequestForTrace(llmRequest))
			: "{}",
		"adk.llm_response": "{}",
	});
}

/**
 * Traces a call to the LLM by adding detailed attributes to the current span.
 * A direct translation of Python's `trace_call_llm`.
 */
export function traceLlmCall(
	invocationContext: InvocationContext,
	eventId: string,
	llmRequest: LLMRequest,
	llmResponse: LLMResponse,
) {
	const span = trace.getActiveSpan();
	if (!span) return;

	const requestData = _buildLlmRequestForTrace(llmRequest);

	span.setAttributes({
		// Standard OpenTelemetry attributes
		"gen_ai.system.name": "iqai-adk",
		"gen_ai.operation.name": "generate",
		"gen_ai.request.model": llmRequest.model,

		// Session and user tracking (maps to Langfuse sessionId, userId)
		"session.id": invocationContext.sessionId,
		"user.id": invocationContext.userId,

		// Environment (maps to Langfuse environment)
		...(process.env.NODE_ENV && {
			"deployment.environment.name": process.env.NODE_ENV,
		}),

		// Model parameters (maps to Langfuse modelParameters)
		"gen_ai.request.max_tokens": llmRequest.config.max_tokens || 0,
		"gen_ai.request.temperature": llmRequest.config.temperature || 0,
		"gen_ai.request.top_p": llmRequest.config.top_p || 0,

		// Legacy ADK attributes (keep for backward compatibility)
		"adk.system_name": "iqai-adk",
		"adk.request_model": llmRequest.model,
		"adk.invocation_id": invocationContext.sessionId,
		"adk.session_id": invocationContext.sessionId,
		"adk.event_id": eventId,
		"adk.llm_request": _safeJsonStringify(requestData),
		"adk.llm_response": _safeJsonStringify(llmResponse),
	});

	// Add input/output as events (preferred over deprecated attributes)
	span.addEvent("gen_ai.content.prompt", {
		"gen_ai.prompt": _safeJsonStringify(requestData.messages),
	});

	span.addEvent("gen_ai.content.completion", {
		"gen_ai.completion": _safeJsonStringify(llmResponse.content || ""),
	});
}
