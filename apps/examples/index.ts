import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as p from "@clack/prompts";
import * as dotenv from "dotenv";

// Get all example directories and files
const examplesDir = path.resolve(__dirname);
const turborepoRoot = path.resolve(__dirname, "..", ".."); // Go up to turborepo root
const examples: { name: string; path: string }[] = [];

dotenv.config({ path: path.resolve(examplesDir, ".env") });

// Helper function to get all example files
function getExampleFiles(dir: string) {
	const items = fs.readdirSync(dir);

	for (const item of items) {
		// Skip these files
		if (item === "index.ts" || item === "run.ts") continue;

		const itemPath = path.join(dir, item);
		const stat = fs.statSync(itemPath);

		if (stat.isDirectory()) {
			// Check if directory contains an index.ts file
			const indexPath = path.join(itemPath, "index.ts");
			if (fs.existsSync(indexPath)) {
				examples.push({
					name: item,
					path: path.relative(examplesDir, indexPath),
				});
			}
		} else if (
			stat.isFile() &&
			(item.endsWith("-example.ts") || item.endsWith(".ts"))
		) {
			// Add standalone example files
			examples.push({
				name: item.replace(".ts", ""),
				path: path.relative(examplesDir, itemPath),
			});
		}
	}
}

// Get all examples
getExampleFiles(examplesDir);

// Sort examples alphabetically
examples.sort((a, b) => a.name.localeCompare(b.name));

async function main() {
	p.intro("ADK Examples Runner");
	console.log("Select an example to run:\n");

	const selectedExample = await p.select({
		message: "Choose an example to run:",
		options: examples.map((example) => ({
			label: example.name,
			value: example,
		})),
	});

	if (p.isCancel(selectedExample)) {
		p.cancel("Operation cancelled");
		process.exit(0);
	}

	console.log(`\nRunning example: ${selectedExample.name}\n`);

	const examplePath = path.resolve(examplesDir, selectedExample.path);

	// Use pnpm exec tsx - this is the most reliable approach in turborepo
	const exampleProcess = spawn("pnpm", ["exec", "tsx", examplePath], {
		stdio: "inherit",
		shell: process.platform === "win32", // Use shell only on Windows
		cwd: turborepoRoot, // Run from turborepo root so pnpm workspace resolution works
		env: {
			...process.env,
		},
	});

	exampleProcess.on("error", (error) => {
		console.error("Failed to start example process:", error);
		console.log("Make sure tsx is installed. Try running: pnpm add -D tsx");
		process.exit(1);
	});

	exampleProcess.on("close", (code) => {
		if (code === 0) {
			p.outro(`Example finished successfully (code ${code})`);
		} else {
			console.log(`\nExample finished with error code ${code}`);
			process.exit(code || 1);
		}
	});
}

main().catch((error) => {
	console.error("Error running example:", error);
	process.exit(1);
});
