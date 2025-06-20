import type { Part } from "@google/genai";
import { CallbackContext } from "../agents/callback-context";
import type { InvocationContext } from "../agents/invocation-context";
import type { AuthHandler } from "../auth/auth-handler";
import type { EventActions } from "../events/event-actions";
import type {
	BaseMemoryService,
	SearchMemoryResponse,
} from "../memory/base-memory-service";

/**
 * Context for tool execution
 */
export interface IToolContext {
	/**
	 * Name of the tool being executed
	 */
	toolName: string;

	/**
	 * ID of the tool call
	 */
	toolId: string;

	/**
	 * Additional parameters for the tool
	 */
	parameters: Record<string, any>;

	/**
	 * Gets a parameter value
	 */
	getParameter<T>(name: string, defaultValue?: T): T | undefined;

	/**
	 * Sets a parameter value
	 */
	setParameter(name: string, value: any): void;
}

/**
 * The context of the tool.
 *
 * This class provides the context for a tool invocation, including access to
 * the invocation context, function call ID, event actions, and authentication
 * response. It also provides methods for requesting credentials, retrieving
 * authentication responses, listing artifacts, and searching memory.
 */
export class ToolContext extends CallbackContext implements IToolContext {
	/**
	 * The function call id of the current tool call. This id was
	 * returned in the function call event from LLM to identify a function call.
	 * If LLM didn't return this id, ADK will assign one to it. This id is used
	 * to map function call response to the original function call.
	 */
	functionCallId?: string;

	/**
	 * Authentication handler for the tool
	 */
	auth?: AuthHandler;

	/**
	 * Additional parameters for the tool
	 */
	parameters: Record<string, any>;

	/**
	 * Tool name
	 */
	toolName = "";

	/**
	 * Tool ID
	 */
	toolId = "";

	/**
	 * Variables stored in the context
	 */
	private _variables: Map<string, any>;

	/**
	 * Constructor for ToolContext
	 */
	constructor(
		invocationContext: InvocationContext,
		options: {
			functionCallId?: string;
			eventActions?: EventActions;
			auth?: AuthHandler;
			parameters?: Record<string, any>;
		} = {},
	) {
		super(invocationContext, { eventActions: options.eventActions });

		this.functionCallId = options.functionCallId;
		this.auth = options.auth;
		this.parameters = options.parameters || {};
		this._variables = new Map<string, any>();
	}

	/**
	 * Gets the event actions of the current tool call
	 */
	get actions(): EventActions {
		return this.eventActions;
	}

	/**
	 * Gets a parameter value
	 */
	getParameter<T>(name: string, defaultValue?: T): T | undefined {
		return name in this.parameters
			? (this.parameters[name] as T)
			: defaultValue;
	}

	/**
	 * Sets a parameter value
	 */
	setParameter(name: string, value: any): void {
		this.parameters[name] = value;
	}

	/**
	 * Requests authentication credentials
	 */
	requestCredential(authConfig: any): void {
		if (!this.functionCallId) {
			throw new Error("function_call_id is not set.");
		}

		// TODO: Implement proper auth handling when AuthHandler is available
		console.warn(
			"requestCredential not fully implemented - auth system pending",
		);
	}

	/**
	 * Gets authentication response
	 */
	getAuthResponse(authConfig: any): any {
		// TODO: Implement proper auth handling when AuthHandler is available
		console.warn("getAuthResponse not fully implemented - auth system pending");
		return null;
	}

	/**
	 * Lists the filenames of the artifacts attached to the current session
	 */
	async listArtifacts(): Promise<string[]> {
		if (!this._invocationContext.artifactService) {
			throw new Error("Artifact service is not initialized.");
		}

		return await this._invocationContext.artifactService.listArtifactKeys({
			appName: this._invocationContext.appName,
			userId: this._invocationContext.userId,
			sessionId: this._invocationContext.session.id,
		});
	}

	/**
	 * Searches the memory of the current user
	 */
	async searchMemory(query: string): Promise<SearchMemoryResponse> {
		if (!this._invocationContext.memoryService) {
			throw new Error("Memory service is not available.");
		}

		return await this._invocationContext.memoryService.searchMemory({
			query,
			appName: this._invocationContext.appName,
			userId: this._invocationContext.userId,
		});
	}

	// Variable management (inherited from original implementation)
	get variables(): Map<string, any> {
		return this._variables;
	}

	setVariable(name: string, value: any): void {
		this._variables.set(name, value);
	}

	getVariable<T>(name: string, defaultValue?: T): T | undefined {
		return (
			this._variables.has(name) ? this._variables.get(name) : defaultValue
		) as T | undefined;
	}

	// Artifact methods (delegated to parent CallbackContext)
	async saveArtifact(filename: string, artifact: Part): Promise<number> {
		return await super.saveArtifact(filename, artifact);
	}

	async loadArtifact(
		filename: string,
		version?: number,
	): Promise<Part | undefined> {
		return await super.loadArtifact(filename, version);
	}

	// Legacy methods for backward compatibility
	async saveArtifactLegacy(filename: string, artifact: Part): Promise<number> {
		if (!this._invocationContext.artifactService) {
			throw new Error("Artifact service not available");
		}
		if (!this._invocationContext.userId || !this._invocationContext.appName) {
			throw new Error("User ID and app name required for artifacts");
		}

		return await this._invocationContext.artifactService.saveArtifact({
			appName: this._invocationContext.appName,
			userId: this._invocationContext.userId,
			sessionId: this._invocationContext.session.id,
			filename,
			artifact,
		});
	}

	async loadArtifactLegacy(
		filename: string,
		version?: number,
	): Promise<Part | null> {
		if (!this._invocationContext.artifactService) {
			throw new Error("Artifact service not available");
		}
		if (!this._invocationContext.userId || !this._invocationContext.appName) {
			throw new Error("User ID and app name required for artifacts");
		}

		return await this._invocationContext.artifactService.loadArtifact({
			appName: this._invocationContext.appName,
			userId: this._invocationContext.userId,
			sessionId: this._invocationContext.session.id,
			filename,
			version,
		});
	}

	async deleteArtifact(filename: string): Promise<void> {
		if (!this._invocationContext.artifactService) {
			throw new Error("Artifact service not available");
		}
		if (!this._invocationContext.userId || !this._invocationContext.appName) {
			throw new Error("User ID and app name required for artifacts");
		}

		return await this._invocationContext.artifactService.deleteArtifact({
			appName: this._invocationContext.appName,
			userId: this._invocationContext.userId,
			sessionId: this._invocationContext.session.id,
			filename,
		});
	}

	async listArtifactVersions(filename: string): Promise<number[]> {
		if (!this._invocationContext.artifactService) {
			throw new Error("Artifact service not available");
		}
		if (!this._invocationContext.userId || !this._invocationContext.appName) {
			throw new Error("User ID and app name required for artifacts");
		}

		return await this._invocationContext.artifactService.listVersions({
			appName: this._invocationContext.appName,
			userId: this._invocationContext.userId,
			sessionId: this._invocationContext.session.id,
			filename,
		});
	}
}
