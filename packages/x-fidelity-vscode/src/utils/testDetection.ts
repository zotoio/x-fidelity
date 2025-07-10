import * as vscode from 'vscode';

/**
 * Comprehensive test environment detection
 * Uses multiple methods to reliably detect test mode and prevent browser opens
 */
export function isTestEnvironment(): boolean {
  // Method 1: Check environment variables
  const nodeEnv = process.env.NODE_ENV;
  const vscodeTestDir = process.env.VSCODE_TEST_USER_DATA_DIR;
  const ci = process.env.CI;

  console.log(
    `🔍 Test detection - ENV: NODE_ENV=${nodeEnv}, VSCODE_TEST_USER_DATA_DIR=${vscodeTestDir}, CI=${ci}`
  );

  if (nodeEnv === 'test' || vscodeTestDir !== undefined || ci === 'true') {
    console.log(`🔒 Test environment detected via environment variables`);
    return true;
  }

  // Method 2: Check extension context mode
  try {
    const extensions = vscode.extensions.all;
    const xfiExtension = extensions.find(
      ext => ext.id === 'zotoio.x-fidelity-vscode'
    );
    if (
      xfiExtension &&
      xfiExtension.extensionKind === vscode.ExtensionKind.UI
    ) {
      // In test environment, extension mode might be Test
      const context = (xfiExtension as any)._context;
      if (context?.extensionMode === vscode.ExtensionMode.Test) {
        console.log(`🔒 Test environment detected via extension mode`);
        return true;
      }
    }
  } catch {
    // Ignore errors in context detection
  }

  // Method 3: Check workspace path for test fixtures
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    const workspacePath = workspaceFolder.uri.fsPath;
    console.log(`🔍 Test detection - Workspace path: ${workspacePath}`);

    if (
      workspacePath.includes('x-fidelity-fixtures') ||
      workspacePath.includes('test-workspace') ||
      workspacePath.includes('.vscode-test') ||
      workspacePath.includes('node-fullstack') // Add specific test workspace name
    ) {
      console.log(
        `🔒 Test environment detected via workspace path containing test fixtures`
      );
      return true;
    }
  }

  // Method 6: Check current working directory
  const cwd = process.cwd();
  console.log(`🔍 Test detection - Current working directory: ${cwd}`);
  if (
    cwd.includes('x-fidelity-fixtures') ||
    cwd.includes('node-fullstack') ||
    cwd.includes('.vscode-test')
  ) {
    console.log(`🔒 Test environment detected via current working directory`);
    return true;
  }

  // Method 4: Check for Mocha/test runner in global scope
  const hasTestGlobals =
    typeof global !== 'undefined' &&
    (global.hasOwnProperty('describe') ||
      global.hasOwnProperty('it') ||
      global.hasOwnProperty('suite') ||
      global.hasOwnProperty('test'));

  if (hasTestGlobals) {
    console.log(`🔒 Test environment detected via global test functions`);
    return true;
  }

  // Method 5: Check process arguments for test indicators
  const testArgs = process.argv.filter(
    arg =>
      arg.includes('mocha') ||
      arg.includes('test') ||
      arg.includes('vscode-test') ||
      arg.includes('.test.js')
  );

  console.log(
    `🔍 Test detection - Process args with test indicators: ${testArgs.join(', ')}`
  );

  if (testArgs.length > 0) {
    console.log(`🔒 Test environment detected via process arguments`);
    return true;
  }

  console.log(`❌ Test environment NOT detected - all methods failed`);
  return false;
}

/**
 * Prevents browser/external opens during tests with detailed logging
 */
export function preventExternalOpenInTests(
  context: string,
  url?: string
): boolean {
  const isTest = isTestEnvironment();

  // Always log when this function is called to help debug
  console.log(
    `🔍 preventExternalOpenInTests called: context=${context}, url=${url}, isTest=${isTest}`
  );

  if (isTest) {
    console.log(
      `🔒 Test environment detected - preventing external open in ${context}${url ? ` (${url})` : ''}`
    );
  } else {
    console.log(
      `⚠️  NOT in test environment - allowing external open in ${context}${url ? ` (${url})` : ''}`
    );
  }
  return isTest;
}

/**
 * Monkey patch VSCode's openExternal function during tests to prevent any browser opens
 * Handles read-only property gracefully for newer VSCode versions
 */
export function setupTestEnvironmentPatching(): void {
  if (isTestEnvironment()) {
    console.log(
      '🔧 Setting up test environment patching for vscode.env.openExternal'
    );

    try {
      // Store original function
      const originalOpenExternal = vscode.env.openExternal;

      // Try to replace with test-safe version
      (vscode.env as any).openExternal = (
        uri: vscode.Uri
      ): Thenable<boolean> => {
        console.log(
          `🚫 Test environment - blocking openExternal call to: ${uri.toString()}`
        );
        return Promise.resolve(true); // Pretend success
      };

      console.log(
        '✅ Successfully patched vscode.env.openExternal for testing'
      );

      // Restore original after a delay (for cleanup)
      setTimeout(() => {
        try {
          console.log('🔄 Restoring original vscode.env.openExternal function');
          (vscode.env as any).openExternal = originalOpenExternal;
        } catch (restoreError) {
          console.log(
            '⚠️ Could not restore original openExternal function (property is read-only)'
          );
        }
      }, 60000); // Restore after 1 minute
    } catch (error) {
      console.log(
        `⚠️ Could not patch vscode.env.openExternal (property is read-only in this VSCode version): ${error}`
      );
      console.log(
        '🔄 Tests will use alternative openExternal blocking methods'
      );
      // Continue without patching - tests can use preventExternalOpenInTests() instead
    }
  }
}
