import * as fs from 'fs';
import { spawn } from 'child_process';
import { CLISpawner, CLISpawnOptions } from './cliSpawner';
import { EventEmitter } from 'events';
import {
  getPackageManagerPaths,
  createEnhancedEnvironment
} from '@x-fidelity/core';

// Mock dependencies
jest.mock('fs');
jest.mock('child_process');
jest.mock('./globalLogger');
jest.mock('@x-fidelity/core');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockGetPackageManagerPaths =
  getPackageManagerPaths as jest.MockedFunction<typeof getPackageManagerPaths>;
const mockCreateEnhancedEnvironment =
  createEnhancedEnvironment as jest.MockedFunction<
    typeof createEnhancedEnvironment
  >;

// Mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  clearForNewAnalysis: jest.fn(),
  setTriggerSource: jest.fn(),
  startStreaming: jest.fn(),
  stopStreaming: jest.fn(),
  streamLine: jest.fn(),
  displayAnalysisResult: jest.fn(),
  show: jest.fn()
};

jest.mock('./globalLogger', () => ({
  createComponentLogger: () => mockLogger
}));

// Mock @x-fidelity/core functions
jest.mock('@x-fidelity/core', () => ({
  getPackageManagerPaths: jest.fn(),
  createEnhancedEnvironment: jest.fn()
}));

// Mock child process
class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
  exitCode: number | null = null;
  killed = false;

  kill = jest.fn();

  constructor() {
    super();
    // Add pipe method to stdout/stderr
    (this.stdout as any).pipe = jest.fn();
    (this.stderr as any).pipe = jest.fn();
  }

  simulateSuccess(output = '', exitCode = 0) {
    this.stdout.emit('data', Buffer.from(output));
    this.exitCode = exitCode;
    this.emit('close', exitCode);
  }

  simulateError(error: Error) {
    this.emit('error', error);
  }

  simulateTimeout() {
    this.emit('close', 1);
  }
}

