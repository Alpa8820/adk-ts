import * as path from "node:path";
import { env } from "node:process";
import {
	InMemorySessionService,
	LlmAgent,
	McpToolset,
	Runner,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

const APP_NAME = "mcp-filesystem-example";
const USER_ID = uuidv4();
const ALLOWED_PATH = path.join(process.cwd());

async function main() {
	console.log("🚀 Starting MCP Filesystem Example");

	// Connect to MCP filesystem server
	const toolset = new McpToolset({
		name: "Filesystem Client",
		description: "Client for MCP Filesystem Server",
		transport: {
			mode: "stdio",
			command: "npx",
			args: ["-y", "@modelcontextprotocol/server-filesystem", ALLOWED_PATH],
		},
	});
	const tools = await toolset.getTools();

	console.log(
		`Connected! Available tools: ${tools.map((t) => t.name).join(", ")}`,
	);

	// Create agent with filesystem tools
	const agent = new LlmAgent({
		name: "filesystem_assistant",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description: "An assistant that can work with files",
		instruction:
			"You are a helpful assistant that can read and write files. Be concise in your responses.",
		tools,
	});

	// Set up session
	const sessionService = new InMemorySessionService();
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	const runner = new Runner({
		appName: APP_NAME,
		agent,
		sessionService,
	});

	// Simple file creation and reading example
	console.log("\n📝 Creating a simple text file...");

	const userMessage = {
		parts: [
			{
				text: "Create a file called hello.txt with the message 'Hello from MCP!'",
			},
		],
	};

	for await (const event of runner.runAsync({
		userId: USER_ID,
		sessionId: session.id,
		newMessage: userMessage,
	})) {
		if (event.author === agent.name && event.content?.parts) {
			const response = event.content.parts.map((part) => part.text).join("");
			if (response) {
				console.log("Agent:", response);
			}
		}
	}

	// Clean up
	await toolset.close();
	console.log("\n✅ Example complete!");
}

main().catch(console.error);
