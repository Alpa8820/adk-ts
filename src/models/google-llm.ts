import {
	FunctionCallingConfigMode,
	type FunctionDeclaration,
	GoogleGenAI,
} from "@google/genai";
import { BaseLLM } from "./base-llm";
import type { LLMRequest, Message } from "./llm-request";
import { LLMResponse } from "./llm-response";

// Multimodal part for image processing
interface ImagePart {
	type: string;
	image_url: {
		url: string;
		mime_type?: string;
	};
}

/**
 * Google Gemini LLM configuration
 */
export interface GoogleLLMConfig {
	/**
	 * Google Cloud Project ID (for Vertex AI)
	 */
	projectId?: string;

	/**
	 * Google Cloud location (for Vertex AI)
	 */
	location?: string;

	/**
	 * API version to use (v1, v1beta, v1alpha)
	 */
	apiVersion?: string;

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
 * Result of message conversion for Google GenAI
 */
interface ConvertedMessages {
	contents: any[];
	systemInstruction?: string;
}

/**
 * Google Gemini LLM implementation using @google/genai SDK
 */
export class GoogleLLM extends BaseLLM {
	/**
	 * Google Generative AI client
	 */
	private genAI: GoogleGenAI;

	/**
	 * Default parameters for requests
	 */
	private defaultParams: Record<string, any>;

	/**
	 * Constructor for GoogleLLM
	 */
	constructor(model: string, config?: GoogleLLMConfig) {
		super(model);

		// Store default parameters
		this.defaultParams = {
			temperature: config?.defaultParams?.temperature ?? 0.7,
			topP: config?.defaultParams?.top_p ?? 1,
			maxOutputTokens: config?.defaultParams?.maxOutputTokens ?? 1024,
		};

		// Determine which API to use (Vertex AI or direct Gemini API)
		const apiKey = process.env.GOOGLE_API_KEY;
		const useVertexAI =
			process.env.GOOGLE_GENAI_USE_VERTEXAI?.toLowerCase() !== "false" &&
			!apiKey;

		if (useVertexAI) {
			// Vertex AI approach
			const projectId = config?.projectId || process.env.GOOGLE_CLOUD_PROJECT;
			const location =
				config?.location || process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

			if (!projectId) {
				throw new Error(
					"Google Cloud Project ID is required for Vertex AI. Provide via config or GOOGLE_CLOUD_PROJECT env var.",
				);
			}

			// Initialize with Vertex AI settings
			this.genAI = new GoogleGenAI({
				vertexai: true,
				project: projectId,
				location: location,
				apiVersion: config?.apiVersion || "v1beta", // Default to v1beta for newer features
			});
		} else {
			// API Key approach
			if (!apiKey) {
				throw new Error(
					"Google API Key is required when not using Vertex AI. Provide via GOOGLE_API_KEY env var.",
				);
			}

			// Initialize with API key
			this.genAI = new GoogleGenAI({
				apiKey: apiKey,
				apiVersion: config?.apiVersion || "v1beta", // Default to v1beta for newer features
			});
		}
	}

	/**
	 * Returns a list of supported models in regex for LLMRegistry
	 */
	static supportedModels(): string[] {
		return [
			// Gemini models
			"gemini-*",
			// Fine-tuned vertex endpoint pattern
			"projects/*/locations/*/endpoints/*",
			// Vertex gemini long name
			"projects/*/locations/*/publishers/google/models/gemini*",
		];
	}

	/**
	 * Convert ADK messages to Google GenAI format
	 */
	private convertMessages(messages: Message[]): ConvertedMessages {
		const contents: any[] = [];
		let systemMessage: string | null = null;

		// First pass: extract system message if present
		for (const message of messages) {
			if (message.role === "system") {
				systemMessage =
					typeof message.content === "string"
						? message.content
						: JSON.stringify(message.content);
				break;
			}
		}

		// Second pass: convert all non-system messages
		for (const message of messages) {
			// Skip system messages as they're handled separately
			if (message.role === "system") continue;

			// Handle user messages
			if (message.role === "user") {
				const parts: any[] = [];

				// Process content based on type
				if (typeof message.content === "string") {
					parts.push({ text: message.content });
				} else if (Array.isArray(message.content)) {
					// For multimodal content
					for (const part of message.content) {
						if (part.type === "text") {
							parts.push({ text: part.text });
						} else if (part.type === "image") {
							// Handle image parts
							const imagePart = part as ImagePart;
							const mimeType =
								typeof imagePart.image_url === "object" &&
								"mime_type" in imagePart.image_url &&
								imagePart.image_url.mime_type
									? imagePart.image_url.mime_type
									: "image/jpeg";

							// Extract base64 data
							const data = imagePart.image_url.url.startsWith("data:")
								? imagePart.image_url.url.split(",")[1]
								: Buffer.from(imagePart.image_url.url).toString("base64");

							parts.push({
								inlineData: {
									mimeType,
									data,
								},
							});
						}
					}
				}

				contents.push({
					role: "user",
					parts,
				});
			} else if (message.role === "assistant" || message.role === "model") {
				// Handle assistant messages
				const content =
					typeof message.content === "string"
						? message.content
						: JSON.stringify(message.content);

				contents.push({
					role: "model",
					parts: [{ text: content }],
				});
			} else if (message.role === "function" || message.role === "tool") {
				// For function/tool responses
				const functionName = message.name || "unknown";
				const functionContent =
					typeof message.content === "string"
						? message.content
						: JSON.stringify(message.content);

				// Add as a user message with functionResponse
				contents.push({
					role: "user",
					parts: [
						{
							functionResponse: {
								name: functionName,
								response: { content: functionContent },
							},
						},
					],
				});
			}
		}

		return {
			contents,
			systemInstruction: systemMessage || undefined,
		};
	}

