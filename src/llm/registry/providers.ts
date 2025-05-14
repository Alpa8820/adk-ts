import { AnthropicLLM } from "../providers/anthropic/anthropic-llm";
import { GoogleLLM } from "../providers/google/google-llm";
import { OpenAILLM } from "../providers/openai/openai-llm";
import { LLMRegistry } from "./llm-registry";

/**
 * Register all LLM providers
 */
export function registerProviders(): void {
	// Register OpenAI models
	LLMRegistry.registerLLM(OpenAILLM);

	// Register Anthropic models
	LLMRegistry.registerLLM(AnthropicLLM);

	// Register Google models
	LLMRegistry.registerLLM(GoogleLLM);
}

// Auto-register all providers
registerProviders();
