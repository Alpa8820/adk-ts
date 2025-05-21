import { BaseLLMConnection } from "./base-llm-connection";
import type { LLMRequest, Message } from "./llm-request";
import type { ToolCall } from "./llm-response";
import { LLMResponse } from "./llm-response";

/**
 * The Gemini model connection
 */
export class GeminiLLMConnection extends BaseLLMConnection {
	/**
	 * The Gemini session
	 */
	private _geminiSession: any; // Using any temporarily - would need actual typing from Google's library

	/**
	 * Current model to use
	 */
	private model: string;

	/**
	 * Current messages in the conversation
	 */
	private messages: any[] = [];

	/**
	 * Default parameters for requests
	 */
	private defaultParams: Record<string, any>;

	/**
	 * Response callback
	 */
	private responseCallback?: (response: LLMResponse) => void;

	/**
	 * Error callback
	 */
	private errorCallback?: (error: Error) => void;

	/**
	 * End callback
	 */
	private endCallback?: () => void;

	/**
	 * Constructor for GeminiLLMConnection
	 */
	constructor(
		geminiSession: any,
		model: string,
		initialRequest: LLMRequest,
		defaultParams: Record<string, any>,
	) {
		super();
		this._geminiSession = geminiSession;
		this.model = model;
		this.defaultParams = defaultParams;

		// Initialize messages from initial request if provided
		if (initialRequest?.messages) {
			this.messages = this.convertMessages(initialRequest.messages);
		}
	}

	/**
	 * Converts ADK messages to Gemini format
	 */
	private convertMessages(messages: Message[]): any[] {
		return messages.map((message) => {
			let role: string;
			switch (message.role) {
				case "user":
					role = "user";
					break;
				case "assistant":
					role = "model";
					break;
				case "system":
					role = "system";
					break;
				case "function":
				case "tool":
					// Handle function messages
					return {
						role: "function",
						parts: [
							{
								function_response: {
									name: message.name,
									response:
										typeof message.content === "string"
											? { content: message.content }
											: message.content,
								},
							},
						],
					};
				default:
					role = "user";
			}

			// Handle content based on type
			if (typeof message.content === "string") {
				return {
					role,
					parts: [{ text: message.content }],
				};
			}

			if (Array.isArray(message.content)) {
				// Convert multimodal content
				const parts = message.content.map((item) => {
					if (item.type === "text") {
						return { text: item.text };
					}

					if (item.type === "image") {
						return {
							inline_data: {
								mime_type: "image/jpeg", // Default
								data: item.image_url.url.startsWith("data:")
									? item.image_url.url.split(",")[1]
									: item.image_url.url,
							},
						};
					}

					return { text: JSON.stringify(item) };
				});

				return { role, parts };
			}

			// Default for complex objects
			return {
				role,
				parts: [{ text: JSON.stringify(message.content) }],
			};
		});
	}

	/**
	 * Adds a tool result to the conversation history
	 *
	 * @param toolCallId The ID of the tool call
	 * @param content The result content
	 */
	addToolResult(toolCallId: string, content: string): void {
		this.messages.push({
			role: "function",
			parts: [
				{
					function_response: {
						tool_call_id: toolCallId,
						response: { content },
					},
				},
			],
		});
	}

	/**
	 * Sends a message to the LLM
	 *
	 * @param message The message to send
	 */
	async send(message: string): Promise<void> {
		if (!this.isActive) {
			if (this.errorCallback) {
				this.errorCallback(new Error("Connection is not active"));
			}
			return;
		}

		try {
			// Add the new message to the history
			const userMessage = {
				role: "user",
				parts: [{ text: message }],
			};
			this.messages.push(userMessage);

			// Send the message to Gemini
			await this._geminiSession?.send({
				input: {
					turns: this.messages,
					turn_complete: true,
				},
			});

			// Start processing the response
			this.processResponse();
		} catch (error) {
			if (this.errorCallback) {
				this.errorCallback(
					error instanceof Error ? error : new Error(String(error)),
				);
			}
		}
	}

	/**
	 * Process the model response
	 */
	private async processResponse(): Promise<void> {
		try {
			const generator = await this.receive();
			let finalResponse: LLMResponse | null = null;
			let fullText = "";

			// Process all responses
			for await (const response of generator) {
				// Send partial responses through callback
				if (this.responseCallback) {
					this.responseCallback(response);
				}

				// Accumulate text from non-partial responses
				if (response.content && !response.is_partial) {
					fullText += response.content;
				}

				// Keep track of the last non-partial response with tool calls
				if (!response.is_partial && (response.tool_calls || response.content)) {
					finalResponse = response;
				}
			}

			// If we got a tool call response, store it in the history
			if (finalResponse?.tool_calls) {
				this.messages.push({
					role: "model",
					parts: finalResponse.tool_calls.map((call) => ({
						function_call: {
							name: call.function.name,
							args: JSON.parse(call.function.arguments || "{}"),
						},
					})),
				});
			}
			// Otherwise store text response
			else if (fullText) {
				this.messages.push({
					role: "model",
					parts: [{ text: fullText }],
				});
			}

			// Signal completion
			if (this.endCallback) {
				this.endCallback();
			}
		} catch (error) {
			if (this.errorCallback) {
				this.errorCallback(
					error instanceof Error ? error : new Error(String(error)),
				);
			}
		}
	}

