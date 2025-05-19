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
	abstract generateContentAsync(
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
		throw new Error(`Live connection is not supported for ${this.model}`);
	}
}
