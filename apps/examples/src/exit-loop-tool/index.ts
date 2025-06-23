import {
	LlmAgent,
	ExitLoopTool,
	InMemorySessionService,
	Runner,
} from "@iqai/adk";
import { env } from "node:process";
import { v4 as uuidv4 } from "uuid";

const APP_NAME = "exit-loop-example";
const USER_ID = uuidv4();

async function main() {
	const exitLoopTool = new ExitLoopTool();
	const sessionService = new InMemorySessionService();
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	const agent = new LlmAgent({
		name: "exit_loop_demo",
		model: env.LLM_MODEL || "gemini-2.5-flash-preview-05-20",
		description:
			"An agent that demonstrates the exit loop tool using Google Gemini",
		instruction: `You are a helpful assistant that can exit a loop when asked to do so.
Use the exit_loop tool when the user explicitly asks you to exit the loop.
Do not use the exit_loop tool unless specifically instructed.
Always mention the current iteration number provided in the user's message.`,
		tools: [exitLoopTool],
	});

	const runner = new Runner({
		appName: APP_NAME,
		agent,
		sessionService,
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

		const newMessage = {
			parts: [
				{
					text: userMessage,
				},
			],
		};

		let agentResponse = "";
		let exitToolCalled = false;

		try {
			for await (const event of runner.runAsync({
				userId: USER_ID,
				sessionId: session.id,
				newMessage,
			})) {
				// Check for agent responses
				if (event.author === agent.name && event.content?.parts) {
					const content = event.content.parts
						.map((part) => part.text || "")
						.join("");
					if (content) {
						agentResponse += content;
					}
				}

				// Check for function calls to exit_loop
				const functionCalls = event.getFunctionCalls();
				if (functionCalls) {
					for (const functionCall of functionCalls) {
						if (functionCall.name === "exit_loop") {
							console.log("Exit loop tool was called. Exiting loop early.");
							exitToolCalled = true;
							exitLoop = true;
							break;
						}
					}
				}

				if (exitToolCalled) break;
			}

			if (agentResponse) {
				console.log("Agent response:", agentResponse);
			}
		} catch (error) {
			console.error("❌ Error in loop iteration:", error);
		}
	}

	console.log("\nLoop has finished. Final loop count:", loopCount);
	console.log(
		exitLoop
			? "Loop exited early via exit_loop tool."
			: "Loop completed all iterations.",
	);
}

// Run the example
main().catch((error) => console.error("Error:", error));
