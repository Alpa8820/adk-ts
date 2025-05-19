# File Operations Tool Example

This example demonstrates how to use the FileOperationsTool to enable an agent to perform file system operations.

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
npm run example:file-operations-tool
```

or directly:

```bash
npx ts-node examples/file-operations-tool/index.ts
```

## What It Demonstrates

This example demonstrates:

1. Creating an agent with the FileOperationsTool with a specified base path
2. Writing content to a file
3. Reading content from a file
4. Listing directory contents
5. Checking if a file exists
6. Creating a new directory

The example shows how LLM agents can safely interact with the file system while constrained to a specific directory.