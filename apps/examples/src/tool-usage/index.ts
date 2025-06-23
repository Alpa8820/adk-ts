import { LlmAgent, Runner, InMemorySessionService } from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";
import { env } from "node:process";

import { CalculatorTool } from "./calculator";
import { WeatherTool } from "./weather";

const APP_NAME = "tool-usage-demo";
const USER_ID = uuidv4();

// Enable debug mode for showing agent loop
const DEBUG = true;

/**
 * Demonstrates the Agent loop with tool execution
 */
async function main() {
	try {
		// Create the agent with custom tools
		const agent = new LlmAgent({
			name: "tool_assistant",
			model: env.LLM_MODEL || "gemini-2.5-flash-preview-05-20",
			description:
				"An assistant that demonstrates tool usage with Google Gemini",
			instruction:
				"You are a helpful assistant that can perform calculations and check the weather. Use the appropriate tools when asked about math or weather.",
			tools: [new CalculatorTool(), new WeatherTool()],
		});

		// Create session service and runner
		const sessionService = new InMemorySessionService();
		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
		});

		console.log("Agent initialized with custom tools");
		console.log("-----------------------------------");

		// Helper function to run agent and get response
		async function runAgentQuery(
			query: string,
			sessionId?: string,
		): Promise<string> {
			const currentSessionId =
				sessionId || (await sessionService.createSession(APP_NAME, USER_ID)).id;

			if (DEBUG) {
				console.log(`\n[DEBUG] Starting agent loop with query: ${query}`);
			}

			let response = "";
			for await (const event of runner.runAsync({
				userId: USER_ID,
				sessionId: currentSessionId,
				newMessage: {
					parts: [{ text: query }],
				},
			})) {
				if (event.author === agent.name && event.content?.parts) {
					const content = event.content.parts
						.map((part) => part.text || "")
						.join("");
					if (content && !event.partial) {
						response = content;
					}
				}
			}

			if (DEBUG) {
				console.log("[DEBUG] Agent loop completed");
			}

			return response;
		}

		// Example 1: Calculator tool usage
		console.log("\nExample 1: Calculator Tool");
		console.log("Question: What is 24 multiplied by 7?");
		console.log("-----------------------------------");

		const calcResponse = await runAgentQuery("What is 24 multiplied by 7?");
		console.log("Final Response:", calcResponse);
		console.log("-----------------------------------");

		// Example 2: Weather tool usage
		console.log("\nExample 2: Weather Tool");
		console.log("Question: What's the weather like in Stockholm today?");
		console.log("-----------------------------------");

		const weatherResponse = await runAgentQuery(
			"What's the weather like in Stockholm today?",
		);
		console.log("Final Response:", weatherResponse);
		console.log("-----------------------------------");

		// Example 3: Multi-tool conversation
		console.log("\nExample 3: Multi-tool conversation");
		console.log(
			"Question: I need to know the weather in Paris and then calculate how many euros I need if I spend 25 euros per day for 7 days.",
		);
		console.log("-----------------------------------");

		const multiToolResponse = await runAgentQuery(
			"I need to know the weather in Paris and then calculate how many euros I need if I spend 25 euros per day for 7 days.",
		);
		console.log("Final Response:", multiToolResponse);
		console.log("-----------------------------------");

		// Example 4: Multi-turn conversation with tool use
		console.log("\nExample 4: Multi-turn conversation");
		console.log("-----------------------------------");

		// Create a persistent session for multi-turn conversation
		const conversationSession = await sessionService.createSession(
			APP_NAME,
			USER_ID,
		);

		// First turn
		console.log(
			"User: Hi, I'm planning a trip to New York. What's the weather like there?",
		);
		let response = await runAgentQuery(
			"Hi, I'm planning a trip to New York. What's the weather like there?",
			conversationSession.id,
		);
		console.log("Assistant:", response);

		// Second turn
		console.log(
			"\nUser: Great! If I stay for 5 days and hotels cost $200 per night, how much will I spend on accommodation?",
		);
		response = await runAgentQuery(
			"Great! If I stay for 5 days and hotels cost $200 per night, how much will I spend on accommodation?",
			conversationSession.id,
		);
		console.log("Assistant:", response);

		// Third turn
		console.log(
			"\nUser: And what will the total be if I also spend $100 per day on food and activities?",
		);
		response = await runAgentQuery(
			"And what will the total be if I also spend $100 per day on food and activities?",
			conversationSession.id,
		);
		console.log("Assistant:", response);

		console.log("\n✅ Tool usage examples complete!");
		console.log("\n🔧 Features Demonstrated:");
		console.log("✅ Custom tool integration (Calculator & Weather)");
		console.log("✅ Single-turn tool usage");
		console.log("✅ Multi-tool coordination in single query");
		console.log("✅ Multi-turn conversation with session persistence");
		console.log("✅ Tool execution step limiting");
		console.log("✅ Debug logging for agent interactions");
		console.log("✅ Event-based response processing");

		console.log("\n🛠️  Tools Used:");
		console.log("• CalculatorTool - Mathematical operations");
		console.log("• WeatherTool - Weather information retrieval");
	} catch (error) {
		console.error("Error:", error);
	}
}

// Run the example
main().catch((error) => {
	console.error("Error:", error);
	process.exit(1);
});
