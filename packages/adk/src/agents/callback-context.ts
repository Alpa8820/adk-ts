import { EventActions } from "../events/event-actions";
import { State } from "../sessions/state";
import { ReadonlyContext } from "./readonly-context";
import type { InvocationContext } from "./invocation-context";

// Type for representing a generic part/content
// This will be compatible with google.genai types.Part
export interface Part {
	text?: string;
	// Add other part types as needed (image, function_call, etc.)
	[key: string]: any;
}

/**
 * The context of various callbacks within an agent run
 */
export class CallbackContext extends ReadonlyContext {
	private _eventActions: EventActions;
	private _state: State;

	/**
	 * Constructor for CallbackContext
	 */
	constructor(
		invocationContext: InvocationContext,
		options: {
			eventActions?: EventActions;
		} = {},
	) {
		super(invocationContext);

		this._eventActions = options.eventActions || new EventActions();

		// Create delta-aware state combining session state with event actions
		// For now, use metadata as the base state until we have proper session.state
		this._state = new State({
			value: this._invocationContext.metadata,
			delta: this._eventActions.stateDelta,
		});
	}

	/**
	 * The delta-aware state of the current session.
	 * For any state change, you can mutate this object directly,
	 * e.g. `ctx.state.set('foo', 'bar')`
	 */
	override get state(): State {
		return this._state;
	}

	/**
	 * Loads an artifact attached to the current session
	 * @param filename The filename of the artifact
	 * @param version The version of the artifact. If undefined, the latest version will be returned
	 * @returns The artifact
	 */
	async loadArtifact(
		filename: string,
		version?: number,
	): Promise<Part | undefined> {
		// TODO: Implement when BaseArtifactService is available
		throw new Error("Artifact service is not implemented yet.");
	}

	/**
	 * Saves an artifact and records it as delta for the current session
	 * @param filename The filename of the artifact
	 * @param artifact The artifact to save
	 * @returns The version of the artifact
	 */
	async saveArtifact(filename: string, artifact: Part): Promise<number> {
		// TODO: Implement when BaseArtifactService is available
		// Record the artifact change in event actions for now
		this._eventActions.artifactDelta[filename] = 1;

		throw new Error("Artifact service is not implemented yet.");
	}

	/**
	 * Gets the event actions associated with this context
	 * @returns The event actions
	 */
	get eventActions(): EventActions {
		return this._eventActions;
	}
}
