import type { Session } from "..";
import type { InvocationContext } from "../agents/invocation-context";
import type { AuthHandler } from "../auth/auth-handler";
import type {
	SearchMemoryOptions,
	SearchMemoryResponse,
} from "../memory/base-memory-service";
import type { Message } from "../models/llm-request";
import type { Part } from "@google/genai";

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
 * Context for tool execution
 */
export class ToolContext implements IToolContext {
	/**
	 * The parent invocation context
	 */
	private invocationContext: InvocationContext;

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
	constructor(options: {
		invocationContext: InvocationContext;
		auth?: AuthHandler;
		parameters?: Record<string, any>;
	}) {
		this.invocationContext = options.invocationContext;
		this.auth = options.auth;
		this.parameters = options.parameters || {};
		this._variables = new Map<string, any>();
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

	// Delegate to invocation context
	get sessionId(): string {
		return this.invocationContext.sessionId;
	}
	get messages() {
		return this.invocationContext.messages;
	}
	get config() {
		return this.invocationContext.config;
	}
	get userId() {
		return this.invocationContext.userId;
	}
	get appName() {
		return this.invocationContext.appName;
	}
	get memoryService() {
		return this.invocationContext.memoryService;
	}
	get sessionService() {
		return this.invocationContext.sessionService;
	}
	get artifactService() {
		return this.invocationContext.artifactService;
	}
	get metadata() {
		return this.invocationContext.metadata;
	}

	// Variable management
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

	// Delegate session operations
	addMessage(message: Message): void {
		this.invocationContext.addMessage(message);
	}
	async loadSession(): Promise<Session | undefined> {
		return this.invocationContext.loadSession();
	}
	async saveSession(): Promise<Session | undefined> {
		return this.invocationContext.saveSession();
	}
	async searchMemory(
		query: string,
		options?: SearchMemoryOptions,
	): Promise<SearchMemoryResponse> {
		return this.invocationContext.searchMemory(query, options);
	}

	async saveArtifact(filename: string, artifact: Part): Promise<number> {
		if (!this.artifactService) {
			throw new Error("Artifact service not available");
		}
		if (!this.userId || !this.appName) {
			throw new Error("User ID and app name required for artifacts");
		}

		return await this.artifactService.saveArtifact({
			appName: this.appName,
			userId: this.userId,
			sessionId: this.sessionId,
			filename,
			artifact,
		});
	}

	async loadArtifact(filename: string, version?: number): Promise<Part | null> {
		if (!this.artifactService) {
			throw new Error("Artifact service not available");
		}
		if (!this.userId || !this.appName) {
			throw new Error("User ID and app name required for artifacts");
		}

		return await this.artifactService.loadArtifact({
			appName: this.appName,
			userId: this.userId,
			sessionId: this.sessionId,
			filename,
			version,
		});
	}

	async listArtifacts(): Promise<string[]> {
		if (!this.artifactService) {
			throw new Error("Artifact service not available");
		}
		if (!this.userId || !this.appName) {
			throw new Error("User ID and app name required for artifacts");
		}

		return await this.artifactService.listArtifactKeys({
			appName: this.appName,
			userId: this.userId,
			sessionId: this.sessionId,
		});
	}

	async deleteArtifact(filename: string): Promise<void> {
		if (!this.artifactService) {
			throw new Error("Artifact service not available");
		}
		if (!this.userId || !this.appName) {
			throw new Error("User ID and app name required for artifacts");
		}

		return await this.artifactService.deleteArtifact({
			appName: this.appName,
			userId: this.userId,
			sessionId: this.sessionId,
			filename,
		});
	}

	async listArtifactVersions(filename: string): Promise<number[]> {
		if (!this.artifactService) {
			throw new Error("Artifact service not available");
		}
		if (!this.userId || !this.appName) {
			throw new Error("User ID and app name required for artifacts");
		}

		return await this.artifactService.listVersions({
			appName: this.appName,
			userId: this.userId,
			sessionId: this.sessionId,
			filename,
		});
	}
}
