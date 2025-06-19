import { Agent, GoogleLLM, LLMRegistry, type MessageRole } from "@iqai/adk";
import { initializeTelemetry } from "@iqai/adk";

// Initialize telemetry with Langfuse configuration
const authString = Buffer.from(
	`${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`,
).toString("base64");

initializeTelemetry({
	appName: "telemetry-agent-example",
	appVersion: "1.0.0",
	otlpEndpoint: `${process.env.LANGFUSE_HOST}/api/public/otel`,
	otlpHeaders: {
		Authorization: `Basic ${authString}`,
		"Content-Type": "application/json",
	},
	enableConsoleLogging: true,
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
	}
}

// Run the example
main();
