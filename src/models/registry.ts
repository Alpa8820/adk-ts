import { AnthropicLLM } from "./anthropic-llm";
import { GoogleLLM } from "./google-llm";
import { LLMRegistry } from "./llm-registry";
import { OpenAILLM } from "./openai-llm";

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
