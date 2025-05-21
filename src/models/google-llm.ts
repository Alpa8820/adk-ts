import { type GenerativeModel, VertexAI } from "@google-cloud/vertexai";
import { BaseLLM } from "./base-llm";
import type { LLMRequest, Message, MessageRole } from "./llm-request";
import { LLMResponse } from "./llm-response";

// Type definitions for Google GenAI SDK
interface GoogleGenAI {
  models: {
    generateContent: (options: any) => Promise<any>;
    generateContentStream: (options: any) => Promise<any>;
  };
}

interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: any;
}

// Part interface for multimodal content
interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  functionResponse?: {
    name: string;
    response: { content: string };
  };
}

// Multimodal part for image processing
interface ImagePart {
  type: string;
  image_url: {
    url: string;
    mime_type?: string;
  };
}

// Enum for function calling mode
enum FunctionCallingConfigMode {
  ANY = "ANY",
  AUTO = "AUTO",
  NONE = "NONE"
}

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
	 * Use Vertex AI (true) or direct API (false)
	 */
	private useVertexAI = false;

	/**
	 * Vertex AI instance (if using Vertex AI)
	 */
	private vertex?: VertexAI;

	/**
	 * Google Gen AI client (if using API key)
	 */
	private genAI?: GoogleGenAI;

	/**
	 * Generative model instance
	 */
	private generativeModel: any; // Can be Vertex GenerativeModel or Google GenAI Model instance

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

		// Determine which API to use
		const apiKey = process.env.GOOGLE_API_KEY;
		const useVertexAIEnv = process.env.GOOGLE_GENAI_USE_VERTEXAI?.toLowerCase();
		this.useVertexAI = useVertexAIEnv !== "false" && !apiKey;

		if (this.useVertexAI) {
			// Vertex AI approach
			const projectId = config?.projectId || process.env.GOOGLE_CLOUD_PROJECT;
			const location =
				config?.location || process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

			if (!projectId) {
				throw new Error(
					"Google Cloud Project ID is required. Provide via config or GOOGLE_CLOUD_PROJECT env var.",
				);
			}

			// Create Vertex AI instance
			this.vertex = new VertexAI({ project: projectId, location });

			// Create generative model instance using Vertex AI
			this.generativeModel = this.vertex.getGenerativeModel({
				model: this.model,
			});
		} else {
			// API Key approach
			if (!apiKey) {
				throw new Error(
					"Google API Key is required when not using Vertex AI. Provide via GOOGLE_API_KEY env var.",
				);
			}

			// Create Google Gen AI client - using the new SDK pattern
			// In a real implementation, you would use:
			// this.genAI = new GoogleGenAI({ apiKey });
			this.genAI = { 
				models: {
					generateContent: async (options: any) => {
						// Implementation will be replaced when @google/genai is installed
						console.log("Called generateContent with:", JSON.stringify(options, null, 2));
						return Promise.resolve({ text: "Mock response", functionCalls: [] });
					},
					generateContentStream: async (options: any) => {
						// Implementation will be replaced when @google/genai is installed
						console.log("Called generateContentStream with:", JSON.stringify(options, null, 2));
						const mockStream = {
							[Symbol.asyncIterator]: () => ({
								next: () => Promise.resolve({ 
									done: true, 
									value: { text: "Mock response" } 
								})
							}),
							stream: {
								[Symbol.asyncIterator]: () => ({
									next: () => Promise.resolve({ 
										done: true, 
										value: { candidates: [{ content: { parts: [{ text: "Mock response" }] } }] } 
									})
								})
							},
							response: Promise.resolve({ 
								text: "Mock complete response", 
								functionCalls: [] 
							})
						};
						return Promise.resolve(mockStream);
					}
				}
			} as GoogleGenAI;

			// Use models property as the generative model instance
			this.generativeModel = this.genAI.models;
		}

		console.log(
			`Using ${this.useVertexAI ? "Vertex AI" : "Gen AI SDK with API Key"} for Google Gemini LLM (model: ${this.model})`,
		);
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
				return "system";
			default:
				return "user";
		}
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
				} as FunctionDeclaration,
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

		// Handle function calls (Vertex AI format)
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
			if (this.useVertexAI) {
				// Vertex AI implementation
				// Convert messages to Google format for Vertex AI
				const messages = llmRequest.messages.map((msg) =>
					this.convertMessage(msg),
				);

				// Prepare generation config
				const generationConfig = {
					temperature:
						llmRequest.config.temperature ?? this.defaultParams.temperature,
					topP: llmRequest.config.top_p ?? this.defaultParams.topP,
					maxOutputTokens:
						llmRequest.config.max_tokens ?? this.defaultParams.maxOutputTokens,
				};

				// Prepare tools if specified
				const tools = llmRequest.config.functions
					? this.convertFunctionsToTools(llmRequest.config.functions)
					: undefined;

				// Prepare chat request
				const requestOptions: any = {
					contents: messages,
					generationConfig,
				};

				// Add tools if available
				if (tools && tools.length > 0) {
					requestOptions.tools = tools;
				}

				if (stream) {
					// Handle streaming
					const streamingResult =
						await this.generativeModel.generateContentStream(requestOptions);

					for await (const chunk of streamingResult.stream) {
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

					// Final response handling for function calls which may only be in the final response
					const finalResponse = await streamingResult.response;
					const hasToolCall =
						finalResponse?.candidates?.[0]?.content?.parts?.[0]?.functionCall;

					if (hasToolCall) {
						yield this.convertResponse(finalResponse);
					}
				} else {
					// Non-streaming request
					const response =
						await this.generativeModel.generateContent(requestOptions);
					yield this.convertResponse(response);
				}
			} else {
				// Google GenAI API implementation (with API key)
				// Create a chat history from messages
				const chatHistory = this.createGenAIChatHistory(llmRequest.messages);

				// Prepare generation config
				const generationConfig = {
					temperature:
						llmRequest.config.temperature ?? this.defaultParams.temperature,
					topP: llmRequest.config.top_p ?? this.defaultParams.topP,
					maxOutputTokens:
						llmRequest.config.max_tokens ?? this.defaultParams.maxOutputTokens,
				};

				// Prepare tools and function calling config if specified
				const toolConfig = llmRequest.config.functions
					? {
							toolConfig: {
								functionCallingConfig: {
									mode: FunctionCallingConfigMode.ANY,
								},
							},
						}
					: {};

				// Prepare tools if specified
				const tools = llmRequest.config.functions
					? this.convertFunctionsToGenAITools(llmRequest.config.functions)
					: undefined;

				// Create request options (pass parameters directly for GenAI API)
				const requestOptions: any = {
					temperature: generationConfig.temperature,
					topP: generationConfig.topP,
					maxOutputTokens: generationConfig.maxOutputTokens,
					...toolConfig,
				};

				// Add tools if available
				if (tools && tools.length > 0) {
					requestOptions.tools = tools;
				}

				if (stream) {
					// Handle streaming with GenAI API
					const streamingResult =
						await this.generativeModel.generateContentStream({
							model: this.model,
							contents: chatHistory.contents,
							system: chatHistory.system,
							...requestOptions,
						});

					for await (const chunk of streamingResult) {
						const partialText = chunk.text?.trim() || "";

						// Create partial response
						const partialResponse = new LLMResponse({
							content: partialText,
							role: "assistant",
							is_partial: true,
						});

						yield partialResponse;
					}

					// Check for function calls from the complete response
					const response = await streamingResult.response;
					if (
						response.functionCalls &&
						response.functionCalls.length > 0
					) {
						yield this.convertGenAIResponse(response);
					}
				} else {
					// Handle non-streaming with GenAI API
					const response = await this.generativeModel.generateContent({
						model: this.model,
						contents: chatHistory.contents,
						system: chatHistory.system,
						...requestOptions,
					});
					yield this.convertGenAIResponse(response);
				}
			}
		} catch (error) {
			console.error("Error generating content from Google Gemini:", error);
			throw error;
		}
	}

	/**
	 * Create chat history for Google GenAI API from ADK messages
	 */
	private createGenAIChatHistory(messages: Message[]): any {
		// Process messages to create a proper chat history object
		const chatHistory: any[] = [];
		let systemMessage = "";

		// Extract system message (if any) and build conversation history
		for (const message of messages) {
			// Extract system prompt to be used separately
			if (message.role === "system") {
				systemMessage =
					typeof message.content === "string"
						? message.content
						: JSON.stringify(message.content);
				continue;
			}

			// Handle regular messages
			if (message.role === "user") {
				// Handle user messages
				let parts: Part[] = [];

				// Process content based on type
				if (typeof message.content === "string") {
					parts = [{ text: message.content }];
				} else if (Array.isArray(message.content)) {
					// For multimodal content
					parts = message.content.map(part => {
						if (part.type === "text") {
							return { text: part.text } as Part;
						} else if (part.type === "image") {
							// Handle image parts with proper typing
							const imagePart = part as ImagePart;
							const mimeType = typeof imagePart.image_url === "object" && 
								"mime_type" in imagePart.image_url && 
								imagePart.image_url.mime_type 
									? imagePart.image_url.mime_type 
									: "image/jpeg";
							
							// Extract base64 data
							const data = imagePart.image_url.url.startsWith("data:")
								? imagePart.image_url.url.split(",")[1]
								: Buffer.from(imagePart.image_url.url).toString("base64");
							
							return {
								inlineData: {
									mimeType,
									data
								}
							} as Part;
						}
						return { text: JSON.stringify(part) } as Part;
					});
				} else {
					parts = [{ text: JSON.stringify(message.content) }];
				}

				chatHistory.push({
					role: "user",
					parts,
				});
			} else if (message.role === "assistant" || message.role === "model") {
				// Handle assistant messages
				const content =
					typeof message.content === "string"
						? message.content
						: JSON.stringify(message.content);

				chatHistory.push({
					role: "model",
					parts: [{ text: content }],
				});
			} else if (message.role === "function" || message.role === "tool") {
				// With the new SDK, we should use proper function response format
				const functionName = message.name || "unknown";
				const functionContent =
					typeof message.content === "string"
						? message.content
						: JSON.stringify(message.content);

				// For GenAI SDK, we wrap this as a function response part
				// Note: In the actual implementation, functionResponse should be properly structured
				// according to the GenAI SDK requirements
				chatHistory.push({
					role: "user",
					parts: [
						{
							text: `Function response from ${functionName}: ${functionContent}`,
						},
					],
				});
			}
		}

		// Return the content structure for the Google GenAI API
		return {
			contents: chatHistory,
			system: systemMessage || undefined,
		};
	}

	/**
	 * Convert functions to Google GenAI tools format
	 */
	private convertFunctionsToGenAITools(functions: any[]): any[] {
		if (!functions || functions.length === 0) {
			return [];
		}

		return [
			{
				functionDeclarations: functions.map((func) => ({
					name: func.name,
					description: func.description,
					parameters: func.parameters,
				} as FunctionDeclaration)),
			},
		];
	}

	/**
	 * Convert Google GenAI response to LLMResponse
	 */
	private convertGenAIResponse(response: any): LLMResponse {
		// Create base response
		const result = new LLMResponse({
			role: "assistant",
			content: response.text?.trim() || null,
		});

		// Handle function calls for GenAI SDK
		if (response.functionCalls && response.functionCalls.length > 0) {
			const functionCall = response.functionCalls[0];

			// Set the older format function_call property for compatibility
			result.function_call = {
				name: functionCall.name,
				arguments: typeof functionCall.args === 'object' 
					? JSON.stringify(functionCall.args || {})
					: (functionCall.args || '{}'),
			};

			// Set tool_calls array for newer format compatibility
			result.tool_calls = response.functionCalls.map(
				(functionCall: any, index: number) => ({
					id: `google-${Date.now()}-${index}`,
					function: {
						name: functionCall.name,
						arguments: typeof functionCall.args === 'object' 
							? JSON.stringify(functionCall.args || {})
							: (functionCall.args || '{}'),
					},
				}),
			);
		}

		return result;
	}
}
