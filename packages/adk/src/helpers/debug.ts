export const isDebugEnabled = (): boolean => {
	return process.env.NODE_ENV === "development" || process.env.DEBUG === "true";
};

export const debugLog = (message: string, ...args: any[]): void => {
	const time = new Date().toLocaleTimeString();
	if (isDebugEnabled()) {
		console.log(`[DEBUG] ${time}: ${message}`, ...args);
	}
};
