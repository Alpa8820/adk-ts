# ADK TypeScript: Agent Development Kit

The Agent Development Kit (ADK) for TypeScript provides a robust and flexible framework for building sophisticated AI agents. It enables developers to create intelligent, autonomous systems capable of leveraging multiple Large Language Models (LLMs) with advanced tool integration and memory capabilities.

This project is structured as a **Turborepo**, facilitating efficient management of the core ADK package and its accompanying example applications.

<p align="center">
  <a href="https://www.npmjs.com/package/@iqai/adk">
    <img src="https://img.shields.io/npm/v/@iqai/adk" alt="NPM Version" />
  </a>
  <a href="https://www.npmjs.com/package/@iqai/adk">
    <img src="https://img.shields.io/npm/dm/@iqai/adk" alt="NPM Downloads" />
  </a>
  <a href="https://github.com/IQAIcom/adk-ts/blob/main/LICENSE.md">
    <img src="https://img.shields.io/npm/l/@iqai/adk" alt="License" />
  </a>
  <a href="https://github.com/IQAIcom/adk-ts">
    <img src="https://img.shields.io/github/stars/IQAIcom/adk-ts?style=social" alt="GitHub Stars" />
  </a>
</p>

## 🚀 Core Capabilities

ADK TypeScript is engineered to empower developers in building advanced AI applications through a comprehensive feature set:

*   **Multi-Provider LLM Support:** Seamlessly integrate with and switch between leading LLM providers, including OpenAI, Anthropic, and Google, avoiding vendor lock-in and optimizing for specific task requirements.
*   **Extensible Tool System:** Enhance agent capabilities by creating and integrating custom tools. Define tool functionalities via declarative schemas, enabling LLMs to intelligently select and utilize them.
*   **Advanced Agent Reasoning Loop:** Features a complete implementation of the agent reasoning loop, facilitating complex task decomposition, iterative problem-solving, and effective tool execution.
*   **Real-Time Streaming:** Support for real-time streaming responses from LLMs, enabling dynamic and interactive user experiences.
*   **Flexible Authentication:** Incorporates a versatile authentication system to secure API access and protect agent communications.
*   **Persistent Memory Systems:** Equip agents with stateful memory, allowing them to retain context from previous interactions for more coherent and personalized engagements.

## 🔧 Repository Structure

This repository leverages Turborepo for streamlined monorepo management. The primary components include:

*   `packages/adk`: Contains the core `@iqai/adk` library, which is the fundamental package for building agents.
*   `apps/examples`: Provides a suite of practical example applications demonstrating various ADK features and best practices.

## 🚦 Getting Started

Begin developing AI agents with ADK TypeScript by following these steps:

### 1. Prerequisites
*   Node.js (LTS version recommended; refer to `package.json` `engines` for specific version requirements).
*   Valid API keys for your selected LLM provider(s) (e.g., OpenAI, Anthropic, Google).

### 2. Package Installation
Integrate the `@iqai/adk` package into your project using your preferred package manager:

```bash
# Using npm
npm install @iqai/adk

# Using yarn
yarn add @iqai/adk

# Using pnpm
pnpm add @iqai/adk
```

### 3. Environment Configuration
Create a `.env` file in your project's root directory. Add your API keys to this file; ADK will automatically load these environment variables.

```env
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=your_google_api_key
```

### 4. Your First Agent Implementation
Below is a basic example demonstrating how to create and run a simple agent:

```typescript
import { Agent } from '@iqai/adk';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

// Instantiate the agent
const basicAgent = new Agent({
  name: "introductory_assistant",
  // Supported models include "gpt-4-turbo", "claude-3-opus", etc.
  model: "gemini-2.5-flash",
  description: "A foundational assistant agent.",
  instructions: "You are an AI assistant. Please provide concise and accurate responses."
});

// Asynchronously run the agent
async function executeAgent() {
  try {
    const userQuery = "What is the primary function of an AI agent?";
    console.log(`User Input: ${userQuery}`);

    const agentResponse = await basicAgent.run({
      messages: [{ role: 'user', content: userQuery }]
    });

    console.log(`Agent Output: ${agentResponse.content}`);
  } catch (error) {
    console.error("An error occurred during agent execution:", error);
  }
}

// Invoke the agent execution
executeAgent();
```

## 🛠️ Advanced Usage Examples

ADK supports the development of more complex agents with specialized functionalities.

### Agent with Custom Tools
Enable agents to perform specific actions or interact with external services using custom-defined tools.

