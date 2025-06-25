import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Determines if we're in development/CI context by checking if we're in the X-Fidelity monorepo
 */
export function isXFidelityDevelopmentContext(): boolean {
  const extensionPath = vscode.extensions.getExtension('zotoio.x-fidelity-vscode')?.extensionPath;
  if (!extensionPath) {return false;}
  
  // Check if we're in the monorepo structure by looking for characteristic files
  const monorepoRoot = path.resolve(extensionPath, '../..');
  const packageJsonPath = path.join(monorepoRoot, 'package.json');
  const packagesDir = path.join(monorepoRoot, 'packages');
  const xfiConfigPath = path.join(monorepoRoot, '.xfi-config.json');
  
  // Verify this is the X-Fidelity monorepo by checking package.json
  if (fs.existsSync(packageJsonPath) && fs.existsSync(packagesDir) && fs.existsSync(xfiConfigPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return packageJson.name === 'x-fidelity' || 
             (packageJson.workspaces && packageJson.workspaces.includes('packages/*'));
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Gets the X-Fidelity monorepo root path for development/CI context
 */
function getXFidelityMonorepoRoot(): string | undefined {
  if (!isXFidelityDevelopmentContext()) {return undefined;}
  
  const extensionPath = vscode.extensions.getExtension('zotoio.x-fidelity-vscode')?.extensionPath;
  if (!extensionPath) {return undefined;}
  
  return path.resolve(extensionPath, '../..');
}

/**
 * Gets the target analysis directory based on context:
 * - Development/CI: X-Fidelity monorepo root
 * - User: Current VSCode workspace
 * - Test: Based on the workspace opened by the test runner
 */
export function getAnalysisTargetDirectory(): string | undefined {
  // In development/CI context, always analyze the X-Fidelity monorepo
  const monorepoRoot = getXFidelityMonorepoRoot();
  if (monorepoRoot) {
    return monorepoRoot;
  }
  
  // For users, analyze their current workspace
  const userWorkspace = vscode.workspace.workspaceFolders?.[0];
  if (userWorkspace) {
    return userWorkspace.uri.fsPath;
  }
  
  return undefined;
}

/**
 * Gets the current workspace folder for VSCode UI purposes
 * This should always represent what the user sees in VSCode
 */
export function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.workspaceFolders?.[0];
}

/**
 * Gets the workspace folder path for VSCode UI purposes
 */
export function getWorkspaceFolderPath(): string | undefined {
  const folder = getWorkspaceFolder();
  return folder?.uri.fsPath;
}

/**
 * Gets the workspace root URI for VSCode UI purposes
 */
export function getWorkspaceRootUri(): vscode.Uri | undefined {
  const folder = getWorkspaceFolder();
  return folder?.uri;
}

/**
 * Checks if we have a valid analysis target
 */
export function hasValidAnalysisTarget(): boolean {
  return getAnalysisTargetDirectory() !== undefined;
}

/**
 * Checks if we're using the fallback workspace (development mode)
 */
export function isUsingFallbackWorkspace(): boolean {
  const actualWorkspace = vscode.workspace.workspaceFolders?.[0];
  return !actualWorkspace;
} 
