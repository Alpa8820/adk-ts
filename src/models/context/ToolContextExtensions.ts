// Extend the ToolContext interface to include the actions property
declare module "./ToolContext" {
	interface ToolContext {
		actions?: {
			escalate?: boolean;
			skip_summarization?: boolean;
		};
	}
}
