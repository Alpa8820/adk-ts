# Exit Loop Tool Example

This example demonstrates how to use the ExitLoopTool to allow an agent to break out of a programmatic loop when requested.

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
npm run example:exit-loop-tool
```

or directly:

```bash
npx ts-node examples/exit-loop-tool/index.ts
```

## What It Demonstrates

This example demonstrates:

1. Creating an agent with the ExitLoopTool
2. Running a loop with a maximum number of iterations
3. Having the agent break out of the loop when instructed to do so
4. Detection of tool calls to implement loop exit behavior

The agent will run in a loop for up to 5 iterations, but will exit early when explicitly instructed to do so (in this case on iteration 3).