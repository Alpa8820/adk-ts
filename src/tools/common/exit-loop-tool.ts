import type { ToolContext } from "../tool-context";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import "../tool-context-extensions";

/**
 * Tool that allows an agent to exit the current execution loop
 */
export class ExitLoopTool extends BaseTool {
	/**
	 * Constructor for ExitLoopTool
	 */
	constructor() {
		super({
			name: "exit_loop",
			description:
				"Exits the loop. Call this function only when you are instructed to do so.",
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
				properties: {},
				required: [],
			},
		};
	}

	/**
	 * Execute the exit loop action
	 */
	async runAsync(
		_args: Record<string, any>,
		context: ToolContext,
	): Promise<any> {
		if (process.env.DEBUG === "true") {
			console.log("Executing exit loop tool");
		}

		// Set the escalate flag to true to indicate that the loop should exit
		if (context.actions) {
			context.actions.escalate = true;
		} else {
			// Initialize the actions object if it doesn't exist
			context.actions = {
				escalate: true,
			};
		}

		return {
			message: "Loop exited successfully",
		};
	}
}
