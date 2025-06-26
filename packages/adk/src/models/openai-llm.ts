import { Logger } from "@adk/helpers/logger";
import OpenAI from "openai";
import { BaseLlm } from "./base-llm";
import type { BaseLLMConnection } from "./base-llm-connection";
import { LlmRequest } from "./llm-request";
import { LlmResponse } from "./llm-response";

const logger = new Logger({ name: "OpenAiLlm" });

type OpenAIRole = "user" | "assistant" | "system";

/**
 * Convert ADK role to OpenAI role format
 */
function toOpenAiRole(role?: string): OpenAIRole {
	if (role === "model") {
		return "assistant";
	}
	if (role === "system") {
		return "system";
	}
	return "user";
}

/**
 * Convert OpenAI finish reason to ADK finish reason
 */
function toAdkFinishReason(
	openaiFinishReason?: string,
): "STOP" | "MAX_TOKENS" | "FINISH_REASON_UNSPECIFIED" {
	switch (openaiFinishReason) {
		case "stop":
		case "tool_calls":
			return "STOP";
		case "length":
			return "MAX_TOKENS";
		default:
			return "FINISH_REASON_UNSPECIFIED";
	}
}
/**
 * Convert ADK Part to OpenAI message content
 */
function partToOpenAiContent(part: any): OpenAI.ChatCompletionContentPart {
	if (part.text) {
		return {
			type: "text",
			text: part.text,
		};
	}

	if (part.inline_data?.mime_type && part.inline_data?.data) {
		return {
			type: "image_url",
			image_url: {
				url: `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`,
			},
		};
	}

	throw new Error("Unsupported part type for OpenAI conversion");
}

/**
 * Convert ADK Content to OpenAI ChatCompletionMessage
 */
function contentToOpenAiMessage(
	content: any,
): OpenAI.ChatCompletionMessageParam {
	const role = toOpenAiRole(content.role);

	if (role === "system") {
		return {
			role: "system",
			content: content.parts?.[0]?.text || "",
		};
	}

	// Handle function calls
	if (content.parts?.some((part: any) => part.functionCall)) {
		const functionCallPart = content.parts.find(
			(part: any) => part.functionCall,
		);
		return {
			role: "assistant",
			tool_calls: [
				{
					id: functionCallPart.functionCall.id || "",
					type: "function",
					function: {
						name: functionCallPart.functionCall.name,
						arguments: JSON.stringify(functionCallPart.functionCall.args || {}),
					},
				},
			],
		};
	}

	// Handle function responses
	if (content.parts?.some((part: any) => part.functionResponse)) {
		const functionResponsePart = content.parts.find(
			(part: any) => part.functionResponse,
		);
		return {
			role: "tool",
			tool_call_id: functionResponsePart.functionResponse.id || "",
			content: JSON.stringify(
				functionResponsePart.functionResponse.response || {},
			),
		};
	}

	// Handle regular content
	if (content.parts?.length === 1 && content.parts[0].text) {
		return {
			role,
			content: content.parts[0].text,
		};
	}

	// Handle multi-part content
	return {
		role,
		content: (content.parts || []).map(partToOpenAiContent),
	};
}

/**
 * Convert OpenAI message to ADK LlmResponse
 */
function openAiMessageToLlmResponse(
	choice: OpenAI.ChatCompletion.Choice,
	usage?: OpenAI.CompletionUsage,
): LlmResponse {
	const message = choice.message;
	logger.debug("OpenAI response:", JSON.stringify({ message, usage }, null, 2));

	const parts: any[] = [];

	// Handle text content
	if (message.content) {
		parts.push({ text: message.content });
	}

	// Handle tool calls
	if (message.tool_calls) {
		for (const toolCall of message.tool_calls) {
			if (toolCall.type === "function") {
				parts.push({
					functionCall: {
						id: toolCall.id,
						name: toolCall.function.name,
						args: JSON.parse(toolCall.function.arguments || "{}"),
					},
				});
			}
		}
	}

	return new LlmResponse({
		content: {
			role: "model",
			parts,
		},
		usageMetadata: usage
			? {
					promptTokenCount: usage.prompt_tokens,
					candidatesTokenCount: usage.completion_tokens,
					totalTokenCount: usage.total_tokens,
				}
			: undefined,
		finishReason: toAdkFinishReason(choice.finish_reason),
	});
}

/**
 * Convert ADK function declaration to OpenAI tool
 */
function functionDeclarationToOpenAiTool(
	functionDeclaration: any,
): OpenAI.ChatCompletionTool {
	return {
		type: "function",
		function: {
			name: functionDeclaration.name,
			description: functionDeclaration.description || "",
			parameters: functionDeclaration.parameters || {},
		},
	};
}

/**
 * OpenAI LLM implementation using GPT models
 */
export class OpenAiLlm extends BaseLlm {
	private _client?: OpenAI;

	/**
	 * Constructor for OpenAI LLM
	 */
	constructor(model = "gpt-4o-mini") {
		super(model);
	}

	/**
	 * Provides the list of supported models
	 */
	static override supportedModels(): string[] {
		return ["gpt-3.5-.*", "gpt-4.*", "gpt-4o.*", "o1-.*", "o3-.*"];
	}

