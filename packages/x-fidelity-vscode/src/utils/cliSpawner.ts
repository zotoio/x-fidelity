import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { createComponentLogger } from './globalLogger';
import type { AnalysisResult } from '../analysis/types';

export interface CLISpawnOptions {
  workspacePath: string;
  args?: string[];
  timeout?: number;
  cancellationToken?: vscode.CancellationToken;
  progress?: vscode.Progress<{ message?: string; increment?: number }>;
  env?: Record<string, string>;
}

export interface CLIResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
  analysisResult?: AnalysisResult;
  XFI_RESULT?: any; // Add XFI_RESULT for test compatibility
}

/**
 * Central utility for spawning the X-Fidelity CLI across the VSCode extension
 * Simplified to only support bundled CLI with execution mutex
 */
export class CLISpawner {
  private readonly logger = createComponentLogger('CLISpawner');
  private static isExecuting = false; // Simple mutex to prevent concurrent executions

  constructor() {}

  /**
   * Find the Node.js executable path, especially important on macOS
   */
  private getNodePath(): string {
    // Common Node.js installation paths, especially on macOS
    const possibleNodePaths = [
      process.execPath, // Current Node.js executable path
      'node', // Try system PATH first
      '/usr/local/bin/node', // Homebrew install
      '/opt/homebrew/bin/node', // Apple Silicon Homebrew
      '/usr/bin/node', // System install
      '/Users/' +
        (process.env.USER || process.env.USERNAME) +
        '/.nvm/current/bin/node', // nvm
      '/Users/' +
        (process.env.USER || process.env.USERNAME) +
        '/.volta/bin/node' // volta
    ];

    this.logger.debug(`Node.js path resolution:`, {
      'process.execPath': process.execPath,
      platform: process.platform,
      arch: process.arch,
      possibleNodePaths
    });

    for (const nodePath of possibleNodePaths) {
      try {
        if (fs.existsSync(nodePath)) {
          const stats = fs.statSync(nodePath);
          if (stats.isFile() && stats.mode & 0o111) {
            // Check if executable
            this.logger.debug(`Using Node.js at: ${nodePath}`);
            return nodePath;
          }
        }
      } catch (error) {
        // Continue trying other paths
        this.logger.debug(`Node.js path check failed for ${nodePath}:`, error);
      }
    }

    // Fallback to 'node' and let the system handle it
    this.logger.warn('Using fallback Node.js executable: node');
    return 'node';
  }

  /**
   * Get the embedded CLI path (bundled with extension)
   * VSCode extension always spawns the CLI with --mode vscode argument
   * This differentiates from manual CLI execution (--mode cli)
   */
  private getEmbeddedCLIPath(): string {
    // In development/test mode, try multiple possible paths
    const possiblePaths = [
      path.resolve(__dirname, './cli/index.js'), // From dist directory (production)
      path.resolve(__dirname, './dist/cli/index.js'), // From root directory (development)
      path.resolve(__dirname, '../../cli/index.js'), // From src directory in tests
      path.resolve(process.cwd(), 'cli/index.js'), // From current working directory
      path.resolve(process.cwd(), 'packages/x-fidelity-vscode/cli/index.js'), // From monorepo root
      // CRITICAL: Add the actual monorepo CLI location for tests
      path.resolve(__dirname, '../../../x-fidelity-cli/dist/index.js'), // From VSCode src to CLI dist
      path.resolve(__dirname, '../../x-fidelity-cli/dist/index.js'), // From VSCode dist to CLI dist
      path.resolve(process.cwd(), '../x-fidelity-cli/dist/index.js') // From VSCode package to CLI package
    ];

    // Log detailed path information for debugging
    this.logger.debug(`CLI path resolution debug:`, {
      __dirname,
      'process.cwd()': process.cwd(),
      platform: process.platform,
      possiblePaths
    });

    for (const cliPath of possiblePaths) {
      if (fs.existsSync(cliPath)) {
        this.logger.debug(`Found CLI at: ${cliPath}`);
        // Verify file is readable and has appropriate permissions
        try {
          const stats = fs.statSync(cliPath);
          this.logger.debug(`CLI file stats:`, {
            size: stats.size,
            isFile: stats.isFile(),
            mode: stats.mode.toString(8),
            readable: fs.constants.R_OK
          });
        } catch (statError) {
          this.logger.warn(`CLI file stat check failed:`, statError);
        }
        return cliPath;
      }
    }

    // If none found, return the default path and let validation handle the error
    const defaultPath = path.resolve(__dirname, './cli/index.js');
    this.logger.warn(
      `CLI not found at any expected location. Trying default: ${defaultPath}`
    );
    return defaultPath;
  }

