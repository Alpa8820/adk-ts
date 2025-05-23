import {
	type GenerateContentConfig,
	type GenerateContentParameters,
	GoogleGenAI,
	type GoogleGenAIOptions,
} from "@google/genai";
import { BaseLLM } from "./base-llm";
import type { LLMRequest, Message, MessageRole } from "./llm-request";
import { LLMResponse } from "./llm-response";

/**
 * Google Gemini LLM configuration
 */
export interface GoogleLLMConfig {
	/**
	 * Google Cloud Project ID (can be provided via GOOGLE_CLOUD_PROJECT env var)
	 */
	projectId?: string;

	/**
	 * Google Cloud location (can be provided via GOOGLE_CLOUD_LOCATION env var)
	 */
	location?: string;

	/**
	 * Default model parameters
	 */
	defaultParams?: {
		/**
		 * Temperature for generation
		 */
		temperature?: number;

		/**
		 * Top-p for generation
		 */
		top_p?: number;

		/**
		 * Maximum tokens to generate
		 */
		maxOutputTokens?: number;
	};
}

/**
 * Google Gemini LLM implementation
 */
export class GoogleLLM extends BaseLLM {
	/**
	 * Generative model instance
	 */
	private ai: GoogleGenAI;

	/**
	 * Default parameters for requests
	 */
	private defaultParams: Record<string, any>;

	/**
	 * Constructor for GoogleLLM
	 */
	constructor(model: string, config?: GoogleLLMConfig) {
		super(model);

		// Get configuration from environment or passed config
		const apiKey = process.env.GOOGLE_API_KEY;

		// Get vertex configuration from environment or passed config
		const projectId = config?.projectId || process.env.GOOGLE_CLOUD_PROJECT;
		const location = config?.location || process.env.GOOGLE_CLOUD_LOCATION;
		const useVertexAI = process.env.USE_VERTEX_AI?.toLowerCase() === "true";

		// Validate configurations
		if (!useVertexAI && !apiKey) {
			throw new Error(
				"Google API Key is required. Provide via config or GOOGLE_API_KEY env var.",
			);
		}

		if (useVertexAI && (!projectId || !location)) {
			throw new Error(
				"Google Cloud Project ID and Location are required when using Vertex AI.",
			);
		}

		// Prepare options based on authentication method
		let options: GoogleGenAIOptions;

		if (useVertexAI) {
			options = {
				vertexai: true,
				project: projectId,
				location,
			};
		} else {
			options = {
				apiKey,
			};
		}

		// Create Google GenAI instance
		this.ai = new GoogleGenAI(options);

		// Store default parameters with fallbacks
		this.defaultParams = {
			temperature: config?.defaultParams?.temperature ?? 0.7,
			topP: config?.defaultParams?.top_p ?? 1,
			maxOutputTokens: config?.defaultParams?.maxOutputTokens ?? 1024,
		};
	}

	/**
	 * Returns a list of supported models in regex for LLMRegistry
	 */
	static supportedModels(): string[] {
		return [
			// Gemini models
			"gemini-.*",
		];
	}

	/**
	 * Convert a message to Google Vertex AI format
	 */
	private convertMessage(message: Message): any {
		// Base content as empty string, will be populated based on message type
		let content: any = "";

		// Handle multimodal content
		if (Array.isArray(message.content)) {
			// Create parts array for multimodal content
			const parts: any[] = [];

			for (const part of message.content) {
				if (part.type === "text") {
					parts.push({ text: part.text });
				} else if (part.type === "image") {
					parts.push({
						inlineData: {
							mimeType:
								typeof part.image_url === "object" &&
								"mime_type" in part.image_url
									? part.image_url.mime_type
									: "image/jpeg",
							data: part.image_url.url.startsWith("data:")
								? part.image_url.url.split(",")[1] // Handle base64 data URLs
								: Buffer.from(part.image_url.url).toString("base64"), // Convert URL to base64
						},
					});
				}
			}

			content = parts;
		} else if (typeof message.content === "string") {
			content = message.content;
		}

		// Map to Google format
		const role = this.mapRole(message.role);

		return {
			role,
			parts: Array.isArray(content) ? content : [{ text: content }],
		};
	}

