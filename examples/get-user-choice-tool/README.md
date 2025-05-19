# Get User Choice Tool Example

This example demonstrates how to use the GetUserChoiceTool to enable an agent to request input choices from a user.

## Setup

1. First, make sure you have installed the dependencies:

```bash
npm install
```

2. Copy the `.env.example` file at the root of the project to `.env` and add your API keys:

```bash
cp ../../.env.example ../../.env
```

3. Edit the `.env` file with your API keys:

```
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# Default model to use - uncomment the one you want to use
LLM_MODEL=gpt-4-turbo
# LLM_MODEL=claude-3-opus
# LLM_MODEL=gemini-1.5-pro
```

## Running the Example

To run the example, use:

```bash
npm run example:get-user-choice-tool
```

or directly:

```bash
npx ts-node examples/get-user-choice-tool/index.ts
```

## What It Demonstrates

This example demonstrates:

1. Creating a GetUserChoiceTool instance
2. Examining the tool's structure, name, description, and declaration
3. Simulating the tool execution with example arguments
4. Understanding how the tool interacts with the agent framework

Note that this is primarily a demonstration of the tool API rather than a complete functional example. In a real implementation, the tool would be integrated with the agent framework to:

1. Return null initially when the tool is called
2. Pause execution and present options to the user
3. Resume execution when the user makes a choice
4. Pass the user's choice back to the agent for continued processing