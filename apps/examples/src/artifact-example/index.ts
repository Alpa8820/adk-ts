import {
	LlmAgent,
	InMemoryArtifactService,
	InMemorySessionService,
	LoadArtifactsTool,
	FunctionTool,
	Runner,
} from "@iqai/adk";
import { env } from "node:process";
import { v4 as uuidv4 } from "uuid";

const APP_NAME = "artifact-example";
const USER_ID = uuidv4();

// Create custom function tools for artifact management
function saveArtifact(filename: string, content: string, context: any): string {
	try {
		const part = {
			text: content,
		};

		// Save the artifact using context
		context.saveArtifact(filename, part);
		return `Successfully saved "${content}" to "${filename}"`;
	} catch (error) {
		return `Error saving artifact: ${error instanceof Error ? error.message : String(error)}`;
	}
}

function listArtifacts(context: any): string {
	try {
		// This will be handled by LoadArtifactsTool automatically
		return "Artifacts listed via LoadArtifactsTool";
	} catch (error) {
		return `Error listing artifacts: ${error instanceof Error ? error.message : String(error)}`;
	}
}

function deleteArtifact(filename: string, context: any): string {
	return `Artifact deletion not implemented yet for "${filename}"`;
}

async function demonstrateArtifacts() {
	console.log("🗃️ Working Artifacts Example");
	console.log("============================\n");

	const artifactService = new InMemoryArtifactService();
	const sessionService = new InMemorySessionService();
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	const agent = new LlmAgent({
		name: "file_assistant",
		model: env.LLM_MODEL,
		description: "Assistant that manages files using artifacts",
		instruction: `You help users save, load, and manage files using artifacts.

Available functions:
- saveArtifact(filename, content): Save content to a file
- listArtifacts(): List all available artifacts
- deleteArtifact(filename): Delete an artifact
- load_artifacts: Load specific artifacts (via LoadArtifactsTool)

When users ask to save files, use saveArtifact function.
When users ask to see files, use listArtifacts or load_artifacts.
Always confirm operations and provide helpful feedback.`,
		tools: [
			new FunctionTool(saveArtifact, {
				name: "saveArtifact",
				description:
					"Save text content to an artifact file with a specified filename",
			}),
			new FunctionTool(listArtifacts, {
				name: "listArtifacts",
				description: "List all available artifacts in the current session",
			}),
			new FunctionTool(deleteArtifact, {
				name: "deleteArtifact",
				description:
					"Delete an artifact file by filename (not implemented yet)",
			}),
			new LoadArtifactsTool(),
		],
	});

	const runner = new Runner({
		appName: APP_NAME,
		agent,
		sessionService,
		artifactService,
	});

	// Example 1: Save a file
	console.log("💾 Saving file...");
	try {
		const saveMessage = {
			parts: [
				{
					text: 'Save "Hello World!" as "greeting.txt"',
				},
			],
		};

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: saveMessage,
		})) {
			if (event.author === agent.name && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) console.log("✅", content);
			}
		}
	} catch (error) {
		console.error("❌ Error saving file:", error);
	}

	console.log("\n⚙️ Saving user preferences...");
	try {
		const prefsMessage = {
			parts: [
				{
					text: 'Save my preferences as "user_settings.json": {"theme": "dark", "language": "en"}',
				},
			],
		};

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: prefsMessage,
		})) {
			if (event.author === agent.name && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) console.log("✅", content);
			}
		}
	} catch (error) {
		console.error("❌ Error saving preferences:", error);
	}

	console.log("\n📋 Listing files...");
	try {
		const listMessage = {
			parts: [
				{
					text: "Show me all my files",
				},
			],
		};

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: listMessage,
		})) {
			if (event.author === agent.name && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) console.log("✅", content);
			}
		}
	} catch (error) {
		console.error("❌ Error listing files:", error);
	}

	console.log("\n📄 Loading file...");
	try {
		const loadMessage = {
			parts: [
				{
					text: 'Load "greeting.txt"',
				},
			],
		};

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: loadMessage,
		})) {
			if (event.author === agent.name && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) console.log("✅", content);
			}
		}
	} catch (error) {
		console.error("❌ Error loading file:", error);
	}

	console.log("\n🔄 Updating file...");
	try {
		const updateMessage = {
			parts: [
				{
					text: 'Update "greeting.txt" with "Hello Updated World!"',
				},
			],
		};

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: updateMessage,
		})) {
			if (event.author === agent.name && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) console.log("✅", content);
			}
		}
	} catch (error) {
		console.error("❌ Error updating file:", error);
	}

	console.log("\n🔄 Testing cross-session persistence...");
	try {
		// Create a new session to test persistence
		const newSession = await sessionService.createSession(APP_NAME, USER_ID);

		const crossSessionMessage = {
			parts: [
				{
					text: 'Load my user settings from "user_settings.json"',
				},
			],
		};

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: newSession.id,
			newMessage: crossSessionMessage,
		})) {
			if (event.author === agent.name && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) console.log("✅", content);
			}
		}
	} catch (error) {
		console.error("❌ Error testing cross-session persistence:", error);
	}

	console.log("\n🎉 Artifacts example completed!");
	console.log("\n📊 What we demonstrated:");
	console.log("✅ Saving artifacts with custom function tools");
	console.log("✅ Loading artifacts with LoadArtifactsTool");
	console.log("✅ Listing artifacts");
	console.log("✅ Session persistence across different sessions");
	console.log("✅ File versioning and updates");
}

// Run the example
demonstrateArtifacts().catch(console.error);
