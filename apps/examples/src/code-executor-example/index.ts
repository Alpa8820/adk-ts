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
		// Create agent with BuiltInCodeExecutor
		const agent = new CodeExecutorAgent();

		console.log("✅ Created CodeExecutorAgent with BuiltInCodeExecutor");
		console.log(
			"   The llm-flows CodeExecutionRequestProcessor will detect and use it",
		);

		// Create runner
		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService: new InMemorySessionService(),
		});

		// Create session
		const session = await runner.sessionService.createSession(
			APP_NAME,
			USER_ID,
		);
		console.log(`📱 Created session: ${session.id}`);

		// Python code that requires actual execution - random numbers and current time
		const actualExecutionCode = `
import random
import time
import hashlib
from datetime import datetime

# Set a specific seed so we can verify execution vs guessing
random.seed(12345)

# Generate some random data that cannot be predicted
random_numbers = [random.randint(1, 1000) for _ in range(5)]
print(f"5 random numbers with seed 12345: {random_numbers}")

# Get current timestamp - impossible to guess
current_time = datetime.now()
timestamp = current_time.timestamp()
print(f"Current timestamp: {timestamp}")
print(f"Formatted time: {current_time.strftime('%Y-%m-%d %H:%M:%S.%f')}")

# Calculate hash of random data - deterministic but unpredictable without execution
data_string = ''.join(map(str, random_numbers))
hash_result = hashlib.md5(data_string.encode()).hexdigest()
print(f"MD5 hash of random numbers: {hash_result}")

# Complex calculation that's hard to do mentally
result = sum(x ** 2.5 for x in random_numbers)
print(f"Sum of numbers raised to power 2.5: {result}")

# File system check - varies by environment
import os
current_dir = os.getcwd()
file_count = len([f for f in os.listdir('.') if os.path.isfile(f)])
print(f"Current directory: {current_dir}")
print(f"Number of files in current directory: {file_count}")

# Memory address - changes every execution
test_list = [1, 2, 3]
memory_address = id(test_list)
print(f"Memory address of test_list: {hex(memory_address)}")
`;

		// Create message with the code to execute
		const message: Content = {
			parts: [
				{
					text: `Please execute this Python code that generates random data, timestamps, and system information:\n\n\`\`\`python${actualExecutionCode}\`\`\``,
				},
			],
		};

		console.log("📝 Requesting execution of code with random/system data...");

		// Execute and display results
		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: message,
		})) {
			if (event.content?.parts && event.author === "code_executor") {
				for (const part of event.content.parts) {
					// Display text responses
					if (part.text && !event.partial) {
						console.log(`🤖 ${part.text}`);
					}

					// Display code being executed
					if (part.executableCode) {
						console.log(`💻 Executing ${part.executableCode.language} code:`);
						console.log(part.executableCode.code);
						console.log("---");
					}

					// Display execution results
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

		console.log("\n✅ Code execution completed successfully!");
		console.log("\n🔍 How BuiltInCodeExecutor integration works:");
		console.log(
			"   1. CodeExecutorAgent extends LlmAgent and adds codeExecutor property",
		);
		console.log("   2. BuiltInCodeExecutor instance is attached to the agent");
		console.log(
			"   3. CodeExecutionRequestProcessor in llm-flows detects the codeExecutor",
		);
		console.log(
			"   4. Processor calls codeExecutor.processLlmRequest() automatically",
		);
		console.log("   5. Gemini 2.0+ executes the Python code natively");
		console.log(
			"\n💡 This is the proper ADK integration pattern for code executors!",
		);
	} catch (error) {
		console.error("❌ Error:", error);

		// Check if it's a model compatibility error
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
