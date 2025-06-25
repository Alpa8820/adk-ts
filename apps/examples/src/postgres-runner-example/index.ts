// Postgres Runner Example: Demonstrates persistent session storage using PostgreSQL and Drizzle ORM
import {
	LlmAgent,
	InMemoryMemoryService,
	PostgresSessionService,
	RunConfig,
	Runner,
	StreamingMode,
} from "@iqai/adk";
import { env } from "node:process";
import { v4 as uuidv4 } from "uuid";

const APP_NAME = "PostgresRunnerDemo";

// Set up Postgres connection (use env var for connection string)
const connectionString = env.PG_CONNECTION_STRING;
if (!connectionString) {
	throw new Error("PG_CONNECTION_STRING is not set");
}

const sessionService =
	PostgresSessionService.fromConnectionString(connectionString);

// Initialize the agent
const agent = new LlmAgent({
	name: "postgres_runner_assistant",
	model: env.LLM_MODEL || "gemini-2.5-flash",
	description:
		"A simple assistant demonstrating Runner usage with Postgres session persistence",
	instruction:
		"You are a helpful assistant with persistent session storage. Answer questions directly and accurately. When asked about databases, explain the benefits of using persistent storage over in-memory storage.",
});

// Create a runner with Postgres session service
const runner = new Runner({
	appName: APP_NAME,
	agent,
	sessionService,
	memoryService: new InMemoryMemoryService(),
});

// Generate unique ID for user
const userId = uuidv4();

async function runConversation() {
	console.log(
		"🤖 Starting a Postgres runner example with persistent sessions...",
	);
	console.log("🐘 Postgres database will be used for session persistence...");

	// Create a session using the PostgresSessionService
	console.log("📝 Creating a new session with Postgres persistence...");
	const session = await runner.sessionService.createSession(APP_NAME, userId, {
		example: "postgres-runner",
		timestamp: new Date().toISOString(),
	});
	const sessionId = session.id;

	console.log(`🔑 Session ID: ${sessionId}`);
	console.log(`👤 User ID: ${userId}`);
	console.log("📊 Session State:", session.state);

	// Run the first question
	console.log(
		"\n📝 First question: 'What are the advantages of using persistent storage over in-memory storage?'",
	);
	await processMessage(
		"What are the advantages of using persistent storage over in-memory storage?",
		sessionId,
	);

	// Run a follow-up question
	console.log(
		"\n📝 Follow-up question: 'Can you explain what SQLite is and how it differs from PostgreSQL?'",
	);
	await processMessage(
		"Can you explain what SQLite is and how it differs from PostgreSQL?",
		sessionId,
	);

	// Demonstrate session persistence by retrieving the session
	console.log("\n🔍 Demonstrating session persistence...");
	const retrievedSession = await runner.sessionService.getSession(
		APP_NAME,
		userId,
		sessionId,
	);
	if (retrievedSession) {
		console.log(
			`📋 Retrieved session has ${retrievedSession.events?.length || 0} events`,
		);
		console.log(
			`🕒 Session last update time: ${new Date(retrievedSession.lastUpdateTime * 1000).toISOString()}`,
		);
	}

	// Run another question to show continued conversation
	console.log(
		"\n📝 Third question: 'Based on our conversation, what would you recommend for a small application?'",
	);
	await processMessage(
		"Based on our conversation, what would you recommend for a small application?",
		sessionId,
	);

	// List all sessions for this user
	console.log("\n📋 Listing all sessions for this user...");
	const userSessionsResponse = await runner.sessionService.listSessions(
		APP_NAME,
		userId,
	);
	console.log(
		`Found ${userSessionsResponse.sessions.length} session(s) for user ${userId}`,
	);

	console.log("\n✅ Postgres runner example completed successfully!");
	console.log("\n📊 What we demonstrated:");
	console.log("✅ PostgreSQL session service integration");
	console.log("✅ Persistent session storage across interactions");
	console.log("✅ Session creation with custom state");
	console.log("✅ Session retrieval and inspection");
	console.log("✅ Multi-turn conversations with persistence");
	console.log("✅ Production-ready database storage");
	console.log("✅ Proper streaming response handling");

	process.exit(0);
}

async function processMessage(messageContent: string, sessionId: string) {
	console.log(`👤 User: ${messageContent}`);
	console.log("🤖 Assistant: ");

	try {
		// Set up streaming configuration
		const runConfig = new RunConfig({
			streamingMode: StreamingMode.SSE,
		});

		// Create a new message
		const newMessage = {
			parts: [
				{
					text: messageContent,
				},
			],
		};

		// Track streaming state
		let isStreaming = false;
		let streamedContent = "";

		// Process the message through the runner
		for await (const event of runner.runAsync({
			userId,
			sessionId,
			newMessage,
			runConfig,
		})) {
			// Skip events without content
			if (!event.content?.parts) continue;

			// Only process assistant messages
			if (event.author === agent.name) {
				// Extract text content from parts
				const textContent = event.content.parts
					.map((part) => part.text || "")
					.join("");

				if (event.partial) {
					// Handle streaming chunks
					isStreaming = true;
					process.stdout.write(textContent);
					streamedContent += textContent;
				} else {
					// Handle complete response
					if (!isStreaming) {
						// If we haven't streamed anything yet, print the full response
						console.log(textContent);
					} else if (streamedContent.trim() !== textContent.trim()) {
						// If the final content is different from what we've streamed, print it
						console.log("\nFull response:", textContent);
					} else {
						// We've already streamed the content, just add a newline
						console.log();
					}
				}
			}
		}

		// Ensure there's a newline after streaming
		if (isStreaming && !streamedContent.endsWith("\n")) {
			console.log();
		}
	} catch (error: any) {
		console.error("Error processing message:", error?.message || String(error));
	}
}

// Run the example
runConversation().catch((error) => {
	console.error("❌ Error in Postgres runner example:", error);
});