```typescript
import { Agent, BaseTool } from '@iqai/adk';
import dotenv from 'dotenv';

dotenv.config();

// Define a custom tool for currency conversion
class CurrencyConverterTool extends BaseTool {
  constructor() {
    super({
      name: 'currency_converter',
      description: 'Converts an amount from one currency to another.'
    });
  }

  getDeclaration() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          fromCurrency: { type: 'string', description: 'Source currency code (e.g., USD)' },
          toCurrency: { type: 'string', description: 'Target currency code (e.g., EUR)' }
        },
        required: ['amount', 'fromCurrency', 'toCurrency']
      }
    };
  }

  async runAsync(args: { amount: number; fromCurrency: string; toCurrency: string }) {
    // Placeholder for actual conversion logic (e.g., API call to a finance service)
    // This example uses a mock conversion rate.
    if (args.fromCurrency === 'USD' && args.toCurrency === 'EUR') {
      return { convertedAmount: args.amount * 0.92, currency: 'EUR' };
    }
    return { error: 'Conversion rate not available for the specified currencies.' };
  }
}

const financialAgent = new Agent({
  name: "currency_conversion_assistant",
  model: "gpt-4-turbo", // A model proficient in tool usage is recommended
  instructions:
    "You are a financial assistant. Use the currency_converter tool for currency conversions.",
  tools: [new CurrencyConverterTool()]
});

async function main() {
  const response = await financialAgent.run({
    messages: [
      { role: 'user', content: 'Convert 100 USD to EUR.' }
    ]
  });
  console.log(response.content);
}

main().catch(console.error);
```

### Agent with Persistent Memory
Implement agents that can retain information across multiple sessions, enabling more contextual and personalized interactions.

```typescript
import { Agent, PersistentMemoryService } from '@iqai/adk';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the persistent memory service
const memoryService = new PersistentMemoryService({
  storageDir: path.join(process.cwd(), '.agent_memory_data'), // Specify a writable directory
  createDir: true // Automatically create the directory if it doesn't exist
});

const contextualAgent = new Agent({
  name: "context_aware_assistant",
  model: "gemini-2.5-flash",
  instructions:
    "You are equipped with persistent memory. Recall user preferences and past conversation details.",
  memoryService,
  userId: 'user_profile_001' // Assign a unique identifier for the user
});

async function main() {
  const userSessionId = 'chat_session_xyz789';

  await contextualAgent.run({
    messages: [
      { role: 'user', content: 'My preferred language for technical docs is Python.' }
    ],
    sessionId: userSessionId // Use a consistent session ID for memory linkage
  });
  console.log("Agent has recorded the user's language preference.");

  const followUp = await contextualAgent.run({
    messages: [
      { role: 'user', content: 'What was the language preference I mentioned?' }
    ],
    sessionId: userSessionId
  });
  console.log(`Agent's response regarding preference: ${followUp.content}`);
}

main().catch(console.error);
```

## 🧪 Running Example Applications

The `apps/examples` directory within this Turborepo contains a collection of executable examples that illustrate ADK's features.

To run these examples:

1.  Ensure the repository is cloned locally.
2.  Navigate to the examples directory:
    ```bash
    cd apps/examples
    ```
3.  Install dependencies (if not already done from the repository root via `pnpm install`):
    ```bash
    pnpm install
    ```
4.  Execute the interactive example runner:
    ```bash
    pnpm start
    ```
    This will launch a menu, enabling you to select and run individual examples. Ensure your `.env` file (configured as per "Environment Configuration") is located at the **root of the repository** for the examples to access the necessary API keys.

## 📈 Project Status and Roadmap

ADK TypeScript is currently in an **alpha development stage**. While core functionalities are operational and can be utilized in projects, users should anticipate potential breaking changes and API refinements as the framework matures based on community feedback and ongoing development.

**Current Milestones Achieved:**
*   ✅ Robust core agent framework and reasoning loop.
*   ✅ Foundational integration with OpenAI, Anthropic, and Google/Gemini LLMs.
*   ✅ Flexible tool system with declarative schema support.
*   ✅ Initial implementation of persistent memory systems.
*   ✅ Basic support for streaming and authentication.

**Active Development Focus:**
*   🚧 Enhancing error handling and diagnostic capabilities.
*   🚧 Improving overall type safety and the developer experience.
*   🚧 Expanding support for provider-specific features and optimizing performance.
*   🚧 Developing more advanced and configurable memory solutions.

**Future Development Goals:**
*   ⬜ Implementation of a comprehensive testing suite for enhanced reliability.
*   ⬜ Performance optimization for high-throughput agent operations.
*   ⬜ Advanced features for streaming control and management.

We encourage users to report issues, suggest features, and contribute to the project via the [GitHub issues page](https://github.com/IQAIcom/adk-ts/issues).

## 🤝 Contributing to ADK TypeScript

Contributions from the open-source community are highly welcome. Whether it involves reporting bugs, proposing new features, enhancing documentation, or submitting code, your input is valuable.

*   **Identify Opportunities:** Review the [GitHub issues page](https://github.com/IQAIcom/adk-ts/issues) for existing tasks or to propose new ideas.
*   **Contribution Guidelines:** Please refer to our [Contributing Guide](CONTRIBUTING.md) for detailed information on the development process, coding standards, and pull request procedures.
*   **Standard Workflow:**
    1.  Fork the repository.
    2.  Create a dedicated branch for your feature or bugfix (e.g., `git checkout -b feature/new-integration` or `fix/memory-leak-issue`).
    3.  Implement your changes and commit them with clear, concise messages.
    4.  Push the branch to your forked repository.
    5.  Submit a Pull Request against the `main` branch of the upstream repository.

## 📜 Licensing

ADK TypeScript is distributed under the [MIT License](LICENSE). Users are permitted to use, modify, and distribute the software in accordance with the license terms.

## 🌟 Support the Project

If ADK TypeScript proves beneficial to your work or if you are enthusiastic about its development, consider starring the project on GitHub. Your support helps increase visibility and encourages continued development.