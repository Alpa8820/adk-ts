import { Agent, InMemoryRunner, LLMRegistry, OpenAILLM, type MessageRole, RunConfig, StreamingMode } from "@adk";
import { Event } from "@adk/events";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import readline from "readline";

// Load environment variables from .env file if it exists
dotenv.config();

// Register the OpenAI LLM
LLMRegistry.registerLLM(OpenAILLM);

// Initialize the agent with OpenAI's model
const agent = new Agent({
  name: "runner_assistant",
  model: "gpt-3.5-turbo", // This will use the LLMRegistry to get the right provider
  description: "A simple assistant demonstrating Runner usage",
  instructions:
    "You are a helpful assistant. Answer questions concisely and accurately.",
});

// Create an in-memory runner with our agent
const runner = new InMemoryRunner(agent, { appName: "RunnerDemo" });

// Generate unique ID for user
const userId = uuidv4();

async function runConversation() {
  console.log("🤖 Starting a runner example with OpenAI's model...");
  
  // Create a session using the InMemorySessionService from the runner
  console.log("📝 Creating a new session...");
  const session = await runner.sessionService.createSession(userId);
  const sessionId = session.id;
  
  console.log(`🔑 Session ID: ${sessionId}`);
  console.log(`👤 User ID: ${userId}`);

  // Run the first question
  console.log("\n📝 First question: 'What are the three laws of robotics?'");
  await processMessage("What are the three laws of robotics?", sessionId);

  // Run a follow-up question
  console.log("\n📝 Follow-up question: 'Who formulated these laws?'");
  await processMessage("Who formulated these laws?", sessionId);

  // Run another follow-up question
  console.log(
    "\n📝 Third question: 'Can you suggest three practical applications of these laws in modern AI systems?'"
  );
  await processMessage(
    "Can you suggest three practical applications of these laws in modern AI systems?",
    sessionId
  );

  console.log("\n✅ Example completed successfully!");
}

async function processMessage(messageContent: string, sessionId: string) {
  // Define configuration for this run
  const runConfig = new RunConfig({
    streamingMode: StreamingMode.SSE, // Enable streaming for this run
  });

  // Create a new message
  const newMessage = {
    role: "user" as MessageRole,
    content: messageContent,
  };

  console.log(`👤 User: ${messageContent}`);
  console.log("🤖 Assistant: ");

  // Set up a simple way to clear line for streaming updates
  const clearLine = () => {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  };

  // Use the runner to process the message
  let fullResponse = "";
  let partialResponse = "";
  
  for await (const event of runner.runAsync({
    userId,
    sessionId,
    newMessage,
    runConfig,
  })) {
    // Ensure event is an Event instance
    const eventObj = event instanceof Event ? event : new Event(event);
    
    if (eventObj.author === "assistant") {
      // Handle streaming response chunks
      if (eventObj.is_partial) {
        // Update our partial response
        partialResponse = eventObj.content || "";
        process.stdout.write(partialResponse);
      } else {
        // We got a full (non-partial) response
        fullResponse = eventObj.content || "";
        
        // If we were previously in streaming mode, clear the line
        if (partialResponse) {
          clearLine();
        }
        
        // Print the full response
        console.log(fullResponse);
        partialResponse = "";
      }
    }
  }
  
  // If we only received partial responses, ensure we add a newline
  if (partialResponse && !fullResponse) {
    console.log();
  }
}

// Run the example
runConversation().catch((error) => {
  console.error("❌ Error in runner example:", error);
});