import { Agent, InMemorySessionService, Runner } from "@iqai/adk";

// Initialize the agent with Google's Gemini model
const APP_NAME = "simple-example";
const USER_ID = "user_id";

async function main() {
	try {
		console.log(
			"🤖 Starting a simple agent example with Google's gemini 2.5Flash model...",
		);

		const agent = new Agent({
			name: "gemini_assistant",
			model: "gemini-2.5-flash",
			description: "A simple assistant using Google's gemini 2.5Flash model",
		});

		const sessionService = new InMemorySessionService();
		const newSession = await sessionService.createSession(APP_NAME, USER_ID);

		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
		});

		// Example 1: Basic question answering
		console.log("\n📝 Example 1: Basic question answering");

		const newMessage = {
			parts: [
				{
					text: "Say hello!",
				},
			],
		};

		for await (const event of runner.runAsync({
			userId: newSession.userId,
			sessionId: newSession.id,
			newMessage,
		})) {
			console.log(JSON.stringify(event.content.parts, null, 4));
		}
		console.log("\n✅ Example completed successfully!");
	} catch (error) {
		console.error("❌ Error in agent example:", error);
	}
}

// Run the example
main();
