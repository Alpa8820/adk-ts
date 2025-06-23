import {
	LlmAgent,
	HttpRequestTool,
	InMemorySessionService,
	Runner,
} from "@iqai/adk";
import { env } from "node:process";
import { v4 as uuidv4 } from "uuid";

const APP_NAME = "http-request-example";
const USER_ID = uuidv4();

async function main() {
	// Create HTTP request tool
	const httpTool = new HttpRequestTool();

	const sessionService = new InMemorySessionService();
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	// Create an agent with this tool
	const agent = new LlmAgent({
		name: "http_request_demo",
		model: env.LLM_MODEL || "gemini-2.5-flash-preview-05-20",
		description:
			"An agent that demonstrates HTTP request capabilities using Google Gemini",
		instruction: `You are a helpful assistant that can make HTTP requests to retrieve information.
Use the http_request tool to fetch data from APIs and web services.
Always examine the status code to ensure the request was successful.
For JSON responses, try to extract and present the most relevant information.`,
		tools: [httpTool],
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

	// Example 1: Simple GET request to a public API
	console.log("\n--- Example 1: GET request to JSONPlaceholder API ---");
	const postsResult = await runAgentTask(
		"Get a list of posts from https://jsonplaceholder.typicode.com/posts and show me the first 3 posts",
	);
	console.log("Agent response:", postsResult);

	// Example 2: POST request with JSON body
	console.log("\n--- Example 2: POST request with JSON body ---");
	const postResult = await runAgentTask(
		"Send a POST request to https://jsonplaceholder.typicode.com/posts with a JSON body containing title: 'Agent Test' and body: 'This is a test post created by an AI agent'",
	);
	console.log("Agent response:", postResult);

	// Example 3: GET request with query parameters
	console.log("\n--- Example 3: GET request with query parameters ---");
	const userResult = await runAgentTask(
		"Get user information for user ID 1 from https://jsonplaceholder.typicode.com/users/1",
	);
	console.log("Agent response:", userResult);

	// Example 4: GET request to check HTTP status
	console.log("\n--- Example 4: GET request with status code handling ---");
	const statusResult = await runAgentTask(
		"Make a GET request to https://httpstat.us/200 and tell me what the status code is",
	);
	console.log("Agent response:", statusResult);

	// Example 5: PUT request to update data
	console.log("\n--- Example 5: PUT request to update data ---");
	const putResult = await runAgentTask(
		"Send a PUT request to https://jsonplaceholder.typicode.com/posts/1 to update the post with title: 'Updated Post' and body: 'This post has been updated'",
	);
	console.log("Agent response:", putResult);

	// Example 6: GET request with custom headers
	console.log("\n--- Example 6: GET request with custom headers ---");
	const headersResult = await runAgentTask(
		"Make a GET request to https://httpbin.org/headers with a custom header 'X-Custom-Header: ADK-Demo'",
	);
	console.log("Agent response:", headersResult);

	console.log("\n🎉 HTTP request tool example completed!");
	console.log("\n📊 What we demonstrated:");
	console.log("✅ GET requests to public APIs");
	console.log("✅ POST requests with JSON payloads");
	console.log("✅ PUT requests for data updates");
	console.log("✅ Custom headers and query parameters");
	console.log("✅ HTTP status code handling");
	console.log("✅ Response data extraction and formatting");
}

// Run the example
main().catch((error) => console.error("Error:", error));