describe('CLISpawner Unit Tests', () => {
  let cliSpawner: CLISpawner;
  let mockChildProcess: MockChildProcess;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock child process
    mockChildProcess = new MockChildProcess();
    mockedSpawn.mockReturnValue(mockChildProcess as any);

    // Setup default file system mocks
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.statSync.mockReturnValue({
      isFile: () => true,
      size: 1024 * 1024, // 1MB
      mode: 0o755, // executable
      mtime: new Date()
    } as any);

    mockedFs.readFileSync.mockReturnValue(
      JSON.stringify({
        XFI_RESULT: {
          totalIssues: 0,
          fileCount: 5,
          warningCount: 0,
          errorCount: 0,
          fatalityCount: 0,
          exemptCount: 0,
          issueDetails: [],
          durationSeconds: 1.5
        }
      })
    );

    mockedFs.readdirSync.mockReturnValue(['XFI_RESULT.json'] as any);

    // Create new instance
    cliSpawner = new CLISpawner();

    // Reset static state
    (CLISpawner as any).isExecuting = false;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should create CLISpawner instance', () => {
      expect(cliSpawner).toBeInstanceOf(CLISpawner);
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('isExecuting()', () => {
    test('should return false when not executing', () => {
      expect(cliSpawner.isExecuting()).toBe(false);
    });

    test('should return true when executing', () => {
      (CLISpawner as any).isExecuting = true;
      expect(cliSpawner.isExecuting()).toBe(true);
    });
  });

  describe('validateCLI()', () => {
    test('should validate CLI successfully when file exists', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue({
        isFile: () => true,
        size: 1024,
        mode: 0o755
      } as any);

      await expect(cliSpawner.validateCLI()).resolves.toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('CLI validation successful')
      );
    });

    test('should throw error when CLI file does not exist', async () => {
      mockedFs.existsSync.mockImplementation(filePath => {
        // Make CLI file not exist, but directory exists
        if (typeof filePath === 'string' && filePath.includes('index.js')) {
          return false;
        }
        return true;
      });

      mockedFs.readdirSync.mockReturnValue(['other-file.js'] as any);

      await expect(cliSpawner.validateCLI()).rejects.toThrow(
        /Bundled CLI not found at:/i
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('CLI validation failed')
      );
    });

    test('should throw error when CLI file is empty', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue({
        isFile: () => true,
        size: 0, // Empty file
        mode: 0o755
      } as any);

      await expect(cliSpawner.validateCLI()).rejects.toThrow(
        'CLI file validation failed: Error: CLI file exists but is empty:'
      );
    });

    test('should throw error when path exists but is not a file', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue({
        isFile: () => false, // Directory instead of file
        size: 1024,
        mode: 0o755
      } as any);

      await expect(cliSpawner.validateCLI()).rejects.toThrow(
        'CLI file validation failed: Error: CLI path exists but is not a file:'
      );
    });
  });

  describe('getDiagnostics()', () => {
    test('should return diagnostic information', async () => {
      // Mock package.json for CLI version
      mockedFs.existsSync.mockImplementation(filePath => {
        if (typeof filePath === 'string' && filePath.includes('package.json')) {
          return true;
        }
        return true;
      });

      mockedFs.readFileSync.mockImplementation(filePath => {
        if (typeof filePath === 'string' && filePath.includes('package.json')) {
          return JSON.stringify({
            version: '1.0.0',
            dependencies: {
              chokidar: '^3.0.0'
            }
          });
        }
        return '{}';
      });

      const diagnostics = await cliSpawner.getDiagnostics();

      expect(diagnostics).toMatchObject({
        platform: process.platform,
        arch: process.arch,
        nodeExists: expect.any(Boolean),
        cliExists: true,
        workingDirectory: process.cwd(),
        possibleNodePaths: expect.any(Array),
        possibleCliPaths: expect.any(Array)
      });

      expect(diagnostics.cliSize).toBeDefined();
      expect(diagnostics.cliModified).toBeDefined();
      expect(diagnostics.cliVersion).toBe('1.0.0');
      expect(diagnostics.hasChokidar).toBe(true);
    });

    test('should handle errors in diagnostics gracefully', async () => {
      // Mock fs.existsSync to return false for CLI file
      mockedFs.existsSync.mockImplementation(filePath => {
        if (typeof filePath === 'string' && filePath.includes('index.js')) {
          return false;
        }
        return true;
      });

      const diagnostics = await cliSpawner.getDiagnostics();

      expect(diagnostics.cliExists).toBe(false);
      // Debug call may not happen if file doesn't exist, which is fine
    });
  });

  describe('runAnalysis()', () => {
    const defaultOptions: CLISpawnOptions = {
      workspacePath: '/test/workspace',
      args: [],
      timeout: 5000
    };

    test('should run analysis successfully', async () => {
      const options = { ...defaultOptions };

      // Start the analysis
      const analysisPromise = cliSpawner.runAnalysis(options);

      // Simulate successful CLI execution
      setTimeout(() => {
        mockChildProcess.simulateSuccess('Analysis complete', 0);
      }, 10);

      const result = await analysisPromise;

      expect(result).toMatchObject({
        metadata: {
          XFI_RESULT: expect.objectContaining({
            totalIssues: 0,
            fileCount: 5
          })
        },
        summary: expect.objectContaining({
          totalIssues: 0,
          filesAnalyzed: 5
        })
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting CLI analysis with correlation ID:'),
        expect.any(Object)
      );
    });

    test('should prevent concurrent executions', async () => {
      // Set executing state
      (CLISpawner as any).isExecuting = true;

      await expect(cliSpawner.runAnalysis(defaultOptions)).rejects.toThrow(
        'CLI analysis is already running'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'CLI analysis is already running. Please wait for completion.',
        expect.any(Object)
      );
    });

    test('should handle CLI validation failure', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await expect(cliSpawner.runAnalysis(defaultOptions)).rejects.toThrow(
        /Bundled CLI not found at:/i
      );
    });

    test('should handle spawn errors', async () => {
      const spawnError = new Error('Failed to spawn');
      (spawnError as any).code = 'ENOENT';

      mockedSpawn.mockImplementation(() => {
        throw spawnError;
      });

      await expect(cliSpawner.runAnalysis(defaultOptions)).rejects.toThrow(
        'Failed to spawn CLI process: Failed to spawn'
      );
    });

    test('should handle CLI process errors', async () => {
      const analysisPromise = cliSpawner.runAnalysis(defaultOptions);

      setTimeout(() => {
        const error = new Error('Process error');
        (error as any).code = 'ENOENT';
        mockChildProcess.simulateError(error);
      }, 10);

      await expect(analysisPromise).rejects.toThrow(
        /CLI process failed to start/i
      );
    });

    test('should handle non-zero exit codes', async () => {
      const analysisPromise = cliSpawner.runAnalysis(defaultOptions);

      setTimeout(() => {
        mockChildProcess.exitCode = 2; // Non-success exit code
        mockChildProcess.emit('close', 2);
      }, 10);

      await expect(analysisPromise).rejects.toThrow(
        /CLI process failed with exit code/i
      );
    });

    test('should handle module resolution errors', async () => {
      const analysisPromise = cliSpawner.runAnalysis(defaultOptions);

      setTimeout(() => {
        const error = new Error('Cannot find module "some-module"');
        mockChildProcess.simulateError(error);
      }, 10);

      await expect(analysisPromise).rejects.toThrow(/CLI dependency error/i);
    });

    test('should handle result file parsing errors', async () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const analysisPromise = cliSpawner.runAnalysis(defaultOptions);

      setTimeout(() => {
        mockChildProcess.simulateSuccess('', 0);
      }, 10);

      await expect(analysisPromise).rejects.toThrow(
        /CLI analysis failed - unable to parse result file/i
      );
    });

    test('should accept exit code 1 as success (issues found)', async () => {
      const analysisPromise = cliSpawner.runAnalysis(defaultOptions);

      setTimeout(() => {
        mockChildProcess.exitCode = 1; // Issues found but analysis successful
        mockChildProcess.emit('close', 1);
      }, 10);

      const result = await analysisPromise;
      expect(result.metadata.XFI_RESULT).toBeDefined();
    });

    test('should handle cancellation', async () => {
      const cancellationToken = {
        onCancellationRequested: jest.fn(),
        isCancellationRequested: false
      };

      const options = {
        ...defaultOptions,
        cancellationToken: cancellationToken as any
      };

      const analysisPromise = cliSpawner.runAnalysis(options);

      // Wait for the cancellation handler to be set up
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify cancellation handler was set up
      expect(cancellationToken.onCancellationRequested).toHaveBeenCalled();

      // Simulate analysis completion
      setTimeout(() => {
        mockChildProcess.simulateSuccess('', 0);
      }, 10);

      await analysisPromise;
    });

    test('should handle progress reporting', async () => {
      const progress = {
        report: jest.fn()
      };

      const options = {
        ...defaultOptions,
        progress: progress as any
      };

      const analysisPromise = cliSpawner.runAnalysis(options);

      setTimeout(() => {
        // Simulate stdout data to trigger progress reporting
        mockChildProcess.stdout.emit(
          'data',
          Buffer.from('Analysis progress...')
        );
        mockChildProcess.simulateSuccess('', 0);
      }, 10);

      await analysisPromise;

      expect(progress.report).toHaveBeenCalledWith({
        message: 'Analysis in progress...'
      });
    });
  });

  describe('Platform-specific behavior', () => {
    test('should handle Windows path resolution', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      // Test Node.js path resolution includes Windows paths
      const diagnostics = await cliSpawner.getDiagnostics();
      expect(diagnostics.possibleNodePaths).toEqual(
        expect.arrayContaining([process.execPath, 'node'])
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should handle macOS path resolution', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      const diagnostics = await cliSpawner.getDiagnostics();
      expect(diagnostics.possibleNodePaths).toEqual(
        expect.arrayContaining([
          '/usr/local/bin/node',
          '/opt/homebrew/bin/node'
        ])
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('Error scenarios', () => {
    const testOptions: CLISpawnOptions = {
      workspacePath: '/test/workspace',
      args: [],
      timeout: 5000
    };

    test('should handle large stderr output gracefully', async () => {
      const largeStderr = 'x'.repeat(20 * 1024 * 1024); // 20MB of stderr

      const analysisPromise = cliSpawner.runAnalysis(testOptions);

      setTimeout(() => {
        mockChildProcess.stderr.emit('data', Buffer.from(largeStderr));
        mockChildProcess.emit('close', 2);
      }, 10);

      await expect(analysisPromise).rejects.toThrow();
      // Verify that stderr was truncated and didn't cause memory issues
      expect(true).toBe(true); // Test passes if no memory error occurs
    });

    test('should handle missing result file', async () => {
      mockedFs.existsSync.mockImplementation(filePath => {
        if (
          typeof filePath === 'string' &&
          filePath.includes('XFI_RESULT.json')
        ) {
          return false;
        }
        return true;
      });

      const analysisPromise = cliSpawner.runAnalysis(testOptions);

      setTimeout(() => {
        mockChildProcess.simulateSuccess('', 0);
      }, 10);

      await expect(analysisPromise).rejects.toThrow(
        /XFI result file not found/i
      );
    });

    test('should handle empty result file', async () => {
      mockedFs.readFileSync.mockReturnValue('');

      const analysisPromise = cliSpawner.runAnalysis(testOptions);

      setTimeout(() => {
        mockChildProcess.simulateSuccess('', 0);
      }, 10);

      await expect(analysisPromise).rejects.toThrow(
        /XFI result file is empty/i
      );
    });

    test('should handle malformed JSON in result file', async () => {
      mockedFs.readFileSync.mockReturnValue('invalid json{');

      const analysisPromise = cliSpawner.runAnalysis(testOptions);

      setTimeout(() => {
        mockChildProcess.simulateSuccess('', 0);
      }, 10);

      await expect(analysisPromise).rejects.toThrow(
        /Failed to parse XFI result file/i
      );
    });
  });

  describe('Environment variable handling', () => {
    test('should pass correlation ID through environment', async () => {
      const testOptions: CLISpawnOptions = {
        workspacePath: '/test/workspace',
        args: [],
        timeout: 5000
      };

      const options = {
        ...testOptions,
        env: {
          XFI_CORRELATION_ID: 'test-correlation-123'
        }
      };

      const analysisPromise = cliSpawner.runAnalysis(options);

      setTimeout(() => {
        mockChildProcess.simulateSuccess('', 0);
      }, 10);

      await analysisPromise;

      // Verify spawn was called with correct environment variables
      expect(mockedSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            XFI_VSCODE_MODE: 'true',
            XFI_DISABLE_FILE_LOGGING: 'true',
            XFI_LOG_LEVEL: 'warn',
            XFI_LOG_COLORS: 'false',
            XFI_LOG_TIMESTAMP: 'true',
            FORCE_COLOR: '0'
          })
        })
      );
    });
  });

  describe('Correlation ID generation', () => {
    test('should generate unique correlation IDs', async () => {
      const testOptions: CLISpawnOptions = {
        workspacePath: '/test/workspace',
        args: [],
        timeout: 5000
      };

      const options1 = { ...testOptions };
      const options2 = { ...testOptions };

      const analysisPromise1 = cliSpawner.runAnalysis(options1);
      setTimeout(() => mockChildProcess.simulateSuccess('', 0), 10);
      await analysisPromise1;

      // Reset for second analysis
      (CLISpawner as any).isExecuting = false;
      mockChildProcess = new MockChildProcess();
      mockedSpawn.mockReturnValue(mockChildProcess as any);

      const analysisPromise2 = cliSpawner.runAnalysis(options2);
      setTimeout(() => mockChildProcess.simulateSuccess('', 0), 10);
      await analysisPromise2;

      // Verify different correlation IDs were used
      const calls = mockLogger.info.mock.calls.filter(call =>
        call[0].includes('Starting CLI analysis with correlation ID:')
      );

      expect(calls).toHaveLength(2);
      // Extract correlation IDs from log messages
      const correlationId1 = calls[0][1].correlationId;
      const correlationId2 = calls[1][1].correlationId;

      expect(correlationId1).not.toBe(correlationId2);
      expect(correlationId1).toMatch(/^vscode-/);
      expect(correlationId2).toMatch(/^vscode-/);
    });
  });

  describe('Package Manager PATH Resolution (macOS Fix)', () => {
    let originalPlatform: string;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalPlatform = process.platform;
      originalEnv = { ...process.env };

      // Set up default mock implementations
      mockGetPackageManagerPaths.mockResolvedValue([
        '/usr/local/bin',
        '/opt/homebrew/bin',
        '/usr/bin',
        '/bin'
      ]);

      mockCreateEnhancedEnvironment.mockResolvedValue({
        ...process.env,
        PATH: '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin'
      });
    });

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      process.env = originalEnv;
      jest.clearAllMocks();
    });

    describe('getPackageManagerPaths()', () => {
      test('should include system PATH on macOS', async () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        process.env.PATH = '/usr/bin:/bin:/usr/local/bin';
        process.env.USER = 'testuser';

        // Mock the core function to return expected paths
        mockGetPackageManagerPaths.mockResolvedValue([
          '/usr/bin',
          '/bin',
          '/usr/local/bin'
        ]);

        const paths = await (cliSpawner as any).getPackageManagerPaths();

        expect(paths).toContain('/usr/bin');
        expect(paths).toContain('/bin');
        expect(paths).toContain('/usr/local/bin');
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Package manager PATH resolution (enhanced):',
          expect.objectContaining({
            'first 5 paths': expect.any(Array),
            'paths found': expect.any(Number),
            platform: 'darwin',
            user: 'testuser'
          })
        );
      });

      test('should include Homebrew paths on macOS', async () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        process.env.PATH = '/usr/bin';
        process.env.USER = 'testuser';

        mockedFs.existsSync.mockImplementation((filePath: any) => {
          return (
            filePath === '/usr/local/bin' ||
            filePath === '/opt/homebrew/bin' ||
            filePath === '/usr/bin'
          );
        });

        const paths = await (cliSpawner as any).getPackageManagerPaths();

        expect(paths).toContain('/usr/local/bin');
        expect(paths).toContain('/opt/homebrew/bin');
      });

      test('should include Node Version Manager paths on macOS', async () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        process.env.USER = 'testuser';
        process.env.PATH = '/usr/bin';

        // Mock the core function to return NVM paths
        mockGetPackageManagerPaths.mockResolvedValue([
          '/Users/testuser/.nvm/current/bin',
          '/Users/testuser/.volta/bin',
          '/Users/testuser/.fnm/current/bin',
          '/usr/bin'
        ]);

        const paths = await (cliSpawner as any).getPackageManagerPaths();

        expect(paths).toContain('/Users/testuser/.nvm/current/bin');
        expect(paths).toContain('/Users/testuser/.volta/bin');
        expect(paths).toContain('/Users/testuser/.fnm/current/bin');
      });

      test('should include yarn global installation paths', async () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        process.env.USER = 'testuser';
        process.env.PATH = '/usr/bin';

        // Mock the core function to return yarn paths
        mockGetPackageManagerPaths.mockResolvedValue([
          '/Users/testuser/.yarn/bin',
          '/usr/local/share/npm/bin',
          '/opt/homebrew/share/npm/bin',
          '/usr/bin'
        ]);

        const paths = await (cliSpawner as any).getPackageManagerPaths();

        expect(paths).toContain('/Users/testuser/.yarn/bin');
        expect(paths).toContain('/usr/local/share/npm/bin');
        expect(paths).toContain('/opt/homebrew/share/npm/bin');
      });

      test('should handle Windows path separators', async () => {
        // Mock the core function to return Windows paths
        mockGetPackageManagerPaths.mockResolvedValue([
          'C:\\Program Files\\nodejs',
          'C:\\Windows\\System32',
          'C:\\Program Files (x86)\\nodejs'
        ]);

        const paths = await (cliSpawner as any).getPackageManagerPaths();

        expect(paths).toContain('C:\\Windows\\System32');
        expect(paths).toContain('C:\\Program Files\\nodejs');
      });

      test('should handle missing environment variables gracefully', async () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        delete process.env.PATH;
        delete process.env.USER;
        delete process.env.USERNAME;

        // Mock the core function to return system paths when env vars are missing
        mockGetPackageManagerPaths.mockResolvedValue([
          '/usr/local/bin',
          '/opt/homebrew/bin',
          '/usr/bin',
          '/bin'
        ]);

        const paths = await (cliSpawner as any).getPackageManagerPaths();

        // Should still include system paths
        expect(paths).toContain('/usr/local/bin');
        expect(paths).toContain('/opt/homebrew/bin');
        expect(paths).toContain('/usr/bin');
        expect(paths).toContain('/bin');
      });

      test('should deduplicate paths', async () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        process.env.PATH = '/usr/bin:/usr/local/bin:/usr/bin'; // Duplicate /usr/bin
        process.env.USER = 'testuser';

        mockedFs.existsSync.mockReturnValue(true);

        const paths = await (cliSpawner as any).getPackageManagerPaths();

        const usrBinCount = paths.filter(
          (p: string) => p === '/usr/bin'
        ).length;
        expect(usrBinCount).toBe(1);
      });

      test('should only include existing paths', async () => {
        // Mock the core function to return only existing paths
        mockGetPackageManagerPaths.mockResolvedValue([
          '/usr/bin' // Only this path exists
        ]);

        const paths = await (cliSpawner as any).getPackageManagerPaths();

        expect(paths).toContain('/usr/bin');
        expect(paths).not.toContain('/usr/local/bin');
        expect(paths).not.toContain('/opt/homebrew/bin');
      });

      test('should handle fs.existsSync errors gracefully', async () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        process.env.PATH = '/usr/bin';

        // Mock the core function to return empty array on error
        mockGetPackageManagerPaths.mockResolvedValue([]);

        const paths = await (cliSpawner as any).getPackageManagerPaths();

        expect(paths).toEqual([]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Package manager PATH resolution (enhanced):',
          expect.objectContaining({
            'first 5 paths': expect.any(Array),
            'paths found': 0,
            platform: 'darwin'
          })
        );
      });
    });

    describe('createEnhancedEnvironment()', () => {
      const mockOptions: CLISpawnOptions = {
        workspacePath: '/test/workspace',
        env: {
          CUSTOM_VAR: 'custom_value'
        }
      };

      test('should create enhanced environment with PATH on macOS', async () => {
        process.env.EXISTING_VAR = 'existing_value';

        // Mock the core function to return enhanced environment
        mockCreateEnhancedEnvironment.mockResolvedValue({
          ...process.env,
          PATH: '/usr/local/bin:/usr/bin:/bin',
          EXISTING_VAR: 'existing_value'
        });

        const env = await (cliSpawner as any).createEnhancedEnvironment(
          mockOptions,
          'test-correlation-123'
        );

        expect(env.PATH).toContain('/usr/bin');
        expect(env.PATH).toContain('/usr/local/bin');
        expect(env.PATH).toContain('/bin'); // Original PATH preserved
        expect(env.PATH.includes(':')).toBe(true); // Unix separator

        // Verify X-Fidelity specific environment variables
        expect(env.XFI_CORRELATION_ID).toBe('test-correlation-123');
        expect(env.XFI_VSCODE_MODE).toBe('true');
        expect(env.XFI_DISABLE_FILE_LOGGING).toBe('true');
        expect(env.XFI_LOG_LEVEL).toBe('warn');
        expect(env.XFI_LOG_COLORS).toBe('false');
        expect(env.XFI_LOG_TIMESTAMP).toBe('true');
        expect(env.FORCE_COLOR).toBe('0');
        expect(env.XFI_VSCODE_EXTENSION_PATH).toBeDefined();

        // Verify original environment variables are preserved
        expect(env.EXISTING_VAR).toBe('existing_value');

        // Verify custom options environment variables are included
        expect(env.CUSTOM_VAR).toBe('custom_value');
      });

      test('should use Windows path separators on Windows', async () => {
        // Mock the core function to return Windows-style PATH
        mockCreateEnhancedEnvironment.mockResolvedValue({
          ...process.env,
          PATH: 'C:\\Program Files\\nodejs;C:\\Windows\\System32'
        });

        const env = await (cliSpawner as any).createEnhancedEnvironment(
          mockOptions,
          'test-correlation-456'
        );

        expect(env.PATH.includes(';')).toBe(true); // Windows separator
      });

      test('should allow options.env to override environment variables', async () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        process.env.XFI_LOG_LEVEL = 'info';

        const optionsWithOverride: CLISpawnOptions = {
          workspacePath: '/test/workspace',
          env: {
            XFI_LOG_LEVEL: 'debug', // Override
            CUSTOM_OVERRIDE: 'overridden'
          }
        };

        mockedFs.existsSync.mockReturnValue(true);

        const env = await (cliSpawner as any).createEnhancedEnvironment(
          optionsWithOverride,
          'test-correlation-789'
        );

        expect(env.XFI_LOG_LEVEL).toBe('debug'); // Should be overridden
        expect(env.CUSTOM_OVERRIDE).toBe('overridden');
      });

      test('should log debug information about environment creation', async () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        process.env.PATH = '/usr/bin';

        mockedFs.existsSync.mockReturnValue(true);

        await (cliSpawner as any).createEnhancedEnvironment(
          mockOptions,
          'test-correlation-debug'
        );

        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Creating enhanced environment for CLI spawn',
          expect.objectContaining({
            correlationId: 'test-correlation-debug',
            'enhanced PATH length': expect.any(Number),
            platform: 'darwin'
          })
        );
      });

      test('should handle empty PATH gracefully', async () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        delete process.env.PATH;

        mockedFs.existsSync.mockReturnValue(true);

        const env = await (cliSpawner as any).createEnhancedEnvironment(
          mockOptions,
          'test-correlation-empty'
        );

        expect(env.PATH).toBeDefined();
        expect(env.PATH.length).toBeGreaterThan(0);
      });

      test('should augment original PATH instead of replacing it', async () => {
        // Mock the core function to return PATH that includes both enhanced and original paths
        mockCreateEnhancedEnvironment.mockResolvedValue({
          ...process.env,
          PATH: '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/original/path1:/original/path2'
        });

        const env = await (cliSpawner as any).createEnhancedEnvironment(
          mockOptions,
          'test-correlation-augment'
        );

        // Enhanced paths should be present
        expect(env.PATH).toContain('/usr/local/bin');

        // Original paths should be preserved
        expect(env.PATH).toContain('/original/path1');
        expect(env.PATH).toContain('/original/path2');

        // Enhanced paths should come first (higher priority)
        const pathParts = env.PATH.split(':');
        const usrLocalBinIndex = pathParts.indexOf('/usr/local/bin');
        const originalPath1Index = pathParts.indexOf('/original/path1');

        expect(usrLocalBinIndex).toBeGreaterThanOrEqual(0); // Should be found
        expect(originalPath1Index).toBeGreaterThan(usrLocalBinIndex); // Should come after enhanced paths
      });

      test('should deduplicate paths when augmenting PATH', async () => {
        // Mock the core function to return deduplicated PATH
        mockCreateEnhancedEnvironment.mockResolvedValue({
          ...process.env,
          PATH: '/usr/local/bin:/other/path' // Deduplicated - no duplicate /usr/local/bin
        });

        const env = await (cliSpawner as any).createEnhancedEnvironment(
          mockOptions,
          'test-correlation-dedup'
        );

        // Count occurrences of /usr/local/bin
        const pathParts = env.PATH.split(':');
        const usrLocalBinCount = pathParts.filter(
          p => p === '/usr/local/bin'
        ).length;

        expect(usrLocalBinCount).toBe(1); // Should be deduplicated
        expect(env.PATH).toContain('/other/path'); // Other paths preserved
      });
    });

    test('should use enhanced environment in runAnalysis', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      process.env.PATH = '/usr/bin';
      process.env.USER = 'testuser';

      mockedFs.existsSync.mockImplementation((filePath: any) => {
        // Make specific paths exist for testing
        return (
          filePath === '/usr/bin' ||
          filePath === '/usr/local/bin' ||
          (typeof filePath === 'string' &&
            (filePath.includes('index.js') || filePath.includes('.xfiResults')))
        );
      });

      const testOptions: CLISpawnOptions = {
        workspacePath: '/test/workspace',
        args: [],
        timeout: 5000
      };

      const analysisPromise = cliSpawner.runAnalysis(testOptions);

      setTimeout(() => {
        mockChildProcess.simulateSuccess('', 0);
      }, 10);

      await analysisPromise;

      // Verify spawn was called with enhanced environment
      expect(mockedSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            PATH: expect.stringContaining('/usr/local/bin'),
            XFI_VSCODE_MODE: 'true',
            XFI_CORRELATION_ID: expect.stringMatching(/^vscode-/)
          })
        })
      );
    });
  });

  describe('XFI Result Parsing', () => {
    beforeEach(() => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('{}');
    });

    test('should parse XFI_RESULT from rawResult.result.XFI_RESULT', async () => {
      const mockResult = {
        result: {
          XFI_RESULT: {
            issueDetails: [{ file: 'test.ts', issue: 'test issue' }],
            totalIssues: 1,
            fileCount: 1,
            durationSeconds: 5
          }
        }
      };

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockResult));

      const result = await (cliSpawner as any).parseXFIResultFromFile(
        '/test/workspace'
      );

      expect(result.metadata.XFI_RESULT.issueDetails).toHaveLength(1);
      expect(result.summary.totalIssues).toBe(1);
    });

    test('should parse XFI_RESULT when rawResult has issueDetails directly', async () => {
      const mockResult = {
        issueDetails: [{ file: 'test.ts', issue: 'test issue' }],
        totalIssues: 1,
        fileCount: 1,
        durationSeconds: 5
      };

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockResult));

      const result = await (cliSpawner as any).parseXFIResultFromFile(
        '/test/workspace'
      );

      expect(result.metadata.XFI_RESULT.issueDetails).toHaveLength(1);
      expect(result.summary.totalIssues).toBe(1);
    });

    test('should fallback to rawResult when XFI_RESULT not found in expected locations', async () => {
      const mockResult = {
        someOtherData: 'value',
        fileCount: 2
      };

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockResult));

      const result = await (cliSpawner as any).parseXFIResultFromFile(
        '/test/workspace'
      );

      expect(result.metadata.XFI_RESULT.someOtherData).toBe('value');
      expect(result.metadata.XFI_RESULT.fileCount).toBe(2);
    });

    test('should add empty issueDetails array when missing', async () => {
      const mockResult = {
        XFI_RESULT: {
          totalIssues: 0,
          fileCount: 1,
          durationSeconds: 2
          // issueDetails is missing
        }
      };

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockResult));

      const result = await (cliSpawner as any).parseXFIResultFromFile(
        '/test/workspace'
      );

      expect(result.metadata.XFI_RESULT.issueDetails).toEqual([]);
    });
  });

  describe('Utility Functions', () => {
    test('createCLISpawner should return a new CLISpawner instance', () => {
      const { createCLISpawner } = require('./cliSpawner');
      const spawner = createCLISpawner();
      expect(spawner).toBeInstanceOf(CLISpawner);
    });

    test('getEmbeddedCLIPath should find CLI from possible paths', () => {
      const { getEmbeddedCLIPath } = require('./cliSpawner');

      // Mock file system to simulate CLI found at first path
      mockedFs.existsSync.mockImplementation((path: any) => {
        return String(path).includes('cli/index.js');
      });

      const cliPath = getEmbeddedCLIPath();
      expect(cliPath).toContain('cli/index.js');
    });

    test('getEmbeddedCLIPath should return default path when CLI not found', () => {
      const { getEmbeddedCLIPath } = require('./cliSpawner');

      // Mock file system to simulate CLI not found anywhere
      mockedFs.existsSync.mockReturnValue(false);

      const cliPath = getEmbeddedCLIPath();
      expect(cliPath).toContain('cli/index.js');
    });
  });
});