	/**
	 * Convert functions to Google GenAI function declarations
	 */
	private convertFunctionsToDeclarations(
		functions: any[],
	): FunctionDeclaration[] {
		if (!functions || functions.length === 0) {
			return [];
		}

		return functions.map((func) => ({
			name: func.name,
			description: func.description || "",
			parameters: func.parameters || {},
		}));
	}

	/**
	 * Convert Google GenAI response to LLMResponse
	 */
	private convertResponse(response: any): LLMResponse {
		// Create base response
		const result = new LLMResponse({
			role: "assistant",
			content: response.text?.trim() || null,
		});

		// Handle function calls
		if (response.functionCalls && response.functionCalls.length > 0) {
			const functionCall = response.functionCalls[0];

			result.function_call = {
				name: functionCall.name,
				arguments:
					typeof functionCall.args === "object"
						? JSON.stringify(functionCall.args || {})
						: functionCall.args || "{}",
			};

			// Set tool_calls array for newer format
			result.tool_calls = response.functionCalls.map(
				(functionCall: any, index: number) => ({
					id: `google-${Date.now()}-${index}`,
					function: {
						name: functionCall.name,
						arguments:
							typeof functionCall.args === "object"
								? JSON.stringify(functionCall.args || {})
								: functionCall.args || "{}",
					},
				}),
			);
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
			// Convert messages to Google GenAI format
			const { contents, systemInstruction } = this.convertMessages(
				llmRequest.messages,
			);

			// Prepare generation config
			const generationConfig = {
				temperature:
					llmRequest.config.temperature ?? this.defaultParams.temperature,
				topP: llmRequest.config.top_p ?? this.defaultParams.topP,
				maxOutputTokens:
					llmRequest.config.max_tokens ?? this.defaultParams.maxOutputTokens,
			};

			// Prepare request options
			const requestOptions: any = {
				model: this.model,
				contents,
				systemInstruction,
				...generationConfig,
			};

			// Add function calling config if functions are provided
			if (
				llmRequest.config.functions &&
				llmRequest.config.functions.length > 0
			) {
				const functionDeclarations = this.convertFunctionsToDeclarations(
					llmRequest.config.functions,
				);

				requestOptions.config = {
					toolConfig: {
						functionCallingConfig: {
							mode: FunctionCallingConfigMode.ANY,
							allowedFunctionNames: functionDeclarations.map((fn) => fn.name),
						},
					},
					tools: [
						{
							functionDeclarations,
						},
					],
				};
			}

			if (stream) {
				// Handle streaming
				const streamingResult =
					await this.genAI.models.generateContentStream(requestOptions);

				// Process the stream chunks
				for await (const chunk of streamingResult) {
					if (chunk.text) {
						const partialText = chunk.text.trim() || "";

						// Create partial response
						const partialResponse = new LLMResponse({
							content: partialText,
							role: "assistant",
							is_partial: true,
						});

						yield partialResponse;
					}
				}

				// For function calls, we need to get the final response
				// The SDK doesn't expose a direct way to get the final response from a stream
				// So we'll make a non-streaming request to check for function calls
				if (
					llmRequest.config.functions &&
					llmRequest.config.functions.length > 0
				) {
					const finalResponse =
						await this.genAI.models.generateContent(requestOptions);
					if (
						finalResponse.functionCalls &&
						finalResponse.functionCalls.length > 0
					) {
						yield this.convertResponse(finalResponse);
					}
				}
			} else {
				// Non-streaming request
				const response =
					await this.genAI.models.generateContent(requestOptions);
				yield this.convertResponse(response);
			}
		} catch (error) {
			console.error("GoogleLLM generation error:", error);
			throw error;
		}
	}
}
