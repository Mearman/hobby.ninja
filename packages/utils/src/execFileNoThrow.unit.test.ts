/**
 * Comprehensive unit tests for execFileNoThrow utility
 * Tests edge cases, error scenarios, and boundary conditions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execFileNoThrow, npmCommand, ExecFileOptions } from './execFileNoThrow';
import { execFile } from 'child_process';

// Mock child_process
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

// Mock process
const mockProcessCwd = vi.fn();
vi.mock('process', () => ({
  cwd: mockProcessCwd,
  env: {},
}));

describe('execFileNoThrow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessCwd.mockReturnValue('/test/current/directory');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic functionality', () => {
    it('should execute successful command and return success result', async () => {
      const mockCallback = vi.fn();
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, 'stdout output', '');
      });

      const result = await execFileNoThrow('echo', ['hello']);

      expect(result).toEqual({
        success: true,
        stdout: 'stdout output',
        stderr: '',
        exitCode: 0,
      });
      expect(execFile).toHaveBeenCalledWith('echo', ['hello'], expect.any(Object));
    });

    it('should handle command with no arguments', async () => {
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, 'test output', '');
      });

      const result = await execFileNoThrow('pwd');

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('test output');
    });

    it('should handle empty args array explicitly', async () => {
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, 'test output', '');
      });

      const result = await execFileNoThrow('ls', []);

      expect(result.success).toBe(true);
      expect(execFile).toHaveBeenCalledWith('ls', [], expect.any(Object));
    });
  });

  describe('Error handling', () => {
    it('should handle command execution errors', async () => {
      const error = new Error('Command not found');
      (error as any).code = 2;
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(error, '', 'Command not found');
      });

      const result = await execFileNoThrow('nonexistent');

      expect(result).toEqual({
        success: false,
        stdout: '',
        stderr: 'Command not found',
        exitCode: 2,
      });
    });

    it('should handle error with no exit code', async () => {
      const error = new Error('Unknown error');
      delete (error as any).code;
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(error, '', 'Unknown error');
      });

      const result = await execFileNoThrow('failing-command');

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(0);
    });

    it('should handle empty stdout and stderr buffers', async () => {
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(new Error('Test error'), null, null);
      });

      const result = await execFileNoThrow('test');

      expect(result.success).toBe(false);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
    });

    it('should handle null and undefined callbacks gracefully', async () => {
      const mockChildProcess = {
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
        },
        kill: vi.fn(),
      };

      (execFile as any).mockImplementation((command, args, options, callback) => {
        return mockChildProcess;
      });

      // Test that the Promise resolves without throwing
      const resultPromise = execFileNoThrow('test');
      expect(resultPromise).toBeInstanceOf(Promise);
    });
  });

  describe('Timeout scenarios', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should timeout when command exceeds timeout limit', async () => {
      const mockChildProcess = {
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
        },
        kill: vi.fn(),
      };

      (execFile as any).mockImplementation((command, args, options, callback) => {
        // Don't call callback to simulate hanging process
        return mockChildProcess;
      });

      const resultPromise = execFileNoThrow('sleep', ['60'], { timeout: 1000 });

      // Fast-forward timers
      vi.advanceTimersByTime(1000);

      const result = await resultPromise;

      expect(result).toEqual({
        success: false,
        stdout: '',
        stderr: 'Command timed out after 1000ms',
        exitCode: null,
      });
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should handle custom timeout values', async () => {
      const mockChildProcess = {
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
        },
        kill: vi.fn(),
      };

      (execFile as any).mockImplementation((command, args, options, callback) => {
        return mockChildProcess;
      });

      const resultPromise = execFileNoThrow('long-command', [], { timeout: 5000 });

      vi.advanceTimersByTime(5000);

      const result = await resultPromise;

      expect(result.stderr).toBe('Command timed out after 5000ms');
    });

    it('should not timeout when timeout is set to 0', async () => {
      (execFile as any).mockImplementation((command, args, options, callback) => {
        setTimeout(() => callback(null, 'success', ''), 100);
      });

      const resultPromise = execFileNoThrow('fast-command', [], { timeout: 0 });

      // Fast-forward past the command execution but not long enough for timeout
      vi.advanceTimersByTime(150);

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('success');
    });

    it('should handle negative timeout values', async () => {
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, 'success', '');
      });

      const result = await execFileNoThrow('test', [], { timeout: -1 });

      expect(result.success).toBe(true);
    });
  });

  describe('Options handling', () => {
    it('should use custom working directory', async () => {
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, 'success', '');
      });

      await execFileNoThrow('test', [], { cwd: '/custom/directory' });

      expect(execFile).toHaveBeenCalledWith('test', [], expect.objectContaining({
        cwd: '/custom/directory',
      }));
    });

    it('should use default working directory when not specified', async () => {
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, 'success', '');
      });

      await execFileNoThrow('test');

      expect(execFile).toHaveBeenCalledWith('test', [], expect.objectContaining({
        cwd: '/test/current/directory',
      }));
    });

    it('should handle different encoding options', async () => {
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, Buffer.from('test'), '');
      });

      const result = await execFileNoThrow('test', [], { encoding: 'utf16le' });

      expect(execFile).toHaveBeenCalledWith('test', [], expect.objectContaining({
        encoding: 'utf16le',
      }));
    });

    it('should handle empty options object', async () => {
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, 'success', '');
      });

      await execFileNoThrow('test', [], {});

      expect(execFile).toHaveBeenCalledWith('test', [], expect.objectContaining({
        cwd: '/test/current/directory',
        timeout: 30000,
        encoding: 'utf8',
      }));
    });
  });

  describe('Stream handling', () => {
    it('should accumulate stdout data from streams', async () => {
      const mockChildProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              setTimeout(() => callback('first chunk'), 10);
              setTimeout(() => callback('second chunk'), 20);
            }
          }),
        },
        stderr: {
          on: vi.fn(),
        },
        kill: vi.fn(),
      };

      (execFile as any).mockImplementation((command, args, options, callback) => {
        setTimeout(() => callback(null, '', ''), 30);
        return mockChildProcess;
      });

      const result = await execFileNoThrow('streaming-test');

      expect(result.stdout).toBe('first chunksecond chunk');
    });

    it('should accumulate stderr data from streams', async () => {
      const mockChildProcess = {
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              setTimeout(() => callback('error message'), 10);
            }
          }),
        },
        kill: vi.fn(),
      };

      (execFile as any).mockImplementation((command, args, options, callback) => {
        setTimeout(() => callback(null, '', ''), 20);
        return mockChildProcess;
      });

      const result = await execFileNoThrow('error-test');

      expect(result.stderr).toBe('error message');
    });

    it('should handle missing stdout stream', async () => {
      const mockChildProcess = {
        stdout: null,
        stderr: {
          on: vi.fn(),
        },
        kill: vi.fn(),
      };

      (execFile as any).mockImplementation((command, args, options, callback) => {
        setTimeout(() => callback(null, 'success', ''), 10);
        return mockChildProcess;
      });

      const result = await execFileNoThrow('no-stdout-test');

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('success');
    });

    it('should handle missing stderr stream', async () => {
      const mockChildProcess = {
        stdout: {
          on: vi.fn(),
        },
        stderr: null,
        kill: vi.fn(),
      };

      (execFile as any).mockImplementation((command, args, options, callback) => {
        setTimeout(() => callback(null, '', 'error'), 10);
        return mockChildProcess;
      });

      const result = await execFileNoThrow('no-stderr-test');

      expect(result.success).toBe(true);
      expect(result.stderr).toBe('error');
    });
  });

  describe('npmCommand function', () => {
    it('should validate and execute valid npm commands', async () => {
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, 'npm output', '');
      });

      const result = await npmCommand('install', ['react']);

      expect(result.success).toBe(true);
      expect(execFile).toHaveBeenCalledWith('npm', ['install', 'react'], undefined);
    });

    it('should reject invalid npm commands', async () => {
      const result = await npmCommand('invalid-command');

      expect(result).toEqual({
        success: false,
        stdout: '',
        stderr: 'Invalid npm command: invalid-command',
        exitCode: 1,
      });
      expect(execFile).not.toHaveBeenCalled();
    });

    it('should pass options to execFile', async () => {
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, 'success', '');
      });

      const options: ExecFileOptions = { timeout: 5000, cwd: '/test' };
      await npmCommand('run', ['build'], options);

      expect(execFile).toHaveBeenCalledWith('npm', ['run', 'build'], options);
    });

    it('should handle all valid npm commands from the list', async () => {
      const validCommands = [
        'install', 'run', 'build', 'test', 'start', 'serve',
        'pack', 'publish', 'update', 'audit', 'ls', 'view'
      ];

      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, 'success', '');
      });

      for (const cmd of validCommands) {
        const result = await npmCommand(cmd);
        expect(result.success).toBe(true);
      }
    });

    it('should handle npm commands with empty args array', async () => {
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, 'success', '');
      });

      await npmCommand('install');

      expect(execFile).toHaveBeenCalledWith('npm', ['install'], undefined);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle extremely long command output', async () => {
      const longOutput = 'x'.repeat(1000000); // 1MB of output
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, longOutput, '');
      });

      const result = await execFileNoThrow('large-output');

      expect(result.success).toBe(true);
      expect(result.stdout).toBe(longOutput);
    });

    it('should handle commands with unicode characters in output', async () => {
      const unicodeOutput = '🚀 Gundam RX-78-2 ✨';
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, unicodeOutput, '');
      });

      const result = await execFileNoThrow('unicode-test');

      expect(result.success).toBe(true);
      expect(result.stdout).toBe(unicodeOutput);
    });

    it('should handle commands that return exit code 0 but have stderr output', async () => {
      const error = new Error('Warning message');
      (error as any).code = 0;
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(error, 'success output', 'warning message');
      });

      const result = await execFileNoThrow('warning-test');

      expect(result).toEqual({
        success: false, // Error object makes it unsuccessful
        stdout: 'success output',
        stderr: 'warning message',
        exitCode: 0,
      });
    });

    it('should handle Buffer objects in callback', async () => {
      const stdoutBuffer = Buffer.from('buffered output');
      const stderrBuffer = Buffer.from('buffered error');
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, stdoutBuffer, stderrBuffer);
      });

      const result = await execFileNoThrow('buffer-test');

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('buffered output');
      expect(result.stderr).toBe('buffered error');
    });

    it('should handle concurrent command execution', async () => {
      (execFile as any).mockImplementation((command, args, options, callback) => {
        setTimeout(() => callback(null, `result-${command}`), Math.random() * 100);
      });

      const promises = [
        execFileNoThrow('command1'),
        execFileNoThrow('command2'),
        execFileNoThrow('command3'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.stdout).toBe(`result-command${index + 1}`);
      });
    });

    it('should handle commands with special characters', async () => {
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, 'success', '');
      });

      const result = await execFileNoThrow('test-command', ['arg with spaces', 'special@chars#', '日本語']);

      expect(result.success).toBe(true);
      expect(execFile).toHaveBeenCalledWith('test-command', ['arg with spaces', 'special@chars#', '日本語'], expect.any(Object));
    });

    it('should handle very large timeout values', async () => {
      (execFile as any).mockImplementation((command, args, options, callback) => {
        callback(null, 'success', '');
      });

      const largeTimeout = Number.MAX_SAFE_INTEGER;
      const result = await execFileNoThrow('test', [], { timeout: largeTimeout });

      expect(result.success).toBe(true);
      expect(execFile).toHaveBeenCalledWith('test', [], expect.objectContaining({
        timeout: largeTimeout,
      }));
    });
  });

  describe('Memory and resource management', () => {
    it('should clean up timeout when process completes normally', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      (execFile as any).mockImplementation((command, args, options, callback) => {
        setTimeout(() => callback(null, 'success', ''), 100);
      });

      await execFileNoThrow('test', [], { timeout: 5000 });

      // Clear timeout should be called when process completes
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('should handle processes that complete before timeout', async () => {
      vi.useFakeTimers();

      const mockChildProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        kill: vi.fn(),
      };

      (execFile as any).mockImplementation((command, args, options, callback) => {
        setTimeout(() => callback(null, 'quick success', ''), 100);
        return mockChildProcess;
      });

      const resultPromise = execFileNoThrow('fast-command', [], { timeout: 5000 });

      // Advance time enough for command to complete but not for timeout
      vi.advanceTimersByTime(150);

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('quick success');
      expect(mockChildProcess.kill).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});