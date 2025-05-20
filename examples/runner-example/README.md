# Runner Example

This example demonstrates how to use the `Runner` class from the ADK TypeScript library to manage agent execution within a session.

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
npm run example:runner
```

or directly:

```bash
npx ts-node examples/runner-example/index.ts
```

## What It Demonstrates

This example demonstrates:

1. Creating a simple agent with a specified LLM model
2. Setting up a Runner to manage the agent execution
3. Creating and managing a session
4. Streaming agent responses
5. Maintaining conversation history across multiple interactions

The Runner provides a robust way to manage agent execution, including:
- Session management
- Message history persistence
- Event handling
- Memory services integration

This approach is ideal for building conversational applications where maintaining context across interactions is important.