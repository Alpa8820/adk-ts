import { BaseLLM } from "../../../models/base-llm";
import type { LLMRequest } from "../../../models/llm-request";
import type { LLMResponse } from "../../../models/llm-response";

/**
 * LiteLLM implementation for ADK
 * Placeholder implementation that will be replaced with actual implementation
 */
export class LiteLLM extends BaseLLM {
  constructor(model: string) {
    super(model);
  }

  /**
   * Returns a list of supported models in regex for LLMRegistry
   */
  static supportedModels(): string[] {
    return [];
  }

  /**
   * Generates content from the given request
   * This is a placeholder implementation
   */
  async *generateContentAsync(
    _llmRequest: LLMRequest,
    _stream = false
  ): AsyncGenerator<LLMResponse, void, unknown> {
    throw new Error("LiteLLM is not implemented yet");
  }
}

// Default export for easier importing
export default LiteLLM;