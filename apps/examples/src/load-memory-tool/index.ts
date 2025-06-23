import {
	InMemoryMemoryService,
	InMemorySessionService,
	LoadMemoryTool,
	LlmAgent,
	Runner,
	Event,
	type Session,
} from "@iqai/adk";
import { env } from "node:process";
import { v4 as uuidv4 } from "uuid";

const APP_NAME = "load-memory-example";
const USER_ID = uuidv4();

async function main() {
	console.log("=== LoadMemoryTool Example ===");
	console.log(
		"This example demonstrates how the LoadMemoryTool can be used to search for memories.",
	);
	console.log("\n");

	// Create services
	const memoryService = new InMemoryMemoryService();
	const sessionService = new InMemorySessionService();

	// Create some sample sessions with events to populate memory
	const sampleSession1: Session = {
		id: "sample-session-1",
		appName: APP_NAME,
		userId: USER_ID,
		state: {},
		events: [
			new Event({
				invocationId: "inv-1",
				author: "user",
				content: {
					role: "user",
					parts: [{ text: "What is the capital of France?" }],
				},
			}),
			new Event({
				invocationId: "inv-1",
				author: "geography_agent",
				content: {
					role: "model",
					parts: [{ text: "The capital of France is Paris." }],
				},
			}),
			new Event({
				invocationId: "inv-2",
				author: "user",
				content: {
					role: "user",
					parts: [{ text: "What about Germany?" }],
				},
			}),
			new Event({
				invocationId: "inv-2",
				author: "geography_agent",
				content: {
					role: "model",
					parts: [{ text: "The capital of Germany is Berlin." }],
				},
			}),
		],
		lastUpdateTime: Date.now(),
	};

	const sampleSession2: Session = {
		id: "sample-session-2",
		appName: APP_NAME,
		userId: USER_ID,
		state: {},
		events: [
			new Event({
				invocationId: "inv-3",
				author: "user",
				content: {
					role: "user",
					parts: [{ text: "Tell me about machine learning" }],
				},
			}),
			new Event({
				invocationId: "inv-3",
				author: "tech_agent",
				content: {
					role: "model",
					parts: [
						{
							text: "Machine learning is a subset of artificial intelligence that allows systems to learn and improve from experience without being explicitly programmed.",
						},
					],
				},
			}),
			new Event({
				invocationId: "inv-4",
				author: "user",
				content: {
					role: "user",
					parts: [{ text: "What about deep learning?" }],
				},
			}),
			new Event({
				invocationId: "inv-4",
				author: "tech_agent",
				content: {
					role: "model",
					parts: [
						{
							text: "Deep learning is a subset of machine learning that uses neural networks with many layers to analyze various factors of data.",
						},
					],
				},
			}),
		],
		lastUpdateTime: Date.now(),
	};

	// Add sessions to memory
	await memoryService.addSessionToMemory(sampleSession1);
	await memoryService.addSessionToMemory(sampleSession2);

	// Create a session for our current example
	const currentSession = await sessionService.createSession(APP_NAME, USER_ID);

	// Create an agent that uses the LoadMemoryTool
	const agent = new LlmAgent({
		name: "memory_assistant",
		model: env.LLM_MODEL || "gemini-2.5-flash-preview-05-20",
		description:
			"An assistant that can search through memory to find relevant information",
		instruction: `You are a helpful assistant that can search through memory to find relevant information.
Use the load_memory tool to search for information when users ask questions.
Present the memory results in a clear and helpful way.`,
		tools: [new LoadMemoryTool()],
	});

	const runner = new Runner({
		appName: APP_NAME,
		agent,
		sessionService,
		memoryService,
	});

	// Helper function to run agent and get response
	async function runAgentTask(userMessage: string): Promise<string> {
		const newMessage = {
			parts: [
				{
					text: userMessage,
				},
			],
		};

		let agentResponse = "";

		try {
			for await (const event of runner.runAsync({
				userId: USER_ID,
				sessionId: currentSession.id,
				newMessage,
			})) {
				if (event.author === agent.name && event.content?.parts) {
					const content = event.content.parts
						.map((part) => part.text || "")
						.join("");
					if (content) {
						agentResponse += content;
					}
				}
			}
		} catch (error) {
			return `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
		}

		return agentResponse || "No response from agent";
	}

	// Also demonstrate the tool directly for educational purposes
	console.log("=== Direct Tool Usage Examples ===\n");

	const loadMemoryTool = new LoadMemoryTool();
	console.log("Tool name:", loadMemoryTool.name);
	console.log("Tool description:", loadMemoryTool.description);
	console.log("\nTool declaration:");
	console.log(JSON.stringify(loadMemoryTool.getDeclaration(), null, 2));

	// Direct memory search examples (for educational purposes)
	console.log("\n=== Direct Memory Searches ===");

	// Search for geography-related memories
	console.log("\nDirect search for 'capital':");
	const directResult1 = await memoryService.searchMemory({
		appName: APP_NAME,
		userId: USER_ID,
		query: "capital",
	});
	console.log("Result:", JSON.stringify(directResult1, null, 2));

	// Search for technology-related memories
	console.log("\nDirect search for 'machine learning':");
	const directResult2 = await memoryService.searchMemory({
		appName: APP_NAME,
		userId: USER_ID,
		query: "machine learning",
	});
	console.log("Result:", JSON.stringify(directResult2, null, 2));

	// Agent-based examples using LoadMemoryTool
	console.log("\n=== Agent-Based Memory Usage ===");

	// Example 1: Ask about geography
	console.log("\nExample 1: Ask about European capitals");
	const result1 = await runAgentTask(
		"Search my memory for information about European capitals",
	);
	console.log("Agent response:", result1);

	// Example 2: Ask about technology
	console.log("\nExample 2: Ask about artificial intelligence");
	const result2 = await runAgentTask(
		"What do I know about artificial intelligence and machine learning?",
	);
	console.log("Agent response:", result2);

	// Example 3: Ask about something not in memory
	console.log("\nExample 3: Ask about something not in memory");
	const result3 = await runAgentTask("What do I know about quantum physics?");
	console.log("Agent response:", result3);

	// Example 4: General memory search
	console.log("\nExample 4: General memory search");
	const result4 = await runAgentTask(
		"Search my memory for any conversations about learning",
	);
	console.log("Agent response:", result4);

	console.log("\n🎉 Load memory tool example completed!");
	console.log("\n📊 What we demonstrated:");
	console.log("✅ Setting up InMemoryMemoryService with sample data");
	console.log("✅ Creating proper Session objects with Event arrays");
	console.log("✅ Direct memory service searches");
	console.log("✅ LoadMemoryTool integration with LlmAgent");
	console.log("✅ Agent-based memory retrieval and presentation");
	console.log("✅ Handling cases where no relevant memories exist");
}

// Run the example
main().catch((error) => console.error("Error:", error));
