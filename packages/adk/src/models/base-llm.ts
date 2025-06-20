import type { BaseLLMConnection } from "./base-llm-connection";
import type { LlmRequest } from "./llm-request";
import type { LlmResponse } from "./llm-response";

/**
 * The BaseLLM class.
 */
export abstract class BaseLLM {
	/**
	 * The name of the LLM, e.g. gemini-1.5-flash or gemini-1.5-flash-001.
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
	 * Generates one content from the given contents and tools.
	 *
	 * @param llmRequest LlmRequest, the request to send to the LLM.
	 * @param stream bool = false, whether to do streaming call.
	 * @returns a generator of LlmResponse.
	 *
	 * For non-streaming call, it will only yield one LlmResponse.
	 *
	 * For streaming call, it may yield more than one response, but all yielded
	 * responses should be treated as one response by merging the
	 * parts list.
	 */
	abstract generateContentAsync(
		llmRequest: LlmRequest,
		stream?: boolean,
	): AsyncGenerator<LlmResponse, void, unknown>;

	/**
	 * Appends a user content, so that model can continue to output.
	 *
	 * @param llmRequest LlmRequest, the request to send to the LLM.
	 */
	protected maybeAppendUserContent(llmRequest: LlmRequest): void {
		// If no content is provided, append a user content to hint model response
		// using system instruction.
		if (!llmRequest.contents || llmRequest.contents.length === 0) {
			llmRequest.contents = llmRequest.contents || [];
			llmRequest.contents.push({
				role: "user",
				parts: [
					{
						text: "Handle the requests as specified in the System Instruction.",
					},
				],
			});
			return;
		}

		// Insert a user content to preserve user intent and to avoid empty
		// model response.
		if (llmRequest.contents[llmRequest.contents.length - 1].role !== "user") {
			llmRequest.contents.push({
				role: "user",
				parts: [
					{
						text: "Continue processing previous requests as instructed. Exit or provide a summary if no more outputs are needed.",
					},
				],
			});
		}
	}

	/**
	 * Creates a live connection to the LLM.
	 *
	 * @param llmRequest LlmRequest, the request to send to the LLM.
	 * @returns BaseLLMConnection, the connection to the LLM.
	 */
	connect(llmRequest: LlmRequest): BaseLLMConnection {
		throw new Error(`Live connection is not supported for ${this.model}.`);
	}
}
