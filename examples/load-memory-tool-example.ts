import dotenv from "dotenv";
import { InMemoryMemoryService } from "../src/memory/services/inmemory-memory-service";
import { InvocationContext } from "../src/models/context/invocation-context";
import { ToolContext } from "../src/models/context/tool-context";
import type { Session } from "../src/models/memory/session";
import { SessionState } from "../src/models/memory/session";
import { LoadMemoryTool } from "../src/tools";

// Load environment variables
dotenv.config();

async function main() {
	console.log("=== LoadMemoryTool Example ===");
	console.log(
		"This example demonstrates how the LoadMemoryTool can be used to search for memories.",
	);
	console.log("\n");

	// Create a memory service with some sample data
	const memoryService = new InMemoryMemoryService();

	// Add some sample memory data
	const sampleSession: Session = {
		id: "sample-session-1",
		userId: "sample-user",
		messages: [
			{ role: "user", content: "What is the capital of France?" },
			{ role: "assistant", content: "The capital of France is Paris." },
			{ role: "user", content: "What about Germany?" },
			{ role: "assistant", content: "The capital of Germany is Berlin." },
		],
		metadata: { topic: "geography", appName: "memory-demo" },
		createdAt: new Date(),
		updatedAt: new Date(),
		state: new SessionState(),
	};

	await memoryService.addSessionToMemory(sampleSession);

	const sampleSession2: Session = {
		id: "sample-session-2",
		userId: "sample-user",
		messages: [
			{ role: "user", content: "Tell me about machine learning" },
			{
				role: "assistant",
				content:
					"Machine learning is a subset of artificial intelligence that allows systems to learn and improve from experience without being explicitly programmed.",
			},
			{ role: "user", content: "What about deep learning?" },
			{
				role: "assistant",
				content:
					"Deep learning is a subset of machine learning that uses neural networks with many layers to analyze various factors of data.",
			},
		],
		metadata: { topic: "technology", appName: "memory-demo" },
		createdAt: new Date(),
		updatedAt: new Date(),
		state: new SessionState(),
	};

	await memoryService.addSessionToMemory(sampleSession2);

	// Create an invocation context with the memory service
	const invocationContext = new InvocationContext({
		sessionId: "current-session",
		messages: [],
		memoryService: memoryService,
		userId: "sample-user",
		appName: "memory-demo",
	});

	// Create a tool context
	const toolContext = new ToolContext({
		invocationContext: invocationContext,
	});

	// Create the LoadMemoryTool
	const loadMemoryTool = new LoadMemoryTool();

	// Demonstrate the tool using different queries
	console.log("Tool name:", loadMemoryTool.name);
	console.log("Tool description:", loadMemoryTool.description);

	console.log("\nTool declaration:");
	console.log(JSON.stringify(loadMemoryTool.getDeclaration(), null, 2));

	// Example 1: Search for geography-related memories
	console.log("\nExample 1: Searching for 'capital'");
	const result1 = await loadMemoryTool.runAsync(
		{ query: "capital" },
		toolContext,
	);
	console.log("Result:", JSON.stringify(result1, null, 2));

	// Example 2: Search for technology-related memories
	console.log("\nExample 2: Searching for 'machine learning'");
	const result2 = await loadMemoryTool.runAsync(
		{ query: "machine learning" },
		toolContext,
	);
	console.log("Result:", JSON.stringify(result2, null, 2));

	// Example 3: Search for something not in memory
	console.log("\nExample 3: Searching for something not in memory");
	const result3 = await loadMemoryTool.runAsync(
		{ query: "quantum physics" },
		toolContext,
	);
	console.log("Result:", JSON.stringify(result3, null, 2));
}

// Run the example
main().catch((error) => console.error("Error:", error));
