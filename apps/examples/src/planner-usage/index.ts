import {
	LlmAgent,
	Runner,
	InMemorySessionService,
	BuiltInPlanner,
	PlanReActPlanner,
} from "@iqai/adk";
import { env } from "node:process";
import { v4 as uuidv4 } from "uuid";

const APP_NAME = "planner-demo";
const USER_ID = uuidv4();

/**
 * Planner Usage Examples
 *
 * This example demonstrates how to use planners with agents:
 * - BuiltInPlanner: Uses model's built-in thinking features
 * - PlanReActPlanner: Uses structured tags for explicit planning
 */

async function demonstrateBuiltInPlanner() {
	console.log("🧠 === BuiltInPlanner Example ===");

	const agent = new LlmAgent({
		name: "ThinkingAgent",
		description: "An agent that uses built-in thinking",
		model: env.LLM_MODEL || "gemini-2.5-pro",
		instruction:
			"You are a helpful assistant that thinks through problems carefully.",
		planner: new BuiltInPlanner({
			thinkingConfig: {
				includeThinking: true,
			},
		}),
	});

	// Create services and runner
	const sessionService = new InMemorySessionService();
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	const runner = new Runner({
		appName: APP_NAME,
		agent,
		sessionService,
	});

	const userMessage = "What's 2 + 2? Please explain your reasoning.";

	try {
		console.log(`👤 User: ${userMessage}`);
		console.log("🤖 Agent Response:");

		let agentResponse = "";

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: {
				parts: [{ text: userMessage }],
			},
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

		console.log("📝 BuiltInPlanner Response:");
		console.log(agentResponse);
	} catch (error) {
		console.error("Error with BuiltInPlanner:", error);
	}

	console.log("\n");
}

async function demonstratePlanReActPlanner() {
	console.log("📋 === PlanReActPlanner Example ===");

	const agent = new LlmAgent({
		name: "PlanningAgent",
		description: "An agent that uses structured planning",
		model: env.LLM_MODEL || "gemini-2.5-pro",
		instruction: "You are a helpful assistant that plans before acting.",
		planner: new PlanReActPlanner(),
	});

	// Create services and runner
	const sessionService = new InMemorySessionService();
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	const runner = new Runner({
		appName: APP_NAME,
		agent,
		sessionService,
	});

	const userMessage =
		"I need to plan a birthday party for 20 people. Help me organize this.";

	try {
		console.log(`👤 User: ${userMessage}`);
		console.log("🤖 Agent Response:");

		let agentResponse = "";

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: {
				parts: [{ text: userMessage }],
			},
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

		console.log("📝 PlanReActPlanner Response:");
		console.log(agentResponse);
		console.log("\n📊 Notice the structured planning tags in the response!");
	} catch (error) {
		console.error("Error with PlanReActPlanner:", error);
	}

	console.log("\n");
}

async function demonstrateNoPlannerComparison() {
	console.log("⚡ === No Planner Comparison ===");

	const agent = new LlmAgent({
		name: "SimpleAgent",
		description: "An agent without any planner",
		model: env.LLM_MODEL || "gemini-2.5-pro",
		instruction: "You are a helpful assistant.",
		// No planner specified
	});

	// Create services and runner
	const sessionService = new InMemorySessionService();
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	const runner = new Runner({
		appName: APP_NAME,
		agent,
		sessionService,
	});

	const userMessage = "What's the capital of France?";

	try {
		console.log(`👤 User: ${userMessage}`);
		console.log("🤖 Agent Response:");

		let agentResponse = "";

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: {
				parts: [{ text: userMessage }],
			},
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

		console.log("📝 No Planner Response (for comparison):");
		console.log(agentResponse);
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

	console.log("\n📊 What we demonstrated:");
	console.log("✅ BuiltInPlanner with thinking configuration");
	console.log("✅ PlanReActPlanner with structured planning");
	console.log("✅ No planner baseline for comparison");
	console.log("✅ Runner pattern with session management");
	console.log("✅ Event-based response processing");
	console.log("✅ Multiple agent configurations");
}

// Run the examples
main().catch((error) => {
	console.error("❌ Error in planner examples:", error);
	process.exit(1);
});
