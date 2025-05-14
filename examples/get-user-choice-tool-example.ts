import { GetUserChoiceTool } from "../src/tools";
import dotenv from "dotenv";

dotenv.config();

async function main() {
	console.log("=== GetUserChoiceTool Example ===");
	console.log(
		"Note: This is a demonstration of the tool API, not a functional example",
	);
	console.log(
		"In a real implementation, this would be integrated with the agent framework",
	);
	console.log(
		"to handle long-running operations and user interaction properly.",
	);
	console.log("\n");

	// Create the tool
	const getUserChoiceTool = new GetUserChoiceTool();

	// Examine tool structure
	console.log("Tool name:", getUserChoiceTool.name);
	console.log("Tool description:", getUserChoiceTool.description);
	console.log("Is long running:", getUserChoiceTool.isLongRunning);

	console.log("\nTool declaration:");
	console.log(JSON.stringify(getUserChoiceTool.getDeclaration(), null, 2));

	// Simulate tool execution
	console.log("\nSimulating tool execution:");
	const mockContext = {
		actions: {},
	};

	// Example arguments
	const args = {
		options: ["Pizza", "Burger", "Salad", "Pasta", "Sushi"],
		question: "What would you like to eat?",
	};

	console.log("Arguments:", args);
	const result = await getUserChoiceTool.runAsync(args, mockContext as any);
	console.log("Result:", result);
	console.log("Context actions after execution:", mockContext.actions);

	console.log("\nIn a real implementation:");
	console.log("1. The tool would return null initially");
	console.log(
		"2. The framework would pause execution and present options to the user",
	);
	console.log(
		"3. When the user makes a choice, the framework would resume execution",
	);
	console.log(
		"4. The agent would receive the user's choice and continue processing",
	);
}

// Run the example
main().catch((error) => console.error("Error:", error));