	protected async *generateContentAsyncImpl(
		llmRequest: LlmRequest,
		stream = false,
	): AsyncGenerator<LlmResponse, void, unknown> {
		logger.debug(
			`Sending OpenAI request, model: ${llmRequest.model || this.model}, stream: ${stream}`,
		);

		const model = llmRequest.model || this.model;
		const messages = (llmRequest.contents || []).map(contentToOpenAiMessage);

		let tools: OpenAI.ChatCompletionTool[] | undefined;
		if ((llmRequest.config?.tools?.[0] as any)?.functionDeclarations) {
			tools = (llmRequest.config.tools[0] as any).functionDeclarations.map(
				functionDeclarationToOpenAiTool,
			);
		}

		// Add system instruction as first message if provided
		const systemContent = llmRequest.getSystemInstructionText();
		if (systemContent) {
			messages.unshift({
				role: "system",
				content: systemContent,
			});
		}

		const openAiMessages: OpenAI.ChatCompletionMessageParam[] = messages.map(
			(msg) => {
				// For text-based messages, extract text content
				// For complex content (images, etc.), keep the array format
				let content: string | OpenAI.ChatCompletionContentPart[];

				if (Array.isArray(msg.content)) {
					// Already processed content parts - keep as is for multimodal
					content = msg.content as OpenAI.ChatCompletionContentPart[];
				} else {
					// Extract text from Content type
					content = LlmRequest.extractTextFromContent(msg.content);
				}

				return {
					...msg,
					content,
				} as OpenAI.ChatCompletionMessageParam;
			},
		);
		const requestParams:
			| OpenAI.ChatCompletionCreateParamsNonStreaming
			| OpenAI.ChatCompletionCreateParamsStreaming = {
			model,
			messages: openAiMessages,
			tools,
			tool_choice: tools ? "auto" : undefined,
			max_tokens: llmRequest.config?.maxOutputTokens,
			temperature: llmRequest.config?.temperature,
			top_p: llmRequest.config?.topP,
			stream,
		};

		if (stream) {
			const streamResponse = await this.client.chat.completions.create({
				...requestParams,
				stream: true,
			});

			let accumulatedContent = "";
			const accumulatedToolCalls: OpenAI.ChatCompletionChunk.Choice.Delta.ToolCall[] =
				[];
			let usage: OpenAI.CompletionUsage | undefined;

			for await (const chunk of streamResponse) {
				const choice = chunk.choices[0];
				if (!choice) continue;

				const delta = choice.delta;
				console.log("Delta:", delta.content);
				// Accumulate content
				if (delta.content) {
					accumulatedContent += delta.content;

					// Yield partial response
					yield new LlmResponse({
						content: {
							role: "model",
							parts: [{ text: accumulatedContent }],
						},
						partial: true,
					});
				}

				// Handle tool calls
				if (delta.tool_calls) {
					for (const toolCall of delta.tool_calls) {
						const index = toolCall.index || 0;
						if (!accumulatedToolCalls[index]) {
							accumulatedToolCalls[index] = {
								index,
								id: toolCall.id || "",
								type: "function",
								function: { name: "", arguments: "" },
							};
						}

						if (toolCall.function?.name) {
							accumulatedToolCalls[index].function!.name +=
								toolCall.function.name;
						}
						if (toolCall.function?.arguments) {
							accumulatedToolCalls[index].function!.arguments +=
								toolCall.function.arguments;
						}
					}
				}

				// Track usage from final chunk
				if (chunk.usage) {
					usage = chunk.usage;
				}

				// Final response
				if (choice.finish_reason) {
					const parts: any[] = [];

					if (accumulatedContent) {
						parts.push({ text: accumulatedContent });
					}

					if (accumulatedToolCalls.length > 0) {
						for (const toolCall of accumulatedToolCalls) {
							if (toolCall.function?.name) {
								parts.push({
									functionCall: {
										id: toolCall.id,
										name: toolCall.function.name,
										args: JSON.parse(toolCall.function.arguments || "{}"),
									},
								});
							}
						}
					}

					yield new LlmResponse({
						content: {
							role: "model",
							parts,
						},
						usageMetadata: usage
							? {
									promptTokenCount: usage.prompt_tokens,
									candidatesTokenCount: usage.completion_tokens,
									totalTokenCount: usage.total_tokens,
								}
							: undefined,
						finishReason: toAdkFinishReason(choice.finish_reason),
					});
				}
			}
		} else {
			const response = await this.client.chat.completions.create({
				...requestParams,
				stream: false,
			});

			const choice = response.choices[0];
			if (choice) {
				yield openAiMessageToLlmResponse(choice, response.usage);
			}
		}
	}

	/**
	 * Gets the OpenAI client
	 */
	private get client(): OpenAI {
		if (!this._client) {
			const apiKey = process.env.OPENAI_API_KEY;

			if (!apiKey) {
				throw new Error(
					"OPENAI_API_KEY environment variable is required for OpenAI models",
				);
			}

			this._client = new OpenAI({
				apiKey,
			});
		}
		return this._client;
	}

	/**
	 * Live connection is not supported for OpenAI models
	 */
	override connect(_llmRequest: LlmRequest): BaseLLMConnection {
		throw new Error(`Live connection is not supported for ${this.model}.`);
	}
}
