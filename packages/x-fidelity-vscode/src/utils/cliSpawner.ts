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
}

export type CLISource = 'bundled' | 'global' | 'local' | 'custom';

/**
 * Central utility for spawning the X-Fidelity CLI across the VSCode extension
 */
export class CLISpawner {
  private readonly logger = createComponentLogger('CLISpawner');

  constructor(
    private readonly cliSource: CLISource = 'bundled',
    private readonly customCLIPath?: string
  ) {}

  /**
   * Get the CLI path based on the configured source
   */
  getCLIPath(): string {
    switch (this.cliSource) {
      case 'bundled':
        return this.getEmbeddedCLIPath();
      case 'global':
        return 'x-fidelity'; // Use global CLI command
      case 'local':
        return this.getLocalCLIPath();
      case 'custom':
        if (!this.customCLIPath) {
          throw new Error('Custom CLI path not provided');
        }
        return this.customCLIPath;
      default:
        throw new Error(`Unknown CLI source: ${this.cliSource}`);
    }
  }

  /**
   * Get the embedded CLI path (bundled with extension)
   */
  private getEmbeddedCLIPath(): string {
    return path.resolve(__dirname, '../cli/index.js');
  }

  /**
   * Get the local development CLI path (for monorepo development)
   */
  private getLocalCLIPath(): string {
    // First try embedded CLI, fallback to monorepo development path
    const embeddedPath = this.getEmbeddedCLIPath();
    if (fs.existsSync(embeddedPath)) {
      return embeddedPath;
    }
    // Navigate from vscode extension to CLI package in monorepo for development
    return path.resolve(__dirname, '../../x-fidelity-cli/dist/index.js');
  }

  /**
   * Validate that the CLI exists and is accessible
   */
  async validateCLI(): Promise<void> {
    const cliPath = this.getCLIPath();

    if (this.cliSource === 'global') {
      // For global CLI, check if command exists
      return new Promise((resolve, reject) => {
        const child = spawn('which', ['x-fidelity'], { stdio: 'pipe' });
        child.on('close', code => {
          if (code === 0) {
            resolve();
          } else {
            reject(
              new Error(
                'Global x-fidelity CLI not found. Run: npm install -g x-fidelity'
              )
            );
          }
        });
        child.on('error', () => {
          reject(new Error('Failed to check for global x-fidelity CLI'));
        });
      });
    } else {
      // For file-based CLIs, check if file exists
      if (!fs.existsSync(cliPath)) {
        throw new Error(`CLI not found at: ${cliPath}`);
      }
    }
  }

  /**
   * Execute CLI analysis and return parsed results
   */
  async runAnalysis(options: CLISpawnOptions): Promise<AnalysisResult> {
    await this.validateCLI();

    const cliPath = this.getCLIPath();
    const isGlobalCLI = this.cliSource === 'global';

    // Build arguments
    const args = [
      '--dir',
      options.workspacePath,
      '--output-format',
      'json',
      ...(options.args || [])
    ];

    this.logger.debug(
      `Executing CLI: ${isGlobalCLI ? cliPath : 'node ' + cliPath} ${args.join(' ')}`
    );

    return new Promise((resolve, reject) => {
      const spawnCommand = isGlobalCLI ? cliPath : 'node';
      const spawnArgs = isGlobalCLI ? args : [cliPath, ...args];

      const child = spawn(spawnCommand, spawnArgs, {
        cwd: options.workspacePath,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: options.timeout || 120000,
        env: { ...process.env, ...options.env }
      });

      let stderr = '';

      // Set up cancellation
      const cancelHandler = () => {
        this.logger.info('Killing CLI process due to cancellation');
        this.killProcess(child);
      };

      options.cancellationToken?.onCancellationRequested(cancelHandler);

      // Handle stdout for progress updates
      child.stdout?.on('data', data => {
        const dataStr = data.toString();
        this.logger.debug(`CLI stdout: ${dataStr.trim()}`);

        // Update progress if available
        if (options.progress) {
          options.progress.report({ message: 'Analysis in progress...' });
        }
      });

      // Handle stderr
      child.stderr?.on('data', data => {
        const dataStr = data.toString();
        stderr += dataStr;
        this.logger.debug(`CLI stderr: ${dataStr.trim()}`);
      });

      // Handle completion
      child.on('close', async code => {
        this.logger.debug(`CLI process exited with code ${code}`);

        if (code !== 0 && code !== 1) {
          reject(
            new Error(
              `CLI process failed with exit code ${code}. stderr: ${stderr}`
            )
          );
          return;
        }

        try {
          // Parse results from XFI_RESULT.json
          const result = await this.parseXFIResultFromFile(
            options.workspacePath
          );
          resolve(result);
        } catch (parseError) {
          this.logger.error('Failed to read CLI result file:', parseError);
          this.logger.debug('CLI stderr:', stderr);
          reject(new Error(`Failed to parse CLI results: ${parseError}`));
        }
      });

      child.on('error', error => {
        this.logger.error('CLI process error:', error);
        reject(new Error(`CLI process error: ${error.message}`));
      });
    });
  }

  /**
   * Execute CLI for testing purposes with simpler result format
   */
  async runCLIForTesting(options: CLISpawnOptions): Promise<CLIResult> {
    try {
      await this.validateCLI();

      const cliPath = this.getCLIPath();
      const isGlobalCLI = this.cliSource === 'global';

      return new Promise((resolve, reject) => {
        const spawnCommand = isGlobalCLI ? cliPath : 'node';
        const spawnArgs = isGlobalCLI
          ? ['analyze', options.workspacePath]
          : [cliPath, 'analyze', options.workspacePath];

        const child = spawn(spawnCommand, spawnArgs, {
          cwd: options.workspacePath,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, NODE_ENV: 'test', ...options.env }
        });

        let output = '';
        let error = '';

        child.stdout?.on('data', data => {
          output += data.toString();
        });

        child.stderr?.on('data', data => {
          error += data.toString();
        });

        child.on('close', code => {
          resolve({
            success: code === 0,
            output,
            error: error || undefined,
            exitCode: code || undefined
          });
        });

        child.on('error', err => {
          reject(new Error(`CLI execution failed: ${err.message}`));
        });
      });
    } catch (validationError) {
      return {
        success: false,
        output: '',
        error:
          validationError instanceof Error
            ? validationError.message
            : String(validationError),
        exitCode: -1
      };
    }
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

    if (!fs.existsSync(resultFilePath)) {
      throw new Error(`XFI result file not found at: ${resultFilePath}`);
    }

    try {
      const resultContent = fs.readFileSync(resultFilePath, 'utf8');
      const rawResult = JSON.parse(resultContent);

      // Extract XFI_RESULT from the CLI output structure
      const xfiResult = rawResult.XFI_RESULT || rawResult;

      // Create empty diagnostics map - this will be populated by DiagnosticProvider
      const diagnostics = new Map<string, vscode.Diagnostic[]>();

      // Transform to VSCode extension AnalysisResult format
      return {
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
    } catch (error) {
      throw new Error(`Failed to parse XFI result file: ${error}`);
    }
  }
}

/**
 * Factory function to create CLISpawner based on configuration
 */
export function createCLISpawner(
  cliSource: CLISource = 'bundled',
  customCLIPath?: string
): CLISpawner {
  return new CLISpawner(cliSource, customCLIPath);
}

/**
 * Convenience function for getting embedded CLI path (for backward compatibility)
 */
export function getEmbeddedCLIPath(): string {
  return path.resolve(__dirname, '../cli/index.js');
}
