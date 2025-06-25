import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "node:process";
import {
	InMemoryMemoryService,
	LlmAgent,
	RunConfig,
	Runner,
	StreamingMode,
	createDatabaseSessionService,
} from "@iqai/adk";

const APP_NAME = "CounterDemo";
const USER_ID = "demo-user"; // Fixed user ID to maintain state across runs

// Setup persistent SQLite database
const dbPath = path.join(__dirname, "data", "counter.db");
if (!fs.existsSync(path.dirname(dbPath))) {
	fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

// Step 1: Create database session service with SQLite
const sessionService = createDatabaseSessionService(`sqlite://${dbPath}`);

// Step 2: Initialize agent with counter instructions
const agent = new LlmAgent({
	name: "counter_agent",
	model: env.LLM_MODEL || "gemini-2.5-flash",
	description: "A counter agent that remembers count across script runs",
	instruction: `You are a counter agent. Your job is to:
1. Keep track of how many times you've been run
2. Always increment the count when asked
3. Remember the count from previous script executions
4. Be friendly and show the current count clearly`,
});

// Step 3: Create runner with persistent session service
const runner = new Runner({
	appName: APP_NAME,
	agent,
	sessionService, // This enables persistence across runs!
	memoryService: new InMemoryMemoryService(),
});

async function main() {
	console.log("🔢 Counter Agent with Persistent SQLite Storage");
	console.log("=".repeat(50));

	// Try to find existing session or create new one
	const { sessions } = await runner.sessionService.listSessions(
		APP_NAME,
		USER_ID,
	);

	let sessionId: string;

	if (sessions.length > 0) {
		// Use existing session to maintain counter state
		sessionId = sessions[0].id;
		console.log("📂 Found existing session - counter state will be preserved!");
		console.log(`📋 Session has ${sessions[0].events.length} previous events`);
	} else {
		// Create new session
		const session = await runner.sessionService.createSession(
			APP_NAME,
			USER_ID,
		);
		sessionId = session.id;
		console.log("🆕 Created new session - starting fresh counter!");
	}

	console.log(`\n🔑 Session ID: ${sessionId}`);
	console.log(`\n${"=".repeat(50)}`);

	// Ask agent to increment counter and show current state
	await chat(
		"Please increment the counter and tell me the current count. If this is the first time, start at 1.",
		sessionId,
	);

	console.log(`\n${"=".repeat(50)}`);
	console.log(
		"💡 TIP: Run this script multiple times to see the counter persist!",
	);
	console.log(
		"💡 Each run will remember the previous count from SQLite database.",
	);
	console.log(`💾 Database location: ${dbPath}`);
}

async function chat(message: string, sessionId: string) {
	console.log(`👤 User: ${message}`);
	console.log("🤖 Counter Agent: ");

	const runConfig = new RunConfig({
		streamingMode: StreamingMode.SSE,
	});

	let response = "";

	for await (const event of runner.runAsync({
		userId: USER_ID,
		sessionId,
		newMessage: { parts: [{ text: message }] },
		runConfig,
	})) {
		if (event.content?.parts && event.author === agent.name) {
			const content = event.content.parts
				.map((part) => part.text || "")
				.join("");

			if (event.partial) {
				process.stdout.write(content);
				response += content;
			} else {
				if (!response) {
					console.log(content);
				} else {
					console.log(); // New line after streaming
				}
			}
		}
	}
}

// Run the counter demo
main().catch((error) => {
	console.error("❌ Error:", error);
	process.exit(1);
});
