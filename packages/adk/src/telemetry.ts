import {
	DiagConsoleLogger,
	DiagLogLevel,
	type Tracer,
	diag,
	trace,
} from "@opentelemetry/api";
import type { Context } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import type {
	ReadableSpan,
	SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
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
	enableConsoleLogging?: boolean; // New option to enable/disable console logging
}

// Custom span processor to log traces to console
class ConsoleLoggingSpanProcessor implements SpanProcessor {
	forceFlush(): Promise<void> {
		return Promise.resolve();
	}

	onStart(span: ReadableSpan, parentContext: Context): void {
		// Optional: log when spans start
	}

	onEnd(span: ReadableSpan): void {
		console.log("🔍 ADK Trace Export:", {
			traceId: span.spanContext().traceId,
			spanId: span.spanContext().spanId,
			name: span.name,
			kind: span.kind,
			status: span.status,
			attributes: span.attributes,
			events: span.events,
			duration: `${(span.endTime[0] - span.startTime[0]) * 1000 + (span.endTime[1] - span.startTime[1]) / 1000000}ms`,
			startTime: new Date(
				span.startTime[0] * 1000 + span.startTime[1] / 1000000,
			).toISOString(),
			endTime: new Date(
				span.endTime[0] * 1000 + span.endTime[1] / 1000000,
			).toISOString(),
		});
	}

	shutdown(): Promise<void> {
		console.log("🛑 ADK Console logging span processor shutdown");
		return Promise.resolve();
	}
}

let sdk: NodeSDK | null = null;
let isInitialized = false;

export const tracer: Tracer = trace.getTracer(
	"iqai-adk", // Your framework's instrumentation name
	"0.1.0", // Your framework's version
);

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

	// Create span processors
	const spanProcessors: SpanProcessor[] = [
		new BatchSpanProcessor(traceExporter),
	];

	// Add console logging processor if enabled
	if (config.enableConsoleLogging !== false) {
		// Default to true
		console.log("🚀 ADK Telemetry: Console logging enabled for traces");
		spanProcessors.push(new ConsoleLoggingSpanProcessor());
	}

	sdk = new NodeSDK({
		resource,
		traceExporter,
		spanProcessors,
		instrumentations: [getNodeAutoInstrumentations()],
	});

	try {
		sdk.start();
		isInitialized = true;
		diag.info("OpenTelemetry SDK started successfully.");
		console.log("✅ ADK Telemetry initialized:", {
			appName: config.appName,
			appVersion: config.appVersion,
			otlpEndpoint: config.otlpEndpoint,
			consoleLogging: config.enableConsoleLogging !== false,
		});
	} catch (error) {
		diag.error("Error starting OpenTelemetry SDK:", error);
		console.error("❌ ADK Telemetry initialization failed:", error);
	}
}

export async function shutdownTelemetry(): Promise<void> {
	if (sdk) {
		await sdk
			.shutdown()
			.then(() => {
				diag.info("Telemetry terminated successfully.");
				console.log("🛑 ADK Telemetry shutdown successfully");
			})
			.catch((error) => {
				diag.error("Error terminating telemetry", error);
				console.error("❌ ADK Telemetry shutdown failed:", error);
			});
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
) {
	const span = trace.getActiveSpan();
	if (!span) {
		console.warn("🔍 ADK Telemetry: No active span found for tool call trace");
		return;
	}

	// Assuming your Event structure is similar enough to extract these details
	const toolCallId =
		functionResponseEvent.tool_calls?.[0]?.id ?? "<not specified>";
	const toolResponse = functionResponseEvent.content ?? "<not specified>";

	const attributes = {
		"gen_ai.system.name": "iqai-adk",
		"gen_ai.operation.name": "execute_tool",
		"gen_ai.tool.name": tool.name,
		"gen_ai.tool.description": tool.description,
		"gen_ai.tool.call.id": toolCallId,
		"adk.tool_call_args": _safeJsonStringify(args),
		"adk.event_id": functionResponseEvent.invocationId,
		"adk.tool_response": _safeJsonStringify(toolResponse),
		"adk.llm_request": llmRequest
			? _safeJsonStringify(_buildLlmRequestForTrace(llmRequest))
			: "{}",
		"adk.llm_response": "{}",
	};

	span.setAttributes(attributes);

	console.log("🔧 ADK Tool Call Traced:", {
		toolName: tool.name,
		toolCallId,
		attributes: Object.keys(attributes),
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
	if (!span) {
		console.warn("🔍 ADK Telemetry: No active span found for LLM call trace");
		return;
	}

	const attributes = {
		"adk.system_name": "iqai-adk",
		"adk.request_model": llmRequest.model,
		"adk.invocation_id": invocationContext.sessionId, // Or a more specific invocation ID
		"adk.session_id": invocationContext.sessionId,
		"adk.event_id": eventId,
		"adk.llm_request": _safeJsonStringify(_buildLlmRequestForTrace(llmRequest)),
		"adk.llm_response": _safeJsonStringify(llmResponse),
	};

	span.setAttributes(attributes);

	console.log("🤖 ADK LLM Call Traced:", {
		model: llmRequest.model,
		sessionId: invocationContext.sessionId,
		eventId,
		attributes: Object.keys(attributes),
	});
}
