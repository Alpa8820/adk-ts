import * as fs from "node:fs";
import * as path from "node:path";
import {
	LlmAgent,
	InMemoryMemoryService,
	RunConfig,
	Runner,
	SqliteSessionService,
	StreamingMode,
} from "@iqai/adk";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { env } from "node:process";

const APP_NAME = "SqliteRunnerDemo";
const USER_ID = uuidv4();

const dbPath = path.join(__dirname, "data", "session.db");
if (!fs.existsSync(path.dirname(dbPath))) {
	fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}
const sqlite = new Database(dbPath);

const sessionService = new SqliteSessionService({ sqlite });

// Initialize the agent with Google's Gemini model
const agent = new LlmAgent({
	name: "sqlite_runner_assistant",
	model: env.LLM_MODEL || "gemini-2.5-flash-preview-05-20",
	description:
		"A simple assistant demonstrating Runner usage with SQLite session persistence",
	instruction:
		"You are a helpful assistant with persistent session storage. Answer questions directly and accurately. When asked about databases, explain the benefits of using persistent storage over in-memory storage.",
});

// Create a runner with SQLite session service
const runner = new Runner({
	appName: APP_NAME,
	agent,
	sessionService,
	memoryService: new InMemoryMemoryService(),
});

async function runConversation() {
	console.log(
		"🤖 Starting a SQLite runner example with persistent sessions...",
	);
	console.log("🗄️  SQLite database will be initialized automatically...");

	// Create a session using the SqliteSessionService
	// The database tables will be created automatically on first use
	console.log("📝 Creating a new session with SQLite persistence...");
	const session = await runner.sessionService.createSession(APP_NAME, USER_ID, {
		example: "sqlite-runner",
		timestamp: new Date().toISOString(),
	});
	const sessionId = session.id;

	console.log(`🔑 Session ID: ${sessionId}`);
	console.log(`👤 User ID: ${USER_ID}`);
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
		USER_ID,
		sessionId,
	);
	if (retrievedSession) {
		console.log(
			`📋 Retrieved session has ${retrievedSession.events?.length || 0} events`,
		);
		console.log(`🆔 Session ID: ${retrievedSession.id}`);
		console.log("📊 Session state:", retrievedSession.state);
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
		USER_ID,
	);
	console.log(
		`Found ${userSessionsResponse.sessions.length} session(s) for user ${USER_ID}`,
	);

	// Display session information
	for (const sessionSummary of userSessionsResponse.sessions) {
		console.log(
			`  📋 Session ${sessionSummary.id}: ${sessionSummary.events.length} events`,
		);
	}

	console.log("\n✅ SQLite runner example completed successfully!");
	console.log("\n🔧 Key Features Demonstrated:");
	console.log("✅ SQLite session persistence across conversations");
	console.log("✅ Automatic database table creation");
	console.log("✅ Session retrieval and listing");
	console.log("✅ Event streaming with proper content handling");
	console.log("✅ Multi-turn conversation continuity");
	console.log("✅ Database connection management");

	// Close the database connection
	sqlite.close();
}

async function processMessage(messageContent: string, sessionId: string) {
	console.log(`👤 User: ${messageContent}`);
	console.log("🤖 Assistant: ");

	try {
		// Set up streaming configuration
		const runConfig = new RunConfig({
			streamingMode: StreamingMode.SSE,
		});

		// Track streaming state
		let isStreaming = false;
		let streamedContent = "";

		// Process the message through the runner
		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId,
			newMessage: {
				parts: [{ text: messageContent }],
			},
			runConfig,
		})) {
			// Skip events without content
			if (!event.content?.parts) continue;

			// Only process assistant messages
			if (event.author === agent.name) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");

				if (event.partial) {
					// Handle streaming chunks
					isStreaming = true;
					process.stdout.write(content);
					streamedContent += content;
				} else {
					// Handle complete response
					if (!isStreaming) {
						// If we haven't streamed anything yet, print the full response
						console.log(content);
					} else if (streamedContent.trim() !== content.trim()) {
						// If the final content is different from what we've streamed, print it
						console.log("\nFull response:", content);
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
	console.error("❌ Error in SQLite runner example:", error);
	process.exit(1);
});
