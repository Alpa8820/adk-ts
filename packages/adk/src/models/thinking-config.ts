/**
 * Configuration for model built-in thinking features
 * Compatible with google.genai.types.ThinkingConfig
 */
export interface ThinkingConfig {
	/**
	 * Whether to include the thinking process in the response
	 */
	includeThinking?: boolean;

	/**
	 * Additional thinking configuration options
	 */
	[key: string]: any;
}
