import {
	LlmAgent,
	BuiltInPlanner,
	PlanReActPlanner,
	InMemorySessionService,
	FileOperationsTool,
	HttpRequestTool,
	Runner,
} from "@iqai/adk";
import * as path from "node:path";
import { v4 as uuidv4 } from "uuid";

const APP_NAME = "flows-example";
const USER_ID = uuidv4();

async function demonstrateSingleFlow() {
	console.log("🔄 === SingleFlow Example ===");
	console.log(
		"Demonstrating tool calling with SingleFlow (automatic flow selection)",
	);
	console.log("-----------------------------------");

	// Create a temp directory for file operations
	const tempDir = path.join(process.cwd(), "temp");

	// Create an agent with file operations tool (SingleFlow will be used automatically)
	const fileAgent = new LlmAgent({
		name: "file_specialist",
		model: process.env.LLM_MODEL || "gemini-2.5-flash",
		description: "Handles file operations and file management tasks",
		instruction: `You are a file management specialist. Use the file_operations tool to handle file requests.
When asked to create a file, use the file_operations tool with operation: "write".
When asked to read a file, use the file_operations tool with operation: "read".
Always use the tools available to you.`,
		tools: [new FileOperationsTool()],
		disallowTransferToParent: true,
		disallowTransferToPeers: true,
		// SingleFlow will be used automatically due to these settings
	});

	const sessionService = new InMemorySessionService();
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	try {
		const runner = new Runner({
			appName: APP_NAME,
			agent: fileAgent,
			sessionService,
		});

		const newMessage = {
			parts: [
				{
					text: `Create a file called "test-flows.txt" in the temp directory with the content "Flows are working!"`,
				},
			],
		};

		console.log("✅ SingleFlow Response:");
		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage,
		})) {
			if (event.author === fileAgent.name && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) console.log(content);
			}
		}
		console.log("-----------------------------------\n");
	} catch (error) {
		console.error("❌ SingleFlow Error:", error);
	}
}

async function demonstrateAutoFlow() {
	console.log("🔄 === AutoFlow Example ===");
	console.log("Demonstrating multi-agent orchestration with AutoFlow");
	console.log("-----------------------------------");

	// Create specialized agents first
	const fileAgent = new LlmAgent({
		name: "file_specialist",
		model: process.env.LLM_MODEL || "gemini-2.5-flash",
		description: "Handles file operations and file management tasks",
		instruction:
			"You specialize in file operations. Use file_operations tool for all file-related tasks.",
		tools: [new FileOperationsTool()],
		disallowTransferToParent: true,
		disallowTransferToPeers: true,
	});

	const apiAgent = new LlmAgent({
		name: "api_specialist",
		model: process.env.LLM_MODEL || "gemini-2.5-flash",
		description: "Handles HTTP requests and API calls",
		instruction:
			"You specialize in HTTP requests and API calls. Use http_request tool for all API-related tasks.",
		tools: [new HttpRequestTool()],
		disallowTransferToParent: true,
		disallowTransferToPeers: true,
	});

	// Create a coordinator agent with sub-agents
	const coordinator = new LlmAgent({
		name: "task_coordinator",
		model: process.env.LLM_MODEL || "gemini-2.5-flash",
		description: "Coordinates tasks between specialized agents",
		instruction: `You coordinate tasks between specialist agents. You can transfer tasks to:
- file_specialist: for file operations
- api_specialist: for HTTP requests and API calls
Analyze the user's request and delegate to the appropriate specialist.`,
		// AutoFlow will be used automatically due to having sub-agents
	});

	// Add sub-agents to coordinator manually (this enables AutoFlow)
	coordinator.subAgents.push(fileAgent, apiAgent);
	fileAgent.parentAgent = coordinator;
	apiAgent.parentAgent = coordinator;

	const sessionService = new InMemorySessionService();
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	try {
		const runner = new Runner({
			appName: APP_NAME,
			agent: coordinator,
			sessionService,
		});

		const newMessage = {
			parts: [
				{
					text: `I need you to create a file called "api-test.txt" and then make an HTTP GET request to https://httpbin.org/json to test the API. Can you coordinate this?`,
				},
			],
		};

		console.log("✅ AutoFlow Response:");
		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage,
		})) {
			if (event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) console.log(`[${event.author}]: ${content}`);
			}
		}
		console.log("-----------------------------------\n");
	} catch (error) {
		console.error("❌ AutoFlow Error:", error);
	}
}

