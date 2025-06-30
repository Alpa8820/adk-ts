import { env } from "node:process";
import { AgentBuilder } from "@iqai/adk";

/**
 * Simple Agent Example
 *
 * The simplest way to create and use an AI agent with AgentBuilder.
 */
async function main() {
	console.log("🤖 Simple Agent Example");
	console.log("💬 Question: What is the capital of Australia?");

	// The simplest possible usage - just model and ask!
	const response = await AgentBuilder.withModel(
		env.LLM_MODEL || "gemini-2.5-flash",
	).ask("What is the capital of Australia?");

	console.log("🤖 Response:", response);
}

main().catch(console.error);