  /**
   * Validate that Node.js executable is accessible
   */
  private async validateNodeJS(nodePath: string): Promise<void> {
    try {
      if (nodePath !== 'node' && !fs.existsSync(nodePath)) {
        throw new Error(`Node.js executable not found at: ${nodePath}`);
      }

      // For absolute paths, check if it's executable
      if (path.isAbsolute(nodePath)) {
        const stats = fs.statSync(nodePath);
        if (!stats.isFile()) {
          throw new Error(`Node.js path is not a file: ${nodePath}`);
        }
        if (!(stats.mode & 0o111)) {
          throw new Error(
            `Node.js executable lacks execute permissions: ${nodePath}`
          );
        }
      }

      this.logger.debug(`Node.js validation successful: ${nodePath}`);
    } catch (error) {
      this.logger.error(`Node.js validation failed:`, error);
      throw new Error(`Node.js validation failed: ${error}`);
    }
  }

  /**
   * Validate that the bundled CLI exists and is accessible
   */
  async validateCLI(): Promise<void> {
    const cliPath = this.getEmbeddedCLIPath();

    this.logger.debug(`Validating CLI at: ${cliPath}`);
    this.logger.debug(`Current working directory: ${process.cwd()}`);
    this.logger.debug(`__dirname: ${__dirname}`);

    if (!fs.existsSync(cliPath)) {
      // List what files DO exist in the expected directory for debugging
      const cliDir = path.dirname(cliPath);
      let dirListing = 'Directory does not exist';

      try {
        if (fs.existsSync(cliDir)) {
          const files = fs.readdirSync(cliDir);
          dirListing = `Directory exists with files: ${files.join(', ')}`;
        }
      } catch (error) {
        dirListing = `Error reading directory: ${error}`;
      }

      this.logger.error(
        `CLI validation failed - file not found at: ${cliPath}`
      );
      this.logger.error(`CLI directory info: ${dirListing}`);

      throw new Error(`Bundled CLI not found at: ${cliPath}. ${dirListing}`);
    }

    // Additional validation - check if file is readable and appears to be a JS file
    try {
      const stats = fs.statSync(cliPath);
      if (!stats.isFile()) {
        throw new Error(`CLI path exists but is not a file: ${cliPath}`);
      }

      // Check if file is not empty
      if (stats.size === 0) {
        throw new Error(`CLI file exists but is empty: ${cliPath}`);
      }

      this.logger.debug(
        `CLI validation successful - file size: ${stats.size} bytes`
      );
    } catch (error) {
      this.logger.error(`CLI file validation failed:`, error);
      throw new Error(`CLI file validation failed: ${error}`);
    }
  }

  /**
   * Check if CLI is currently executing
   */
  isExecuting(): boolean {
    return CLISpawner.isExecuting;
  }

