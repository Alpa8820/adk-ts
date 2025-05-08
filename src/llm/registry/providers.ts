import { AnthropicLLM } from "../providers/anthropic/AnthropicLLM";
import { GoogleLLM } from "../providers/google/GoogleLLM";
import { OpenAILLM } from "../providers/openai/OpenAILLM";
import { LLMRegistry } from "./LLMRegistry";

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
