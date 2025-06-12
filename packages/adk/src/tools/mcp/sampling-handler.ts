import { Logger } from "@adk/helpers/logger";
import type { LLMResponse } from "@adk/models";
import {
	CreateMessageRequestSchema,
	CreateMessageResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type {
	Message as ADKMessage,
	LLMRequest,
} from "../../models/llm-request";
import {
	McpError,
	McpErrorType,
	type McpSamplingRequest,
	type McpSamplingResponse,
	type SamplingHandler,
} from "./types";

/**
 * MCP Sampling Handler class that handles message format conversion
 * between MCP format and ADK format
 */
export class McpSamplingHandler {
	private logger = new Logger({ name: "McpSamplingHandler" });
	private samplingHandler: SamplingHandler;

	constructor(samplingHandler: SamplingHandler) {
		this.samplingHandler = samplingHandler;
	}

	/**
	 * Handle MCP sampling request and convert between formats
	 */
	async handleSamplingRequest(
		request: McpSamplingRequest,
	): Promise<McpSamplingResponse> {
		try {
			// Ensure we're only processing sampling/createMessage requests
			if (request.method !== "sampling/createMessage") {
				this.logger.error(
					`Invalid method for sampling handler: ${request.method}. Expected: sampling/createMessage`,
				);
				throw new McpError(
					`Invalid method: ${request.method}. This handler only processes sampling/createMessage requests.`,
					McpErrorType.INVALID_REQUEST_ERROR,
				);
			}

			// Validate the request using MCP schema
			const validationResult = CreateMessageRequestSchema.safeParse(request);

			if (!validationResult.success) {
				this.logger.error(
					"Invalid MCP sampling request:",
					validationResult.error,
				);
				throw new McpError(
					`Invalid sampling request: ${validationResult.error.message}`,
					McpErrorType.INVALID_REQUEST_ERROR,
				);
			}

			const mcpParams = request.params;

			// Validate required fields
			if (!mcpParams.messages || !Array.isArray(mcpParams.messages)) {
				throw new McpError(
					"Invalid sampling request: messages array is required",
					McpErrorType.INVALID_REQUEST_ERROR,
				);
			}

			if (!mcpParams.maxTokens || mcpParams.maxTokens <= 0) {
				throw new McpError(
					"Invalid sampling request: maxTokens must be a positive number",
					McpErrorType.INVALID_REQUEST_ERROR,
				);
			}

			this.logger.debug("Converting MCP request to ADK format");

			// Convert MCP messages to ADK format
			const adkMessages = this.convertMcpMessagesToADK(
				mcpParams.messages,
				mcpParams.systemPrompt,
			);

			// Prepare ADK request
			const adkRequest: LLMRequest = {
				messages: adkMessages,
				config: {
					temperature: mcpParams.temperature,
					max_tokens: mcpParams.maxTokens,
				},
			};

			this.logger.debug("Calling ADK sampling handler");

			// Call the ADK handler
			const adkResponse = await this.samplingHandler(adkRequest);

			this.logger.debug("Converting ADK response to MCP format");

			// Convert ADK response to MCP format
			const mcpResponse = this.convertADKResponseToMcp(adkResponse);

			// Validate the response using MCP schema
			const responseValidation =
				CreateMessageResultSchema.safeParse(mcpResponse);

			if (!responseValidation.success) {
				this.logger.error(
					"Invalid MCP response generated:",
					responseValidation.error,
				);
				throw new McpError(
					`Invalid response generated: ${responseValidation.error.message}`,
					McpErrorType.SAMPLING_ERROR,
				);
			}

			return mcpResponse;
		} catch (error) {
			this.logger.error("Error handling sampling request:", error);

			if (error instanceof McpError) {
				throw error;
			}

			throw new McpError(
				`Sampling request failed: ${error instanceof Error ? error.message : String(error)}`,
				McpErrorType.SAMPLING_ERROR,
				error instanceof Error ? error : undefined,
			);
		}
	}

	/**
	 * Convert MCP messages to ADK message format
	 */
	private convertMcpMessagesToADK(
		mcpMessages: McpSamplingRequest["params"]["messages"],
		systemPrompt: string,
	): ADKMessage[] {
		const transformedMessages = mcpMessages.map((mcpMessage) =>
			this.convertSingleMcpMessageToADK(mcpMessage),
		);

		// Add system prompt at the beginning
		transformedMessages.unshift({
			role: "system",
			content: systemPrompt,
		});

		return transformedMessages;
	}

	/**
	 * Convert a single MCP message to ADK message format
	 */
	private convertSingleMcpMessageToADK(
		mcpMessage: McpSamplingRequest["params"]["messages"][0],
	): ADKMessage {
		// Map MCP role to ADK role - MCP only supports "user" and "assistant"
		const adkRole = mcpMessage.role === "assistant" ? "assistant" : "user";

		// Convert content based on type
		const adkContent = this.convertMcpContentToADK(mcpMessage.content);

		const adkMessage: ADKMessage = {
			role: adkRole,
			content: adkContent,
		};

		this.logger.debug(
			`Converted MCP message - role: ${mcpMessage.role} -> ${adkRole}, content type: ${mcpMessage.content.type}`,
		);

		return adkMessage;
	}

	/**
	 * Convert MCP message content to ADK content format
	 */
	private convertMcpContentToADK(
		mcpContent: McpSamplingRequest["params"]["messages"][0]["content"],
	): string | Array<any> {
		if (mcpContent.type === "text") {
			// Simple text content
			return mcpContent.text || "";
		}

		if (mcpContent.type === "image") {
			// Multimodal content with image
			const contentParts: Array<any> = [];

			// Add text part if present
			if (mcpContent.text) {
				contentParts.push({
					type: "text",
					text: mcpContent.text,
				});
			}

			// Add image part
			if (mcpContent.data) {
				// Convert base64 data to data URL format expected by ADK
				const mimeType = mcpContent.mimeType || "image/jpeg";
				const dataUrl = `data:${mimeType};base64,${mcpContent.data}`;

				contentParts.push({
					type: "image",
					image_url: {
						url: dataUrl,
					},
				});
			}

			return contentParts.length > 0 ? contentParts : "";
		}

		// Fallback for unknown content types
		this.logger.warn(`Unknown MCP content type: ${mcpContent.type}`);
		return mcpContent.data || "";
	}

	/**
	 * Convert ADK response to MCP response format
	 */
	private convertADKResponseToMcp(
		adkResponse: LLMResponse,
	): McpSamplingResponse {
		// Create MCP response
		const mcpResponse: McpSamplingResponse = {
			role: "assistant", // ADK responses are always from assistant
			content: {
				type: "text",
				text: adkResponse.content || "",
			},
		};

		this.logger.debug(`Received content: ${adkResponse.content}`);

		return mcpResponse;
	}

	/**
	 * Update the ADK handler
	 */
	updateHandler(handler: SamplingHandler): void {
		this.samplingHandler = handler;
		this.logger.debug("ADK sampling handler updated");
	}
}

/**
 * Helper function to create a sampling handler with proper TypeScript types.
 *
 * @param handler - Function that handles sampling requests
 * @returns Properly typed ADK sampling handler
 *
 * @example
 * ```typescript
 * import { createSamplingHandler, GoogleLLM, LLMRequest } from "@iqai/adk";
 *
 * const llm = new GoogleLLM("gemini-2.5-flash-preview-05-20");
 *
 * const samplingHandler = createSamplingHandler(async (request) => {
 *   // request is properly typed with all the fields
 *   const llmRequest = new LLMRequest({
 *     messages: request.messages,
 *     config: {
 *       temperature: request.temperature || 0.7,
 *       max_tokens: request.maxTokens,
 *     }
 *   });
 *
 *   const responses = [];
 *   for await (const response of llm.generateContentAsync(llmRequest)) {
 *     responses.push(response);
 *   }
 *
 *   return {
 *     model: llm.model,
 *     content: responses[responses.length - 1].content,
 *     stopReason: "endTurn"
 *   };
 * });
 * ```
 */
export function createSamplingHandler(handler: SamplingHandler) {
	return handler;
}
