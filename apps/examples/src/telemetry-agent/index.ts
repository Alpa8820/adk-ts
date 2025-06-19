import {
	Agent,
	GoogleLLM,
	LLMRegistry,
	type MessageRole,
	TelemetryService,
} from "@iqai/adk";

// Create a new telemetry service instance
const telemetryService = new TelemetryService();

// Initialize telemetry with Langfuse configuration
const authString = Buffer.from(
	`${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`,
).toString("base64");

telemetryService.initialize({
	appName: "telemetry-agent-example",
	appVersion: "1.0.0",
	otlpEndpoint: `${process.env.LANGFUSE_HOST}/api/public/v1/traces`,
	otlpHeaders: {
		Authorization: `Basic ${authString}`,
	},
});

// Register the Google LLM
LLMRegistry.registerLLM(GoogleLLM);

// Initialize the agent with Google's Gemini model
const agent = new Agent({
	name: "telemetry_assistant",
	model: "gemini-2.5-flash-preview-05-20",
	description: "An assistant with telemetry tracking enabled",
	instructions:
		"You are a helpful assistant. Answer questions concisely and accurately.",
});

async function main() {
	try {
		console.log("📊 Starting telemetry-enabled agent example...");
		console.log("🔍 All interactions will be traced and sent to Langfuse");
		console.log(`🔧 Telemetry initialized: ${telemetryService.initialized}`);
		console.log(`🏷️  App: ${telemetryService.getConfig()?.appName}`);

		// Simple conversation with telemetry
		const response = await agent.run({
			messages: [
				{
					role: "user" as MessageRole,
					content: "Explain what observability means in AI systems",
				},
			],
			sessionId: "demo-session-123", // Session ID for tracking
		});

		console.log(`🤖 ${response.content || "No response content"}`);
		console.log(
			"\n✅ Example completed! Check your Langfuse dashboard for traces.",
		);
	} catch (error) {
		console.error("❌ Error in telemetry agent example:", error);
	} finally {
		// Gracefully shutdown telemetry
		try {
			console.log("🔄 Shutting down telemetry...");
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