	/**
	 * Sends a conversation history to the Gemini model
	 *
	 * @param history The conversation history to send
	 */
	/**
	 * Set the entire conversation history (useful for agent handoffs)
	 *
	 * @param messages The messages to set as history
	 */
	setConversationHistory(messages: Message[]): void {
		this.messages = this.convertMessages(messages);
	}

	/**
	 * Sends tool results to the model
	 *
	 * @param toolResults Array of tool results to send
	 */
	async sendToolResults(
		toolResults: Array<{ id: string; result: string }>,
	): Promise<void> {
		if (!this.isActive) {
			if (this.errorCallback) {
				this.errorCallback(new Error("Connection is not active"));
			}
			return;
		}

		try {
			// Add each tool result to the message history
			for (const result of toolResults) {
				this.addToolResult(result.id, result.result);
			}

			// Send all messages to Gemini
			await this._geminiSession?.send({
				input: {
					turns: this.messages,
					turn_complete: true,
				},
			});

			// Process the response
			this.processResponse();
		} catch (error) {
			if (this.errorCallback) {
				this.errorCallback(
					error instanceof Error ? error : new Error(String(error)),
				);
			}
		}
	}

	/**
	 * Sends a chunk of audio or a frame of video to the model in realtime
	 *
	 * @param blob The blob to send to the model
	 */
	async sendRealtime(blob: any): Promise<void> {
		if (!this.isActive) {
			if (this.errorCallback) {
				this.errorCallback(new Error("Connection is not active"));
			}
			return;
		}

		try {
			const inputBlob = blob.model_dump ? blob.model_dump() : blob;
			await this._geminiSession?.send({ input: inputBlob });
		} catch (error) {
			if (this.errorCallback) {
				this.errorCallback(
					error instanceof Error ? error : new Error(String(error)),
				);
			}
		}
	}

	/**
	 * Builds a full text response
	 *
	 * @param text The text to be included in the response
	 * @returns An LLMResponse containing the full text
	 */
	private buildFullTextResponse(text: string): LLMResponse {
		return new LLMResponse({
			role: "assistant",
			content: text,
		});
	}

	/**
	 * Handles responses from the LLM
	 *
	 * @param callback The callback to handle responses
	 */
	onResponse(callback: (response: LLMResponse) => void): void {
		this.responseCallback = callback;
	}

	/**
	 * Handles errors from the LLM
	 *
	 * @param callback The callback to handle errors
	 */
	onError(callback: (error: Error) => void): void {
		this.errorCallback = callback;
	}

	/**
	 * Handles the end of the connection
	 *
	 * @param callback The callback to handle the end
	 */
	onEnd(callback: () => void): void {
		this.endCallback = callback;
	}

	/**
	 * Receives the model response
	 *
	 * @returns An async generator yielding LLM responses
	 */
	async receive(): Promise<AsyncGenerator<LLMResponse, void, unknown>> {
		return this._receiveImpl();
	}

	/**
	 * Implementation of the receive method
	 */
	private async *_receiveImpl(): AsyncGenerator<LLMResponse, void, unknown> {
		let text = "";

		try {
			for await (const message of this._geminiSession?.receive() || []) {
				if (message?.server_content) {
					const content = message.server_content?.model_turn;
					if (content?.parts) {
						const llmResponse = new LLMResponse({
							role: "assistant",
							raw_response: message.server_content,
							is_partial: true,
						});

						if (content.parts[0]?.text) {
							text += content.parts[0].text;
							llmResponse.content = content.parts[0].text;
						}
						// Don't yield merged text when receiving non-text data
						else if (text && !content.parts[0]?.inline_data) {
							yield this.buildFullTextResponse(text);
							text = "";
						}

						yield llmResponse;
					}

					// Handle user transcriptions
					if (message.server_content?.input_transcription?.text) {
						const userText = message.server_content?.input_transcription?.text;
						yield new LLMResponse({
							role: "user",
							content: userText,
						});
					}

					// Handle output transcriptions
					if (message.server_content?.output_transcription?.text) {
						text += message.server_content?.output_transcription?.text || "";
						yield new LLMResponse({
							role: "assistant",
							content: message.server_content?.output_transcription?.text || "",
							is_partial: true,
						});
					}

					// If turn complete, yield the full text and end
					if (message.server_content?.turn_complete) {
						if (text) {
							yield this.buildFullTextResponse(text);
							text = "";
						}

						yield new LLMResponse({
							role: "assistant",
							raw_response: { turn_complete: true },
						});
						break;
					}

					// Handle interruptions
					if (message.server_content?.interrupted && text) {
						yield this.buildFullTextResponse(text);
						text = "";
					}

					yield new LLMResponse({
						role: "assistant",
						raw_response: { interrupted: message.server_content?.interrupted },
					});
				}

				// Handle tool calls
				if (message?.tool_call) {
					if (text) {
						yield this.buildFullTextResponse(text);
						text = "";
					}

					const toolCalls: ToolCall[] = message.tool_call?.function_calls?.map(
						(functionCall: any, index: number) => ({
							id: `google-gemini-${Date.now()}-${index}`,
							function: {
								name: functionCall?.name,
								arguments: JSON.stringify(functionCall?.args || {}),
							},
						}),
					);

					yield new LLMResponse({
						role: "assistant",
						tool_calls: toolCalls,
					});
				}
			}
		} catch (error) {
			console.error("Error in GeminiLLMConnection receive:", error);
			throw error;
		}
	}

	/**
	 * Closes the connection
	 */
	override async close(): Promise<void> {
		super.close();
		// Close the gemini session
		await this._geminiSession?.close();
	}
}
