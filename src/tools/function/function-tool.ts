import { BaseTool } from "../base/base-tool";
import type { FunctionDeclaration } from "../../models/request/function-declaration";
import type { ToolContext } from "../../models/context/tool-context";
import { buildFunctionDeclaration } from "./function-utils";

/**
 * A tool that wraps a user-defined TypeScript function.
 *
 * This tool automatically generates a function declaration from the function's
 * signature and documentation, making it easy to expose functions to agents.
 */
export class FunctionTool<T extends Record<string, any>> extends BaseTool {
	private func: (...args: any[]) => any;
	private mandatoryArgs: string[] = [];

	/**
	 * Creates a new FunctionTool wrapping the provided function.
	 *
	 * @param func The function to wrap
	 * @param options Optional configuration for the tool
	 */
	constructor(
		func: (...args: any[]) => any,
		options?: {
			name?: string;
			description?: string;
			isLongRunning?: boolean;
			shouldRetryOnFailure?: boolean;
			maxRetryAttempts?: number;
		},
	) {
		const name = options?.name || func.name;
		const description =
			options?.description ||
			(func.toString().match(/\/\*\*([\s\S]*?)\*\//) || [])[1]?.trim() ||
			"";

		super({
			name,
			description,
			isLongRunning: options?.isLongRunning || false,
			shouldRetryOnFailure: options?.shouldRetryOnFailure || false,
			maxRetryAttempts: options?.maxRetryAttempts || 3,
		});

		this.func = func;
		this.mandatoryArgs = this.getMandatoryArgs(func);
	}

	/**
	 * Executes the wrapped function with the provided arguments.
	 */
	async runAsync(args: T, context: ToolContext): Promise<any> {
		try {
			// Check for missing mandatory arguments
			const missingArgs = this.getMissingMandatoryArgs(args);
			if (missingArgs.length > 0) {
				const missingArgsStr = missingArgs.join("\n");
				return {
					error: `Invoking \`${this.name}()\` failed as the following mandatory input parameters are not present:
${missingArgsStr}
You could retry calling this tool, but it is IMPORTANT for you to provide all the mandatory parameters.`,
				};
			}

			// Add context if needed
			const argsToCall = { ...args } as Record<string, any>;
			if (this.functionAcceptsToolContext()) {
				argsToCall.toolContext = context;
			}

			// Call the function
			if (this.isAsyncFunction(this.func)) {
				return (await this.func(argsToCall)) || {};
			}

			return this.func(argsToCall) || {};
		} catch (error) {
			return {
				error: `Error executing function ${this.name}: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Returns the function declaration for this tool.
	 */
	getDeclaration(): FunctionDeclaration {
		return buildFunctionDeclaration(this.func, {
			name: this.name,
			description: this.description,
			ignoreParams: ["toolContext"],
		});
	}

	/**
	 * Checks if the wrapped function accepts a toolContext parameter.
	 */
	private functionAcceptsToolContext(): boolean {
		const funcStr = this.func.toString();
		return funcStr.includes("toolContext") || funcStr.includes("context");
	}

	/**
	 * Checks if the wrapped function is async.
	 */
	private isAsyncFunction(func: (...args: any[]) => any): boolean {
		return func.constructor.name === "AsyncFunction";
	}

	/**
	 * Extracts the mandatory arguments from a function.
	 * In TypeScript, we can't easily inspect parameter defaults at runtime,
	 * so this is a best-effort approach.
	 */
	private getMandatoryArgs(func: (...args: any[]) => any): string[] {
		const funcStr = func.toString();

		// Extract parameter list from function string
		const paramMatch = funcStr.match(/\(([^)]*)\)/);
		if (!paramMatch) return [];

		const paramList = paramMatch[1].split(",");

		// Parameters without "=" are considered mandatory
		return paramList
			.map((param) => param.trim())
			.filter((param) => !param.includes("=") && param !== "")
			.map((param) => {
				// Handle destructuring, type annotations, etc.
				const nameMatch = param.match(/^(\w+)(?:\s*:[^=]+)?$/);
				return nameMatch ? nameMatch[1] : param;
			})
			.filter((param) => param !== "toolContext" && param !== "context");
	}

	/**
	 * Checks which mandatory arguments are missing from the provided args.
	 */
	private getMissingMandatoryArgs(args: T): string[] {
		return this.mandatoryArgs.filter((arg) => !(arg in args));
	}
}
