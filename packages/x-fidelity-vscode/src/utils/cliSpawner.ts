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
   * Get the embedded CLI path (bundled with extension)
   */
  private getEmbeddedCLIPath(): string {
    // In development/test mode, try multiple possible paths
    const possiblePaths = [
      path.resolve(__dirname, '../cli/index.js'), // From dist directory
      path.resolve(__dirname, '../../cli/index.js'), // From src directory in tests
      path.resolve(process.cwd(), 'cli/index.js'), // From current working directory
      path.resolve(process.cwd(), 'packages/x-fidelity-vscode/cli/index.js') // From monorepo root
    ];

    for (const cliPath of possiblePaths) {
      if (fs.existsSync(cliPath)) {
        this.logger.debug(`Found CLI at: ${cliPath}`);
        return cliPath;
      }
    }

    // If none found, return the default path and let validation handle the error
    const defaultPath = path.resolve(__dirname, '../cli/index.js');
    this.logger.warn(
      `CLI not found at any expected location. Trying default: ${defaultPath}`
    );
    return defaultPath;
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
   * Execute CLI analysis and return parsed results
   */
  async runAnalysis(options: CLISpawnOptions): Promise<AnalysisResult> {
    // Check for concurrent execution
    if (CLISpawner.isExecuting) {
      throw new Error(
        'CLI analysis is already running. Please wait for completion.'
      );
    }

    CLISpawner.isExecuting = true;

    try {
      await this.validateCLI();

      const cliPath = this.getEmbeddedCLIPath();

      // Build arguments
      const args = [
        cliPath,
        '--dir',
        options.workspacePath,
        '--output-format',
        'json',
        ...(options.args || [])
      ];

      this.logger.debug(`Executing CLI: node ${args.join(' ')}`);

      return new Promise((resolve, reject) => {
        const child = spawn('node', args, {
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
          CLISpawner.isExecuting = false; // Release mutex
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
          CLISpawner.isExecuting = false; // Release mutex
          this.logger.error('CLI process error:', error);
          reject(new Error(`CLI process error: ${error.message}`));
        });
      });
    } catch (error) {
      CLISpawner.isExecuting = false; // Release mutex on any error
      throw error;
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
    path.resolve(__dirname, '../cli/index.js'), // From dist directory
    path.resolve(__dirname, '../../cli/index.js'), // From src directory in tests
    path.resolve(process.cwd(), 'cli/index.js'), // From current working directory
    path.resolve(process.cwd(), 'packages/x-fidelity-vscode/cli/index.js') // From monorepo root
  ];

  for (const cliPath of possiblePaths) {
    if (fs.existsSync(cliPath)) {
      return cliPath;
    }
  }

  // If none found, return the default path
  return path.resolve(__dirname, '../cli/index.js');
}
