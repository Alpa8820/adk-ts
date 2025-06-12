interface LoggerOpts {
	name: string;
}
export class Logger {
	name: string;
	isDebugEnabled = isDebugEnabled();

	constructor({ name }: LoggerOpts) {
		this.name = name;
	}

	debug(message: string, ...args: any[]) {
		const time = new Date().toLocaleDateString();

		if (isDebugEnabled) {
			console.log(`[${time}] 🐛 [DEBUG] ✨ [${this.name}] ${message}`, ...args);
		}
	}
}
export function isDebugEnabled(): boolean {
	return process.env.NODE_ENV === "development" || process.env.DEBUG === "true";
}