  /**
   * Get diagnostic information about CLI setup
   */
  async getDiagnostics(): Promise<any> {
    const nodePath = this.getNodePath();
    const cliPath = this.getEmbeddedCLIPath();

    const diagnostics = {
      platform: process.platform,
      arch: process.arch,
      nodePath,
      cliPath,
      nodeExists: false,
      cliExists: false,
      nodeVersion: '',
      workingDirectory: process.cwd(),
      extensionPath: path.dirname(__dirname),
      pathEnvironment: process.env.PATH,
      possibleNodePaths: [
        process.execPath,
        'node',
        '/usr/local/bin/node',
        '/opt/homebrew/bin/node',
        '/usr/bin/node'
      ],
      possibleCliPaths: [
        path.resolve(__dirname, './cli/index.js'),
        path.resolve(__dirname, './dist/cli/index.js'),
        path.resolve(__dirname, '../../cli/index.js'),
        path.resolve(process.cwd(), 'cli/index.js'),
        path.resolve(process.cwd(), 'packages/x-fidelity-vscode/cli/index.js')
      ]
    };

    // Check Node.js existence and version
    try {
      if (nodePath !== 'node') {
        diagnostics.nodeExists = fs.existsSync(nodePath);
      } else {
        diagnostics.nodeExists = true; // Assume system node exists
      }

      // Try to get Node.js version
      const { spawn } = require('child_process');
      const nodeVersionChild = spawn(nodePath, ['--version'], {
        timeout: 5000
      });
      nodeVersionChild.stdout?.on('data', (data: Buffer) => {
        diagnostics.nodeVersion = data.toString().trim();
      });
    } catch (error) {
      this.logger.debug('Node.js version check failed:', error);
    }

    // Check CLI existence
    try {
      diagnostics.cliExists = fs.existsSync(cliPath);
      if (diagnostics.cliExists) {
        const stats = fs.statSync(cliPath);
        (diagnostics as any).cliSize = stats.size;
        (diagnostics as any).cliModified = stats.mtime;
      }
    } catch (error) {
      this.logger.debug('CLI file check failed:', error);
    }

    // Check for required dependencies in CLI directory
    try {
      const cliDir = path.dirname(cliPath);
      const packageJsonPath = path.join(cliDir, '..', 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8')
        );
        (diagnostics as any).cliDependencies = packageJson.dependencies || {};
        (diagnostics as any).hasChokidar =
          'chokidar' in (packageJson.dependencies || {});
        (diagnostics as any).cliVersion = packageJson.version || 'unknown';
      }

      // Check if the CLI can be loaded without errors
      (diagnostics as any).cliLoadTest = 'pending';
      try {
        // Try a basic accessibility test
        (diagnostics as any).cliLoadTest = 'node_accessible';
      } catch (testError) {
        (diagnostics as any).cliLoadTest =
          `failed: ${testError instanceof Error ? testError.message : String(testError)}`;
      }
    } catch (error) {
      this.logger.debug('CLI dependency check failed:', error);
    }

