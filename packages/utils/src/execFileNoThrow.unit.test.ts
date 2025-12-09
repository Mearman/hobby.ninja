/**
 * Comprehensive unit tests for execFileNoThrow utility
 * Tests edge cases, error scenarios, and boundary conditions
 */

/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable sonarjs/no-duplicate-string */

import { execFile } from "node:child_process";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { execFileNoThrow, npmCommand, ExecFileOptions } from "./execFileNoThrow";

// Mock child_process
vi.mock("node:child_process", () => ({
	execFile: vi.fn(),
}));

// Store original process.cwd
const originalCwd = process.cwd;

// Test constants to avoid duplicate string literals
const TEST_CWD = "/test/current/directory";
const TEST_OUTPUT = "test output";
const STDOUT_OUTPUT = "stdout output";

// Test constants that are actually used
const TIMEOUT_1000MS = 1000;
const TIMEOUT_5000MS = 5000;

// Error message constants
const TIMEOUT_1000MS_MESSAGE = "Command timed out after 1000ms";
const TIMEOUT_5000MS_MESSAGE = "Command timed out after 5000ms";

// Helper to create a mock child process
function createMockChildProcess() {
	return {
		stdout: { on: vi.fn() },
		stderr: { on: vi.fn() },
		kill: vi.fn(),
	};
}

