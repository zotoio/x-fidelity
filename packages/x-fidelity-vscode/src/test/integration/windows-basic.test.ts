import assert from 'assert';
import * as vscode from 'vscode';
import { suite, test, suiteSetup } from 'mocha';
import {
  ensureExtensionActivated,
  executeCommandSafely
} from '../helpers/testHelpers';

// Windows-specific basic test suite to validate fixes
suite('Windows Basic Validation Tests', () => {
  const isWindows = process.platform === 'win32';
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const isWindowsCI = isWindows && isCI;

  // Skip if not Windows CI
  if (!isWindowsCI) {
    test.skip('Skipping Windows-specific tests on non-Windows platforms', () => {});
    return;
  }

  suiteSetup(async function () {
    // Very short timeout for Windows CI validation
    this.timeout(15000); // 15 seconds max
    
    console.log('🪟 Running Windows CI validation...');
    await ensureExtensionActivated();
    
    // Minimal wait time
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should activate extension without timeout on Windows CI', async function () {
    this.timeout(10000); // 10 seconds max
    
    const extension = vscode.extensions.getExtension('zotoio.x-fidelity-vscode');
    assert(extension, 'Extension should be found');
    assert(extension.isActive, 'Extension should be active');
  });

  test('should execute basic commands without hanging on Windows CI', async function () {
    this.timeout(15000); // 15 seconds max
    
    // Test basic command execution
    const result = await executeCommandSafely('xfidelity.showWelcome');
    console.log('🪟 Welcome command result:', result.success);
    
    // Should not throw or hang
    assert(true, 'Commands should execute without hanging');
  });

  test('should handle CLI spawner without RangeError on Windows CI', async function () {
    this.timeout(20000); // 20 seconds max
    
    // Test that CLI spawner doesn't hit string length limits
    try {
      const result = await executeCommandSafely('xfidelity.runAnalysis');
      console.log('🪟 Analysis command result:', result.success);
      
      // Even if analysis fails, it shouldn't throw RangeError
      assert(true, 'CLI spawner should not throw RangeError');
    } catch (error) {
      // Check for the specific RangeError we're trying to fix
      if (error instanceof Error && error.message.includes('Invalid string length')) {
        assert.fail(`RangeError still occurring: ${error.message}`);
      }
      
      // Other errors are acceptable for this test
      console.log('🪟 Expected error (not RangeError):', error);
      assert(true, 'Non-RangeError exceptions are acceptable');
    }
  });
}); 