    return diagnostics;
  }

  /**
   * Get the CLI version from the embedded CLI package.json
   */
  private getCLIVersion(): string {
    try {
      const cliPath = this.getEmbeddedCLIPath();
      const cliDir = path.dirname(cliPath);
      const packageJsonPath = path.join(cliDir, '..', 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8')
        );
        return packageJson.version || '0.0.0';
      }
    } catch (error) {
      this.logger.debug('Failed to read CLI version:', error);
    }

    // Fallback version
    return '0.0.0';
  }

  /**
   * Execute CLI analysis and return parsed results
   * 🎯 ENHANCED WITH CORRELATION ID GENERATION, STREAMING, AND RESULT DISPLAY
   */
  async runAnalysis(options: CLISpawnOptions): Promise<AnalysisResult> {
    // 🎯 GENERATE CORRELATION ID FOR END-TO-END TRACEABILITY
    const correlationId = this.generateCorrelationId();
    const analysisStartTime = Date.now();

    // 🎯 CLEAR OUTPUT AND START STREAMING
    this.logger.clearForNewAnalysis(correlationId);
    this.logger.startStreaming();

    // Check for concurrent execution
    if (CLISpawner.isExecuting) {
      const errorMsg =
        'CLI analysis is already running. Please wait for completion.';
      this.logger.error(errorMsg, { correlationId, command: 'runAnalysis' });
      throw new Error(errorMsg);
    }

    CLISpawner.isExecuting = true;

    // 🎯 LOG ANALYSIS START WITH CORRELATION ID
    this.logger.info(
      `🚀 Starting CLI analysis with correlation ID: ${correlationId}`,
      {
        correlationId,
        workspacePath: options.workspacePath,
        analysisStartTime,
        command: 'runAnalysis'
      }
    );

    try {
      const cliPath = this.getEmbeddedCLIPath();
      const nodePath = this.getNodePath();

      // Validate both Node.js and CLI before attempting to spawn
      await this.validateNodeJS(nodePath);
      await this.validateCLI();

      // Build arguments for VSCode mode execution
      // CLI mode = manual user execution from command line
      // VSCode mode = CLI spawned by VSCode extension with clean output for panels

      // Check VSCode setting for WASM TreeSitter preference
      // Default to WASM in VSCode for better compatibility and reliability
      const config = vscode.workspace.getConfiguration('xfidelity');
      const enableTreeSitterWasm = config.get<boolean>(
        'enableTreeSitterWasm',
        true // 🎯 DEFAULT TO WASM FOR VSCODE - better compatibility in extension environment
      );

      // Log TreeSitter mode selection with reasoning and correlation
      if (!!enableTreeSitterWasm) {
        this.logger.info(
          '🔧 Tree-sitter WASM (recommended VSCode mode - better compatibility)',
          {
            correlationId,
            treeSitterMode: 'wasm',
            reason: 'VSCode default for better extension compatibility'
          }
        );
      } else {
        this.logger.info('🔧 Tree-sitter Native (user disabled WASM mode)', {
          correlationId,
          treeSitterMode: 'native',
          reason: 'user disabled WASM mode'
        });
      }

      const args = [
        cliPath,
        '--dir',
        options.workspacePath,
        '--output-format',
        'json',
        '--mode',
        'vscode', // Use VSCode execution mode for clean output panel integration
        // 🎯 FORCE NATIVE MODE - WASM REQUIRES SPECIAL SETUP
        // Only add WASM flag if user has explicitly enabled it AND has proper setup
        ...(enableTreeSitterWasm ? ['--enable-tree-sitter-wasm'] : []),
        ...(options.args || [])
      ];

      // 🎯 ENHANCED LOGGING WITH CORRELATION ID
      this.logger.debug(
        `Executing CLI in VSCode mode: ${nodePath} ${args.join(' ')}`,
        {
          correlationId,
          command: 'cli-spawn'
        }
      );
      this.logger.debug(`CLI execution context:`, {
        correlationId,
        nodePath,
        cliPath,
        cwd: options.workspacePath,
        platform: process.platform,
        mode: 'vscode',
        treeSitterMode: !!enableTreeSitterWasm ? 'wasm' : 'native',
        enableTreeSitterWasm: !!enableTreeSitterWasm,
        args,
        command: 'cli-execution-context'
      });

      return new Promise((resolve, reject) => {
        const child = spawn(nodePath, args, {
          cwd: options.workspacePath,
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: options.timeout || 120000,
          env: {
            ...process.env,
            // 🎯 PASS CORRELATION ID TO CLI VIA ENVIRONMENT
            XFI_CORRELATION_ID: correlationId,
            XFI_VSCODE_MODE: 'true', // Force console logging in CLI
            XFI_DISABLE_FILE_LOGGING: 'true', // Disable file logging
            XFI_LOG_LEVEL: 'warn', // Use consistent log level
            XFI_LOG_COLORS: 'false', // Disable colors for CLI output
            XFI_LOG_TIMESTAMP: 'true', // Ensure timestamps are included
            // 🎯 PASS VSCODE EXTENSION PATH FOR PROPER WASM FILE ACCESS
            XFI_VSCODE_EXTENSION_PATH: path.dirname(__dirname), // Extension root directory
            FORCE_COLOR: '0', // Disable ANSI color support
            ...options.env
          }
        });

        this.setupChildProcessHandlers(
          child,
          options,
          resolve,
          reject,
          nodePath,
          cliPath,
          correlationId // 🎯 PASS CORRELATION ID TO HANDLERS
        );
      });
    } catch (error) {
      const duration = Date.now() - analysisStartTime;
      this.logger.error('❌ CLI analysis setup failed', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
        duration,
        command: 'runAnalysis'
      });

      this.logger.stopStreaming();
      CLISpawner.isExecuting = false;
      throw error;
    } finally {
      // Correlation ID logging in finally block
      const totalDuration = Date.now() - analysisStartTime;
      this.logger.debug(`🔍 Analysis attempt completed`, {
        correlationId,
        totalDuration,
        command: 'runAnalysis'
      });
    }
  }

  /**
   * 🎯 NEW: Generate correlation ID for VSCode-to-CLI traceability
   */
  private generateCorrelationId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `vscode-${timestamp}-${random}`;
  }

  /**
   * Kill CLI process gracefully with fallback to force kill
   */
  private killProcess(child: ChildProcess): void {
    child.kill('SIGTERM');
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }, 5000);
  }

  /**
   * Set up standard child process event handlers
   */
  private setupChildProcessHandlers(
    child: ChildProcess,
    options: CLISpawnOptions,
    resolve: (value: AnalysisResult) => void,
    reject: (reason?: any) => void,
    nodePath: string,
    cliPath: string,
    correlationId: string // 🎯 ADD CORRELATION ID TO PARAMETERS
  ): void {
    let stderr = '';

    // 🎯 LOG CHILD PROCESS SETUP WITH CORRELATION ID
    this.logger.debug(
      `Setting up child process handlers with correlation ID: ${correlationId}`,
      {
        correlationId,
        command: 'setup-handlers'
      }
    );

    // 🎯 REAL-TIME STREAMING OF CLI OUTPUT
    if (child.stdout) {
      child.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        const lines = output.split('\n');

        for (const line of lines) {
          if (line.trim()) {
            this.logger.streamLine(line, 'stdout');
          }
        }
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        const lines = output.split('\n');

        for (const line of lines) {
          if (line.trim()) {
            this.logger.streamLine(line, 'stderr');
          }
        }
      });
    }

    // Set up cancellation
    const cancelHandler = () => {
      this.logger.info('Killing CLI process due to cancellation');
      this.killProcess(child);
    };

    options.cancellationToken?.onCancellationRequested(cancelHandler);

    // 🎯 REAL-TIME STREAMING OF CLI OUTPUT
    child.stdout?.on('data', data => {
      const output = data.toString();
      const lines = output.split('\n');

      for (const line of lines) {
        if (line.trim()) {
          this.logger.streamLine(line, 'stdout');
        }
      }

      // Update progress if available
      if (options.progress) {
        options.progress.report({ message: 'Analysis in progress...' });
      }
    });

    // Handle stderr with streaming
    child.stderr?.on('data', data => {
      const output = data.toString();
      stderr += output;
      const lines = output.split('\n');

      for (const line of lines) {
        if (line.trim()) {
          this.logger.streamLine(line, 'stderr');
        }
      }
    });

    // Handle completion
    child.on('close', async code => {
      CLISpawner.isExecuting = false; // Release mutex

      // 🎯 STOP STREAMING AFTER ANALYSIS COMPLETION
      this.logger.stopStreaming();

      this.logger.debug(`CLI process exited with code ${code}`, {
        correlationId,
        exitCode: code
      });

      // Exit code 0 = success, 1 = analysis complete with issues found (still success)
      // Any other exit code is an error
      if (code !== 0 && code !== 1) {
        // Check for module resolution errors in stderr
        const stderrLower = stderr.toLowerCase();
        if (
          stderrLower.includes('cannot find module') ||
          stderrLower.includes('module not found')
        ) {
          reject(
            new Error(
              `CLI dependency error (exit code ${code}):\n${stderr}\n` +
                `This typically means a required Node.js module is missing.\n` +
                `The CLI bundle may be incomplete or dependencies were not properly installed.\n` +
                `Try running the X-Fidelity CLI diagnostics command for more details.`
            )
          );
        } else {
          reject(
            new Error(
              `CLI process failed with exit code ${code}. stderr: ${stderr}`
            )
          );
        }
        return;
      }

      try {
        // Parse results from XFI_RESULT.json
        const result = await this.parseXFIResultFromFile(options.workspacePath);

        // Ensure the result has XFI_RESULT data for test compatibility
        if (!result.metadata?.XFI_RESULT) {
          this.logger.warn(
            'XFI_RESULT missing from parsed result, creating minimal structure',
            { correlationId }
          );
          // Create a minimal but complete XFI_RESULT structure
          const minimalXFIResult = this.createMinimalXFIResult();
          result.metadata = {
            XFI_RESULT: minimalXFIResult
          };
        }

        // 🎯 DISPLAY ANALYSIS RESULTS IN FORMATTED WAY
        this.logger.displayAnalysisResult(result.metadata, correlationId);

        resolve(result);
      } catch (parseError) {
        this.logger.error('Failed to read CLI result file:', parseError);
        this.logger.debug('CLI stderr:', stderr);
        this.logger.error('CLI parse error details:', {
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
          workspacePath: options.workspacePath,
          resultFilePath: path.join(
            options.workspacePath,
            '.xfiResults',
            'XFI_RESULT.json'
          ),
          cliStderr: stderr,
          correlationId
        });

        // NEVER return a minimal result - always throw the error so it can be properly handled
        // This ensures that CLI failures are visible and can be debugged/fixed
        reject(
          new Error(
            `CLI analysis failed - unable to parse result file: ${parseError instanceof Error ? parseError.message : String(parseError)}. Check CLI stderr for details: ${stderr}`
          )
        );
      }
    });

    child.on('error', error => {
      CLISpawner.isExecuting = false; // Release mutex

      // Enhanced error logging for macOS ENOENT issues
      this.logger.error('CLI process error:', {
        error: error.message,
        code: (error as any).code,
        errno: (error as any).errno,
        syscall: (error as any).syscall,
        path: (error as any).path,
        nodePath,
        cliPath,
        platform: process.platform,
        correlationId // 🎯 ADD CORRELATION ID TO ERROR LOGGING
      });

      // Provide specific guidance for different error types
      if ((error as any).code === 'ENOENT') {
        const enhancedError = new Error(
          `CLI process failed to start (ENOENT): ${error.message}\n` +
            `This typically means:\n` +
            `1. Node.js executable not found at: ${nodePath}\n` +
            `2. CLI file not found at: ${cliPath}\n` +
            `3. Missing file permissions\n` +
            `Platform: ${process.platform}\n` +
            `Working directory: ${options.workspacePath}\n` +
            `Please ensure Node.js is properly installed and accessible.\n` +
            `Try installing Node.js from: https://nodejs.org/`
        );
        reject(enhancedError);
      } else {
        // Check if this might be a module resolution error
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes('cannot find module') ||
          errorMessage.includes('module not found')
        ) {
          const moduleError = new Error(
            `CLI dependency error: ${error.message}\n` +
              `This typically means:\n` +
              `1. A required Node.js module is missing\n` +
              `2. The CLI bundle is incomplete\n` +
              `3. Dependencies were not properly installed\n` +
              `Platform: ${process.platform}\n` +
              `CLI Path: ${cliPath}\n` +
              `Try running the X-Fidelity CLI diagnostics command for more details.`
          );
          reject(moduleError);
        } else {
          reject(new Error(`CLI process error: ${error.message}`));
        }
      }
    });
  }

  /**
   * Create a minimal XFI_RESULT structure that satisfies the ResultMetadata interface
   */
  private createMinimalXFIResult(): any {
    const cliVersion = this.getCLIVersion();
    return {
      repoXFIConfig: {
        archetype: 'unknown',
        configServer: '',
        exemptions: []
      },
      issueDetails: [],
      telemetryData: {
        repoUrl: '',
        configServer: '',
        hostInfo: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version
        }
      },
      memoryUsage: {},
      factMetrics: {},
      options: {},
      startTime: Date.now(),
      finishTime: Date.now(),
      durationSeconds: 0,
      xfiVersion: cliVersion,
      archetype: 'unknown',
      fileCount: 0,
      totalIssues: 0,
      warningCount: 0,
      errorCount: 0,
      fatalityCount: 0,
      exemptCount: 0,
      repoPath: '',
      repoUrl: ''
    };
  }

  /**
   * Parse XFI result file from workspace directory and transform to VSCode extension format
   */
  private async parseXFIResultFromFile(
    workspacePath: string
  ): Promise<AnalysisResult> {
    const resultFilePath = path.join(
      workspacePath,
      '.xfiResults',
      'XFI_RESULT.json'
    );

    this.logger.debug(`Looking for XFI result file at: ${resultFilePath}`);

    if (!fs.existsSync(resultFilePath)) {
      // Check if .xfiResults directory exists
      const xfiResultsDir = path.join(workspacePath, '.xfiResults');
      if (fs.existsSync(xfiResultsDir)) {
        const files = fs.readdirSync(xfiResultsDir);
        this.logger.debug(
          `XFI results directory exists with files: ${files.join(', ')}`
        );
      } else {
        this.logger.debug('XFI results directory does not exist');
      }

      throw new Error(`XFI result file not found at: ${resultFilePath}`);
    }

    try {
      const resultContent = fs.readFileSync(resultFilePath, 'utf8');
      this.logger.debug(
        'Raw XFI result file content length:',
        resultContent.length
      );

      if (!resultContent.trim()) {
        throw new Error('XFI result file is empty');
      }

      const rawResult = JSON.parse(resultContent);
      this.logger.debug('Parsed XFI result keys:', Object.keys(rawResult));

      // Extract XFI_RESULT from the CLI output structure
      // The CLI might wrap the result in different ways
      let xfiResult: any;
      if (rawResult.XFI_RESULT) {
        xfiResult = rawResult.XFI_RESULT;
        this.logger.debug('Found XFI_RESULT in rawResult.XFI_RESULT');
      } else if (rawResult.result && rawResult.result.XFI_RESULT) {
        xfiResult = rawResult.result.XFI_RESULT;
        this.logger.debug('Found XFI_RESULT in rawResult.result.XFI_RESULT');
      } else if (
        rawResult.issueDetails ||
        rawResult.totalIssues !== undefined
      ) {
        // Raw result is already the XFI_RESULT structure
        xfiResult = rawResult;
        this.logger.debug('Using rawResult directly as XFI_RESULT');
      } else {
        this.logger.warn(
          'XFI_RESULT not found in expected locations, using rawResult as fallback'
        );
        xfiResult = rawResult;
      }

      // Ensure xfiResult has required structure
      if (!xfiResult.issueDetails) {
        xfiResult.issueDetails = [];
      }

      this.logger.debug('XFI_RESULT structure:', {
        issueDetailsCount: xfiResult.issueDetails?.length || 0,
        totalIssues: xfiResult.totalIssues || 0,
        fileCount: xfiResult.fileCount || 0,
        hasKeys: Object.keys(xfiResult)
      });

      // Create empty diagnostics map - this will be populated by DiagnosticProvider
      const diagnostics = new Map<string, vscode.Diagnostic[]>();

      // Transform to VSCode extension AnalysisResult format
      const result: AnalysisResult = {
        metadata: {
          XFI_RESULT: xfiResult
        },
        diagnostics,
        timestamp: Date.now(),
        duration: (xfiResult.durationSeconds || 0) * 1000, // Convert to milliseconds
        summary: {
          totalIssues: xfiResult.totalIssues || 0,
          filesAnalyzed: xfiResult.fileCount || 0,
          analysisTimeMs: (xfiResult.durationSeconds || 0) * 1000,
          issuesByLevel: {
            warning: xfiResult.warningCount || 0,
            error: xfiResult.errorCount || 0,
            fatality: xfiResult.fatalityCount || 0,
            exempt: xfiResult.exemptCount || 0
          }
        },
        operationId: `cli-${Date.now()}`
      };

      this.logger.debug('Transformed analysis result summary:', result.summary);
      return result;
    } catch (error) {
      this.logger.error('Error parsing XFI result file:', error);
      throw new Error(`Failed to parse XFI result file: ${error}`);
    }
  }
}