describe("execFileNoThrow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock process.cwd
		process.cwd = vi.fn().mockReturnValue(TEST_CWD);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		process.cwd = originalCwd;
	});

	describe("Basic functionality", () => {
		it("should execute successful command and return success result", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, STDOUT_OUTPUT, "");
				return createMockChildProcess();
			});

			const result = await execFileNoThrow("echo", ["hello"]);

			expect(result).toEqual({
				success: true,
				stdout: STDOUT_OUTPUT,
				stderr: "",
				exitCode: 0,
			});
			expect(execFile).toHaveBeenCalledWith(
				"echo",
				["hello"],
				expect.objectContaining({ cwd: TEST_CWD }),
				expect.any(Function),
			);
		});

		it("should handle command with no arguments", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, TEST_OUTPUT, "");
				return createMockChildProcess();
			});

			const result = await execFileNoThrow("pwd");

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("test output");
		});

		it("should handle empty args array explicitly", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, TEST_OUTPUT, "");
				return createMockChildProcess();
			});

			const result = await execFileNoThrow("ls", []);

			expect(result.success).toBe(true);
			expect(execFile).toHaveBeenCalledWith(
				"ls",
				[],
				expect.any(Object),
				expect.any(Function),
			);
		});
	});

	describe("Error handling", () => {
		it("should handle command execution errors", async () => {
			const error = new Error("Command not found") as Error & { code?: number };
			error.code = 2;
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(error, "", "Command not found");
				return createMockChildProcess();
			});

			const result = await execFileNoThrow("nonexistent");

			expect(result).toEqual({
				success: false,
				stdout: "",
				stderr: "Command not found",
				exitCode: 2,
			});
		});

		it("should handle error with no exit code", async () => {
			const error = new Error("Unknown error");
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(error, "", "Unknown error");
				return createMockChildProcess();
			});

			const result = await execFileNoThrow("failing-command");

			expect(result.success).toBe(false);
			expect(result.exitCode).toBe(0);
		});

		it("should handle empty stdout and stderr buffers", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(new Error("Test error"), null, null);
				return createMockChildProcess();
			});

			const result = await execFileNoThrow("test");

			expect(result.success).toBe(false);
			expect(result.stdout).toBe("");
			expect(result.stderr).toBe("");
		});

		it("should handle null and undefined callbacks gracefully", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, _callback) => {
				return createMockChildProcess();
			});

			// Test that the Promise resolves without throwing
			const resultPromise = execFileNoThrow("test");
			expect(resultPromise).toBeInstanceOf(Promise);
		});
	});

	describe("Timeout scenarios", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should timeout when command exceeds timeout limit", async () => {
			const mockChildProcess = {
				stdout: {
					on: vi.fn(),
				},
				stderr: {
					on: vi.fn(),
				},
				kill: vi.fn(),
			};

			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, _callback) => {
				// Don't call callback to simulate hanging process
				return mockChildProcess;
			});

			const resultPromise = execFileNoThrow("sleep", ["60"], { timeout: TIMEOUT_1000MS });

			// Fast-forward timers
			vi.advanceTimersByTime(TIMEOUT_1000MS);

			const result = await resultPromise;

			expect(result).toEqual({
				success: false,
				stdout: "",
				stderr: TIMEOUT_1000MS_MESSAGE,
				exitCode: null,
			});
			expect(mockChildProcess.kill).toHaveBeenCalledWith("SIGTERM");
		});

		it("should handle custom timeout values", async () => {
			const mockChildProcess = {
				stdout: {
					on: vi.fn(),
				},
				stderr: {
					on: vi.fn(),
				},
				kill: vi.fn(),
			};

			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, _callback) => {
				return mockChildProcess;
			});

			const resultPromise = execFileNoThrow("long-command", [], { timeout: TIMEOUT_5000MS });

			vi.advanceTimersByTime(TIMEOUT_5000MS);

			const result = await resultPromise;

			expect(result.stderr).toBe(TIMEOUT_5000MS_MESSAGE);
		});

		it("should not timeout when timeout is set to 0", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				setTimeout(() => callback(null, "success", ""), 100);
				return createMockChildProcess();
			});

			const resultPromise = execFileNoThrow("fast-command", [], { timeout: 0 });

			// Fast-forward past the command execution but not long enough for timeout
			vi.advanceTimersByTime(150);

			const result = await resultPromise;

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("success");
		});

		it("should handle negative timeout values", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, "success", "");
				return createMockChildProcess();
			});

			const result = await execFileNoThrow("test", [], { timeout: -1 });

			expect(result.success).toBe(true);
		});
	});

	describe("Options handling", () => {
		it("should use custom working directory", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, "success", "");
				return createMockChildProcess();
			});

			await execFileNoThrow("test", [], { cwd: "/custom/directory" });

			expect(execFile).toHaveBeenCalledWith(
				"test",
				[],
				expect.objectContaining({ cwd: "/custom/directory" }),
				expect.any(Function),
			);
		});

		it("should use default working directory when not specified", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, "success", "");
				return createMockChildProcess();
			});

			await execFileNoThrow("test");

			expect(execFile).toHaveBeenCalledWith(
				"test",
				[],
				expect.objectContaining({ cwd: TEST_CWD }),
				expect.any(Function),
			);
		});

		it("should handle different encoding options", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, "test", "");
				return createMockChildProcess();
			});

			await execFileNoThrow("test", [], { encoding: "utf16le" });

			expect(execFile).toHaveBeenCalledWith(
				"test",
				[],
				expect.objectContaining({ encoding: "utf16le" }),
				expect.any(Function),
			);
		});

		it("should handle empty options object", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, "success", "");
				return createMockChildProcess();
			});

			await execFileNoThrow("test", [], {});

			expect(execFile).toHaveBeenCalledWith(
				"test",
				[],
				expect.objectContaining({
					cwd: TEST_CWD,
					timeout: 30_000,
					encoding: "utf8",
				}),
				expect.any(Function),
			);
		});
	});

	describe("Stream handling", () => {
		it("should accumulate stdout data from streams", async () => {
			const mockChildProcess = {
				stdout: {
					on: vi.fn((event: string, callback: (data: string) => void) => {
						if (event === "data") {
							setTimeout(() => { callback("first chunk"); }, 10);
							setTimeout(() => { callback("second chunk"); }, 20);
						}
					}),
				},
				stderr: {
					on: vi.fn(),
				},
				kill: vi.fn(),
			};

			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				setTimeout(() => callback(null, "", ""), 30);
				return mockChildProcess;
			});

			const result = await execFileNoThrow("streaming-test");

			expect(result.stdout).toBe("first chunksecond chunk");
		});

		it("should accumulate stderr data from streams", async () => {
			const mockChildProcess = {
				stdout: {
					on: vi.fn(),
				},
				stderr: {
					on: vi.fn((event: string, callback: (data: string) => void) => {
						if (event === "data") {
							setTimeout(() => { callback("error message"); }, 10);
						}
					}),
				},
				kill: vi.fn(),
			};

			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				setTimeout(() => callback(null, "", ""), 20);
				return mockChildProcess;
			});

			const result = await execFileNoThrow("error-test");

			expect(result.stderr).toBe("error message");
		});

		it("should handle missing stdout stream", async () => {
			const mockChildProcess = {
				stdout: null,
				stderr: {
					on: vi.fn(),
				},
				kill: vi.fn(),
			};

			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				setTimeout(() => callback(null, "success", ""), 10);
				return mockChildProcess;
			});

			const result = await execFileNoThrow("no-stdout-test");

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("success");
		});

		it("should handle missing stderr stream", async () => {
			const mockChildProcess = {
				stdout: {
					on: vi.fn(),
				},
				stderr: null,
				kill: vi.fn(),
			};

			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				setTimeout(() => callback(null, "", "error"), 10);
				return mockChildProcess;
			});

			const result = await execFileNoThrow("no-stderr-test");

			expect(result.success).toBe(true);
			expect(result.stderr).toBe("error");
		});
	});

	describe("npmCommand function", () => {
		it("should validate and execute valid npm commands", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, "npm output", "");
				return createMockChildProcess();
			});

			const result = await npmCommand("install", ["react"]);

			expect(result.success).toBe(true);
			expect(execFile).toHaveBeenCalledWith(
				"npm",
				["install", "react"],
				expect.any(Object),
				expect.any(Function),
			);
		});

		it("should reject invalid npm commands", async () => {
			const result = await npmCommand("invalid-command");

			expect(result).toEqual({
				success: false,
				stdout: "",
				stderr: "Invalid npm command: invalid-command",
				exitCode: 1,
			});
			expect(execFile).not.toHaveBeenCalled();
		});

		it("should pass options to execFile", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, "success", "");
				return createMockChildProcess();
			});

			const options: ExecFileOptions = { timeout: 5000, cwd: "/test" };
			await npmCommand("run", ["build"], options);

			expect(execFile).toHaveBeenCalledWith(
				"npm",
				["run", "build"],
				expect.objectContaining({ timeout: 5000, cwd: "/test" }),
				expect.any(Function),
			);
		});

		it("should handle all valid npm commands from the list", async () => {
			const validCommands = [
				"install", "run", "build", "test", "start", "serve",
				"pack", "publish", "update", "audit", "ls", "view",
			];

			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, "success", "");
				return createMockChildProcess();
			});

			for (const cmd of validCommands) {
				const result = await npmCommand(cmd);
				expect(result.success).toBe(true);
			}
		});

		it("should handle npm commands with empty args array", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, "success", "");
				return createMockChildProcess();
			});

			await npmCommand("install");

			expect(execFile).toHaveBeenCalledWith(
				"npm",
				["install"],
				expect.any(Object),
				expect.any(Function),
			);
		});
	});

	describe("Edge cases and boundary conditions", () => {
		it("should handle extremely long command output", async () => {
			const longOutput = "x".repeat(1_000_000); // 1MB of output
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, longOutput, "");
				return createMockChildProcess();
			});

			const result = await execFileNoThrow("large-output");

			expect(result.success).toBe(true);
			expect(result.stdout).toBe(longOutput);
		});

		it("should handle commands with unicode characters in output", async () => {
			// eslint-disable-next-line no-emoji/no-emoji
			const unicodeOutput = "🚀 Gundam RX-78-2 ✨";
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, unicodeOutput, "");
				return createMockChildProcess();
			});

			const result = await execFileNoThrow("unicode-test");

			expect(result.success).toBe(true);
			expect(result.stdout).toBe(unicodeOutput);
		});

		it("should handle commands that return exit code 0 but have stderr output", async () => {
			const error = new Error("Warning message") as Error & { code?: number };
			error.code = 0;
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(error, "success output", "warning message");
				return createMockChildProcess();
			});

			const result = await execFileNoThrow("warning-test");

			expect(result).toEqual({
				success: false, // Error object makes it unsuccessful
				stdout: "success output",
				stderr: "warning message",
				exitCode: 0,
			});
		});

		it("should handle string output in callback", async () => {
			const stdoutStr = "buffered output";
			const stderrStr = "buffered error";
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, stdoutStr, stderrStr);
				return createMockChildProcess();
			});

			const result = await execFileNoThrow("string-test");

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("buffered output");
			expect(result.stderr).toBe("buffered error");
		});

		it("should handle concurrent command execution", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((command: string, _args, _options, callback) => {
				setTimeout(() => callback(null, `result-${command}`, ""), Math.random() * 100);
				return createMockChildProcess();
			});

			const promises = [
				execFileNoThrow("command1"),
				execFileNoThrow("command2"),
				execFileNoThrow("command3"),
			];

			const results = await Promise.all(promises);

			expect(results).toHaveLength(3);
			for (const result of results) {
				expect(result.success).toBe(true);
			}
		});

		it("should handle commands with special characters", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, "success", "");
				return createMockChildProcess();
			});

			const result = await execFileNoThrow("test-command", ["arg with spaces", "special@chars#", "日本語"]);

			expect(result.success).toBe(true);
			expect(execFile).toHaveBeenCalledWith(
				"test-command",
				["arg with spaces", "special@chars#", "日本語"],
				expect.any(Object),
				expect.any(Function),
			);
		});

		it("should handle very large timeout values", async () => {
			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				callback(null, "success", "");
				return createMockChildProcess();
			});

			const largeTimeout = Number.MAX_SAFE_INTEGER;
			const result = await execFileNoThrow("test", [], { timeout: largeTimeout });

			expect(result.success).toBe(true);
			expect(execFile).toHaveBeenCalledWith(
				"test",
				[],
				expect.objectContaining({ timeout: largeTimeout }),
				expect.any(Function),
			);
		});
	});

	describe("Memory and resource management", () => {
		it("should clean up timeout when process completes normally", async () => {
			const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				setTimeout(() => callback(null, "success", ""), 100);
				return createMockChildProcess();
			});

			await execFileNoThrow("test", [], { timeout: 5000 });

			// Clear timeout should be called when process completes
			expect(clearTimeoutSpy).toHaveBeenCalled();

			clearTimeoutSpy.mockRestore();
		});

		it("should handle processes that complete before timeout", async () => {
			vi.useFakeTimers();

			const mockChildProcess = {
				stdout: { on: vi.fn() },
				stderr: { on: vi.fn() },
				kill: vi.fn(),
			};

			(execFile as ReturnType<typeof vi.fn>).mockImplementation((_command, _args, _options, callback) => {
				setTimeout(() => callback(null, "quick success", ""), 100);
				return mockChildProcess;
			});

			const resultPromise = execFileNoThrow("fast-command", [], { timeout: 5000 });

			// Advance time enough for command to complete but not for timeout
			vi.advanceTimersByTime(150);

			const result = await resultPromise;

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("quick success");
			expect(mockChildProcess.kill).not.toHaveBeenCalled();

			vi.useRealTimers();
		});
	});
});