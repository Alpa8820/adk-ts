import type { CallbackContext } from "../agents/callback-context";
import type { ReadonlyContext } from "../agents/readonly-context";
import type { LLMRequest } from "../models/llm-request";

// Import Part type from google/genai for compatibility
// For now, we'll use a generic interface that can be made compatible later
export interface Part {
	text?: string;
	[key: string]: any;
}

/**
 * Abstract base class for all planners.
 *
 * The planner allows the agent to generate plans for the queries to guide its action.
 */
export abstract class BasePlanner {
	/**
	 * Builds the system instruction to be appended to the LLM request for planning.
	 *
	 * @param readonlyContext The readonly context of the invocation
	 * @param llmRequest The LLM request. Readonly.
	 * @returns The planning system instruction, or undefined if no instruction is needed
	 */
	abstract buildPlanningInstruction(
		readonlyContext: ReadonlyContext,
		llmRequest: LLMRequest,
	): string | undefined;

	/**
	 * Processes the LLM response for planning.
	 *
	 * @param callbackContext The callback context of the invocation
	 * @param responseParts The LLM response parts. Readonly.
	 * @returns The processed response parts, or undefined if no processing is needed
	 */
	abstract processPlanningResponse(
		callbackContext: CallbackContext,
		responseParts: Part[],
	): Part[] | undefined;
}
