import dotenv from "dotenv";
import { Agent, OpenAILLM, LLMRegistry, ExitLoopTool } from "../src";

dotenv.config();

LLMRegistry.registerLLM(OpenAILLM);

async function main() {
	const exitLoopTool = new ExitLoopTool();

	const agent = new Agent({
		name: "exit_loop_demo",
		model: process.env.LLM_MODEL || "gpt-4o-mini",
		description: "An agent that demonstrates the exit loop tool",
		instructions: `You are a helpful assistant that can exit a loop when asked to do so.
    Use the exit_loop tool when the user explicitly asks you to exit the loop.
    Do not use the exit_loop tool unless specifically instructed.
    Always mention the current iteration number provided in the user's message.`,
		tools: [exitLoopTool],
	});

	let loopCount = 0;
	let exitLoop = false;
	const MAX_ITERATIONS = 5;

	console.log(
		"Starting the loop example. Type 'exit loop' to exit the loop early.",
	);

	while (loopCount < MAX_ITERATIONS && !exitLoop) {
		loopCount++;
		console.log(`\n--- Loop iteration ${loopCount} of ${MAX_ITERATIONS} ---`);

		// Simulated user message - in a real app this would come from user input
		const userMessage =
			loopCount === 3
				? `Currently on iteration ${loopCount}. Please exit the loop now`
				: `Currently on iteration ${loopCount}. Continue the loop and tell me which iteration we're on`;

		console.log(`User says: "${userMessage}"`);

		const result = await agent.run({
			messages: [{ role: "user", content: userMessage }],
		});

		console.log("Agent response:", result.content);

		// Check if the exit_loop tool was called by examining tool_calls
		if (result.tool_calls && result.tool_calls.length > 0) {
			for (const toolCall of result.tool_calls) {
				if (toolCall.function.name === "exit_loop") {
					console.log("Exit loop tool was called. Exiting loop early.");
					exitLoop = true;
					break;
				}
			}
		}
	}

	console.log("\nLoop has finished. Final loop count:", loopCount);
}

// Run the example
main().catch((error) => console.error("Error:", error));
