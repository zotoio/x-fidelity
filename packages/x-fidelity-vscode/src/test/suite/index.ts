/**
 * VSCode Extension Test Setup for @vscode/test-cli
 * This file ensures Mocha globals are available when tests are loaded directly via file patterns
 */

// This setup file is loaded by @vscode/test-cli to ensure Mocha globals are available
// before test files are executed. No custom test discovery is needed since @vscode/test-cli
// handles that with direct file patterns.

// Ensure we're in a test environment
if (typeof global !== 'undefined') {
	// Mark that this setup has run
	(global as any).__xfidelityTestSetup = true;
}

// Export a dummy function for compatibility
export function run(): Promise<void> {
	return Promise.resolve();
} 
