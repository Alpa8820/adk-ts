# MCP ATP Agent Example

This example demonstrates how to use the Model Context Protocol (MCP) to interact with an ATP (Agent Tokenization Platform) server, specifically the `@iqai/mcp-atp` server. It shows how to configure the ADK's `McpToolset` to connect to this server and use an ADK Agent to call its tools.

## Features

- Connecting to the `@iqai/mcp-atp` server using `stdio` transport with `npx`.
- Configuring environment variables for the MCP server via `McpConfig`.
- Fetching available tools from the ATP MCP server.
- Using an ADK Agent to interact with ATP tools like `ATP_AGENT_STATS` and `ATP_GET_AGENT_LOGS`.
- Demonstrating how to pass parameters to these tools.

## Prerequisites

- Node.js (v18 or newer recommended): Ensure Node.js is installed and that its `bin` directory (which includes `node`, `npm`, and `npx`) is correctly added to your system's PATH environment variable.
- npm (comes with Node.js)
- An ADK setup (this example is part of the ADK examples)

## Setup

1. **Install Dependencies**:
    If you haven't already, install the project dependencies from the root of the `adk-ts` project:

    ```bash
    npm install
    ```

2. **Configure Environment Variables**:
    This example requires certain environment variables to be set for the `@iqai/mcp-atp` server to function correctly, particularly for tools that interact with wallets or require API keys.

    Copy the `.env.example` file from the root of the `adk-ts` project to a new file named `.env` in the root directory, if you haven't already:

    ```bash
    cp .env.example .env
    ```

    Edit the `.env` file and add the following variables. **Replace the placeholder values with your actual credentials and information.**

    **Important**: For the `stdio` transport mode to find `npx` (used to run the `@iqai/mcp-atp` server), your Node.js installation directory must be in your system's PATH. If you encounter `Error: spawn npx ENOENT`, it means `npx` was not found. Verify your Node.js installation and PATH configuration.

    ```env
    # Existing keys for OpenAI, Anthropic, Google should be kept if you use them for other examples.
    OPENAI_API_KEY=your_openai_api_key_here
    ANTHROPIC_API_KEY=your_anthropic_api_key_here
    GOOGLE_API_KEY=your_google_api_key_here
    # LLM_MODEL=gpt-4-turbo # Or your preferred model

    # Required for some ATP MCP Server tools
    WALLET_PRIVATE_KEY="your_wallet_private_key_here"
    ATP_API_KEY="your_iq_atp_api_key_here" # May be needed by some server-side functions

    # Optional for ATP MCP Server
    ATP_USE_DEV="false" # Set to "true" to use ATP development environment

    # Example token contract for ATP_AGENT_STATS and ATP_GET_AGENT_LOGS
    # Replace with an actual token contract you want to query
    EXAMPLE_ATP_TOKEN_CONTRACT="0x1234567890abcdef1234567890abcdef12345678"
    ```

    **Security Note**: The `WALLET_PRIVATE_KEY` is highly sensitive. Handle it with extreme care. Ensure it is stored securely and only used in a trusted environment. This example is for demonstration; be cautious when running with real private keys.

3. **LLM Configuration**:
    Ensure your chosen LLM (e.g., OpenAI, Anthropic) is correctly configured in your `.env` file and that the corresponding API key is provided. The example defaults to `gpt-4-turbo` or an environment-defined `LLM_MODEL`.

## Running the Example

Once the setup is complete, you can run the example from the root of the `adk-ts` project:

```bash
npm run build
npm run example mcp-atp-agent
```

Alternatively, you can run the `index.ts` file directly using `ts-node` from the root:

```bash
npx ts-node examples/mcp-atp-agent/index.ts
```

## What It Demonstrates

The `index.ts` script will:

1. Configure an `McpConfig` to launch the `@iqai/mcp-atp` server.
    - It uses `pnpm dlx` (or `npx -y`) to run the server, so you don't need to install it globally.
    - Environment variables like `WALLET_PRIVATE_KEY`, `ATP_API_KEY`, and `ATP_USE_DEV` (set in your main `.env` file) are automatically inherited by the MCP server process. Direct configuration of these within `McpConfig.transport.env` was found to cause issues with `pnpm`/`npx` path resolution and is not necessary if they are present in the main process environment.
2. Initialize an `McpToolset` to connect to this server and retrieve the available tools.
3. Create an ADK `Agent` equipped with these ATP-specific tools.
4. Instruct the `Agent` to perform actions like:
    - Fetching statistics for a specified agent token contract (`ATP_AGENT_STATS`).
    - Retrieving logs for a specified agent token contract (`ATP_GET_AGENT_LOGS`).
5. The agent will then use the MCP tools to interact with the ATP server, and the results will be printed to the console.
6. Properly close the `McpToolset` to clean up resources.

This example showcases how the ADK can integrate with external services exposed via the Model Context Protocol, allowing agents to leverage specialized functionalities.
