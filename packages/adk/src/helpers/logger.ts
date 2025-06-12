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
		const time = new Date().toISOString();

		if (this.isDebugEnabled) {
			console.log(`[${time}] 🐛 [DEBUG] ✨ [${this.name}] ${message}`, ...args);
		}
	}

	info(message: string, ...args: any[]) {
		const time = new Date().toISOString();
		console.info(`[${time}] ℹ️ [INFO] ✨ [${this.name}] ${message}`, ...args);
	}

	warn(message: string, ...args: any[]) {
		const time = new Date().toISOString();
		console.warn(`[${time}] 🚧 [WARN] ✨ [${this.name}] ${message}`, ...args);
	}

	error(message: string, ...args: any[]) {
		const time = new Date().toISOString();
		console.error(`[${time}] ❌ [ERROR] ✨ [${this.name}] ${message}`, ...args);
	}
}
export function isDebugEnabled(): boolean {
	return process.env.NODE_ENV === "development" || process.env.DEBUG === "true";
}
