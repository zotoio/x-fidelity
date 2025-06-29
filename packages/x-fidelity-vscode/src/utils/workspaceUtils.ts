import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Get the current workspace folder
 */
export function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    return workspaceFolders[0];
  }
  return undefined;
}

/**
 * Get the directory to analyze (workspace root)
 */
export function getAnalysisTargetDirectory(): string | undefined {
  const workspaceFolder = getWorkspaceFolder();
  if (workspaceFolder) {
    return workspaceFolder.uri.fsPath;
  }
  return undefined;
}

/**
 * Get workspace relative path
 */
export function getWorkspaceRelativePath(filePath: string): string {
  const workspaceFolder = getWorkspaceFolder();
  if (workspaceFolder) {
    return path.relative(workspaceFolder.uri.fsPath, filePath);
  }
  return filePath;
}

/**
 * Get workspace root path
 */
export function getWorkspaceRoot(): string | undefined {
  return getAnalysisTargetDirectory();
}
