import { TransferToAgentTool } from "../src/tools";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
	console.log("=== TransferToAgentTool Example ===");
	console.log(
		"Note: This is a demonstration of the tool API, not a functional example",
	);
	console.log(
		"In a real implementation, this would be integrated with the agent framework",
	);
	console.log("to handle transferring control between agents properly.");
	console.log("\n");

	// Create the tool
	const transferToAgentTool = new TransferToAgentTool();

	// Examine tool structure
	console.log("Tool name:", transferToAgentTool.name);
	console.log("Tool description:", transferToAgentTool.description);

	console.log("\nTool declaration:");
	console.log(JSON.stringify(transferToAgentTool.getDeclaration(), null, 2));

	// Simulate tool execution
	console.log("\nSimulating tool execution:");
	const mockContext = {
		actions: {},
	};

	// Example arguments
	const args = {
		agent_name: "financial_advisor_agent",
	};

	console.log("Arguments:", args);
	const result = await transferToAgentTool.runAsync(args, mockContext as any);
	console.log("Result:", result);
	console.log("Context actions after execution:", mockContext.actions);

	console.log("\nIn a real implementation:");
	console.log("1. The tool would set the transfer_to_agent action");
	console.log("2. The agent framework would detect this action");
	console.log("3. The framework would transfer control to the specified agent");
	console.log("4. The new agent would continue handling the conversation");
}

// Run the example
main().catch((error) => console.error("Error:", error));
