import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "node:process";
import {
	InMemoryMemoryService,
	LlmAgent,
	Runner,
	createDatabaseSessionService,
} from "@iqai/adk";

const APP_NAME = "CounterDemo";
const USER_ID = "demo-user";

// Setup SQLite database
const dbPath = path.join(__dirname, "data", "counter.db");
if (!fs.existsSync(path.dirname(dbPath))) {
	fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

// Create runner with SQLite persistence
const runner = new Runner({
	appName: APP_NAME,
	agent: new LlmAgent({
		name: "counter_agent",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description:
			"You are a counter. Increment the count each time and remember previous runs.",
	}),
	sessionService: createDatabaseSessionService(`sqlite://${dbPath}`),
	memoryService: new InMemoryMemoryService(),
});

async function main() {
	// Find existing session or create new one
	const { sessions } = await runner.sessionService.listSessions(
		APP_NAME,
		USER_ID,
	);
	const sessionId =
		sessions.length > 0
			? sessions[0].id
			: (await runner.sessionService.createSession(APP_NAME, USER_ID)).id;

	// Chat with persistent memory
	for await (const event of runner.runAsync({
		userId: USER_ID,
		sessionId,
		newMessage: {
			parts: [{ text: "Increment counter and show current count" }],
		},
	})) {
		if (
			event.content?.parts &&
			event.author === "counter_agent" &&
			!event.partial
		) {
			console.log(event.content.parts.map((p) => p.text).join(""));
		}
	}

	console.log("\n💡 Run this script multiple times to see persistence!");
}

main().catch(console.error);
