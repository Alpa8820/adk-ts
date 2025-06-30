/**
 * AgentBuilder Example - API Demonstration
 *
 * This example demonstrates the new AgentBuilder pattern that simplifies
 * agent creation and management with a fluent interface.
 *
 * The AgentBuilder provides:
 * 1. Simple agent creation with minimal boilerplate
 * 2. Automatic session and runner management
 * 3. Quick execution with the ask() method
 * 4. Support for all agent types (LLM, Sequential, Parallel, Loop, LangGraph)
 * 5. Fluent interface for configuration
 *
 * Note: This example shows the API design. Once the package is built,
 * AgentBuilder will be available as a direct import from @iqai/adk.
 */
function main() {
	console.log("🚀 AgentBuilder API Demonstration");

	demonstrateSimpleAgentApi();
	demonstrateAgentWithToolsApi();
	demonstrateSpecializedAgentsApi();
	demonstrateTraditionalVsBuilder();

	console.log("\n🎉 AgentBuilder API demonstration completed!");
}

/**
 * Demonstrates the simplest possible agent creation and usage
 */
function demonstrateSimpleAgentApi(): void {
	console.log("\n🤖 Simple Agent Creation API");
	console.log(
		"The following code creates an agent with minimal configuration:",
	);

	const codeExample = `
// Simple one-liner execution
const response = await AgentBuilder
  .create("simple-helper")
  .withModel("gemini-2.5-flash")
  .withInstruction("You are a helpful assistant that provides clear, concise answers.")
  .withQuickSession("agent-builder-example", "user123")
  .ask("What are the benefits of using a builder pattern in software design?");

console.log(response);
`;

	console.log(codeExample);
	console.log(
		"✅ This replaces ~20 lines of boilerplate with a single fluent call!",
	);
}

/**
 * Demonstrates agent creation with tools and more complex configuration
 */
function demonstrateAgentWithToolsApi(): void {
	console.log("\n🔧 Agent with Tools API");
	console.log("Creating an agent with search and file operation capabilities:");

	const codeExample = `
import { AgentBuilder, GoogleSearch, FileOperationsTool } from "@iqai/adk";

// Build agent with tools and full configuration
const { agent, runner, session } = await AgentBuilder
  .create("research-assistant")
  .withModel("gemini-2.5-flash")
  .withDescription("A research assistant that can search the web and manage files")
  .withInstruction(
    "You are a research assistant. You can search for information online " +
    "and help manage files. Always be thorough and cite your sources."
  )
  .withTools(
    new GoogleSearch(),
    new FileOperationsTool({ basePath: "/tmp" })
  )
  .withQuickSession("agent-builder-example", "user123")
  .build();

console.log(\`✅ Created agent: \${agent.name}\`);
console.log(\`📋 Description: \${agent.description}\`);
console.log(\`🔧 Tools available: \${agent.tools?.length || 0}\`);
`;

	console.log(codeExample);
	console.log("✅ Clean configuration with tools, session, and runner setup!");
}

/**
 * Demonstrates different types of agents (sequential, parallel, loop)
 */
function demonstrateSpecializedAgentsApi(): void {
	console.log("\n🔄 Specialized Agent Types API");
	console.log("Creating different types of orchestration agents:");

	const codeExample = `
// Create sub-agents for orchestration
const { agent: planner } = await AgentBuilder
  .create("planner")
  .withModel("gemini-2.5-flash")
  .withInstruction("You are a planning agent that breaks down complex tasks.")
  .build();

const { agent: executor } = await AgentBuilder
  .create("executor")
  .withModel("gemini-2.5-flash")
  .withInstruction("You are an execution agent that carries out planned tasks.")
  .build();

// Sequential Agent - executes sub-agents in order
const { agent: sequentialAgent } = await AgentBuilder
  .create("sequential-workflow")
  .withDescription("Executes agents in sequence")
  .asSequential([planner, executor])
  .build();

// Parallel Agent - executes sub-agents simultaneously
const { agent: parallelAgent } = await AgentBuilder
  .create("parallel-workflow")
  .withDescription("Executes agents in parallel")
  .asParallel([planner, executor])
  .build();

// Loop Agent - executes sub-agents iteratively
const { agent: loopAgent } = await AgentBuilder
  .create("loop-workflow")
  .withDescription("Executes agents iteratively")
  .asLoop([planner, executor], 5)  // max 5 iterations
  .build();

// LangGraph Agent - executes agents based on graph structure
const { agent: langGraphAgent } = await AgentBuilder
  .create("graph-workflow")
  .withDescription("Executes agents based on graph structure")
  .asLangGraph([
    { name: "start", agent: planner },
    { name: "execute", agent: executor }
  ], "start")
  .build();
`;

	console.log(codeExample);
	console.log("✅ Supports all agent orchestration patterns with simple API!");
}

/**
 * Demonstrates the difference between traditional approach and builder pattern
 */
function demonstrateTraditionalVsBuilder(): void {
	console.log("\n📊 Traditional vs Builder Comparison");

	console.log("Traditional approach requires extensive boilerplate:");
	const traditionalExample = `
// Traditional approach - many imports and manual setup
import {
  LlmAgent,
  InMemorySessionService,
  Runner,
  GoogleSearch
} from "@iqai/adk";

const sessionService = new InMemorySessionService();
const session = await sessionService.createSession("myApp", "user123");

const agent = new LlmAgent({
  name: "helper",
  model: "gemini-2.5-flash",
  instruction: "You are helpful",
  tools: [new GoogleSearch()]
});

const runner = new Runner({
  appName: "myApp",
  agent,
  sessionService
});

// Manual event processing for responses
let response = "";
for await (const event of runner.runAsync({
  userId: "user123",
  sessionId: session.id,
  newMessage: { parts: [{ text: "Hello!" }] }
})) {
  if (event.content?.parts) {
    response += event.content.parts.map(part => part.text || "").join("");
  }
}
console.log(response);
`;

	console.log(traditionalExample);

	console.log("\nBuilder approach is clean and concise:");
	const builderExample = `
// Builder approach - clean and concise
import { AgentBuilder, GoogleSearch } from "@iqai/adk";

const response = await AgentBuilder
  .create("helper")
  .withModel("gemini-2.5-flash")
  .withInstruction("You are helpful")
  .withTools(new GoogleSearch())
  .withQuickSession("myApp", "user123")
  .ask("Hello!");

console.log(response);
`;

	console.log(builderExample);
	console.log("✨ The builder pattern reduces boilerplate by ~80%!");
	console.log("🎯 Key benefits:");
	console.log("   - Fluent interface for readable code");
	console.log("   - Automatic session and runner management");
	console.log("   - Quick execution helpers (ask method)");
	console.log("   - Support for all agent types");
	console.log("   - Maintains backward compatibility");
	console.log("   - Reduces configuration errors");
}

/**
 * Execute the main function
 */
main();
