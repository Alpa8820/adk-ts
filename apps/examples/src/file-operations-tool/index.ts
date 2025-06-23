import * as path from "node:path";
import {
	LlmAgent,
	FileOperationsTool,
	InMemorySessionService,
	Runner,
} from "@iqai/adk";
import { env } from "node:process";
import { v4 as uuidv4 } from "uuid";

const APP_NAME = "file-operations-example";
const USER_ID = uuidv4();

async function main() {
	// Create a temp directory for examples
	const tempDir = path.join(process.cwd(), "temp-examples");

	// Create file operations tool with base path set to temp directory
	const fileToolWithBasePath = new FileOperationsTool({ basePath: tempDir });

	const sessionService = new InMemorySessionService();
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	// Create an agent with this tool
	const agent = new LlmAgent({
		name: "file_operations_demo",
		model: env.LLM_MODEL || "gemini-2.5-flash-preview-05-20",
		description:
			"An agent that demonstrates file operations capabilities using Google Gemini",
		instruction: `You are a helpful assistant that can perform file system operations.
Use the file_operations tool to read, write, and manage files.
Always verify operations success by checking the 'success' property in the response.
For reading operations, the content will be in the 'data' property when successful.`,
		tools: [fileToolWithBasePath],
	});

	const runner = new Runner({
		appName: APP_NAME,
		agent,
		sessionService,
	});

	// Helper function to run agent and get response
	async function runAgentTask(userMessage: string): Promise<string> {
		const newMessage = {
			parts: [
				{
					text: userMessage,
				},
			],
		};

		let agentResponse = "";

		try {
			for await (const event of runner.runAsync({
				userId: USER_ID,
				sessionId: session.id,
				newMessage,
			})) {
				if (event.author === agent.name && event.content?.parts) {
					const content = event.content.parts
						.map((part) => part.text || "")
						.join("");
					if (content) {
						agentResponse += content;
					}
				}
			}
		} catch (error) {
			return `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
		}

		return agentResponse || "No response from agent";
	}

	// Example 1: Write a file
	console.log("\n--- Example 1: Write a file ---");
	const writeResult = await runAgentTask(
		"Write 'Hello, world!' to a file named 'hello.txt'",
	);
	console.log("Agent response:", writeResult);

	// Example 2: Read a file
	console.log("\n--- Example 2: Read a file ---");
	const readResult = await runAgentTask(
		"Read the contents of the file 'hello.txt'",
	);
	console.log("Agent response:", readResult);

	// Example 3: List directory contents
	console.log("\n--- Example 3: List directory contents ---");
	const listResult = await runAgentTask(
		"List all files in the current directory",
	);
	console.log("Agent response:", listResult);

	// Example 4: Check if a file exists
	console.log("\n--- Example 4: Check if a file exists ---");
	const existsResult = await runAgentTask(
		"Check if a file named 'non-existent.txt' exists",
	);
	console.log("Agent response:", existsResult);

	// Example 5: Create a directory
	console.log("\n--- Example 5: Create a directory ---");
	const mkdirResult = await runAgentTask(
		"Create a new directory called 'test-dir'",
	);
	console.log("Agent response:", mkdirResult);

	// Example 6: Write to subdirectory
	console.log("\n--- Example 6: Write to subdirectory ---");
	const subDirWriteResult = await runAgentTask(
		"Write 'Hello from subdirectory!' to 'test-dir/sub-hello.txt'",
	);
	console.log("Agent response:", subDirWriteResult);

	// Example 7: List subdirectory contents
	console.log("\n--- Example 7: List subdirectory contents ---");
	const subDirListResult = await runAgentTask(
		"List all files in the 'test-dir' directory",
	);
	console.log("Agent response:", subDirListResult);

	console.log("\n🎉 File operations example completed!");
	console.log(`📁 Check the '${tempDir}' directory to see the created files.`);
}

// Run the example
main().catch((error) => console.error("Error:", error));
