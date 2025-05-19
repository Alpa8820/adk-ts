# HTTP Request Tool Example

This example demonstrates how to use the HttpRequestTool to enable an agent to make HTTP requests to external APIs and web services.

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
npm run example:http-request-tool
```

or directly:

```bash
npx ts-node examples/http-request-tool/index.ts
```

## What It Demonstrates

This example demonstrates:

1. Creating an agent with the HttpRequestTool
2. Making GET requests to public APIs
3. Sending POST requests with JSON bodies
4. Working with URL parameters in requests
5. Processing and interpreting HTTP responses

The example shows how an agent can interact with external services to fetch data, submit information, and process responses, enabling it to access a wide range of online resources and APIs.