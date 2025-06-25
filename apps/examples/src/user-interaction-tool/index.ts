import {
	LlmAgent,
	RunConfig,
	UserInteractionTool,
	Runner,
	InMemorySessionService,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";
import { env } from "node:process";

const APP_NAME = "user-interaction-demo";
const USER_ID = uuidv4();

// Mock implementation of the promptUser function for demonstration purposes
// In a real application, this would be a UI component or CLI prompt
const mockPromptUser = async (options: {
	prompt: string;
	defaultValue?: string;
	options?: { choices: string[] };
}): Promise<string> => {
	console.log("\n=== User Prompt ===");
	console.log(options.prompt);

	if (options.options?.choices) {
		console.log("Choices:");
		options.options.choices.forEach((choice, index) => {
			console.log(`${index + 1}. ${choice}`);
		});
		// Mock returning the first choice
		console.log(`\nMocking user selection: ${options.options.choices[0]}`);
		return options.options.choices[0];
	}

	if (options.defaultValue) {
		console.log(`Default value: ${options.defaultValue}`);
		console.log(`\nMocking user input: ${options.defaultValue}`);
		return options.defaultValue;
	}

	// Mock a default response
	const mockResponse = "User's response";
	console.log(`\nMocking user input: ${mockResponse}`);
	return mockResponse;
};

async function main() {
	// Create user interaction tool
	const userInteractionTool = new UserInteractionTool();

	// Create an agent with this tool
	const agent = new LlmAgent({
		name: "user_interaction_demo",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description:
			"An agent that demonstrates user interaction capabilities using Google Gemini",
		instruction: `You are a helpful assistant that can interact with the user to gather information.
    Use the user_interaction tool to ask the user questions or get their input on decisions.
    Always be respectful and clear in your prompts to the user.`,
		tools: [userInteractionTool],
	});

	// Create session service and runner
	const sessionService = new InMemorySessionService();
	const runner = new Runner({
		appName: APP_NAME,
		agent,
		sessionService,
	});

	// Helper function to run agent and get response
	async function runAgentQuery(query: string): Promise<string> {
		const session = await sessionService.createSession(APP_NAME, USER_ID);

		console.log(`\n🔍 Processing: ${query}`);

		let response = "";
		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: {
				parts: [{ text: query }],
			},
		})) {
			// Handle user interaction tool calls
			if (event.content?.parts) {
				for (const part of event.content.parts) {
					if (part.functionCall?.name === "user_interaction") {
						console.log("\n🤖 Agent is requesting user interaction...");

						// Extract the prompt parameters
						const args = part.functionCall.args as any;
						const userResponse = await mockPromptUser({
							prompt: (args.prompt as string) || "Please provide input:",
							defaultValue: args.defaultValue as string,
							options: args.options
								? { choices: args.options as string[] }
								: undefined,
						});

						console.log("✅ User interaction completed");
						// Note: In a real implementation, you would need to send this response back to the agent
						// This is a simplified example showing the interaction pattern
					}
				}
			}

			// Collect agent responses
			if (event.author === agent.name && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content && !event.partial) {
					response = content;
				}
			}
		}

		return response;
	}

	// Example 1: Simple user input
	console.log("\n--- Example 1: Simple user input ---");
	const simpleResult = await runAgentQuery("Ask me for my favorite color");
	console.log("Agent response:", simpleResult);

	// Example 2: User choice from options
	console.log("\n--- Example 2: User choice from options ---");
	const choiceResult = await runAgentQuery(
		"Ask me to choose my preferred programming language from Python, JavaScript, and TypeScript",
	);
	console.log("Agent response:", choiceResult);

	// Example 3: User input with default value
	console.log("\n--- Example 3: User input with default value ---");
	const defaultResult = await runAgentQuery(
		"Ask me for my age with a default value of 30",
	);
	console.log("Agent response:", defaultResult);

	console.log("\n✅ User interaction examples complete!");
	console.log("\n🔧 Features Demonstrated:");
	console.log("✅ UserInteractionTool integration");
	console.log("✅ Mock user prompt handling");
	console.log("✅ Function call detection and processing");
	console.log("✅ Choice-based user interactions");
	console.log("✅ Default value handling");
	console.log("✅ Event-based tool execution");

	console.log("\n📝 Implementation Notes:");
	console.log("• This example uses mock user interactions for demonstration");
	console.log("• In production, connect to real UI components or CLI prompts");
	console.log(
		"• The UserInteractionTool enables dynamic user input collection",
	);
	console.log("• Function calls are detected through event.content.parts");
	console.log(
		"• Tool responses need to be sent back to continue the conversation",
	);
}

// Run the example
main().catch((error) => {
	console.error("Error:", error);
	process.exit(1);
});
