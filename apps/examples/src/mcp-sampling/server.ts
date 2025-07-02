import { FastMCP } from "fastmcp";
import { z } from "zod";

// Create the FastMCP server
const server = new FastMCP({
	name: "greeting-server",
	version: "1.0.0",
});

// Add the greeting tool that uses sampling to get the user's name
server.addTool({
	name: "greet_user",
	description: "Greets a user by asking for their name through sampling",
	parameters: z.object({}),
	execute: async (_, context) => {
		console.warn("👤 context", context);
		try {
			if (
				context.session &&
				typeof context.session.requestSampling === "function"
			) {
				// Make a sampling request to get the user's name
				const samplingResponse = await context.session.requestSampling({
					messages: [
						{
							role: "user",
							content: {
								type: "text",
								text: "What is your name? Please respond with just your name.",
							},
						},
					],
					systemPrompt:
						"You are helping to get the user's name for a greeting. Please respond with just the name provided.",
					maxTokens: 50,
					temperature: 0.1,
				});

				// Construct and return the greeting
				return `Hello ${samplingResponse.content.text}! Nice to meet you!`;
			}
		} catch (error) {
			console.error("❌ Error:", error);
		}

		return "Hello there! I had trouble getting your name, but nice to meet you!";
	},
});

// Start the server
if (require.main === module) {
	server.start({
		transportType: "stdio",
	});
}

export default server;
