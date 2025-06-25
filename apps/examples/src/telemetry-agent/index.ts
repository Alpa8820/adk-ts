import {
	LlmAgent,
	TelemetryService,
	Runner,
	InMemorySessionService,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";
import { env } from "node:process";

const APP_NAME = "telemetry-agent-example";
const USER_ID = uuidv4();

// Create a new telemetry service instance
const telemetryService = new TelemetryService();

// Initialize telemetry with Langfuse configuration
const authString = Buffer.from(
	`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`,
).toString("base64");

telemetryService.initialize({
	appName: APP_NAME,
	appVersion: "1.0.0",
	otlpEndpoint: `${env.LANGFUSE_HOST}/api/public/v1/traces`,
	otlpHeaders: {
		Authorization: `Basic ${authString}`,
	},
});

// Initialize the agent with Google's Gemini model
const agent = new LlmAgent({
	name: "telemetry_assistant",
	model: env.LLM_MODEL || "gemini-2.5-flash",
	description: "An assistant with telemetry tracking enabled",
	instruction:
		"You are a helpful assistant. Answer questions concisely and accurately.",
});

// Create session service and runner with telemetry
const sessionService = new InMemorySessionService();
const runner = new Runner({
	appName: APP_NAME,
	agent,
	sessionService,
});

async function main() {
	try {
		console.log("📊 Starting telemetry-enabled agent example...");
		console.log("🔍 All interactions will be traced and sent to Langfuse");
		console.log(`🔧 Telemetry initialized: ${telemetryService.initialized}`);
		console.log(`🏷️  App: ${telemetryService.getConfig()?.appName}`);

		// Create a session for tracking
		const session = await sessionService.createSession(APP_NAME, USER_ID);
		console.log(`📝 Created session: ${session.id}`);

		// Simple conversation with telemetry
		console.log("\n👤 User: Explain what observability means in AI systems");
		console.log("🤖 Assistant: ");

		let assistantResponse = "";

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: {
				parts: [{ text: "Explain what observability means in AI systems" }],
			},
		})) {
			if (event.author === agent.name && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");

				if (content) {
					if (event.partial) {
						// Handle streaming chunks
						process.stdout.write(content);
						assistantResponse += content;
					} else {
						// Handle complete response
						if (!assistantResponse) {
							console.log(content);
							assistantResponse = content;
						} else if (assistantResponse !== content) {
							console.log("\nFinal response:", content);
							assistantResponse = content;
						}
					}
				}
			}
		}

		// Ensure newline after response
		if (assistantResponse && !assistantResponse.endsWith("\n")) {
			console.log();
		}

		console.log("\n📊 Telemetry Features Demonstrated:");
		console.log("✅ Automatic trace generation for agent interactions");
		console.log("✅ Session-based conversation tracking");
		console.log("✅ OTLP-compatible telemetry export");
		console.log("✅ Langfuse integration for observability");
		console.log("✅ Request and response logging");
		console.log("✅ Performance metrics collection");

		console.log(
			"\n✅ Example completed! Check your Langfuse dashboard for traces.",
		);
		console.log(
			`🔗 Dashboard URL: ${env.LANGFUSE_HOST || "https://cloud.langfuse.com"}`,
		);
	} catch (error) {
		console.error("❌ Error in telemetry agent example:", error);
	} finally {
		// Gracefully shutdown telemetry
		try {
			console.log("\n🔄 Shutting down telemetry...");
			await telemetryService.shutdown();
			console.log("✅ Telemetry shutdown complete");
		} catch (shutdownError) {
			console.error("⚠️  Error during telemetry shutdown:", shutdownError);
		}
	}
}

// Handle process termination gracefully
process.on("SIGINT", async () => {
	console.log("\n🛑 Received SIGINT, shutting down gracefully...");
	try {
		await telemetryService.shutdown();
		process.exit(0);
	} catch (error) {
		console.error("Error during graceful shutdown:", error);
		process.exit(1);
	}
});

process.on("SIGTERM", async () => {
	console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
	try {
		await telemetryService.shutdown();
		process.exit(0);
	} catch (error) {
		console.error("Error during graceful shutdown:", error);
		process.exit(1);
	}
});

// Run the example
main();
