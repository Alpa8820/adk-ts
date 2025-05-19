# Load Memory Tool Example

This example demonstrates how to use the LoadMemoryTool to search for and retrieve memories from a memory service.

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
npm run example:load-memory-tool
```

or directly:

```bash
npx ts-node examples/load-memory-tool/index.ts
```

## What It Demonstrates

This example demonstrates:

1. Creating an InMemoryMemoryService with sample sessions
2. Setting up the LoadMemoryTool with a proper context
3. Searching for memories using different queries
4. Processing and interpreting the search results

The example shows how an agent can access past conversations and information to provide context-aware responses based on previous interactions with the user.