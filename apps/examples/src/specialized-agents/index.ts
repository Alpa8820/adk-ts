import {
	LlmAgent,
	LangGraphAgent,
	LoopAgent,
	ParallelAgent,
	SequentialAgent,
	Runner,
	InMemorySessionService,
	type BaseAgent,
	type LangGraphNode,
} from "@iqai/adk";
import { env } from "node:process";
import { v4 as uuidv4 } from "uuid";

const APP_NAME = "specialized-agents-demo";
const USER_ID = uuidv4();

// Example of using specialized agents
async function runSpecializedAgentExamples() {
	console.log("==== Specialized Agents Examples ====");

	// Create component agents - using gemini-2.5-flash which works in the simple-agent example
	const researchAgent = new LlmAgent({
		name: "researcher",
		model: env.LLM_MODEL || "gemini-2.5-flash", // This will use the LLMRegistry to get the right provider
		description: "Conducts research on a topic",
		instruction:
			"You are a research assistant. Your job is to find information about topics.",
	});

	const summaryAgent = new LlmAgent({
		name: "summarizer",
		model: env.LLM_MODEL || "gemini-2.5-flash", // This will use the LLMRegistry to get the right provider
		description: "Summarizes information",
		instruction:
			"You are a summarization expert. Your job is to create concise summaries.",
	});

	const analyzerAgent = new LlmAgent({
		name: "analyzer",
		model: env.LLM_MODEL || "gemini-2.5-flash", // This will use the LLMRegistry to get the right provider
		description: "Analyzes information",
		instruction:
			"You are an analytical assistant. Your job is to analyze information and provide insights.",
	});

	const weatherAgent = new LlmAgent({
		name: "weather_expert",
		model: env.LLM_MODEL || "gemini-2.5-flash", // This will use the LLMRegistry to get the right provider
		description: "Provides information about weather",
		instruction:
			"You are a weather expert. Provide information about weather patterns.",
	});

	const drafterAgent = new LlmAgent({
		name: "content_drafter",
		model: env.LLM_MODEL || "gemini-2.5-flash", // This will use the LLMRegistry to get the right provider
		description: "Drafts content iteratively",
		instruction:
			"You are a content writer. Your job is to draft and refine content.",
	});

	// Helper function to run an agent with Runner pattern
	async function runAgentWithRunner(
		agent: BaseAgent,
		userMessage: string,
	): Promise<string> {
		const sessionService = new InMemorySessionService();
		const session = await sessionService.createSession(APP_NAME, USER_ID);

		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
		});

		let agentResponse = "";

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: {
				parts: [{ text: userMessage }],
			},
		})) {
			if (event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) {
					agentResponse += content;
				}
			}
		}

		return agentResponse || "No response from agent";
	}

	// Example 1: Sequential Agent (Research -> Summarize)
	console.log("\n=== Example 1: Sequential Agent ===");
	const sequentialAgent = new SequentialAgent({
		name: "research_pipeline",
		description: "Researches a topic and then summarizes it",
		subAgents: [researchAgent, summaryAgent],
	});

	const sequentialResponse = await runAgentWithRunner(
		sequentialAgent,
		"Tell me about artificial intelligence.",
	);
	console.log("\nSequential Agent Response:");
	console.log(sequentialResponse);

	// Example 2: Parallel Agent (Weather + Analysis in parallel)
	console.log("\n=== Example 2: Parallel Agent ===");
	const parallelAgent = new ParallelAgent({
		name: "multi_perspective",
		description: "Provides multiple perspectives on a topic",
		subAgents: [weatherAgent, analyzerAgent],
	});

	const parallelResponse = await runAgentWithRunner(
		parallelAgent,
		"How might climate change affect agriculture?",
	);
	console.log("\nParallel Agent Response:");
	console.log(parallelResponse);

	// Example 3: Loop Agent (Iterative Content Drafting)
	console.log("\n=== Example 3: Loop Agent ===");
	const loopAgent = new LoopAgent({
		name: "iterative_drafter",
		description: "Drafts content through multiple iterations",
		subAgents: [drafterAgent],
		maxIterations: 3,
	});

	const loopResponse = await runAgentWithRunner(
		loopAgent,
		"Draft a short blog post about machine learning.",
	);
	console.log("\nLoop Agent Response:");
	console.log(loopResponse);

	// Example 4: LangGraph Agent (Complex Workflow)
	console.log("\n=== Example 4: LangGraph Agent ===");

	// Create new agents for LangGraph (can't reuse agents that already have parents)
	const graphResearchAgent = new LlmAgent({
		name: "graph_researcher",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description: "Conducts research on a topic",
		instruction:
			"You are a research assistant. Your job is to find information about topics.",
	});

	const graphSummaryAgent = new LlmAgent({
		name: "graph_summarizer",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description: "Summarizes information",
		instruction:
			"You are a summarization expert. Your job is to create concise summaries.",
	});

	const graphAnalyzerAgent = new LlmAgent({
		name: "graph_analyzer",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description: "Analyzes information",
		instruction:
			"You are an analytical assistant. Your job is to analyze information and provide insights.",
	});

	const graphDrafterAgent = new LlmAgent({
		name: "graph_drafter",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description: "Drafts content iteratively",
		instruction:
			"You are a content writer. Your job is to draft and refine content.",
	});

	// Define the graph nodes
	const nodes: LangGraphNode[] = [
		{
			name: "start",
			agent: graphResearchAgent,
			targets: ["analyze", "summarize"],
		},
		{
			name: "analyze",
			agent: graphAnalyzerAgent,
			targets: ["finalize"],
		},
		{
			name: "summarize",
			agent: graphSummaryAgent,
			targets: ["finalize"],
		},
		{
			name: "finalize",
			agent: graphDrafterAgent,
			targets: [],
		},
	];

	const graphAgent = new LangGraphAgent({
		name: "complex_workflow",
		description: "Research, analyze, and summarize a topic with a final draft",
		nodes,
		rootNode: "start",
	});

	const graphResponse = await runAgentWithRunner(
		graphAgent,
		"Explain the concept of reinforcement learning.",
	);
	console.log("\nLangGraph Agent Response:");
	console.log(graphResponse);

	console.log("\n✅ All specialized agent examples completed!");
	console.log("\n📊 What we demonstrated:");
	console.log("✅ SequentialAgent - Orchestrates agents in sequence");
	console.log("✅ ParallelAgent - Runs multiple agents simultaneously");
	console.log("✅ LoopAgent - Iterative processing with multiple agents");
	console.log("✅ LangGraphAgent - Complex workflow with branching logic");
	console.log("✅ Runner pattern integration with specialized agents");
	console.log("✅ Multi-agent coordination and orchestration");

	console.log("\n🔧 Agent Types Explained:");
	console.log("• Sequential: Research → Summarize (pipeline)");
	console.log("• Parallel: Weather + Analysis (concurrent perspectives)");
	console.log("• Loop: Iterative content drafting (refinement)");
	console.log(
		"• LangGraph: Complex branching workflow (advanced orchestration)",
	);
}

// Run all examples
runSpecializedAgentExamples().catch((error) => {
	console.error("Error running examples:", error);
	process.exit(1);
});
