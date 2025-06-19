import type {
	BaseMemoryService,
	SearchMemoryOptions,
	SearchMemoryResponse,
} from "../memory/base-memory-service";
import type { Message } from "../models/llm-request";
import type { SessionService } from "../sessions/base-session-service";
import type { Session } from "../sessions/session";
import type { BaseArtifactService } from "../artifacts/base-artifact-service";
import type { Part } from "@google/genai";
import { RunConfig } from "./run-config";

/**
 * Contextual data for a specific agent invocation
 */
export class InvocationContext {
	/**
	 * Unique session ID for the current conversation
	 */
	sessionId: string;

	/**
	 * Current conversation history
	 */
	messages: Message[];

	/**
	 * Run configuration
	 */
	config: RunConfig;

	/**
	 * User identifier associated with the session
	 */
	userId?: string;

	/**
	 * Application name (for multi-app environments)
	 */
	appName?: string;

	/**
	 * Memory service for long-term storage
	 */
	memoryService?: BaseMemoryService;

	/**
	 * Session service for session management
	 */
	sessionService?: SessionService;

	/**
	 * Artifact service for file storage
	 */
	artifactService?: BaseArtifactService;

	/**
	 * Additional context metadata
	 */
	metadata: Record<string, any>;

	/**
	 * Variables stored in the context
	 */
	private variables: Map<string, any>;

	/**
	 * In-memory storage for node execution results
	 */
	memory: Map<string, any> = new Map<string, any>();

	/**
	 * Constructor for InvocationContext
	 */
	constructor(
		options: {
			sessionId?: string;
			messages?: Message[];
			config?: RunConfig;
			userId?: string;
			appName?: string;
			memoryService?: BaseMemoryService;
			sessionService?: SessionService;
			artifactService?: BaseArtifactService;
			metadata?: Record<string, any>;
		} = {},
	) {
		this.sessionId = options.sessionId || this.generateSessionId();
		this.messages = options.messages || [];
		this.config = options.config || new RunConfig();
		this.userId = options.userId;
		this.appName = options.appName;
		this.memoryService = options.memoryService;
		this.sessionService = options.sessionService;
		this.artifactService = options.artifactService;
		this.metadata = options.metadata || {};
		this.variables = new Map<string, any>();
	}

	/**
	 * Generates a unique session ID
	 */
	private generateSessionId(): string {
		return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	/**
	 * Sets a variable in the context
	 */
	setVariable(name: string, value: any): void {
		this.variables.set(name, value);
	}

	/**
	 * Gets a variable from the context
	 */
	getVariable<T>(name: string, defaultValue?: T): T | undefined {
		return (
			this.variables.has(name) ? this.variables.get(name) : defaultValue
		) as T | undefined;
	}

	/**
	 * Adds a message to the conversation history
	 */
	addMessage(message: Message): void {
		this.messages.push(message);
	}

	/**
	 * Creates a new context with the same configuration but empty message history
	 */
	createChildContext(): InvocationContext {
		return new InvocationContext({
			sessionId: this.sessionId,
			config: this.config,
			userId: this.userId,
			appName: this.appName,
			memoryService: this.memoryService,
			sessionService: this.sessionService,
			artifactService: this.artifactService,
			metadata: { ...this.metadata },
		});
	}

	/**
	 * Creates a tool context that provides artifact methods to function tools
	 */
	createToolContext(): any {
		return {
			// Artifact methods
			saveArtifact: async (
				filename: string,
				artifact: Part,
			): Promise<number> => {
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
			},

			loadArtifact: async (
				filename: string,
				version?: number,
			): Promise<Part | null> => {
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
			},

			listArtifacts: async (): Promise<string[]> => {
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
			},

			deleteArtifact: async (filename: string): Promise<void> => {
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
			},

			listArtifactVersions: async (filename: string): Promise<number[]> => {
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
			},
		};
	}

	/**
	 * Loads a session from the session service
	 * @returns The loaded session or undefined if not found
	 */
	async loadSession(): Promise<Session | undefined> {
		if (!this.sessionService) {
			return undefined;
		}

		return await this.sessionService.getSession(this.sessionId);
	}

	/**
	 * Saves the current conversation to a session
	 * @returns The saved session
	 */
	async saveSession(): Promise<Session | undefined> {
		if (!this.sessionService || !this.userId) {
			return undefined;
		}

		// Get existing session or create a new one
		let session = await this.sessionService.getSession(this.sessionId);

		if (!session) {
			// Create a new session
			session = await this.sessionService.createSession(
				this.userId,
				this.metadata,
			);
			this.sessionId = session.id;
		}

		// Update session with current messages
		session.messages = [...this.messages];
		session.metadata = { ...this.metadata };
		session.updatedAt = new Date();

		// Save state variables
		Object.entries(this.variables).forEach(([key, value]) => {
			session?.state.set(key, value);
		});

		// Update the session
		await this.sessionService.updateSession(session);

		// If we have a memory service, add to memory
		if (this.memoryService) {
			await this.memoryService.addSessionToMemory(session);
		}

		return session;
	}

	/**
	 * Searches memory for relevant information
	 * @param query The search query
	 * @param options Search options
	 * @returns Search results or empty response if no memory service
	 */
	async searchMemory(
		query: string,
		options?: SearchMemoryOptions,
	): Promise<SearchMemoryResponse> {
		if (!this.memoryService) {
			return { memories: [] };
		}

		// If no session ID provided in options, use the current session ID
		const searchOptions = {
			...options,
			sessionId: options?.sessionId || this.sessionId,
		};

		return await this.memoryService.searchMemory(query, searchOptions);
	}
}
