/**
 * Represents a part/content that's compatible with google.genai types.Part
 */
export interface Part {
	/**
	 * Text content of the part
	 */
	text?: string;

	/**
	 * Whether this part represents a thought (used by PlanReActPlanner)
	 */
	thought?: boolean;

	/**
	 * Additional properties for extensibility
	 */
	[key: string]: any;
}
