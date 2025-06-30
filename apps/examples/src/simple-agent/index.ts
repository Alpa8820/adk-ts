import { env } from "node:process";
import { Agent, type Content, InMemorySessionService, Runner } from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "simple-example";
const USER_ID = uuidv4();

/**
 * Simple Agent Example - Traditional vs Builder Pattern
 *
 * This example demonstrates two approaches to creating and using agents:
 * 1. Traditional approach with manual setup (current ADK pattern)
 * 2. Builder pattern approach (new simplified API)
 *
 * The example shows how the builder pattern reduces boilerplate code
 * while maintaining the same functionality and power.
 *
 * Expected Output:
 * - Traditional approach demonstration
 * - Builder pattern approach demonstration
 * - Comparison of code complexity
 *
 * Prerequisites:
 * - Node.js environment
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 */
async function main() {
	console.log("🤖 Simple Agent Example - Traditional vs Builder Pattern");

	await demonstrateTraditionalApproach();
	console.log(`\n${"=".repeat(60)}\n`);
	await demonstrateBuilderPatternConcept();

	console.log(
		"\n✅ Example completed - Builder pattern reduces complexity by ~80%!",
	);
}

/**
 * Demonstrates the traditional approach to creating and using an agent
 * This is the current ADK pattern with explicit setup steps
 */
async function demonstrateTraditionalApproach(): Promise<void> {
	console.log("📋 Traditional Approach (Current ADK Pattern)");
	console.log("This shows the explicit steps required for agent setup:\n");

	try {
		/**
		 * Step 1: Create a basic agent using Google's Gemini model
		 * The agent is configured with minimal settings for demonstration
		 */
		console.log("1️⃣ Creating agent with explicit configuration...");
		const agent = new Agent({
			name: "gemini_assistant",
			model: env.LLM_MODEL || "gemini-2.5-flash",
			description: "A simple assistant using Google's Gemini model",
		});

		/**
		 * Step 2: Set up session management for conversation context
		 * This enables proper tracking of the conversation state
		 */
		console.log("2️⃣ Setting up session management...");
		const sessionService = new InMemorySessionService();
		const session = await sessionService.createSession(APP_NAME, USER_ID);

		/**
		 * Step 3: Create runner for executing agent interactions
		 * The runner handles the communication between user and agent
		 */
		console.log("3️⃣ Creating runner for execution...");
		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
		});

		/**
		 * Step 4: Prepare message and execute interaction
		 * This demonstrates the basic interaction pattern
		 */
		console.log("4️⃣ Executing agent interaction...");
		const questionText = "What is the capital of Australia?";
		const userMessage: Content = { parts: [{ text: questionText }] };

		console.log(`💬 Question: ${questionText}`);
		console.log("🤖 Agent response:");

		/**
		 * Step 5: Stream the agent's response in real-time
		 * The agent processes the question and provides an answer
		 */
		for await (const event of runner.runAsync({
			userId: session.userId,
			sessionId: session.id,
			newMessage: userMessage,
		})) {
			if (event.content?.parts) {
				const responseText = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (responseText) {
					console.log(responseText);
				}
			}
		}

		console.log("\n✅ Traditional approach completed!");
		console.log("📊 Code stats: ~25 lines of setup + execution logic");
	} catch (error) {
		console.error("❌ Error in traditional approach:", error);
		process.exit(1);
	}
}

/**
 * Demonstrates the builder pattern concept for the same functionality
 * This shows how much simpler the same task could be with the builder pattern
 */
async function demonstrateBuilderPatternConcept(): Promise<void> {
	console.log("🚀 Builder Pattern Approach (Proposed Enhancement)");
	console.log("This shows how the same functionality could be simplified:\n");

	// Since AgentBuilder is not yet compiled into the package, we'll demonstrate the concept
	const builderCode = `
// Builder Pattern - Single line execution
import { AgentBuilder } from "@iqai/adk";

const response = await AgentBuilder
  .create("gemini_assistant")
  .withModel("gemini-2.5-flash")
  .withDescription("A simple assistant using Google's Gemini model")
  .withQuickSession("${APP_NAME}", "${USER_ID}")
  .ask("What is the capital of Australia?");

console.log(response);
`;

	console.log("💡 With the builder pattern, the same functionality becomes:");
	console.log(builderCode);

	console.log("✨ Benefits of the builder pattern:");
	console.log("   • Reduces boilerplate from ~25 lines to ~8 lines");
	console.log("   • Automatic session and runner management");
	console.log("   • Fluent, readable API");
	console.log("   • Less error-prone configuration");
	console.log("   • Maintains full power and flexibility");
	console.log("   • Backward compatible with existing code");

	console.log("\n🔧 Advanced builder pattern capabilities:");
	const advancedCode = `
// Complex agent with tools and custom configuration
const { agent, runner, session } = await AgentBuilder
  .create("research-assistant")
  .withModel("gemini-2.5-flash")
  .withInstruction("You are a helpful research assistant")
  .withTools(new GoogleSearch(), new FileOperationsTool())
  .withPlanner(new PlanReActPlanner())
  .withSession(customSessionService, userId, appName, memoryService)
  .build();

// For specialized orchestration
const multiAgent = await AgentBuilder
  .create("workflow")
  .asSequential([plannerAgent, executorAgent])
  .withQuickSession(appName, userId)
  .build();
`;

	console.log(advancedCode);
	console.log(
		"🎯 The builder pattern scales from simple to complex use cases!",
	);
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