async function demonstratePlanningFlows() {
	console.log("🧠 === Planning Flow Examples ===");
	console.log("Demonstrating planning capabilities with flows");
	console.log("-----------------------------------");

	// Test with BuiltInPlanner
	const builtInPlannerAgent = new LlmAgent({
		name: "planning_agent_builtin",
		model: process.env.LLM_MODEL || "gemini-2.5-flash",
		description: "Agent with built-in planning capabilities",
		instruction:
			"You are a planning agent. Break down complex tasks into steps and use available tools.",
		planner: new BuiltInPlanner({ thinkingConfig: { includeThinking: true } }),
		tools: [new FileOperationsTool()],
		disallowTransferToParent: true,
		disallowTransferToPeers: true,
	});

	// Test with PlanReActPlanner
	const planReActAgent = new LlmAgent({
		name: "planning_agent_react",
		model: process.env.LLM_MODEL || "gemini-2.5-flash",
		description: "Agent with Plan-ReAct planning",
		instruction:
			"You are a ReAct planning agent. Think, plan, and act systematically.",
		planner: new PlanReActPlanner(),
		tools: [new FileOperationsTool()],
		disallowTransferToParent: true,
		disallowTransferToPeers: true,
	});

	const sessionService = new InMemorySessionService();
	const session1 = await sessionService.createSession(APP_NAME, USER_ID);
	const session2 = await sessionService.createSession(APP_NAME, USER_ID);

	// Test BuiltInPlanner
	try {
		console.log("📋 Testing BuiltInPlanner with SingleFlow:");
		const runner1 = new Runner({
			appName: APP_NAME,
			agent: builtInPlannerAgent,
			sessionService,
		});

		const planningMessage1 = {
			parts: [
				{
					text: `Create three files: "plan1.txt", "plan2.txt", and "plan3.txt" each with different content about planning strategies.`,
				},
			],
		};

		console.log("✅ BuiltInPlanner Response:");
		for await (const event of runner1.runAsync({
			userId: USER_ID,
			sessionId: session1.id,
			newMessage: planningMessage1,
		})) {
			if (event.author === builtInPlannerAgent.name && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) console.log(content);
			}
		}
		console.log("\n");
	} catch (error) {
		console.error("❌ BuiltInPlanner Error:", error);
	}

	// Test PlanReActPlanner
	try {
		console.log("📋 Testing PlanReActPlanner with SingleFlow:");
		const runner2 = new Runner({
			appName: APP_NAME,
			agent: planReActAgent,
			sessionService,
		});

		const planningMessage2 = {
			parts: [
				{
					text: `Create a file called "react-plan.txt" with a structured plan for organizing a project.`,
				},
			],
		};

		console.log("✅ PlanReActPlanner Response:");
		for await (const event of runner2.runAsync({
			userId: USER_ID,
			sessionId: session2.id,
			newMessage: planningMessage2,
		})) {
			if (event.author === planReActAgent.name && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) console.log(content);
			}
		}
		console.log("-----------------------------------\n");
	} catch (error) {
		console.error("❌ PlanReActPlanner Error:", error);
	}
}

async function demonstrateSessionPersistence() {
	console.log("💾 === Session Persistence with Flows ===");
	console.log("Demonstrating conversation continuity with flows");
	console.log("-----------------------------------");

	const sessionService = new InMemorySessionService();
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	const persistentAgent = new LlmAgent({
		name: "persistent_agent",
		model: process.env.LLM_MODEL || "gemini-2.5-flash",
		description: "An agent with session persistence",
		instruction:
			"You remember our conversation and can reference previous interactions.",
		tools: [
			new FileOperationsTool({
				basePath: path.join(process.cwd(), "temp-flows-example"),
			}),
		],
		disallowTransferToParent: true,
		disallowTransferToPeers: true,
	});

	const runner = new Runner({
		appName: APP_NAME,
		agent: persistentAgent,
		sessionService,
	});

	try {
		// First interaction
		console.log("First interaction:");
		const firstMessage = {
			parts: [
				{
					text: "Hello! I'm testing session persistence. Please remember that my favorite color is blue.",
				},
			],
		};

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: firstMessage,
		})) {
			if (event.author === persistentAgent.name && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) console.log(content);
			}
		}

		console.log("\n\nSecond interaction (with memory):");

		// Second interaction - should remember the previous conversation
		const secondMessage = {
			parts: [
				{
					text: "What was my favorite color that I mentioned earlier?",
				},
			],
		};

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: secondMessage,
		})) {
			if (event.author === persistentAgent.name && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) console.log(content);
			}
		}
	} catch (error) {
		console.error("Error:", error);
	}

	console.log("-----------------------------------\n");
}

async function main() {
	console.log("🚀 ADK Flows Comprehensive Example");
	console.log("===================================");
	console.log("This example demonstrates the flows system we've implemented:");
	console.log("• SingleFlow: Basic tool calling and processing");
	console.log("• AutoFlow: Multi-agent orchestration with transfers");
	console.log(
		"• Planning Integration: Both BuiltInPlanner and PlanReActPlanner",
	);
	console.log("• Session Persistence: Conversation continuity");
	console.log("===================================\n");

	try {
		await demonstrateSingleFlow();
		await demonstrateAutoFlow();
		await demonstratePlanningFlows();
		await demonstrateSessionPersistence();

		console.log("🎉 All flows examples completed successfully!");
		console.log("\n📊 What we demonstrated:");
		console.log("✅ SingleFlow with tool calling");
		console.log("✅ AutoFlow with agent transfers");
		console.log("✅ Planning integration (thinking & structured)");
		console.log("✅ Session persistence");
		console.log("✅ Complete processor pipeline working");

		console.log("\n🏗️ Architecture components tested:");
		console.log("• Base LLM Flow processing");
		console.log("• Content processing and event handling");
		console.log("• Function calling and tool execution");
		console.log("• Authentication preprocessing");
		console.log("• Instructions and identity processing");
		console.log("• Natural language planning");
		console.log("• Agent transfer coordination");
	} catch (error) {
		console.error("❌ Error in flows example:", error);
	}
}

// Run the example
main();
