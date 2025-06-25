import {
	LlmAgent,
	Runner,
	InMemorySessionService,
	type McpConfig,
	McpError,
	McpToolset,
} from "@iqai/adk";
import { env } from "node:process";
import { v4 as uuidv4 } from "uuid";

const APP_NAME = "mcp-atp-example";
const USER_ID = uuidv4();

/**
 * Demonstrates an agent using MCP tools from the @iqai/mcp-atp server.
 */
async function main() {
	let toolset: McpToolset | null = null;

	console.log("🚀 Starting MCP ATP Agent Example");

	// Retrieve required environment variables
	const walletPrivateKey = env.WALLET_PRIVATE_KEY;
	const atpApiKey = env.ATP_API_KEY;
	const exampleTokenContract = env.EXAMPLE_ATP_TOKEN_CONTRACT;

	if (!exampleTokenContract) {
		console.error(
			"❌ Error: EXAMPLE_ATP_TOKEN_CONTRACT is not set in the .env file.",
		);
		console.log(
			"Please add EXAMPLE_ATP_TOKEN_CONTRACT to your .env file to run this example.",
		);
		process.exit(1);
	}

	if (!walletPrivateKey) {
		console.warn(
			"⚠️ Warning: WALLET_PRIVATE_KEY is not set. Some ATP tools requiring a wallet will fail.",
		);
	}
	if (!atpApiKey) {
		console.warn(
			"⚠️ Warning: ATP_API_KEY is not set. Some ATP tools requiring an API key might fail.",
		);
	}

	try {
		const mcpConfig: McpConfig = {
			name: "ATP MCP Client",
			description: "Client for the @iqai/mcp-atp server",
			debug: env.DEBUG === "true",
			retryOptions: {
				maxRetries: 2,
				initialDelay: 200,
			},
			cacheConfig: {
				enabled: false,
			},
			transport: {
				mode: "stdio",
				command: "pnpm",
				args: ["dlx", "@iqai/mcp-atp"],
				env: {
					...(env.WALLET_PRIVATE_KEY && {
						WALLET_PRIVATE_KEY: env.WALLET_PRIVATE_KEY,
					}),
					...(env.ATP_API_KEY && {
						ATP_API_KEY: env.ATP_API_KEY,
					}),
					...(env.ATP_USE_DEV && {
						ATP_USE_DEV: env.ATP_USE_DEV,
					}),
					PATH: env.PATH || "", // important to pass PATH to child processes
				},
			},
		};

		// Create a toolset for the MCP server
		console.log("🔄 Connecting to @iqai/mcp-atp server via MCP...");
		toolset = new McpToolset(mcpConfig);

		// Get tools from the toolset
		const mcpTools = await toolset.getTools();

		if (mcpTools.length === 0) {
			console.warn(
				"⚠️ No tools retrieved from the MCP server. Ensure the server is running correctly and accessible.",
			);
			// Attempt to proceed, but agent might not have tools
		}

		console.log(
			`✅ Retrieved ${mcpTools.length} tools from the @iqai/mcp-atp server:"`,
		);
		mcpTools.forEach((tool) => {
			console.log(`   - ${tool.name}: ${tool.description}`);
		});

		// Create the agent with MCP ATP tools
		const agent = new LlmAgent({
			name: "mcp_atp_assistant",
			model: env.LLM_MODEL || "gemini-2.5-flash",
			description:
				"An assistant that can interact with the IQ AI ATP via MCP using Google Gemini",
			instruction:
				"You are a helpful assistant that can interact with the IQ AI Agent Tokenization Platform (ATP).",
			tools: mcpTools,
		});

		// Create session service and runner
		const sessionService = new InMemorySessionService();
		const session = await sessionService.createSession(APP_NAME, USER_ID);

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

		console.log("🤖 Agent initialized with MCP ATP tools.");
		console.log("-----------------------------------");

		// Example 1: Get Agent Statistics
		console.log(`
🌟 Example 1: Get Agent Statistics for ${exampleTokenContract}`);
		const statsQuery = `Get the agent statistics for token contract ${exampleTokenContract}`;
		console.log(`💬 User Query: ${statsQuery}`);
		console.log("-----------------------------------");

		const statsResponse = await runAgentTask(statsQuery);
		console.log(`💡 Agent Response: ${statsResponse}`);
		console.log("-----------------------------------");

		// Example 2: Get Agent Logs
		console.log(`
🌟 Example 2: Get Agent Logs for ${exampleTokenContract}`);
		const logsQuery = `Retrieve the first page of logs for agent token contract ${exampleTokenContract}, with a limit of 5.`;
		console.log(`💬 User Query: ${logsQuery}`);
		console.log("-----------------------------------");

		const logsResponse = await runAgentTask(logsQuery);
		console.log(`💡 Agent Response: ${logsResponse}`);
		console.log("-----------------------------------");

		// Example 3: Add Agent Log
		const logMessage = "This is a test log added by the ADK example agent.";
		console.log(`
🌟 Example 3: Add Agent Log to ${exampleTokenContract}`);
		const addLogQuery = `Add the following log message to agent token contract ${exampleTokenContract}: "${logMessage}"`;
		console.log(`💬 User Query: ${addLogQuery}`);
		console.log("-----------------------------------");

		const addLogResponse = await runAgentTask(addLogQuery);
		console.log(`💡 Agent Response: ${addLogResponse}`);
		console.log("-----------------------------------");

		// Example 4: Buy Agent Tokens
		const iqAmountToBuy = 1000;
		console.log(`
🌟 Example 4: Buy ${iqAmountToBuy} IQ worth of Agent Tokens for ${exampleTokenContract}`);
		const buyQuery = `Buy ${iqAmountToBuy} IQ worth of agent tokens for token contract ${exampleTokenContract}.`;
		console.log(`💬 User Query: ${buyQuery}`);
		console.log("-----------------------------------");

		const buyResponse = await runAgentTask(buyQuery);
		console.log(`💡 Agent Response: ${buyResponse}`);
		console.log("-----------------------------------");

		// Example 5: Sell Agent Tokens
		const tokensToSell = 1000;
		console.log(`
🌟 Example 5: Sell ${tokensToSell} Agent Tokens for ${exampleTokenContract}`);
		const sellQuery = `Sell ${tokensToSell} agent tokens for token contract ${exampleTokenContract}.`;
		console.log(`💬 User Query: ${sellQuery}`);
		console.log("-----------------------------------");

		const sellResponse = await runAgentTask(sellQuery);
		console.log(`💡 Agent Response: ${sellResponse}`);
		console.log("-----------------------------------");

		console.log("✅ MCP ATP Agent examples complete!");

		console.log("\n🎉 MCP ATP agent example completed!");
		console.log("\n📊 What we demonstrated:");
		console.log("✅ Connecting to @iqai/mcp-atp server via MCP protocol");
		console.log("✅ Retrieving MCP tools dynamically from the server");
		console.log("✅ Creating LlmAgent with MCP tools integrated");
		console.log("✅ Using Runner pattern for proper session management");
		console.log("✅ Agent statistics retrieval");
		console.log("✅ Agent logs management (get and add)");
		console.log("✅ Agent token trading (buy and sell operations)");
		console.log("✅ Proper error handling and resource cleanup");
	} catch (error) {
		if (error instanceof McpError) {
			console.error(`❌ MCP Error (${error.type}): ${error.message}`);
			if (error.originalError) {
				console.error("   Original error:", error.originalError);
				// Check for the specific ENOENT error for npx
				if (
					error.originalError instanceof Error &&
					error.originalError.message.includes("spawn npx ENOENT")
				) {
					console.error(
						"   Hint: This often means 'npx' was not found. Ensure Node.js and npm are correctly installed and their bin directory is in your system's PATH.",
					);
				}
			}
		} else {
			console.error("❌ An unexpected error occurred:", error);
		}
	} finally {
		if (toolset) {
			console.log("🧹 Cleaning up MCP resources...");
			await toolset
				.close()
				.catch((err) =>
					console.error("   Error during MCP toolset cleanup:", err),
				);
		}
		// process.exit(0); // Commented out to see if it exits cleanly on its own
	}
}

main().catch((error) => {
	if (error instanceof McpError) {
		console.error(`💥 Fatal MCP Error (${error.type}): ${error.message}`);
	} else {
		console.error("💥 Fatal Error in main execution:", error);
	}
	process.exit(1);
});
