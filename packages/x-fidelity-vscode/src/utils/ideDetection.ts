import * as vscode from 'vscode';

/**
 * IDE Detection Utilities
 *
 * Provides functions to detect the current IDE environment and available AI providers.
 */

/**
 * Get the name of the current IDE
 * @returns The IDE name (e.g., 'Cursor', 'VS Code')
 */
export function getIDEName(): string {
  // Check for Cursor-specific indicators
  const isCursor = isCursorIDE();

  if (isCursor) {
    return 'Cursor';
  }

  // Default to VS Code
  return 'VS Code';
}

/**
 * Check if the current IDE is Cursor
 * @returns true if running in Cursor IDE
 */
export function isCursorIDE(): boolean {
  // Check for Cursor-specific environment variables or properties
  // Cursor sets specific properties that VS Code doesn't have

  // Check app name for Cursor-specific identifier
  const appName = vscode.env.appName.toLowerCase();
  if (appName.includes('cursor')) {
    return true;
  }

  // Note: Cursor also has specific commands like 'cursor.composer.chat',
  // 'cursor.composer.edit', 'cursor.aiChat.newChat' but we can't
  // synchronously check if commands exist, so rely on app name
  return false;
}

/**
 * Check if GitHub Copilot extension is installed and active
 * @returns true if Copilot is available
 */
export function isCopilotAvailable(): boolean {
  const copilotExtension = vscode.extensions.getExtension('github.copilot');
  const copilotChatExtension = vscode.extensions.getExtension(
    'github.copilot-chat'
  );

  return (
    (copilotExtension !== undefined && copilotExtension.isActive) ||
    (copilotChatExtension !== undefined && copilotChatExtension.isActive)
  );
}

/**
 * Check if Amazon Q extension is installed and active
 * @returns true if Amazon Q is available
 */
export function isAmazonQAvailable(): boolean {
  // Check for Amazon Q extension (primary extension ID)
  const amazonQExtension = vscode.extensions.getExtension(
    'amazonwebservices.amazon-q-vscode'
  );

  // Also check for AWS Toolkit which includes Amazon Q functionality
  const awsToolkitExtension = vscode.extensions.getExtension(
    'amazonwebservices.aws-toolkit-vscode'
  );

  return (
    (amazonQExtension !== undefined && amazonQExtension.isActive) ||
    (awsToolkitExtension !== undefined && awsToolkitExtension.isActive)
  );
}

/**
 * Get the best available AI provider based on the current environment
 * @returns The best AI provider identifier ('cursor', 'copilot', 'amazon-q', or 'none')
 */
export function getBestAIProvider(): string {
  // Priority 1: If running in Cursor, use Cursor's AI
  if (isCursorIDE()) {
    return 'cursor';
  }

  // Priority 2: Check for GitHub Copilot
  if (isCopilotAvailable()) {
    return 'copilot';
  }

  // Priority 3: Check for Amazon Q
  if (isAmazonQAvailable()) {
    return 'amazon-q';
  }

  // No AI provider available
  return 'none';
}

/**
 * Get a list of all available AI providers
 * @returns Array of available provider identifiers
 */
export function getAvailableAIProviders(): string[] {
  const providers: string[] = [];

  if (isCursorIDE()) {
    providers.push('cursor');
  }

  if (isCopilotAvailable()) {
    providers.push('copilot');
  }

  if (isAmazonQAvailable()) {
    providers.push('amazon-q');
  }

  return providers;
}
