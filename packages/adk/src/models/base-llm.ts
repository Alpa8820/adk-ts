import { tracer } from "../telemetry";
import type { BaseLLMConnection } from "./base-llm-connection";
import type { LLMRequest } from "./llm-request";
import type { LLMResponse } from "./llm-response";

/**
 * Base class for all LLM implementations
 */
export abstract class BaseLLM {
	/**
	 * The name of the LLM model
	 */
	model: string;

	/**
	 * Constructor for BaseLLM
	 */
	constructor(model: string) {
		this.model = model;
	}

	/**
	 * Returns a list of supported models in regex for LLMRegistry
	 */
	static supportedModels(): string[] {
		return [];
	}

	/**
	 * Generates content from the given request
	 *
	 * @param llmRequest The request to send to the LLM
	 * @param stream Whether to do streaming call
	 * @returns A generator of LLMResponses
	 */
	async *generateContentAsync(
		llmRequest: LLMRequest,
		stream?: boolean,
	): AsyncGenerator<LLMResponse, void, unknown> {
		yield* tracer.startActiveSpan(
			`llm_generate [${this.model}]`,
			async function* (span) {
				try {
					span.setAttributes({
						"gen_ai.system.name": "iqai-adk",
						"gen_ai.operation.name": "generate",
						"gen_ai.request.model": this.model,
						"gen_ai.request.max_tokens": llmRequest.config.max_tokens || 0,
						"gen_ai.request.temperature": llmRequest.config.temperature || 0,
						"gen_ai.request.top_p": llmRequest.config.top_p || 0,
						"adk.llm_request": JSON.stringify({
							model: llmRequest.model,
							messages: llmRequest.messages.map((msg) => ({
								role: msg.role,
								content:
									typeof msg.content === "string"
										? msg.content
										: "[complex_content]",
							})),
							config: {
								...llmRequest.config,
								functions: llmRequest.config.functions?.map((f) => f.name),
							},
						}),
						"adk.streaming": stream || false,
					});

					console.log("🤖 ADK LLM Request:", {
						model: this.model,
						messageCount: llmRequest.messages.length,
						streaming: stream || false,
						config: llmRequest.config,
					});

					let responseCount = 0;
					let totalTokens = 0;

					for await (const response of this.generateContentAsyncImpl(
						llmRequest,
						stream,
					)) {
						responseCount++;

						// Log each response chunk
						console.log(`🤖 ADK LLM Response ${responseCount}:`, {
							model: this.model,
							content:
								typeof response.content === "string"
									? response.content.substring(0, 200) +
										(response.content.length > 200 ? "..." : "")
									: "[complex_content]",
							finishReason: response.finish_reason,
							usage: response.usage,
						});

						// Update span attributes with response info
						if (response.usage) {
							totalTokens += response.usage.total_tokens || 0;
							span.setAttributes({
								"gen_ai.response.finish_reasons": [
									response.finish_reason || "unknown",
								],
								"gen_ai.usage.input_tokens": response.usage.prompt_tokens || 0,
								"gen_ai.usage.output_tokens":
									response.usage.completion_tokens || 0,
								"gen_ai.usage.total_tokens": response.usage.total_tokens || 0,
							});
						}

						yield response;
					}

					span.setAttributes({
						"adk.response_count": responseCount,
						"adk.total_tokens": totalTokens,
					});
				} catch (error) {
					span.recordException(error as Error);
					span.setStatus({ code: 2, message: (error as Error).message });
					console.error("❌ ADK LLM Error:", {
						model: this.model,
						error: (error as Error).message,
					});
					throw error;
				} finally {
					span.end();
				}
			}.bind(this),
		);
	}

	/**
	 * Implementation method to be overridden by subclasses
	 * This replaces the abstract generateContentAsync method
	 */
	protected abstract generateContentAsyncImpl(
		llmRequest: LLMRequest,
		stream?: boolean,
	): AsyncGenerator<LLMResponse, void, unknown>;

	/**
	 * Creates a live connection to the LLM
	 *
	 * @param llmRequest The request to send to the LLM
	 * @returns BaseLLMConnection, the connection to the LLM
	 */
	connect(llmRequest: LLMRequest): BaseLLMConnection {
		return tracer.startActiveSpan(`llm_connect [${this.model}]`, (span) => {
			try {
				span.setAttributes({
					"gen_ai.system.name": "iqai-adk",
					"gen_ai.operation.name": "connect",
					"gen_ai.request.model": this.model,
				});

				throw new Error(`Live connection is not supported for ${this.model}`);
			} catch (error) {
				span.recordException(error as Error);
				span.setStatus({ code: 2, message: (error as Error).message });
				throw error;
			} finally {
				span.end();
			}
		});
	}
}
