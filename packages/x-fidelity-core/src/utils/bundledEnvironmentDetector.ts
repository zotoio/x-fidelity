/**
 * Shared utility for detecting execution context across loggers
 * - CLI mode: Manual execution by user from command line
 * - VSCode mode: CLI spawned by VSCode extension with --mode vscode argument
 */

import { options } from '../core/options';
import { EXECUTION_MODES } from '@x-fidelity/types';

/**
 * Detect if should use direct logging instead of transport workers
 * @returns true if should use direct logging, false if transport workers are safe
 */
export function shouldUseDirectLogging(): boolean {
  // CLI mode should NEVER use transport workers - force direct logging
  if (options.mode === EXECUTION_MODES.CLI) {
    return true;
  }
  
  // Use direct logging for VSCode mode (CLI spawned by VSCode extension)
  if (options.mode === EXECUTION_MODES.VSCODE) {
    return true;
  }
  
  // Also use direct logging if we're in a bundled CLI environment
  // where pino transport workers can't find their worker files
  if (isBundledExecutable()) {
    return true;
  }
  
  return false;
}

/**
 * Check if running in a bundled executable context
 * @returns true if CLI is bundled (VSCode extension or standalone bundled CLI)
 */
export function isBundledExecutable(): boolean {
  // VSCode mode represents bundled execution (CLI spawned by VSCode extension)
  if (options.mode === EXECUTION_MODES.VSCODE) {
    return true;
  }
  
  // Check if we're running from a bundled CLI (esbuild output)
  // This detects when the CLI has been bundled into a single file
  try {
    // If the main module filename contains 'dist' and ends with .js, likely bundled
    const mainFilename = require.main?.filename || process.argv[1] || '';
    
    // Check for bundled CLI indicators:
    // 1. Running from a dist directory
    // 2. Single .js file (not .ts in development)
    // 3. Large file size suggests bundling
    if (mainFilename.includes('/dist/') && mainFilename.endsWith('.js')) {
      return true;
    }
    
    // Additional check: if the CLI package.json is not in a typical node_modules structure
    // This helps detect when the CLI is distributed as a bundled executable
    const path = require('path');
    const fs = require('fs');
    const cliDir = path.dirname(mainFilename);
    const packageJsonPath = path.join(cliDir, 'package.json');
    
    // If there's no package.json next to the executable, it's likely bundled
    if (!fs.existsSync(packageJsonPath)) {
      return true;
    }
  } catch (error) {
    // If detection fails, assume not bundled for safety
  }
  
  return false;
}

/**
 * Detect if all workers should be disabled (TreeSitter, etc.)
 * @returns true if all workers should be disabled
 */
export function shouldDisableAllWorkers(): boolean {
  // CLI mode should NEVER use ANY workers - disable all for simplicity and reliability
  if (options.mode === EXECUTION_MODES.CLI) {
    return true;
  }
  
  // VSCode mode should also disable workers to prevent bundling issues
  if (options.mode === EXECUTION_MODES.VSCODE) {
    return true;
  }
  
  // Also disable workers if we're in a bundled environment
  if (isBundledExecutable()) {
    return true;
  }
  
  return false;
}

/**
 * Check if pino-pretty is available for formatted output
 * @returns true if pino-pretty can be resolved
 */
export function isPinoPrettyAvailable(): boolean {
  try {
    require.resolve('pino-pretty');
    return true;
  } catch (error) {
    return false;
  }
} 