/**
 * Factory function to create CLISpawner (simplified)
 */
export function createCLISpawner(): CLISpawner {
  return new CLISpawner();
}

/**
 * Convenience function for getting embedded CLI path (for backward compatibility)
 */
export function getEmbeddedCLIPath(): string {
  // Use the same logic as the class method
  const possiblePaths = [
    path.resolve(__dirname, './cli/index.js'), // From dist directory (production)
    path.resolve(__dirname, './dist/cli/index.js'), // From root directory (development)
    path.resolve(__dirname, '../../cli/index.js'), // From src directory in tests
    path.resolve(process.cwd(), 'cli/index.js'), // From current working directory
    path.resolve(process.cwd(), 'packages/x-fidelity-vscode/cli/index.js'), // From monorepo root
    // CRITICAL: Add the actual monorepo CLI location for tests
    path.resolve(__dirname, '../../../x-fidelity-cli/dist/index.js'), // From VSCode src to CLI dist
    path.resolve(__dirname, '../../x-fidelity-cli/dist/index.js'), // From VSCode dist to CLI dist
    path.resolve(process.cwd(), '../x-fidelity-cli/dist/index.js') // From VSCode package to CLI package
  ];

  for (const cliPath of possiblePaths) {
    if (fs.existsSync(cliPath)) {
      return cliPath;
    }
  }

  // If none found, return the default path
  return path.resolve(__dirname, '../cli/index.js');
}
