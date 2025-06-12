import { Logger } from "@adk/helpers/logger";
import {
	CreateMessageRequestSchema,
	CreateMessageResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Message as ADKMessage } from "../../models/llm-request";
import {
	McpError,
	McpErrorType,
	type SamplingRequest,
	type SamplingResponse,
} from "./types";

/**
 * ADK sampling request format - what we pass to the user's handler
 */
export interface ADKSamplingRequest {
	messages: ADKMessage[];
	systemPrompt?: string;
	modelPreferences?: {
		hints?: Array<{
			name?: string; // Suggested model name/family
		}>;
		costPriority?: number; // 0-1, importance of minimizing cost
		speedPriority?: number; // 0-1, importance of low latency
		intelligencePriority?: number; // 0-1, importance of capabilities
	};
	includeContext?: "none" | "thisServer" | "allServers";
	temperature?: number;
	maxTokens: number;
	stopSequences?: string[];
	metadata?: Record<string, unknown>;
}

/**
 * ADK sampling response format - what we expect from the user's handler
 */
export interface ADKSamplingResponse {
	model: string; // Name of the model used
	stopReason?: "endTurn" | "stopSequence" | "maxTokens" | string;
	content: string | null;
}

/**
 * ADK sampling handler function type - receives ADK formatted messages
 */
export type ADKSamplingHandler = (
	request: ADKSamplingRequest,
) => Promise<ADKSamplingResponse>;

/**
 * MCP Sampling Handler class that handles message format conversion
 * between MCP format and ADK format
 */
export class McpSamplingHandler {
	private logger = new Logger({ name: "McpSamplingHandler" });
	private adkHandler: ADKSamplingHandler;

	constructor(adkHandler: ADKSamplingHandler) {
		this.adkHandler = adkHandler;
	}

	/**
	 * Handle MCP sampling request and convert between formats
	 */
	async handleSamplingRequest(
		request: SamplingRequest,
	): Promise<SamplingResponse> {
		try {
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
			const adkMessages = this.convertMcpMessagesToADK(mcpParams.messages);

			// Prepare ADK request
			const adkRequest: ADKSamplingRequest = {
				messages: adkMessages,
				systemPrompt: mcpParams.systemPrompt,
				modelPreferences: mcpParams.modelPreferences,
				includeContext: mcpParams.includeContext,
				temperature: mcpParams.temperature,
				maxTokens: mcpParams.maxTokens,
				stopSequences: mcpParams.stopSequences,
				metadata: mcpParams.metadata,
			};

			this.logger.debug("Calling ADK sampling handler");

			// Call the ADK handler
			const adkResponse = await this.adkHandler(adkRequest);

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
	private convertMcpMessagesToADK(mcpMessages: any[]): ADKMessage[] {
		return mcpMessages.map((mcpMessage) => {
			// Map MCP role to ADK role - MCP only supports "user" and "assistant"
			const adkRole = mcpMessage.role === "assistant" ? "assistant" : "user";

			// Convert content based on type
			let adkContent: string | Array<any>;

			if (mcpMessage.content.type === "text") {
				// Simple text content
				adkContent = mcpMessage.content.text || "";
			} else if (mcpMessage.content.type === "image") {
				// Multimodal content with image
				const contentParts: Array<any> = [];

				// Add text part if present
				if (mcpMessage.content.text) {
					contentParts.push({
						type: "text",
						text: mcpMessage.content.text,
					});
				}

				// Add image part
				if (mcpMessage.content.data) {
					// Convert base64 data to data URL format expected by ADK
					const mimeType = mcpMessage.content.mimeType || "image/jpeg";
					const dataUrl = `data:${mimeType};base64,${mcpMessage.content.data}`;

					contentParts.push({
						type: "image",
						image_url: {
							url: dataUrl,
						},
					});
				}

				adkContent = contentParts.length > 0 ? contentParts : "";
			} else {
				// Fallback for unknown content types
				this.logger.warn(
					`Unknown MCP content type: ${mcpMessage.content.type}`,
				);
				adkContent = mcpMessage.content.text || "";
			}

			const adkMessage: ADKMessage = {
				role: adkRole,
				content: adkContent,
			};

			this.logger.debug(
				`Converted MCP message - role: ${mcpMessage.role} -> ${adkRole}, content type: ${mcpMessage.content.type}`,
			);

			return adkMessage;
		});
	}

	/**
	 * Convert ADK response to MCP response format
	 */
	private convertADKResponseToMcp(
		adkResponse: ADKSamplingResponse,
	): SamplingResponse {
		// Create MCP response
		const mcpResponse: SamplingResponse = {
			model: adkResponse.model,
			stopReason: adkResponse.stopReason,
			role: "assistant", // ADK responses are always from assistant
			content: {
				type: "text",
				text: adkResponse.content || "",
			},
		};

		this.logger.debug(
			`Converted ADK response - model: ${adkResponse.model}, content length: ${adkResponse.content?.length || 0}`,
		);

		return mcpResponse;
	}

	/**
	 * Update the ADK handler
	 */
	updateHandler(handler: ADKSamplingHandler): void {
		this.adkHandler = handler;
		this.logger.debug("ADK sampling handler updated");
	}
}
