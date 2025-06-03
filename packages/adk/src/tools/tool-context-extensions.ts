import type { ToolContext } from "./tool-context";

// Extend the ToolContext interface to include the actions property
declare module "./tool-context" {
	interface ToolContext {
		actions?: {
			escalate?: boolean;
			skip_summarization?: boolean;
			transfer_to_agent?: string;
		};
	}
}