	/**
	 * Map ADK role to Google role
	 */
	private mapRole(role: MessageRole): string {
		switch (role) {
			case "user":
				return "user";
			case "assistant":
			case "function":
			case "tool":
			case "model":
				return "model";
			case "system":
				return "user"; // Map system to user as we'll handle system messages separately
			default:
				return "user";
		}
	}

	/**
	 * Extract system message from messages array
	 */
	private extractSystemMessage(messages: Message[]): {
		systemMessage: string | null;
		filteredMessages: Message[];
	} {
		const systemMessages = messages.filter((msg) => msg.role === "system");
		const filteredMessages = messages.filter((msg) => msg.role !== "system");

		// Combine all system messages into one if there are multiple
		let systemMessage: string | null = null;
		if (systemMessages.length > 0) {
			systemMessage = systemMessages
				.map((msg) =>
					typeof msg.content === "string"
						? msg.content
						: JSON.stringify(msg.content),
				)
				.join("\n");
		}

		return { systemMessage, filteredMessages };
	}

	/**
	 * Convert functions to Google function declarations
	 */
	private convertFunctionsToTools(functions: any[]): any[] {
		if (!functions || functions.length === 0) {
			return [];
		}

		return functions.map((func) => ({
			functionDeclarations: [
				{
					name: func.name,
					description: func.description,
					parameters: func.parameters,
				},
			],
		}));
	}

	/**
	 * Convert Google response to LLMResponse
	 */
	private convertResponse(response: any): LLMResponse {
		// Create base response
		const result = new LLMResponse({
			role: "assistant",
			content: null,
		});

		// Extract text content
		if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
			result.content = response.candidates[0].content.parts[0].text;
		}

		// Handle function calls
		if (response?.candidates?.[0]?.content?.parts?.[0]?.functionCall) {
			const functionCall = response.candidates[0].content.parts[0].functionCall;

			result.function_call = {
				name: functionCall.name,
				arguments: JSON.stringify(functionCall.args || {}),
			};

			// Set tool_calls array too for newer format
			result.tool_calls = [
				{
					id: `google-${Date.now()}`,
					function: {
						name: functionCall.name,
						arguments: JSON.stringify(functionCall.args || {}),
					},
				},
			];
		}

		return result;
	}

	/**
	 * Generates content from the given request
	 */
	async *generateContentAsync(
		llmRequest: LLMRequest,
		stream = false,
	): AsyncGenerator<LLMResponse, void, unknown> {
		try {
			// Extract system message and filter it out from regular messages
			const { systemMessage, filteredMessages } = this.extractSystemMessage(
				llmRequest.messages,
			);

			// Convert remaining messages to Google format
			const messages = filteredMessages.map((msg) => this.convertMessage(msg));

			// Prepare generation config
			const generationConfig: GenerateContentConfig = {
				temperature:
					llmRequest.config.temperature ?? this.defaultParams.temperature,
				topP: llmRequest.config.top_p ?? this.defaultParams.topP,
				maxOutputTokens:
					llmRequest.config.max_tokens ?? this.defaultParams.maxOutputTokens,
				systemInstruction: systemMessage
					? {
							parts: [{ text: systemMessage }],
						}
					: undefined,
			};

			// Prepare tools if specified
			const tools = llmRequest.config.functions
				? this.convertFunctionsToTools(llmRequest.config.functions)
				: undefined;

			// Prepare chat request
			const requestOptions: GenerateContentParameters = {
				contents: messages,
				config: generationConfig,
				model: this.model,
			};

			// Add tools if available
			if (tools && tools.length > 0 && requestOptions.config) {
				requestOptions.config.tools = tools;
			}

			if (stream) {
				// Handle streaming
				const streamingResult =
					await this.ai.models.generateContentStream(requestOptions);

				for await (const chunk of streamingResult) {
					if (!chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
						continue;
					}
					const partialText =
						chunk.candidates[0]?.content?.parts[0]?.text || "";

					// Create partial response
					const partialResponse = new LLMResponse({
						content: partialText,
						role: "assistant",
						is_partial: true,
					});

					yield partialResponse;
				}
			} else {
				// Non-streaming request
				const response = await this.ai.models.generateContent(requestOptions);
				yield this.convertResponse(response);
			}
		} catch (error) {
			console.error("Error generating content from Google Gemini:", error);
			throw error;
		}
	}
}
