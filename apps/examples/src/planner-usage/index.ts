import {
	Agent,
	BuiltInPlanner,
	PlanReActPlanner,
	type Message,
} from "@iqai/adk";
import { env } from "node:process";

/**
 * Planner Usage Examples
 *
 * This example demonstrates how to use planners with agents:
 * - BuiltInPlanner: Uses model's built-in thinking features
 * - PlanReActPlanner: Uses structured tags for explicit planning
 */

async function demonstrateBuiltInPlanner() {
	console.log("🧠 === BuiltInPlanner Example ===");

	const agent = new Agent({
		name: "ThinkingAgent",
		description: "An agent that uses built-in thinking",
		model: env.LLM_MODEL || "gemini-2.5-pro",
		instructions:
			"You are a helpful assistant that thinks through problems carefully.",
		planner: new BuiltInPlanner({
			thinkingConfig: {
				includeThinking: true,
			},
		}),
	});

	const messages: Message[] = [
		{
			role: "user",
			content: "What's 2 + 2? Please explain your reasoning.",
		},
	];

	try {
		const response = await agent.run({ messages });
		console.log("📝 BuiltInPlanner Response:");
		console.log(response.content);
	} catch (error) {
		console.error("Error with BuiltInPlanner:", error);
	}

	console.log("\n");
}

async function demonstratePlanReActPlanner() {
	console.log("📋 === PlanReActPlanner Example ===");

	const agent = new Agent({
		name: "PlanningAgent",
		description: "An agent that uses structured planning",
		model: env.LLM_MODEL || "gemini-2.5-pro",
		instructions: "You are a helpful assistant that plans before acting.",
		planner: new PlanReActPlanner(),
	});

	const messages: Message[] = [
		{
			role: "user",
			content:
				"I need to plan a birthday party for 20 people. Help me organize this.",
		},
	];

	try {
		const response = await agent.run({ messages });
		console.log("📝 PlanReActPlanner Response:");
		console.log(response.content);
		console.log("\n📊 Notice the structured planning tags in the response!");
	} catch (error) {
		console.error("Error with PlanReActPlanner:", error);
	}

	console.log("\n");
}

async function demonstrateNoPlannerComparison() {
	console.log("⚡ === No Planner Comparison ===");

	const agent = new Agent({
		name: "SimpleAgent",
		description: "An agent without any planner",
		model: env.LLM_MODEL || "gemini-2.5-pro",
		instructions: "You are a helpful assistant.",
		// No planner specified
	});

	const messages: Message[] = [
		{
			role: "user",
			content: "What's the capital of France?",
		},
	];

	try {
		const response = await agent.run({ messages });
		console.log("📝 No Planner Response (for comparison):");
		console.log(response.content);
	} catch (error) {
		console.error("Error with no planner:", error);
	}

	console.log("\n");
}

async function main() {
	console.log("🎯 Planner Integration Examples\n");

	console.log(
		"This example demonstrates how planners enhance agent responses:",
	);
	console.log("• BuiltInPlanner: Uses model's thinking capabilities");
	console.log("• PlanReActPlanner: Adds structured planning methodology");
	console.log("• No Planner: Direct response for comparison\n");

	// Run the demonstrations
	await demonstrateNoPlannerComparison();
	await demonstrateBuiltInPlanner();
	await demonstratePlanReActPlanner();

	console.log("✅ All planner examples completed!");
	console.log("\n📚 Key Takeaways:");
	console.log("• Planners add structure and reasoning to agent responses");
	console.log(
		"• BuiltInPlanner works with models that support thinking features",
	);
	console.log("• PlanReActPlanner uses explicit tags to organize responses");
	console.log("• Both planners can improve response quality and reasoning");
}

// Run the examples
if (require.main === module) {
	main().catch(console.error);
}
