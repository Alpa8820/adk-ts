// PgLite Runner Example: Demonstrates persistent session storage using PgLite (serverless Postgres-compatible DB)
import {
	LlmAgent,
	InMemoryMemoryService,
	PgLiteSessionService,
	RunConfig,
	Runner,
	StreamingMode,
} from "@iqai/adk";
import { env } from "node:process";
import { v4 as uuidv4 } from "uuid";
import { PGlite } from "@electric-sql/pglite";
import * as fs from "node:fs";
import * as path from "node:path";

const APP_NAME = "PgLiteRunnerDemo";

// Set up PgLite database file (like SQLite)
const dbPath = path.join(__dirname, "data", "session");
if (!fs.existsSync(path.dirname(dbPath))) {
	fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}
const db = new PGlite(dbPath);

const sessionService = new PgLiteSessionService({ pglite: db });

// Initialize the agent
const agent = new LlmAgent({
	name: "pglite_runner_assistant",
	model: env.LLM_MODEL || "gemini-2.5-flash-preview-05-20",
	description:
		"A simple assistant demonstrating Runner usage with PgLite session persistence",
	instruction:
		"You are a helpful assistant with persistent session storage. Answer questions directly and accurately. When asked about databases, explain the benefits of using persistent storage over in-memory storage.",
});

// Create a runner with PgLite session service
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
		"🤖 Starting a PgLite runner example with persistent sessions...",
	);
	console.log("🗄️  PgLite database will be used for session persistence...");

	// Create a session using the PgLiteSessionService
	console.log("📝 Creating a new session with PgLite persistence...");
	const session = await runner.sessionService.createSession(APP_NAME, userId, {
		example: "pglite-runner",
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

	console.log("\n🗄️  Inspecting raw sessions table via PGlite SQL query...");
	try {
		const result = await db.query(
			"SELECT id, app_name, user_id, state, last_update_time FROM sessions WHERE app_name = $1 AND user_id = $2",
			[APP_NAME, userId],
		);
		for (const row of result.rows as any[]) {
			console.log(`Session ID: ${row.id}`);
			console.log(`App Name: ${row.app_name}`);
			console.log(`User ID: ${row.user_id}`);
			console.log(
				`Last Update: ${new Date((row.last_update_time || 0) * 1000).toISOString()}`,
			);

			// Robustly parse state
			let state = row.state;
			if (typeof state === "string") {
				try {
					state = JSON.parse(state);
				} catch {
					state = {};
				}
			}
			console.log("State:", state);
			console.log("-----");
		}
	} catch (error) {
		console.error("Error querying sessions table:", error);
		// Try a more generic query
		try {
			const result = await db.query("SELECT * FROM sessions LIMIT 5");
			console.log("Sample sessions:", result.rows);
		} catch (err) {
			console.error("Could not query sessions table:", err);
		}
	}

	console.log("\n✅ PgLite runner example completed successfully!");
	console.log("\n📊 What we demonstrated:");
	console.log("✅ PgLite session service integration");
	console.log("✅ Persistent session storage across interactions");
	console.log("✅ Session creation with custom state");
	console.log("✅ Session retrieval and inspection");
	console.log("✅ Multi-turn conversations with persistence");
	console.log("✅ Direct database inspection via SQL queries");
	console.log("✅ Proper streaming response handling");
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
	console.error("❌ Error in PgLite runner example:", error);
});
