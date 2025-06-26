import {
	LlmAgent,
	FunctionTool,
	InMemorySessionService,
	Runner,
} from "@iqai/adk";
import { env } from "node:process";
import { v4 as uuidv4 } from "uuid";

const APP_NAME = "function-tool-example";
const USER_ID = uuidv4();

/**
 * Example function to calculate the sum of two numbers.
 *
 * @param {number} a First number to add
 * @param {number} b Second number to add
 * @returns The sum of a and b
 */
function calculateSum(a: number, b: number): number {
	return a + b;
}

/**
 * Example async function that fetches weather data for a city.
 *
 * @param city The city to fetch weather for
 * @returns A simulated weather report
 */
async function getWeather(city: string): Promise<Record<string, any>> {
	// In a real application, this would call a weather API
	console.log(`Fetching weather for ${city}...`);

	// Simulate API call
	await new Promise((resolve) => setTimeout(resolve, 1000));

	// Return simulated weather data
	return {
		city,
		temperature: Math.floor(Math.random() * 30) + 10,
		conditions: ["sunny", "cloudy", "rainy", "stormy"][
			Math.floor(Math.random() * 4)
		],
		humidity: Math.floor(Math.random() * 60) + 40,
		date: new Date().toISOString(),
	};
}

/**
 * Example of a function that requires a context parameter
 */
function getUserInfo(userName: string, toolContext: any): Record<string, any> {
	console.log(`Getting user info for ${userName} with context:`, toolContext);

	// In a real application, this might query a database using context credentials
	return {
		name: userName,
		id: Math.floor(Math.random() * 10000),
		membership: "premium",
		accessLevel: 3,
	};
}

async function main() {
	const sessionService = new InMemorySessionService();
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	// Create function tools from our functions
	const calculatorTool = new FunctionTool(calculateSum, {
		name: "calculator",
		description: "Calculates the sum of two numbers",
		parameterTypes: {
			a: "number",
			b: "number",
		},
	});

	const weatherTool = new FunctionTool(getWeather, {
		name: "get_weather",
		description: "Gets current weather information for a city",
		isLongRunning: true,
	});

	const userInfoTool = new FunctionTool(getUserInfo, {
		name: "get_user_info",
		description: "Gets information about a user by name",
	});

	// Create an agent with these tools
	const agent = new LlmAgent({
		name: "function_tool_demo",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description:
			"An agent that demonstrates function tools using Google Gemini",
		instruction: `You are a helpful assistant that can perform calculations, fetch weather data, and retrieve user information.
Use the calculator tool to solve math problems.
Use the weather tool to get weather information for cities.
Use the user info tool to retrieve information about a user.`,
		tools: [calculatorTool, weatherTool, userInfoTool],
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

	// Example 1: Use the calculator
	console.log("\n--- Example 1: Using the calculator tool ---");
	const calcResult = await runAgentTask("What is 42 + 17?");
	console.log("Agent response:", calcResult);

	// Example 2: Weather information
	console.log("\n--- Example 2: Using the weather tool ---");
	const weatherResult = await runAgentTask(
		"What's the weather like in New York today?",
	);
	console.log("Agent response:", weatherResult);

	// Example 3: User info
	console.log("\n--- Example 3: Using the user info tool ---");
	const userResult = await runAgentTask("Get information about user Sarah");
	console.log("Agent response:", userResult);

	// Example 4: Complex calculation
	console.log("\n--- Example 4: Multiple calculations ---");
	const complexCalcResult = await runAgentTask(
		"Calculate 15 + 25, then tell me what that result plus 10 would be",
	);
	console.log("Agent response:", complexCalcResult);

	// Example 5: Weather comparison
	console.log("\n--- Example 5: Weather comparison ---");
	const weatherCompareResult = await runAgentTask(
		"Compare the weather between London and Tokyo",
	);
	console.log("Agent response:", weatherCompareResult);

	// Example 6: User info with calculation
	console.log("\n--- Example 6: Mixed tool usage ---");
	const mixedResult = await runAgentTask(
		"Get info for user John and calculate what his access level plus 5 would be",
	);
	console.log("Agent response:", mixedResult);

	console.log("\n🎉 Function tool example completed!");
	console.log("\n📊 What we demonstrated:");
	console.log("✅ Custom function tools with FunctionTool wrapper");
	console.log("✅ Synchronous functions (calculator)");
	console.log("✅ Asynchronous functions (weather API simulation)");
	console.log("✅ Functions with context parameters (user info)");
	console.log("✅ Tool chaining and complex interactions");
}

// Run the example
main().catch((error) => console.error("Error:", error));
