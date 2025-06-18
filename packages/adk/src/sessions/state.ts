/**
 * Represents the state of a session
 */
export class SessionState {
	private state: Map<string, any>;
	private dirty: Set<string>;

	constructor() {
		this.state = new Map<string, any>();
		this.dirty = new Set<string>();
	}

	/**
	 * Sets a value in the state
	 * @param key The key to set
	 * @param value The value to set
	 */
	set(key: string, value: any): void {
		this.state.set(key, value);
		this.dirty.add(key);
	}

	/**
	 * Gets a value from the state
	 * @param key The key to get
	 * @returns The value or undefined if not present
	 */
	get<T>(key: string): T | undefined {
		return this.state.get(key) as T | undefined;
	}

	/**
	 * Checks if the state has a key
	 * @param key The key to check
	 * @returns Whether the key exists
	 */
	has(key: string): boolean {
		return this.state.has(key);
	}

	/**
	 * Deletes a key from the state
	 * @param key The key to delete
	 * @returns Whether the key was deleted
	 */
	delete(key: string): boolean {
		if (this.state.has(key)) {
			this.state.delete(key);
			this.dirty.add(key);
			return true;
		}
		return false;
	}

	/**
	 * Checks if state has changed since last save
	 * @returns Whether the state has been modified
	 */
	hasDelta(): boolean {
		return this.dirty.size > 0;
	}

	/**
	 * Clears the dirty state
	 */
	clearDelta(): void {
		this.dirty.clear();
	}

	/**
	 * Converts the state to a plain object
	 */
	toObject(): Record<string, any> {
		const result: Record<string, any> = {};
		this.state.forEach((value, key) => {
			result[key] = value;
		});
		return result;
	}

	/**
	 * Creates a state from a plain object
	 * @param obj The object to load
	 */
	static fromObject(obj: Record<string, any>): SessionState {
		const state = new SessionState();
		Object.entries(obj).forEach(([key, value]) => {
			state.state.set(key, value);
		});
		return state;
	}
}

/**
 * Delta-aware state that combines session state with event action deltas
 * This is different from SessionState and is used in CallbackContext
 */
export class State {
	private baseValue: Record<string, any>;
	private delta: Record<string, any>;

	/**
	 * Constructor for State
	 */
	constructor(options: {
		value: Record<string, any>;
		delta: Record<string, any>;
	}) {
		this.baseValue = { ...options.value };
		this.delta = { ...options.delta };
	}

	/**
	 * Gets a value from the combined state (base + delta)
	 * @param key The key to get
	 * @returns The value or undefined if not present
	 */
	get<T>(key: string): T | undefined {
		// Delta takes precedence over base value
		if (key in this.delta) {
			return this.delta[key] as T;
		}
		return this.baseValue[key] as T | undefined;
	}

	/**
	 * Sets a value in the delta state
	 * @param key The key to set
	 * @param value The value to set
	 */
	set(key: string, value: any): void {
		this.delta[key] = value;
	}

	/**
	 * Checks if the state has a key (in either base or delta)
	 * @param key The key to check
	 * @returns Whether the key exists
	 */
	has(key: string): boolean {
		return key in this.delta || key in this.baseValue;
	}

	/**
	 * Deletes a key from the delta state
	 * @param key The key to delete
	 */
	delete(key: string): void {
		this.delta[key] = undefined;
	}

	/**
	 * Gets all keys from both base and delta
	 * @returns Array of all keys
	 */
	keys(): string[] {
		const allKeys = new Set([
			...Object.keys(this.baseValue),
			...Object.keys(this.delta),
		]);
		return Array.from(allKeys);
	}

	/**
	 * Converts the combined state to a plain object
	 * @returns Combined state as object
	 */
	toObject(): Record<string, any> {
		return {
			...this.baseValue,
			...this.delta,
		};
	}

	/**
	 * Gets the delta changes
	 * @returns The delta object
	 */
	getDelta(): Record<string, any> {
		return { ...this.delta };
	}

	/**
	 * Clears the delta changes
	 */
	clearDelta(): void {
		this.delta = {};
	}

	/**
	 * Support for indexing like a dictionary (Python-style)
	 */
	[Symbol.iterator]() {
		const entries = Object.entries(this.toObject());
		let index = 0;
		return {
			next(): IteratorResult<[string, any]> {
				if (index < entries.length) {
					return { value: entries[index++], done: false };
				}
				return { done: true, value: undefined };
			},
		};
	}
}
