import {
	Agent,
	GoogleLLM,
	LLMRegistry,
	InMemoryArtifactService,
	ArtifactsTool,
} from "@iqai/adk";

// Register Google LLM
LLMRegistry.registerLLM(GoogleLLM);

const artifactService = new InMemoryArtifactService();

const agent = new Agent({
	name: "file_assistant",
	model: "gemini-2.5-flash-preview-05-20",
	description: "Assistant that manages files using artifacts",
	instructions:
		"You help users save, load, and manage files. Use the artifacts tool for all file operations.",
	tools: [new ArtifactsTool()],
	artifactService: artifactService,
	userId: "user-123",
	appName: "MyApp",
});

async function useArtifacts() {
	const sessionId = "my-session";

	console.log("🗃️ Working Artifacts Example");
	console.log("============================\n");

	console.log("💾 Saving file...");
	const save = await agent.run({
		messages: [
			{ role: "user", content: 'Save "Hello World!" as "greeting.txt"' },
		],
		sessionId,
	});
	console.log("✅", save.content);

	console.log("\n⚙️ Saving user preferences...");
	const prefs = await agent.run({
		messages: [
			{
				role: "user",
				content:
					'Save my preferences as "user:settings.json": {"theme": "dark", "language": "en"}',
			},
		],
		sessionId,
	});
	console.log("✅", prefs.content);

	console.log("\n📋 Listing files...");
	const list = await agent.run({
		messages: [{ role: "user", content: "Show me all my files" }],
		sessionId,
	});
	console.log("✅", list.content);

	console.log("\n📄 Loading file...");
	const load = await agent.run({
		messages: [{ role: "user", content: 'Load "greeting.txt"' }],
		sessionId,
	});
	console.log("✅", load.content);

	console.log("\n🔄 Updating file...");
	const update = await agent.run({
		messages: [
			{
				role: "user",
				content: 'Update "greeting.txt" with "Hello Updated World!"',
			},
		],
		sessionId,
	});
	console.log("✅", update.content);

	console.log("\n📊 Checking versions...");
	const versions = await agent.run({
		messages: [
			{ role: "user", content: 'Show me all versions of "greeting.txt"' },
		],
		sessionId,
	});
	console.log("✅", versions.content);

	console.log("\n🔄 Testing cross-session persistence...");
	const newSessionLoad = await agent.run({
		messages: [
			{
				role: "user",
				content: 'Load my user settings from "user:settings.json"',
			},
		],
		sessionId: "different-session",
	});
	console.log("✅", newSessionLoad.content);
}

useArtifacts().catch(console.error);
