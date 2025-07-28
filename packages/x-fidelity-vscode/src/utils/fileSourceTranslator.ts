import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
// Define the constant locally to avoid pulling in heavy dependencies during tests
const REPO_GLOBAL_CHECK = 'REPO_GLOBAL_CHECK';

/**
 * Utility class for translating special file sources like REPO_GLOBAL_CHECK
 * to more user-friendly file paths for display and navigation in VSCode.
 */
export class FileSourceTranslator {
  /**
   * Translates REPO_GLOBAL_CHECK to README.md for display purposes
   */
  static translateFileSourceForDisplay(filePath: string): string {
    if (
      filePath === REPO_GLOBAL_CHECK ||
      filePath.endsWith('REPO_GLOBAL_CHECK')
    ) {
      return 'README.md';
    }
    return filePath;
  }

  /**
   * Resolves REPO_GLOBAL_CHECK to README.md URI, falling back to other files if README.md doesn't exist
   */
  static async resolveFileUri(filePath: string): Promise<vscode.Uri | null> {
    try {
      // Handle regular file paths
      if (
        filePath !== REPO_GLOBAL_CHECK &&
        !filePath.endsWith('REPO_GLOBAL_CHECK')
      ) {
        if (path.isAbsolute(filePath)) {
          return vscode.Uri.file(filePath);
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          return null;
        }

        const absolutePath = path.resolve(workspaceFolder.uri.fsPath, filePath);
        return vscode.Uri.file(absolutePath);
      }

      // Handle REPO_GLOBAL_CHECK translation
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        return null;
      }

      const workspaceRoot = workspaceFolder.uri.fsPath;

      // Primary target: README.md
      const readmePath = path.resolve(workspaceRoot, 'README.md');
      if (fs.existsSync(readmePath)) {
        return vscode.Uri.file(readmePath);
      }

      // Fallback candidates if README.md doesn't exist
      const fallbackCandidates = [
        'readme.md',
        'README.MD',
        'Readme.md',
        'package.json',
        'tsconfig.json',
        'src/index.js',
        'src/index.ts',
        'index.js',
        'index.ts'
      ];

      for (const candidate of fallbackCandidates) {
        const candidatePath = path.resolve(workspaceRoot, candidate);
        if (fs.existsSync(candidatePath)) {
          return vscode.Uri.file(candidatePath);
        }
      }

      // Ultimate fallback: return workspace root
      return workspaceFolder.uri;
    } catch {
      return null;
    }
  }

  /**
   * Gets the display name for a file source, translating REPO_GLOBAL_CHECK to README.md
   */
  static getDisplayName(filePath: string): string {
    const translatedPath = this.translateFileSourceForDisplay(filePath);
    return path.basename(translatedPath);
  }

  /**
   * Checks if a file path represents a global repository check
   */
  static isGlobalCheck(filePath: string): boolean {
    return (
      filePath === REPO_GLOBAL_CHECK || filePath.endsWith('REPO_GLOBAL_CHECK')
    );
  }
}
