import { execFile } from "node:child_process";

/**
 * Result of executing a command safely
 */
export interface ExecFileResult {
  /** Whether the command executed successfully */
  success: boolean;
  /** Standard output from the command */
  stdout: string;
  /** Standard error from the command */
  stderr: string;
  /** Exit code of the process, null if timed out */
  exitCode: number | null;
}

/**
 * Options for executing commands
 */
export interface ExecFileOptions {
  /** Working directory for the command */
  cwd?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Text encoding (default: 'utf8') */
  encoding?: BufferEncoding;
}

/**
 * Safely executes a command using execFile to prevent command injection
 * @param command - Command to execute
 * @param args - Command arguments (default: empty array)
 * @param options - Execution options
 * @returns Promise resolving to execution result
 */
export async function execFileNoThrow(
	command: string,
	args: string[] = [],
	options: ExecFileOptions = {},
): Promise<ExecFileResult> {
	return new Promise((resolve) => {
		const {
			cwd = process.cwd(),
			timeout = 30_000,
			encoding = "utf8",
		} = options;

		let stdout = "";
		let timeoutId: NodeJS.Timeout | null = null;

		const child = execFile(command, args, {
			cwd,
			encoding,
			timeout,
		}, (error, stdoutBuffer, stderrBuffer) => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			const result: ExecFileResult = {
				success: !error,
				stdout: stdoutBuffer,
				stderr: stderrBuffer,
				exitCode: typeof error?.code === "number" ? error.code : 0,
			};

			resolve(result);
		});

		// Stream stdout
		if (child.stdout) {
			child.stdout.on("data", (data: string) => {
				stdout += data;
			});
		}

		// Stream stderr (not accumulated, but listener needed for proper process handling)
		if (child.stderr) {
			child.stderr.on("data", () => { /* noop */ });
		}

		// Set up timeout
		if (timeout && timeout > 0) {
			timeoutId = setTimeout(() => {
				child.kill("SIGTERM");
				resolve({
					success: false,
					stdout,
					stderr: `Command timed out after ${timeout}ms`,
					exitCode: null,
				});
			}, timeout);
		}
	});
}

/**
 * Executes an npm command with validation
 * @param subcommand - npm subcommand to execute
 * @param args - Additional arguments for the command (default: empty array)
 * @param options - Execution options
 * @returns Promise resolving to execution result
 */
export function npmCommand(
	subcommand: string,
	args: string[] = [],
	options?: ExecFileOptions,
): Promise<ExecFileResult> {
	const validNpmCommands = [
		"install", "run", "build", "test", "start", "serve",
		"pack", "publish", "update", "audit", "ls", "view",
	];

	if (!validNpmCommands.includes(subcommand)) {
		return Promise.resolve({
			success: false,
			stdout: "",
			stderr: `Invalid npm command: ${subcommand}`,
			exitCode: 1,
		});
	}

	return execFileNoThrow("npm", [subcommand, ...args], options);
}