import * as path from "node:path";
import {
	LlmAgent,
	Runner,
	InMemorySessionService,
	InMemoryMemoryService,
	Event,
	type Session,
} from "@iqai/adk";
import { env } from "node:process";
import { v4 as uuidv4 } from "uuid";

const APP_NAME = "memory-demo";
const USER_ID = uuidv4();

/**
 * Maximum number of events to keep in conversation history
 */
const MAX_EVENTS = 12; // 6 pairs of user/assistant interactions

/**
 * Memory Usage Example
 *
 * Demonstrates memory service integration with session persistence
 */
async function memoryUsageExample() {
	console.log("Memory Usage Example");
	console.log("====================\n");
	console.log(
		"This example demonstrates memory service integration with ADK agents",
	);
	console.log("- Shows how agents can remember conversation context");
	console.log("- Demonstrates session persistence across interactions");
	console.log("- Uses InMemoryMemoryService for conversation storage\n");

	// Check for API key
	if (!env.GOOGLE_API_KEY && !env.LLM_MODEL) {
		console.log(
			"⚠️  Please set the GOOGLE_API_KEY environment variable to run this example",
		);
		console.log(
			"   Example: GOOGLE_API_KEY=your-key-here npm run dev src/memory-usage",
		);
		return;
	}

	// Create services
	const memoryService = new InMemoryMemoryService();
	const sessionService = new InMemorySessionService();

	// Create a session
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	console.log(`Created session: ${session.id}`);

	// Create the agent with memory capability
	const agent = new LlmAgent({
		name: "memory_assistant",
		description: "An assistant with memory capabilities using Google Gemini",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		instruction:
			"You are a helpful assistant with memory. You can remember previous conversations and refer back to them when relevant. Be conversational and helpful.",
	});

	// Create runner with memory service
	const runner = new Runner({
		appName: APP_NAME,
		agent,
		sessionService,
		memoryService,
	});

	// Helper function to send a message and get a response
	async function sendMessage(message: string): Promise<string> {
		console.log(`\nUSER: ${message}`);

		const newMessage = {
			parts: [
				{
					text: message,
				},
			],
		};

		let agentResponse = "";

		try {
			for await (const event of runner.runAsync({
				userId: USER_ID,
				sessionId: session.id,
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

			console.log(`ASSISTANT: ${agentResponse}`);

			// Add current session to memory after each interaction
			const currentSession = await sessionService.getSession(
				APP_NAME,
				USER_ID,
				session.id,
			);
			if (currentSession) {
				// Trim events if conversation gets too long
				if (currentSession.events.length > MAX_EVENTS) {
					currentSession.events = currentSession.events.slice(-MAX_EVENTS);
				}

				await memoryService.addSessionToMemory(currentSession);
				console.log(
					`[DEBUG] Added session to memory (${currentSession.events.length} events)`,
				);
			}

			return agentResponse;
		} catch (error) {
			const errorMsg = `Error: ${error instanceof Error ? error.message : String(error)}`;
			console.error(errorMsg);
			console.log("ASSISTANT: Sorry, I had trouble processing that request.");
			return errorMsg;
		}
	}

	// Create some sample conversation history first
	console.log("Building conversation history...");

	await sendMessage("Hello! My name is Alice and I'm a software engineer.");
	await sendMessage("I'm working on a TypeScript project using React.");
	await sendMessage("What's your purpose and how can you help me?");
	await sendMessage("Can you remember my name and what I do for work?");

	// Now demonstrate memory capabilities
	console.log(`\n${"=".repeat(50)}`);
	console.log("DEMONSTRATING MEMORY CAPABILITIES");
	console.log("=".repeat(50));

	await sendMessage("What did I tell you about my profession earlier?");
	await sendMessage("What programming language did I mention I was using?");
	await sendMessage("Can you summarize what we've talked about so far?");

	// Test memory search capabilities if available
	console.log(`\n${"=".repeat(50)}`);
	console.log("TESTING MEMORY SEARCH");
	console.log("=".repeat(50));

	// Search memory directly to show what's stored
	const memoryResults = await memoryService.searchMemory({
		appName: APP_NAME,
		userId: USER_ID,
		query: "TypeScript React software engineer",
	});

	console.log(
		`\n[DEBUG] Memory search results for "TypeScript React software engineer":`,
	);
	console.log(`Found ${memoryResults.memories.length} relevant memories:`);

	for (const memory of memoryResults.memories) {
		console.log(`- Author: ${memory.author}, Time: ${memory.timestamp}`);
		if (memory.content?.parts) {
			const text = memory.content.parts
				.map((part) => part.text || "")
				.join("")
				.substring(0, 100);
			console.log(`  Content: ${text}${text.length >= 100 ? "..." : ""}`);
		}
	}

	// Continue conversation with memory context
	await sendMessage(
		"Based on our conversation history, what would you recommend I learn next?",
	);
	await sendMessage(
		"Thank you for the recommendations! Can you remind me what we first talked about?",
	);

	console.log(`\n${"=".repeat(50)}`);
	console.log("EXAMPLE COMPLETED");
	console.log("=".repeat(50));
	console.log("📊 What we demonstrated:");
	console.log("✅ Agent with memory service integration");
	console.log("✅ Session persistence across interactions");
	console.log("✅ Conversation context retention");
	console.log("✅ Memory search capabilities");
	console.log("✅ Automatic session trimming to manage context size");
	console.log("✅ InMemoryMemoryService for conversation storage");
}

// Run the example
memoryUsageExample().catch((error) => {
	console.error("Error:", error);
	process.exit(1);
});
