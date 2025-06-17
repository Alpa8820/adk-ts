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
	SemanticAttributes,
} from "@opentelemetry/semantic-conventions";
import type { InvocationContext } from "./agents/invocation-context";
import type { Event } from "./events/event";
import type { LLMRequest } from "./models/llm-request";
import type { LLMResponse } from "./models/llm-response";
import type { BaseTool } from "./tools";

export interface TelemetryConfig {
	appName: string;
	appVersion?: string;
	otlpEndpoint: string;
	otlpHeaders?: Record<string, string>;
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
 * Traces a tool call by adding detailed attributes to the current span.
 * A direct translation of Python's `trace_tool_call`.
 */
export function traceToolCall(
	tool: BaseTool,
	args: Record<string, any>,
	functionResponseEvent: Event, // Assuming your Event type can hold this
) {
	const span = trace.getActiveSpan();
	if (!span) return;

	// Assuming your Event structure is similar enough to extract these details
	const toolCallId =
		functionResponseEvent.tool_calls?.[0]?.id ?? "<not specified>";
	const toolResponse = functionResponseEvent.content ?? "<not specified>";

	span.setAttributes({
		"gen_ai.system.name": "iqai-adk",
		"gen_ai.operation.name": "execute_tool",
		"gen_ai.tool.name": tool.name,
		"gen_ai.tool.description": tool.description,
		"gen_ai.tool.call.id": toolCallId,
		"adk.tool_call_args": _safeJsonStringify(args),
		"adk.event_id": functionResponseEvent.invocationId, // Or a more specific event ID
		"adk.tool_response": _safeJsonStringify(toolResponse),
		// Attributes to satisfy UI expectations, as seen in the Python code
		"adk.llm_request": "{}",
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

	span.setAttributes({
		"adk.system_name": "iqai-adk",
		"adk.request_model": llmRequest.model,
		"adk.invocation_id": invocationContext.sessionId, // Or a more specific invocation ID
		"adk.session_id": invocationContext.sessionId,
		"adk.event_id": eventId,
		"adk.llm_request": _safeJsonStringify(llmRequest), // You might want to prune this
		"adk.llm_response": _safeJsonStringify(llmResponse),
	});
}
