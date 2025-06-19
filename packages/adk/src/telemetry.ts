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

/**
 * Telemetry service for the ADK
 * Handles OpenTelemetry initialization, tracing, and cleanup
 */
export class TelemetryService {
	private sdk: NodeSDK | null = null;
	private isInitialized = false;
	private tracer: Tracer;
	private config: TelemetryConfig | null = null;

	constructor() {
		// Initialize tracer with default values - will be updated when initialize() is called
		this.tracer = trace.getTracer("iqai-adk", "0.1.0");
	}

	/**
	 * Initialize telemetry with the provided configuration
	 */
	initialize(config: TelemetryConfig): void {
		if (this.isInitialized) {
			diag.warn("Telemetry is already initialized. Skipping.");
			return;
		}

		this.config = config;
		diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

		const resource = resourceFromAttributes({
			[ATTR_SERVICE_NAME]: config.appName,
			[ATTR_SERVICE_VERSION]: config.appVersion,
		});

		const traceExporter = new OTLPTraceExporter({
			url: config.otlpEndpoint,
			headers: config.otlpHeaders,
		});

		this.sdk = new NodeSDK({
			resource,
			traceExporter,
			instrumentations: [getNodeAutoInstrumentations()],
		});

		try {
			this.sdk.start();
			this.isInitialized = true;
			// Update tracer with actual config
			this.tracer = trace.getTracer("iqai-adk", config.appVersion || "0.1.0");
			diag.info("OpenTelemetry SDK started successfully.");
		} catch (error) {
			diag.error("Error starting OpenTelemetry SDK:", error);
			throw error;
		}
	}

	/**
	 * Get the tracer instance
	 */
	getTracer(): Tracer {
		return this.tracer;
	}

	/**
	 * Check if telemetry is initialized
	 */
	get initialized(): boolean {
		return this.isInitialized;
	}

	/**
	 * Get the current configuration
	 */
	getConfig(): TelemetryConfig | null {
		return this.config;
	}

	/**
	 * Shutdown telemetry with optional timeout
	 */
	async shutdown(timeoutMs = 5000): Promise<void> {
		if (!this.sdk || !this.isInitialized) {
			diag.warn("Telemetry is not initialized or already shut down.");
			return;
		}

		try {
			// Create a timeout promise
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(
					() =>
						reject(
							new Error(`Telemetry shutdown timeout after ${timeoutMs}ms`),
						),
					timeoutMs,
				);
			});

			// Race between shutdown and timeout
			await Promise.race([this.sdk.shutdown(), timeoutPromise]);

			this.isInitialized = false;
			diag.info("Telemetry terminated successfully.");
		} catch (error) {
			if (error instanceof Error && error.message.includes("timeout")) {
				diag.warn("Telemetry shutdown timed out, some traces may be lost");
			} else {
				diag.error("Error terminating telemetry:", error);
			}
			throw error;
		} finally {
			this.sdk = null;
		}
	}

	/**
	 * Traces a tool call by adding detailed attributes to the current span.
	 */
	traceToolCall(
		tool: BaseTool,
		args: Record<string, any>,
		functionResponseEvent: Event,
		llmRequest?: LLMRequest,
		invocationContext?: InvocationContext,
	): void {
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
			"adk.tool_call_args": this._safeJsonStringify(args),
			"adk.event_id": functionResponseEvent.invocationId,
			"adk.tool_response": this._safeJsonStringify(toolResponse),
			"adk.llm_request": llmRequest
				? this._safeJsonStringify(this._buildLlmRequestForTrace(llmRequest))
				: "{}",
			"adk.llm_response": "{}",
		});
	}

	/**
	 * Traces a call to the LLM by adding detailed attributes to the current span.
	 */
	traceLlmCall(
		invocationContext: InvocationContext,
		eventId: string,
		llmRequest: LLMRequest,
		llmResponse: LLMResponse,
	): void {
		const span = trace.getActiveSpan();
		if (!span) return;

		const requestData = this._buildLlmRequestForTrace(llmRequest);

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
			"adk.llm_request": this._safeJsonStringify(requestData),
			"adk.llm_response": this._safeJsonStringify(llmResponse),
		});

		// Add input/output as events (preferred over deprecated attributes)
		span.addEvent("gen_ai.content.prompt", {
			"gen_ai.prompt": this._safeJsonStringify(requestData.messages),
		});

		span.addEvent("gen_ai.content.completion", {
			"gen_ai.completion": this._safeJsonStringify(llmResponse.content || ""),
		});
	}

	// --- Private Helper Methods ---

	private _safeJsonStringify(obj: any): string {
		try {
			return JSON.stringify(obj);
		} catch (e) {
			return "<not serializable>";
		}
	}

	/**
	 * Builds a dictionary representation of the LLM request for tracing.
	 */
	private _buildLlmRequestForTrace(
		llmRequest: LLMRequest,
	): Record<string, any> {
		const result: Record<string, any> = {
			model: llmRequest.model,
			config: {
				...llmRequest.config,
				functions: llmRequest.config.functions?.map((func) => ({
					name: func.name,
					description: func.description,
					parameters: func.parameters,
				})),
			},
			messages: [],
		};

		// Filter out binary data and non-serializable content from messages
		for (const message of llmRequest.messages) {
			const filteredMessage: Record<string, any> = {
				role: message.role,
				content: this._filterMessageContent(message.content),
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
	 */
	private _filterMessageContent(content: MessageContent): any {
		if (typeof content === "string") {
			return content;
		}

		if (Array.isArray(content)) {
			return content
				.filter((item) => this._isSerializableContent(item))
				.map((item) => this._sanitizeContentItem(item));
		}

		if (this._isSerializableContent(content)) {
			return this._sanitizeContentItem(content);
		}

		return "<filtered content>";
	}

	/**
	 * Checks if a content item is serializable (not binary data).
	 */
	private _isSerializableContent(content: TextContent | ImageContent): boolean {
		return content.type === "text" || content.type === "image";
	}

	/**
	 * Sanitizes a content item for safe serialization.
	 */
	private _sanitizeContentItem(content: TextContent | ImageContent): any {
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
}

// Global singleton instance for backward compatibility
export const telemetryService = new TelemetryService();

// Backward compatibility exports
export const tracer = telemetryService.getTracer();
export const initializeTelemetry = (config: TelemetryConfig) =>
	telemetryService.initialize(config);
export const shutdownTelemetry = (timeoutMs?: number) =>
	telemetryService.shutdown(timeoutMs);
export const traceToolCall = (
	tool: BaseTool,
	args: Record<string, any>,
	functionResponseEvent: Event,
	llmRequest?: LLMRequest,
	invocationContext?: InvocationContext,
) =>
	telemetryService.traceToolCall(
		tool,
		args,
		functionResponseEvent,
		llmRequest,
		invocationContext,
	);
export const traceLlmCall = (
	invocationContext: InvocationContext,
	eventId: string,
	llmRequest: LLMRequest,
	llmResponse: LLMResponse,
) =>
	telemetryService.traceLlmCall(
		invocationContext,
		eventId,
		llmRequest,
		llmResponse,
	);
