# Function Tool Example

This example demonstrates how to use the FunctionTool to expose JavaScript functions as tools for an agent.

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
npm run example:function-tool
```

or directly:

```bash
npx ts-node examples/function-tool/index.ts
```

## What It Demonstrates

This example demonstrates:

1. Creating FunctionTool instances from JavaScript functions
2. Using synchronous functions (calculator)
3. Using asynchronous functions (weather)
4. Using functions that require context (user info)
5. Configuring tools with custom names and descriptions
6. Marking long-running operations appropriately

The example shows how to wrap existing JavaScript functions as tools for your agent, allowing it to perform calculations, fetch data, and interact with your application's domain logic.