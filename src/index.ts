/**
 * Agent Development Kit (ADK) for TypeScript
 * A framework for building AI agents with multi-provider LLM support
 */

// Agent Exports - Main entry point for most users
export { Agent } from "./agents/llm-agent";
export type { AgentConfig } from "./agents/llm-agent";

// Specialized Agents
export { SequentialAgent } from "./agents/specialized/sequential-agent";
export { ParallelAgent } from "./agents/specialized/parallel-agent";
export { LoopAgent } from "./agents/specialized/loop-agent";
export { LangGraphAgent } from "./agents/specialized/lang-graph-agent";

// Base Classes - For extending the framework
export { BaseAgent } from "./agents/base-agent";
export { BaseTool } from "./tools/base/base-tool";
export { BaseLLM } from "./llm/base-llm";
export { BaseLLMConnection } from "./llm/base-llm-connection";
export type { ToolConfig } from "./tools/base/base-tool";

// Core LLM Infrastructure
export { LLMRegistry } from "./llm/registry/llm-registry";

// LLM Providers - Direct access to specific providers
export { OpenAILLM } from "./llm/providers/openai/openai-llm";
export { AnthropicLLM } from "./llm/providers/anthropic/anthropic-llm";
export { GoogleLLM } from "./llm/providers/google/google-llm";

// LLM Connections
export { OpenAILLMConnection } from "./llm/providers/openai/openai-llm-connection";
export { AnthropicLLMConnection } from "./llm/providers/anthropic/anthropic-llm-connection";

// Initialize providers - Automatically registers all LLMs
import "./llm/registry/providers";

// Ready-to-use Tools
export { GoogleSearch } from "./tools/common/google-search";
// Export additional common tools when available

// Request/Response Models
export {
	LLMRequest,
	Message,
	MessageRole,
	MessageContent,
} from "./models/request/llm-request";
export {
	LLMResponse,
	FunctionCall,
	ToolCall,
} from "./models/response/llm-response";
export {
	FunctionDeclaration,
	JSONSchema,
} from "./models/request/function-declaration";

// Context Models - For advanced usage
export { InvocationContext } from "./models/context/invocation-context";
export { ToolContext } from "./models/context/tool-context";
export { RunConfig, StreamingMode } from "./models/config/run-config";

// Auth System - For API authentication
export { AuthConfig } from "./models/auth/auth-config";
export {
	AuthCredential,
	AuthCredentialType,
	ApiKeyCredential,
	BasicAuthCredential,
	BearerTokenCredential,
	OAuth2Credential,
} from "./models/auth/auth-credential";
export {
	AuthScheme,
	AuthSchemeType,
	ApiKeyScheme,
	HttpScheme,
	OAuth2Scheme,
	OpenIdConnectScheme,
} from "./models/auth/auth-schema";
export { AuthHandler } from "./models/auth/auth-handler";

// Memory System - For persistent conversations
export {
	Session,
	SessionState,
	ListSessionOptions,
	BaseMemoryService,
	MemoryResult,
	SearchMemoryResponse,
	SearchMemoryOptions,
} from "./memory";

export {
	InMemoryMemoryService,
	PersistentMemoryService,
	SessionService,
	InMemorySessionService,
} from "./memory";

// Namespaced exports for cleaner imports
export * as Agents from "./agents";
export * as LLMs from "./llm";
export * as Tools from "./tools";
export * as Models from "./models";
export * as Memory from "./memory";

// Version
export const version = "0.1.0";
