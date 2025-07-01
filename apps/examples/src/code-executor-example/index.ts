import { env } from "node:process";
import {
	InMemorySessionService,
	LlmAgent,
	Runner,
	type Content,
	BuiltInCodeExecutor,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "SimpleCodeExecutor";
const USER_ID = uuidv4();

/**
 * Code Executor Agent with proper BuiltInCodeExecutor integration
 *
 * This extends LlmAgent to add the codeExecutor property that the
 * CodeExecutionRequestProcessor looks for in the llm-flows.
 */
class CodeExecutorAgent extends LlmAgent {
	/**
	 * The code executor instance - this is what the flow processors check for
	 */
	public readonly codeExecutor: BuiltInCodeExecutor;

	constructor() {
		super({
			name: "code_executor",
			model: env.LLM_MODEL || "gemini-2.0-flash-exp",
			description: "Execute Python code using BuiltInCodeExecutor",
			instruction:
				"You are a Python code executor. When given code, execute it and show the results clearly.",
		});

		// Create the BuiltInCodeExecutor instance
		// The CodeExecutionRequestProcessor will detect this and use it
		this.codeExecutor = new BuiltInCodeExecutor();
	}
}

/**
 * Simple Code Executor Example with proper BuiltInCodeExecutor integration
 *
 * This example shows how to properly integrate BuiltInCodeExecutor with the
 * ADK's flow system. The CodeExecutionRequestProcessor in llm-flows will
 * detect the codeExecutor property and use it to process requests.
 */
async function main() {
	console.log(
		"🤖 Starting Code Executor with proper BuiltInCodeExecutor integration...",
	);

	try {
		const agent = new CodeExecutorAgent();

		console.log("✅ Created CodeExecutorAgent with BuiltInCodeExecutor");
		console.log(
			"   The llm-flows CodeExecutionRequestProcessor will detect and use it",
		);

		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService: new InMemorySessionService(),
		});

		const session = await runner.sessionService.createSession(
			APP_NAME,
			USER_ID,
		);
		console.log(`📱 Created session: ${session.id}`);

		const complexProcessingCode = `
def process_numbers(numbers):
    # Square even numbers, cube odd numbers, and filter out numbers divisible by 5
    processed = [
        n**2 if n % 2 == 0 else n**3
        for n in numbers
        if n % 5 != 0
    ]
    return processed

# Example usage
data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 30]
result_list = process_numbers(data)
print(f"The processed list is: {result_list}")
`;

		const message: Content = {
			parts: [
				{
					text: `Please execute this Python code that processes a list with specific rules:\n\n\`\`\`python${complexProcessingCode}\`\`\``,
				},
			],
		};

		console.log("📝 Requesting execution of complex list processing code...");

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: message,
		})) {
			if (event.content?.parts && event.author === "code_executor") {
				for (const part of event.content.parts) {
					if (part.text && !event.partial) {
						console.log(`🤖 ${part.text}`);
					}

					// Display code being executed
					if (part.executableCode) {
						console.log(`💻 Executing ${part.executableCode.language} code:`);
						console.log(part.executableCode.code);
						console.log("---");
					}

					if (part.codeExecutionResult) {
						const success = part.codeExecutionResult.outcome === "OUTCOME_OK";
						const output = part.codeExecutionResult.output || "";

						if (success) {
							console.log(`✅ Execution Result:\n${output}`);
						} else {
							console.log(`❌ Execution Error:\n${output}`);
						}
					}
				}
			}
		}
	} catch (error) {
		console.error("❌ Error:", error);

		if (error instanceof Error && error.message.includes("gemini-2")) {
			console.error(
				"\n💡 Make sure you're using a Gemini 2.0+ model for code execution",
			);
			console.error(
				"   Set LLM_MODEL environment variable to 'gemini-2.0-flash-exp' or similar",
			);
		}

		process.exit(1);
	}
}

main().catch(console.error);
