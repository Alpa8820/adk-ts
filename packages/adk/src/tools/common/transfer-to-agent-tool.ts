import { debugLog } from "@adk/lib/debug";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";
import "../tool-context-extensions";

/**
 * Tool that allows an agent to transfer control to another agent
 */
export class TransferToAgentTool extends BaseTool {
	/**
	 * Constructor for TransferToAgentTool
	 */
	constructor() {
		super({
			name: "transfer_to_agent",
			description: "Transfer the question to another agent.",
		});
	}

	/**
	 * Get the function declaration for the tool
	 */
	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: "object",
				properties: {
					agent_name: {
						type: "string",
						description: "Name of the agent to transfer to",
					},
				},
				required: ["agent_name"],
			},
		};
	}

	/**
	 * Execute the transfer to agent action
	 */
	async runAsync(
		args: {
			agent_name: string;
		},
		context: ToolContext,
	): Promise<any> {
		debugLog(
			`[TransferToAgentTool] Executing transfer to agent: ${args.agent_name}`,
		);

		// Set the transfer_to_agent flag with the agent name
		if (context.actions) {
			context.actions.transfer_to_agent = args.agent_name;
		} else {
			// Initialize the actions object if it doesn't exist
			context.actions = {
				transfer_to_agent: args.agent_name,
			};
		}

		return {
			message: `Transferred to agent: ${args.agent_name}`,
		};
	}
}
